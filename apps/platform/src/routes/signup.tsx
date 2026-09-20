import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import HeaderBrand from "@/components/HeaderBrand";
import { register, AuthError, isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  component: SignUp,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    if (fullName.trim().length < 1) return setFieldError("Enter your name.");
    if (username.length < 3 || !USERNAME_RE.test(username)) {
      return setFieldError("Username: 3–32 letters, numbers, dash or underscore.");
    }
    if (!EMAIL_RE.test(email)) return setFieldError("Enter a valid email address.");
    if (password.length < 8) return setFieldError("Password needs at least 8 characters.");
    setFieldError(null);
    setBusy(true);
    try {
      await register({ fullName: fullName.trim(), username, email, password });
      navigate({ to: "/" });
    } catch (error) {
      setApiError(
        error instanceof AuthError
          ? error.status === 400
            ? "That email or username is already taken."
            : error.message
          : "Could not sign up. Is the API running?",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[480px] flex-col px-4 py-8">
      <div className="mb-6 flex justify-center">
        <HeaderBrand />
      </div>
      <h1 className="text-xl font-extrabold text-ink">Create account</h1>
      <p className="mt-1 text-[13px] text-muted">One account, your weeks stay put.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Cakra Buana"
            autoComplete="name"
            className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="cakra"
            autoComplete="username"
            className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
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
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Have an account?{" "}
        <Link to="/signin" className="font-semibold text-ink underline">
          Sign in
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
