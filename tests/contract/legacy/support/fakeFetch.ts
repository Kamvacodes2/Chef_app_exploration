import { vi, type Mock } from "vitest";

export interface FakeResponseInit {
  readonly status?: number;
  readonly body?: unknown;
  /** Throws when the legacy client tries to read a non-JSON error body. */
  readonly bodyThrows?: boolean;
}

export interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

/**
 * Minimal `Response`-shaped stand-in. The legacy browser clients only ever read
 * `ok`, `status`, and `json()`, so characterizing more would over-specify them.
 */
export function fakeResponse(init: FakeResponseInit = {}): Response {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (init.bodyThrows) throw new SyntaxError("Unexpected token < in JSON at position 0");
      return init.body;
    },
  } as unknown as Response;
}

/** A `fetch` double that always answers with the same fake response. */
export function fakeFetch(init: FakeResponseInit = {}): Mock {
  return vi.fn(async () => fakeResponse(init));
}

/** A `fetch` double answering a queued sequence, one response per call. */
export function fakeFetchSequence(inits: readonly FakeResponseInit[]): Mock {
  let index = 0;
  return vi.fn(async () => {
    const init = inits[index] ?? inits[inits.length - 1];
    index += 1;
    return fakeResponse(init ?? {});
  });
}

/** Reads the recorded request so assertions describe the wire call, not the mock. */
export function recordedCall(mock: Mock, callIndex = 0): RecordedCall {
  const call = mock.mock.calls[callIndex];
  if (!call) throw new Error("No fetch call was recorded at index " + callIndex + ".");
  return { url: String(call[0]), init: call[1] as RequestInit | undefined };
}

/** Normalizes a recorded call into a stable, snapshot-safe contract record. */
export function wireRequest(mock: Mock, callIndex = 0): Record<string, unknown> {
  const { url, init } = recordedCall(mock, callIndex);
  const parsed = new URL(url);
  return {
    method: init?.method ?? "GET",
    origin: parsed.origin,
    pathname: parsed.pathname,
    search: parsed.search,
    credentials: init?.credentials ?? null,
    headers: init?.headers ?? null,
    hasAbortSignal: Boolean(init?.signal),
    body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null,
  };
}
