const SENSITIVE_KEY_PATTERNS = [
  "secret",
  "password",
  "token",
  "authorization",
  "cookie",
  "key"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function maskEmail(value: string) {
  const [localPart, domain] = value.split("@");
  if (!localPart || !domain) {
    return value;
  }

  const lead = localPart.slice(0, 1);
  return `${lead}***@${domain}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) {
    return "***";
  }

  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

function maskString(key: string, value: string) {
  if (value.includes("@")) {
    return maskEmail(value);
  }

  if (
    key.toLowerCase().includes("phone") ||
    /^(\+?\d[\d\s\-()]{6,})$/.test(value)
  ) {
    return maskPhone(value);
  }

  return value;
}

function sanitizeValue(key: string, value: unknown): unknown {
  const lowered = key.toLowerCase();
  if (SENSITIVE_KEY_PATTERNS.some((pattern) => lowered.includes(pattern))) {
    return "[redacted]";
  }

  if (typeof value === "string") {
    return maskString(key, value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(key, entry));
  }

  if (isObject(value)) {
    return sanitizeContext(value);
  }

  return value;
}

export function sanitizeContext(context: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeValue(key, value)])
  );
}

export function logServerError(
  error: unknown,
  context: Record<string, unknown> = {}
) {
  const safeContext = sanitizeContext(context);
  const baseError =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message
        }
      : { message: "Unknown server error" };

  console.error("[server_error]", {
    ...baseError,
    context: safeContext
  });
}

