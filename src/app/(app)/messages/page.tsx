"use client";

import { useEffect, useState } from "react";
import { InventoryItemDTO } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";

interface BuyerMessageDTO {
  id: string;
  itemId: string;
  marketplace: string;
  buyerName: string;
  body: string;
  kind: string;
  offerAmount: number | null;
  status: string;
  reply: string | null;
  createdAt: string;
  item: { id: string; name: string; title: string | null; listingPrice: number | null; photos: string[] };
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<BuyerMessageDTO[]>([]);
  const [listedItems, setListedItems] = useState<InventoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSimulate, setShowSimulate] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [m, i] = await Promise.all([
      fetch("/api/messages").then((r) => r.json()),
      fetch("/api/inventory?status=listed").then((r) => r.json()),
    ]);
    setMessages(m.messages);
    setListedItems(i.items);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function draftReply(id: string) {
    setDrafting(id);
    try {
      const res = await fetch(`/api/messages/${id}/draft-reply`, { method: "POST" });
      const data = await res.json();
      setReplyDrafts((prev) => ({ ...prev, [id]: data.reply }));
    } finally {
      setDrafting(null);
    }
  }

  async function sendReply(id: string) {
    const reply = replyDrafts[id];
    if (!reply) return;
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply, status: "replied" }),
    });
    load();
  }

  async function resolve(id: string) {
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    load();
  }

  const open = messages.filter((m) => m.status === "open");
  const others = messages.filter((m) => m.status !== "open");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Messages</h1>
          <p className="text-sm text-muted">Buyer questions and offers, with AI-drafted replies.</p>
        </div>
        <button
          onClick={() => setShowSimulate((s) => !s)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
        >
          + New message
        </button>
      </div>

      <div className="rounded-xl bg-accent/10 border border-accent/20 text-xs px-3 py-2 text-foreground/80">
        No marketplace has a live inbound-messaging webhook wired up yet, so this inbox is populated manually (or by
        your own integration later) rather than pulled automatically from eBay/Amazon/etc.
      </div>

      {showSimulate && (
        <SimulateForm
          items={listedItems}
          onCreated={() => {
            setShowSimulate(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted">No messages yet.</p>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-sm">Open ({open.length})</h2>
              {open.map((m) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  draft={replyDrafts[m.id]}
                  drafting={drafting === m.id}
                  onDraft={() => draftReply(m.id)}
                  onDraftChange={(v) => setReplyDrafts((prev) => ({ ...prev, [m.id]: v }))}
                  onSend={() => sendReply(m.id)}
                  onResolve={() => resolve(m.id)}
                />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-sm text-muted">Handled ({others.length})</h2>
              {others.map((m) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  draft={replyDrafts[m.id]}
                  drafting={drafting === m.id}
                  onDraft={() => draftReply(m.id)}
                  onDraftChange={(v) => setReplyDrafts((prev) => ({ ...prev, [m.id]: v }))}
                  onSend={() => sendReply(m.id)}
                  onResolve={() => resolve(m.id)}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MessageCard({
  message,
  draft,
  drafting,
  onDraft,
  onDraftChange,
  onSend,
  onResolve,
}: {
  message: BuyerMessageDTO;
  draft?: string;
  drafting: boolean;
  onDraft: () => void;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">
            {message.buyerName} · <span className="text-muted">{message.item.title || message.item.name}</span>
          </div>
          <div className="text-xs text-muted">
            {MARKETPLACES.find((x) => x.key === message.marketplace)?.name ?? message.marketplace} · {message.kind}
            {message.offerAmount != null && ` · offered $${message.offerAmount.toFixed(2)}`}
          </div>
        </div>
        <span className="text-xs text-muted shrink-0">{new Date(message.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="text-sm bg-surface-muted rounded-lg px-3 py-2">{message.body}</p>

      {message.reply ? (
        <p className="text-sm rounded-lg px-3 py-2 bg-accent/10 text-foreground/90">
          <span className="text-xs font-semibold text-accent block mb-0.5">Your reply</span>
          {message.reply}
        </p>
      ) : (
        message.status === "open" && (
          <div className="space-y-2">
            <textarea
              value={draft ?? ""}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Write a reply, or draft one with AI…"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={onDraft}
                disabled={drafting}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {drafting ? "Drafting…" : "Draft with AI"}
              </button>
              <button
                onClick={onSend}
                disabled={!draft}
                className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Send Reply
              </button>
              <button onClick={onResolve} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold ml-auto">
                Resolve without reply
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function SimulateForm({ items, onCreated }: { items: InventoryItemDTO[]; onCreated: () => void }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [buyerName, setBuyerName] = useState("");
  const [kind, setKind] = useState("question");
  const [body, setBody] = useState("");
  const [offerAmount, setOfferAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || !buyerName || !body) return;
    setSubmitting(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          marketplace: items.find((i) => i.id === itemId)?.marketplaces[0] ?? "ebay",
          buyerName,
          body,
          kind,
          offerAmount: kind === "offer" ? offerAmount : null,
        }),
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">You need at least one live listing to receive messages against.</p>;
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Listing</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title || i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Buyer name</label>
          <input
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="question">Question</option>
            <option value="offer">Offer</option>
            <option value="complaint">Complaint</option>
          </select>
        </div>
        {kind === "offer" && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Offer amount</label>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
      >
        Add message
      </button>
    </form>
  );
}
