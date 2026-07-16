"use client";

import React, { useEffect, useState } from "react";

interface TypingIndicatorProps {
  channelId: number;
  currentUserId: number;
  currentUsername: string;
}

export default function TypingIndicator({
  channelId,
  currentUserId,
  currentUsername,
}: TypingIndicatorProps) {
  const [typers, setTypers] = useState<string[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const init = async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const ch = supabase.channel(`typing:${channelId}`);

      ch.on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload.userId === currentUserId) return;
        setTypers((prev) => [...new Set([...prev, payload.username])]);

        // Auto remove typer after 3 seconds of no updates
        clearTimeout(timer);
        timer = setTimeout(() => {
          setTypers([]);
        }, 3000);
      });

      await ch.subscribe();
    };

    init();

    return () => {
      clearTimeout(timer);
    };
  }, [channelId, currentUserId]);

  if (typers.length === 0) return null;

  const text =
    typers.length === 1
      ? `${typers[0]} is typing...`
      : typers.length === 2
      ? `${typers[0]} and ${typers[1]} are typing...`
      : "Several people are typing...";

  return (
    <div className="px-4 py-1 text-[11px] text-[#949ba4] italic flex items-center gap-1.5 select-none animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-[#949ba4] animate-bounce" />
      <span>{text}</span>
    </div>
  );
}
