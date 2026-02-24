"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  BackofficeInviteRole,
  BackofficeRole,
  BackofficeUserStatus
} from "@/server/backoffice/types";

type BackofficeUserRow = {
  id: string;
  user_profile_id: string;
  role: BackofficeRole;
  status: BackofficeUserStatus;
  email: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
};

type BackofficeInviteRow = {
  id: string;
  email: string;
  role: BackofficeInviteRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by_email: string | null;
  accepted_user_email: string | null;
};

export function BackofficeAdminClient() {
  const [users, setUsers] = useState<BackofficeUserRow[]>([]);
  const [invites, setInvites] = useState<BackofficeInviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BackofficeInviteRole>("staff");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const toast = useToast();

  const [userDrafts, setUserDrafts] = useState<
    Record<string, { role: BackofficeRole; status: BackofficeUserStatus }>
  >({});

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites]
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, invitesResponse] = await Promise.all([
        fetch("/api/admin/backoffice/users"),
        fetch("/api/admin/backoffice/invites")
      ]);

      const usersPayload = (await usersResponse.json()) as {
        users?: BackofficeUserRow[];
        error?: string;
      };
      const invitesPayload = (await invitesResponse.json()) as {
        invites?: BackofficeInviteRow[];
        error?: string;
      };

      if (!usersResponse.ok) {
        throw new Error(usersPayload.error ?? "Unable to load backoffice users");
      }
      if (!invitesResponse.ok) {
        throw new Error(invitesPayload.error ?? "Unable to load backoffice invites");
      }

      const nextUsers = usersPayload.users ?? [];
      setUsers(nextUsers);
      setInvites(invitesPayload.invites ?? []);
      setUserDrafts(
        Object.fromEntries(
          nextUsers.map((user) => [
            user.id,
            {
              role: user.role,
              status: user.status
            }
          ])
        )
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load backoffice data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingInvite(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/backoffice/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send invite");
      }

      setInviteEmail("");
      await loadData();
      toast.success("Invite sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send invite");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setBusyInviteId(inviteId);
    setError(null);
    try {
      const response = await fetch("/api/admin/backoffice/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inviteId })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to revoke invite");
      }
      await loadData();
      toast.success("Invite revoked.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revoke invite");
    } finally {
      setBusyInviteId(null);
    }
  }

  async function handleUpdateUser(userId: string) {
    const draft = userDrafts[userId];
    if (!draft) {
      return;
    }

    setBusyUserId(userId);
    setError(null);
    try {
      const response = await fetch("/api/admin/backoffice/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          role: draft.role,
          status: draft.status
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update user");
      }
      await loadData();
      toast.success("Backoffice user updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update user");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="h1">Backoffice Access</h1>
        <p className="mt-2 text-muted-foreground">
          Invite backoffice users and manage their roles.
        </p>
      </header>

      {error ? <InlineNotice type="error" title={error} /> : null}

      <form className="premium-card grid gap-3 p-4 md:grid-cols-[1fr_180px_auto]" onSubmit={handleCreateInvite}>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Invite email</Label>
          <Input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="staff@atthrill.com"
            required
            disabled={creatingInvite}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select
            id="invite-role"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as BackofficeInviteRole)}
            disabled={creatingInvite}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto" disabled={creatingInvite}>
            {creatingInvite ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending...
              </span>
            ) : (
              "Send Invite"
            )}
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-primary">Pending Invites</h2>
        {loading ? (
          <div className="premium-card p-4 text-sm text-muted-foreground">Loading invites...</div>
        ) : pendingInvites.length === 0 ? (
          <div className="premium-card p-4 text-sm text-muted-foreground">No pending invites.</div>
        ) : (
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <article key={invite.id} className="premium-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {invite.role} | Expires: {new Date(invite.expires_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleRevokeInvite(invite.id)}
                  disabled={busyInviteId === invite.id}
                >
                  {busyInviteId === invite.id ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Revoking...
                    </span>
                  ) : (
                    "Revoke"
                  )}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-primary">Backoffice Users</h2>
        {loading ? (
          <div className="premium-card p-4 text-sm text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="premium-card p-4 text-sm text-muted-foreground">No backoffice users yet.</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const draft = userDrafts[user.id] ?? { role: user.role, status: user.status };
              return (
                <article key={user.id} className="premium-card grid gap-3 p-4 md:grid-cols-[1fr_160px_160px_auto]">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user.email ?? "No email"}</p>
                    <p className="text-xs text-muted-foreground">{user.name ?? "No name"}</p>
                  </div>
                  <Select
                    value={draft.role}
                    onChange={(event) =>
                      setUserDrafts((current) => ({
                        ...current,
                        [user.id]: {
                          ...draft,
                          role: event.target.value as BackofficeRole
                        }
                      }))
                    }
                    disabled={busyUserId === user.id}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </Select>
                  <Select
                    value={draft.status}
                    onChange={(event) =>
                      setUserDrafts((current) => ({
                        ...current,
                        [user.id]: {
                          ...draft,
                          status: event.target.value as BackofficeUserStatus
                        }
                      }))
                    }
                    disabled={busyUserId === user.id}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                  <Button onClick={() => handleUpdateUser(user.id)} disabled={busyUserId === user.id}>
                    {busyUserId === user.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Saving...
                      </span>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
