"use client";

import React, { useState, useEffect } from "react";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const CATEGORIES = ["anime wave", "anime dance", "anime cry", "anime happy", "luffy", "goku"];

const CURATED_GIFS = [
  "https://media.tenor.com/tHq7vj8mX9UAAAAC/luffy-one-piece.gif",
  "https://media.tenor.com/4qNqF7T7DkYAAAAC/goku-ultra-instinct.gif",
  "https://media.tenor.com/h2x_iS1lO20AAAAC/anime-girl-wave.gif",
  "https://media.tenor.com/H1G57p2iMNEAAAAC/anime-excited.gif",
  "https://media.tenor.com/h8cI5iQYjC8AAAAd/chibi-dance.gif",
  "https://media.tenor.com/n14a-jG89UIAAAAC/naruto-ramen.gif",
];

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<string[]>(CURATED_GIFS);
  const [loading, setLoading] = useState(false);

  const fetchGifs = async (query: string) => {
    setLoading(true);
    try {
      // Use standard public Tenor V2 API key or demo key
      const key = process.env.NEXT_PUBLIC_TENOR_API_KEY || "LIVDTRZRIJZ5";
      const res = await fetch(
        `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${key}&limit=12`
      );
      if (res.ok) {
        const data = await res.json();
        const urls = data.results.map((r: any) => r.media[0].gif.url);
        setGifs(urls.length > 0 ? urls : CURATED_GIFS);
      }
    } catch (e) {
      console.error("Failed to fetch Tenor GIFs:", e);
      setGifs(CURATED_GIFS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search.trim()) {
      const delay = setTimeout(() => {
        fetchGifs(search.trim());
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setGifs(CURATED_GIFS);
    }
  }, [search]);

  return (
    <div className="absolute bottom-12 right-0 w-80 bg-[#111214] border border-[#232428] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col h-96 animate-in slide-in-from-bottom-4 duration-150">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#232428] flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Search Anime GIFs</span>
        <button onClick={onClose} className="text-[#949ba4] hover:text-white transition">
          ✕
        </button>
      </div>

      {/* Input */}
      <div className="p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Tenor..."
          className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Quick Categories */}
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto shrink-0 select-none no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSearch(cat)}
            className="text-[10px] font-bold px-2 py-1 bg-[#2b2d31] hover:bg-[#35373c] text-[#949ba4] hover:text-white rounded-full transition whitespace-nowrap capitalize"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center h-full text-xs text-[#949ba4]">
            Searching GIFs...
          </div>
        ) : (
          gifs.map((url, i) => (
            <button
              key={i}
              onClick={() => onSelect(url)}
              className="relative aspect-video rounded overflow-hidden bg-[#2b2d31] hover:scale-105 transition duration-150 flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="GIF" className="w-full h-full object-cover" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
