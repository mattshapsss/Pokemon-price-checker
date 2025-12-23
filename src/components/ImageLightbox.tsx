"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Handle zoom with pinch/scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(4, prev + delta)));
  }, []);

  // Handle double tap/click to zoom
  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Handle drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    },
    [scale, position]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && e.touches.length === 1 && scale > 1) {
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, scale]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      onClick={(e) => {
        // Close if clicking backdrop (not the image)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b-4 border-[var(--poke-border)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--poke-red)] border border-[var(--poke-border)]" />
          <span
            className="text-[var(--poke-white)]"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "8px" }}
          >
            CARD IMAGE
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.5))}
            className="w-8 h-8 flex items-center justify-center bg-[#1a1a2e] border-2 border-[var(--poke-border)] text-[var(--poke-white)] hover:border-[var(--poke-yellow)] transition-colors"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "14px" }}
          >
            -
          </button>
          <span
            className="text-[var(--poke-gray)] w-12 text-center"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "14px" }}
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(4, s + 0.5))}
            className="w-8 h-8 flex items-center justify-center bg-[#1a1a2e] border-2 border-[var(--poke-border)] text-[var(--poke-white)] hover:border-[var(--poke-yellow)] transition-colors"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "14px" }}
          >
            +
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="px-3 py-1 bg-[var(--poke-red)] border-2 border-[var(--poke-border)] text-[var(--poke-white)] hover:bg-red-600 transition-colors"
          style={{ fontFamily: "var(--font-press-start)", fontSize: "8px" }}
        >
          CLOSE
        </button>
      </div>

      {/* Image container */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
          touchAction: "none",
        }}
      >
        <div
          className="relative transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            maxWidth: "90vw",
            maxHeight: "85vh",
          }}
        >
          {/* Pixel border frame */}
          <div className="border-4 border-[var(--poke-border)] bg-[#1a1a2e] p-1">
            <Image
              src={src}
              alt={alt}
              width={600}
              height={840}
              className="max-w-full h-auto"
              style={{ imageRendering: "auto" }}
              priority
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-2 text-center border-t-4 border-[var(--poke-border)]">
        <span
          className="text-[var(--poke-gray)]"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
        >
          Double-tap to zoom | Drag to pan | ESC or tap outside to close
        </span>
      </div>
    </div>
  );
}
