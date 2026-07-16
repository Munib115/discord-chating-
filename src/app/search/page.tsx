import { prisma } from "@/lib/db";
import { getLoggedInUser } from "@/app/actions";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";
import { WatchTogetherButton, AddToWatchlistButton } from "@/components/SearchActionButtons";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    tab?: string;
  }>;
}

export const metadata = {
  title: "Search OtakuDen | Find Posts & Anime Fans",
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "", tab = "posts" } = await searchParams;
  const currentUser = await getLoggedInUser();
  const searchStr = q.trim();

  let posts: any[] = [];
  let users: any[] = [];
  let animeList: any[] = [];
  let defaultDenId = 1;

  if (currentUser) {
    const memberDen = await prisma.denMember.findFirst({
      where: { userId: currentUser.id },
      select: { denId: true },
    });
    if (memberDen) {
      defaultDenId = memberDen.denId;
    }
  }

  if (searchStr.length >= 2) {
    if (tab === "posts") {
      posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: searchStr } },
            { content: { contains: searchStr } },
            { tags: { contains: searchStr } },
          ],
        },
        include: {
          author: true,
          den: true,
          channel: true,
          votes: true,
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    } else if (tab === "users") {
      users = await prisma.user.findMany({
        where: {
          username: { contains: searchStr },
        },
        include: {
          followers: true,
        },
        orderBy: { username: "asc" },
        take: 30,
      });
    } else if (tab === "anime") {
      const { searchAnimeFromJikan } = await import("@/app/actions");
      animeList = await searchAnimeFromJikan(searchStr);
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white flex flex-col">
      <header className="h-12 border-b border-[#232428] bg-[#2b2d31] flex items-center px-4 md:px-6 justify-between select-none shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <Link href="/" className="text-[#949ba4] hover:text-white transition font-semibold text-sm shrink-0">
            ← Back
          </Link>
          <span className="text-slate-500">|</span>
          <form method="GET" className="relative max-w-md w-full">
            <input type="hidden" name="tab" value={tab} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Search posts, tags, or usernames..."
              className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-md px-3 py-1.5 pr-8 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <button type="submit" className="absolute right-2.5 top-2.5 text-[#949ba4] hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        {/* Toggle tabs */}
        <div className="flex border-b border-[#232428] gap-4 mb-6 select-none">
          <Link
            href={`/search?q=${encodeURIComponent(q)}&tab=posts`}
            className={`py-3 text-xs font-bold uppercase tracking-wider transition ${
              tab === "posts" ? "text-white border-b-2 border-indigo-500" : "text-[#949ba4] hover:text-white"
            }`}
          >
            Posts ({posts.length})
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(q)}&tab=anime`}
            className={`py-3 text-xs font-bold uppercase tracking-wider transition ${
              tab === "anime" ? "text-white border-b-2 border-indigo-500" : "text-[#949ba4] hover:text-white"
            }`}
          >
            Anime ({animeList.length})
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(q)}&tab=users`}
            className={`py-3 text-xs font-bold uppercase tracking-wider transition ${
              tab === "users" ? "text-white border-b-2 border-indigo-500" : "text-[#949ba4] hover:text-white"
            }`}
          >
            People ({users.length})
          </Link>
        </div>

        {/* Results */}
        {searchStr.length < 2 ? (
          <div className="text-center py-16 text-[#949ba4]">
            <span className="text-4xl">🔍</span>
            <p className="mt-2 text-sm">Enter at least 2 characters to search.</p>
          </div>
        ) : tab === "posts" ? (
          <div className="flex flex-col gap-3">
            {posts.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#949ba4]">No posts matched your query.</p>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
              ))
            )}
          </div>
        ) : tab === "anime" ? (
          <div className="flex flex-col gap-3">
            {animeList.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#949ba4]">No anime matched your query.</p>
            ) : (
              animeList.map((anime) => (
                <div
                  key={anime.mal_id}
                  className="bg-[#2b2d31] border border-[#232428] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#35373c] transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={anime.images?.jpg?.image_url}
                      alt={anime.title}
                      className="w-12 h-16 object-cover rounded bg-[#1e1f22] shrink-0 border border-[#232428]/40"
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white leading-tight block truncate">
                        {anime.title}
                      </span>
                      <span className="text-[10px] text-[#949ba4] mt-1 block">
                        Episodes: {anime.episodes || "?"}
                      </span>
                      <p className="text-xs text-[#949ba4] mt-1.5 line-clamp-2 leading-relaxed">
                        {anime.synopsis || "No synopsis available."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 select-none">
                    <WatchTogetherButton
                      anime={anime}
                      currentUser={currentUser}
                      defaultDenId={defaultDenId}
                    />
                    <AddToWatchlistButton
                      anime={anime}
                      currentUser={currentUser}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.length === 0 ? (
              <p className="text-center py-8 text-xs text-[#949ba4]">No users matched your query.</p>
            ) : (
              users.map((user) => {
                const isMe = currentUser?.id === user.id;
                const isFollowing = currentUser
                  ? user.followers.some((f: any) => f.followerId === currentUser.id)
                  : false;

                return (
                  <div
                    key={user.id}
                    className="bg-[#2b2d31] border border-[#232428] rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar avatar={user.avatar} className="w-10 h-10 text-sm" />
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                          {user.username}
                          {isMe && (
                            <span className="text-[9px] bg-[#1e1f22] text-[#949ba4] font-bold px-1 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </p>
                        {user.flair && (
                          <span className="text-[10px] text-indigo-400 font-bold mt-0.5 block">{user.flair}</span>
                        )}
                      </div>
                    </div>

                    {!isMe && currentUser && (
                      <FollowButton
                        targetUserId={user.id}
                        initialIsFollowing={isFollowing}
                        targetUsername={user.username}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
