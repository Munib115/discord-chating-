"use client";

import React, { useState, useEffect, useRef } from "react";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";
import Avatar from "./Avatar";

/* ── helpers ─────────────────────────────────────────────────────── */

/** Returns a unique color gradient pair for the banner based on user avatar */
function getBannerGradient(avatar: string) {
  switch (avatar) {
    case "luffy":
      return "from-red-600 via-orange-500 to-red-800";
    case "zoro":
      return "from-emerald-700 via-green-500 to-teal-800";
    case "goku":
      return "from-orange-500 via-yellow-400 to-amber-700";
    case "sailor":
      return "from-pink-500 via-fuchsia-400 to-purple-700";
    case "deku":
      return "from-teal-500 via-cyan-400 to-emerald-700";
    default:
      return "from-indigo-600 via-blue-500 to-indigo-900";
  }
}

/** Returns a themed accent color for the profile card sections */
function getAccentColor(avatar: string) {
  switch (avatar) {
    case "luffy":  return "#ef4444";
    case "zoro":   return "#10b981";
    case "goku":   return "#f59e0b";
    case "sailor": return "#ec4899";
    case "deku":   return "#14b8a6";
    default:       return "#5865f2";
  }
}

/** Roles assigned by avatar for visual flair */
function getAvatarRole(avatar: string) {
  switch (avatar) {
    case "luffy":  return { name: "Straw Hat Captain", color: "#ef4444", emoji: "🏴‍☠️" };
    case "zoro":   return { name: "Swordsman", color: "#10b981", emoji: "⚔️" };
    case "goku":   return { name: "Saiyan Warrior", color: "#f59e0b", emoji: "⚡" };
    case "sailor": return { name: "Moon Guardian", color: "#ec4899", emoji: "🌙" };
    case "deku":   return { name: "Hero Candidate", color: "#14b8a6", emoji: "💥" };
    default:       return { name: "Member", color: "#5865f2", emoji: "👤" };
  }
}

/* ── types ───────────────────────────────────────────────────────── */

interface User {
  id: number;
  username: string;
  avatar: string;
  discriminator?: string;
  bio?: string | null;
  createdAt?: string | Date;
}

interface UserProfilePopupProps {
  user: User;
  isOnline: boolean;
  isOwner: boolean;
  isSelf: boolean;
  /** Position the popup near the clicked element */
  anchorRect: DOMRect | null;
  onClose: () => void;
}

/* ── component ──────────────────────────────────────────────────── */

