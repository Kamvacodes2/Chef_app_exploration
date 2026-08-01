import { describe, expect, it, vi } from "vitest";
import { ResendMailProvider } from "../../src/mail/resend.js";
import { MetaWhatsAppProvider } from "../../src/messaging/metaWhatsApp.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function hangingFetch(): typeof fetch {
  return vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  }) as unknown as typeof fetch;
}
function hangingJsonResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: () => new Promise(() => undefined),
  } as unknown as Response;
}

describe("ResendMailProvider", () => {
  it("sends transactional email with idempotency and returns the provider reference", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "email_123" }, 202));
    const provider = new ResendMailProvider({
      apiKey: "resend-test-key",
      fromEmail: "hello@chefmate.test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.sendTransactional({
      idempotencyKey: "evt-email-1",
      to: "chef@example.test",
      subject: "ChefMate job",
      html: "<p>New job</p>",
      text: "New job",
    });

    expect(result).toEqual({ provider: "resend", reference: "email_123" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer resend-test-key",
      "Content-Type": "application/json",
      "Idempotency-Key": "evt-email-1",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "hello@chefmate.test",
      to: ["chef@example.test"],
      subject: "ChefMate job",
      html: "<p>New job</p>",
      text: "New job",
    });
  });

  it("falls back to the idempotency key when Resend omits an id", async () => {
    const provider = new ResendMailProvider({
      apiKey: "resend-test-key",
      fromEmail: "hello@chefmate.test",
      fetchImpl: vi.fn(async () => jsonResponse({})) as unknown as typeof fetch,
    });

    await expect(
      provider.sendTransactional({
        idempotencyKey: "evt-email-2",
        to: "customer@example.test",
        subject: "Survey",
        html: "<p>Survey</p>",
        text: "Survey",
      }),
    ).resolves.toEqual({ provider: "resend", reference: "evt-email-2" });
  });

  it("raises a generic provider error on non-2xx responses", async () => {
    const provider = new ResendMailProvider({
      apiKey: "resend-test-key",
      fromEmail: "hello@chefmate.test",
      fetchImpl: vi.fn(async () =>
        jsonResponse({ message: "nope" }, 429),
      ) as unknown as typeof fetch,
    });

    await expect(
      provider.sendTransactional({
        idempotencyKey: "evt-email-3",
        to: "customer@example.test",
        subject: "Survey",
        html: "<p>Survey</p>",
        text: "Survey",
      }),
    ).rejects.toThrow("Resend returned 429");
    expect(provider.verifyWebhookSignature()).toBe(false);
  });

  it("times out hung Resend requests", async () => {
    const fetchImpl = hangingFetch();
    const provider = new ResendMailProvider({
      apiKey: "resend-test-key",
      fromEmail: "hello@chefmate.test",
      fetchImpl,
      timeoutMs: 1,
    });

    await expect(
      provider.sendTransactional({
        idempotencyKey: "evt-email-timeout",
        to: "customer@example.test",
        subject: "Survey",
        html: "<p>Survey</p>",
        text: "Survey",
      }),
    ).rejects.toThrow("Resend request timed out");
  });

  it("times out stalled Resend response bodies", async () => {
    const provider = new ResendMailProvider({
      apiKey: "resend-test-key",
      fromEmail: "hello@chefmate.test",
      fetchImpl: vi.fn(async () => hangingJsonResponse()) as unknown as typeof fetch,
      timeoutMs: 1,
    });

    await expect(
      provider.sendTransactional({
        idempotencyKey: "evt-email-body-timeout",
        to: "customer@example.test",
        subject: "Survey",
        html: "<p>Survey</p>",
        text: "Survey",
      }),
    ).rejects.toThrow("Resend request timed out");
  });
});

describe("MetaWhatsAppProvider", () => {
  it("sends template messages through the encoded phone-number endpoint", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ messages: [{ id: "wamid.123" }] }));
    const provider = new MetaWhatsAppProvider({
      accessToken: "meta-test-token",
      phoneNumberId: "phone/id with spaces",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.sendTemplate({
      idempotencyKey: "evt-wa-1",
      toE164: "+27821234567",
      templateName: "chef_booking_offer",
      variables: { reference: "CM-1", payout: "R 437,35" },
    });

    expect(result).toEqual({ provider: "meta-whatsapp", reference: "wamid.123" });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v20.0/phone%2Fid%20with%20spaces/messages");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer meta-test-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      messaging_product: "whatsapp",
      to: "+27821234567",
      type: "template",
      template: {
        name: "chef_booking_offer",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "CM-1" },
              { type: "text", text: "R 437,35" },
            ],
          },
        ],
      },
    });
  });

  it("falls back to the idempotency key when Meta omits a message id", async () => {
    const provider = new MetaWhatsAppProvider({
      accessToken: "meta-test-token",
      phoneNumberId: "123",
      fetchImpl: vi.fn(async () => jsonResponse({ messages: [] })) as unknown as typeof fetch,
    });

    await expect(
      provider.sendTemplate({
        idempotencyKey: "evt-wa-2",
        toE164: "+27821234567",
        templateName: "customer_survey",
        variables: {},
      }),
    ).resolves.toEqual({ provider: "meta-whatsapp", reference: "evt-wa-2" });
  });

  it("raises a generic provider error on non-2xx responses", async () => {
    const provider = new MetaWhatsAppProvider({
      accessToken: "meta-test-token",
      phoneNumberId: "123",
      fetchImpl: vi.fn(async () =>
        jsonResponse({ error: "denied" }, 401),
      ) as unknown as typeof fetch,
    });

    await expect(
      provider.sendTemplate({
        idempotencyKey: "evt-wa-3",
        toE164: "+27821234567",
        templateName: "customer_survey",
        variables: {},
      }),
    ).rejects.toThrow("Meta WhatsApp returned 401");
    expect(provider.verifyWebhookSignature()).toBe(false);
  });

  it("times out hung Meta WhatsApp requests", async () => {
    const fetchImpl = hangingFetch();
    const provider = new MetaWhatsAppProvider({
      accessToken: "meta-test-token",
      phoneNumberId: "123",
      fetchImpl,
      timeoutMs: 1,
    });

    await expect(
      provider.sendTemplate({
        idempotencyKey: "evt-wa-timeout",
        toE164: "+27821234567",
        templateName: "customer_survey",
        variables: {},
      }),
    ).rejects.toThrow("Meta WhatsApp request timed out");
  });

  it("times out stalled Meta WhatsApp response bodies", async () => {
    const provider = new MetaWhatsAppProvider({
      accessToken: "meta-test-token",
      phoneNumberId: "123",
      fetchImpl: vi.fn(async () => hangingJsonResponse()) as unknown as typeof fetch,
      timeoutMs: 1,
    });

    await expect(
      provider.sendTemplate({
        idempotencyKey: "evt-wa-body-timeout",
        toE164: "+27821234567",
        templateName: "customer_survey",
        variables: {},
      }),
    ).rejects.toThrow("Meta WhatsApp request timed out");
  });
});
