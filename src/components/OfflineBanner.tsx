"use client";

import { useEffect, useState } from "react";
import { subscribePendingCount } from "@/lib/offline";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    // navigator.onLine is only available client-side, so this can't be a
    // lazy useState initializer without risking an SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    // Flushing itself is handled by lib/offline.ts's own module-level
    // "online" listener (single source of truth, so the queue is never
    // replayed twice) — this just mirrors online/offline state for display.
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const unsubscribe = subscribePendingCount(setPending);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unsubscribe();
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`text-center text-xs font-medium py-1.5 ${
        online ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"
      }`}
    >
      {online
        ? `Syncing ${pending} queued change${pending === 1 ? "" : "s"}…`
        : `You're offline — changes to inventory will sync automatically when you're back online${
            pending > 0 ? ` (${pending} queued)` : ""
          }.`}
    </div>
  );
}
