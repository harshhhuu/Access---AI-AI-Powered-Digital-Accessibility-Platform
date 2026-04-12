import { afterEach, describe, expect, it, vi } from "vitest";
import { predictSign, SignServiceError } from "../src/lib/sign-service-client.js";

describe("sign-service-client (fetch mocked)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.SIGN_SERVICE_URL;
  });

  it("returns sign and confidence on 200", async () => {
    process.env.SIGN_SERVICE_URL = "http://127.0.0.1:9";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ sign: "hello", confidence: 0.95 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const landmarks = Array.from({ length: 63 }, () => 0);
    const r = await predictSign(landmarks);
    expect(r.sign).toBe("hello");
    expect(r.confidence).toBeCloseTo(0.95, 5);
  });

  it("SignServiceError 503 when SIGN_SERVICE_URL unset", async () => {
    try {
      await predictSign(Array.from({ length: 63 }, () => 0));
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(SignServiceError);
      expect((e as SignServiceError).statusCode).toBe(503);
    }
  });

  it("503 when upstream unreachable", async () => {
    process.env.SIGN_SERVICE_URL = "http://127.0.0.1:9";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    try {
      await predictSign(Array.from({ length: 63 }, () => 0));
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(SignServiceError);
      expect((e as SignServiceError).statusCode).toBe(503);
      expect((e as SignServiceError).message).toContain("unreachable");
    }
  });

  it("400 maps FastAPI detail body", async () => {
    process.env.SIGN_SERVICE_URL = "http://127.0.0.1:9";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: "Expected 63 landmark floats" }), { status: 400 }),
    ) as unknown as typeof fetch;

    try {
      await predictSign(Array.from({ length: 63 }, () => 0));
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(SignServiceError);
      expect((e as SignServiceError).statusCode).toBe(400);
      expect((e as SignServiceError).message).toContain("63");
    }
  });
});
