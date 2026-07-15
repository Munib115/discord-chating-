"use client";

import React, { useState, useTransition } from "react";
import { createComment } from "@/app/actions";
import Avatar from "./Avatar";

interface User {
  id: number;
  username: string;
  avatar: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: Date;
  authorId: number;
  parentId: number | null;
  author: User;
}

interface CommentSectionProps {
  postId: number;
  comments: Comment[];
  currentUserId?: number;
}

export default function CommentSection({
  postId,
  comments,
  currentUserId,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreateComment = (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !currentUserId) return;

    startTransition(async () => {
      try {
        await createComment({
          content: content.trim(),
          postId,
          parentId,
        });
        if (parentId) {
          setReplyingToId(null);
          setReplyContent("");
        } else {
          setNewComment("");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Group comments by parentId
  const commentMap = React.useMemo(() => {
    const map = new Map<number | null, Comment[]>();
    comments.forEach((c) => {
      const list = map.get(c.parentId) || [];
      list.push(c);
      map.set(c.parentId, list);
    });
    return map;
  }, [comments]);

  const rootComments = commentMap.get(null) || [];

  // Recursive Comment Node Component
  const renderComment = (comment: Comment, depth = 0) => {
    const childComments = commentMap.get(comment.id) || [];
    const isReplying = replyingToId === comment.id;

    return (
      <div key={comment.id} className="flex flex-col gap-2 mt-3 select-text">
        {/* Comment Core */}
        <div className="flex gap-2.5">
          {/* Avatar */}
          <Avatar avatar={comment.author.avatar} className="w-7 h-7 text-[10px] mt-0.5" />

          <div className="flex flex-col flex-1 min-w-0 bg-[#1e1f22]/30 rounded p-2.5 border border-[#232428]/40">
            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-[#949ba4] mb-1.5 flex-wrap">
              <span className="font-semibold text-slate-200">{comment.author.username}</span>
              <span>•</span>
              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Content */}
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {comment.content}
            </p>

            {/* Actions */}
            {currentUserId && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setReplyingToId(isReplying ? null : comment.id);
                    setReplyContent("");
                  }}
                  className="text-xs text-[#949ba4] hover:text-white hover:underline transition font-semibold"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reply Editor Box */}
        {isReplying && currentUserId && (
          <form
            onSubmit={(e) => handleCreateComment(e, comment.id)}
            className="flex flex-col gap-2 ml-9 mt-1.5 bg-[#2b2d31] p-3 rounded border border-[#232428]"
          >
            <textarea
              required
              rows={2}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a supportive or witty reply..."
              className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setReplyingToId(null)}
                className="text-white hover:underline px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3.5 py-1.5 font-medium transition disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </form>
        )}

        {/* Nested Children (Indented) */}
        {childComments.length > 0 && (
          <div className="pl-6 border-l border-[#35363c] flex flex-col gap-1.5 ml-3.5">
            {childComments.map((child) => renderComment(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[15px] font-bold text-white uppercase tracking-wider">
        Discussion Thread ({comments.length})
      </h3>

      {/* Main Comment Box */}
      {currentUserId ? (
        <form onSubmit={(e) => handleCreateComment(e)} className="flex flex-col gap-2">
          <textarea
            required
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this post..."
            className="w-full bg-[#1e1f22] border border-[#111214] rounded p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !newComment.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-5 py-2 text-sm font-medium transition disabled:opacity-50"
            >
              {isPending ? "Posting..." : "Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-[#1e1f22]/50 p-4 rounded text-center text-sm text-[#949ba4]">
          You must be logged in to participate in the discussions. Use the selector in the bottom left to pick a character profile.
        </div>
      )}

      {/* Comments List */}
      <div className="flex flex-col gap-2 mt-2">
        {rootComments.length > 0 ? (
          rootComments.map((c) => renderComment(c))
        ) : (
          <div className="text-center text-xs text-[#949ba4] py-6 select-none font-medium">
            No comments yet. Start the conversation!
          </div>
        )}
      </div>
    </div>
  );
}
