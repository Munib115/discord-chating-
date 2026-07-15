"use client";

import React, { useState, useTransition, useEffect } from "react";
import { updateUserProfile, registerOrLinkSupabaseUser, disconnectSupabaseUser } from "@/app/actions";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";
import { createClient } from "@supabase/supabase-js";
import Avatar from "./Avatar";

// Initialize Supabase Client dynamically from process env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabase = supabaseUrl.includes("placeholder") ? null! : createClient(supabaseUrl, supabaseAnonKey);

const THEMES = [
  {
    id: "default",
    name: "Default Cozy Dark",
    description: "Original warm plum dark mode.",
    requiredMessages: 0,
    badge: "Free",
    previewColor: "bg-[#26202b]"
  },
  {
    id: "sakura",
    name: "Sakura Blossom Pink",
    description: "Cozy pastel pink spring aesthetic.",
    requiredMessages: 10,
    badge: "10 msgs",
    previewColor: "bg-[#2d1b22]"
  },
  {
    id: "ocean-breeze",
    name: "Deep Ocean Wave",
    description: "Cool teal/blue marine aesthetic.",
    requiredMessages: 25,
    badge: "25 msgs",
    previewColor: "bg-[#10202b]"
  },
  {
    id: "cyberpunk",
    name: "Cyber Neon City",
    description: "Vaporwave purple/yellow high contrast.",
    requiredMessages: 50,
    badge: "50 msgs",
    previewColor: "bg-[#180a22]"
  },
];

const PRESET_AVATARS = [
  // One Piece
  { id: "luffy", label: "Luffy" },
  { id: "zoro", label: "Zoro" },
  // Naruto
  { id: "naruto", label: "Naruto" },
  { id: "sasuke", label: "Sasuke" },
  { id: "kakashi", label: "Kakashi" },
  // Dragon Ball
  { id: "goku", label: "Goku" },
  { id: "vegeta", label: "Vegeta" },
  // Others
  { id: "tanjiro", label: "Tanjiro" },
  { id: "nezuko", label: "Nezuko" },
  { id: "eren", label: "Eren" },
  { id: "sailor", label: "Sailor" },
  { id: "deku", label: "Deku" },
];

interface SettingsModalProps {
  user: {
    id: number;
    username: string;
    avatar: string;
    bio: string | null;
    email?: string | null;
    supabaseUid?: string | null;
    createdAt?: string | Date;
  };
  onClose: () => void;
}

