"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as st from "../../lib/styles";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [forced, setForced] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/me");
        if (res.status === 401) { router.push("/login"); return; }
        const data = await res.json();
        setForced(!!data.mustChangePassword);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("New passwords don't match."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      router.push("/settings");
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={st.card}><p style={{ fontSize: 13, color: "#666C61" }}>Loading...</p></div>;

  return (
    <div style={st.card}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>{forced ? "Set a new password" : "Change password"}</h1>
      {forced && (
        <p style={{ fontSize: 13, color: "#666C61", marginBottom: 18 }}>
          You're using a temporary password. Set a new one to continue.
        </p>
      )}
      <form onSubmit={submit}>
        {!forced && (
          <>
            <label style={st.label}>CURRENT PASSWORD</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={st.input} />
          </>
        )}
        <label style={st.label}>NEW PASSWORD (8+ CHARACTERS)</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} style={st.input} />
        <label style={st.label}>CONFIRM NEW PASSWORD</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={st.input} />
        {error && <p style={st.errorText}>{error}</p>}
        <button type="submit" disabled={saving} style={{ ...st.button, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
