import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCsp, config, proxy } from "@/proxy";
import nextConfig, { securityHeaders } from "@/next.config";

afterEach(() => vi.unstubAllEnvs());

describe("proxy", () => {
  it("sets a nonce-based CSP on the response and forwards the nonce to the render", () => {
    const response = proxy(new NextRequest("https://app.example/"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });

  it("issues a different nonce per request", () => {
    const first = proxy(new NextRequest("https://app.example/")).headers.get(
      "Content-Security-Policy",
    );
    const second = proxy(new NextRequest("https://app.example/")).headers.get(
      "Content-Security-Policy",
    );
    expect(first).not.toBe(second);
  });

  it("relaxes only what development tooling needs", () => {
    const dev = buildCsp("abc", true);
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("style-src 'self' 'unsafe-inline'");
    const prod = buildCsp("abc", false);
    expect(prod).toContain("style-src 'self' 'nonce-abc'");
    vi.stubEnv("NODE_ENV", "development");
    expect(
      proxy(new NextRequest("https://app.example/")).headers.get("Content-Security-Policy"),
    ).toContain("'unsafe-eval'");
  });

  it("skips API routes and static assets", () => {
    const source = config.matcher[0]?.source ?? "";
    const pattern = new RegExp(`^${source}$`);
    expect(pattern.test("/")).toBe(true);
    expect(pattern.test("/compare")).toBe(true);
    expect(pattern.test("/api/analyze")).toBe(false);
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
  });
});

describe("next.config security headers", () => {
  it("applies the static headers to every path and hides the framework banner", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toEqual([{ source: "/:path*", headers: securityHeaders }]);
    expect(securityHeaders.map((h) => h.key)).toContain("Strict-Transport-Security");
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
