"use client";

import React, { useTransition, useState, useEffect, useRef } from "react";
import { kickUserFromDen } from "@/app/actions";
import Avatar from "./Avatar";
import { createClient } from "@supabase/supabase-js";
import UserProfilePopup from "./UserProfilePopup";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabase = supabaseUrl.includes("placeholder") ? null! : createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: number;
  username: string;
  avatar: string;
  discriminator?: string;
  bio?: string | null;
  createdAt?: string | Date;
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
  channelMembers?: Member[]; // New channel-level members
  channelName?: string;
}

export default function MemberList({
  denId,
  members,
  ownerId,
  currentUserId,
  channelMembers = [],
  channelName = "",
}: MemberListProps) {
  const [, startTransition] = useTransition();
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  // User Profile Popup States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<DOMRect | null>(null);
  const [popupOnlineStatus, setPopupOnlineStatus] = useState(false);
  const [popupIsOwner, setPopupIsOwner] = useState(false);
  const [popupIsSelf, setPopupIsSelf] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !currentUserId) return;
    
    const topic = `den-presence-${denId}`;
    
    // Clean up duplicate cached channels in StrictMode double-mount cases
    const existing = supabase.getChannels().find(
      (c) => c.topic === `realtime:${topic}` || c.topic === topic
    );
    if (existing) {
      supabase.removeChannel(existing);
    }
    if ((supabase as any).realtime) {
      (supabase as any).realtime.channels = (supabase as any).realtime.channels.filter(
        (c: any) => c.topic !== `realtime:${topic}` && c.topic !== topic
      );
    }

    const channel = supabase.channel(topic, {
      config: { presence: { key: currentUserId.toString() } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state).map((k) => parseInt(k, 10)).filter((n) => !isNaN(n));
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: currentUserId, onlineAt: new Date().toISOString() });
        }
      });
    return () => { 
      channel.unsubscribe();
      supabase.removeChannel(channel); 
    };
  }, [denId, currentUserId]);

  const handleKick = (e: React.MouseEvent, userId: number, username: string) => {
    e.stopPropagation(); // prevent opening profile card when clicking kick button
    if (!confirm(`Kick @${username} from this server?`)) return;
    startTransition(async () => {
      try { await kickUserFromDen(denId, userId); }
      catch (err: any) { alert(err.message || "Failed to kick user."); }
    });
  };

  const handleMemberClick = (e: React.MouseEvent<HTMLDivElement>, m: Member) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isOnline = onlineUserIds.includes(m.userId) || m.userId === currentUserId;
    const isOwner = m.userId === ownerId;
    const isSelf = m.userId === currentUserId;

    setSelectedUser(m.user);
    setPopupAnchor(rect);
    setPopupOnlineStatus(isOnline);
    setPopupIsOwner(isOwner);
    setPopupIsSelf(isSelf);
  };

  const isAdmin = currentUserId === ownerId;

  // Filter lists
  const onlineMembers = members.filter((m) => onlineUserIds.includes(m.userId) || m.userId === currentUserId);
  const offlineMembers = members.filter((m) => !onlineUserIds.includes(m.userId) && m.userId !== currentUserId);

  const renderMember = (m: Member) => {
    const isOwner = m.userId === ownerId;
    const isSelf = m.userId === currentUserId;
    const isOnline = onlineUserIds.includes(m.userId) || isSelf;
    const disc = m.user.discriminator ? `#${m.user.discriminator}` : "";
    return (
      <div
        key={m.userId}
        onClick={(e) => handleMemberClick(e, m)}
        className="group flex items-center justify-between px-2 py-[3px] rounded hover:bg-[#35373c] transition cursor-pointer mx-1"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar avatar={m.user.avatar} className="w-8 h-8 text-xs" />
            <span className={`absolute -bottom-px -right-px w-3 h-3 rounded-full border-2 border-[#2b2d31] ${isOnline ? "bg-[#23a55a]" : "bg-[#80848e]"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 truncate">
              <span className={`text-sm font-medium truncate leading-tight ${isOnline ? "text-[#dbdee1]" : "text-[#616366]"} ${isOwner ? "!text-[#949cff]" : ""}`}>
                {m.user.username}
              </span>
              {isOwner && <span className="text-[10px] leading-none" title="Server Owner">👑</span>}
            </div>
            {disc && <div className="text-[10px] text-[#616366] leading-tight">{disc}</div>}
            {isSelf && <div className="text-[10px] text-[#5865f2] leading-tight font-medium">You</div>}
          </div>
        </div>
        {isAdmin && !isOwner && !isSelf && (
          <button
            onClick={(e) => handleKick(e, m.userId, m.user.username)}
            className="hidden group-hover:flex text-[#f23f43] hover:text-white hover:bg-[#f23f43] text-[10px] font-bold uppercase px-1.5 py-0.5 rounded transition flex-shrink-0"
          >Kick</button>
        )}
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col h-full overflow-y-auto no-scrollbar flex-shrink-0 border-l border-[#232428] pt-4">
      {/* 1. Channel Members List (Admin & Members Tracking) */}
      {channelName && (
        <div className="mb-4 pb-4 border-b border-[#232428]/40">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.04em]">
              #{channelName} Joined ({channelMembers.length})
            </span>
          </div>
          {channelMembers.length > 0 ? (
            channelMembers.map(renderMember)
          ) : (
            <div className="px-3 py-2 text-[11px] text-[#80848e] italic select-none">
              No one has followed this channel yet.
            </div>
          )}
        </div>
      )}

      {/* 2. General Server Members */}
      <div className="px-3 mb-1.5 select-none">
        <span className="text-[10px] font-bold text-[#80848e] uppercase tracking-wider">
          Den Members
        </span>
      </div>

      {onlineMembers.length > 0 && (
        <div className="mb-4">
          <div className="px-3 mb-1">
            <span className="text-[11px] font-bold text-[#949ba4] uppercase tracking-[0.04em]">Online - {onlineMembers.length}</span>
          </div>
          {onlineMembers.map(renderMember)}
        </div>
      )}
      {offlineMembers.length > 0 && (
        <div className="mb-4">
          <div className="px-3 mb-1">
            <span className="text-[11px] font-bold text-[#949ba4] uppercase tracking-[0.04em]">Offline - {offlineMembers.length}</span>
          </div>
          {offlineMembers.map(renderMember)}
        </div>
      )}
      {isAdmin && (
        <div className="px-3 mt-1 mb-4">
          <span className="text-[10px] text-[#949cff] font-bold uppercase tracking-wide border border-[#949cff]/30 px-2 py-0.5 rounded-sm">Admin</span>
        </div>
      )}

      {/* Profile Card Popup overlay */}
      {selectedUser && (
        <UserProfilePopup
          user={selectedUser}
          isOnline={popupOnlineStatus}
          isOwner={popupIsOwner}
          isSelf={popupIsSelf}
          anchorRect={popupAnchor}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
