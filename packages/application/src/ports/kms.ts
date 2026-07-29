/**
 * Key-management boundary (blueprint invariant 4.3.3).
 *
 * S02 defines the **port only**. No KMS vendor is selected, configured, or
 * integrated here; that decision and the bank-data work it serves belong to
 * S09. Declaring the interface now is what stops an intervening step from
 * reaching for a raw crypto call or an ambient key.
 *
 * The shape is deliberately envelope-encryption oriented: callers hand over
 * plaintext and receive a ciphertext plus the *identifier* of the key version
 * that produced it, so historical material remains recoverable after rotation
 * (acceptance `A21`).
 */

export interface EnvelopeCiphertext {
  /** Opaque, provider-specific ciphertext. Never logged, indexed, or exported. */
  readonly ciphertext: Uint8Array;
  /** Identifier of the key version used. Safe to persist and to log. */
  readonly keyVersionId: string;
}

export interface KmsProvider {
  readonly name: string;
  /** Identifier of the key version new writes will use. */
  activeKeyVersionId(): Promise<string>;
  encrypt(
    plaintext: Uint8Array,
    context: Readonly<Record<string, string>>,
  ): Promise<EnvelopeCiphertext>;
  /** Must succeed for historical key versions, not only the active one. */
  decrypt(
    value: EnvelopeCiphertext,
    context: Readonly<Record<string, string>>,
  ): Promise<Uint8Array>;
}
