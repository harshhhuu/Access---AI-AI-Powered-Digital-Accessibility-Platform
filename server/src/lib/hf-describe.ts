import { setTimeout as delay } from "node:timers/promises";

const HF_URL = "https://router.huggingface.co/v1/chat/completions";

function hfHeaders(): Record<string, string> {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error("HF_API_TOKEN is not set");
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function visionModel(): string {
  return process.env.HF_VISION_MODEL ?? "CohereLabs/aya-vision-32b:cohere";
}

function stripOuterDoubleQuotes(s: string): string {
  let t = s.trim();
  while (t.startsWith('"')) {
    t = t.slice(1);
  }
  while (t.endsWith('"')) {
    t = t.slice(0, -1);
  }
  return t.trim();
}

export class HfDescribeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "HfDescribeError";
  }
}

/** Same contract as the original FastAPI describe HF helper. */
export async function callHfDescribe(imageBytes: Buffer, contentType: string): Promise<string> {
  const b64 = imageBytes.toString("base64");
  const imageUrl = `data:${contentType || "image/png"};base64,${b64}`;

  const payload = {
    model: visionModel(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in one short sentence." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 120,
    temperature: 0.2,
  };

  const r = await fetch(HF_URL, {
    method: "POST",
    headers: hfHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  if (r.status === 503) {
    await delay(20_000);
    return callHfDescribe(imageBytes, contentType);
  }

  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300).replace(/\n/g, " ");
    throw new HfDescribeError(`HuggingFace error: ${detail}`, 502);
  }

  const result = (await r.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  };
  const message = result.choices?.[0]?.message;
  const raw = (message?.content ?? message?.reasoning_content ?? "").trim();
  return stripOuterDoubleQuotes(raw);
}
