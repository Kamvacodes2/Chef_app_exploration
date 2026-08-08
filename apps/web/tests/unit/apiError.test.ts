import { describe, expect, it } from "vitest";
import { ChefmateApiError, readApiErrorDetails, readApiErrorMessage } from "@/lib/apiError";

describe("ChefmateApiError", () => {
  it("creates error with status and message", () => {
    const err = new ChefmateApiError(404, { message: "Not found" });
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ChefmateApiError");
  });

  it("stores optional code", () => {
    const err = new ChefmateApiError(400, {
      code: "BAD_REQUEST",
      message: "Invalid",
    });
    expect(err.code).toBe("BAD_REQUEST");
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

  it("handles string error field", async () => {
    const response = {
      json: () => Promise.resolve({ error: "Server error" }),
    } as unknown as Response;
    const result = await readApiErrorDetails(response, "Fallback");
    expect(result.message).toBe("Server error");
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
