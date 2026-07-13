"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { createDen } from "@/app/actions";

interface Den {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface DenSidebarProps {
  dens: Den[];
}

export default function DenSidebar({ dens }: DenSidebarProps) {
  const params = useParams();
  const router = useRouter();
  const currentDenSlug = params.denSlug as string;

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⚔️");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const newDen = await createDen({ name, description, icon });
      setIsOpen(false);
      setName("");
      setDescription("");
      router.push(`/d/${newDen.slug}/general`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 flex-shrink-0 h-screen select-none border-r border-[#111214]">
      {/* Home / Logo */}
      <Link href="/" aria-label="OtakuDen Home">
        <div className="group relative flex items-center justify-center">
          <div className="absolute left-0 w-1 bg-white rounded-r-md transition-all duration-200 h-5 origin-left scale-0 group-hover:scale-100" />
          <div className="w-12 h-12 rounded-[24px] bg-[#313338] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-white hover:bg-indigo-600">
            <Logo size={28} className="text-white" />
          </div>
          {/* Tooltip */}
          <span className="absolute left-[80px] bg-[#111214] text-white text-xs font-semibold px-3 py-1.5 rounded shadow-lg whitespace-nowrap scale-0 group-hover:scale-100 transition-all duration-100 z-50 origin-left">
            Home / Global Feed
          </span>
        </div>
      </Link>

      <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

      {/* Dens List */}
      <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar">
        {dens.map((den) => {
          const isActive = currentDenSlug === den.slug;
          return (
            <Link key={den.id} href={`/d/${den.slug}/general`} aria-label={den.name}>
              <div className="group relative flex items-center justify-center">
                {/* Discord-like indicator pill */}
                <div
                  className={`absolute left-0 w-1 bg-white rounded-r-md transition-all duration-200 origin-left ${
                    isActive ? "h-10 scale-100" : "h-5 scale-0 group-hover:scale-100"
                  }`}
                />
                <div
                  className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-xl font-bold ${
                    isActive
                      ? "bg-indigo-600 text-white rounded-[16px]"
                      : "bg-[#313338] text-slate-200 hover:bg-indigo-600 hover:text-white"
                  }`}
                >
                  {den.icon || den.name.substring(0, 2).toUpperCase()}
                </div>
                {/* Tooltip */}
                <span className="absolute left-[80px] bg-[#111214] text-white text-xs font-semibold px-3 py-1.5 rounded shadow-lg whitespace-nowrap scale-0 group-hover:scale-100 transition-all duration-100 z-50 origin-left">
                  {den.name}
                </span>
              </div>
            </Link>
          );
        })}

        {/* Create Den Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center"
          aria-label="Create a Den"
        >
          <div className="absolute left-0 w-1 bg-emerald-500 rounded-r-md transition-all duration-200 h-5 origin-left scale-0 group-hover:scale-100" />
          <div className="w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-emerald-500 bg-[#313338] hover:bg-emerald-600 hover:text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          {/* Tooltip */}
          <span className="absolute left-[80px] bg-[#111214] text-white text-xs font-semibold px-3 py-1.5 rounded shadow-lg whitespace-nowrap scale-0 group-hover:scale-100 transition-all duration-100 z-50 origin-left">
            Create a Den
          </span>
        </button>
      </div>

      {/* Create Den Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-md max-w-md w-full overflow-hidden shadow-2xl border border-[#232428] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Customize your Den</h3>
              <p className="text-[#b5bac1] text-sm mb-6">
                Give your new anime space a personality with a name, description, and an emoji icon.
              </p>

              <form onSubmit={handleSubmit} className="text-left flex flex-col gap-4">
                <div>
                  <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Den Icon (Emoji)</label>
                  <div className="flex flex-wrap gap-2">
                    {["⚔️", "🌸", "🔮", "🎮", "🍿", "🔥", "⚡", "🦊", "🍜"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-10 h-10 rounded-md border text-lg flex items-center justify-center transition-all ${
                          icon === emoji
                            ? "bg-indigo-600 border-indigo-500 scale-110"
                            : "bg-[#2b2d31] border-[#1e1f22] hover:bg-[#35373c] text-white"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="den-name" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Den Name</label>
                  <input
                    id="den-name"
                    type="text"
                    required
                    maxLength={30}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Attack on Titan Hub"
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="den-desc" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Description</label>
                  <textarea
                    id="den-desc"
                    required
                    maxLength={150}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this community about?"
                    rows={3}
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4 bg-[#2b2d31] -mx-6 -mb-6 p-4 border-t border-[#232428]">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
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
        </div>
      )}
    </div>
  );
}
