"use client";

import React from "react";

interface XPBarProps {
  xp: number;
  level: number;
  username?: string;
  compact?: boolean;
}

// XP required to reach next level (exponential curve)
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getLevelColor(level: number): string {
  if (level >= 50) return "from-amber-500 to-yellow-400";
  if (level >= 30) return "from-violet-500 to-purple-400";
  if (level >= 20) return "from-rose-500 to-pink-400";
  if (level >= 10) return "from-blue-500 to-cyan-400";
  if (level >= 5)  return "from-emerald-500 to-teal-400";
  return "from-indigo-500 to-indigo-400";
}

function getLevelTitle(level: number): string {
  if (level >= 50) return "Legendary Otaku";
  if (level >= 30) return "Elite Weeb";
  if (level >= 20) return "Seasoned Fan";
  if (level >= 10) return "Den Veteran";
  if (level >= 5)  return "Rising Anime";
  if (level >= 2)  return "Anime Newbie";
  return "Fresh Member";
}

export default function XPBar({ xp, level, username, compact = false }: XPBarProps) {
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpInLevel = xp - [...Array(level - 1)].reduce((acc, _, i) => acc + xpForLevel(i + 1), 0);
  const xpNeeded = nextLevelXp;
  const progress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
  const colorClass = getLevelColor(level);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg`}>
          {level}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#949ba4] truncate">{getLevelTitle(level)}</span>
            <span className="text-[9px] text-[#6b7280] ml-2 shrink-0">{xpInLevel}/{xpNeeded} XP</span>
          </div>
          <div className="h-1 bg-[#1e1f22] rounded-full overflow-hidden w-full">
            <div
              className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1f22] border border-[#232428] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-xl font-black text-white shadow-xl ring-2 ring-white/10`}>
          {level}
        </div>
        <div>
          {username && <p className="text-sm font-bold text-white">{username}</p>}
          <p className={`text-sm font-bold bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`}>
            {getLevelTitle(level)}
          </p>
          <p className="text-[11px] text-[#6b7280] mt-0.5">{xp.toLocaleString()} total XP</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-[#949ba4] mb-1.5">
          <span>Level {level}</span>
          <span>{xpInLevel} / {xpNeeded} XP to Level {level + 1}</span>
        </div>
        <div className="h-2.5 bg-[#111214] rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
