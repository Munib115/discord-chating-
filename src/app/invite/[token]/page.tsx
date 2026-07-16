import { prisma } from "@/lib/db";
import { getLoggedInUser, joinDenWithInvite } from "@/app/actions";
import { notFound, redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invite = await prisma.denInvite.findUnique({
    where: { token },
    include: { den: true },
  });

  if (!invite) {
    return { title: "Invalid Invite — OtakuDen" };
  }

  return {
    title: `You're invited to ${invite.den.name} | OtakuDen`,
    description: `Join ${invite.den.name} on OtakuDen — the anime community platform.`,
  };
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const currentUser = await getLoggedInUser();

  const invite = await prisma.denInvite.findUnique({
    where: { token },
    include: {
      den: {
        include: {
          _count: {
            select: { members: true, posts: true },
          },
        },
      },
    },
  });

  if (!invite) notFound();

  const isExpired = invite.maxUses && invite.maxUses > 0 && invite.uses >= invite.maxUses;
  const den = invite.den;

  // Check if already a member
  const isMember = currentUser
    ? await prisma.denMember.findUnique({
        where: { denId_userId: { denId: den.id, userId: currentUser.id } },
      })
    : null;

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* OtakuDen branding */}
        <div className="text-center mb-8">
          <span className="text-4xl">🏯</span>
          <p className="text-[#949ba4] text-sm mt-2 font-medium">OtakuDen</p>
        </div>

        {/* Invite Card */}
        <div className="bg-[#313338] rounded-xl border border-[#232428] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Den Banner */}
          <div className={`h-20 bg-gradient-to-r ${den.banner || "from-indigo-600 to-slate-900"} flex items-end px-5 pb-3`}>
            <span className="text-3xl drop-shadow-lg">{den.icon || "⚔️"}</span>
          </div>

          {/* Card body */}
          <div className="px-6 py-5">
            <p className="text-xs text-[#949ba4] uppercase font-bold tracking-wide mb-1">
              You have been invited to join
            </p>
            <h1 className="text-2xl font-black text-white mb-1">{den.name}</h1>
            <p className="text-sm text-[#949ba4] leading-relaxed mb-4">
              {den.description}
            </p>

            {/* Stats row */}
            <div className="flex gap-4 mb-5">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-400 font-semibold">{den._count.members} Members</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-indigo-400 font-semibold">{den._count.posts} Posts</span>
              </div>
            </div>

            {isExpired ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-md p-3 text-center">
                <p className="text-rose-400 text-sm font-semibold">⚠️ This invite link has expired.</p>
              </div>
            ) : isMember ? (
              <form action={`/d/${den.slug}/general`}>
                <button
                  type="submit"
                  formAction={`/d/${den.slug}/general`}
                  className="w-full bg-[#23a55a] hover:bg-[#1e8f4e] text-white font-bold py-3 rounded-lg text-sm transition"
                >
                  ✓ Already a member — Go to Den
                </button>
              </form>
            ) : !currentUser ? (
              <div className="text-center text-sm text-[#949ba4]">
                <p>You need to register to join this Den.</p>
                <a href="/" className="text-indigo-400 hover:underline font-semibold mt-2 block">
                  Go to OtakuDen → Register
                </a>
              </div>
            ) : (
              <form
                action={async () => {
                  "use server";
                  const denResult = await joinDenWithInvite(token);
                  redirect(`/d/${denResult.slug}/general`);
                }}
              >
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg text-sm transition"
                >
                  Accept Invite & Join {den.name}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#6b7280] mt-6">
          By joining you agree to OtakuDen community guidelines.
        </p>
      </div>
    </div>
  );
}
