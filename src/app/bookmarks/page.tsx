import { prisma } from "@/lib/db";
import { getLoggedInUser } from "@/app/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";

export const metadata = {
  title: "Saved Posts & Bookmarks | OtakuDen",
  description: "Read the posts you've saved for later.",
};

export default async function BookmarksPage() {
  const currentUser = await getLoggedInUser();
  if (!currentUser) {
    redirect("/");
  }

  // Fetch all bookmarked posts
  const bookmarks = await prisma.savedPost.findMany({
    where: { userId: currentUser.id },
    include: {
      post: {
        include: {
          author: true,
          den: true,
          channel: true,
          votes: true,
          _count: { select: { comments: true } }
        }
      }
    },
    orderBy: { savedAt: "desc" }
  });

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white flex flex-col">
      <header className="h-12 border-b border-[#232428] bg-[#2b2d31] flex items-center px-4 md:px-6 justify-between select-none shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#949ba4] hover:text-white transition font-semibold text-sm">
            ← Back to Lobby
          </Link>
          <span className="text-slate-500">|</span>
          <h1 className="text-sm font-bold flex items-center gap-2">
            <span>🔖</span> Bookmarked Posts
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="mb-6 select-none">
          <h2 className="text-xl font-bold text-white">Your Saved Posts</h2>
          <p className="text-xs text-[#949ba4] mt-0.5">Posts you bookmarked are stored here for quick offline reference.</p>
        </div>

        <div className="flex flex-col gap-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-16 bg-[#2b2d31]/30 rounded-xl border border-dashed border-[#232428] p-6">
              <span className="text-3xl">🔖</span>
              <h3 className="text-lg font-bold text-white mt-2">No bookmarks saved yet</h3>
              <p className="text-sm text-[#949ba4] mt-1">
                Click the bookmark icon on any post card to save it!
              </p>
            </div>
          ) : (
            bookmarks.map((b: any) => (
              <PostCard key={b.post.id} post={b.post} currentUserId={currentUser.id} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
