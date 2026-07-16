"use client";

import React, { useState, useTransition } from "react";
import { reportPost } from "@/app/actions";

interface ReportPostButtonProps {
  postId: number;
}

export default function ReportPostButton({ postId }: ReportPostButtonProps) {
  const [reported, setReported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleReport = () => {
    if (!reason.trim() || isPending) return;

    startTransition(async () => {
      try {
        await reportPost(postId, reason.trim());
        setReported(true);
        setIsOpen(false);
      } catch (e) {
        console.error(e);
      }
    });
  };

  if (reported) {
    return (
      <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded select-none">
        ⚠️ Reported
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-[#949ba4] hover:text-rose-400 transition"
      >
        Report
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-6 w-56 bg-[#111214] border border-[#232428] rounded-md shadow-2xl z-50 p-3 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-100">
            <p className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wide">
              Report Post
            </p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Spoilers, Harassment"
              className="bg-[#1e1f22] border border-[#232428] text-xs text-white rounded p-1.5 focus:outline-none focus:border-rose-500 transition"
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-white hover:underline px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={isPending || !reason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-1 rounded transition disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
