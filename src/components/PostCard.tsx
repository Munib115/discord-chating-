"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { votePost } from "@/app/actions";
import Avatar from "./Avatar";
import MarkdownRenderer from "./MarkdownRenderer";
import BookmarkButton from "./BookmarkButton";
import SharePostButton from "./SharePostButton";
import ReportPostButton from "./ReportPostButton";
import Lightbox from "./Lightbox";
import FlairBadge from "./FlairBadge";

interface User {
  id: number;
  username: string;
  avatar: string;
  flair?: string | null;
}

interface Den {
  name: string;
  slug: string;
}

interface Channel {
  name: string;
  slug: string;
}

interface Vote {
  userId: number;
  value: number;
}

interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  tags: string;
  createdAt: Date;
  author: User;
  den: Den;
  channel: Channel;
  votes: Vote[];
  saves?: { userId: number }[];
  _count?: { comments: number };
}

interface PostCardProps {
  post: Post;
  currentUserId?: number;
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [, startTransition] = useTransition();
  const [showLightbox, setShowLightbox] = useState(false);

  // Compute votes score
  const score = post.votes.reduce((acc, vote) => acc + vote.value, 0);

  // Determine user's vote
  const userVote = currentUserId
    ? post.votes.find((v) => v.userId === currentUserId)?.value || 0
    : 0;

  // Determine if bookmarked
  const initialIsBookmarked = currentUserId && post.saves
    ? post.saves.some((s) => s.userId === currentUserId)
    : false;

  const handleVote = (value: number) => {
    if (!currentUserId) return;
    startTransition(async () => {
      await votePost(post.id, value);
    });
  };

  const tagList = post.tags ? post.tags.split(",").map((t) => t.trim()) : [];

  return (
    <article className="flex bg-[#2b2d31] rounded-md overflow-hidden border border-[#232428] hover:border-[#35373c] transition duration-200 shadow-sm relative">
      {/* Vote Panel (Reddit Style on the Left) */}
      <div className="w-11 bg-[#1e1f22]/40 flex flex-col items-center py-2.5 px-1 select-none flex-shrink-0">
        <button
          onClick={() => handleVote(1)}
          className={`p-1.5 rounded transition ${
            userVote === 1
              ? "text-indigo-500 bg-indigo-500/10"
              : "text-[#80848e] hover:text-indigo-400 hover:bg-[#35373c]"
          }`}
          title="Upvote"
        >
          <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 14h6v8h4v-8h6L12 4 4 14z" />
          </svg>
        </button>

        <span
          className={`text-xs font-bold my-1 text-center min-w-[24px] ${
            userVote === 1
              ? "text-indigo-400"
              : userVote === -1
              ? "text-rose-400"
              : "text-slate-300"
          }`}
        >
          {score}
        </span>

        <button
          onClick={() => handleVote(-1)}
          className={`p-1.5 rounded transition ${
            userVote === -1
              ? "text-rose-500 bg-rose-500/10"
              : "text-[#80848e] hover:text-rose-400 hover:bg-[#35373c]"
          }`}
          title="Downvote"
        >
          <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 10h-6V2h-4v8H4l8 10 8-10z" />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3.5 flex flex-col gap-2 min-w-0">
        {/* Post Metadata Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-[#949ba4]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Avatar avatar={post.author.avatar} className="w-5.5 h-5.5 text-[10px]" />
            <span className="font-semibold text-slate-200">{post.author.username}</span>
            <FlairBadge flair={post.author.flair || null} />
            <span>•</span>
            <span>posted in</span>
            <Link
              href={`/d/${post.den.slug}/${post.channel.slug}`}
              className="text-indigo-400 hover:underline font-medium"
            >
              d/{post.den.slug} #{post.channel.name}
            </Link>
            <span>•</span>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Bookmark */}
          {currentUserId && (
            <BookmarkButton postId={post.id} initialIsBookmarked={initialIsBookmarked} />
          )}
        </div>

        {/* Post Title */}
        <h2 className="text-[17px] font-bold text-white leading-snug hover:text-indigo-400 transition break-words">
          <Link href={`/posts/${post.id}`}>{post.title}</Link>
        </h2>

        {/* Post Content Preview */}
        <div className="line-clamp-3">
          <MarkdownRenderer content={post.content} />
        </div>

        {/* Image Attachment */}
        {post.imageUrl && (
          <div className="mt-1 max-h-96 rounded-md overflow-hidden bg-[#1e1f22] border border-[#232428] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={post.title}
              onClick={() => setShowLightbox(true)}
              className="max-h-96 w-auto object-contain hover:scale-[1.01] transition duration-300 cursor-zoom-in"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Tags and Comments footer */}
        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap pt-2 border-t border-[#313338]">
          <div className="flex gap-1.5 flex-wrap">
            {tagList.map((tag) => (
              <span
                key={tag}
                className="bg-[#1e1f22] border border-[#232428] text-[#949ba4] text-[11px] font-medium px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {currentUserId && <ReportPostButton postId={post.id} />}
            <SharePostButton postId={post.id} />
            <Link href={`/posts/${post.id}`}>
              <div className="flex items-center gap-1.5 text-xs text-[#949ba4] hover:text-white transition px-2 py-1 bg-[#1e1f22]/50 hover:bg-[#35373c] rounded-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>Comments</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox modal */}
      {showLightbox && post.imageUrl && (
        <Lightbox src={post.imageUrl} alt={post.title} onClose={() => setShowLightbox(false)} />
      )}
    </article>
  );
}
