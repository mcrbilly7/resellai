"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";

const inputSm = { ...st.input, marginBottom: 0, padding: "6px 8px", fontSize: 13 };

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [rowStatus, setRowStatus] = useState("");

  const [audience, setAudience] = useState("all");
  const [emails, setEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [sending, setSending] = useState(false);

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers((await res.json()).users);
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/user/me");
        if (meRes.status === 401) { router.push("/login"); return; }
        const meData = await meRes.json();
        if (!meData.isAdmin) { router.push("/settings"); return; }
        setMe(meData);
        await loadUsers();
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const startEdit = (u) => { setEditingId(u.id); setEditDraft({ name: u.name || "", email: u.email, isAdmin: u.isAdmin, promoOptIn: u.promoOptIn }); };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const saveEdit = async (id) => {
    setRowStatus("");
    const res = await fetch("/api/admin/users/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) { await loadUsers(); setEditingId(null); }
    else setRowStatus("Couldn't save that change.");
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this account permanently?")) return;
    const res = await fetch("/api/admin/users/" + id, { method: "DELETE" });
    if (res.ok) await loadUsers();
    else setRowStatus((await res.json()).error || "Couldn't delete that account.");
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendStatus("");
    const res = await fetch("/api/admin/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, emails, subject, message }),
    });
    const data = await res.json();
    setSending(false);
    setSendStatus(res.ok ? `Sent to ${data.sent} of ${data.total} recipient(s)${data.failed ? ` (${data.failed} failed)` : ""}.` : data.error || "Couldn't send.");
  };

  if (loading || !me) return <div style={{ maxWidth: 900, margin: "60px auto", padding: 24 }}><p style={{ fontSize: 13, color: "#666C61" }}>Loading...</p></div>;

  return (
    <div style={{ maxWidth: 960, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Admin</h1>
        <Link href="/settings" style={st.link}>My settings</Link>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #DEE1D7", borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>Send an email</h2>
        <form onSubmit={sendEmail}>
          <label style={st.label}>SEND TO</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={{ ...st.input }}>
            <option value="all">Everyone</option>
            <option value="promo">Only users opted into promo emails</option>
            <option value="specific">Specific email addresses</option>
          </select>
          {audience === "specific" && (
            <>
              <label style={st.label}>EMAILS (COMMA-SEPARATED)</label>
              <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="a@example.com, b@example.com" style={st.input} />
            </>
          )}
          <label style={st.label}>SUBJECT</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required style={st.input} />
          <label style={st.label}>MESSAGE</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} style={{ ...st.input, resize: "vertical" }} />
          {sendStatus && <p style={{ fontSize: 13, color: "#0E6B45", marginBottom: 10 }}>{sendStatus}</p>}
          <button type="submit" disabled={sending} style={{ ...st.button, width: "auto", padding: "10px 20px", opacity: sending ? 0.6 : 1 }}>
            {sending ? "Sending..." : "Send email"}
          </button>
        </form>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #DEE1D7", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>All accounts ({users.length})</h2>
        {rowStatus && <p style={st.errorText}>{rowStatus}</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #DEE1D7" }}>
                <th style={{ padding: "8px 6px" }}>Name</th>
                <th style={{ padding: "8px 6px" }}>Email</th>
                <th style={{ padding: "8px 6px" }}>Admin</th>
                <th style={{ padding: "8px 6px" }}>Promo</th>
                <th style={{ padding: "8px 6px" }}>Joined</th>
                <th style={{ padding: "8px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #EFEFEF" }}>
                  {editingId === u.id ? (
                    <>
                      <td style={{ padding: "8px 6px" }}><input style={inputSm} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></td>
                      <td style={{ padding: "8px 6px" }}><input style={inputSm} value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} /></td>
                      <td style={{ padding: "8px 6px" }}><input type="checkbox" checked={editDraft.isAdmin} onChange={(e) => setEditDraft({ ...editDraft, isAdmin: e.target.checked })} /></td>
                      <td style={{ padding: "8px 6px" }}><input type="checkbox" checked={editDraft.promoOptIn} onChange={(e) => setEditDraft({ ...editDraft, promoOptIn: e.target.checked })} /></td>
                      <td style={{ padding: "8px 6px", color: "#666C61" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                        <button onClick={() => saveEdit(u.id)} style={{ ...st.button, width: "auto", padding: "5px 10px", fontSize: 12, marginRight: 6 }}>Save</button>
                        <button onClick={cancelEdit} style={{ ...st.secondaryButton, width: "auto", padding: "5px 10px", fontSize: 12 }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "8px 6px" }}>{u.name || "\u2014"}</td>
                      <td style={{ padding: "8px 6px" }}>{u.email}</td>
                      <td style={{ padding: "8px 6px" }}>{u.isAdmin ? "Yes" : ""}</td>
                      <td style={{ padding: "8px 6px" }}>{u.promoOptIn ? "Yes" : ""}</td>
                      <td style={{ padding: "8px 6px", color: "#666C61" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                        <button onClick={() => startEdit(u)} style={{ ...st.secondaryButton, width: "auto", padding: "5px 10px", fontSize: 12, marginRight: 6 }}>Edit</button>
                        {u.id !== me.id && <button onClick={() => deleteUser(u.id)} style={{ ...st.dangerButton, width: "auto", padding: "5px 10px", fontSize: 12 }}>Delete</button>}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
