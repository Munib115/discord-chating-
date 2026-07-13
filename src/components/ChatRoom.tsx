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
  replyToId?: number | null;
}

interface ChatRoomProps {
  channelId: number;
  currentUser: User;
  allUsers: User[];
}

export default function ChatRoom({ channelId, currentUser, allUsers }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      setFetchError(null);
      const { data, error } = await supabase
        .from("Message")
        .select("*")
        .eq("channelId", channelId)
        .order("createdAt", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        setFetchError(`${error.message} (${error.code || "unknown"})${error.details ? " - " + error.details : ""}`);
      } else if (data) {
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

  // Handle focusing input on reply triggers
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Escape key handler to clear reply state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReplyingTo(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Timer logic for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !supabaseUrl || !supabaseAnonKey) return;

    const messageContent = inputText;
    const parentId = replyingTo?.id || null;
    setInputText("");
    setReplyingTo(null);

    const { error } = await supabase.from("Message").insert([
      {
        content: messageContent,
        authorId: currentUser.id,
        channelId: channelId,
        replyToId: parentId,
      },
    ]);

    if (error) console.error("Error sending message:", error);
  };

  // Image Upload handler (via ImgBB)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) {
        alert("Please set NEXT_PUBLIC_IMGBB_API_KEY to send images.");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: "POST",
          body: formData,
        });
        const resData = await res.json();
        if (resData.success) {
          // Send message formatted as img:URL
          await supabase.from("Message").insert([
            {
              content: `img:${resData.data.url}`,
              authorId: currentUser.id,
              channelId: channelId,
              replyToId: replyingTo?.id || null,
            },
          ]);
          setReplyingTo(null);
        } else {
          console.error("ImgBB upload failed:", resData.error.message);
        }
      } catch (err) {
        console.error("Error uploading image:", err);
      }
    }
  };

  // Audio Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;

          // Send to Supabase as text
          await supabase.from("Message").insert([
            {
              content: base64Audio,
              authorId: currentUser.id,
              channelId: channelId,
              replyToId: replyingTo?.id || null,
            },
          ]);
          setReplyingTo(null);
        };

        // Stop micro tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
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
        {fetchError && (
          <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs p-3.5 rounded-md flex flex-col gap-1.5 select-text">
            <span className="font-bold flex items-center gap-1.5 text-rose-400">
              ⚠️ Supabase Connection Warning:
            </span>
            <p className="font-mono text-[#b5bac1] leading-relaxed break-words bg-black/30 p-2 rounded">
              {fetchError}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 select-none">
              Ensure you have run the Message table setup SQL script in your Supabase dashboard editor.
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#949ba4] text-xs text-center select-none">
            <span className="text-3xl">💬</span>
            <p className="mt-2 font-medium">This is the start of the chat room.</p>
            <p className="text-3xs text-[#80848e] mt-0.5">Real-time messages sent here sync immediately via Supabase Websockets.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const author = getAuthorDetails(msg.authorId);
            const parentMsg = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null;
            const parentAuthor = parentMsg ? getAuthorDetails(parentMsg.authorId) : null;

            const isAudio = msg.content.startsWith("data:audio/");
            const isImage = msg.content.startsWith("img:");

            return (
              <div key={msg.id || Math.random()} className="flex flex-col relative group select-none">
                {/* 1. Reply Connector Line Above Message */}
                {parentMsg && parentAuthor && (
                  <div className="flex items-center gap-1.5 text-[#b5bac1] text-xs ml-[18px] mb-1 select-none">
                    <div className="w-6 h-2 border-l-2 border-t-2 border-[#4e5058] rounded-tl-md mr-1.5 -mb-2 mt-1" />
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] flex-shrink-0 ${getAvatarBg(parentAuthor.avatar)}`}>
                      {getAvatarEmoji(parentAuthor.avatar)}
                    </span>
                    <span className="font-semibold text-slate-300">@{parentAuthor.username}</span>
                    <span className="truncate max-w-[300px] text-slate-400 text-3xs font-medium bg-[#1e1f22]/40 px-1.5 py-0.5 rounded italic">
                      {parentMsg.content.startsWith("data:audio/") ? "🎙️ Voice Note" : parentMsg.content.startsWith("img:") ? "🖼️ Image Attachment" : parentMsg.content}
                    </span>
                  </div>
                )}

                {/* 2. Message Body */}
                <div className="flex items-start gap-3 hover:bg-[#2e3035]/30 -mx-4 px-4 py-1 rounded transition select-text">
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

                    {/* Rendering Audio, Image, or standard Text */}
                    {isAudio ? (
                      <div className="mt-1 select-none">
                        <audio src={msg.content} controls className="max-w-xs h-9 rounded bg-[#1e1f22] p-1 border border-[#232428] focus:outline-none" />
                      </div>
                    ) : isImage ? (
                      <div className="mt-1 max-w-sm rounded-md overflow-hidden bg-[#1e1f22] border border-[#232428] select-none flex">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.content.replace("img:", "")}
                          alt="Attachment"
                          className="max-h-60 w-auto object-contain cursor-pointer hover:scale-[1.01] transition duration-200"
                        />
                      </div>
                    ) : (
                      <p className="text-slate-300 text-sm mt-0.5 leading-relaxed break-words">{msg.content}</p>
                    )}
                  </div>

                  {/* 3. Discord-like Floating Action Bar on Hover */}
                  <div className="absolute right-4 top-1 hidden group-hover:flex bg-[#313338] border border-[#232428] rounded shadow-md z-10 px-1 py-0.5 select-none">
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition"
                      title="Reply"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#2e3035] border-t border-[#232428] text-xs text-[#949ba4] select-none animate-in slide-in-from-bottom-2 duration-100">
          <div className="flex items-center gap-1.5 truncate">
            <span>Replying to</span>
            <span className="font-semibold text-white">@{getAuthorDetails(replyingTo.authorId).username}</span>
            <span className="text-3xs text-slate-500 italic truncate max-w-[200px]">
              {replyingTo.content.startsWith("data:audio/") ? "🎙️ Voice Note" : replyingTo.content.startsWith("img:") ? "🖼️ Image" : replyingTo.content}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="hover:text-white transition text-xs flex items-center gap-1 font-medium bg-[#1e1f22]/50 px-2 py-0.5 rounded"
            title="Cancel reply"
          >
            <span>Cancel</span>
            <span className="text-3xs">(Esc)</span>
          </button>
        </div>
      )}

      {/* Input Box & Toolbar */}
      <div className="p-4 bg-[#2b2d31] border-t border-[#232428] flex flex-col gap-2 select-none">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* 1. Image upload button */}
          <div className="relative">
            <input
              id="chat-image-file"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <label
              htmlFor="chat-image-file"
              className="w-10 h-10 rounded-md bg-[#383a40] hover:bg-[#35373c] border border-[#1e1f22] text-[#949ba4] hover:text-white flex items-center justify-center cursor-pointer transition"
              title="Send Image File"
            >
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>
          </div>

          {/* 2. Chat Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isRecording}
            placeholder={
              isRecording
                ? `Recording voice note...`
                : replyingTo
                ? `Reply to @${getAuthorDetails(replyingTo.authorId).username}...`
                : `Message as ${currentUser.username} (Press Enter)`
            }
            className="flex-1 bg-[#383a40] text-white border border-[#1e1f22] rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
          />

          {/* 3. Audio Recording Mic button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-10 h-10 rounded-md border flex items-center justify-center transition ${
              isRecording
                ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                : "bg-[#383a40] border-[#1e1f22] text-[#949ba4] hover:text-white hover:bg-[#35373c]"
            }`}
            title={isRecording ? "Stop Recording (Send)" : "Record Voice Note"}
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </form>

        {/* Recording active timer banner */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold px-2 animate-pulse select-none">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Recording Voice Message: {formatTime(recordingSeconds)}</span>
            <span className="text-3xs text-[#949ba4] font-medium ml-auto">Click microphone button again to Stop & Send</span>
          </div>
        )}
      </div>
    </div>
  );
}
