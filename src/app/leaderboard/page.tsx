import { prisma } from "@/lib/db";
import { getLoggedInUser } from "@/app/actions";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import XPBar from "@/components/XPBar";
import BadgeDisplay from "@/components/BadgeDisplay";

export const metadata = {
  title: "Otaku Leaderboard | OtakuDen",
  description: "See who is the ultimate anime fan on the global OtakuDen ranks.",
};

export default async function LeaderboardPage() {
  const currentUser = await getLoggedInUser();

  // Fetch all users to map message counts
  const topUsersFromDb = await prisma.user.findMany({
    include: {
      badges: true,
      _count: {
        select: { posts: true, comments: true }
      }
    }
  });

  // Fetch messages from Supabase to count them
  const messageCounts: Record<number, number> = {};
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder")) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: messages } = await supabase.from("Message").select("authorId");
      if (messages) {
        for (const msg of messages) {
          const aid = msg.authorId;
          messageCounts[aid] = (messageCounts[aid] || 0) + 1;
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch messages for leaderboard sorting:", err);
  }

  // Map user with their message count and sort by message count desc
  const topUsers = topUsersFromDb.map((u: any) => {
    return {
      ...u,
      messageCount: messageCounts[u.id] || 0
    };
  }).sort((a: any, b: any) => {
    if (b.messageCount !== a.messageCount) {
      return b.messageCount - a.messageCount;
    }
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return b.xp - a.xp;
  }).slice(0, 50);

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white flex flex-col">
      {/* Top Header */}
      <header className="h-12 border-b border-[#232428] bg-[#2b2d31] flex items-center px-4 md:px-6 justify-between select-none shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#949ba4] hover:text-white transition font-semibold text-sm">
            ← Back to Lobby
          </Link>
          <span className="text-slate-500">|</span>
          <h1 className="text-sm font-bold flex items-center gap-2">
            <span>🏆</span> Otaku Leaderboard
          </h1>
        </div>
      </header>

      {/* Main rank ladder container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="text-center mb-8 select-none">
          <span className="text-5xl">👑</span>
          <h2 className="text-2xl font-black mt-2 bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
            Global Rank Ladder
          </h2>
          <p className="text-xs text-[#949ba4] mt-1">Otakus ranked by the total number of chat messages sent in the community!</p>
        </div>

        {/* Rank List */}
        <div className="flex flex-col gap-3">
          {topUsers.map((user: any, index: number) => {
            const isMe = currentUser?.id === user.id;
            const rank = index + 1;

            let rankEmoji = `Rank #${rank}`;
            let borderClass = "border-[#232428] bg-[#2b2d31]/50";
            if (rank === 1) {
              rankEmoji = "🥇 Rank #1";
              borderClass = "border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/10";
            } else if (rank === 2) {
              rankEmoji = "🥈 Rank #2";
              borderClass = "border-slate-400/30 bg-slate-400/5";
            } else if (rank === 3) {
              rankEmoji = "🥉 Rank #3";
              borderClass = "border-orange-600/30 bg-orange-600/5";
            }

            return (
              <div
                key={user.id}
                className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-[#35373c] ${borderClass} ${
                  isMe ? "ring-2 ring-indigo-500/40" : ""
                }`}
              >
                {/* Profile + Rank info */}
                <div className="flex items-center gap-4">
                  <div className="text-center w-20 shrink-0 font-black text-sm select-none">
                    <span className={rank <= 3 ? "text-base" : "text-[#949ba4]"}>
                      {rankEmoji}
                    </span>
                  </div>
                  <Avatar avatar={user.avatar} className="w-10 h-10 text-sm shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{user.username}</span>
                      {isMe && (
                        <span className="text-[9px] bg-indigo-600/30 text-indigo-400 font-bold px-1 py-0.5 rounded uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    {user.flair && (
                      <span className="text-[9px] text-[#949ba4] font-bold uppercase tracking-wider block mt-0.5">
                        {user.flair}
                      </span>
                    )}
                  </div>
                </div>

                {/* Level + Stats panel */}
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Compact XP */}
                  <div className="w-48">
                    <XPBar xp={user.xp} level={user.level} compact />
                  </div>

                  {/* Message Count, Streak & Badges */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="flex flex-col text-center min-w-[50px]">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        💬 {user.messageCount}
                      </span>
                      <span className="text-[9px] text-[#6b7280] uppercase font-bold tracking-wide">Messages</span>
                    </div>

                    <div className="flex flex-col text-center">
                      <span className="text-xs font-mono font-bold text-orange-400 flex items-center justify-center gap-0.5">
                        🔥 {user.loginStreak}
                      </span>
                      <span className="text-[9px] text-[#6b7280] uppercase font-bold tracking-wide">Streak</span>
                    </div>

                    <div className="flex flex-col">
                      <div className="h-6 flex items-center justify-center">
                        <BadgeDisplay badges={user.badges} compact />
                      </div>
                      <span className="text-[9px] text-[#6b7280] uppercase font-bold tracking-wide text-center mt-0.5">
                        Badges ({user.badges.length})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
