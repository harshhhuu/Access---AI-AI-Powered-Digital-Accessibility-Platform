import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createAccessToken, verifyAccessToken } from "../lib/auth-tokens.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";

const registerBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

const preferencesBody = z.object({
  preferences: z.record(z.string(), z.unknown()),
});

function userResponse(user: { id: number; email: string; preferences: unknown }) {
  return {
    id: user.id,
    email: user.email,
    preferences: (user.preferences ?? {}) as Record<string, unknown>,
  };
}

async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply
      .status(401)
      .header("WWW-Authenticate", "Bearer")
      .send({ detail: "Invalid or expired token" });
  }
  const token = header.slice(7).trim();
  if (!token) {
    return reply
      .status(401)
      .header("WWW-Authenticate", "Bearer")
      .send({ detail: "Invalid or expired token" });
  }
  try {
    const { sub } = verifyAccessToken(token);
    const id = parseInt(sub, 10);
    if (Number.isNaN(id)) {
      throw new Error("invalid sub");
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply
        .status(401)
        .header("WWW-Authenticate", "Bearer")
        .send({ detail: "Invalid or expired token" });
    }
    request.authUser = user;
  } catch {
    return reply
      .status(401)
      .header("WWW-Authenticate", "Bearer")
      .send({ detail: "Invalid or expired token" });
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ detail: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(400).send({ detail: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
      },
    });

    const access_token = createAccessToken({ sub: String(user.id) });
    return reply.send({ access_token, token_type: "bearer" });
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ detail: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.hashedPassword))) {
      return reply.status(401).send({ detail: "Incorrect email or password" });
    }

    const access_token = createAccessToken({ sub: String(user.id) });
    return reply.send({ access_token, token_type: "bearer" });
  });

  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const user = request.authUser;
    if (!user) {
      return reply.status(401).send({ detail: "Invalid or expired token" });
    }
    return reply.send(userResponse(user));
  });

  app.put("/preferences", { preHandler: authenticate }, async (request, reply) => {
    const user = request.authUser;
    if (!user) {
      return reply.status(401).send({ detail: "Invalid or expired token" });
    }

    const parsed = preferencesBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ detail: parsed.error.flatten() });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { preferences: parsed.data.preferences as Prisma.InputJsonValue },
    });

    return reply.send(userResponse(updated));
  });
};
