"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { safeNextPath } from "@/lib/redirect";

const MIN_PASSWORD_LENGTH = 8;
const DEMO = { email: "eaknoor.singh@example.com", password: "demo1234" };

/** Sign-in and sign-up share one form; `mode` switches the fields and copy. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { user, loading, login, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  // Already signed in (or just signed in): continue to the destination.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const passwordTooShort = isSignup && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit = email.trim() && password && (!isSignup || (name.trim() && password.length >= MIN_PASSWORD_LENGTH));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isSignup) await signup(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const otherHref = `${isSignup ? "/login" : "/signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {isSignup && (
        <Input
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoFocus
        />
      )}
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus={!isSignup}
      />
      <Input
        label="Password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordTooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters` : null}
        hint={isSignup ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
      />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-zoom-red">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={submitting} disabled={!canSubmit}>
        {isSignup ? "Sign Up" : "Sign In"}
      </Button>

      {!isSignup && (
        <div className="rounded-lg bg-zoom-bg px-3 py-2.5 text-xs text-zoom-muted">
          Demo account: <span className="font-medium text-zoom-text">{DEMO.email}</span> /{" "}
          <span className="font-medium text-zoom-text">{DEMO.password}</span>
          <button
            type="button"
            className="ml-2 font-medium text-zoom-blue hover:underline"
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
            }}
          >
            Use it
          </button>
        </div>
      )}

      <p className="text-center text-sm text-zoom-muted">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link href={otherHref} className="font-medium text-zoom-blue hover:underline">
          {isSignup ? "Sign in" : "Sign up free"}
        </Link>
      </p>
      <p className="text-center text-sm text-zoom-muted">
        Just joining a meeting?{" "}
        <Link href="/join" className="font-medium text-zoom-blue hover:underline">
          Join without signing in
        </Link>
      </p>
    </form>
  );
}
