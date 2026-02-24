"use client";

import { Loader2, Pencil, Plus, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { ConfirmDialog } from "@/components/admin/data-table/ConfirmDialog";
import { DrawerFormShell } from "@/components/admin/data-table/DrawerFormShell";
import type { TableColumn } from "@/components/admin/data-table/types";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/http/client";
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

type BackofficeUsersResponse = {
  users: BackofficeUserRow[];
};

type BackofficeInvitesResponse = {
  invites: BackofficeInviteRow[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function getStatusBadgeClass(status: string) {
  if (status === "active" || status === "accepted") {
    return "bg-green-700/15 text-green-700";
  }

  if (status === "pending") {
    return "bg-amber-600/15 text-amber-700";
  }

  if (status === "revoked" || status === "expired" || status === "suspended") {
    return "bg-destructive/15 text-destructive";
  }

  return "bg-secondary text-muted-foreground";
}

function getRoleBadgeClass(role: string) {
  if (role === "superadmin") {
    return "bg-primary/20 text-primary";
  }

  if (role === "admin") {
    return "bg-blue-700/15 text-blue-700";
  }

  return "bg-secondary text-muted-foreground";
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * pageSize;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + pageSize, total);

  return {
    items: rows.slice(offset, offset + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
    from,
    to
  };
}

export function BackofficeAdminClient() {
  const toast = useToast();
  const [users, setUsers] = useState<BackofficeUserRow[]>([]);
  const [invites, setInvites] = useState<BackofficeInviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BackofficeInviteRole>("staff");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BackofficeUserRow | null>(null);
  const [nextUserRole, setNextUserRole] = useState<BackofficeRole>("staff");
  const [nextUserStatus, setNextUserStatus] = useState<BackofficeUserStatus>("active");
  const [savingUser, setSavingUser] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<BackofficeInviteRow | null>(null);
  const [revokingInvite, setRevokingInvite] = useState(false);

  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<BackofficeInviteRow["status"] | "all">("pending");
  const [invitePage, setInvitePage] = useState(1);
  const [invitePageSize, setInvitePageSize] = useState(10);

  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<BackofficeUserStatus | "all">("all");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersPayload, invitesPayload] = await Promise.all([
        requestJson<BackofficeUsersResponse>(
          "/api/admin/backoffice/users",
          { method: "GET" },
          { context: "admin" }
        ),
        requestJson<BackofficeInvitesResponse>(
          "/api/admin/backoffice/invites",
          { method: "GET" },
          { context: "admin" }
        )
      ]);

      setUsers(usersPayload.users);
      setInvites(invitesPayload.invites);
    } catch (caught) {
      setError((caught as Error).message ?? "Could not load backoffice data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch((caught) => {
      setError((caught as Error).message ?? "Could not load backoffice data.");
    });
  }, [loadData]);

  useEffect(() => {
    setInvitePage(1);
  }, [inviteSearch, inviteStatusFilter, invitePageSize]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userStatusFilter, userPageSize]);

  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      const matchesSearch =
        !inviteSearch || invite.email.toLowerCase().includes(inviteSearch.toLowerCase());
      const matchesStatus =
        inviteStatusFilter === "all" ? true : invite.status === inviteStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invites, inviteSearch, inviteStatusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !userSearch ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.name?.toLowerCase().includes(userSearch.toLowerCase());
      const matchesStatus =
        userStatusFilter === "all" ? true : user.status === userStatusFilter;
      return Boolean(matchesSearch && matchesStatus);
    });
  }, [users, userSearch, userStatusFilter]);

  const invitesPageMeta = useMemo(
    () => paginateRows(filteredInvites, invitePage, invitePageSize),
    [filteredInvites, invitePage, invitePageSize]
  );

  const usersPageMeta = useMemo(
    () => paginateRows(filteredUsers, userPage, userPageSize),
    [filteredUsers, userPage, userPageSize]
  );

  const openUserDrawer = useCallback((user: BackofficeUserRow) => {
    setSelectedUser(user);
    setNextUserRole(user.role);
    setNextUserStatus(user.status);
    setUserDrawerOpen(true);
  }, []);

  async function handleCreateInvite() {
    setCreatingInvite(true);
    setError(null);
    try {
      await requestJson<{ invite: BackofficeInviteRow }>(
        "/api/admin/backoffice/invites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole
          })
        },
        { context: "admin" }
      );

      toast.success("Invite sent.");
      setInviteEmail("");
      setInviteRole("staff");
      setInviteDrawerOpen(false);
      await loadData();
    } catch (caught) {
      const message = (caught as Error).message ?? "Could not send invite.";
      setError(message);
      toast.error(message);
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleUpdateUser() {
    if (!selectedUser) {
      return;
    }

    setSavingUser(true);
    setError(null);
    try {
      await requestJson<{ user: BackofficeUserRow }>(
        "/api/admin/backoffice/users",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedUser.id,
            role: nextUserRole,
            status: nextUserStatus
          })
        },
        { context: "admin" }
      );

      toast.success("Backoffice user updated.");
      setUserDrawerOpen(false);
      await loadData();
    } catch (caught) {
      const message = (caught as Error).message ?? "Could not update user.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleRevokeInvite() {
    if (!revokeTarget) {
      return;
    }

    setRevokingInvite(true);
    setError(null);
    try {
      await requestJson<{ invite: BackofficeInviteRow }>(
        "/api/admin/backoffice/invites/revoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: revokeTarget.id })
        },
        { context: "admin" }
      );

      toast.success("Invite revoked.");
      setRevokeTarget(null);
      await loadData();
    } catch (caught) {
      const message = (caught as Error).message ?? "Could not revoke invite.";
      setError(message);
      toast.error(message);
    } finally {
      setRevokingInvite(false);
    }
  }

  const inviteColumns = useMemo<Array<TableColumn<BackofficeInviteRow>>>(
    () => [
      {
        key: "invite",
        header: "Invite",
        render: (row) => (
          <div>
            <p className="font-semibold text-primary">{row.email}</p>
            <p className="text-xs text-muted-foreground">Role: {row.role}</p>
          </div>
        )
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge className={getStatusBadgeClass(row.status)}>{row.status}</Badge>
      },
      {
        key: "expires",
        header: "Expires",
        hideOnMobile: true,
        render: (row) => formatDate(row.expires_at)
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={row.status !== "pending"}
              onClick={() => setRevokeTarget(row)}
              aria-label={`Revoke invite for ${row.email}`}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )
      }
    ],
    []
  );

  const userColumns = useMemo<Array<TableColumn<BackofficeUserRow>>>(
    () => [
      {
        key: "user",
        header: "User",
        render: (row) => (
          <div>
            <p className="font-semibold text-primary">{row.email ?? "No email"}</p>
            <p className="text-xs text-muted-foreground">{row.name ?? "No name"}</p>
          </div>
        )
      },
      {
        key: "role",
        header: "Role",
        render: (row) => <Badge className={getRoleBadgeClass(row.role)}>{row.role}</Badge>
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge className={getStatusBadgeClass(row.status)}>{row.status}</Badge>
      },
      {
        key: "updated",
        header: "Updated",
        hideOnMobile: true,
        render: (row) => formatDate(row.updated_at)
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openUserDrawer(row)}
              aria-label={`Edit ${row.email ?? "backoffice user"}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )
      }
    ],
    [openUserDrawer]
  );

  return (
    <>
      <AdminPageShell
        title="Backoffice Access"
        subtitle="Invite backoffice users and manage their roles."
        actions={
          <Button onClick={() => setInviteDrawerOpen(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Invite
          </Button>
        }
      >
        {error ? (
          <div className="mb-3">
            <InlineNotice type="error" title={error} />
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-xl text-primary">Invites</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search invite email"
                  value={inviteSearch}
                  onChange={(event) => setInviteSearch(event.target.value)}
                  className="w-56"
                />
                <Select
                  value={inviteStatusFilter}
                  onChange={(event) =>
                    setInviteStatusFilter(
                      event.target.value as BackofficeInviteRow["status"] | "all"
                    )
                  }
                  className="w-40"
                >
                  <option value="pending">Pending</option>
                  <option value="all">All statuses</option>
                  <option value="accepted">Accepted</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </Select>
                <Select
                  value={String(invitePageSize)}
                  onChange={(event) => {
                    setInvitePageSize(Number.parseInt(event.target.value, 10));
                  }}
                  className="w-24"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <AdminDataTable
              columns={inviteColumns}
              items={invitesPageMeta.items}
              loading={loading}
              rowKey={(row) => row.id}
              page={invitesPageMeta.page}
              pageSize={invitesPageMeta.pageSize}
              total={invitesPageMeta.total}
              totalPages={invitesPageMeta.totalPages}
              from={invitesPageMeta.from}
              to={invitesPageMeta.to}
              onPageChange={setInvitePage}
              onPageSizeChange={(size) => setInvitePageSize(size)}
              emptyTitle="No invites found"
              emptyDescription="Create a new invite to onboard a backoffice teammate."
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-xl text-primary">Backoffice Users</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search name or email"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  className="w-56"
                />
                <Select
                  value={userStatusFilter}
                  onChange={(event) =>
                    setUserStatusFilter(event.target.value as BackofficeUserStatus | "all")
                  }
                  className="w-40"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </Select>
                <Select
                  value={String(userPageSize)}
                  onChange={(event) => {
                    setUserPageSize(Number.parseInt(event.target.value, 10));
                  }}
                  className="w-24"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <AdminDataTable
              columns={userColumns}
              items={usersPageMeta.items}
              loading={loading}
              rowKey={(row) => row.id}
              page={usersPageMeta.page}
              pageSize={usersPageMeta.pageSize}
              total={usersPageMeta.total}
              totalPages={usersPageMeta.totalPages}
              from={usersPageMeta.from}
              to={usersPageMeta.to}
              onPageChange={setUserPage}
              onPageSizeChange={(size) => setUserPageSize(size)}
              emptyTitle="No backoffice users found"
              emptyDescription="Accepted invites appear here."
            />
          </section>
        </div>
      </AdminPageShell>

      <DrawerFormShell
        open={inviteDrawerOpen}
        onClose={() => setInviteDrawerOpen(false)}
        title="Send Backoffice Invite"
        description="Invite admin or staff users by email."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateInvite().catch(() => undefined);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Invite email</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="staff@atthrill.com"
              required
              disabled={creatingInvite}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteRole">Role</Label>
            <Select
              id="inviteRole"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as BackofficeInviteRole)}
              disabled={creatingInvite}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteDrawerOpen(false)}
              disabled={creatingInvite}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creatingInvite}>
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
      </DrawerFormShell>

      <DrawerFormShell
        open={userDrawerOpen}
        onClose={() => setUserDrawerOpen(false)}
        title={selectedUser?.email ?? "Backoffice User"}
        description="Update role and account status."
      >
        {selectedUser ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userRole">Role</Label>
              <Select
                id="userRole"
                value={nextUserRole}
                onChange={(event) => setNextUserRole(event.target.value as BackofficeRole)}
                disabled={savingUser}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userStatus">Status</Label>
              <Select
                id="userStatus"
                value={nextUserStatus}
                onChange={(event) =>
                  setNextUserStatus(event.target.value as BackofficeUserStatus)
                }
                disabled={savingUser}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserDrawerOpen(false)}
                disabled={savingUser}
              >
                Cancel
              </Button>
              <Button onClick={() => handleUpdateUser().catch(() => undefined)} disabled={savingUser}>
                {savingUser ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </span>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DrawerFormShell>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke this invite?"
        description="This will immediately invalidate the invite link."
        confirmLabel={revokingInvite ? "Revoking..." : "Revoke invite"}
        destructive
        busy={revokingInvite}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          handleRevokeInvite().catch(() => undefined);
        }}
      />
    </>
  );
}

