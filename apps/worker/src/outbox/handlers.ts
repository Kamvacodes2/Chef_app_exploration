import { createHash, createHmac } from "node:crypto";
import type { Pool } from "pg";
import type { MailProvider, MessagingProvider } from "@chefmate/application";
import type { Logger } from "@chefmate/observability";
import type { OutboxEvent, OutboxHandler } from "./types.js";

export const EMAIL_EVENT = "communication.email.transactional.v1";
export const WHATSAPP_EVENT = "communication.whatsapp.template.v1";

export interface CommunicationHandlerDependencies {
  readonly pool: Pool;
  readonly logger: Logger;
  readonly mail?: MailProvider;
  readonly messaging?: MessagingProvider;
  readonly linkTokenSecret?: string;
}

interface CommunicationPayload {
  readonly communicationLogId: string;
  readonly recipient: string;
  readonly subject?: string | null;
  readonly templateKey: string;
  readonly bodyPreview?: string | null;
  readonly metadata?: Record<string, unknown>;
}

interface ChefPortalInviteLink {
  readonly kind: "chefPortalInvite";
  readonly webAppBaseUrl: string;
  readonly userId: string;
  readonly chefApplicationId: string;
}

interface CustomerSurveyLink {
  readonly kind: "customerSurvey";
  readonly webAppBaseUrl: string;
  readonly bookingId: string;
  readonly customerEmail: string;
}

type DeliveryLink = ChefPortalInviteLink | CustomerSurveyLink;

function asPayload(value: unknown): CommunicationPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Communication event payload must be an object");
  }
  const record = value as Record<string, unknown>;
  const communicationLogId = record.communicationLogId;
  const recipient = record.recipient;
  const templateKey = record.templateKey;
  if (typeof communicationLogId !== "string" || communicationLogId.length === 0) {
    throw new Error("communicationLogId is required");
  }
  if (typeof recipient !== "string" || recipient.length === 0) {
    throw new Error("recipient is required");
  }
  if (typeof templateKey !== "string" || templateKey.length === 0) {
    throw new Error("templateKey is required");
  }
  return {
    communicationLogId,
    recipient,
    templateKey,
    subject: typeof record.subject === "string" ? record.subject : null,
    bodyPreview: typeof record.bodyPreview === "string" ? record.bodyPreview : null,
    metadata:
      typeof record.metadata === "object" &&
      record.metadata !== null &&
      !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : {},
  };
}

function stringProperty(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`deliveryLink.${key} is required`);
  }
  return value;
}

function deliveryLink(metadata: Record<string, unknown> | undefined): DeliveryLink | null {
  const value = metadata?.deliveryLink;
  if (value === undefined) return null;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("deliveryLink must be an object");
  }
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  if (kind === "chefPortalInvite") {
    return {
      kind,
      webAppBaseUrl: stringProperty(record, "webAppBaseUrl"),
      userId: stringProperty(record, "userId"),
      chefApplicationId: stringProperty(record, "chefApplicationId"),
    };
  }
  if (kind === "customerSurvey") {
    return {
      kind,
      webAppBaseUrl: stringProperty(record, "webAppBaseUrl"),
      bookingId: stringProperty(record, "bookingId"),
      customerEmail: stringProperty(record, "customerEmail"),
    };
  }
  throw new Error("deliveryLink.kind is unsupported");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function deliveryToken(secret: string, event: OutboxEvent, payload: CommunicationPayload): string {
  return createHmac("sha256", secret)
    .update(event.eventType)
    .update(":")
    .update(event.id)
    .update(":")
    .update(payload.communicationLogId)
    .digest("base64url");
}

function baseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

