"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWatchlist } from "@/app/actions";

interface SearchActionButtonsProps {
  anime: {
    mal_id: number;
    title: string;
    images?: { jpg?: { image_url?: string } };
  };
  currentUser: { id: number } | null;
  defaultDenId: number;
}

export function WatchTogetherButton({ anime, currentUser, defaultDenId }: SearchActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleWatch = () => {
    if (!currentUser) {
      alert("Please log in to watch together!");
      return;
    }
    startTransition(async () => {
      try {
        const { createWatchPartyRoom, updateWatchPartyUrl } = await import("@/app/actions");
        // Create room
        const room = await createWatchPartyRoom(defaultDenId);
        // Set initial url (default to episode 1 embed)
        const streamUrl = `https://vidsrc.to/embed/anime/${anime.mal_id}/1`;
        await updateWatchPartyUrl(room.roomCode, streamUrl);
        // Redirect to watch party
        router.push(`/watch-party/${room.roomCode}`);
      } catch (err) {
        console.error(err);
        alert("Failed to create watch party room.");
      }
    });
  };

  return (
    <button
      onClick={handleWatch}
      disabled={isPending}
      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition disabled:opacity-50 whitespace-nowrap"
    >
      {isPending ? "Creating..." : "🍿 Watch Together"}
    </button>
  );
}

export function AddToWatchlistButton({ anime, currentUser }: Omit<SearchActionButtonsProps, "defaultDenId">) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!currentUser) {
      alert("Please log in to add to watchlist!");
      return;
    }
    startTransition(async () => {
      try {
        await updateWatchlist({
          animeName: anime.title,
          status: "plan",
          episode: 0,
          animeImage: anime.images?.jpg?.image_url,
        });
        setAdded(true);
      } catch (err) {
        console.error(err);
        alert("Failed to add to watchlist.");
      }
    });
  };

  return (
    <button
      onClick={handleAdd}
      disabled={isPending || added}
      className={`text-[11px] font-bold px-3 py-1.5 rounded transition border whitespace-nowrap ${
        added
          ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20 cursor-default"
          : "bg-[#1e1f22] hover:bg-[#35373c] text-[#dbdee1] border-[#232428]"
      }`}
    >
      {added ? "✓ In Watchlist" : "➕ Watchlist"}
    </button>
  );
}
