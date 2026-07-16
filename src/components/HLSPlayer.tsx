"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface HLSPlayerProps {
  src: string;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onProgress: (time: number) => void;
  onDuration: (dur: number) => void;
  onError?: (msg: string) => void;
}

export default function HLSPlayer({
  src,
  playing,
  onPlay,
  onPause,
  onSeek,
  onProgress,
  onDuration,
  onError,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const isSeeking = useRef(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Initialize HLS.js or native playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: any;

    const initHLS = async () => {
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          onDuration(video.duration || 0);
        });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("HLS network error, retrying...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("HLS media error, recovering...");
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal error:", data);
                hls.destroy();
                onError?.("Stream playback failed. The source may be unavailable.");
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = src;
        video.addEventListener("loadedmetadata", () => {
          onDuration(video.duration || 0);
        });
      } else {
        // Try as direct mp4
        video.src = src;
        video.addEventListener("loadedmetadata", () => {
          onDuration(video.duration || 0);
        });
      }
    };

    // Check if src is m3u8/HLS or direct file
    if (src.includes(".m3u8") || src.includes("m3u8")) {
      initHLS();
    } else {
      // Direct mp4/webm
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        onDuration(video.duration || 0);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Play/pause control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.play().catch(() => {
        // Autoplay might be blocked
      });
    } else {
      video.pause();
    }
  }, [playing]);

  // Progress tracking
  useEffect(() => {
    progressInterval.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        onProgress(video.currentTime);
      }
    }, 1000);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [onProgress]);

  const handlePlay = useCallback(() => {
    onPlay();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    onPause();
  }, [onPause]);

  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    if (video && !isSeeking.current) {
      onSeek(video.currentTime);
    }
    isSeeking.current = false;
  }, [onSeek]);

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && isFinite(video.duration)) {
      onDuration(video.duration);
    }
  }, [onDuration]);

  // Expose seekTo for external sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    (video as any).__seekTo = (time: number) => {
      isSeeking.current = true;
      video.currentTime = time;
    };
  }, []);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      onPlay={handlePlay}
      onPause={handlePause}
      onSeeked={handleSeeked}
      onDurationChange={handleDurationChange}
      className="w-full h-full bg-black object-contain"
      style={{ maxHeight: "100%", maxWidth: "100%" }}
    />
  );
}
