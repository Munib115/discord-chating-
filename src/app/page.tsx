import { prisma } from "@/lib/db";
import { getLoggedInUser, getAllUsers } from "@/app/actions";
import ChannelSidebar from "@/components/ChannelSidebar";
import { getAvatarBg, getAvatarEmoji } from "@/lib/avatar";
import PostCard from "@/components/PostCard";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    sort?: string;
    q?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentTab = resolvedParams.tab || "all-discussions";
  const currentSort = resolvedParams.sort || "new";
  const searchNormalized = resolvedParams.q ? resolvedParams.q.toLowerCase().trim() : "";

  const currentUser = await getLoggedInUser();
  const allUsers = await getAllUsers();

  // Mock global channels list for homepage
  const globalChannels = [
    { id: 1001, name: "all-discussions", slug: "all-discussions" },
    { id: 1002, name: "explore-dens", slug: "explore-dens" },
  ];

  // Fetch data depending on tab
  let posts: any[] = [];
  let dens: any[] = [];

  if (currentTab === "all-discussions") {
    // Determine sort ordering
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
      // Hot sorting based on comment count + upvotes
      posts.sort((a, b) => {
        const scoreA = a.votes.reduce((acc: number, v: any) => acc + v.value, 0) + a._count.comments * 2;
        const scoreB = b.votes.reduce((acc: number, v: any) => acc + v.value, 0) + b._count.comments * 2;
        return scoreB - scoreA;
      });
    }
  } else {
    // Fetch all Dens for explore view
    dens = await prisma.den.findMany({
      include: {
        _count: {
          select: { posts: true, channels: true },
        },
      },
    });
  }

  // Fetch top active users (users with most posts + comments)
  const topUsers = await prisma.user.findMany({
    include: {
      _count: {
        select: { posts: true, comments: true },
      },
    },
    take: 5,
  });
  topUsers.sort((a, b) => (b._count.posts + b._count.comments) - (a._count.posts + a._count.comments));

  return (
    <div className="flex flex-1 overflow-hidden min-w-0">
      {/* 2. Channel Sidebar (Middle bar) */}
      <ChannelSidebar
        channels={globalChannels.map(gc => ({ id: gc.id, name: gc.name, slug: `?tab=${gc.slug}` }))}
        currentUser={currentUser}
        allUsers={allUsers}
      />

      {/* 3. Main Chat / Feed Area (Right column) */}
      <main className="flex-1 bg-[#313338] flex overflow-hidden min-w-0">
        {/* Central Feed Scroll Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-6 py-4 gap-4">
          {/* Header Bar */}
          <header className="flex items-center justify-between pb-3 border-b border-[#232428] gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-1.5 capitalize select-none">
                <span className="text-[#80848e]">#</span>
                {currentTab.replace("-", " ")}
              </h2>
              <p className="text-xs text-[#949ba4] mt-0.5 select-none">
                {currentTab === "all-discussions"
                  ? "Viewing all discussions across the global sphere."
                  : "Explore registered Dens and find your cozy anime home."}
              </p>
            </div>

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
          </header>

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

        {/* Right Sidebar (Details Pane) */}
        <aside className="w-64 border-l border-[#232428] bg-[#2b2d31]/30 hidden lg:flex flex-col p-4 gap-4 overflow-y-auto no-scrollbar select-none">
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
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${getAvatarBg(tu.avatar)}`}>
                      {getAvatarEmoji(tu.avatar)}
                    </span>
                    <span className="font-medium text-slate-200 truncate">{tu.username}</span>
                  </div>
                  <span className="text-[#949ba4] text-[10px] font-semibold uppercase bg-[#1e1f22] px-2 py-0.5 rounded">
                    Score {tu._count.posts + tu._count.comments}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
