"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const images = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Gallery() {
  const [selected, setSelected] = useState<number | null>(null);

  const prev = () => setSelected((s) => (s === null ? null : s === 1 ? images.length : s - 1));
  const next = () => setSelected((s) => (s === null ? null : s === images.length ? 1 : s + 1));

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <section id="gallery" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-600 uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Our Work
          </p>
          <h2 className="mt-2 text-3xl font-800 tracking-tight text-gray-900 sm:text-4xl">
            Gallery
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            See the difference our team makes across a range of properties.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((n) => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className="group relative aspect-square overflow-hidden rounded-xl shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-zoom-in"
              style={{ "--tw-ring-color": "var(--color-brand)" } as React.CSSProperties}
              aria-label={`View gallery photo ${n}`}
            >
              <Image
                src={`/gallery/Gallery Photo ${n}.webp`}
                alt={`Gallery photo ${n}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            <X size={28} />
          </button>

          {/* Counter */}
          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm tabular-nums">
            {selected} / {images.length}
          </span>

          {/* Prev */}
          <button
            className="absolute left-3 text-white/80 hover:text-white transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={36} />
          </button>

          {/* Image */}
          <div
            className="relative w-full max-w-3xl aspect-square rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={`/gallery/Gallery Photo ${selected}.webp`}
              alt={`Gallery photo ${selected}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>

          {/* Next */}
          <button
            className="absolute right-3 text-white/80 hover:text-white transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next photo"
          >
            <ChevronRight size={36} />
          </button>
        </div>
      )}
    </section>
  );
}
