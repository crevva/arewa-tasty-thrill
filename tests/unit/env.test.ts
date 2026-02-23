import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

describe("getEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      APP_BASE_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres",
      AUTH_PROVIDER: "nextauth",
      ADMIN_EMAILS: ""
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("treats empty optional email vars as undefined", async () => {
    process.env.SUPERADMIN_EMAIL = "";
    process.env.BACKOFFICE_INVITE_FROM = "";
    process.env.EMAIL_FROM = "";

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.SUPERADMIN_EMAIL).toBeUndefined();
    expect(env.BACKOFFICE_INVITE_FROM).toBeUndefined();
    expect(env.EMAIL_FROM).toBeUndefined();
  });
});
