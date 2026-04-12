import type { FastifyPluginAsync } from "fastify";
import { predictSign, SignServiceError } from "../lib/sign-service-client.js";
import { prisma } from "../lib/prisma.js";
import { logUpstreamMs } from "../lib/upstream-log.js";

function parseLandmarks(body: unknown):
  | { ok: true; landmarks: number[] }
  | { ok: false; len: number; reason?: "nan" } {
  const landmarks = (body as { landmarks?: unknown })?.landmarks;
  if (!Array.isArray(landmarks)) {
    return { ok: false, len: 0 };
  }
  if (landmarks.length !== 63) {
    return { ok: false, len: landmarks.length };
  }
  const nums = landmarks.map((x) => Number(x));
  if (nums.some((n) => !Number.isFinite(n))) {
    return { ok: false, len: 63, reason: "nan" };
  }
  return { ok: true, landmarks: nums };
}

function sendJson(socket: { send: (data: string) => void }, payload: unknown) {
  socket.send(JSON.stringify(payload));
}

export const signRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/sign/predict", async (request, reply) => {
    const parsed = parseLandmarks(request.body);
    if (!parsed.ok) {
      const detail =
        parsed.reason === "nan"
          ? "Landmarks must be finite numbers"
          : `Expected 63 landmark floats, got ${parsed.len}`;
      return reply.status(400).send({ detail });
    }

    try {
      const t0 = performance.now();
      const result = await predictSign(parsed.landmarks);
      logUpstreamMs(request.log, "sign_inference", Math.round(performance.now() - t0));
      await prisma.signLog.create({
        data: {
          detectedSign: result.sign,
          confidence: result.confidence,
          landmarkJson: parsed.landmarks,
        },
      });
      return reply.send(result);
    } catch (e) {
      if (e instanceof SignServiceError) {
        return reply.status(e.statusCode).send({ detail: e.message });
      }
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(503).send({ detail: `Sign model error: ${msg}` });
    }
  });

  app.get("/ws/sign", { websocket: true }, (socket, request) => {
    socket.on("message", async (raw: Buffer) => {
      let data: unknown;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        sendJson(socket, { error: "Invalid JSON" });
        return;
      }

      const landmarks = (data as { landmarks?: unknown })?.landmarks;
      if (!Array.isArray(landmarks) || landmarks.length !== 63) {
        const len = Array.isArray(landmarks) ? landmarks.length : 0;
        sendJson(socket, { error: `Expected 63 landmarks, got ${len}` });
        return;
      }

      const nums = landmarks.map((x) => Number(x));
      if (nums.some((n) => !Number.isFinite(n))) {
        sendJson(socket, { error: "Expected 63 landmarks, got invalid numbers" });
        return;
      }

      try {
        const t0 = performance.now();
        const result = await predictSign(nums);
        logUpstreamMs(request.log, "sign_inference", Math.round(performance.now() - t0));
        sendJson(socket, result);
      } catch (e) {
        const msg = e instanceof SignServiceError ? e.message : e instanceof Error ? e.message : String(e);
        sendJson(socket, { error: msg });
      }
    });
  });
};
