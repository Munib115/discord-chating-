import { prisma } from "@/lib/db";
import { getLoggedInUser } from "@/app/actions";
import { notFound } from "next/navigation";
import WatchPartyClient from "./WatchPartyClient";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roomCode } = await params;
  const room = await prisma.watchPartyRoom.findUnique({ where: { roomCode }, include: { den: true } });
  if (!room) return { title: "Watch Party — OtakuDen" };
  return { title: `Watch Party · ${room.den.name} | OtakuDen` };
}

export default async function WatchPartyPage({ params }: PageProps) {
  const { roomCode } = await params;
  const currentUser = await getLoggedInUser();
  if (!currentUser) notFound();

  const room = await prisma.watchPartyRoom.findUnique({
    where: { roomCode },
    include: {
      den: true,
      members: { include: { user: true } },
    },
  });

  if (!room) notFound();

  // Auto-join
  await prisma.watchPartyMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId: currentUser.id } },
    update: {},
    create: { roomId: room.id, userId: currentUser.id },
  });

  const isHost = room.hostId === currentUser.id;

  return (
    <WatchPartyClient
      room={room}
      currentUser={currentUser}
      denSlug={room.den.slug}
    />
  );
}
