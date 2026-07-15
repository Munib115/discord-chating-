"use client";

import React, { useTransition, useState } from "react";
import { joinChannel } from "@/app/actions";
import { useRouter } from "next/navigation";

interface JoinChannelButtonProps {
  channelId: number;
  channelName: string;
  isPrivate?: boolean;
}

export default function JoinChannelButton({ channelId, channelName, isPrivate }: JoinChannelButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    setError("");
    startTransition(async () => {
      try {
        await joinChannel(channelId, password);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="max-w-md w-full bg-[#2b2d31] border border-[#232428] rounded-xl p-8 shadow-2xl flex flex-col items-center">
        {/* Animated Icon */}
        <div className="w-20 h-20 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-4xl flex items-center justify-center mb-6 relative">
          <span className="animate-pulse">Lantern</span>
          <span className="absolute -top-1 -right-1 text-base bg-indigo-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-white shadow-lg border-2 border-[#2b2d31]">
            +
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-black text-white mb-2">Welcome to #{channelName}!</h2>
        <p className="text-sm text-[#949ba4] leading-relaxed mb-6">
          {isPrivate
            ? "This is a private passcode-protected channel. Enter the password to join."
            : "This channel requires joining to enter. Join now to view discussions and chat with members in real-time."}
        </p>

        {/* Password input for private channel */}
        {isPrivate && (
          <div className="w-full text-left mb-5">
            <label className="block text-[11px] uppercase font-bold text-[#b5bac1] tracking-wider mb-2">
              🔒 Enter Channel Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Private passcode..."
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-lg px-4 py-3 text-white text-sm
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition
                placeholder:text-[#4e5058]"
            />
          </div>
        )}

        {error && (
          <div className="w-full mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2.5 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Joining...
            </>
          ) : (
            `Join #${channelName} 🏮`
          )}
        </button>
      </div>
    </div>
  );
}
