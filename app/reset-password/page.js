"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <p style={st.errorText}>This reset link is missing its token. Request a new one from the forgot-password page.</p>;
  }

  if (done) {
    return <p style={st.successText}>Password updated. Redirecting to login...</p>;
  }

  return (
    <form onSubmit={submit}>
      <label style={st.label}>NEW PASSWORD (8+ CHARACTERS)</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={st.input} />
      <label style={st.label}>CONFIRM NEW PASSWORD</label>
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={st.input} />
      {error && <p style={st.errorText}>{error}</p>}
      <button type="submit" disabled={loading} style={{ ...st.button, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={st.card}>
      <h1 style={{ fontSize: 22, marginBottom: 18 }}>Set a new password</h1>
      <Suspense fallback={<p style={{ fontSize: 13, color: "#666C61" }}>Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p style={{ fontSize: 13, marginTop: 16 }}>
        <Link href="/login" style={st.link}>Back to login</Link>
      </p>
    </div>
  );
}
