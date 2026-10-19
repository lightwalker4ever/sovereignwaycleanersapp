"use client";

import { useState } from "react";
import { PhotoTile } from "@/components/ui/PhotoTile";
import type { CleaningPhoto } from "@/lib/cleanings";

export function AllPhotosToggle({ photos }: { photos: CleaningPhoto[] }) {
  const [open, setOpen] = useState(false);

  if (photos.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="block w-full px-3.5 py-3 text-left text-sm font-bold text-dash-brand-700"
      >
        {open ? "Hide photos" : `View all ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          {photos.map((p) => (
            <span key={p.id} className="aspect-square">
              <PhotoTile signedUrl={p.signedUrl} square />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
