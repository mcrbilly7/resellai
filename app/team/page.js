"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";
import { ROLE_PRESETS, ROLE_KEYS, roleForPermissions } from "../../lib/roles";

const PERM_LABELS = [
  ["canViewInventory", "View inventory"],
  ["canEditInventory", "Edit inventory (add/edit/delete items)"],
  ["canBuy", "Log purchases (add stock)"],
  ["canSell", "Record sales (remove stock)"],
  ["canViewEarnings", "See earnings (cost & sale prices)"],
];

function MemberRow({ member, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(member);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(member); }, [member]);

  const applyRole = (roleKey) => {
    const preset = ROLE_PRESETS[roleKey];
    setDraft({ ...draft, role: roleKey, canViewInventory: preset.canViewInventory, canEditInventory: preset.canEditInventory, canBuy: preset.canBuy, canSell: preset.canSell });
  };

  const togglePerm = (key) => {
    const next = { ...draft, [key]: !draft[key] };
    next.role = roleForPermissions(next);
    setDraft(next);
  };

  const save = async () => {
    setSaving(true);
    await onChange(member.id, {
      role: draft.role, canViewInventory: draft.canViewInventory, canEditInventory: draft.canEditInventory,
      canBuy: draft.canBuy, canSell: draft.canSell, canViewEarnings: draft.canViewEarnings,
    });
    setSaving(false);
    setOpen(false);
  };

  const toggleBlock = async () => {
    await onChange(member.id, { status: member.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" });
  };

  return (
    <div style={{ ...st.card, maxWidth: "none", margin: 0, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{member.worker?.name || member.workerEmail}</div>
          <div style={{ fontSize: 12, color: "#666C61" }}>{member.workerEmail}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
            background: member.status === "ACTIVE" ? "#E1ECE8" : member.status === "BLOCKED" ? "#FBEFEC" : "#EAEAE6",
            color: member.status === "ACTIVE" ? "#0E6B45" : member.status === "BLOCKED" ? "#B23A2C" : "#666C61",
          }}>{member.status === "INVITED" ? "Invited - not signed up yet" : member.status}</span>
          <span style={{ fontSize: 12, color: "#666C61" }}>{ROLE_PRESETS[member.role]?.label || member.role}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={() => setOpen(!open)} style={{ ...st.secondaryButton, width: "auto", padding: "6px 12px", fontSize: 12 }}>
          {open ? "Close" : "Edit access"}
        </button>
        {member.status !== "INVITED" && (
          <button onClick={toggleBlock} style={{ ...st.secondaryButton, width: "auto", padding: "6px 12px", fontSize: 12 }}>
            {member.status === "BLOCKED" ? "Unblock" : "Block"}
          </button>
        )}
        <button onClick={() => onRemove(member.id)} style={{ ...st.dangerButton, width: "auto", padding: "6px 12px", fontSize: 12 }}>Remove</button>
      </div>

      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #DEE1D7" }}>
          <label style={st.label}>ROLE</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {ROLE_KEYS.map((k) => (
              <button key={k} onClick={() => applyRole(k)} style={{
                fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                border: "1px solid " + (draft.role === k ? "#0E6B45" : "#DEE1D7"),
                background: draft.role === k ? "#0E6B45" : "#FFFFFF", color: draft.role === k ? "#fff" : "#12201B",
              }}>{ROLE_PRESETS[k].label}</button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "#666C61", marginTop: -8, marginBottom: 14 }}>{ROLE_PRESETS[draft.role]?.description}</p>

          <label style={st.label}>OR SET INDIVIDUAL PERMISSIONS</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {PERM_LABELS.map(([key, text]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={!!draft[key]} onChange={() => togglePerm(key)} />
                {text}
              </label>
            ))}
          </div>

          <button onClick={save} disabled={saving} style={{ ...st.button, width: "auto", padding: "8px 16px", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save access"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const res = await fetch("/api/team/members");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addWorker = async (e) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const res = await fetch("/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setAddError(data.error || "Couldn't add that worker."); return; }
    setEmail(""); setRole("VIEWER");
    load();
  };

  const updateMember = async (id, patch) => {
    await fetch("/api/team/members/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  };

  const removeMember = async (id) => {
    if (!confirm("Remove this worker's access?")) return;
    await fetch("/api/team/members/" + id, { method: "DELETE" });
    load();
  };

  if (loading) return <div style={{ maxWidth: 640, margin: "60px auto", padding: 24 }}><p style={{ fontSize: 13, color: "#666C61" }}>Loading...</p></div>;

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Your team</h1>
        <Link href="/settings" style={st.link}>My settings</Link>
      </div>
      <p style={{ fontSize: 13, color: "#666C61", marginBottom: 24 }}>
        Add workers to help run this account. They share your inventory according to what you allow - earnings and
        the rest of your account stay private unless you turn on "See earnings" for them.
      </p>

      <div style={{ ...st.card, maxWidth: "none", margin: 0, marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, marginBottom: 14 }}>Add a worker</h2>
        <form onSubmit={addWorker}>
          <label style={st.label}>EMAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={st.input} placeholder="worker@example.com" />
          <label style={st.label}>ROLE</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {ROLE_KEYS.filter((k) => k !== "CUSTOM").map((k) => (
              <button key={k} type="button" onClick={() => setRole(k)} style={{
                fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                border: "1px solid " + (role === k ? "#0E6B45" : "#DEE1D7"),
                background: role === k ? "#0E6B45" : "#FFFFFF", color: role === k ? "#fff" : "#12201B",
              }}>{ROLE_PRESETS[k].label}</button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "#666C61", marginBottom: 14 }}>{ROLE_PRESETS[role].description} You can fine-tune this (and earnings visibility) after adding them.</p>
          {addError && <p style={st.errorText}>{addError}</p>}
          <button type="submit" disabled={adding} style={{ ...st.button, width: "auto", padding: "9px 18px", opacity: adding ? 0.6 : 1 }}>
            {adding ? "Adding..." : "Add worker"}
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: 15, marginBottom: 12 }}>Team ({members.length})</h2>
      {members.length === 0 ? (
        <p style={{ fontSize: 13, color: "#666C61" }}>No workers added yet.</p>
      ) : (
        members.map((m) => <MemberRow key={m.id} member={m} onChange={updateMember} onRemove={removeMember} />)
      )}
    </div>
  );
}
