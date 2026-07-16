"use client";

import React from "react";

interface FlairBadgeProps {
  flair: string | null;
  className?: string;
}

export default function FlairBadge({ flair, className = "" }: FlairBadgeProps) {
  if (!flair || !flair.trim()) return null;

  const text = flair.trim();

  // Pick unique styling based on string hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;

  const styles = [
    "bg-red-500/10 text-red-400 border-red-500/30",
    "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "bg-amber-500/10 text-amber-400 border-amber-500/30",
    "bg-rose-500/10 text-rose-400 border-rose-500/30",
  ];

  const styleClass = styles[index];

  return (
    <span
      className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded border ${styleClass} select-none leading-none shrink-0 ${className}`}
    >
      {text}
    </span>
  );
}
