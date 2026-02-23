import { describe, expect, it } from "vitest";

import { hasRequiredBackofficeRole } from "@/lib/security/admin";

describe("hasRequiredBackofficeRole", () => {
  it("evaluates role hierarchy correctly", () => {
    expect(hasRequiredBackofficeRole("superadmin", "admin")).toBe(true);
    expect(hasRequiredBackofficeRole("admin", "staff")).toBe(true);
    expect(hasRequiredBackofficeRole("staff", "staff")).toBe(true);
    expect(hasRequiredBackofficeRole("staff", "admin")).toBe(false);
    expect(hasRequiredBackofficeRole("admin", "superadmin")).toBe(false);
  });
});
