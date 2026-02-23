"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER;

function SignInContent() {
  const params = useSearchParams();
  const returnTo = useMemo(() => params.get("returnTo") ?? "/", [params]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  async function handleCredentialsSignIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: returnTo
    });

    setBusy(false);

    if (!result?.ok) {
      setError("Invalid credentials.");
      return;
    }

    window.location.href = result.url ?? returnTo;
  }

  async function handleGoogleSignIn() {
    setError(null);
    setOauthBusy(true);
    try {
      await signIn("google", { callbackUrl: returnTo });
    } finally {
      setOauthBusy(false);
    }
  }

  if (authProvider === "supabase") {
    return (
      <section className="section-shell">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Continue with Supabase auth.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/auth/supabase/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>
              <Button className="w-full">Continue to Supabase Sign-In</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="section-shell">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Track orders, save addresses, and reorder quickly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleCredentialsSignIn}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={busy || oauthBusy}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </span>
              ) : (
                "Sign in with credentials"
              )}
            </Button>
          </form>
          <Button className="w-full" variant="outline" onClick={handleGoogleSignIn} disabled={busy || oauthBusy}>
            {oauthBusy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Redirecting...
              </span>
            ) : (
              "Sign in with Google"
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here? <Link href="/auth/register" className="font-semibold text-primary">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <section className="section-shell">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        </section>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
