"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn } from "lucide-react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const prev = useCallback(
    () => setActive((i) => (i - 1 + count) % count),
    [count]
  );
  const next = useCallback(() => setActive((i) => (i + 1) % count), [count]);

  // Clavier : flèches pour naviguer, Échap pour fermer le zoom
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed, prev, next]);

  if (count === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400">
        <ImageOff className="size-12" strokeWidth={1.5} />
      </div>
    );
  }

  // Glissement du doigt : passe à l'image suivante/précédente
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next();
    else prev();
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Image principale */}
        <div
          className="group relative overflow-hidden rounded-3xl bg-zinc-100 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200/60"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="relative block aspect-square w-full cursor-zoom-in"
            aria-label="Agrandir l'image"
          >
            {/* La page fait max 420px de large : on ne télécharge jamais plus */}
            <Image
              src={images[active]}
              alt={alt}
              fill
              sizes="(max-width: 420px) 100vw, 420px"
              priority
              className="object-cover"
            />
          </button>

          {/* Indice zoom */}
          <span className="pointer-events-none absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-zinc-900/50 text-white backdrop-blur-sm">
            <ZoomIn className="size-4.5" />
          </span>

          {count > 1 && (
            <>
              {/* Flèches */}
              <button
                type="button"
                onClick={prev}
                aria-label="Image précédente"
                className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-800 shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Image suivante"
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-800 shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <ChevronRight className="size-5" />
              </button>

              {/* Points indicateurs */}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`size-1.5 rounded-full transition ${
                      i === active ? "w-4 bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Miniatures (64px, chargées en différé) */}
        {count > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Image ${i + 1}`}
                className={`relative size-16 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                  i === active
                    ? "ring-(--primary) shadow-md"
                    : "ring-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  loading="lazy"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox plein écran */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Fermer"
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-6" />
          </button>

          <div
            className="relative h-[85vh] w-[92vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[active]}
              alt={alt}
              fill
              sizes="92vw"
              className="rounded-2xl object-contain"
            />
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Image précédente"
                className="absolute left-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="size-7" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Image suivante"
                className="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="size-7" />
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white">
                {active + 1} / {count}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
