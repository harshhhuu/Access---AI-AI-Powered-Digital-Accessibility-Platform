import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("HTTP contract (no database)", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("GET /health returns ok", async () => {
    app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ status: "ok" });
  });

  it("GET unknown route returns 404", async () => {
    app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({ method: "GET", url: "/definitely-not-defined" });
    expect(res.statusCode).toBe(404);
  });

  it("GET /auth/me without Bearer returns 401 and detail", async () => {
    app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as { detail?: string };
    expect(body.detail).toBeTruthy();
  });

  it("POST /auth/register with invalid email returns 422", async () => {
    app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "not-an-email", password: "secret" },
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { detail?: unknown };
    expect(body.detail).toBeDefined();
  });

  it("propagates x-request-id on the response", async () => {
    app = await buildApp({ skipDatabaseHooks: true });
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "client-trace-123" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toBe("client-trace-123");
  });
});
