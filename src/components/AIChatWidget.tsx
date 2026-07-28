"use client";

import { useState } from "react";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should I price this at?",
  "Why isn't this selling?",
  "Which marketplace is best?",
  "Find my most profitable category.",
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Something went wrong reaching the assistant. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] flex flex-col rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-muted">
            <div className="font-semibold text-sm">AI Assistant</div>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-muted">Ask me about pricing, marketplaces, or your inventory.</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-surface-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-accent text-accent-foreground ml-8"
                    : "bg-surface-muted mr-8"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && <div className="text-muted text-xs">Thinking…</div>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center text-xl"
        aria-label="Open AI assistant"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
