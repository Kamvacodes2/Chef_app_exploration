import type {
  MessagingProvider,
  ProviderReference,
  SendTemplateMessageInput,
} from "@chefmate/application";

const DEFAULT_TIMEOUT_MS = 10_000;

export interface MetaWhatsAppProviderOptions {
  readonly accessToken: string;
  readonly phoneNumberId: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

interface MetaResponse {
  readonly messages?: readonly { readonly id?: string }[];
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

export class MetaWhatsAppProvider implements MessagingProvider {
  public readonly name = "meta-whatsapp";

  readonly #accessToken: string;
  readonly #phoneNumberId: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: MetaWhatsAppProviderOptions) {
    this.#accessToken = options.accessToken;
    this.#phoneNumberId = options.phoneNumberId;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }

  async sendTemplate(input: SendTemplateMessageInput): Promise<ProviderReference> {
    const body = await withTimeout(
      this.#timeoutMs,
      "Meta WhatsApp request timed out",
      async (signal) => {
        const response = await this.#fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(this.#phoneNumberId)}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.#accessToken}`,
              "Content-Type": "application/json",
            },
            signal,
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: input.toE164,
              type: "template",
              template: {
                name: input.templateName,
                language: { code: "en" },
                components: [
                  {
                    type: "body",
                    parameters: Object.values(input.variables).map((text) => ({
                      type: "text",
                      text,
                    })),
                  },
                ],
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Meta WhatsApp returned ${response.status}`);
        }

        return (await response.json().catch(() => ({}))) as MetaResponse;
      },
    );

    return {
      provider: this.name,
      reference: body.messages?.[0]?.id ?? input.idempotencyKey,
    };
  }
  verifyWebhookSignature(): boolean {
    // Inbound webhook verification is added with WhatsApp egress enablement.
    return false;
  }
}
