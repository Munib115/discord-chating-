import { prisma } from "@/lib/db";
import { getLoggedInUser, getAllUsers } from "@/app/actions";
import ChannelSidebar from "@/components/ChannelSidebar";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import ChatRoom from "@/components/ChatRoom";
import LockScreen from "@/components/LockScreen";
import MemberList from "@/components/MemberList";
import JoinChannelButton from "@/components/JoinChannelButton";
import MobileLayoutWrapper from "@/components/MobileLayoutWrapper";
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

  const dens = await prisma.den.findMany({
    orderBy: { id: "asc" },
  });

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

  // Verify Den membership permissions (auto-join)
  let isMember = currentUser
    ? den.ownerId === currentUser.id || den.members.some((m: any) => m.userId === currentUser.id)
    : false;

  if (currentUser && !isMember) {
    try {
      await prisma.denMember.create({
        data: {
          denId: den.id,
          userId: currentUser.id,
        },
      });
      isMember = true;
    } catch (err) {
      console.error("Auto-join failed:", err);
    }
  }

  // Fetch members of this channel
  const channelMembersRaw = await prisma.channelMember.findMany({
    where: { channelId: channel.id },
    include: {
      user: true,
    },
  });

  const channelMembers = channelMembersRaw.map((cm: any) => ({
    userId: cm.userId,
    user: cm.user,
  }));

  // Auto-join #general channel by default
  const isGeneralChannel = channel.slug === "general";
  let isChannelMember = currentUser
    ? channelMembers.some((m: any) => m.userId === currentUser.id)
    : false;

  if (currentUser && !isChannelMember && isGeneralChannel) {
    try {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: currentUser.id,
        },
      });
      channelMembers.push({
        userId: currentUser.id,
        user: currentUser,
      });
      isChannelMember = true;
    } catch (err) {
      console.error("Auto-join general channel failed:", err);
    }
  }

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
    <MobileLayoutWrapper
      channelSidebar={
        <ChannelSidebar
          currentDen={den}
          channels={den.channels}
          currentUser={currentUser}
          allUsers={allUsers}
        />
      }
      memberList={
        isMember ? (
          <MemberList
            denId={den.id}
            members={den.members}
            ownerId={den.ownerId}
            currentUserId={currentUser?.id}
            channelMembers={channelMembers}
            channelName={channel.name}
          />
        ) : null
      }
      channelName={channel.name}
      denName={den.name}
      denIcon={den.icon || "⚔️"}
      isChatMode={isChatMode}
      dens={dens}
    >
      {!isMember ? (
        <LockScreen
          denId={den.id}
          denName={den.name}
          denIcon={den.icon}
          denSlug={den.slug}
        />
      ) : (
        <div className={`flex-1 flex flex-col min-w-0 px-4 md:px-6 py-4 gap-4 ${isChatMode ? "overflow-hidden" : "overflow-y-auto"}`}>
          {/* Top header helper card for desktop view (mobile has static header) */}
          <div className="hidden md:block select-none pb-1 border-b border-[#232428]/40">
            <p className="text-xs text-[#949ba4]">
              {isChatMode
                ? `Real-time chat lobby for #${channel.name}`
                : `Welcome to the beginning of the #${channel.name} channel!`}
            </p>
          </div>

          {/* Check if channel has been joined by user */}
          {!isChannelMember ? (
            <JoinChannelButton
              channelId={channel.id}
              channelName={channel.name}
              isPrivate={!!channel.password}
            />
          ) : isChatMode ? (
            currentUser ? (
              <ChatRoom
                channelId={channel.id}
                currentUser={currentUser}
                allUsers={allUsers}
                isOwner={den.ownerId === currentUser.id}
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
                  posts.map((post: any) => (
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
    </MobileLayoutWrapper>
  );
}
