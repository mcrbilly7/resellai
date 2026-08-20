"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as st from "../../lib/styles";

export default function InventoryPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [accounts, setAccounts] = useState([]); // accounts I work for (as a worker)
  const [ownerId, setOwnerId] = useState(null);
  const [access, setAccess] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/user/me");
      if (meRes.status === 401) { router.push("/login"); return; }
      const meData = await meRes.json();
      setMe(meData);

      const accRes = await fetch("/api/team/accounts");
      const accData = accRes.ok ? (await accRes.json()).accounts : [];
      setAccounts(accData);

      setOwnerId(meData.id); // default to viewing your own account
      setLoading(false);
    })();
  }, [router]);

  const loadItems = async (targetOwnerId) => {
    setError("");
    const res = await fetch("/api/items?ownerId=" + targetOwnerId);
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Couldn't load inventory."); setItems([]); setAccess(null); return; }
    setItems(data.items);
    setAccess(data.access);
  };

  useEffect(() => { if (ownerId) loadItems(ownerId); }, [ownerId]);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId, title: newTitle.trim() }),
    });
    if (res.ok) { setNewTitle(""); loadItems(ownerId); }
    else setError((await res.json()).error || "Couldn't add that item.");
  };

  const buy = async (id) => {
    const qty = prompt("Quantity purchased?", "1");
    if (!qty) return;
    await fetch("/api/items/" + id + "/buy", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Number(qty) }),
    });
    loadItems(ownerId);
  };

  const sell = async (id) => {
    const qty = prompt("Quantity sold?", "1");
    if (!qty) return;
    await fetch("/api/items/" + id + "/sell", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Number(qty) }),
    });
    loadItems(ownerId);
  };

  const removeItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    await fetch("/api/items/" + id, { method: "DELETE" });
    loadItems(ownerId);
  };

  if (loading) return <div style={{ maxWidth: 720, margin: "60px auto", padding: 24 }}><p style={{ fontSize: 13, color: "#666C61" }}>Loading...</p></div>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Inventory</h1>
        <Link href="/settings" style={st.link}>My settings</Link>
      </div>

      {accounts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={st.label}>VIEWING</label>
          <select value={ownerId || ""} onChange={(e) => setOwnerId(e.target.value)} style={st.input}>
            <option value={me.id}>My own inventory</option>
            {accounts.map((a) => (
              <option key={a.ownerId} value={a.ownerId}>{a.ownerName || a.ownerEmail} ({a.role})</option>
            ))}
          </select>
        </div>
      )}

      {error && <p style={st.errorText}>{error}</p>}

      {access && (access.canEditInventory || access.canBuy) && (
        <form onSubmit={addItem} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New item title" style={{ ...st.input, marginBottom: 0, flex: 1 }} />
          <button type="submit" style={{ ...st.button, width: "auto", padding: "10px 16px" }}>Add</button>
        </form>
      )}

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "#666C61" }}>No items yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((i) => {
            const remaining = Math.max(0, i.quantity - i.quantitySold);
            return (
              <div key={i.id} style={{ background: "#FFFFFF", border: "1px solid #DEE1D7", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{i.title}</div>
                  <div style={{ fontSize: 12, color: "#666C61" }}>
                    {remaining}/{i.quantity} in stock - {i.status}
                    {i.estValue != null ? " - est. $" + i.estValue : ""}
                    {access?.canViewEarnings && i.purchasePrice != null ? " - cost $" + i.purchasePrice : ""}
                    {access?.canViewEarnings && i.salePrice != null ? " - revenue $" + i.salePrice : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {access?.canBuy && <button onClick={() => buy(i.id)} style={{ ...st.secondaryButton, width: "auto", padding: "6px 10px", fontSize: 12 }}>Buy</button>}
                  {access?.canSell && remaining > 0 && <button onClick={() => sell(i.id)} style={{ ...st.secondaryButton, width: "auto", padding: "6px 10px", fontSize: 12 }}>Sell</button>}
                  {access?.canEditInventory && <button onClick={() => removeItem(i.id)} style={{ ...st.dangerButton, width: "auto", padding: "6px 10px", fontSize: 12 }}>Delete</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
