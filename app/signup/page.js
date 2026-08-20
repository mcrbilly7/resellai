"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoOptIn, setPromoOptIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (e) => {
    e.preventDefault();
    // useState-driven `disabled` doesn't take effect until the next render,
    // so a fast double click/tap can fire this twice before the button
    // visually disables. This ref blocks the second call synchronously.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, promoOptIn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/settings");
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div style={st.card}>
      <h1 style={{ fontSize: 22, marginBottom: 18 }}>Create an account</h1>
      <form onSubmit={submit}>
        <label style={st.label}>NAME</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={st.input} />
        <label style={st.label}>EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={st.input} />
        <label style={st.label}>PASSWORD (8+ CHARACTERS)</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={st.input} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 16 }}>
          <input type="checkbox" checked={promoOptIn} onChange={(e) => setPromoOptIn(e.target.checked)} />
          Send me promotional emails (you can change this any time in Settings)
        </label>
        {error && <p style={st.errorText}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...st.button, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 16 }}>
        Already have an account? <Link href="/login" style={st.link}>Log in</Link>
      </p>
    </div>
  );
}
