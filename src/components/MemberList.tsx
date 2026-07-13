"use client";

import React, { useTransition } from "react";
import { kickUserFromDen } from "@/app/actions";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";

interface User {
  id: number;
  username: string;
  avatar: string;
}

interface Member {
  userId: number;
  user: User;
}

interface MemberListProps {
  denId: number;
  members: Member[];
  ownerId: number | null;
  currentUserId?: number;
}

export default function MemberList({
  denId,
  members,
  ownerId,
  currentUserId,
}: MemberListProps) {
  const [, startTransition] = useTransition();

  const handleKick = (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to kick @${username} from this Den?`)) return;

    startTransition(async () => {
      try {
        await kickUserFromDen(denId, userId);
      } catch (err: any) {
        alert(err.message || "Failed to kick user.");
      }
    });
  };

  const isAdmin = currentUserId === ownerId;

  return (
    <div className="bg-[#2b2d31] rounded-md border border-[#232428] p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold text-[#949ba4] uppercase tracking-wide">
          Chamber Members ({members.length})
        </h4>
        {isAdmin && (
          <span className="text-[10px] text-indigo-400 font-bold uppercase select-none">
            Admin View
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-1 max-h-48 overflow-y-auto no-scrollbar">
        {members.map((m) => {
          const isOwner = m.userId === ownerId;
          const isSelf = m.userId === currentUserId;

          return (
            <div key={m.userId} className="flex items-center justify-between text-xs group/member py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${getAvatarBg(m.user.avatar)}`}>
                  {getAvatarEmoji(m.user.avatar)}
                </span>
                <span className={`font-medium text-slate-200 truncate ${isOwner ? "text-indigo-400 font-bold" : ""}`}>
                  {m.user.username}
                  {isOwner && " 👑"}
                  {isSelf && " (You)"}
                </span>
              </div>

              {/* Show Kick button if user is Admin, and they are not kicking themselves or the owner */}
              {isAdmin && !isOwner && !isSelf && (
                <button
                  onClick={() => handleKick(m.userId, m.user.username)}
                  className="text-rose-400 hover:text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-[10px] uppercase transition cursor-pointer select-none"
                  title={`Kick @${m.user.username}`}
                >
                  Kick
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
