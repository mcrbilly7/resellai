"use client";
import { useState } from "react";
import Link from "next/link";
import * as st from "../../lib/styles";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div style={st.card}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Reset your password</h1>
      {sent ? (
        <p style={st.successText}>
          If an account exists for that email, a reset link has been sent. Check your inbox (and spam folder).
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#666C61", marginBottom: 16 }}>
            Enter your account email and we'll send you a link to reset your password.
          </p>
          <form onSubmit={submit}>
            <label style={st.label}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={st.input} />
            <button type="submit" disabled={loading} style={{ ...st.button, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p style={{ fontSize: 13, marginTop: 16 }}>
        <Link href="/login" style={st.link}>Back to login</Link>
      </p>
    </div>
  );
}
