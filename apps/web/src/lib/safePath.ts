/**
 * True when `candidate` is a safe internal redirect target: an app-relative
 * path starting with a single slash. Rejects absolute URLs, protocol-relative
 * URLs and scheme tricks so a crafted `?next=` value can never bounce the
 * customer off-site after signing in.
 */
export function isSafeInternalPath(candidate: string | null | undefined): candidate is string {
  if (!candidate || !candidate.startsWith("/")) return false;
  // "//example.com" and "/\example.com" are parsed as protocol-relative URLs.
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return false;
  // Control characters (e.g. \r\n) could enable header-style injection downstream.
  if (/[\r\n\u0000-\u001f]/.test(candidate)) return false;
  return true;
}

/**
 * Reads the `next` search parameter and returns it only when it is a safe
 * internal path; otherwise returns null so callers fall back to the default.
 */
export function safeNextPath(search: string): string | null {
  const candidate = new URLSearchParams(search).get("next");
  return isSafeInternalPath(candidate) ? candidate : null;
}
