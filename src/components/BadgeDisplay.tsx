"use client";

import React from "react";

export interface Badge {
  id?: number;
  name: string;
  icon: string;
  color: string;
  awardedAt?: string | Date;
}

interface BadgeDisplayProps {
  badges: Badge[];
  compact?: boolean;
}

const BADGE_DEFINITIONS: Record<string, { icon: string; color: string; desc: string }> = {
  "First Post": { icon: "🌱", color: "#22c55e", desc: "Posted for the first time" },
  "7-Day Streak": { icon: "🔥", color: "#f97316", desc: "Logged in 7 days in a row" },
  "30-Day Streak": { icon: "💎", color: "#38bdf8", desc: "Logged in 30 days in a row" },
  "Den Veteran": { icon: "⚔️", color: "#8b5cf6", desc: "Made 50 posts" },
  "Den Master": { icon: "👑", color: "#f59e0b", desc: "Own a Den" },
  "Chatterbox": { icon: "💬", color: "#06b6d4", desc: "Made 100 comments" },
  "Power Voter": { icon: "⬆️", color: "#6366f1", desc: "Cast 50 votes" },
  "Anime Scholar": { icon: "📚", color: "#ec4899", desc: "Added 10 anime to watchlist" },
  "Social Butterfly": { icon: "🦋", color: "#84cc16", desc: "Followed 10 users" },
  "OG Member": { icon: "🏆", color: "#fbbf24", desc: "One of the first 100 members" },
};

export default function BadgeDisplay({ badges, compact = false }: BadgeDisplayProps) {
  if (badges.length === 0) {
    if (compact) return null;
    return (
      <div className="text-center py-6 text-[#6b7280] text-sm">
        <span className="text-2xl">🎖️</span>
        <p className="mt-1">No badges yet — keep posting!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {badges.slice(0, 5).map((badge, i) => (
          <span
            key={i}
            title={badge.name}
            className="w-6 h-6 flex items-center justify-center rounded text-sm"
            style={{ backgroundColor: `${badge.color}20`, border: `1px solid ${badge.color}40` }}
          >
            {badge.icon}
          </span>
        ))}
        {badges.length > 5 && (
          <span className="w-6 h-6 flex items-center justify-center rounded text-[9px] font-bold bg-[#2b2d31] border border-[#232428] text-[#949ba4]">
            +{badges.length - 5}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map((badge, i) => {
        const def = BADGE_DEFINITIONS[badge.name];
        return (
          <div
            key={i}
            className="flex items-center gap-2.5 p-2.5 rounded-lg border"
            style={{
              backgroundColor: `${badge.color}10`,
              borderColor: `${badge.color}30`,
            }}
          >
            <span className="text-xl shrink-0">{badge.icon || def?.icon || "🎖️"}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{badge.name}</p>
              <p className="text-[10px] text-[#949ba4] truncate">{def?.desc || "Achievement unlocked"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
