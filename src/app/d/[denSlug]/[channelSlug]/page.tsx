import { prisma } from "@/lib/db";
import { getLoggedInUser, getAllUsers } from "@/app/actions";
import ChannelSidebar from "@/components/ChannelSidebar";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import ChatRoom from "@/components/ChatRoom";
import LockScreen from "@/components/LockScreen";
import MemberList from "@/components/MemberList";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{
    denSlug: string;
    channelSlug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const den = await prisma.den.findUnique({
    where: { slug: resolvedParams.denSlug },
  });

  const channelName = resolvedParams.channelSlug;

  if (!den) {
    return {
      title: "Den Not Found - OtakuDen",
    };
  }

  return {
    title: `#${channelName} in d/${den.slug} | OtakuDen`,
    description: `Join the #${channelName} discussion channel inside the ${den.name} community. Share opinions, fan art, and reviews on OtakuDen.`,
  };
}

export default async function ChannelPage({ params }: PageProps) {
  const resolvedParams = await params;
  const currentUser = await getLoggedInUser();
  const allUsers = await getAllUsers();

  // Fetch current Den including member join relationships
  const den = await prisma.den.findUnique({
    where: { slug: resolvedParams.denSlug },
    include: {
      channels: {
        orderBy: { name: "asc" },
      },
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!den) notFound();

  // Fetch current Channel
  const channel = den.channels.find((c: any) => c.slug === resolvedParams.channelSlug);
  if (!channel) notFound();

  // Verify Den membership permissions
  const isMember = currentUser
    ? den.ownerId === currentUser.id || den.members.some((m) => m.userId === currentUser.id)
    : false;

  // Fetch posts in this channel
  const posts = await prisma.post.findMany({
    where: {
      denId: den.id,
      channelId: channel.id,
    },
    include: {
      author: true,
      den: true,
      channel: true,
      votes: true,
      _count: {
        select: { comments: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const isChatMode = channel.slug === "general" || channel.slug.includes("chat");

  return (
    <div className="flex flex-1 overflow-hidden min-w-0">
      {/* 2. Channel Sidebar */}
      <ChannelSidebar
        currentDen={den}
        channels={den.channels}
        currentUser={currentUser}
        allUsers={allUsers}
      />

      {/* 3. Main Chat Feed Area */}
      <main className="flex-1 bg-[#313338] flex overflow-hidden min-w-0">
        {!isMember ? (
          <LockScreen
            denId={den.id}
            denName={den.name}
            denIcon={den.icon}
            denSlug={den.slug}
          />
        ) : (
          <div className={`flex-1 flex flex-col min-w-0 px-6 py-4 gap-4 ${isChatMode ? "overflow-hidden" : "overflow-y-auto"}`}>
            {/* Header Bar */}
            <header className="flex items-center justify-between pb-3 border-b border-[#232428]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-1.5 select-none">
                  <span className="text-[#80848e]">#</span>
                  {channel.name}
                </h2>
                <p className="text-xs text-[#949ba4] mt-0.5 select-none">
                  {isChatMode
                    ? `Real-time chat lobby for #${channel.name}`
                    : `Welcome to the beginning of the #${channel.name} channel!`}
                </p>
              </div>
            </header>

            {/* Render ChatRoom for chat channels, otherwise render Reddit posts feed */}
            {isChatMode ? (
              currentUser ? (
                <ChatRoom
                  channelId={channel.id}
                  currentUser={currentUser}
                  allUsers={allUsers}
                />
              ) : (
                <div className="bg-[#1e1f22]/50 p-4 rounded text-center text-sm text-[#949ba4]">
                  You must be logged in to participate in the real-time chat. Select a character profile from the bottom left!
                </div>
              )
            ) : (
              <>
                {/* Create Post Bar (Mock Auth session check) */}
                {currentUser && (
                  <CreatePostModal
                    denId={den.id}
                    channels={den.channels}
                    activeChannelId={channel.id}
                    username={currentUser.username}
                    avatar={currentUser.avatar}
                  />
                )}

                {/* Posts List */}
                <div className="flex flex-col gap-3">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                    ))
                  ) : (
                    <div className="text-center py-16 bg-[#2b2d31]/30 rounded-md border border-dashed border-[#232428] p-6 select-none">
                      <span className="text-3xl">💬</span>
                      <h3 className="text-lg font-bold text-white mt-2">No posts here yet</h3>
                      <p className="text-sm text-[#949ba4] mt-1">
                        Be the first to share your thoughts in #{channel.name}!
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Right Sidebar (Den Info Details) */}
        <aside className="w-64 border-l border-[#232428] bg-[#2b2d31]/30 hidden lg:flex flex-col p-4 gap-4 overflow-y-auto no-scrollbar select-none">
          {/* Den Banner/About Card */}
          <div className="bg-[#2b2d31] rounded-md border border-[#232428] overflow-hidden">
            <div className={`h-12 bg-gradient-to-r ${den.banner || "from-indigo-600 to-slate-900"} p-3 flex justify-between items-start`}>
              <span className="text-2xl">{den.icon || "⚔️"}</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-white">About d/{den.slug}</h3>
              <p className="text-xs text-[#b5bac1] leading-relaxed mt-1.5">
                {den.description}
              </p>
              <div className="w-full h-[1px] bg-[#35363c] my-3" />
              <div className="text-3xs text-[#949ba4] font-bold uppercase tracking-wider">
                Created
              </div>
              <div className="text-xs text-[#dbdee1] font-medium mt-0.5">
                {new Date(den.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Members List Panel */}
          {isMember && (
            <MemberList
              denId={den.id}
              members={den.members}
              ownerId={den.ownerId}
              currentUserId={currentUser?.id}
            />
          )}

          {/* Rules Card */}
          <div className="bg-[#2b2d31] rounded-md border border-[#232428] p-4 flex flex-col gap-2">
            <h4 className="text-xs font-bold text-[#949ba4] uppercase tracking-wide">
              Den Rules
            </h4>
            <ol className="list-decimal pl-4 text-xs text-[#b5bac1] flex flex-col gap-2 leading-normal">
              <li>Keep posts relevant to {den.name}.</li>
              <li>Use the spoiler tags for manga releases.</li>
              <li>Respect fellow otakus. Be cozy!</li>
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}
