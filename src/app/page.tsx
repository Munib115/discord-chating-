import { prisma } from "@/lib/db";
import { getLoggedInUser, getAllUsers } from "@/app/actions";
import ChannelSidebar from "@/components/ChannelSidebar";
import ChatRoom from "@/components/ChatRoom";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import MobileLayoutWrapper from "@/components/MobileLayoutWrapper";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    sort?: string;
    q?: string;
    recipientId?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentTab = resolvedParams.tab || "all-discussions";
  const currentSort = resolvedParams.sort || "new";
  const searchNormalized = resolvedParams.q ? resolvedParams.q.toLowerCase().trim() : "";
  const recipientIdStr = resolvedParams.recipientId;

  const currentUser = await getLoggedInUser();
  const allUsers = await getAllUsers();

  // Fetch data depending on tab
  let posts: any[] = [];
  let dens: any[] = [];
  let recipientUser: any = null;
  let dmChannelId = 0;

  if (currentTab === "all-discussions") {
    const orderBy: any = { createdAt: "desc" };

    posts = await prisma.post.findMany({
      where: searchNormalized
        ? {
            OR: [
              { title: { contains: searchNormalized } },
              { content: { contains: searchNormalized } },
              { tags: { contains: searchNormalized } },
            ],
          }
        : undefined,
      include: {
        author: true,
        den: true,
        channel: true,
        votes: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy,
    });

    if (currentSort === "top") {
      posts.sort((a, b) => {
        const scoreA = a.votes.reduce((acc: number, v: any) => acc + v.value, 0);
        const scoreB = b.votes.reduce((acc: number, v: any) => acc + v.value, 0);
        return scoreB - scoreA;
      });
    } else if (currentSort === "hot") {
      posts.sort((a, b) => {
        const scoreA = a.votes.reduce((acc: number, v: any) => acc + v.value, 0) + a._count.comments * 2;
        const scoreB = b.votes.reduce((acc: number, v: any) => acc + v.value, 0) + b._count.comments * 2;
        return scoreB - scoreA;
      });
    }
  } else if (currentTab === "explore-dens") {
    dens = await prisma.den.findMany({
      include: {
        _count: {
          select: { posts: true, channels: true },
        },
      },
    });
  } else if (currentTab === "dm" && recipientIdStr) {
    const rId = Number(recipientIdStr);
    recipientUser = allUsers.find((u: any) => u.id === rId);

    if (currentUser && recipientUser) {
      // Compute a deterministic unique DM channel ID based on sorted user IDs
      dmChannelId = 10000 + Math.min(currentUser.id, recipientUser.id) * 100 + Math.max(currentUser.id, recipientUser.id);
    }
  }

  // Fetch top active users for leaderboard
  const topUsers = await prisma.user.findMany({
    include: {
      _count: {
        select: { posts: true, comments: true },
      },
    },
    take: 5,
  });
  topUsers.sort((a: any, b: any) => (b._count.posts + b._count.comments) - (a._count.posts + a._count.comments));

  return (
    <MobileLayoutWrapper
      channelSidebar={
        <ChannelSidebar
          channels={[]}
          currentUser={currentUser}
          allUsers={allUsers}
        />
      }
      memberList={
        <div className="flex flex-col gap-4">
          {/* Welcome Card */}
          <div className="bg-[#2b2d31] rounded-md border border-[#232428] p-4 text-center">
            <span className="text-3xl">🏮</span>
            <h3 className="text-base font-bold text-white mt-2">Welcome to OtakuDen!</h3>
            <p className="text-xs text-[#949ba4] leading-relaxed mt-1">
              Select a themed anime chamber from the leftmost bar, browse threads, and comment. Switch user profiles instantly in the bottom-left to play!
            </p>
          </div>

          {/* Active Leaderboard */}
          <div className="bg-[#2b2d31] rounded-md border border-[#232428] p-3 flex flex-col gap-2">
            <h4 className="text-xs font-bold text-[#949ba4] uppercase tracking-wide px-1">
              Top Active Otakus
            </h4>
            <div className="flex flex-col gap-2.5">
              {topUsers.map((tu) => (
                <div key={tu.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar avatar={tu.avatar} className="w-6 h-6 text-[10px]" />
                    <span className="font-medium text-slate-200 truncate">{tu.username}</span>
                  </div>
                  <span className="text-[#949ba4] text-[10px] font-semibold uppercase bg-[#1e1f22] px-2 py-0.5 rounded">
                    Score {tu._count.posts + tu._count.comments}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
      channelName={currentTab.replace("-", " ")}
      denName="OtakuDen Lobby"
      denIcon="🏯"
      isChatMode={currentTab === "dm"}
      dens={dens}
    >
      <div className="flex-1 flex overflow-hidden min-w-0 h-full">
        {/* Render 1-on-1 Direct Message chat room */}
        {currentTab === "dm" && recipientUser ? (
          <div className="flex-1 flex flex-col min-w-0 px-4 md:px-6 py-4 gap-4 overflow-hidden">
            {/* Desktop header helper card */}
            <div className="hidden md:block select-none pb-1 border-b border-[#232428]/40">
              <p className="text-xs text-[#949ba4]">
                {recipientUser.bio || "OtakuDen User profile chat session"}
              </p>
            </div>

            {/* Chat Room component targeting computed DM lobby channel */}
            {currentUser ? (
              <ChatRoom
                channelId={dmChannelId}
                currentUser={currentUser}
                allUsers={allUsers}
              />
            ) : (
              <div className="bg-[#1e1f22]/50 p-4 rounded text-center text-sm text-[#949ba4]">
                You must switch a profile to send direct messages.
              </div>
            )}
          </div>
        ) : (
          /* Render global discussions list or explore directory */
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-4 md:px-6 py-4 gap-4">
            {/* Desktop header helper card */}
            <div className="hidden md:block select-none pb-1 border-b border-[#232428]/40 flex items-center justify-between">
              <p className="text-xs text-[#949ba4]">
                {currentTab === "all-discussions"
                  ? "Viewing all discussions across the global sphere."
                  : "Explore registered Dens and find your cozy anime home."}
              </p>

              {/* Search Input */}
              {currentTab === "all-discussions" && (
                <form method="GET" className="relative max-w-xs w-full">
                  <input type="hidden" name="tab" value={currentTab} />
                  <input type="hidden" name="sort" value={currentSort} />
                  <input
                    type="text"
                    name="q"
                    defaultValue={resolvedParams.q || ""}
                    placeholder="Search posts..."
                    className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button type="submit" className="absolute right-2.5 top-2.5 text-[#949ba4] hover:text-white transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
              )}
            </div>

            {/* Tab Contents */}
            {currentTab === "all-discussions" ? (
              <div className="flex flex-col gap-4">
                {/* Sort selector bar */}
                <div className="flex items-center gap-2 bg-[#2b2d31]/50 p-1.5 rounded-md border border-[#232428]/40 self-start">
                  {["new", "hot", "top"].map((sortOption) => (
                    <Link
                      key={sortOption}
                      href={`/?tab=all-discussions&sort=${sortOption}${resolvedParams.q ? `&q=${resolvedParams.q}` : ""}`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md capitalize transition ${
                        currentSort === sortOption
                          ? "bg-[#35373c] text-white"
                          : "text-[#949ba4] hover:text-white hover:bg-[#35373c]/30"
                      }`}
                    >
                      {sortOption}
                    </Link>
                  ))}
                </div>

                {/* Feed Grid */}
                <div className="flex flex-col gap-3">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                    ))
                  ) : (
                    <div className="text-center py-16 bg-[#2b2d31]/30 rounded-md border border-dashed border-[#232428] p-6">
                      <span className="text-3xl">📭</span>
                      <h3 className="text-lg font-bold text-white mt-2">No posts found</h3>
                      <p className="text-sm text-[#949ba4] mt-1">
                        {searchNormalized
                          ? `We couldn't find any results matching "${searchNormalized}"`
                          : "Nobody has posted anything in this category yet."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Explore Dens Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dens.map((den) => (
                  <div
                    key={den.id}
                    className="bg-[#2b2d31] border border-[#232428] rounded-md overflow-hidden flex flex-col hover:border-[#35373c] transition group"
                  >
                    <div className={`h-12 bg-gradient-to-r ${den.banner || "from-indigo-600 to-slate-900"} flex items-center px-4 justify-between`}>
                      <span className="text-2xl">{den.icon || "⚔️"}</span>
                      <span className="bg-[#111214]/60 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full select-none">
                        {den._count.posts} posts
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-1 gap-2 justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition">
                          {den.name}
                        </h3>
                        <p className="text-xs text-[#949ba4] mt-1 line-clamp-2 leading-relaxed">
                          {den.description}
                        </p>
                      </div>

                      <Link href={`/d/${den.slug}/general`} className="mt-4 bg-[#313338] hover:bg-indigo-600 hover:text-white text-indigo-400 border border-[#232428] text-xs font-semibold py-2 rounded text-center transition">
                        Enter Den
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayoutWrapper>
  );
}
