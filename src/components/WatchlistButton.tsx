"use client";

import React, { useState, useTransition } from "react";
import { updateWatchlist } from "@/app/actions";

interface WatchlistButtonProps {
  animeName: string;
  initialStatus?: string;
}

const STATUS_OPTS = [
  { value: "plan", label: "📋 Plan to Watch", color: "text-[#949ba4]" },
  { value: "watching", label: "📺 Watching", color: "text-indigo-400" },
  { value: "completed", label: "✅ Completed", color: "text-emerald-400" },
  { value: "dropped", label: "❌ Dropped", color: "text-rose-400" },
  { value: "hold", label: "⏸ On Hold", color: "text-amber-400" },
];

export default function WatchlistButton({ animeName, initialStatus = "" }: WatchlistButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (val: string) => {
    setIsOpen(false);
    setStatus(val);

    startTransition(async () => {
      try {
        await updateWatchlist({
          animeName,
          status: val,
        });
      } catch (e) {
        console.error(e);
      }
    });
  };

  const activeOpt = STATUS_OPTS.find((o) => o.value === status);

  return (
    <div className="relative inline-block text-left select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#232428] bg-[#1e1f22] text-xs font-semibold text-[#949ba4] hover:text-white hover:border-[#4e5058] transition"
      >
        <span>🌟</span>
        <span>{activeOpt ? activeOpt.label : "Add to Watchlist"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-[#111214] border border-[#232428] rounded-md shadow-2xl z-50 overflow-hidden py-1 animate-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 border-b border-[#232428] text-[10px] font-bold text-[#b5bac1] uppercase tracking-wide">
              Select Watch Status
            </div>
            {STATUS_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#2b2d31] transition ${opt.color}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
