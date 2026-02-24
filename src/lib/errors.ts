export type AppErrorCode =
  | "network_offline"
  | "network_timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "payment_init_failed"
  | "payment_verify_failed"
  | "storage_upload_failed"
  | "order_not_found"
  | "order_identity_mismatch"
  | "delivery_zone_unsupported"
  | "unknown";

export type AppError = {
  code: AppErrorCode;
  userMessage: string;
  debugMessage?: string;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
  status?: number;
};

export class AppErrorException extends Error {
  appError: AppError;

  constructor(appError: AppError) {
    super(appError.debugMessage ?? appError.userMessage);
    this.name = "AppErrorException";
    this.appError = appError;
  }
}

export function isAppError(value: unknown): value is AppError {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "code" in value && "userMessage" in value;
}

export function getAppError(value: unknown): AppError | null {
  if (value instanceof AppErrorException) {
    return value.appError;
  }
  if (isAppError(value)) {
    return value;
  }
  return null;
}

