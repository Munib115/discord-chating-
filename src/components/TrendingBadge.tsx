"use client";

import React from "react";

interface TrendingBadgeProps {
  rank: number;
}

const rankColors: Record<number, string> = {
  1: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  2: "bg-slate-400/20 text-slate-300 border-slate-400/40",
  3: "bg-orange-600/20 text-orange-400 border-orange-600/40",
};

const rankLabels: Record<number, string> = {
  1: "🥇 #1",
  2: "🥈 #2",
  3: "🥉 #3",
};

export default function TrendingBadge({ rank }: TrendingBadgeProps) {
  const colorClass = rankColors[rank] || "bg-rose-500/10 text-rose-300 border-rose-500/30";
  const label = rankLabels[rank] || `🔥 #${rank}`;

  return (
    <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded border ${colorClass} select-none`}>
      {label}
    </span>
  );
}
