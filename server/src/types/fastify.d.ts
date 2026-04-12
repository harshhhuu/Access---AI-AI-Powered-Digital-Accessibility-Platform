import type { User } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `authenticate` preHandler for protected `/auth/*` routes. */
    authUser?: User;
  }
}
