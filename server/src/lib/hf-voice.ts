import { setTimeout as delay } from "node:timers/promises";

/** Hugging Face Whisper Router endpoint (parity with original FastAPI behavior). */
const HF_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3";

const MAX_RETRIES = 3;

function hfHeaders(): Record<string, string> {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error("HF_API_TOKEN is not set");
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "audio/wav" };
}

/** Raw POST body; HF expects `Content-Type: audio/wav`. */
export async function callHfWhisper(audioBytes: Buffer, retry = 0): Promise<string> {
  const r = await fetch(HF_URL, {
    method: "POST",
    headers: hfHeaders(),
    body: audioBytes,
    signal: AbortSignal.timeout(120_000),
  });

  if (r.status === 503) {
    if (retry >= MAX_RETRIES) {
      const err = new Error("Whisper model unavailable after retries") as Error & { statusCode: number };
      err.statusCode = 503;
      throw err;
    }
    const waitMs = (20 + retry * 10) * 1000;
    await delay(waitMs);
    return callHfWhisper(audioBytes, retry + 1);
  }

  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300).replace(/\n/g, " ");
    throw new Error(`HuggingFace Whisper error: ${detail}`);
  }

  const result = (await r.json()) as unknown;
  if (Array.isArray(result)) {
    const first = result[0] as { text?: string };
    return first?.text ?? "";
  }
  if (result && typeof result === "object" && "text" in result) {
    return String((result as { text?: string }).text ?? "");
  }
  return "";
}
