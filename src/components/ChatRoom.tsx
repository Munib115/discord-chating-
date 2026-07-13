"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";

// Initialize Supabase Client dynamically from process env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: number;
  username: string;
  avatar: string;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  channelId: number;
}

interface ChatRoomProps {
  channelId: number;
  currentUser: User;
  allUsers: User[];
}

export default function ChatRoom({ channelId, currentUser, allUsers }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to resolve user profiles locally
  const getAuthorDetails = (authorId: number) => {
    return allUsers.find((u) => u.id === authorId) || {
      id: authorId,
      username: "Unregistered Otaku",
      avatar: "default",
    };
  };

  // Fetch initial messages and set up real-time subscription
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("Message")
        .select("*")
        .eq("channelId", channelId)
        .order("createdAt", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to INSERT events on the Message table matching the channel
    const channel = supabase
      .channel(`chat-room-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `channelId=eq.${channelId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !supabaseUrl || !supabaseAnonKey) return;

    const messageContent = inputText;
    setInputText("");

    const { error } = await supabase.from("Message").insert([
      {
        content: messageContent,
        authorId: currentUser.id,
        channelId: channelId,
      },
    ]);

    if (error) console.error("Error sending message:", error);
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#2b2d31] rounded-md border border-amber-500/20 text-center select-none">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-base font-bold text-white mt-2">Supabase Credentials Missing</h3>
        <p className="text-xs text-[#949ba4] max-w-sm mt-1 leading-relaxed">
          Please add <code className="text-[#dbdee1] bg-[#1e1f22] px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-[#dbdee1] bg-[#1e1f22] px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your <code className="text-[#dbdee1] bg-[#1e1f22] px-1 py-0.5 rounded">.env</code> file to enable real-time chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] bg-[#313338] rounded-md overflow-hidden border border-[#232428]">
      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#949ba4] text-xs text-center select-none">
            <span className="text-3xl">💬</span>
            <p className="mt-2 font-medium">This is the start of the chat room.</p>
            <p className="text-3xs text-[#80848e] mt-0.5">Real-time messages sent here sync immediately via Supabase Websockets.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const author = getAuthorDetails(msg.authorId);
            return (
              <div key={msg.id || Math.random()} className="flex items-start gap-3 hover:bg-[#2e3035]/30 -mx-4 px-4 py-1 rounded transition select-text">
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${getAvatarBg(author.avatar)}`}>
                  {getAvatarEmoji(author.avatar)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white text-sm truncate">{author.username}</span>
                    <span className="text-[10px] text-[#949ba4] select-none">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-0.5 leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#2b2d31] border-t border-[#232428]">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message as ${currentUser.username} (Press Enter to Send)`}
          className="w-full bg-[#383a40] text-white border border-[#1e1f22] rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
        />
      </form>
    </div>
  );
}
