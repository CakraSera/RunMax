import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import HeaderBrand from "@/components/HeaderBrand";
import { login, AuthError, isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/signin")({
  component: SignIn,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    if (!EMAIL_RE.test(email)) return setFieldError("Enter a valid email address.");
    if (password.length < 1) return setFieldError("Enter your password.");
    setFieldError(null);
    setBusy(true);
    try {
      await login({ email, password });
      navigate({ to: "/" });
    } catch (error) {
      setApiError(error instanceof AuthError ? error.message : "Could not sign in. Is the API running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[480px] flex-col px-4 py-8">
      <div className="mb-6 flex justify-center">
        <HeaderBrand />
      </div>
      <h1 className="text-xl font-extrabold text-ink">Welcome back</h1>
      <p className="mt-1 text-[13px] text-muted">Sign in to keep your week with you.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>

        {fieldError ? <p className="text-[13px] font-medium text-danger">{fieldError}</p> : null}
        {apiError ? <p className="text-[13px] font-medium text-danger">{apiError}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-control bg-ink py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        No account?{" "}
        <Link to="/signup" className="font-semibold text-ink underline">
          Sign up
        </Link>
      </p>
      {isAuthenticated() ? (
        <Link to="/" className="mt-3 text-center text-[13px] text-faint underline">
          Back to the Board
        </Link>
      ) : null}
    </main>
  );
}
