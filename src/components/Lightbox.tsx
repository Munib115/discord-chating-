"use client";

import React, { useEffect } from "react";

interface LightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  // Prevent body scrolling when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
    >
      <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-[#949ba4] bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition text-xl select-none"
          title="Close Lightbox"
        >
          ✕
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
        />
      </div>
    </div>
  );
}
