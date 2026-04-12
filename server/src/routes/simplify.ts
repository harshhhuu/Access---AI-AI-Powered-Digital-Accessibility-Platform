import { createHash } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { callHfSimplify } from "../lib/hf-simplify.js";
import { prisma } from "../lib/prisma.js";
import { logUpstreamMs } from "../lib/upstream-log.js";
import { wordCount } from "../lib/word-count.js";

const simplifyBody = z.object({
  text: z.string(),
  grade_level: z.coerce.number().int().default(5),
});

function cacheKey(text: string, gradeLevel: number): string {
  return createHash("sha256").update(`simplify:${gradeLevel}:${text}`, "utf8").digest("hex");
}

export const simplifyRoutes: FastifyPluginAsync = async (app) => {
  app.post("/simplify", async (request, reply) => {
    const parsed = simplifyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ detail: parsed.error.flatten() });
    }

    const { text, grade_level: gradeLevel } = parsed.data;

    if (text.length > 5000) {
      return reply.status(400).send({ detail: "Text exceeds 5000 character limit" });
    }

    const key = cacheKey(text, gradeLevel);

    const cached = await prisma.aPICache.findUnique({
      where: { inputHash: key },
    });

    if (cached) {
      return reply.send({
        simplified: cached.outputText,
        word_count_before: wordCount(text),
        word_count_after: wordCount(cached.outputText),
        cached: true,
      });
    }

    let simplifiedText: string;
    try {
      const t0 = performance.now();
      simplifiedText = await callHfSimplify(text, gradeLevel);
      logUpstreamMs(request.log, "hf_simplify", Math.round(performance.now() - t0));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(502).send({ detail: msg });
    }

    await prisma.aPICache.create({
      data: {
        inputHash: key,
        endpoint: "simplify",
        gradeLevel,
        outputText: simplifiedText,
      },
    });

    return reply.send({
      simplified: simplifiedText,
      word_count_before: wordCount(text),
      word_count_after: wordCount(simplifiedText),
      cached: false,
    });
  });
};
