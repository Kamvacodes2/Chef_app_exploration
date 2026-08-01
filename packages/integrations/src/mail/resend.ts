import type { MailProvider, ProviderReference, SendEmailInput } from "@chefmate/application";

const DEFAULT_TIMEOUT_MS = 10_000;

export interface ResendMailProviderOptions {
  readonly apiKey: string;
  readonly fromEmail: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

interface ResendResponse {
  readonly id?: string;
}
async function withTimeout<T>(
  timeoutMs: number,
  message: string,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export class ResendMailProvider implements MailProvider {
  public readonly name = "resend";

  readonly #apiKey: string;
  readonly #fromEmail: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: ResendMailProviderOptions) {
    this.#apiKey = options.apiKey;
    this.#fromEmail = options.fromEmail;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }

  async sendTransactional(input: SendEmailInput): Promise<ProviderReference> {
    const body = await withTimeout(this.#timeoutMs, "Resend request timed out", async (signal) => {
      const response = await this.#fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        signal,
        body: JSON.stringify({
          from: this.#fromEmail,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend returned ${response.status}`);
      }

      return (await response.json().catch(() => ({}))) as ResendResponse;
    });

    return { provider: this.name, reference: body.id ?? input.idempotencyKey };
  }
  verifyWebhookSignature(): boolean {
    // Resend webhook verification is introduced with captured provider fixtures;
    // outbound transactional sends do not require accepting webhook input.
    return false;
  }
}
