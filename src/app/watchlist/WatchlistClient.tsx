"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { updateWatchlist, deleteWatchlistEntry } from "@/app/actions";

interface WatchlistEntry {
  id: number;
  animeName: string;
  status: string;
  episode: number;
  rating: number | null;
  notes: string | null;
  animeImage?: string | null;
}

interface WatchlistClientProps {
  initialEntries: WatchlistEntry[];
}

const TABS = [
  { value: "all", label: "All Anime", count: (list: WatchlistEntry[]) => list.length },
  { value: "watching", label: "📺 Watching", count: (list: WatchlistEntry[]) => list.filter(e => e.status === "watching").length },
  { value: "completed", label: "✅ Completed", count: (list: WatchlistEntry[]) => list.filter(e => e.status === "completed").length },
  { value: "plan", label: "📋 Plan to Watch", count: (list: WatchlistEntry[]) => list.filter(e => e.status === "plan").length },
  { value: "dropped", label: "❌ Dropped", count: (list: WatchlistEntry[]) => list.filter(e => e.status === "dropped").length },
];

export default function WatchlistClient({ initialEntries }: WatchlistClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // For inline adding & Autocomplete search
  const [newAnime, setNewAnime] = useState("");
  const [newStatus, setNewStatus] = useState("plan");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch suggestions with debounced delay
  useEffect(() => {
    if (!newAnime.trim() || newAnime.length < 2) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      setSearching(true);
      try {
        const { searchAnimeFromJikan } = await import("@/app/actions");
        const results = await searchAnimeFromJikan(newAnime);
        setSuggestions(results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(delay);
  }, [newAnime]);

  const filtered = entries
    .filter((e) => activeTab === "all" || e.status === activeTab)
    .filter((e) => e.animeName.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (!newAnime.trim() || isPending) return;

    const animeTitle = newAnime.trim();
    const finalImage = selectedImage;

    startTransition(async () => {
      try {
        await updateWatchlist({
          animeName: animeTitle,
          status: newStatus,
          episode: 0,
          animeImage: finalImage || undefined,
        });

        // Add or update in local state
        const exists = entries.find((e) => e.animeName.toLowerCase() === animeTitle.toLowerCase());
        if (exists) {
          setEntries(
            entries.map((e) =>
              e.id === exists.id ? { ...e, status: newStatus, animeImage: finalImage || e.animeImage } : e
            )
          );
        } else {
          setEntries([
            {
              id: Math.random(),
              animeName: animeTitle,
              status: newStatus,
              episode: 0,
              rating: null,
              notes: null,
              animeImage: finalImage,
            },
            ...entries,
          ]);
        }
        setNewAnime("");
        setSelectedImage(null);
        setShowDropdown(false);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSelectSuggestion = (anime: any) => {
    setNewAnime(anime.title);
    setSelectedImage(anime.images?.jpg?.image_url || null);
    setShowDropdown(false);
  };

  const handleUpdateEpisode = (entry: WatchlistEntry, change: number) => {
    const nextEpisode = Math.max(0, entry.episode + change);

    startTransition(async () => {
      try {
        await updateWatchlist({
          animeName: entry.animeName,
          status: entry.status,
          episode: nextEpisode,
          rating: entry.rating || undefined,
          notes: entry.notes || undefined,
        });

        setEntries(
          entries.map((e) =>
            e.id === entry.id ? { ...e, episode: nextEpisode } : e
          )
        );
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDelete = (entry: WatchlistEntry) => {
    startTransition(async () => {
      try {
        await deleteWatchlistEntry(entry.animeName);
        setEntries(entries.filter((e) => e.id !== entry.id));
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Add bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#2b2d31] p-4 rounded-xl border border-[#232428]">
        {/* Quick Add */}
        <div ref={containerRef} className="flex-1 flex gap-2 relative">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newAnime}
              onChange={(e) => {
                setNewAnime(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search or add new anime..."
              className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
            />

            {/* Suggestions Dropdown */}
            {showDropdown && newAnime.trim().length >= 2 && (
              <div className="absolute top-11 left-0 w-full z-50 bg-[#1e1f22] border border-[#232428] rounded-md shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                {searching ? (
                  <div className="p-3 text-center text-xs text-[#949ba4]">Searching database...</div>
                ) : suggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#6b7280]">No matching anime. Click 'Add' to enter custom title.</div>
                ) : (
                  suggestions.map((anime) => (
                    <button
                      key={anime.mal_id}
                      onClick={() => handleSelectSuggestion(anime)}
                      className="w-full flex gap-3 items-center p-2 hover:bg-[#2b2d31] text-left transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={anime.images?.jpg?.small_image_url}
                        alt={anime.title}
                        className="w-8 h-11 object-cover rounded bg-[#2b2d31]"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{anime.title}</span>
                        <span className="text-[10px] text-[#949ba4] block mt-0.5">{anime.type || "Anime"} · {anime.episodes || "?"} eps</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="bg-[#1e1f22] border border-[#232428] text-xs text-white rounded px-2 focus:outline-none"
          >
            <option value="plan">Plan to Watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={isPending || !newAnime.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded transition disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Filter input */}
        <div className="md:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search watchlist..."
            className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#232428] overflow-x-auto select-none gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                isActive
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-[#949ba4] hover:text-white"
              }`}
            >
              {tab.label} ({tab.count(entries)})
            </button>
          );
        })}
      </div>

      {/* Watchlist list grid */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#2b2d31]/30 rounded-xl border border-dashed border-[#232428] p-6">
            <span className="text-3xl">📺</span>
            <h3 className="text-lg font-bold text-white mt-2">Watchlist is empty</h3>
            <p className="text-sm text-[#949ba4] mt-1">Add anime you want to keep track of!</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#2b2d31] border border-[#232428] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#35373c] transition"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {entry.animeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.animeImage}
                    alt={entry.animeName}
                    className="w-10 h-14 object-cover rounded bg-[#1e1f22] border border-[#232428]/40 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-[#1e1f22] border border-[#232428]/40 flex items-center justify-center text-lg shrink-0 select-none">
                    📺
                  </div>
                )}

                <div className="min-w-0">
                  <span className="text-base font-bold text-white leading-tight block truncate">
                    {entry.animeName}
                  </span>
                  <span className="text-xs text-[#949ba4] mt-1.5 capitalize flex items-center gap-1.5 select-none">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      entry.status === "completed" ? "bg-emerald-500" : entry.status === "watching" ? "bg-indigo-500" : "bg-[#949ba4]"
                    }`} />
                    {entry.status === "plan" ? "Plan to Watch" : entry.status}
                  </span>
                </div>
              </div>

              {/* Action area */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Episode Counter */}
                <div className="flex items-center gap-2 bg-[#1e1f22] border border-[#232428] rounded px-2.5 py-1">
                  <span className="text-xs text-[#949ba4]">Ep:</span>
                  <span className="text-sm font-bold font-mono">{entry.episode}</span>
                  <div className="flex flex-col gap-0.5 ml-1 select-none">
                    <button
                      onClick={() => handleUpdateEpisode(entry, 1)}
                      className="text-[9px] hover:text-white text-[#949ba4] leading-none transition"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleUpdateEpisode(entry, -1)}
                      className="text-[9px] hover:text-white text-[#949ba4] leading-none transition"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Rating Display */}
                {entry.rating ? (
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded font-bold select-none">
                    ⭐ {entry.rating}/10
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const r = prompt("Enter rating (1-10):");
                      if (r) {
                        const parsed = parseInt(r, 10);
                        if (parsed >= 1 && parsed <= 10) {
                          startTransition(async () => {
                            await updateWatchlist({
                              animeName: entry.animeName,
                              status: entry.status,
                              episode: entry.episode,
                              rating: parsed,
                              notes: entry.notes || undefined,
                            });
                            setEntries(
                              entries.map((e) =>
                                e.id === entry.id ? { ...e, rating: parsed } : e
                              )
                            );
                          });
                        }
                      }
                    }}
                    className="text-xs bg-[#1e1f22] hover:bg-[#35373c] text-[#949ba4] hover:text-white border border-[#232428] px-2.5 py-1 rounded transition select-none"
                  >
                    ⭐ Rate
                  </button>
                )}

                {/* Delete button */}
                <button
                  onClick={() => {
                    if (confirm(`Remove "${entry.animeName}" from your watchlist?`)) {
                      handleDelete(entry);
                    }
                  }}
                  className="text-xs hover:text-rose-500 text-[#949ba4] transition select-none"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
