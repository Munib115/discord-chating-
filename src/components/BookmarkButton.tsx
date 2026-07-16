"use client";

import React, { useState, useTransition } from "react";
import { bookmarkPost, unbookmarkPost } from "@/app/actions";

interface BookmarkButtonProps {
  postId: number;
  initialIsBookmarked: boolean;
}

export default function BookmarkButton({ postId, initialIsBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialIsBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        if (bookmarked) {
          await unbookmarkPost(postId);
          setBookmarked(false);
        } else {
          await bookmarkPost(postId);
          setBookmarked(true);
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={bookmarked ? "Remove Bookmark" : "Bookmark Post"}
      className={`p-1.5 rounded transition ${
        bookmarked ? "text-indigo-400 hover:text-indigo-300" : "text-[#949ba4] hover:text-white"
      }`}
    >
      <svg className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}
