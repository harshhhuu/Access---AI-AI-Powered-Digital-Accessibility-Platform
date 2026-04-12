/** Calls `services/sign-inference` — `POST /predict` with `{ landmarks }`. */

export type SignPredictResult = { sign: string; confidence: number };

export class SignServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SignServiceError";
  }
}

function baseUrl(): string | null {
  const u = process.env.SIGN_SERVICE_URL?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

export function requireSignServiceUrl(): string {
  const b = baseUrl();
  if (!b) {
    throw new SignServiceError("SIGN_SERVICE_URL is not set", 503);
  }
  return b;
}

async function parseFastApiDetail(r: Response): Promise<string> {
  const text = await r.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") {
      return j.detail;
    }
    if (Array.isArray(j.detail)) {
      return j.detail.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: unknown }).msg) : String(x))).join("; ");
    }
  } catch {
    /* ignore */
  }
  return text.slice(0, 400).replace(/\n/g, " ");
}

export async function predictSign(landmarks: number[]): Promise<SignPredictResult> {
  const root = requireSignServiceUrl();
  let r: Response;
  try {
    r = await fetch(`${root}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landmarks }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new SignServiceError(`Sign service unreachable: ${msg}`, 503);
  }

  if (!r.ok) {
    const detail = await parseFastApiDetail(r);
    if (r.status === 400) {
      throw new SignServiceError(detail, 400);
    }
    throw new SignServiceError(detail, 503);
  }

  return (await r.json()) as SignPredictResult;
}
