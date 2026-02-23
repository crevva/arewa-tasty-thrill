export type BackofficeRole = "superadmin" | "admin" | "staff";
export type BackofficeInviteRole = "admin" | "staff";
export type BackofficeUserStatus = "active" | "suspended";
export type BackofficeInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type BackofficeAccessSource = "role" | "fallback";