async function resolveEmailText(
  deps: CommunicationHandlerDependencies,
  event: OutboxEvent,
  payload: CommunicationPayload,
): Promise<string> {
  const text = payload.bodyPreview ?? "";
  const link = deliveryLink(payload.metadata);
  if (link === null) return text;
  if (!deps.linkTokenSecret) {
    throw new Error("LINK_TOKEN_SECRET is required for tokenized communication delivery");
  }

  const token = deliveryToken(deps.linkTokenSecret, event, payload);
  if (link.kind === "chefPortalInvite") {
    await deps.pool.query(
      `INSERT INTO app.magic_tokens
         (purpose, token_hash, user_id, chef_application_id, expires_at)
       VALUES ('CHEF_PORTAL_INVITE', $1, $2, $3, now() + interval '7 days')
       ON CONFLICT (token_hash) DO NOTHING`,
      [hashToken(token), link.userId, link.chefApplicationId],
    );
    return `${text}\n\n${baseUrl(link.webAppBaseUrl)}/chef/magic-login#token=${encodeURIComponent(token)}`;
  }

  await deps.pool.query(
    `INSERT INTO app.survey_tokens (token_hash, booking_id, customer_email, expires_at)
     VALUES ($1, $2, $3, now() + interval '14 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [hashToken(token), link.bookingId, link.customerEmail],
  );
  return `${text}\n\n${baseUrl(link.webAppBaseUrl)}/survey/${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );
}

type CommunicationStatus = "QUEUED" | "SENT" | "SKIPPED" | "FAILED";

interface CommunicationDeliveryState {
  readonly status: CommunicationStatus;
  readonly provider_reference: string | null;
}

async function communicationState(
  pool: Pool,
  id: string,
): Promise<CommunicationDeliveryState | null> {
  const result = await pool.query<CommunicationDeliveryState>(
    `SELECT status, provider_reference
       FROM app.communication_logs
      WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function communicationIsResolved(pool: Pool, id: string): Promise<boolean> {
  const state = await communicationState(pool, id);
  if (!state) throw new Error("Communication log not found.");
  return state.status === "SENT" || state.status === "SKIPPED" || state.status === "FAILED";
}

async function markCommunication(
  pool: Pool,
  id: string,
  status: "SENT" | "SKIPPED" | "FAILED",
  provider: string,
  reference: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE app.communication_logs
        SET status = $2,
            provider = $3,
            provider_reference = $4,
            sent_at = CASE WHEN $2 = 'SENT' THEN now() ELSE sent_at END
      WHERE id = $1`,
    [id, status, provider, reference],
  );
}

async function markWhatsAppDeliveryUncertain(
  pool: Pool,
  id: string,
  provider: string,
  idempotencyKey: string,
): Promise<void> {
  await pool.query(
    `UPDATE app.communication_logs
        SET status = 'FAILED',
            provider = $2,
            provider_reference = $3,
            metadata = COALESCE(metadata, '{}'::jsonb) ||
              jsonb_build_object('deliveryUncertain', true, 'deliveryAttemptId', $3)
      WHERE id = $1
        AND status = 'QUEUED'
        AND provider_reference = $3`,
    [id, provider, idempotencyKey],
  );
}

async function reserveWhatsAppDelivery(
  pool: Pool,
  id: string,
  provider: string,
  idempotencyKey: string,
): Promise<boolean> {
  const reserved = await pool.query(
    `UPDATE app.communication_logs
        SET provider = $2,
            provider_reference = $3,
            metadata = COALESCE(metadata, '{}'::jsonb) ||
              jsonb_build_object('deliveryAttemptId', $3, 'deliveryAttemptStartedAt', now())
      WHERE id = $1
        AND status = 'QUEUED'
        AND provider_reference IS NULL
      RETURNING id`,
    [id, provider, idempotencyKey],
  );
  if ((reserved.rowCount ?? 0) === 1) return true;

  const state = await communicationState(pool, id);
  if (!state) throw new Error("Communication log not found.");
  if (state.status === "SENT" || state.status === "SKIPPED" || state.status === "FAILED") {
    return false;
  }
  if (state.status === "QUEUED" && state.provider_reference === idempotencyKey) {
    await markWhatsAppDeliveryUncertain(pool, id, provider, idempotencyKey);
    return false;
  }
  throw new Error("Communication log is already reserved for another delivery attempt.");
}

export function emailHandler(deps: CommunicationHandlerDependencies): OutboxHandler {
  return async (event: OutboxEvent): Promise<void> => {
    const payload = asPayload(event.payload);
    if (await communicationIsResolved(deps.pool, payload.communicationLogId)) return;
    const text = await resolveEmailText(deps, event, payload);
    if (!deps.mail) {
      deps.logger.warn(
        { eventId: event.id },
        "email provider not configured; communication skipped",
      );
      await markCommunication(
        deps.pool,
        payload.communicationLogId,
        "SKIPPED",
        "mail-disabled",
        null,
      );
      return;
    }
    const result = await deps.mail.sendTransactional({
      idempotencyKey: event.id,
      to: payload.recipient,
      subject: payload.subject ?? "ChefMate update",
      html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
      text,
    });
    await markCommunication(
      deps.pool,
      payload.communicationLogId,
      "SENT",
      result.provider,
      result.reference,
    );
  };
}

export function whatsAppHandler(deps: CommunicationHandlerDependencies): OutboxHandler {
  return async (event: OutboxEvent): Promise<void> => {
    const payload = asPayload(event.payload);
    if (await communicationIsResolved(deps.pool, payload.communicationLogId)) return;
    if (!deps.messaging) {
      deps.logger.warn(
        { eventId: event.id },
        "WhatsApp provider not configured; communication skipped",
      );
      await markCommunication(
        deps.pool,
        payload.communicationLogId,
        "SKIPPED",
        "meta-disabled",
        null,
      );
      return;
    }
    const shouldSend = await reserveWhatsAppDelivery(
      deps.pool,
      payload.communicationLogId,
      deps.messaging.name,
      event.id,
    );
    if (!shouldSend) return;
    const result = await deps.messaging.sendTemplate({
      idempotencyKey: event.id,
      toE164: payload.recipient,
      templateName: payload.templateKey,
      variables: Object.fromEntries(
        Object.entries(payload.metadata ?? {}).map(([key, value]) => [key, String(value)]),
      ),
    });
    await markCommunication(
      deps.pool,
      payload.communicationLogId,
      "SENT",
      result.provider,
      result.reference,
    );
  };
}
