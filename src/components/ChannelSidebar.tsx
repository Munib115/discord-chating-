"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createChannel, switchUser } from "@/app/actions";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";
import SettingsModal from "./SettingsModal";

interface User {
  id: number;
  username: string;
  avatar: string;
  bio: string | null;
}

interface Channel {
  id: number;
  name: string;
  slug: string;
  type?: string; // "TEXT" or "VOICE"
}

interface Den {
  id: number;
  name: string;
  slug: string;
  description: string;
  banner?: string | null;
  icon?: string | null;
  createdAt?: string | Date;
}

interface ChannelSidebarProps {
  currentDen?: Den;
  channels: Channel[];
  currentUser?: User | null;
  allUsers: User[];
}

export default function ChannelSidebar({
  currentDen,
  channels,
  currentUser,
  allUsers,
}: ChannelSidebarProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDenSlug = params.denSlug as string;
  const currentChannelSlug = params.channelSlug as string;
  const currentTab = searchParams ? searchParams.get("tab") || "all-discussions" : "all-discussions";
  const recipientId = searchParams ? searchParams.get("recipientId") : null;

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("TEXT");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice Chat States
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [speakers, setSpeakers] = useState<Record<number, boolean>>({});

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !currentDen) return;
    setLoading(true);
    try {
      const newChannel = await createChannel({
        name: channelName,
        denId: currentDen.id,
      });
      setIsAddChannelOpen(false);
      setChannelName("");
      router.push(`/d/${currentDen.slug}/${newChannel.slug}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async (userId: number) => {
    await switchUser(userId);
    setIsUserMenuOpen(false);
  };

  const handleVoiceChannelClick = (channelName: string) => {
    if (activeVoiceChannel === channelName) return; // already in it

    // Play connect audio tone
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(600, ctx.currentTime);
      osc2.frequency.setValueAtTime(900, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    setActiveVoiceChannel(channelName);

    // Pick 2 random peers from registered users to join the VC call
    if (currentUser) {
      const candidates = allUsers.filter((u) => u.id !== currentUser.id);
      setConnectedUsers(candidates.slice(0, 2));
    }
  };

  const handleDisconnectVoice = () => {
    // Play disconnect tone
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}

    setActiveVoiceChannel(null);
    setConnectedUsers([]);
    setSpeakers({});
  };

  // Dynamic speaking indicators loop
  useEffect(() => {
    if (!activeVoiceChannel) {
      setSpeakers({});
      return;
    }

    const interval = setInterval(() => {
      const talkMap: Record<number, boolean> = {};
      if (currentUser && !isMuted && Math.random() > 0.45) {
        talkMap[currentUser.id] = Math.random() > 0.5;
      }
      connectedUsers.forEach((u) => {
        if (!isDeafened && Math.random() > 0.6) {
          talkMap[u.id] = Math.random() > 0.5;
        }
      });
      setSpeakers(talkMap);
    }, 1500);

    return () => clearInterval(interval);
  }, [activeVoiceChannel, connectedUsers, currentUser, isMuted, isDeafened]);

  const textChannels = channels.filter((c) => c.type !== "VOICE");
  const voiceChannels = channels.filter((c) => c.type === "VOICE");

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col h-screen flex-shrink-0 select-none">
      {/* Den Header Banner */}
      <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4 shadow-sm">
        <h1 className="font-bold text-white text-[15px] truncate">
          {currentDen ? currentDen.name : "OtakuDen Home"}
        </h1>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-[18px]">
        {currentDen ? (
          <>
            {/* 1. Text Channels */}
            <div>
              <div className="flex items-center justify-between text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1">
                <span>Text Channels</span>
                <button
                  onClick={() => {
                    setChannelType("TEXT");
                    setIsAddChannelOpen(true);
                  }}
                  className="hover:text-white transition"
                  title="Create Text Channel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-[2px]">
                {textChannels.map((chan) => {
                  const isActive = currentChannelSlug === chan.slug;
                  return (
                    <Link key={chan.id} href={`/d/${currentDenSlug}/${chan.slug}`}>
                      <div
                        className={`flex items-center px-2 py-1.5 rounded-md gap-1.5 transition text-[15px] ${
                          isActive
                            ? "bg-[#35373c] text-white font-medium"
                            : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                        }`}
                      >
                        <span className="text-xl text-[#80848e]">#</span>
                        <span className="truncate">{chan.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 2. Voice Channels */}
            <div>
              <div className="flex items-center justify-between text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1">
                <span>Voice Channels</span>
                <button
                  onClick={() => {
                    setChannelType("VOICE");
                    setIsAddChannelOpen(true);
                  }}
                  className="hover:text-white transition"
                  title="Create Voice Channel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-[2px]">
                {voiceChannels.map((chan) => {
                  const isJoined = activeVoiceChannel === chan.name;
                  return (
                    <div key={chan.id} className="flex flex-col">
                      <button
                        onClick={() => handleVoiceChannelClick(chan.name)}
                        className={`flex items-center px-2 py-1.5 rounded-md gap-2 w-full text-left transition text-[15px] ${
                          isJoined
                            ? "text-emerald-400 font-medium bg-emerald-500/5"
                            : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                        }`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <span className="truncate flex-1">{chan.name}</span>
                      </button>

                      {/* Display connected speakers underneath */}
                      {isJoined && currentUser && (
                        <div className="flex flex-col gap-1 ml-6 mt-1 mb-2">
                          {/* 1. Self */}
                          <div className="flex items-center gap-1.5 text-xs py-0.5 select-none">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 transition-all ${
                                speakers[currentUser.id]
                                  ? "border-emerald-500 ring-2 ring-emerald-500/20 scale-105"
                                  : "border-transparent"
                              } ${getAvatarBg(currentUser.avatar)}`}
                            >
                              {getAvatarEmoji(currentUser.avatar)}
                            </span>
                            <span className={`truncate ${speakers[currentUser.id] ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                              {currentUser.username}
                            </span>
                          </div>

                          {/* 2. Simulated call peers */}
                          {connectedUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-1.5 text-xs py-0.5 select-none">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 transition-all ${
                                  speakers[u.id]
                                    ? "border-emerald-500 ring-2 ring-emerald-500/20 scale-105"
                                    : "border-transparent"
                                } ${getAvatarBg(u.avatar)}`}
                              >
                                {getAvatarEmoji(u.avatar)}
                              </span>
                              <span className={`truncate ${speakers[u.id] ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                                {u.username}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 1. Home Navigation options */}
            <div>
              <div className="text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1 select-none">
                Home Lobby
              </div>
              <div className="flex flex-col gap-[2px]">
                <Link href="/?tab=all-discussions">
                  <div className={`flex items-center px-2 py-1.5 rounded-md gap-1.5 transition text-[15px] ${
                    currentTab === "all-discussions"
                      ? "bg-[#35373c] text-white font-medium"
                      : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                  }`}>
                    <span className="text-xl text-[#80848e]">#</span>
                    <span>all-discussions</span>
                  </div>
                </Link>
                <Link href="/?tab=explore-dens">
                  <div className={`flex items-center px-2 py-1.5 rounded-md gap-1.5 transition text-[15px] ${
                    currentTab === "explore-dens"
                      ? "bg-[#35373c] text-white font-medium"
                      : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                  }`}>
                    <span className="text-xl text-[#80848e]">#</span>
                    <span>explore-dens</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* 2. Direct Messages section list */}
            {currentUser && (
              <div>
                <div className="text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1.5 mt-2 select-none">
                  Direct Messages
                </div>

                {/* Find or start a conversation search bar */}
                <div className="px-2 mb-2 select-none">
                  <input
                    type="text"
                    placeholder="Find or start a conversation"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#120f14] text-xs text-[#dbdee1] border border-[#232428] rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 transition font-medium"
                  />
                </div>

                <div className="flex flex-col gap-[2px]">
                  {allUsers
                    .filter((u) => u.id !== currentUser.id)
                    .filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((u) => {
                      const isActive = currentTab === "dm" && Number(recipientId) === u.id;
                      return (
                        <Link key={u.id} href={`/?tab=dm&recipientId=${u.id}`}>
                          <div className={`flex items-center px-2 py-1.5 rounded-md gap-2 transition text-[15px] ${
                            isActive
                              ? "bg-[#35373c] text-white font-medium"
                              : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                          }`}>
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 ${getAvatarBg(u.avatar)}`}>
                              {getAvatarEmoji(u.avatar)}
                            </span>
                            <span className="truncate">{u.username}</span>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Voice Status Connected Footer */}
      {activeVoiceChannel && (
        <div className="bg-[#232428] border-b border-[#1f2023] p-2 flex flex-col gap-1.5 select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] truncate max-w-[125px] font-bold leading-tight">Voice Connected</span>
                <span className="text-[9.5px] text-[#949ba4] leading-none truncate max-w-[125px] mt-0.5">
                  {activeVoiceChannel}
                </span>
              </div>
            </div>

            <button
              onClick={handleDisconnectVoice}
              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded transition"
              title="Disconnect Voice Call"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex-1 py-1 rounded text-center text-[10px] font-bold transition flex items-center justify-center gap-1 border border-[#1e1f22]/50 ${
                isMuted ? "bg-rose-500/20 text-rose-400" : "bg-[#2b2d31] text-[#949ba4] hover:text-white"
              }`}
            >
              🎙️ {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`flex-1 py-1 rounded text-center text-[10px] font-bold transition flex items-center justify-center gap-1 border border-[#1e1f22]/50 ${
                isDeafened ? "bg-rose-500/20 text-rose-400" : "bg-[#2b2d31] text-[#949ba4] hover:text-white"
              }`}
            >
              🎧 {isDeafened ? "Undeafen" : "Deafen"}
            </button>
          </div>
        </div>
      )}

      {/* User Status Bar at the bottom */}
      <div className="h-[52px] bg-[#232428] flex items-center justify-between px-2 relative select-none">
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center gap-2 hover:bg-[#35373c] p-1.5 rounded-md cursor-pointer transition text-left flex-1 min-w-0 mr-1"
        >
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-base font-bold flex-shrink-0 ${
              currentUser ? getAvatarBg(currentUser.avatar) : "bg-indigo-600/20 text-white"
            }`}
          >
            {currentUser ? getAvatarEmoji(currentUser.avatar) : "👤"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate leading-snug">
              {currentUser ? currentUser.username : "Guest User"}
            </span>
            <span className="text-[10px] text-[#949ba4] leading-tight truncate">
              {currentUser?.bio || "Switch Identity..."}
            </span>
          </div>
        </button>

        {/* Settings Gear icon right next to profile switcher */}
        {currentUser && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition flex-shrink-0"
            title="User Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        {/* Dynamic User Selector Menu */}
        {isUserMenuOpen && (
          <div className="absolute bottom-[60px] left-2 right-2 bg-[#111214] border border-[#232428] rounded-md shadow-2xl z-50 p-2 text-white animate-in slide-in-from-bottom-2 duration-100">
            <div className="text-[11px] font-bold text-[#949ba4] uppercase px-2 py-1 border-b border-[#232428] mb-1">
              Select Character Profile
            </div>
            <div className="flex flex-col gap-[2px] max-h-48 overflow-y-auto">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u.id)}
                  className={`flex items-center gap-2 w-full text-left p-1.5 rounded hover:bg-indigo-600 transition ${
                    currentUser?.id === u.id ? "bg-[#35373c]" : ""
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${getAvatarBg(
                      u.avatar
                    )}`}
                  >
                    {getAvatarEmoji(u.avatar)}
                  </span>
                  <span className="text-xs font-semibold truncate flex-1">{u.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Channel Modal */}
      {isAddChannelOpen && currentDen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-md max-w-sm w-full overflow-hidden shadow-2xl border border-[#232428] animate-in fade-in zoom-in-95 duration-150 text-white">
            <form onSubmit={handleAddChannel} className="p-6">
              <h3 className="text-xl font-bold mb-1">Create Channel</h3>
              <p className="text-[#949ba4] text-xs mb-4">
                Configure a new topic channel within this Den.
              </p>

              <div className="mb-4">
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Channel Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-[9px] text-[#949ba4] text-lg">#</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="new-channel"
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2 pl-7 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 bg-[#2b2d31] -mx-6 -mb-6 p-4 border-t border-[#232428]">
                <button
                  type="button"
                  onClick={() => setIsAddChannelOpen(false)}
                  className="text-white hover:underline text-sm font-medium px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-5 py-2 text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Settings Fullscreen Overlay */}
      {isSettingsOpen && currentUser && (
        <SettingsModal
          user={currentUser}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
