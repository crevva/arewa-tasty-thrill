import { createHmac, timingSafeEqual } from "node:crypto";

export function sha512Hex(payload: string, secret: string) {
  return createHmac("sha512", secret).update(payload).digest("hex");
}

export function safeCompareSignature(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseJson(payload: string) {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}