export default function SettingsModal({ user, onClose }: SettingsModalProps) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    user.avatar.startsWith("http://") || user.avatar.startsWith("https://") || user.avatar.startsWith("data:image/") ? user.avatar : ""
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image file must be under 2MB to keep performance fast!");
      return;
    }

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setCustomAvatarUrl(base64String);
      setAvatar(base64String);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  // Theme states
  const [messageCount, setMessageCount] = useState(0);
  const [currentTheme, setCurrentTheme] = useState("default");

  // Fetch theme eligibility details on mount
  useEffect(() => {
    // 1. Fetch message count
    const fetchUserStats = async () => {
      try {
        const res = await fetch(`/api/user-stats?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessageCount(data.messageCount || 0);
        }
      } catch (e) {
        console.error("Failed to fetch stats:", e);
      }
    };
    fetchUserStats();

    // 2. Fetch current theme from local storage
    const storedTheme = localStorage.getItem("otakuden_theme") || "default";
    setCurrentTheme(storedTheme);
  }, [user.id]);

  const handleSelectTheme = (themeId: string, requiredMsgs: number) => {
    if (messageCount < requiredMsgs) return; // Locked
    setCurrentTheme(themeId);
    setHasChanges(true);
    localStorage.setItem("otakuden_theme", themeId);
    document.documentElement.setAttribute("data-theme", themeId);
  };

  // Check if current fields differ from initial user details
  useEffect(() => {
    const finalAvatar = customAvatarUrl.trim() ? customAvatarUrl.trim() : avatar;
    setHasChanges(
      username.trim() !== user.username ||
      bio.trim() !== (user.bio || "") ||
      finalAvatar !== user.avatar
    );
  }, [username, bio, avatar, customAvatarUrl, user]);

  const handleReset = () => {
    setUsername(user.username);
    setBio(user.bio || "");
    setAvatar(user.avatar);
    setCustomAvatarUrl(
      user.avatar.startsWith("http://") || user.avatar.startsWith("https://") || user.avatar.startsWith("data:image/") ? user.avatar : ""
    );
    setFileName("");
    setError("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    setError("");

    const finalAvatar = customAvatarUrl.trim() ? customAvatarUrl.trim() : avatar;

    startTransition(async () => {
      try {
        await updateUserProfile({
          username: username.trim(),
          bio: bio.trim(),
          avatar: finalAvatar,
        });
        setHasChanges(false);
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

  const currentPreviewAvatar = customAvatarUrl.trim() ? customAvatarUrl.trim() : avatar;

  return (
    <div className="fixed inset-0 z-[1000] flex bg-[#1e1f22] text-[#dbdee1] animate-in fade-in duration-200">
      {/* Settings Left Menu List */}
      <aside className="w-60 bg-[#2b2d31] flex flex-col pt-14 pb-8 items-end px-6 border-r border-[#232428]/40 select-none flex-shrink-0">
        <div className="w-48 flex flex-col gap-1 text-left">
          <span className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wide px-2.5 mb-1.5">User Settings</span>
          <button className="w-full text-left px-2.5 py-1.5 text-sm font-semibold text-white bg-[#35373c] rounded-md">
            My Profile
          </button>
          <div className="h-[1px] bg-[#35363c] my-3 w-full" />
          <button onClick={onClose} className="w-full text-left px-2.5 py-1.5 text-sm font-semibold text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35373c]/30 rounded-md transition flex items-center justify-between">
            <span>Escape Settings</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] border border-[#4e5058] px-1.5 py-0.5 rounded leading-none">Esc</span>
          </button>
        </div>
      </aside>

      {/* Settings Central Content Area */}
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
                <Avatar
                  avatar={currentPreviewAvatar}
                  className="w-18 h-18 border-4 border-[#1e1f22] text-3xl shadow-xl bg-[#2b2d31]"
                />
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

            {/* Avatar Selection Grid */}
            <div className="flex flex-col gap-3">
              <label className="text-3xs uppercase font-bold text-[#b5bac1]">
                Select Anime Avatar
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = avatar === av.id && !customAvatarUrl;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setAvatar(av.id);
                        setCustomAvatarUrl(""); // clear custom url to pick preset
                        setFileName("");
                        setHasChanges(true);
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg"
                          : "border-[#232428] bg-[#1e1f22] hover:border-[#4e5058] hover:bg-[#35373c]/50"
                      }`}
                    >
                      <Avatar avatar={av.id} className="w-8 h-8 border-none bg-transparent" />
                      <span className={`text-[9px] font-semibold truncate w-full ${isSelected ? "text-indigo-400" : "text-[#949ba4]"}`}>
                        {av.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Image URL Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="settings-avatar-url" className="text-3xs uppercase font-bold text-[#b5bac1]">
                Or Paste Custom Profile Picture URL
              </label>
              <input
                id="settings-avatar-url"
                type="text"
                value={customAvatarUrl.startsWith("data:image/") ? "" : customAvatarUrl}
                onChange={(e) => {
                  setCustomAvatarUrl(e.target.value);
                  setAvatar(e.target.value);
                  setFileName("");
                  setHasChanges(true);
                }}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Upload custom file input */}
            <div className="flex flex-col gap-2">
              <label className="text-3xs uppercase font-bold text-[#b5bac1]">
                Or Upload Custom Photo
              </label>
              <div className="relative flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="settings-file-upload"
                />
                <label
                  htmlFor="settings-file-upload"
                  className="cursor-pointer bg-[#35373c] hover:bg-[#4e5058] text-[#dbdee1] hover:text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#4e5058] transition-all flex items-center gap-1.5 select-none"
                >
                  <span>📁</span> Choose Image File
                </label>
                {fileName && (
                  <span className="text-xs text-[#949ba4] truncate max-w-[180px]">
                    {fileName}
                  </span>
                )}
              </div>
            </div>

            {/* App Theme Selector */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-3xs uppercase font-bold text-[#b5bac1]">
                App Theme (Unlock via Chatting!)
              </label>
              <p className="text-xs text-[#949ba4] mb-2 leading-relaxed">
                Your current message count: <span className="font-bold text-indigo-400">{messageCount} messages</span>. Send more messages to unlock premium themes!
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((theme) => {
                  const isUnlocked = messageCount >= theme.requiredMessages;
                  const isSelected = currentTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => handleSelectTheme(theme.id, theme.requiredMessages)}
                      className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition select-none ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                          : isUnlocked
                            ? "border-[#232428] bg-[#1e1f22] hover:border-[#4e5058] hover:bg-[#35373c]/50"
                            : "border-[#232428]/40 bg-[#1e1f22]/30 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{theme.name}</span>
                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded leading-none ${
                          isUnlocked
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {theme.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#949ba4] mt-0.5 truncate leading-relaxed">
                        {theme.description}
                      </p>
                    </button>
                  );
                })}
              </div>
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
                className="text-white hover:underline text-xs font-medium px-2 py-1"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="bg-[#23a55a] hover:bg-[#20874c] text-white text-xs font-bold px-4 py-1.5 rounded transition disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
