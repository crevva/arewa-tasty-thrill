import { AppErrorException } from "@/lib/errors";
import { mapApiError, mapUnknownError } from "@/lib/errorMapper";

type RequestJsonOptions = {
  timeoutMs?: number;
  context?:
    | "checkout_quote"
    | "checkout_order"
    | "payment_init"
    | "payment_verify"
    | "order_lookup"
    | "auth"
    | "admin"
    | "upload"
    | "general";
};

async function safeReadJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RequestJsonOptions
) {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    });

    const payload = await safeReadJson(response);
    if (!response.ok) {
      const errorMessage =
        payload && typeof payload.error === "string" ? payload.error : null;
      throw new AppErrorException(
        mapApiError({
          status: response.status,
          message: errorMessage,
          context: options?.context ?? "general"
        })
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AppErrorException) {
      throw error;
    }
    throw new AppErrorException(mapUnknownError(error, options?.context ?? "general"));
  } finally {
    clearTimeout(timeoutId);
  }
}

