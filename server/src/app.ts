import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { describeRoutes } from "./routes/describe.js";
import { signRoutes } from "./routes/sign.js";
import { simplifyRoutes } from "./routes/simplify.js";
import { voiceRoutes } from "./routes/voice.js";

function parseOrigins(): string[] {
  const frontend = process.env.FRONTEND_URL ?? "https://your-vercel-app.vercel.app";
  return [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    frontend,
  ];
}

export type BuildAppOptions = {
  /** Skip Prisma ping on startup / disconnect on close (for tests without a database). */
  skipDatabaseHooks?: boolean;
};

export async function buildApp(options?: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    genReqId: (req) => {
      const h = req.headers["x-request-id"];
      return typeof h === "string" && h.length > 0 ? h : randomUUID();
    },
  });

  await app.register(cors, {
    origin: parseOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: "*",
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  await app.register(websocket);

  app.get("/health", async () => ({
    status: "ok",
    message: "AccessAI API is running",
  }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(simplifyRoutes, { prefix: "/api" });
  await app.register(describeRoutes, { prefix: "/api" });
  await app.register(voiceRoutes, { prefix: "/api" });
  await app.register(signRoutes);

  if (!options?.skipDatabaseHooks) {
    app.addHook("onReady", async () => {
      await prisma.$queryRaw`SELECT 1`;
    });

    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  return app;
}
