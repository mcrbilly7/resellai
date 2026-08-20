"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [promoOptIn, setPromoOptIn] = useState(true);
  const [status, setStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workingFor, setWorkingFor] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/me");
        if (res.status === 401) { router.push("/login"); return; }
        const data = await res.json();
        setUser(data);
        setName(data.name || "");
        setPromoOptIn(data.promoOptIn);

        const accRes = await fetch("/api/team/accounts");
        if (accRes.ok) setWorkingFor((await accRes.json()).accounts);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const save = async () => {
    setStatus("");
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, promoOptIn }),
    });
    setStatus(res.ok ? "Saved." : "Couldn't save - try again.");
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const deleteAccount = async () => {
    await fetch("/api/user/delete", { method: "POST" });
    router.push("/login");
  };

  if (loading || !user) return <div style={st.card}><p style={{ fontSize: 13, color: "#666C61" }}>Loading...</p></div>;

  return (
    <div style={st.card}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 13, color: "#666C61", marginBottom: 20 }}>{user.email}</p>
      {user.isAdmin && (
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          <Link href="/admin" style={st.link}>Go to admin panel</Link>
        </p>
      )}
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <Link href="/team" style={st.link}>Manage your team</Link>
      </p>
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <Link href="/change-password" style={st.link}>Change password</Link>
      </p>
      <p style={{ fontSize: 13, marginBottom: 16 }}>
        <Link href="/inventory" style={st.link}>View inventory</Link>
      </p>

      {workingFor.length > 0 && (
        <div style={{ marginBottom: 20, padding: 14, background: "#F5F6F8", borderRadius: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#666C61", marginBottom: 8 }}>ACCOUNTS YOU WORK FOR</div>
          {workingFor.map((a) => (
            <div key={a.ownerId} style={{ fontSize: 13, marginBottom: 4 }}>
              {a.ownerName || a.ownerEmail} - <span style={{ color: "#666C61" }}>{a.role}</span>
            </div>
          ))}
        </div>
      )}

      <label style={st.label}>NAME</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={st.input} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 18 }}>
        <input type="checkbox" checked={promoOptIn} onChange={(e) => setPromoOptIn(e.target.checked)} />
        Send me promotional emails
      </label>

      {status && <p style={{ fontSize: 13, color: "#0E6B45", marginBottom: 10 }}>{status}</p>}
      <button onClick={save} style={st.button}>Save changes</button>

      <div style={{ marginTop: 16 }}>
        <button onClick={logout} style={{ ...st.secondaryButton, marginBottom: 10 }}>Log out</button>
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #DEE1D7" }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, color: "#B23A2C" }}>Danger zone</h2>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={st.dangerButton}>Delete my account</button>
        ) : (
          <div>
            <p style={{ fontSize: 13, marginBottom: 10 }}>This permanently deletes your account. This can't be undone.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ ...st.secondaryButton, flex: 1 }}>Cancel</button>
              <button onClick={deleteAccount} style={{ ...st.dangerButton, flex: 1 }}>Yes, delete it</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
