import { describe, expect, it } from "vitest";
import { isSafeInternalPath, safeNextPath } from "@/lib/safePath";

describe("isSafeInternalPath", () => {
  it("accepts app-relative paths", () => {
    expect(isSafeInternalPath("/customer/dashboard")).toBe(true);
    expect(isSafeInternalPath("/customer/bookings?tab=upcoming")).toBe(true);
    expect(isSafeInternalPath("/")).toBe(true);
  });

  it("rejects empty, relative, and absolute targets", () => {
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath("customer/dashboard")).toBe(false);
    expect(isSafeInternalPath("https://evil.example")).toBe(false);
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(isSafeInternalPath("//evil.example")).toBe(false);
    expect(isSafeInternalPath("/\\evil.example")).toBe(false);
  });

  it("rejects control characters", () => {
    expect(isSafeInternalPath("/customer\r\nX-Injected: 1")).toBe(false);
    expect(isSafeInternalPath("/customer\u0000")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("returns the next param when it is a safe internal path", () => {
    expect(safeNextPath("?next=%2Fcustomer%2Fdashboard")).toBe("/customer/dashboard");
    expect(safeNextPath("?next=/customer/bookings")).toBe("/customer/bookings");
  });

  it("returns null for missing or unsafe next params", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath("?other=1")).toBeNull();
    expect(safeNextPath("?next=https%3A%2F%2Fevil.example")).toBeNull();
    expect(safeNextPath("?next=%2F%2Fevil.example")).toBeNull();
    expect(safeNextPath("?next=%0A%0Dheader")).toBeNull();
  });

  it("reads the first next param only", () => {
    expect(safeNextPath("?next=%2Fa&next=https%3A%2F%2Fevil.example")).toBe("/a");
  });
});
