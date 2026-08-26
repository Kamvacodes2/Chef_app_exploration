"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  completeReuploadTerms,
  fetchDocReuploadStatus,
  fetchPolicyStatus,
  removeDocReuploadDocument,
  uploadDocReuploadDocument,
  type DocReuploadStatus,
  type PolicyStatusItem,
  type ReuploadDocType,
  type ReuploadDocument,
} from "@/features/platform/api/platformClient";

const REUPLOAD_DOC_TYPES: readonly ReuploadDocType[] = [
  "ID_DOC",
  "BACKGROUND_CHECK",
  "CV",
  "QUALIFICATION",
  "FOOD_SAFETY",
];

const DOC_TYPE_LABELS: Record<ReuploadDocType, string> = {
  ID_DOC: "ID document",
  BACKGROUND_CHECK: "Background check",
  CV: "CV / Résumé",
  QUALIFICATION: "Qualification",
  FOOD_SAFETY: "Food safety certificate",
};

// The re-upload flow asks chefs to re-accept only the chef-specific terms
// (service agreement + code of conduct); the remaining required policies are
// handled by the standard policy-acceptance gate.
const REUPLOAD_POLICY_KEYS = new Set(["chef_service_agreement", "chef_code_of_conduct"]);

interface ChefDocReuploadScreenProps {
  readonly initialStatus: DocReuploadStatus;
  readonly onComplete: () => Promise<void>;
}

/**
 * Blocking screen shown to a chef with a pending document re-upload +
 * terms re-acceptance request (sent by an admin). The chef uploads the five
 * required compliance documents and digitally accepts the current required
 * chef policies, which emails them their acceptance record as a PDF.
 */
export function ChefDocReuploadScreen({ initialStatus, onComplete }: ChefDocReuploadScreenProps) {
  const [status, setStatus] = useState<DocReuploadStatus>(initialStatus);
  const [selectedDocType, setSelectedDocType] = useState<ReuploadDocType>("ID_DOC");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicyStatusItem[]>([]);
  const [agreeChecked, setAgreeChecked] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await fetchDocReuploadStatus();
    if (next) setStatus(next);
  }, []);

  useEffect(() => {
    void fetchPolicyStatus()
      .then((items) =>
        setPolicies(
          items.filter((policy) => policy.required && REUPLOAD_POLICY_KEYS.has(policy.policyKey)),
        ),
      )
      .catch(() => undefined);
  }, []);

  const completed = new Set(status.completedDocuments);
  const allDocsComplete = REUPLOAD_DOC_TYPES.every((docType) => completed.has(docType));
  const termsAlreadyAccepted = status.termsAccepted;
  const requiredPolicies = policies.filter((policy) => !policy.accepted);

  const handleUpload = async (docType: ReuploadDocType, file: File): Promise<void> => {
    setUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const uploaded = await uploadDocReuploadDocument(docType, file);
      setSuccess(`${DOC_TYPE_LABELS[docType]} uploaded${docUploadNote(uploaded)}.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async (docType: ReuploadDocType): Promise<void> => {
    setUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      await removeDocReuploadDocument(docType);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the document.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptTerms = async (): Promise<void> => {
    if (!allDocsComplete || requiredPolicies.length === 0 || updating) return;
    setUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await completeReuploadTerms(
        requiredPolicies.map((policy) => ({
          policyKey: policy.policyKey,
          version: policy.requiredVersion,
        })),
      );
      setSuccess(
        `Terms accepted ${new Date(result.termsAcceptedAt).toLocaleString()}. A copy of your acceptance record has been emailed to you.`,
      );
      await refresh();
      await onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not accept the terms.");
    } finally {
      setUpdating(false);
    }
  };

  const panelClass = "rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-oxblood)]">
          Action needed: re-upload & accept terms
        </h1>
        <p className="text-sm text-[var(--color-oxblood)]/80">
          As part of our refreshed chef terms, please re-upload your compliance documents and
          digitally accept the current Chefmate terms. Your acceptance record is emailed to you as a
          PDF.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-900"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <section className={panelClass}>
        <h2 className="text-xl font-black text-[var(--color-oxblood)]">Documents to re-upload</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
          All five are required. PDF, JPEG, PNG and WebP files only (max 10&nbsp;MB each).
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {REUPLOAD_DOC_TYPES.map((docType) => {
            const done = completed.has(docType);
            return (
              <div
                key={docType}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)] p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]">
                    {DOC_TYPE_LABELS[docType]}
                  </p>
                  <p className="text-xs text-[var(--color-charcoal)]/60">
                    {done ? "Uploaded — complete" : "Not uploaded yet"}
                  </p>
                </div>
                {done ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove(docType)}
                    disabled={updating || termsAlreadyAccepted}
                    className="min-h-9 shrink-0 rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-40"
                  >
                    Remove
                  </button>
                ) : (
                  <DocUploadButton
                    docType={docType}
                    label="Upload"
                    busy={updating && selectedDocType === docType}
                    onFile={(file) => {
                      setSelectedDocType(docType);
                      void handleUpload(docType, file);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={panelClass}>
        <h2 className="text-xl font-black text-[var(--color-oxblood)]">Accept the current terms</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
          Read the current Chefmate policies below, then confirm your digital acceptance. This is
          recorded against your account and a copy is emailed to you.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {requiredPolicies.map((policy) => (
            <Link
              key={policy.policyKey}
              href={policy.documentPath}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[var(--color-warm-cream)] px-4 py-3 text-sm font-bold text-[var(--color-oxblood)] underline decoration-[var(--color-oxblood)]/30 underline-offset-4"
            >
              {policy.title}
            </Link>
          ))}
          {policies.length === 0 ? (
            <p className="text-sm text-[var(--color-charcoal)]/60">Loading current policies…</p>
          ) : null}
        </div>

        {!allDocsComplete ? (
          <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/70">
            Upload all five documents above to unlock the terms acceptance.
          </p>
        ) : termsAlreadyAccepted ? (
          <p className="mt-4 text-sm font-semibold text-green-700">
            You have already accepted the current terms. Your record was emailed to you.
          </p>
        ) : requiredPolicies.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/70">
            You have already accepted all currently required policies.
          </p>
        ) : (
          <div className="mt-4 flex flex-col items-start gap-3">
            <label className="flex items-start gap-2 text-sm text-[var(--color-charcoal)]/80">
              <input
                type="checkbox"
                checked={agreeChecked}
                onChange={(event) => setAgreeChecked(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-oxblood)]"
              />
              <span>
                I have read and agree to the Chefmate terms and conditions listed above. This counts
                as my digital acceptance.
              </span>
            </label>
            <button
              type="button"
              disabled={!agreeChecked || updating}
              onClick={() => void handleAcceptTerms()}
              className="min-h-12 rounded-2xl bg-[var(--color-oxblood)] px-6 text-sm font-bold text-white disabled:opacity-40"
            >
              {updating ? "Processing…" : "Accept terms & finish"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function docUploadNote(uploaded: ReuploadDocument): string {
  return uploaded.originalName ? ` (${uploaded.originalName})` : "";
}

function DocUploadButton({
  docType,
  label,
  busy,
  onFile,
}: {
  readonly docType: ReuploadDocType;
  readonly label: string;
  readonly busy: boolean;
  readonly onFile: (file: File) => void;
}) {
  const id = `doc-upload-${docType.toLowerCase()}`;
  return (
    <label
      htmlFor={id}
      className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-xl border border-[var(--color-oxblood)]/20 px-3 text-sm font-bold text-[var(--color-oxblood)]"
    >
      {busy ? "Uploading…" : label}
      <input
        id={id}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}
