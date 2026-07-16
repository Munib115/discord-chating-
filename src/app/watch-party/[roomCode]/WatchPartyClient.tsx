"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import WatchPartyPlayer from "@/components/WatchPartyPlayer";
import { updateWatchPartyUrl } from "@/app/actions";

interface WatchPartyClientProps {
  room: {
    roomCode: string;
    videoUrl: string | null;
    hostId: number;
    denId: number;
    den: { name: string };
    members: {
      userId: number;
      user: { username: string; avatar: string };
    }[];
  };
  currentUser: { id: number; username: string; avatar: string };
  denSlug: string;
}

export default function WatchPartyClient({ room, currentUser, denSlug }: WatchPartyClientProps) {
  const isHost = room.hostId === currentUser.id;
  const [sidebarTab, setSidebarTab] = useState<"chat" | "members" | "search">("members");
  const [copied, setCopied] = useState(false);
  
  // Watch Party URL State
  const [videoUrl, setVideoUrl] = useState(room.videoUrl || "");

  // Stream mode options
  const [streamType, setStreamType] = useState<"trailer" | "episodes">("episodes");
  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [streamProvider, setStreamProvider] = useState<"gogoanime" | "vidsrc.to" | "vidsrc.xyz" | "vidlink.pro">("gogoanime");

  // Anime Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPendingUrl, startUrlTransition] = useTransition();

  // Gogoanime episode loading states
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");

  const handleCopy = async () => {
    try {
      const joinUrl = `${window.location.origin}/watch-party/${room.roomCode}`;
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Search anime — use Gogoanime API for gogoanime provider, AniList for others
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAnimeResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setSearching(true);
      try {
        if (streamProvider === "gogoanime") {
          // Use our Gogoanime API route
          const res = await fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (data.results) {
            setAnimeResults(data.results.map((r: any) => ({
              ...r,
              // Normalize to common format
              mal_id: r.id,
              title: r.title,
              images: { jpg: { image_url: r.image } },
              synopsis: r.releaseDate ? `${r.subOrDub || "sub"} • ${r.releaseDate}` : (r.subOrDub || "sub"),
              _isGogoanime: true,
            })));
          } else {
            setAnimeResults([]);
          }
        } else {
          // Use AniList via server action (existing flow)
          const { searchAnimeFromJikan } = await import("@/app/actions");
          const results = await searchAnimeFromJikan(searchQuery);
          setAnimeResults(results);
        }
      } catch (err) {
        console.error("Failed to search anime:", err);
      } finally {
        setSearching(false);
      }
    }, 600);

    return () => clearTimeout(delay);
  }, [searchQuery, streamProvider]);

  const handleSelectAnime = async (anime: any) => {
    if (streamType === "trailer") {
      const trailerUrl = anime.trailer?.url;
      if (!trailerUrl) {
        alert(`No trailer available for "${anime.title}". Try Episodes mode instead!`);
        return;
      }
      setVideoUrl(trailerUrl);
      startUrlTransition(async () => {
        try { await updateWatchPartyUrl(room.roomCode, trailerUrl); } catch (e) { console.error(e); }
      });
      return;
    }

    // Episode mode
    if (streamProvider === "gogoanime" && anime._isGogoanime) {
      // Fetch real streaming sources from Gogoanime
      setLoadingStream(true);
      setStreamStatus("Fetching episodes...");
      try {
        // Step 1: Get episode list
        const epRes = await fetch(`/api/anime/episodes?id=${encodeURIComponent(anime.mal_id)}`);
        const epData = await epRes.json();

        if (!epData.episodes || epData.episodes.length === 0) {
          setStreamStatus("No episodes found for this anime.");
          setLoadingStream(false);
          return;
        }

        // Find the requested episode number
        const targetEp = epData.episodes.find((e: any) => e.number === episodeNum) || epData.episodes[episodeNum - 1];
        if (!targetEp) {
          setStreamStatus(`Episode ${episodeNum} not found. This anime has ${epData.episodes.length} episodes.`);
          setLoadingStream(false);
          return;
        }

        setStreamStatus(`Extracting stream for Ep ${episodeNum}...`);

        // Step 2: Get streaming sources
        const srcRes = await fetch(`/api/anime/sources?episodeId=${encodeURIComponent(targetEp.id)}`);
        const srcData = await srcRes.json();

        if (srcData.error || !srcData.sources || srcData.sources.length === 0) {
          setStreamStatus("Could not extract stream. Try a different episode or anime.");
          setLoadingStream(false);
          return;
        }

        // Pick the best quality source (prefer m3u8)
        const m3u8Source = srcData.sources.find((s: any) => s.isM3U8) || srcData.sources[0];
        const streamUrl = m3u8Source.url;

        setStreamStatus("");
        setVideoUrl(streamUrl);
        startUrlTransition(async () => {
          try { await updateWatchPartyUrl(room.roomCode, streamUrl); } catch (e) { console.error(e); }
        });
      } catch (err) {
        console.error("Gogoanime stream error:", err);
        setStreamStatus("Stream extraction failed. Please try again.");
      } finally {
        setLoadingStream(false);
      }
    } else {
      // Existing VidSrc/VidLink embed flow
      let playUrl = "";
      const malId = anime.mal_id;
      if (streamProvider === "vidsrc.to") {
        playUrl = `https://vidsrc.to/embed/anime/${malId}/${episodeNum}`;
      } else if (streamProvider === "vidsrc.xyz") {
        playUrl = `https://vidsrc.xyz/embed/anime/${malId}/${episodeNum}`;
      } else {
        playUrl = `https://vidlink.pro/embed/anime/${malId}/${episodeNum}`;
      }

      setVideoUrl(playUrl);
      startUrlTransition(async () => {
        try { await updateWatchPartyUrl(room.roomCode, playUrl); } catch (e) { console.error(e); }
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-w-0 bg-[#1e1f22] select-none h-full overflow-hidden">
      {/* Main Video Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[#232428]/40">
        {/* Top bar info */}
        <div className="h-14 border-b border-[#232428] bg-[#2b2d31] flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/d/${denSlug}/general`}
              className="text-[#949ba4] hover:text-white transition text-xs font-semibold"
            >
              ← Back
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-lg">🎬</span>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">{room.den.name}</h1>
                <span className="text-[10px] text-[#949ba4]">Watch Party · {room.roomCode}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded transition ${
                copied ? "bg-emerald-600 text-white" : "bg-[#35373c] text-[#949ba4] hover:text-white"
              }`}
            >
              {copied ? "✓ Copied!" : "🔗 Share Room"}
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 relative overflow-hidden bg-black flex flex-col">
          <WatchPartyPlayer
            roomCode={room.roomCode}
            videoUrl={videoUrl}
            isHost={isHost}
            userId={currentUser.id}
            username={currentUser.username}
            onUrlChange={(url) => setVideoUrl(url)}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 bg-[#2b2d31] border-l border-[#232428] flex flex-col flex-shrink-0 h-full overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="flex border-b border-[#232428] bg-[#2b2d31] shrink-0">
          {(["chat", "search", "members"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition border-b-2 ${
                sidebarTab === tab
                  ? "text-white border-indigo-500"
                  : "text-[#949ba4] hover:text-white border-transparent"
              }`}
            >
              {tab === "chat" ? "💬 Chat" : tab === "search" ? "🔍 Search" : `👥 Members (${room.members.length})`}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {sidebarTab === "members" && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {isHost && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5 text-xs text-amber-400 font-semibold mb-1">
                  👑 You are the host — your play/pause controls everyone
                </div>
              )}
              {room.members.map((m: any) => (
                <div key={m.userId} className="flex items-center gap-2.5 py-1.5">
                  <div className="relative">
                    <Avatar avatar={m.user.avatar} className="w-7 h-7 text-[10px]" />
                    <span className="absolute -bottom-px -right-px w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#2b2d31]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-white font-medium truncate">{m.user.username}</span>
                    {room.hostId === m.userId && (
                      <span className="text-[10px] text-amber-400">👑 Host</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === "search" && (
            <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
              {/* Streaming Options */}
              <div className="flex flex-col gap-2.5 shrink-0 bg-[#1e1f22] p-2.5 rounded-md border border-[#232428]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-[#949ba4] uppercase">Stream Mode</span>
                  <div className="flex bg-[#2b2d31] rounded-md p-0.5 border border-[#232428]">
                    {(["episodes", "trailer"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setStreamType(type)}
                        className={`text-[9px] font-bold px-2 py-1 rounded transition uppercase ${
                          streamType === type ? "bg-indigo-600 text-white" : "text-[#b5bac1] hover:text-white"
                        }`}
                      >
                        {type === "episodes" ? "Episodes" : "Trailer"}
                      </button>
                    ))}
                  </div>
                </div>

                {streamType === "episodes" && (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-[#949ba4] uppercase">Provider</span>
                      <select
                        value={streamProvider}
                        onChange={(e: any) => setStreamProvider(e.target.value)}
                        className="bg-[#2b2d31] text-[#dbdee1] border border-[#232428] rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-indigo-500"
                      >
                        <option value="gogoanime">🔥 Gogoanime (Direct)</option>
                        <option value="vidsrc.to">VidSrc.to (Embed)</option>
                        <option value="vidsrc.xyz">VidSrc.xyz (Embed)</option>
                        <option value="vidlink.pro">VidLink.pro (Embed)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-[#949ba4] uppercase">Episode</span>
                      <input
                        type="number"
                        min="1"
                        value={episodeNum}
                        onChange={(e) => setEpisodeNum(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-[#2b2d31] text-white border border-[#232428] rounded px-1.5 py-0.5 text-[10px] w-12 text-center focus:outline-none focus:border-indigo-500 font-bold font-mono"
                      />
                    </div>

                    {streamProvider === "gogoanime" && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-1.5 text-[9px] text-indigo-300">
                        ⚡ Direct HLS stream — no ads, full sync, native player
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Loading stream status */}
              {loadingStream && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-md p-2.5 text-xs text-indigo-300 font-semibold animate-pulse">
                  ⏳ {streamStatus || "Loading stream..."}
                </div>
              )}

              {!loadingStream && streamStatus && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 text-[10px] text-amber-400 font-semibold">
                  ⚠️ {streamStatus}
                </div>
              )}

              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[10px] uppercase font-bold text-[#949ba4]">Search Anime Database</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={streamProvider === "gogoanime" ? "Search Gogoanime..." : "Type anime title..."}
                  className="bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition w-full"
                />
              </div>

              {/* Results Grid */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
                {searching ? (
                  <p className="text-center py-6 text-xs text-[#949ba4]">Searching database...</p>
                ) : animeResults.length === 0 ? (
                  <div className="flex flex-col gap-3 py-4 text-center">
                    <p className="text-xs text-[#6b7280]">
                      {searchQuery.trim() ? "No results found." : "Search to load streams!"}
                    </p>
                    
                    <div className="bg-[#1e1f22]/60 border border-[#232428] rounded p-2.5 text-left text-[11px] text-[#949ba4] leading-relaxed">
                      <span className="text-amber-400 font-bold block mb-1">💡 Quick Start:</span>
                      Select <strong className="text-indigo-400">🔥 Gogoanime</strong> as your provider, search for any anime (e.g. &quot;naruto&quot;), and click on it to stream the episode directly — no ads, no popups!
                    </div>
                  </div>
                ) : (
                  animeResults.map((anime) => (
                    <button
                      key={anime.mal_id}
                      onClick={() => handleSelectAnime(anime)}
                      disabled={isPendingUrl || !isHost || loadingStream}
                      className={`flex gap-2.5 p-2 rounded bg-[#1e1f22]/50 border border-[#232428] hover:border-indigo-500 text-left transition select-none ${
                        !isHost ? "opacity-75 cursor-default" : ""
                      } ${loadingStream ? "opacity-50" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={anime.images?.jpg?.image_url}
                        alt={anime.title}
                        className="w-10 h-14 object-cover rounded bg-[#2b2d31] shrink-0"
                      />
                      <div className="min-w-0 flex flex-col justify-center">
                        <span className="text-xs font-bold text-white truncate w-full block">
                          {anime.title}
                        </span>
                        <span className="text-[10px] text-[#949ba4] mt-1 line-clamp-2 leading-relaxed">
                          {anime.synopsis || "No synopsis available."}
                        </span>
                        {anime._isGogoanime && (
                          <span className="text-[9px] text-indigo-400 font-bold mt-0.5">
                            ⚡ Direct Stream
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {sidebarTab === "chat" && (
            <div className="flex-1 flex flex-col p-4 text-center justify-center">
              <div>
                <p className="text-2xl mb-2">💬</p>
                <p className="text-xs text-[#949ba4]">
                  Use the Den channel chat while watching together!
                </p>
                <Link
                  href={`/d/${denSlug}/general`}
                  className="mt-3 inline-block text-xs text-indigo-400 hover:underline"
                >
                  Open Den Chat →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
