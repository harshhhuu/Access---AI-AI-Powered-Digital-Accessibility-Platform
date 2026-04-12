import { createHash } from "node:crypto";
import type { FastifyBaseLogger, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { describeImageLocally } from "../lib/describe-local.js";
import { callHfDescribe, HfDescribeError } from "../lib/hf-describe.js";
import { fetchRemoteImage } from "../lib/fetch-remote-image.js";
import { prisma } from "../lib/prisma.js";
import { logUpstreamMs } from "../lib/upstream-log.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const urlBody = z.object({
  url: z.string().url(),
});

function describeCacheKey(imageBytes: Buffer): string {
  return createHash("sha256").update(Buffer.concat([Buffer.from("describe:v2:", "utf8"), imageBytes])).digest("hex");
}

async function generateDescription(
  imageBytes: Buffer,
  contentType: string,
  log?: FastifyBaseLogger,
): Promise<{ description: string; cached: boolean }> {
  const cacheKey = describeCacheKey(imageBytes);

  const cached = await prisma.aPICache.findUnique({
    where: { inputHash: cacheKey },
  });
  if (cached) {
    return { description: cached.outputText, cached: true };
  }

  let description: string;
  try {
    const t0 = performance.now();
    try {
      description = await callHfDescribe(imageBytes, contentType);
    } finally {
      if (log) {
        logUpstreamMs(log, "hf_describe", Math.round(performance.now() - t0));
      }
    }
  } catch (e) {
    if (e instanceof HfDescribeError && e.statusCode === 502) {
      try {
        description = await describeImageLocally(imageBytes);
      } catch (localErr) {
        const msg = localErr instanceof Error ? localErr.message : String(localErr);
        throw Object.assign(new Error(msg), { statusCode: 400 });
      }
    } else {
      throw e;
    }
  }

  await prisma.aPICache.create({
    data: {
      inputHash: cacheKey,
      endpoint: "describe",
      outputText: description,
      gradeLevel: null,
    },
  });

  return { description, cached: false };
}

export const describeRoutes: FastifyPluginAsync = async (app) => {
  app.post("/describe", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ detail: "Missing image file" });
    }
    if (data.fieldname !== "image") {
      return reply.status(400).send({ detail: "Field name must be image" });
    }

    const mime = (data.mimetype ?? "").toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) {
      return reply.status(400).send({ detail: "Only JPEG, PNG, WebP, GIF allowed" });
    }

    const imageBytes = await data.toBuffer();
    if (imageBytes.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ detail: "Image must be under 5 MB" });
    }

    try {
      const result = await generateDescription(imageBytes, mime || "image/png", request.log);
      return reply.send(result);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      if (err.statusCode === 400) {
        return reply.status(400).send({ detail: err.message });
      }
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(502).send({ detail: msg });
    }
  });

  app.post("/describe/url", async (request, reply) => {
    const parsed = urlBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ detail: parsed.error.flatten() });
    }

    let imageBytes: Buffer;
    let contentType: string;
    try {
      const fetched = await fetchRemoteImage(parsed.data.url);
      imageBytes = fetched.bytes;
      contentType = fetched.contentType;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(400).send({ detail: msg });
    }

    try {
      const result = await generateDescription(imageBytes, contentType, request.log);
      return reply.send(result);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      if (err.statusCode === 400) {
        return reply.status(400).send({ detail: err.message });
      }
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(502).send({ detail: msg });
    }
  });
};
