"use client";

import React, { useState } from "react";
import { createPost } from "@/app/actions";

interface Channel {
  id: number;
  name: string;
}

interface CreatePostModalProps {
  denId: number;
  channels: Channel[];
  activeChannelId?: number;
  username: string;
  avatar: string;
}

export default function CreatePostModal({
  denId,
  channels,
  activeChannelId,
  username,
  avatar,
}: CreatePostModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState(
    activeChannelId || (channels.length > 0 ? channels[0].id : 0)
  );
  const [tags, setTags] = useState("Discussion");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !selectedChannelId) return;
    setLoading(true);

    try {
      await createPost({
        title,
        content,
        imageUrl: imageUrl.trim() || undefined,
        tags,
        denId,
        channelId: Number(selectedChannelId),
      });
      setIsOpen(false);
      setTitle("");
      setContent("");
      setImageUrl("");
      setTags("Discussion");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Reddit-like fake input bar to create post */}
      <div className="bg-[#2b2d31] p-3 rounded-md border border-[#232428] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-lg font-bold flex-shrink-0">
          {avatar === "luffy" ? "🍖" : avatar === "zoro" ? "⚔️" : avatar === "goku" ? "⚡" : avatar === "sailor" ? "🌙" : avatar === "deku" ? "💥" : "👤"}
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 bg-[#1e1f22] hover:bg-[#35373c]/50 text-left px-4 py-2 rounded text-sm text-[#949ba4] transition border border-[#111214] font-medium animate-pulse hover:animate-none"
        >
          Share your latest anime obsession, {username}...
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition"
          title="Attach Image"
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-md max-w-xl w-full overflow-hidden shadow-2xl border border-[#232428] animate-in fade-in zoom-in-95 duration-150 text-white">
            <div className="px-6 py-4 border-b border-[#232428] flex justify-between items-center">
              <h3 className="text-lg font-bold">Create a Post</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#949ba4] hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Channel Selector */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="post-channel" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Post to Channel</label>
                  <select
                    id="post-channel"
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(Number(e.target.value))}
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    {channels.map((chan) => (
                      <option key={chan.id} value={chan.id}>
                        #{chan.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label htmlFor="post-tags" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Category Tag</label>
                  <select
                    id="post-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="Discussion">Discussion</option>
                    <option value="Review,Discussion">Review</option>
                    <option value="Meme,Funny">Meme</option>
                    <option value="Fan Art,Creative">Fan Art</option>
                    <option value="Spoilers,Theory">Theory / Spoilers</option>
                    <option value="Help,Question">Help / Question</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="post-title" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Post Title</label>
                <input
                  id="post-title"
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title your post"
                  className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="post-content" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Post Content</label>
                <textarea
                  id="post-content"
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post details here... Supports spacing and lines."
                  className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Image URL */}
              <div>
                <label htmlFor="post-image" className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Image URL (Optional)</label>
                <input
                  id="post-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/anime-image.png"
                  className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Buttons */}
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
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
