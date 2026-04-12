import { setTimeout as delay } from "node:timers/promises";

const HF_URL = "https://router.huggingface.co/v1/chat/completions";

function hfModel(): string {
  return process.env.HF_TEXT_MODEL ?? "Qwen/Qwen2.5-72B-Instruct:novita";
}

function hfHeaders(): Record<string, string> {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error("HF_API_TOKEN is not set");
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Strip leading/trailing `"` like Python `s.strip('"')` after `.strip()`. */
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

/**
 * Same contract as the original FastAPI simplify HF helper:
 * retry once after 20s on HTTP 503.
 */
export async function callHfSimplify(text: string, gradeLevel: number): Promise<string> {
  const payload = {
    model: hfModel(),
    messages: [
      {
        role: "system",
        content:
          "You rewrite text in plain language. Keep all facts, use short sentences, and output only the rewritten text.",
      },
      {
        role: "user",
        content: `Rewrite this so a Grade ${gradeLevel} student can understand it:\n\n${text}`,
      },
    ],
    max_tokens: 512,
    temperature: 0.3,
  };

  const r = await fetch(HF_URL, {
    method: "POST",
    headers: hfHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  if (r.status === 503) {
    await delay(20_000);
    return callHfSimplify(text, gradeLevel);
  }

  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300).replace(/\n/g, " ");
    throw new Error(`HuggingFace error: ${detail}`);
  }

  const result = (await r.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  };
  const message = result.choices?.[0]?.message;
  const raw = (message?.content ?? message?.reasoning_content ?? "").trim();
  return stripOuterDoubleQuotes(raw);
}
