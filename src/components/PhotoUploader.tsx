"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setError(null);
      try {
        const dataUrls = await Promise.all(accepted.map(fileToDataUrl));
        onChange([...photos, ...dataUrls]);
      } catch {
        setError("Couldn't read one or more images. Try again.");
      }
    },
    [photos, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function moveToCover(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-accent bg-surface-muted" : "border-border hover:bg-surface-muted"
        }`}
      >
        <input {...getInputProps()} capture="environment" />
        <p className="text-sm text-muted">
          Drag photos here, or click to take a photo / upload from camera roll.
        </p>
        <p className="text-xs text-muted mt-1">Batch upload supported — add multiple angles for better AI accuracy.</p>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URLs, not static assets */}
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => moveToCover(i)}
                    className="text-[10px] bg-white text-black rounded px-1.5 py-0.5"
                  >
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="text-[10px] bg-white text-black rounded px-1.5 py-0.5"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
