"use client";

import React, { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/actions";

interface FollowButtonProps {
  targetUserId: number;
  initialIsFollowing: boolean;
  targetUsername: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
  targetUsername,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        if (following) {
          await unfollowUser(targetUserId);
          setFollowing(false);
        } else {
          await followUser(targetUserId);
          setFollowing(true);
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
      className={`text-xs font-bold px-3 py-1 rounded transition select-none ${
        following
          ? "bg-[#2b2d31] text-[#949ba4] border border-[#232428] hover:bg-[#35373c] hover:text-white"
          : "bg-indigo-600 hover:bg-indigo-700 text-white"
      } disabled:opacity-50`}
    >
      {following ? "Following" : `Follow @${targetUsername}`}
    </button>
  );
}
