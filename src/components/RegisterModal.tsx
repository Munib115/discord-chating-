"use client";

import React, { useState, useEffect } from "react";
import { registerNewUser } from "@/app/actions";
import Avatar from "./Avatar";

const AVATARS = [
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

export default function RegisterModal() {
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("luffy");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // step 1 = username, step 2 = avatar
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
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, []);

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    const avatarValue = customAvatarUrl.trim() ? customAvatarUrl.trim() : selectedAvatar;

    try {
      await registerNewUser({
        username: username.trim(),
        avatar: avatarValue,
      });
      // Page will reload via revalidatePath
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === 1 && username.trim().length >= 2) {
      setStep(2);
    } else if (e.key === "Enter" && step === 2) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Animated background */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(88,101,242,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(236,72,153,0.1) 0%, transparent 50%), #111214",
        }}
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <span
          key={i}
          className={`absolute rounded-full transition-opacity duration-1000 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: 2 + (i % 4) * 1.5,
            height: 2 + (i % 4) * 1.5,
            left: `${8 + i * 7.5}%`,
            top: `${15 + (i * 17) % 70}%`,
            background: i % 2 === 0 ? "rgba(88,101,242,0.4)" : "rgba(236,72,153,0.3)",
            animation: `registerParticle ${3 + i * 0.5}s ease-in-out infinite ${i * 0.2}s`,
          }}
        />
      ))}

      {/* Main card */}
      <div
        className={`
          relative w-full max-w-lg mx-4 bg-[#2b2d31] rounded-xl shadow-2xl border border-[#35373c]/50
          overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-8"}
        `}
        onKeyDown={handleKeyDown}
      >
        {/* Top banner with gradient */}
        <div className="relative h-20 overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"
            style={{
              animation: isVisible ? "registerBannerShift 8s ease-in-out infinite" : "none",
              backgroundSize: "200% 200%",
            }}
          />
          {/* Shimmer */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
              backgroundSize: "250% 100%",
              animation: "registerShimmer 3s ease-in-out infinite",
            }}
          />
          {/* Logo area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl" style={{ animation: "registerBounce 2s ease-in-out infinite" }}>
              🏮
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-5">
          {/* Title */}
          <div
            className={`text-center transition-all duration-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <h1 className="text-xl font-bold text-white">Welcome to OtakuDen</h1>
            <p className="text-xs text-[#949ba4] mt-1">
              {step === 1
                ? "Choose a username to get started"
                : "Pick your avatar or paste a custom link"}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 mb-4">
            <span
              className={`w-8 h-1 rounded-full transition-all duration-300 ${
                step === 1 ? "bg-indigo-500" : "bg-indigo-500/30"
              }`}
            />
            <span
              className={`w-8 h-1 rounded-full transition-all duration-300 ${
                step === 2 ? "bg-indigo-500" : "bg-indigo-500/30"
              }`}
            />
          </div>

          {/* Step 1: Username */}
          {step === 1 && (
            <div
              className={`transition-all duration-400 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "250ms" }}
            >
              <label className="text-[10px] uppercase font-bold text-[#b5bac1] tracking-wider block mb-2">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter your name..."
                maxLength={25}
                autoFocus
                className="w-full bg-[#1e1f22] border border-[#111214] rounded-lg px-4 py-3 text-white text-sm
                  focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition
                  placeholder:text-[#4e5058]"
              />
              <p className="text-[10px] text-[#949ba4] mt-2 leading-relaxed">
                This is how others will see you in chat rooms and discussions. You can change it later in settings.
              </p>

              {error && (
                <div className="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-2.5 rounded-lg font-medium animate-in fade-in slide-in-from-top-2 duration-200">
                  {error}
                </div>
              )}

              <button
                onClick={() => {
                  if (!username.trim()) {
                    setError("Please enter a username");
                    return;
                  }
                  if (username.trim().length < 2) {
                    setError("Username must be at least 2 characters");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg
                  transition-all duration-200 text-sm hover:shadow-lg hover:shadow-indigo-500/20
                  active:scale-[0.98]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Avatar picker */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-4">
              {/* Preview & Name preview */}
              <div className="flex items-center gap-4 bg-[#1e1f22] p-3 rounded-lg border border-[#111214]">
                <Avatar avatar={customAvatarUrl.trim() ? customAvatarUrl.trim() : selectedAvatar} className="w-16 h-16 border-2 border-indigo-500/30" />
                <div className="text-left">
                  <div className="text-base font-bold text-white leading-tight">{username}</div>
                  <div className="text-[11px] text-[#949ba4] mt-0.5">#{String(Math.floor(1000 + Math.random() * 9000)).slice(0, 4)}</div>
                  <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mt-1 select-none">
                    Preview Card
                  </div>
                </div>
              </div>

              {/* Selection Tabs / Scrollable Avatar grid */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-[#b5bac1] tracking-wider block">
                  Select Anime Character
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                  {AVATARS.map((av) => {
                    const isSelected = selectedAvatar === av.id && !customAvatarUrl;
                    return (
                      <button
                        key={av.id}
                        onClick={() => {
                          setSelectedAvatar(av.id);
                          setCustomAvatarUrl(""); // clear custom input to prioritize preset click
                        }}
                        className={`
                          flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150
                          ${isSelected
                            ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                            : "border-[#35373c] bg-[#1e1f22] hover:border-[#4e5058] hover:bg-[#35373c]/50"
                          }
                        `}
                      >
                        <Avatar avatar={av.id} className="w-9 h-9 border-none bg-transparent" />
                        <span className={`text-[10px] font-semibold truncate w-full ${isSelected ? "text-indigo-400" : "text-[#949ba4]"}`}>
                          {av.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="register-custom-url" className="text-[10px] uppercase font-bold text-[#b5bac1] tracking-wider block">
                  Or Paste Custom Image URL
                </label>
                <input
                  id="register-custom-url"
                  type="text"
                  value={customAvatarUrl.startsWith("data:image/") ? "" : customAvatarUrl}
                  onChange={(e) => {
                    setCustomAvatarUrl(e.target.value);
                    setFileName("");
                    setError("");
                  }}
                  placeholder="https://example.com/my-pic.png"
                  className="w-full bg-[#1e1f22] border border-[#111214] rounded-lg px-3 py-2 text-white text-xs
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition
                    placeholder:text-[#4e5058]"
                />
              </div>

              {/* Upload custom file input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] uppercase font-bold text-[#b5bac1] tracking-wider block">
                  Or Upload Custom Photo
                </label>
                <div className="relative flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="register-file-upload"
                  />
                  <label
                    htmlFor="register-file-upload"
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

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-2.5 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  onClick={() => setStep(1)}
                  className="flex-shrink-0 px-4 py-2.5 text-xs font-medium text-[#dbdee1] hover:text-white
                    bg-[#1e1f22] hover:bg-[#35373c] border border-[#35373c] rounded-lg transition-all duration-200"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg
                    transition-all duration-200 text-xs hover:shadow-lg hover:shadow-indigo-500/20
                    active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Join OtakuDen 🏮"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
