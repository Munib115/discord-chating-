"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createChannel } from "@/app/actions";
import Avatar from "./Avatar";
import SettingsModal from "./SettingsModal";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: number;
  username: string;
  avatar: string;
  bio: string | null;
  createdAt?: string | Date;
}

interface Channel {
  id: number;
  name: string;
  slug: string;
  type?: string; // "TEXT" or "VOICE"
  password?: string | null;
}

interface Den {
  id: number;
  name: string;
  slug: string;
  description: string;
  banner?: string | null;
  icon?: string | null;
  createdAt?: string | Date;
  ownerId?: number | null;
}

interface ChannelSidebarProps {
  currentDen?: Den;
  channels: Channel[];
  currentUser?: User | null;
  allUsers: User[];
}

export default function ChannelSidebar({
  currentDen,
  channels,
  currentUser,
  allUsers,
}: ChannelSidebarProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDenSlug = params.denSlug as string;
  const currentChannelSlug = params.channelSlug as string;
  const currentTab = searchParams ? searchParams.get("tab") || "all-discussions" : "all-discussions";
  const recipientId = searchParams ? searchParams.get("recipientId") : null;

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("TEXT");
  const [isPrivate, setIsPrivate] = useState(false);
  const [channelPassword, setChannelPassword] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice Chat States
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [speakers, setSpeakers] = useState<Record<number, boolean>>({});

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !currentDen) return;
    setLoading(true);
    try {
      const newChannel = await createChannel({
        name: channelName,
        denId: currentDen.id,
        type: channelType,
        password: isPrivate ? channelPassword : "",
      });
      setIsAddChannelOpen(false);
      setChannelName("");
      setChannelPassword("");
      setIsPrivate(false);
      router.push(`/d/${currentDen.slug}/${newChannel.slug}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  // WebRTC & Supabase voice signaling refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<number, RTCPeerConnection>>({});
  const presenceChannelRef = useRef<any>(null);
  const signalingChannelRef = useRef<any>(null);

  // Helper to disconnect voice
  const disconnectVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      const pc = peerConnectionsRef.current[Number(peerId)];
      if (pc) pc.close();
      const audio = document.getElementById(`audio-peer-${peerId}`);
      if (audio) audio.remove();
    });
    peerConnectionsRef.current = {};

    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectVoice();
    };
  }, []);

  // Synchronize local mute state to mic tracks
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    if (presenceChannelRef.current && currentUser) {
      presenceChannelRef.current.track({
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        isMuted,
        isDeafened,
      });
    }
  }, [isMuted, currentUser]);

  // Synchronize local deafen state to remote audios
  useEffect(() => {
    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      const audio = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
      if (audio) {
        audio.muted = isDeafened;
      }
    });
    if (presenceChannelRef.current && currentUser) {
      presenceChannelRef.current.track({
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        isMuted,
        isDeafened,
      });
    }
  }, [isDeafened, currentUser]);

  // Local microphone volume analysis for real speaking indicators
  useEffect(() => {
    if (!activeVoiceChannel || isMuted || !localStreamRef.current || !currentUser) {
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let javascriptNode: ScriptProcessorNode | null = null;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(localStreamRef.current);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      let wasSpeaking = false;

      javascriptNode.onaudioprocess = () => {
        if (!analyser) return;
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;

        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }

        const average = values / length;
        const isSpeaking = average > 12; // voice volume threshold

        if (isSpeaking !== wasSpeaking && signalingChannelRef.current) {
          wasSpeaking = isSpeaking;
          signalingChannelRef.current.send({
            type: "broadcast",
            event: "speaking",
            payload: {
              userId: currentUser.id,
              speaking: isSpeaking,
            },
          });
          setSpeakers((prev) => ({ ...prev, [currentUser.id]: isSpeaking }));
        }
      };
    } catch (e) {
      console.error("Audio analyser creation failed:", e);
    }

    return () => {
      if (javascriptNode) javascriptNode.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [activeVoiceChannel, isMuted, currentUser]);

  const handleVoiceChannelClick = async (channelName: string) => {
    if (activeVoiceChannel === channelName) return; // already in it
    if (!currentUser || !currentDen) return;

    disconnectVoice();

    // Play connect audio tone
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(600, ctx.currentTime);
      osc2.frequency.setValueAtTime(900, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    setActiveVoiceChannel(channelName);

    try {
      // 1. Get user mic media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });

      const voiceRoomId = `${currentDen.id}-${channelName.toLowerCase().replace(/\s+/g, "-")}`;
      const sigName = `voice-sig-${voiceRoomId}`;
      const presName = `voice-pres-${voiceRoomId}`;

      // Clean up duplicate cached channels from Supabase internal dictionary
      const existingSig = supabase.getChannels().find(
        (c) => c.topic === `realtime:${sigName}` || c.topic === sigName
      );
      if (existingSig) {
        supabase.removeChannel(existingSig);
      }
      const existingPres = supabase.getChannels().find(
        (c) => c.topic === `realtime:${presName}` || c.topic === presName
      );
      if (existingPres) {
        supabase.removeChannel(existingPres);
      }
      if ((supabase as any).realtime) {
        (supabase as any).realtime.channels = (supabase as any).realtime.channels.filter(
          (c: any) => c.topic !== `realtime:${sigName}` && c.topic !== sigName &&
                      c.topic !== `realtime:${presName}` && c.topic !== presName
        );
      }

      // 2. Helper to create peer connections — DEFINED FIRST so signal handler can reference it
      const createPeerConnection = (peerId: number) => {
        // Don't create duplicate connections
        if (peerConnectionsRef.current[peerId]) {
          return peerConnectionsRef.current[peerId];
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ],
        });

        peerConnectionsRef.current[peerId] = pc;

        // Add local audio tracks to the connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Broadcast ICE candidates to the remote peer
        pc.onicecandidate = (event) => {
          if (event.candidate && signalingChannelRef.current) {
            signalingChannelRef.current.send({
              type: "broadcast",
              event: "signal",
              payload: {
                from: currentUser.id,
                to: peerId,
                signal: {
                  type: "candidate",
                  candidate: event.candidate,
                },
              },
            });
          }
        };

        // When remote peer sends audio, render it
        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          if (!remoteStream) return;

          let audio = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
          if (!audio) {
            audio = document.createElement("audio");
            audio.id = `audio-peer-${peerId}`;
            audio.autoplay = true;
            audio.setAttribute("playsinline", "true");
            document.body.appendChild(audio);
          }
          audio.srcObject = remoteStream;
          audio.muted = isDeafened;
          // Explicitly play to handle Chrome autoplay policy
          audio.play().catch((err) => {
            console.warn("Audio autoplay blocked, will retry on user interaction:", err);
          });
        };

        // Log connection state for debugging
        pc.oniceconnectionstatechange = () => {
          console.log(`[Voice] ICE state with peer ${peerId}: ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === "failed") {
            console.warn(`[Voice] ICE failed for peer ${peerId}, restarting ICE...`);
            pc.restartIce();
          }
        };

        return pc;
      };

      // 3. Setup signaling Broadcast channel on Supabase
      const signalingChannel = supabase.channel(sigName);
      signalingChannelRef.current = signalingChannel;

      signalingChannel.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
        const { from, to, signal } = payload;
        if (to !== currentUser.id) return;

        if (signal.type === "offer") {
          // Always create a fresh connection for incoming offers
          // (close existing one if present to handle re-offers)
          if (peerConnectionsRef.current[from]) {
            peerConnectionsRef.current[from].close();
            delete peerConnectionsRef.current[from];
          }
          const pc = createPeerConnection(from);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          signalingChannel.send({
            type: "broadcast",
            event: "signal",
            payload: {
              from: currentUser.id,
              to: from,
              signal: {
                type: "answer",
                sdp: answer,
              },
            },
          });
        } else if (signal.type === "answer") {
          const pc = peerConnectionsRef.current[from];
          if (pc && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (signal.type === "candidate") {
          const pc = peerConnectionsRef.current[from];
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      });

      // Handle speaking updates from other peers
      signalingChannel.on("broadcast", { event: "speaking" }, ({ payload }: any) => {
        setSpeakers((prev) => ({ ...prev, [payload.userId]: payload.speaking }));
      });

      await signalingChannel.subscribe();

      // 4. Join Presence voice room
      const presenceChannel = supabase.channel(presName, {
        config: { presence: { key: currentUser.id.toString() } },
      });
      presenceChannelRef.current = presenceChannel;

      presenceChannel.on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users: User[] = [];
        const activePeers: any[] = [];

        Object.values(state).forEach((presenceList: any) => {
          presenceList.forEach((presence: any) => {
            if (presence.id !== currentUser.id) {
              users.push({
                id: presence.id,
                username: presence.username,
                avatar: presence.avatar,
                bio: presence.bio || "",
              });
              activePeers.push(presence);
            }
          });
        });

        setConnectedUsers(users);

        // Only the user with the lower ID initiates the WebRTC offer
        // The other user waits to receive the offer via the signal handler
        activePeers.forEach((peer) => {
          if (!peerConnectionsRef.current[peer.id] && currentUser.id < peer.id) {
            const pc = createPeerConnection(peer.id);
            pc.createOffer().then(async (offer) => {
              await pc.setLocalDescription(offer);
              if (signalingChannelRef.current) {
                signalingChannelRef.current.send({
                  type: "broadcast",
                  event: "signal",
                  payload: {
                    from: currentUser.id,
                    to: peer.id,
                    signal: {
                      type: "offer",
                      sdp: offer,
                    },
                  },
                });
              }
            }).catch((err) => {
              console.error("[Voice] Failed to create offer:", err);
            });
          }
        });
      });

      // Also handle the "join" event so offers are sent immediately when a new peer joins
      presenceChannel.on("presence", { event: "join" }, ({ newPresences }: any) => {
        newPresences.forEach((presence: any) => {
          if (presence.id !== currentUser.id && !peerConnectionsRef.current[presence.id] && currentUser.id < presence.id) {
            const pc = createPeerConnection(presence.id);
            pc.createOffer().then(async (offer) => {
              await pc.setLocalDescription(offer);
              if (signalingChannelRef.current) {
                signalingChannelRef.current.send({
                  type: "broadcast",
                  event: "signal",
                  payload: {
                    from: currentUser.id,
                    to: presence.id,
                    signal: {
                      type: "offer",
                      sdp: offer,
                    },
                  },
                });
              }
            }).catch((err) => {
              console.error("[Voice] Failed to create offer on join:", err);
            });
          }
        });
      });

      // Handle peer leaving — clean up their connection
      presenceChannel.on("presence", { event: "leave" }, ({ leftPresences }: any) => {
        leftPresences.forEach((presence: any) => {
          const pc = peerConnectionsRef.current[presence.id];
          if (pc) {
            pc.close();
            delete peerConnectionsRef.current[presence.id];
          }
          const audio = document.getElementById(`audio-peer-${presence.id}`);
          if (audio) audio.remove();
        });
      });

      await presenceChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            id: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            isMuted,
            isDeafened,
          });
        }
      });

    } catch (err) {
      console.error("Microphone access or voice initialization failed:", err);
      alert("Voice connection failed: Make sure mic access is allowed in your browser settings.");
      setActiveVoiceChannel(null);
    }
  };

  const handleDisconnectVoice = () => {
    // Play disconnect tone
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}

    disconnectVoice();
    setActiveVoiceChannel(null);
    setConnectedUsers([]);
    setSpeakers({});
  };

  const textChannels = channels.filter((c) => c.type !== "VOICE");
  const voiceChannels = channels.filter((c) => c.type === "VOICE");

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col h-screen flex-shrink-0 select-none">
      {/* Den Header Banner */}
      <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4 shadow-sm">
        <h1 className="font-bold text-white text-[15px] truncate">
          {currentDen ? currentDen.name : "OtakuDen Home"}
        </h1>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-[18px]">
        {currentDen ? (
          <>
            {/* 1. Text Channels */}
            <div>
              <div className="flex items-center justify-between text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1">
                <span>Text Channels</span>
                {currentUser && currentDen && currentDen.ownerId === currentUser.id && (
                  <button
                    onClick={() => {
                      setChannelType("TEXT");
                      setIsAddChannelOpen(true);
                    }}
                    className="hover:text-white transition"
                    title="Create Text Channel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-[2px]">
                {textChannels.map((chan) => {
                  const isActive = currentChannelSlug === chan.slug;
                  return (
                    <Link key={chan.id} href={`/d/${currentDenSlug}/${chan.slug}`}>
                      <div
                        className={`flex items-center px-2 py-1.5 rounded-md gap-1.5 transition text-[15px] ${
                          isActive
                            ? "bg-[#35373c] text-white font-medium"
                            : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                        }`}
                      >
                        <span className="text-xl text-[#80848e]">#</span>
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">{chan.name}</span>
                          {chan.password && (
                            <span className="text-xs text-[#949ba4] ml-1 select-none" title="Password Protected Private Channel">🔒</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 2. Voice Channels */}
            <div>
              <div className="flex items-center justify-between text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1">
                <span>Voice Channels</span>
                {currentUser && currentDen && currentDen.ownerId === currentUser.id && (
                  <button
                    onClick={() => {
                      setChannelType("VOICE");
                      setIsAddChannelOpen(true);
                    }}
                    className="hover:text-white transition"
                    title="Create Voice Channel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-[2px]">
                {voiceChannels.map((chan) => {
                  const isJoined = activeVoiceChannel === chan.name;
                  return (
                    <div key={chan.id} className="flex flex-col">
                      <button
                        onClick={() => handleVoiceChannelClick(chan.name)}
                        className={`flex items-center px-2 py-1.5 rounded-md gap-2 w-full text-left transition text-[15px] ${
                          isJoined
                            ? "text-emerald-400 font-medium bg-emerald-500/5"
                            : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                        }`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <div className="flex items-center justify-between w-full min-w-0 flex-1">
                          <span className="truncate">{chan.name}</span>
                          {chan.password && (
                            <span className="text-xs text-[#949ba4] ml-1 select-none" title="Password Protected Private Channel">🔒</span>
                          )}
                        </div>
                      </button>

                      {/* Display connected speakers underneath */}
                      {isJoined && currentUser && (
                        <div className="flex flex-col gap-1 ml-6 mt-1 mb-2">
                          {/* 1. Self */}
                          <div className="flex items-center gap-1.5 text-xs py-0.5 select-none">
                            <Avatar
                              avatar={currentUser.avatar}
                              className={`w-4 h-4 text-[9px] transition-all ${
                                speakers[currentUser.id]
                                  ? "border-emerald-500 ring-2 ring-emerald-500/20 scale-105"
                                  : "border-transparent"
                              }`}
                            />
                            <span className={`truncate ${speakers[currentUser.id] ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                              {currentUser.username}
                            </span>
                          </div>

                          {/* 2. Simulated call peers */}
                          {connectedUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-1.5 text-xs py-0.5 select-none">
                              <Avatar
                                avatar={u.avatar}
                                className={`w-4 h-4 text-[9px] transition-all ${
                                  speakers[u.id]
                                    ? "border-emerald-500 ring-2 ring-emerald-500/20 scale-105"
                                    : "border-transparent"
                                }`}
                              />
                              <span className={`truncate ${speakers[u.id] ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                                {u.username}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 1. Home Navigation options */}
            <div>
              <div className="text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1 select-none">
                Home Lobby
              </div>
              <div className="flex flex-col gap-[2px]">
                <Link href="/?tab=all-discussions">
                  <div className={`flex items-center px-2 py-1.5 rounded-md gap-1.5 transition text-[15px] ${
                    currentTab === "all-discussions"
                      ? "bg-[#35373c] text-white font-medium"
                      : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                  }`}>
                    <span className="text-xl text-[#80848e]">#</span>
                    <span>all-discussions</span>
                  </div>
                </Link>
                <Link href="/?tab=explore-dens">
                  <div className={`flex items-center px-2 py-1.5 rounded-md gap-1.5 transition text-[15px] ${
                    currentTab === "explore-dens"
                      ? "bg-[#35373c] text-white font-medium"
                      : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                  }`}>
                    <span className="text-xl text-[#80848e]">#</span>
                    <span>explore-dens</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* 2. Direct Messages section list */}
            {currentUser && (
              <div>
                <div className="text-[#949ba4] text-[12px] font-bold tracking-wide uppercase px-2 mb-1.5 mt-2 select-none">
                  Direct Messages
                </div>

                {/* Find or start a conversation search bar */}
                <div className="px-2 mb-2 select-none">
                  <input
                    type="text"
                    placeholder="Find or start a conversation"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#120f14] text-xs text-[#dbdee1] border border-[#232428] rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 transition font-medium"
                  />
                </div>

                <div className="flex flex-col gap-[2px]">
                  {allUsers
                    .filter((u) => u.id !== currentUser.id)
                    .filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((u) => {
                      const isActive = currentTab === "dm" && Number(recipientId) === u.id;
                      return (
                        <Link key={u.id} href={`/?tab=dm&recipientId=${u.id}`}>
                          <div className={`flex items-center px-2 py-1.5 rounded-md gap-2 transition text-[15px] ${
                            isActive
                              ? "bg-[#35373c] text-white font-medium"
                              : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                          }`}>
                            <Avatar avatar={u.avatar} className="w-5 h-5 text-[9px]" />
                            <span className="truncate">{u.username}</span>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Voice Status Connected Footer */}
      {activeVoiceChannel && (
        <div className="bg-[#232428] border-b border-[#1f2023] p-2 flex flex-col gap-1.5 select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] truncate max-w-[125px] font-bold leading-tight">Voice Connected</span>
                <span className="text-[9.5px] text-[#949ba4] leading-none truncate max-w-[125px] mt-0.5">
                  {activeVoiceChannel}
                </span>
              </div>
            </div>

            <button
              onClick={handleDisconnectVoice}
              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded transition"
              title="Disconnect Voice Call"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex-1 py-1 rounded text-center text-[10px] font-bold transition flex items-center justify-center gap-1 border border-[#1e1f22]/50 ${
                isMuted ? "bg-rose-500/20 text-rose-400" : "bg-[#2b2d31] text-[#949ba4] hover:text-white"
              }`}
            >
              🎙️ {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`flex-1 py-1 rounded text-center text-[10px] font-bold transition flex items-center justify-center gap-1 border border-[#1e1f22]/50 ${
                isDeafened ? "bg-rose-500/20 text-rose-400" : "bg-[#2b2d31] text-[#949ba4] hover:text-white"
              }`}
            >
              🎧 {isDeafened ? "Undeafen" : "Deafen"}
            </button>
          </div>
        </div>
      )}

      {/* Discord-exact User Status Bar */}
      <div className="h-[52px] bg-[#232428] flex items-center px-2 gap-1 relative select-none flex-shrink-0">
        {/* Avatar + name (your identity) */}
        <div className="flex items-center gap-2 px-1.5 py-1 rounded-md flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar avatar={currentUser ? currentUser.avatar : "default"} className="w-8 h-8 text-[12px] bg-[#2b2d31]" />
            {currentUser && (
              <span className="absolute -bottom-px -right-px w-3 h-3 rounded-full border-2 border-[#232428] bg-[#23a55a]" />
            )}
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[13px] font-semibold text-white truncate leading-snug">
              {currentUser ? currentUser.username : "Guest"}
            </span>
            <span className="text-[11px] text-[#949ba4] truncate">
              {currentUser
                ? (currentUser as any).discriminator
                  ? `#${(currentUser as any).discriminator}`
                  : "Online"
                : "Not registered"}
            </span>
          </div>
        </div>

        {/* Mic / Deafen / Settings icon buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Mute */}
          <button className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition" title="Mute">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          {/* Deafen */}
          <button className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition" title="Deafen">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          {/* Settings */}
          {currentUser && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition"
              title="User Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>

      </div>



      {/* Add Channel Modal */}
      {isAddChannelOpen && currentDen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-md max-w-sm w-full overflow-hidden shadow-2xl border border-[#232428] animate-in fade-in zoom-in-95 duration-150 text-white">
            <form onSubmit={handleAddChannel} className="p-6">
              <h3 className="text-xl font-bold mb-1">Create Channel</h3>
              <p className="text-[#949ba4] text-xs mb-4">
                Configure a new topic channel within this Den.
              </p>

              <div className="mb-4">
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Channel Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-[9px] text-[#949ba4] text-lg">#</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="new-channel"
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2 pl-7 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Channel Type */}
              <div className="mb-4">
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Channel Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChannelType("TEXT")}
                    className={`flex-1 py-2 px-3 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition select-none ${
                      channelType === "TEXT"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                        : "bg-[#1e1f22] border-[#111214] text-[#949ba4] hover:bg-[#2b2d31]"
                    }`}
                  >
                    <span>💬</span> Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelType("VOICE")}
                    className={`flex-1 py-2 px-3 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition select-none ${
                      channelType === "VOICE"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                        : "bg-[#1e1f22] border-[#111214] text-[#949ba4] hover:bg-[#2b2d31]"
                    }`}
                  >
                    <span>🔊</span> Voice
                  </button>
                </div>
              </div>

              {/* Private Channel Toggle */}
              <div className="mb-4 flex items-center justify-between bg-[#1e1f22] border border-[#111214] rounded p-3 select-none">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    🔒 Private Channel
                  </span>
                  <span className="text-[10px] text-[#949ba4]">Only members with the password can enter.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => {
                    setIsPrivate(e.target.checked);
                    if (!e.target.checked) setChannelPassword("");
                  }}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 bg-[#313338]"
                />
              </div>

              {/* Password field */}
              {isPrivate && (
                <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Channel Password</label>
                  <input
                    type="password"
                    required
                    maxLength={30}
                    value={channelPassword}
                    onChange={(e) => setChannelPassword(e.target.value)}
                    placeholder="Enter private channel passcode"
                    className="w-full bg-[#1e1f22] border border-[#111214] rounded p-2 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 bg-[#2b2d31] -mx-6 -mb-6 p-4 border-t border-[#232428]">
                <button
                  type="button"
                  onClick={() => setIsAddChannelOpen(false)}
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
      )}

      {/* User Settings Fullscreen Overlay */}
      {isSettingsOpen && currentUser && (
        <SettingsModal
          user={currentUser}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
