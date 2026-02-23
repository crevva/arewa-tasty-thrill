import { z } from "zod";

const serverEnvSchema = z.object({
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
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
  ENABLED_PAYMENT_PROVIDERS: z.string().default("paystack,stripe,paypal,flutterwave"),
  PRIMARY_PAYMENT_PROVIDER: z.string().default("paystack"),
  SHOW_PAYPAL_ALWAYS: z.enum(["true", "false"]).default("false"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
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
