import sharp from "sharp";

/** Local image metadata fallback (parity with original PIL-based describe). */
export async function describeImageLocally(imageBytes: Buffer): Promise<string> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(imageBytes).metadata();
  } catch (exc) {
    throw new Error(`Invalid image file: ${exc}`);
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  let orientation = "square";
  if (width > height) orientation = "landscape";
  else if (height > width) orientation = "portrait";

  const { data, info } = await sharp(imageBytes).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let r: number;
  let g: number;
  let b: number;
  if (ch === 1) {
    r = g = b = data[0];
  } else {
    r = data[0];
    g = data[1];
    b = data[2];
  }

  const brightness = (r + g + b) / 3;

  let tone = "dark";
  if (brightness > 185) tone = "bright";
  else if (brightness > 110) tone = "mid-tone";

  let dominant = "neutral";
  if (Math.max(r, g, b) - Math.min(r, g, b) > 20) {
    if (r >= g && r >= b) dominant = "red";
    else if (g >= r && g >= b) dominant = "green";
    else dominant = "blue";
  }

  const fmt = metadata.format ? String(metadata.format).toUpperCase() : "image";

  return `A ${orientation} ${fmt} that is mostly ${tone} with a ${dominant} color cast, sized ${width} by ${height} pixels.`;
}
