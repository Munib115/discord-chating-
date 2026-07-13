"use client";

import React, { useState, useTransition, useEffect } from "react";
import { updateUserProfile } from "@/app/actions";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";

interface User {
  id: number;
  username: string;
  avatar: string;
  bio: string | null;
}

interface SettingsModalProps {
  user: User;
  onClose: () => void;
}

export default function SettingsModal({ user, onClose }: SettingsModalProps) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);

  // Check if current fields differ from initial user details
  useEffect(() => {
    setHasChanges(username.trim() !== user.username || bio.trim() !== (user.bio || ""));
  }, [username, bio, user]);

  const handleReset = () => {
    setUsername(user.username);
    setBio(user.bio || "");
    setError("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        await updateUserProfile({ username: username.trim(), bio: bio.trim() });
        setHasChanges(false);
        // Refresh page / close is handled by action revalidation or close trigger
      } catch (err: any) {
        setError(err.message || "Failed to update profile.");
      }
    });
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-[#313338] z-[9999] flex text-white select-none animate-in fade-in duration-200">
      {/* Left Settings Sidebar */}
      <aside className="w-60 bg-[#2b2d31] flex flex-col items-end pr-6 py-12 gap-1 border-r border-[#232428]/40">
        <div className="w-48 flex flex-col gap-1 text-left">
          <div className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider mb-1.5 px-2">
            User Settings
          </div>
          <button className="w-full text-left text-sm font-medium px-2 py-1.5 rounded bg-[#35373c] text-white">
            My Profile
          </button>
          <div className="w-full h-[1px] bg-[#35363c] my-4" />
          <button
            onClick={onClose}
            className="w-full text-left text-sm font-semibold text-rose-400 hover:bg-rose-500/10 px-2 py-1.5 rounded transition"
          >
            Go Back
          </button>
        </div>
      </aside>

      {/* Right Content Panel */}
      <main className="flex-1 bg-[#313338] px-10 py-12 overflow-y-auto relative min-w-0">
        <div className="max-w-xl w-full flex flex-col gap-6 text-left pb-24">
          <div>
            <h2 className="text-xl font-bold text-white">My Profile</h2>
            <p className="text-xs text-[#949ba4] mt-0.5">Customize how you appear to other otakus in discussions and chat rooms.</p>
          </div>

          {/* User Profile Card Preview */}
          <div className="bg-[#1e1f22] rounded-lg border border-[#232428] overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-indigo-600 to-indigo-950 p-4" />
            <div className="px-6 pb-6 relative">
              {/* Avatar position */}
              <div className="absolute -top-9 left-6">
                <span className={`w-18 h-18 rounded-full border-4 border-[#1e1f22] flex items-center justify-center text-3xl shadow-xl select-none ${getAvatarBg(user.avatar)}`}>
                  {getAvatarEmoji(user.avatar)}
                </span>
              </div>

              {/* Card info block */}
              <div className="pt-12">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-white">
                    {username.trim() || user.username}
                  </h3>
                  <span className="text-[10px] bg-indigo-600/30 text-indigo-400 font-bold px-1.5 py-0.5 rounded select-none">
                    USER
                  </span>
                </div>
                <p className="text-xs text-[#949ba4] mt-2 whitespace-pre-wrap italic">
                  {bio.trim() || "No bio set yet."}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Username Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-username" className="text-3xs uppercase font-bold text-[#b5bac1]">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                maxLength={25}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Bio input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-bio" className="text-3xs uppercase font-bold text-[#b5bac1]">
                About Me (Bio)
              </label>
              <textarea
                id="settings-bio"
                rows={4}
                maxLength={150}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell other members what you're watching or reading..."
                className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-md font-semibold">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Discord-like Unsaved Changes slide-in floating banner */}
        {hasChanges && (
          <div className="absolute bottom-6 left-10 right-10 bg-[#111214] border border-[#232428] rounded-md p-3.5 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <span className="text-xs font-semibold text-[#dbdee1]">
              Careful — you have unsaved changes!
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="text-xs font-medium text-white hover:underline px-3 py-1.5"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Close Button escape helper on the right */}
        <div className="absolute right-12 top-12 flex flex-col items-center gap-1.5 select-none">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#4e5058] hover:bg-[#35373c] text-white flex items-center justify-center transition"
            title="Close Settings (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-3xs text-[#949ba4] font-bold">ESC</span>
        </div>
      </main>
    </div>
  );
}
