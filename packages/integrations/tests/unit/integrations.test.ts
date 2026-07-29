import { describe, expect, it } from "vitest";
import {
  createKmsProvider,
  emptyProviderRegistry,
  KmsConfigurationError,
  LOCAL_DEV_KMS_NAME,
  LocalDevKmsProvider,
  ProviderNotConfiguredError,
  requireMail,
  requireMessaging,
  requirePayment,
  requirePayout,
} from "../../src/index.js";

const KEY = "local-development-key-material";
const context = { purpose: "bank_account", subjectId: "chef-1" } as const;

describe("provider registry", () => {
  it("is empty in S02 — no adapter exists yet", () => {
    expect(Object.keys(emptyProviderRegistry)).toEqual([]);
  });

  it("throws a specific error for each unconfigured port", () => {
    for (const [resolve, port] of [
      [requirePayment, "payment"],
      [requirePayout, "payout"],
      [requireMail, "mail"],
      [requireMessaging, "messaging"],
    ] as const) {
      try {
        resolve(emptyProviderRegistry);
        expect.unreachable(`${port} should not resolve`);
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderNotConfiguredError);
        expect((error as ProviderNotConfiguredError).port).toBe(port);
      }
    }
  });

  it("returns a registered adapter once one exists", () => {
    const payment = {
      name: "fake",
      initiateCheckout: () =>
        Promise.resolve({ provider: "fake", reference: "r", redirectUrl: "https://x.test" }),
      verifyWebhookSignature: () => true,
    };
    expect(requirePayment({ payment })).toBe(payment);
  });
});

describe("LocalDevKmsProvider", () => {
  it("round-trips a value", async () => {
    const kms = new LocalDevKmsProvider(KEY);
    const plaintext = new TextEncoder().encode("6011 0000 0000 0004");

    const encrypted = await kms.encrypt(plaintext, context);
    expect(Buffer.from(encrypted.ciphertext).toString("utf8")).not.toContain("6011");

    const decrypted = await kms.decrypt(encrypted, context);
    expect(new TextDecoder().decode(decrypted)).toBe("6011 0000 0000 0004");
  });

  it("produces a different ciphertext each time", async () => {
    const kms = new LocalDevKmsProvider(KEY);
    const plaintext = new TextEncoder().encode("same input");
    const a = await kms.encrypt(plaintext, context);
    const b = await kms.encrypt(plaintext, context);
    expect(Buffer.from(a.ciphertext).equals(Buffer.from(b.ciphertext))).toBe(false);
  });

  it("exposes a loggable, non-reversible key version id", async () => {
    const kms = new LocalDevKmsProvider(KEY);
    const versionId = await kms.activeKeyVersionId();
    expect(versionId).toMatch(/^local-v1-[0-9a-f]{12}$/);
    expect(versionId).not.toContain(KEY);
    expect(kms.name).toBe(LOCAL_DEV_KMS_NAME);
  });

  it("binds ciphertext to its encryption context", async () => {
    const kms = new LocalDevKmsProvider(KEY);
    const encrypted = await kms.encrypt(new TextEncoder().encode("secret"), context);
    await expect(kms.decrypt(encrypted, { purpose: "something_else" })).rejects.toThrow();
  });

  it("refuses ciphertext produced by another key version", async () => {
    const encrypted = await new LocalDevKmsProvider(KEY).encrypt(new Uint8Array([1]), context);
    const other = new LocalDevKmsProvider("a-completely-different-key");
    await expect(other.decrypt(encrypted, context)).rejects.toBeInstanceOf(KmsConfigurationError);
  });

  it("rejects truncated ciphertext", async () => {
    const kms = new LocalDevKmsProvider(KEY);
    const encrypted = await kms.encrypt(new Uint8Array([1, 2, 3]), context);
    await expect(
      kms.decrypt({ ...encrypted, ciphertext: new Uint8Array([1, 2]) }, context),
    ).rejects.toThrow(/truncated/i);
  });

  it("rejects weak key material", () => {
    expect(() => new LocalDevKmsProvider("short")).toThrow(KmsConfigurationError);
  });
});

describe("createKmsProvider", () => {
  it("builds the local adapter for local, test and ci", () => {
    for (const deployEnv of ["local", "test", "ci"] as const) {
      expect(createKmsProvider({ deployEnv, localKeyMaterial: KEY }).name).toBe(LOCAL_DEV_KMS_NAME);
    }
  });

  /**
   * The whole point of the boundary: a real KMS is deferred to S09, so a
   * staging or production process must refuse to start rather than fall back to
   * development-grade key handling.
   */
  it("refuses to supply a development adapter to staging or production", () => {
    for (const deployEnv of ["staging", "production"] as const) {
      expect(() => createKmsProvider({ deployEnv, localKeyMaterial: KEY })).toThrow(
        /No KMS adapter is configured/,
      );
    }
  });

  it("requires key material even locally", () => {
    expect(() => createKmsProvider({ deployEnv: "local", localKeyMaterial: undefined })).toThrow(
      /KMS_LOCAL_DEV_KEY/,
    );
    expect(() => createKmsProvider({ deployEnv: "local", localKeyMaterial: "" })).toThrow(
      /KMS_LOCAL_DEV_KEY/,
    );
  });
});
