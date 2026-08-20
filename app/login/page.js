"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      submittingRef.current = false;
    }
  };

  return (
    <div style={st.card}>
      <h1 style={{ fontSize: 22, marginBottom: 18 }}>Log in</h1>
      <form onSubmit={submit}>
        <label style={st.label}>EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={st.input} />
        <label style={st.label}>PASSWORD</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={st.input} />
        {error && <p style={st.errorText}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...st.button, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 16 }}>
        <Link href="/forgot-password" style={st.link}>Forgot password?</Link>
      </p>
      <p style={{ fontSize: 13, marginTop: 6 }}>
        No account? <Link href="/signup" style={st.link}>Sign up</Link>
      </p>
    </div>
  );
}
