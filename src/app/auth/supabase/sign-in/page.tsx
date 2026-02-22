"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function SupabaseSignInContent() {
  const params = useSearchParams();
  const returnTo = useMemo(() => params.get("returnTo") ?? "/", [params]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleMagicLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const callbackUrl = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl
        }
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setMessage("Magic link sent. Please check your inbox.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send magic link");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const supabase = createSupabaseBrowserClient();
    const callbackUrl = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl
      }
    });
  }

  return (
    <section className="section-shell">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Sign in with Supabase</CardTitle>
          <CardDescription>Use email magic link or Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleMagicLink}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
            />
            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? "Sending link..." : "Send magic link"}
            </Button>
          </form>
          <Button className="w-full" variant="outline" onClick={handleGoogle}>
            Continue with Google
          </Button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default function SupabaseSignInPage() {
  return (
    <Suspense fallback={<section className="section-shell"><p>Loading sign-in...</p></section>}>
      <SupabaseSignInContent />
    </Suspense>
  );
}
