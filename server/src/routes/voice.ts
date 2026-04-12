import { createHash } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { callHfWhisper } from "../lib/hf-voice.js";
import { prisma } from "../lib/prisma.js";
import { logUpstreamMs } from "../lib/upstream-log.js";

function voiceCacheKey(audioBytes: Buffer): string {
  return createHash("sha256").update(Buffer.concat([Buffer.from("voice:", "utf8"), audioBytes])).digest("hex");
}

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  app.post("/voice", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ detail: "Missing audio file" });
    }
    if (data.fieldname !== "audio") {
      return reply.status(400).send({ detail: "Field name must be audio" });
    }

    const audioBytes = await data.toBuffer();

    if (audioBytes.length === 0) {
      return reply.status(400).send({ detail: "Audio file is empty" });
    }
    if (audioBytes.length > 25 * 1024 * 1024) {
      return reply.status(400).send({ detail: "Audio must be under 25 MB" });
    }

    const cacheKey = voiceCacheKey(audioBytes);

    const cached = await prisma.aPICache.findUnique({
      where: { inputHash: cacheKey },
    });
    if (cached) {
      return reply.send({ transcript: cached.outputText, cached: true });
    }

    let transcript: string;
    try {
      const t0 = performance.now();
      transcript = await callHfWhisper(audioBytes);
      logUpstreamMs(request.log, "hf_whisper", Math.round(performance.now() - t0));
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      const msg = e instanceof Error ? e.message : String(e);
      if (err.statusCode === 503) {
        return reply.status(503).send({ detail: msg });
      }
      return reply.status(502).send({ detail: msg });
    }

    await prisma.aPICache.create({
      data: {
        inputHash: cacheKey,
        endpoint: "voice",
        outputText: transcript,
        gradeLevel: null,
      },
    });

    return reply.send({ transcript, cached: false });
  });
};
