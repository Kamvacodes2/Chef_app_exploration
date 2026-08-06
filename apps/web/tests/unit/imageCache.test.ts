import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("image cache configuration", () => {
  it("sets a long minimumCacheTTL so optimized images are cached by the browser for a year", () => {
    expect(nextConfig.images?.minimumCacheTTL).toBe(31536000);
  });

  it("serves public/images assets with a year-long immutable Cache-Control header", async () => {
    expect(nextConfig.headers).toBeDefined();
    const headersFn = nextConfig.headers as NonNullable<typeof nextConfig.headers>;
    const rules = await headersFn();
    expect(rules).toBeInstanceOf(Array);

    const imageRule = rules.find(
      (rule) => typeof rule.source === "string" && rule.source === "/images/:path*",
    );
    expect(imageRule).toBeDefined();
    if (!imageRule || !("source" in imageRule)) {
      throw new Error("Expected a header rule for /images/:path*");
    }

    const cacheHeader = imageRule.headers?.find((h) => h.key === "Cache-Control");
    expect(cacheHeader).toBeDefined();
    expect(cacheHeader?.value).toBe("public, max-age=31536000, immutable");
  });
});
