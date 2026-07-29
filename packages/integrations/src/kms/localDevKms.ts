import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { EnvelopeCiphertext, KmsProvider } from "@chefmate/application";
import type { DeployEnvironment } from "@chefmate/config";

/**
 * Local-development KMS adapter.
 *
 * S02 is explicitly **not** selecting a KMS vendor — that is deferred to S09
 * with the bank-data work. What exists here is the smallest implementation that
 * lets local and test environments exercise the {@link KmsProvider} port end to
 * end, so the boundary is real rather than aspirational.
 *
 * It is hard-refused outside `local`, `test` and `ci`. A managed KMS or vault
 * adapter must be supplied for `staging` and `production`.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export const LOCAL_DEV_KMS_NAME = "local-dev-kms";

const ALLOWED_ENVIRONMENTS: readonly DeployEnvironment[] = ["local", "test", "ci"];

export class KmsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KmsConfigurationError";
  }
}

function deriveKey(material: string): Buffer {
  // The material is a developer-supplied local string, not a managed key.
  return createHash("sha256").update(material, "utf8").digest();
}

/** Additional authenticated data binds ciphertext to its encryption context. */
function encodeContext(context: Readonly<Record<string, string>>): Buffer {
  const entries = Object.entries(context).sort(([a], [b]) => a.localeCompare(b));
  return Buffer.from(JSON.stringify(entries), "utf8");
}

export class LocalDevKmsProvider implements KmsProvider {
  public readonly name = LOCAL_DEV_KMS_NAME;

  readonly #key: Buffer;
  readonly #keyVersionId: string;

  constructor(keyMaterial: string) {
    if (keyMaterial.length < 16) {
      throw new KmsConfigurationError("Local KMS key material must be at least 16 characters");
    }
    this.#key = deriveKey(keyMaterial);
    // Non-reversible label so the key version can be logged safely.
    this.#keyVersionId = `local-v1-${createHash("sha256").update(this.#key).digest("hex").slice(0, 12)}`;
  }

  async activeKeyVersionId(): Promise<string> {
    return this.#keyVersionId;
  }

  async encrypt(
    plaintext: Uint8Array,
    context: Readonly<Record<string, string>>,
  ): Promise<EnvelopeCiphertext> {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.#key, iv);
    cipher.setAAD(encodeContext(context));
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: Buffer.concat([iv, tag, body]),
      keyVersionId: this.#keyVersionId,
    };
  }

  async decrypt(
    value: EnvelopeCiphertext,
    context: Readonly<Record<string, string>>,
  ): Promise<Uint8Array> {
    if (value.keyVersionId !== this.#keyVersionId) {
      throw new KmsConfigurationError(
        `Ciphertext was produced by key version ${value.keyVersionId}, which is not available`,
      );
    }
    const buffer = Buffer.from(value.ciphertext);
    if (buffer.length < IV_BYTES + TAG_BYTES) {
      throw new KmsConfigurationError("Ciphertext is truncated");
    }
    const iv = buffer.subarray(0, IV_BYTES);
    const tag = buffer.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const body = buffer.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.#key, iv);
    decipher.setAAD(encodeContext(context));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]);
  }
}

export interface KmsFactoryInput {
  readonly deployEnv: DeployEnvironment;
  readonly localKeyMaterial?: string | undefined;
}

/**
 * Resolves the KMS adapter for an environment.
 *
 * Fails loudly rather than silently degrading, so a staging or production
 * deployment cannot come up with development-grade key handling.
 */
export function createKmsProvider(input: KmsFactoryInput): KmsProvider {
  if (!ALLOWED_ENVIRONMENTS.includes(input.deployEnv)) {
    throw new KmsConfigurationError(
      `No KMS adapter is configured for DEPLOY_ENV=${input.deployEnv}. ` +
        "A managed KMS or vault adapter is required before S09 bank data is handled.",
    );
  }
  if (input.localKeyMaterial === undefined || input.localKeyMaterial.length === 0) {
    throw new KmsConfigurationError("KMS_LOCAL_DEV_KEY is required for local, test and ci");
  }
  return new LocalDevKmsProvider(input.localKeyMaterial);
}
