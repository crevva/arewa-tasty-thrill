import { randomBytes } from "node:crypto";

export function generateOrderCode() {
  return `AT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "").trim();
}
