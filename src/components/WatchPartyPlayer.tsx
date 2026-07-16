"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const HLSPlayer = dynamic(() => import("./HLSPlayer"), { ssr: false });
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface WatchPartyPlayerProps {
  roomCode: string;
  videoUrl: string;
  isHost: boolean;
  userId: number;
  username: string;
  onUrlChange?: (url: string) => void;
}

type SyncEvent = {
  type: "play" | "pause" | "seek" | "url_change";
  time?: number;
  url?: string;
  userId: number;
  username: string;
};

export default function WatchPartyPlayer({
  roomCode,
  videoUrl: initialUrl,
  isHost,
  userId,
  username,
  onUrlChange,
}: WatchPartyPlayerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [playing, setPlaying] = useState(true); // Auto-play ON by default
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [viewerCount, setViewerCount] = useState(1);
  const [streamError, setStreamError] = useState("");
  const playerRef = useRef<any>(null);
  const isSeeking = useRef(false);
  const lastBroadcast = useRef(0);
  const channelRef = useRef<any>(null);

  // Determine URL type
  const isHLS = url?.includes(".m3u8");
  const isEmbed = url?.includes("vidsrc.") || url?.includes("vidlink.") || url?.includes("/embed/");
  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");
  const isDirectVideo = url && !isHLS && !isEmbed && !isYouTube;

  // Auto-load when URL changes
  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setPlaying(true); // Auto-play when URL is set
      setStreamError("");
    }
  }, [initialUrl]);

  // Supabase Realtime sync
  useEffect(() => {
    const init = async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const ch = supabase.channel(`watch-party:${roomCode}`, {
        config: { presence: { key: String(userId) } },
      });

      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setViewerCount(Object.keys(state).length);
      });

      ch.on("broadcast", { event: "sync" }, ({ payload }: { payload: SyncEvent }) => {
        if (payload.userId === userId) return;
        setSyncing(true);
        setSyncMsg(`Syncing with ${payload.username}...`);

        if (payload.type === "play") {
          if (payload.time !== undefined) seekPlayerTo(payload.time);
          setPlaying(true);
        } else if (payload.type === "pause") {
          setPlaying(false);
          if (payload.time !== undefined) seekPlayerTo(payload.time);
        } else if (payload.type === "seek") {
          if (payload.time !== undefined) seekPlayerTo(payload.time);
        } else if (payload.type === "url_change" && payload.url) {
          setUrl(payload.url);
          setPlaying(true);
          setProgress(0);
          setStreamError("");
        }

        setTimeout(() => setSyncing(false), 1500);
      });

      await ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ userId, username, joinedAt: Date.now() });
        }
      });

      channelRef.current = ch;
    };

    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, [roomCode, userId, username]);

  const seekPlayerTo = (time: number) => {
    isSeeking.current = true;
    const videoEl = document.querySelector("video");
    if (videoEl && (videoEl as any).__seekTo) {
      (videoEl as any).__seekTo(time);
    } else if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(time, "seconds");
    }
  };

  const broadcast = (event: SyncEvent) => {
    channelRef.current?.send({ type: "broadcast", event: "sync", payload: event });
  };

  const handlePlay = useCallback(() => {
    setPlaying(true);
    const videoEl = document.querySelector("video");
    const time = videoEl?.currentTime ?? playerRef.current?.getCurrentTime?.() ?? 0;
    broadcast({ type: "play", time, userId, username });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, username]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    const videoEl = document.querySelector("video");
    const time = videoEl?.currentTime ?? playerRef.current?.getCurrentTime?.() ?? 0;
    broadcast({ type: "pause", time, userId, username });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, username]);

  const handleSeek = useCallback((seconds: number) => {
    if (isSeeking.current) { isSeeking.current = false; return; }
    const now = Date.now();
    if (now - lastBroadcast.current < 500) return;
    lastBroadcast.current = now;
    broadcast({ type: "seek", time: seconds, userId, username });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, username]);

  const handleProgress = useCallback((time: number) => { setProgress(time); }, []);
  const handleDuration = useCallback((dur: number) => { setDuration(dur); }, []);
  const handleStreamError = useCallback((msg: string) => { setStreamError(msg); }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Sync notification overlay */}
      {syncing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-indigo-500/30">
          🔄 {syncMsg}
        </div>
      )}

      {/* Stream error overlay */}
      {streamError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
          ⚠️ {streamError}
        </div>
      )}

      {/* Video player - takes full space */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {url ? (
          <>
            {isEmbed ? (
              <iframe
                src={url}
                className="absolute inset-0 w-full h-full bg-black border-0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              />
            ) : (isHLS || isDirectVideo) ? (
              <HLSPlayer
                src={url}
                playing={playing}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onProgress={handleProgress}
                onDuration={handleDuration}
                onError={handleStreamError}
              />
            ) : (
              <ReactPlayer
                ref={playerRef}
                url={url}
                playing={playing}
                controls
                width="100%"
                height="100%"
                onPlay={handlePlay}
                onPause={handlePause}
                onProgress={({ playedSeconds }: { playedSeconds: number }) => handleProgress(playedSeconds)}
                onDuration={handleDuration}
                config={{
                  youtube: { playerVars: { modestbranding: 1, rel: 0, autoplay: 1 } },
                }}
                style={{ position: "absolute", top: 0, left: 0 }}
              />
            )}
          </>
        ) : (
          /* Empty state - beautiful idle screen */
          <div className="flex flex-col items-center justify-center gap-5 text-center p-8 animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                <span className="text-4xl">🍿</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-black animate-pulse flex items-center justify-center">
                <span className="text-[8px]">LIVE</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Ready to Watch</h3>
              <p className="text-[#949ba4] text-sm max-w-xs leading-relaxed">
                Use the <span className="text-indigo-400 font-semibold">🔍 Search</span> tab to find an anime and start streaming with your friends!
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{viewerCount} {viewerCount === 1 ? "viewer" : "viewers"} waiting</span>
            </div>
          </div>
        )}
      </div>

      {/* Minimal status bar */}
      <div className="px-4 py-1.5 bg-[#0a0a0c]/90 backdrop-blur-sm border-t border-white/5 flex items-center justify-between text-[10px] text-[#6b7280]">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 ${playing ? "text-emerald-400" : "text-[#6b7280]"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${playing ? "bg-emerald-500 animate-pulse" : "bg-[#6b7280]"}`} />
            {playing ? "Playing" : "Paused"}
          </span>
          {isHost && <span className="text-amber-400 font-bold">👑 Host</span>}
          {isHLS && <span className="text-indigo-400 font-mono">HLS</span>}
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {viewerCount} watching
          </span>
        </div>
        <span className="font-mono text-[#949ba4]">{formatTime(progress)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
}
