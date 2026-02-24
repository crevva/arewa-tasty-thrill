import { z } from "zod";

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().email().optional()
);

const serverEnvSchema = z.object({
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_POOL_MAX: z.coerce.number().int().positive().optional(),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  DB_POOL_MAX_USES: z.coerce.number().int().positive().optional(),
  AUTH_PROVIDER: z.enum(["supabase", "nextauth"]).default("supabase"),
  ADMIN_EMAILS: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().optional(),
  SUPERADMIN_EMAIL: optionalEmail,
  SUPERADMIN_INITIAL_PASSWORD: z.string().optional(),
  SUPERADMIN_NAME: z.string().default("AT Thrill Superadmin"),
  BACKOFFICE_INVITE_TTL_HOURS: z.coerce.number().default(72),
  ENABLE_ADMIN_EMAILS_FALLBACK: z.enum(["true", "false"]).default("true"),
  BACKOFFICE_INVITE_FROM: optionalEmail,
  ENABLED_PAYMENT_PROVIDERS: z.string().default("paystack,stripe,paypal,flutterwave"),
  PRIMARY_PAYMENT_PROVIDER: z.string().default("paystack"),
  SHOW_PAYPAL_ALWAYS: z.enum(["true", "false"]).default("false"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: optionalEmail,
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().default(8)
});

let cache: z.infer<typeof serverEnvSchema> | null = null;

export function getEnv() {
  if (cache) {
    return cache;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }

  cache = parsed.data;
  return cache;
}

export type Env = ReturnType<typeof getEnv>;
