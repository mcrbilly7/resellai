"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 space-y-5">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-bold">
            AI
          </div>
          <h1 className="mt-3 text-lg font-semibold">Reset your password</h1>
        </div>

        {submitted ? (
          <p className="text-sm text-center text-muted">
            If an account exists for that email, a password reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent text-accent-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted">
          <Link href="/login" className="text-accent underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
