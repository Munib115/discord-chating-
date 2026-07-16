"use client";

import React, { useState, useTransition } from "react";

interface PollOption {
  text: string;
  votes: number;
}

interface PollWidgetProps {
  pollId: number;
  question: string;
  options: string[]; // JSON-parsed option strings
  existingVotes: { optionIndex: number; userId: number }[]; // all votes
  currentUserId?: number;
}

export default function PollWidget({ pollId, question, options, existingVotes, currentUserId }: PollWidgetProps) {
  const userVote = existingVotes.find((v) => v.userId === currentUserId);
  const [votedIndex, setVotedIndex] = useState<number | null>(userVote?.optionIndex ?? null);
  const [votes, setVotes] = useState(() => {
    const counts = new Array(options.length).fill(0);
    existingVotes.forEach((v) => counts[v.optionIndex]++);
    return counts;
  });
  const [isPending, startTransition] = useTransition();

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  const handleVote = (index: number) => {
    if (votedIndex !== null || !currentUserId) return;

    startTransition(async () => {
      try {
        const { votePoll } = await import("@/app/actions");
        await votePoll(pollId, index);
        const newVotes = [...votes];
        newVotes[index]++;
        setVotes(newVotes);
        setVotedIndex(index);
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="bg-[#1e1f22] border border-[#232428] rounded-xl p-4 flex flex-col gap-3 select-none">
      {/* Poll header */}
      <div className="flex items-start gap-2">
        <span className="text-xl mt-0.5">📊</span>
        <div>
          <p className="text-sm font-bold text-white leading-snug">{question}</p>
          <p className="text-[11px] text-[#949ba4] mt-0.5">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const count = votes[i];
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = votedIndex === i;
          const hasVoted = votedIndex !== null;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={hasVoted || isPending || !currentUserId}
              className={`relative w-full text-left rounded-lg overflow-hidden border transition-all group ${
                isMyVote
                  ? "border-indigo-500 bg-indigo-500/10"
                  : hasVoted
                  ? "border-[#232428] bg-[#111214] opacity-70 cursor-default"
                  : "border-[#232428] bg-[#111214] hover:border-[#4e5058] hover:bg-[#1e1f22] cursor-pointer"
              }`}
            >
              {/* Progress bar */}
              {hasVoted && (
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ease-out ${
                    isMyVote ? "bg-indigo-500/20" : "bg-[#2b2d31]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {isMyVote && <span className="text-indigo-400 text-xs">✓</span>}
                  <span className={`text-sm ${isMyVote ? "text-white font-semibold" : "text-[#dbdee1]"}`}>
                    {opt}
                  </span>
                </div>
                {hasVoted && (
                  <span className="text-xs font-bold text-[#949ba4] shrink-0 ml-2">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!currentUserId && (
        <p className="text-[11px] text-[#949ba4] text-center">Register to vote</p>
      )}
    </div>
  );
}
