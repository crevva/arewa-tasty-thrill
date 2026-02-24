"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mapUnknownError } from "@/lib/errorMapper";
import { requestJson } from "@/lib/http/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const data = await requestJson<{ ok?: boolean }>(
        "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        },
        { context: "auth", timeoutMs: 15_000 }
      );
      if (!data.ok) {
        throw new Error("Registration did not complete.");
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/"
      });

      setBusy(false);

      if (!result?.ok) {
        setMessage("Account created. Please sign in to continue.");
        return;
      }

      window.location.href = result.url ?? "/";
    } catch (error) {
      setBusy(false);
      setError(mapUnknownError(error, "auth").userMessage);
    }
  }

  return (
    <section className="section-shell">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Save your addresses and track your orders in one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleRegister}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
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
              minLength={8}
            />
            {error ? <InlineNotice type="error" title={error} /> : null}
            {message ? <InlineNotice type="success" title={message} /> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
