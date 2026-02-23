import { describe, expect, it } from "vitest";

import { hashInviteToken } from "@/server/backoffice/invites";

describe("hashInviteToken", () => {
  it("is deterministic and does not leak raw token", () => {
    const token = "sample-invite-token";
    const hashA = hashInviteToken(token);
    const hashB = hashInviteToken(token);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(token);
    expect(hashA).toHaveLength(64);
  });
});