export default function UserProfilePopup({
  user,
  isOnline,
  isOwner,
  isSelf,
  anchorRect,
  onClose,
}: UserProfilePopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  
  const formatJoinDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return "Unknown Date";
    const date = new Date(dateVal);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const memberSince = formatJoinDate(user.createdAt);
  const role = getAvatarRole(user.avatar);
  const accent = getAccentColor(user.avatar);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on click outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    // Delay so the opening click doesn't immediately close
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 10);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 180);
  };

  /* ── position logic ───────── */
  let popupStyle: React.CSSProperties = {};
  if (anchorRect) {
    const popupWidth = 340;
    const popupHeight = 420;
    // Position to the left of the member list item
    let left = anchorRect.left - popupWidth - 12;
    let top = anchorRect.top - 30;

    // If not enough room on the left, show on the right
    if (left < 8) {
      left = anchorRect.right + 12;
    }
    // Keep on screen vertically
    if (top + popupHeight > window.innerHeight - 16) {
      top = window.innerHeight - popupHeight - 16;
    }
    if (top < 16) top = 16;

    popupStyle = { left, top, position: "fixed" };
  }

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "auto" }}>
      <div
        ref={popupRef}
        className={`
          w-[340px] bg-[#232428] rounded-lg shadow-2xl overflow-hidden
          border border-[#1e1f22]
          transition-all duration-[220ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isClosing
            ? "opacity-0 scale-95 translate-y-2"
            : isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-[0.7] translate-y-4"
          }
        `}
        style={{
          ...popupStyle,
          transformOrigin: "right center",
          willChange: "transform, opacity",
        }}
      >
        {/* ─── Banner ─── */}
        <div className={`relative h-[60px] bg-gradient-to-r ${getBannerGradient(user.avatar)} overflow-hidden`}>
          {/* Animated shimmer overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%)",
              backgroundSize: "200% 100%",
              animation: "profileShimmer 2.5s ease-in-out infinite",
            }}
          />
          {/* Floating particles */}
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white/10"
              style={{
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
                left: `${15 + i * 18}%`,
                bottom: 8 + (i % 2) * 12,
                animation: `profileParticle ${2 + i * 0.4}s ease-in-out infinite ${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* ─── Avatar ─── */}
        <div className="relative px-4">
          <div
            className={`
              absolute -top-[30px] left-4
              transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${isVisible && !isClosing ? "scale-100 opacity-100" : "scale-50 opacity-0"}
            `}
            style={{ transitionDelay: isVisible ? "80ms" : "0ms" }}
          >
            <div className="relative">
              <Avatar
                avatar={user.avatar}
                className="w-[76px] h-[76px] border-[5px] border-[#232428] text-3xl shadow-xl bg-[#232428]"
                style={{
                  boxShadow: `0 0 0 0 ${accent}00, 0 4px 20px rgba(0,0,0,0.4)`,
                  animation: isVisible ? "profileAvatarGlow 2s ease-in-out infinite" : "none",
                  ["--profile-accent" as any]: accent,
                } as any}
              />
              {/* Online status indicator */}
              <span
                className={`
                  absolute bottom-[2px] right-[2px] w-[18px] h-[18px] rounded-full
                  border-[3px] border-[#232428]
                  transition-all duration-500
                  ${isOnline ? "bg-[#23a55a]" : "bg-[#80848e]"}
                  ${isVisible && !isClosing ? "scale-100" : "scale-0"}
                `}
                style={{ transitionDelay: isVisible ? "250ms" : "0ms" }}
              />
            </div>
          </div>

          {/* ─── Badges row (top-right) ─── */}
          <div
            className={`
              flex items-center gap-1.5 justify-end pt-2 pr-1
              transition-all duration-300
              ${isVisible && !isClosing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
            `}
            style={{ transitionDelay: isVisible ? "150ms" : "0ms" }}
          >
            {isOwner && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 rounded border border-amber-500/20 uppercase tracking-wide flex items-center gap-1">
                👑 Owner
              </span>
            )}
            {isSelf && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/15 text-indigo-400 rounded border border-indigo-500/20 uppercase tracking-wide">
                You
              </span>
            )}
          </div>
        </div>

        {/* ─── Card body ─── */}
        <div className="px-4 pt-7 pb-4">
          {/* Username + discriminator */}
          <div
            className={`
              transition-all duration-300
              ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
            `}
            style={{ transitionDelay: isVisible ? "120ms" : "0ms" }}
          >
            <h3 className="text-lg font-bold text-white leading-tight flex items-center gap-1.5">
              {user.username}
              {isOwner && <span className="text-sm" title="Server Owner">👑</span>}
            </h3>
            {user.discriminator && (
              <span className="text-xs text-[#949ba4]">#{user.discriminator}</span>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#23a55a]" : "bg-[#80848e]"}`} />
              <span className="text-[11px] text-[#949ba4] font-medium">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          {/* ─── Divider ─── */}
          <div
            className={`
              h-px bg-[#35373c] my-3
              transition-all duration-500 origin-left
              ${isVisible && !isClosing ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"}
            `}
            style={{ transitionDelay: isVisible ? "200ms" : "0ms" }}
          />

          {/* ─── Info sections ─── */}
          <div className="bg-[#111214] rounded-lg p-3 flex flex-col gap-3">
            {/* About Me */}
            <div
              className={`
                transition-all duration-300
                ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
              `}
              style={{ transitionDelay: isVisible ? "240ms" : "0ms" }}
            >
              <h4 className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                About Me
              </h4>
              <p className="text-[13px] text-[#dbdee1] leading-relaxed whitespace-pre-wrap">
                {user.bio || (isSelf ? "You haven't set a bio yet. Go to Settings to add one!" : "This user hasn't set a bio yet.")}
              </p>
            </div>

            {/* Roles */}
            <div
              className={`
                transition-all duration-300
                ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
              `}
              style={{ transitionDelay: isVisible ? "310ms" : "0ms" }}
            >
              <h4 className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1.5">
                Roles
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border"
                  style={{
                    color: role.color,
                    backgroundColor: `${role.color}10`,
                    borderColor: `${role.color}30`,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  {role.name}
                </span>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                    Server Owner
                  </span>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div
              className={`
                transition-all duration-300
                ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
              `}
              style={{ transitionDelay: isVisible ? "380ms" : "0ms" }}
            >
              <h4 className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                Member Since
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-[#dbdee1]">
                  <svg className="w-3.5 h-3.5 text-[#5865f2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.73 4.87l-3.71-.66-.36-.06A4.45 4.45 0 0012 2a4.45 4.45 0 00-3.66 2.15l-.36.06-3.71.66A2 2 0 002.6 6.74l.67 3.71a4.45 4.45 0 002.15 3.66 4.45 4.45 0 00-.02.39c0 4.41 3 7.5 6.6 7.5s6.6-3.09 6.6-7.5c0-.13 0-.26-.02-.39a4.45 4.45 0 002.15-3.66l.67-3.71a2 2 0 00-1.67-1.87zM12 20c-2.5 0-4.6-2.2-4.6-5.5S9.5 9 12 9s4.6 2.2 4.6 5.5S14.5 20 12 20z" />
                  </svg>
                  <span>{memberSince}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-[#4e5058]" />
                <div className="flex items-center gap-1.5 text-[11px] text-[#dbdee1]">
                  <svg className="w-3.5 h-3.5 text-[#949ba4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{memberSince}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Note input (Discord-like) ─── */}
          <div
            className={`
              mt-3 transition-all duration-300
              ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
            `}
            style={{ transitionDelay: isVisible ? "440ms" : "0ms" }}
          >
            <input
              type="text"
              placeholder="Click to add a note"
              className="w-full text-[12px] bg-transparent border-none text-[#949ba4] placeholder-[#4e5058] focus:outline-none focus:text-[#dbdee1] py-1 transition-colors"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
