"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";
import AuthShell from "../../lib/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(data.mustChangePassword ? "/change-password" : data.isAdmin ? "/admin" : "/settings");
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div style={{ ...st.card, margin: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Welcome back</h1>
        <p style={{ fontSize: 13.5, color: "#666C61", marginBottom: 24 }}>Log in to get back into your account.</p>
        <form onSubmit={submit}>
          <label style={st.label}>EMAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={st.input} />
          <label style={st.label}>PASSWORD</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={st.input} />
          {error && <p style={st.errorText}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...st.button, opacity: loading ? 0.6 : 1, marginTop: 6 }}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p style={{ fontSize: 13, marginTop: 18, textAlign: "center" }}>
          <Link href="/forgot-password" style={st.link}>Forgot password?</Link>
        </p>
        <p style={{ fontSize: 13, marginTop: 8, textAlign: "center", color: "#666C61" }}>
          No account? <Link href="/signup" style={st.link}>Sign up</Link>
        </p>
      </div>
    </AuthShell>
  );
}
