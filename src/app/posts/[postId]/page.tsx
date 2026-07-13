import { prisma } from "@/lib/db";
import { getLoggedInUser, getAllUsers } from "@/app/actions";
import ChannelSidebar from "@/components/ChannelSidebar";
import PostCard from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";
import LockScreen from "@/components/LockScreen";
import MemberList from "@/components/MemberList";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{
    postId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await prisma.post.findUnique({
    where: { id: Number(resolvedParams.postId) },
    include: { den: true },
  });

  if (!post) {
    return {
      title: "Post Not Found - OtakuDen",
    };
  }

  return {
    title: `${post.title} | d/${post.den.slug} | OtakuDen`,
    description: `${post.content.substring(0, 150)}... Read the full discussion on OtakuDen.`,
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const currentUser = await getLoggedInUser();
  const allUsers = await getAllUsers();

  // Fetch Post details
  const post = await prisma.post.findUnique({
    where: { id: Number(resolvedParams.postId) },
    include: {
      author: true,
      den: {
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
      },
      channel: true,
      votes: true,
      comments: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!post) notFound();

  // Verify membership permissions
  const isMember = currentUser
    ? post.den.ownerId === currentUser.id || post.den.members.some((m) => m.userId === currentUser.id)
    : false;

  // JSON-LD structured data for discussion forum search indexing
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `https://otakuden.example.com/posts/${post.id}`,
    "headline": post.title,
    "description": post.content.substring(0, 150),
    "text": post.content,
    "datePublished": post.createdAt.toISOString(),
    "dateModified": post.updatedAt.toISOString(),
    "author": {
      "@type": "Person",
      "name": post.author.username,
    },
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/CommentAction",
      "userInteractionCount": post.comments.length,
    },
  };

  return (
    <div className="flex flex-1 overflow-hidden min-w-0">
      {/* Dynamic JSON-LD injection for structured SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 2. Channel Sidebar showing parent Den channels */}
      <ChannelSidebar
        currentDen={post.den}
        channels={post.den.channels}
        currentUser={currentUser}
        allUsers={allUsers}
      />

      {/* 3. Main Detailed Post Panel */}
      <main className="flex-1 bg-[#313338] flex overflow-hidden min-w-0">
        {!isMember ? (
          <LockScreen
            denId={post.den.id}
            denName={post.den.name}
            denIcon={post.den.icon}
            denSlug={post.den.slug}
          />
        ) : (
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-6 py-4 gap-4">
            {/* Back button */}
            <div className="flex items-center select-none pb-1.5 border-b border-[#232428]">
              <Link
                href={`/d/${post.den.slug}/${post.channel.slug}`}
                className="text-xs text-[#949ba4] hover:text-white flex items-center gap-1.5 font-bold uppercase transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to #{post.channel.name}</span>
              </Link>
            </div>

            {/* Expanded Post Card */}
            <PostCard post={{
              ...post,
              _count: { comments: post.comments.length }
            }} currentUserId={currentUser?.id} />

            {/* Comment Thread Component */}
            <div className="bg-[#2b2d31] border border-[#232428] rounded-md p-4">
              <CommentSection
                postId={post.id}
                comments={post.comments}
                currentUserId={currentUser?.id}
              />
            </div>
          </div>
        )}

        {/* Right Sidebar (Den Details) */}
        <aside className="w-64 border-l border-[#232428] bg-[#2b2d31]/30 hidden lg:flex flex-col p-4 gap-4 overflow-y-auto no-scrollbar select-none">
          <div className="bg-[#2b2d31] rounded-md border border-[#232428] overflow-hidden">
            <div className={`h-12 bg-gradient-to-r ${post.den.banner || "from-indigo-600 to-slate-900"} p-3 flex justify-between items-start`}>
              <span className="text-2xl">{post.den.icon || "⚔️"}</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-white">About d/{post.den.slug}</h3>
              <p className="text-xs text-[#b5bac1] leading-relaxed mt-1.5">
                {post.den.description}
              </p>
              <div className="w-full h-[1px] bg-[#35363c] my-3" />
              <div className="text-3xs text-[#949ba4] font-bold uppercase tracking-wider">
                Created
              </div>
              <div className="text-xs text-[#dbdee1] font-medium mt-0.5">
                {new Date(post.den.createdAt).toLocaleDateString(undefined, {
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
              denId={post.den.id}
              members={post.den.members}
              ownerId={post.den.ownerId}
              currentUserId={currentUser?.id}
            />
          )}
        </aside>
      </main>
    </div>
  );
}
