"use client";

import React, { useState, useTransition } from "react";
import { getDenInvite } from "@/app/actions";

interface InviteModalProps {
  denId: number;
  denName: string;
  onClose: () => void;
}

export default function InviteModal({ denId, denName, onClose }: InviteModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, startTransition] = useTransition();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = token ? `${baseUrl}/invite/${token}` : "";

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const invite = await getDenInvite(denId);
        setToken(invite.token);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-generate on mount
  React.useEffect(() => {
    handleGenerate();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#313338] rounded-lg max-w-md w-full border border-[#232428] shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#232428]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">🔗 Invite People</h3>
            <button
              onClick={onClose}
              className="text-[#949ba4] hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-[#949ba4] mt-1">
            Share this link to invite friends to <span className="text-white font-semibold">{denName}</span>.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase font-bold text-[#b5bac1] mb-2">
              Send an invite link to a friend
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#1e1f22] border border-[#111214] rounded px-3 py-2 text-sm text-white font-mono truncate select-all">
                {loading ? (
                  <span className="text-[#949ba4] animate-pulse">Generating link...</span>
                ) : inviteUrl ? (
                  inviteUrl
                ) : (
                  <span className="text-[#949ba4]">Click generate</span>
                )}
              </div>
              <button
                onClick={handleCopy}
                disabled={!inviteUrl || loading}
                className={`px-4 py-2 rounded text-sm font-bold transition whitespace-nowrap ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Invite info chips */}
          <div className="flex gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] bg-[#1e1f22] border border-[#232428] text-[#949ba4] px-2.5 py-1 rounded-full">
              ♾️ Unlimited uses
            </span>
            <span className="flex items-center gap-1 text-[11px] bg-[#1e1f22] border border-[#232428] text-[#949ba4] px-2.5 py-1 rounded-full">
              🕐 Never expires
            </span>
          </div>

          {/* Generate new link */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold self-start transition disabled:opacity-50"
          >
            {loading ? "Generating..." : "↺ Generate a new link"}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#2b2d31] border-t border-[#232428]">
          <p className="text-[11px] text-[#6b7280]">
            Anyone with this link can join <span className="text-white font-semibold">{denName}</span> without a passcode.
          </p>
        </div>
      </div>
    </div>
  );
}
