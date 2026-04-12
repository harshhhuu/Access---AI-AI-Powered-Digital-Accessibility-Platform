import { URL } from "node:url";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateRemoteUrl(urlStr: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error("Please provide a valid public image URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Please provide a valid public image URL");
  }
  if (!parsed.hostname) {
    throw new Error("Please provide a valid public image URL");
  }
}

export async function fetchRemoteImage(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  validateRemoteUrl(url);

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error("Could not fetch image from the provided URL");
  }

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("URL must point to a JPEG, PNG, WebP, or GIF image");
  }

  const arrayBuffer = await response.arrayBuffer();
  const imageBytes = Buffer.from(arrayBuffer);

  if (imageBytes.length === 0) {
    throw new Error("Fetched image is empty");
  }
  if (imageBytes.length > 5 * 1024 * 1024) {
    throw new Error("Remote image must be under 5 MB");
  }

  return { bytes: imageBytes, contentType };
}
