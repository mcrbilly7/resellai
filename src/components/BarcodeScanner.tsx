"use client";

import { useEffect, useRef, useState } from "react";

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (result) => {
            if (result) {
              onDetected(result.getText());
            }
          }
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? `Couldn't access the camera: ${err.message}`
            : "Couldn't access the camera."
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Scan Barcode</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-sm">
            ✕
          </button>
        </div>
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <div className="rounded-lg overflow-hidden border border-border aspect-square bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          </div>
        )}
        <p className="text-xs text-muted text-center">Point the camera at a UPC, EAN, ISBN, or QR code.</p>
      </div>
    </div>
  );
}
