import { describe, expect, it } from "vitest";
import { ChefmateApiError, readApiErrorDetails, readApiErrorMessage } from "@/lib/apiError";

describe("ChefmateApiError", () => {
  it("creates error with status and message", () => {
    const err = new ChefmateApiError(404, { message: "Not found" });
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ChefmateApiError");
    expect(err.code).toBeUndefined();
  });

  it("stores optional code", () => {
    const err = new ChefmateApiError(400, {
      code: "BAD_REQUEST",
      message: "Invalid",
    });
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.status).toBe(400);
  });
});

describe("readApiErrorDetails", () => {
  it("returns fallback on JSON parse failure", async () => {
    const response = {
      json: () => Promise.reject(new Error("bad json")),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback");
    expect(result.message).toBe("Fallback");
  });

  it("returns fallback on invalid schema", async () => {
    const response = {
      json: () => Promise.resolve([1, 2, 3]),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback message");
    expect(result.message).toBe("Fallback message");
  });

  it("parses message from body", async () => {
    const response = {
      json: () => Promise.resolve({ message: "Something went wrong" }),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback");
    expect(result.message).toBe("Something went wrong");
  });

  it("extracts code from nested error object", async () => {
    const response = {
      json: () =>
        Promise.resolve({
          error: { code: "VALIDATION_ERROR", message: "Invalid input" },
        }),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback");
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("Invalid input");
  });

  it("handles string error field with top-level code", async () => {
    const response = {
      json: () => Promise.resolve({ error: "Server error", code: "SERVER_ERROR" }),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback");
    expect(result.code).toBe("SERVER_ERROR");
    expect(result.message).toBe("Server error");
  });

  it("falls back when error object has no message", async () => {
    const response = {
      json: () => Promise.resolve({ error: {} }),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback text");
    expect(result.message).toBe("Fallback text");
  });

  it("prefers top-level message over nested error object", async () => {
    const response = {
      json: () =>
        Promise.resolve({
          message: "Top level message",
          error: { message: "Nested message" },
        }),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback text");
    expect(result.message).toBe("Top level message");
  });
});

describe("readApiErrorMessage", () => {
  it("returns message string", async () => {
    const response = {
      json: () => Promise.resolve({ message: "Failed" }),
    } as unknown as Response;
    const result = await readApiErrorMessage(response, "Fallback");
    expect(result).toBe("Failed");
  });
});
