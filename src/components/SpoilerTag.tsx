"use client";

import React, { useState } from "react";

interface SpoilerTagProps {
  children: string;
}

export default function SpoilerTag({ children }: SpoilerTagProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={() => setRevealed((r) => !r)}
      title={revealed ? "Click to hide spoiler" : "Click to reveal spoiler"}
      className={`inline cursor-pointer rounded px-0.5 select-none transition-all duration-200 ${
        revealed
          ? "bg-[#3a3b40] text-[#dbdee1]"
          : "bg-[#1a1b1e] text-transparent [text-shadow:0_0_8px_rgba(255,255,255,0.15)] hover:bg-[#2a2b30]"
      }`}
      style={!revealed ? { filter: "blur(4px)" } : undefined}
      aria-label={revealed ? children : "Spoiler — click to reveal"}
    >
      {children}
    </span>
  );
}
