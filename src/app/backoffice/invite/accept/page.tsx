"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ValidateResponse = {
  valid: boolean;
  status?: string;
  message?: string;
  email?: string;
  role?: "admin" | "staff";
  expiresAt?: string;
};

function AcceptInviteContent() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidation({
        valid: false,
        status: "invalid",
        message: "Invite link is invalid."
      });
      return;
    }

    let cancelled = false;
    const run = async () => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/backoffice/invite/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        const payload = (await response.json()) as ValidateResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to validate invite");
        }
        if (!cancelled) {
          setValidation(payload);
        }
      } catch (caught) {
        if (!cancelled) {
          setValidation({
            valid: false,
            status: "invalid",
            message: caught instanceof Error ? caught.message : "Unable to validate invite"
          });
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    };

    run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation?.valid) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/backoffice/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          password
        })
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to accept invite");
      }

      setAccepted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-shell">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Accept Backoffice Invite</CardTitle>
          <CardDescription>Set your account details to join the AT Thrill backoffice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {busy && !validation ? (
            <p className="text-sm text-muted-foreground">Validating invite...</p>
          ) : null}

          {validation && !validation.valid ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{validation.message ?? "Invite is not available."}</p>
              <Link href="/auth/sign-in" className="text-sm font-semibold text-primary">
                Go to sign in
              </Link>
            </div>
          ) : null}

          {accepted ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700">Invite accepted. You can now sign in to the backoffice.</p>
              <Link href="/auth/sign-in?returnTo=/admin" className="text-sm font-semibold text-primary">
                Continue to sign in
              </Link>
            </div>
          ) : null}

          {validation?.valid && !accepted ? (
            <form className="space-y-4" onSubmit={handleAccept}>
              <div className="rounded-md border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                <p>
                  Invited email: <span className="font-medium text-foreground">{validation.email}</span>
                </p>
                <p>
                  Role: <span className="font-medium text-foreground">{validation.role}</span>
                </p>
              </div>

              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                required
                disabled={busy}
              />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                minLength={8}
                disabled={busy}
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                required
                minLength={8}
                disabled={busy}
              />

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Accepting...
                  </span>
                ) : (
                  "Accept invite"
                )}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <section className="section-shell">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle>Accept Backoffice Invite</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </section>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
