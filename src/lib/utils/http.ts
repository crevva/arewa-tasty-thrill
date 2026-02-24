import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { mapUnknownError } from "@/lib/errorMapper";
import { logServerError } from "@/lib/logger";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status: 400, ...init });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function internalError(
  error: unknown,
  options?: {
    userMessage?: string;
    context?: Record<string, unknown>;
    status?: number;
  }
) {
  const mapped = mapUnknownError(error, "general");
  const requestId = randomUUID();
  logServerError(error, { requestId, ...(options?.context ?? {}) });

  return NextResponse.json(
    { error: options?.userMessage ?? mapped.userMessage, requestId },
    { status: options?.status ?? mapped.status ?? 500 }
  );
}
