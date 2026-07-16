"use client";

import React, { useState } from "react";

interface SharePostButtonProps {
  postId: number;
}

export default function SharePostButton({ postId }: SharePostButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/posts/${postId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy post URL:", e);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded transition select-none ${
        copied ? "bg-emerald-600 text-white font-bold" : "text-[#949ba4] hover:text-white bg-[#2b2d31]/45 hover:bg-[#35373c]/50"
      }`}
    >
      <span>{copied ? "✓" : "🔗"}</span>
      <span>{copied ? "Copied!" : "Share"}</span>
    </button>
  );
}
