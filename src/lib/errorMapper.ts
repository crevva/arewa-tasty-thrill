import type { ZodError } from "zod";

import { AppErrorException, getAppError, type AppError } from "@/lib/errors";
import { MESSAGES } from "@/lib/messages";

type ErrorMapContext =
  | "checkout_quote"
  | "checkout_order"
  | "payment_init"
  | "payment_verify"
  | "order_lookup"
  | "auth"
  | "admin"
  | "upload"
  | "general";

function normalizeMessage(message?: string | null) {
  return (message ?? "").toLowerCase().trim();
}

function baseUnknownError(context: ErrorMapContext): AppError {
  if (context === "payment_init") {
    return {
      code: "payment_init_failed",
      userMessage: MESSAGES.checkout.initPaymentFailed,
      retryable: true
    };
  }

  if (context === "payment_verify") {
    return {
      code: "payment_verify_failed",
      userMessage: MESSAGES.common.genericError,
      retryable: true
    };
  }

  if (context === "upload") {
    return {
      code: "storage_upload_failed",
      userMessage: "Upload failed. Check file size and try again.",
      retryable: true
    };
  }

  return {
    code: "unknown",
    userMessage: MESSAGES.common.genericError,
    retryable: true
  };
}

export function mapApiError(input: {
  status?: number;
  message?: string | null;
  context?: ErrorMapContext;
}): AppError {
  const context = input.context ?? "general";
  const message = normalizeMessage(input.message);

  if (input.status === 401) {
    return {
      code: "unauthorized",
      userMessage: MESSAGES.common.unauthorized,
      retryable: false,
      status: 401,
      debugMessage: input.message ?? undefined
    };
  }

  if (input.status === 403) {
    return {
      code: "forbidden",
      userMessage: MESSAGES.common.forbidden,
      retryable: false,
      status: 403,
      debugMessage: input.message ?? undefined
    };
  }

  if (input.status === 404) {
    return {
      code: "not_found",
      userMessage: MESSAGES.common.notFound,
      retryable: false,
      status: 404,
      debugMessage: input.message ?? undefined
    };
  }

  if (message.includes("order not found")) {
    return {
      code: "order_not_found",
      userMessage: MESSAGES.orders.lookupNotFound,
      retryable: true,
      status: input.status,
      debugMessage: input.message ?? undefined
    };
  }

  if (message.includes("identity verification failed")) {
    return {
      code: "order_identity_mismatch",
      userMessage: MESSAGES.orders.lookupMismatch,
      retryable: true,
      status: input.status,
      debugMessage: input.message ?? undefined
    };
  }

  if (message.includes("delivery zone")) {
    return {
      code: "delivery_zone_unsupported",
      userMessage: MESSAGES.checkout.zoneUnsupported,
      retryable: true,
      status: input.status,
      debugMessage: input.message ?? undefined
    };
  }

  if (message.includes("payment") || message.includes("provider")) {
    return {
      code: context === "payment_verify" ? "payment_verify_failed" : "payment_init_failed",
      userMessage:
        context === "payment_verify"
          ? MESSAGES.common.timeout
          : MESSAGES.checkout.initPaymentFailed,
      retryable: true,
      status: input.status,
      debugMessage: input.message ?? undefined
    };
  }

  if (message.includes("upload")) {
    return {
      code: "storage_upload_failed",
      userMessage: "Upload failed. Check file size and try again.",
      retryable: true,
      status: input.status,
      debugMessage: input.message ?? undefined
    };
  }

  if (input.status && input.status >= 500) {
    return {
      ...baseUnknownError(context),
      status: input.status,
      debugMessage: input.message ?? undefined
    };
  }

  if (input.status === 400) {
    return {
      code: "validation",
      userMessage: input.message || "Please review your details and try again.",
      retryable: true,
      status: 400,
      debugMessage: input.message ?? undefined
    };
  }

  return {
    ...baseUnknownError(context),
    status: input.status,
    debugMessage: input.message ?? undefined
  };
}

export function mapUnknownError(error: unknown, context: ErrorMapContext = "general"): AppError {
  const existing = getAppError(error);
  if (existing) {
    return existing;
  }

  if (typeof window !== "undefined") {
    if (typeof navigator !== "undefined" && navigator && !navigator.onLine) {
      return {
        code: "network_offline",
        userMessage: MESSAGES.common.offline,
        retryable: true
      };
    }
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "network_timeout",
      userMessage: MESSAGES.common.timeout,
      retryable: true
    };
  }

  if (error instanceof Error) {
    const message = normalizeMessage(error.message);

    if (message.includes("failed to fetch") || message.includes("networkerror")) {
      return {
        code: "network_offline",
        userMessage: MESSAGES.common.offline,
        retryable: true,
        debugMessage: error.message
      };
    }

    return mapApiError({ message: error.message, context });
  }

  return baseUnknownError(context);
}

export function mapZodError(error: ZodError, fallbackMessage = "Please review your entries."): AppError {
  const firstIssue = error.issues[0];

  return {
    code: "validation",
    userMessage: firstIssue?.message ?? fallbackMessage,
    retryable: true,
    fieldErrors: Object.fromEntries(
      error.issues
        .filter((issue) => issue.path.length)
        .map((issue) => [issue.path.join("."), issue.message])
    )
  };
}

export function throwMappedError(error: unknown, context: ErrorMapContext) {
  throw new AppErrorException(mapUnknownError(error, context));
}

