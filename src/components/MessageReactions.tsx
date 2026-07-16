"use client";

import React, { useState, useTransition } from "react";
import { toggleMessageReaction } from "@/app/actions";

interface Reaction {
  id: number;
  messageId: string;
  emoji: string;
  userId: number;
  user: { username: string };
}

interface MessageReactionsProps {
  messageId: string;
  channelId: number;
  reactions: Reaction[];
  currentUserId: number;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👀"];

export default function MessageReactions({
  messageId,
  channelId,
  reactions: initialReactions,
  currentUserId,
}: MessageReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const handleReact = (emoji: string) => {
    if (isPending) return;
    setShowPicker(false);

    startTransition(async () => {
      try {
        await toggleMessageReaction(messageId, channelId, emoji);

        // Optimistically update state
        const mine = reactions.find((r) => r.emoji === emoji && r.userId === currentUserId);
        if (mine) {
          setReactions(reactions.filter((r) => r.id !== mine.id));
        } else {
          setReactions([
            ...reactions,
            {
              id: Math.random(),
              messageId,
              emoji,
              userId: currentUserId,
              user: { username: "You" },
            },
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none">
      {Object.entries(grouped).map(([emoji, list]) => {
        const hasReacted = list.some((r) => r.userId === currentUserId);
        const tooltip = list.map((r) => r.user.username).join(", ");

        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            title={tooltip}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-all ${
              hasReacted
                ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold"
                : "bg-[#2b2d31] border-[#232428] text-[#949ba4] hover:border-[#4e5058] hover:text-[#dbdee1]"
            }`}
          >
            <span>{emoji}</span>
            <span>{list.length}</span>
          </button>
        );
      })}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 text-[#949ba4] hover:text-white hover:bg-[#35373c]/50 rounded transition text-xs flex items-center justify-center border border-dashed border-[#232428]"
        >
          ➕☺
        </button>

        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div className="absolute left-0 bottom-7 bg-[#111214] border border-[#232428] rounded-md p-1.5 flex gap-1 shadow-2xl z-50 animate-in slide-in-from-bottom-2 duration-100">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-[#2b2d31] rounded text-base transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
