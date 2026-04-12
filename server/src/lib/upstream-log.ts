import type { FastifyBaseLogger } from "fastify";

/** Structured observability: upstream latency (HF, sign-inference) in logs. */
export function logUpstreamMs(
  log: FastifyBaseLogger,
  upstream: "hf_simplify" | "hf_describe" | "hf_whisper" | "sign_inference",
  ms: number,
): void {
  log.info({ upstream, upstreamMs: ms }, "upstream");
}
