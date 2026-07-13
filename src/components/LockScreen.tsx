"use client";

import React, { useState, useTransition } from "react";
import { joinDenWithPasscode } from "@/app/actions";

interface LockScreenProps {
  denId: number;
  denName: string;
  denIcon: string | null;
  denSlug: string;
}

export default function LockScreen({ denId, denName, denIcon, denSlug }: LockScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setError("");

    startTransition(async () => {
      try {
        await joinDenWithPasscode(denId, passcode);
      } catch (err: any) {
        setError(err.message || "Invalid passcode. Please try again.");
      }
    });
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      <div className="bg-[#2b2d31] p-8 rounded-lg shadow-2xl border border-[#232428] max-w-md w-full">
        {/* Den Brand Header */}
        <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-3xl flex items-center justify-center mx-auto mb-4">
          {denIcon || "⚔️"}
        </div>
        <h2 className="text-xl font-bold text-white mb-1">d/{denSlug}</h2>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Entering "{denName}"</h3>

        <div className="w-full h-[1px] bg-[#35363c] mb-6" />

        {/* Locked Status */}
        <div className="text-amber-500 mb-6 flex flex-col items-center gap-1">
          <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm font-bold uppercase tracking-wider mt-1">Protected Community</span>
          <p className="text-xs text-[#949ba4] max-w-xs mt-1 leading-normal">
            This Den is private and requires a valid invite passcode to join. Ask the admin for details.
          </p>
        </div>

        {/* Passcode input */}
        <form onSubmit={handleJoin} className="flex flex-col gap-3 text-left">
          <div>
            <label htmlFor="input-passcode" className="block text-[#b5bac1] uppercase text-[10px] font-bold mb-1.5 px-1">Invite Code</label>
            <input
              id="input-passcode"
              type="text"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full bg-[#1e1f22] text-white border border-[#111214] rounded p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition text-center tracking-widest font-bold"
            />
          </div>

          {error && (
            <div className="text-rose-400 text-xs font-semibold text-center mt-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded py-2.5 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 mt-2"
          >
            {isPending ? "Unlocking..." : "Join Den"}
          </button>
        </form>
      </div>
    </div>
  );
}
