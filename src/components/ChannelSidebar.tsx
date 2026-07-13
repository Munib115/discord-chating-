"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createChannel, switchUser } from "@/app/actions";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";

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
}

interface Den {
  id: number;
  name: string;
  slug: string;
  description: string;
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
  const currentDenSlug = params.denSlug as string;
  const currentChannelSlug = params.channelSlug as string;

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col h-screen flex-shrink-0 select-none">
      {/* Den Header Banner */}
      <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4 shadow-sm">
        <h1 className="font-bold text-white text-[15px] truncate">
          {currentDen ? currentDen.name : "OtakuDen Forum"}
        </h1>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-[2px]">
        {currentDen ? (
          <>
            <div className="flex items-center justify-between text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1.5 mt-1">
              <span>Text Channels</span>
              <button
                onClick={() => setIsAddChannelOpen(true)}
                className="hover:text-white transition"
                title="Create Channel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {channels.map((chan) => {
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
          </>
        ) : (
          <div className="px-3 py-4 text-sm text-[#949ba4] text-center">
            Select a Den from the left sidebar to view topics.
          </div>
        )}
      </div>

      {/* User Status Bar at the bottom */}
      <div className="h-[52px] bg-[#232428] flex items-center justify-between px-2.5 relative">
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
            <span className="text-sm font-semibold text-white truncate">
              {currentUser ? currentUser.username : "Guest User"}
            </span>
            <span className="text-[10.5px] text-[#949ba4] leading-tight truncate">
              {currentUser?.bio || "Switch Identity..."}
            </span>
          </div>
        </button>

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
                Channels are directories where you categorize discussion topics.
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
    </div>
  );
}
