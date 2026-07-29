import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type {
  Clock,
  IdGenerator,
  KmsProvider,
  MailProvider,
  MessagingProvider,
  PaymentProvider,
  PayoutProvider,
  UnitOfWork,
} from "../../src/index.js";
import { cents } from "@chefmate/domain";

/**
 * The application layer is a **port declaration** layer. Its guarantee is
 * structural, so the tests are structural too: the ports must be satisfiable,
 * and the layer must stay free of any runtime dependency (ADR-0006, section 18).
 */

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

function allSources(dir: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...allSources(full));
    } else if (entry.name.endsWith(".ts")) {
      output.push(full);
    }
  }
  return output;
}

describe("the application layer contains no runtime implementation", () => {
  it("declares types only — no class, no exported const, no side effect", () => {
    const offenders: string[] = [];
    for (const file of allSources(srcDir)) {
      const contents = readFileSync(file, "utf8");
      if (/^\s*export\s+(?:class|const|let|var|function)\s/m.test(contents)) {
        offenders.push(path.basename(file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("imports no vendor package", () => {
    const offenders: string[] = [];
    for (const file of allSources(srcDir)) {
      for (const match of readFileSync(file, "utf8").matchAll(/from\s+["']([^"'.][^"']*)["']/g)) {
        const specifier = match[1] ?? "";
        if (!specifier.startsWith("@chefmate/")) {
          offenders.push(`${path.basename(file)} -> ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the ports are satisfiable", () => {
  /**
   * These fakes are the S02 proof that each port is implementable and that its
   * shape is what later steps will build adapters against.
   */
  const reference = { provider: "fake", reference: "ref-1" };

  it("PaymentProvider", async () => {
    const provider: PaymentProvider = {
      name: "fake-payment",
      initiateCheckout: () =>
        Promise.resolve({ ...reference, redirectUrl: "https://example.test/pay" }),
      verifyWebhookSignature: () => true,
    };

    const result = await provider.initiateCheckout({
      idempotencyKey: "idem-1",
      amountCents: cents(52_785),
      currency: "ZAR",
      customerEmail: "customer@example.test",
      callbackUrl: "https://example.test/return",
      metadata: { orderRef: "ORD-1" },
    });
    expect(result.redirectUrl).toContain("https://");
    expect(provider.verifyWebhookSignature(Buffer.from("{}"), "sig")).toBe(true);
  });

  it("PayoutProvider", async () => {
    const provider: PayoutProvider = {
      name: "fake-payout",
      initiateTransfer: () => Promise.resolve(reference),
      verifyWebhookSignature: () => false,
    };
    await expect(
      provider.initiateTransfer({
        idempotencyKey: "idem-2",
        amountCents: cents(34_310),
        currency: "ZAR",
        recipientReference: "chef-1",
      }),
    ).resolves.toEqual(reference);
  });

  it("MailProvider", async () => {
    const provider: MailProvider = {
      name: "fake-mail",
      sendTransactional: () => Promise.resolve(reference),
      verifyWebhookSignature: () => true,
    };
    await expect(
      provider.sendTransactional({
        idempotencyKey: "idem-3",
        to: "customer@example.test",
        subject: "Booking confirmed",
        html: "<p>ok</p>",
        text: "ok",
      }),
    ).resolves.toEqual(reference);
  });

  it("MessagingProvider", async () => {
    const provider: MessagingProvider = {
      name: "fake-messaging",
      sendTemplate: () => Promise.resolve(reference),
      verifyWebhookSignature: () => true,
    };
    await expect(
      provider.sendTemplate({
        idempotencyKey: "idem-4",
        toE164: "+27110000000",
        templateName: "offer_available_v1",
        variables: { amount: "R343.10" },
      }),
    ).resolves.toEqual(reference);
  });

  it("KmsProvider", async () => {
    const provider: KmsProvider = {
      name: "fake-kms",
      activeKeyVersionId: () => Promise.resolve("v1"),
      encrypt: (plaintext) => Promise.resolve({ ciphertext: plaintext, keyVersionId: "v1" }),
      decrypt: (value) => Promise.resolve(value.ciphertext),
    };
    const encrypted = await provider.encrypt(new Uint8Array([1, 2, 3]), { purpose: "bank" });
    expect(encrypted.keyVersionId).toBe("v1");
    await expect(provider.decrypt(encrypted, { purpose: "bank" })).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    await expect(provider.activeKeyVersionId()).resolves.toBe("v1");
  });

  it("Clock, IdGenerator and UnitOfWork", async () => {
    const clock: Clock = { now: () => new Date("2026-01-01T00:00:00.000Z") };
    const ids: IdGenerator = { next: () => "id-1" };
    const uow: UnitOfWork = {
      transaction: (fn) => fn({ query: () => Promise.resolve([]) }),
    };

    expect(clock.now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(ids.next()).toBe("id-1");
    await expect(uow.transaction(async (tx) => (await tx.query("SELECT 1")).length)).resolves.toBe(
      0,
    );
  });
});
