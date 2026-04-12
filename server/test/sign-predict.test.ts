import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    signLog: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    aPICache: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";

/** 63 floats — same shape as production; values arbitrary for mocked upstream. */
const goldenLandmarks = Array.from({ length: 63 }, () => 0);

describe("POST /api/sign/predict (golden + validation)", () => {
  it("golden vector: returns sign and confidence within tolerance; logs to SignLog", async () => {
    process.env.SIGN_SERVICE_URL = "http://127.0.0.1:9";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ sign: "hello", confidence: 0.971 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    vi.mocked(prisma.signLog.create).mockClear();

    const app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({
      method: "POST",
      url: "/api/sign/predict",
      payload: { landmarks: goldenLandmarks },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { sign: string; confidence: number };
    expect(body.sign).toBe("hello");
    expect(body.confidence).toBeCloseTo(0.971, 2);
    expect(prisma.signLog.create).toHaveBeenCalledOnce();
  });

  it("400 when landmark count is not 63", async () => {
    process.env.SIGN_SERVICE_URL = "http://127.0.0.1:9";
    const app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({
      method: "POST",
      url: "/api/sign/predict",
      payload: { landmarks: [1, 2, 3] },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { detail: string };
    expect(body.detail).toMatch(/63/);
  });

  it("503 JSON when upstream returns 503", async () => {
    process.env.SIGN_SERVICE_URL = "http://127.0.0.1:9";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: "model missing" }), { status: 503 }),
    ) as unknown as typeof fetch;

    const app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({
      method: "POST",
      url: "/api/sign/predict",
      payload: { landmarks: goldenLandmarks },
    });
    await app.close();

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body) as { detail: string };
    expect(body.detail).toContain("model");
  });
});
