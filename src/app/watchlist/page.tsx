import { prisma } from "@/lib/db";
import { getLoggedInUser } from "@/app/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import WatchlistClient from "./WatchlistClient";

export const metadata = {
  title: "My Anime Watchlist | OtakuDen",
  description: "Track the anime you're watching, plan to watch, or completed.",
};

export default async function WatchlistPage() {
  const currentUser = await getLoggedInUser();
  if (!currentUser) {
    redirect("/");
  }

  const entries = await prisma.watchlistEntry.findMany({
    where: { userId: currentUser.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white flex flex-col">
      {/* Header */}
      <header className="h-12 border-b border-[#232428] bg-[#2b2d31] flex items-center px-4 md:px-6 justify-between select-none">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#949ba4] hover:text-white transition font-semibold text-sm">
            ← Back to Lobby
          </Link>
          <span className="text-slate-500">|</span>
          <h1 className="text-sm font-bold flex items-center gap-2">
            <span>📺</span> My Watchlist
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <WatchlistClient initialEntries={entries} />
      </main>
    </div>
  );
}
