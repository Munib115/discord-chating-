"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Custom Mock Session Manager
export async function getLoggedInUser() {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get("current_user_id")?.value;
  
  if (userIdStr) {
    const userId = parseInt(userIdStr, 10);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (user) return user;
  }

  // Fallback to first user in database if none is selected
  const defaultUser = await prisma.user.findFirst();
  return defaultUser;
}

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { username: "asc" },
  });
}

export async function switchUser(userId: number) {
  const cookieStore = await cookies();
  cookieStore.set("current_user_id", userId.toString(), { path: "/" });
  revalidatePath("/");
}

export async function createPost(formData: {
  title: string;
  content: string;
  imageUrl?: string;
  tags: string;
  denId: number;
  channelId: number;
}) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const post = await prisma.post.create({
    data: {
      title: formData.title,
      content: formData.content,
      imageUrl: formData.imageUrl || null,
      tags: formData.tags || "Discussion",
      authorId: user.id,
      denId: formData.denId,
      channelId: formData.channelId,
    },
    include: {
      den: true,
      channel: true,
    }
  });

  revalidatePath(`/d/${post.den.slug}/${post.channel.slug}`);
  revalidatePath("/");
  return post;
}

export async function createComment(formData: {
  content: string;
  postId: number;
  parentId?: number;
}) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const comment = await prisma.comment.create({
    data: {
      content: formData.content,
      postId: formData.postId,
      authorId: user.id,
      parentId: formData.parentId || null,
    },
    include: {
      post: {
        include: {
          den: true,
          channel: true
        }
      }
    }
  });

  revalidatePath(`/posts/${formData.postId}`);
  revalidatePath(`/d/${comment.post.den.slug}/${comment.post.channel.slug}`);
  return comment;
}

export async function votePost(postId: number, value: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  // Check if vote already exists
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_postId: {
        userId: user.id,
        postId: postId,
      },
    },
  });

  if (existingVote) {
    if (existingVote.value === value) {
      // Retract vote if clicking same button again
      await prisma.vote.delete({
        where: { id: existingVote.id },
      });
    } else {
      // Change vote value if clicking other button
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { value: value },
      });
    }
  } else {
    // Create new vote
    await prisma.vote.create({
      data: {
        value: value,
        userId: user.id,
        postId: postId,
      },
    });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { den: true, channel: true },
  });

  if (post) {
    revalidatePath(`/d/${post.den.slug}/${post.channel.slug}`);
    revalidatePath(`/posts/${postId}`);
    revalidatePath("/");
  }
}

export async function createDen(formData: {
  name: string;
  description: string;
  icon: string;
}) {
  const slug = formData.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const bannerGradients = [
    "from-indigo-600 to-slate-900",
    "from-rose-500 to-slate-900",
    "from-emerald-600 to-slate-900",
    "from-purple-600 to-slate-900",
    "from-amber-600 to-slate-900",
    "from-cyan-600 to-slate-900"
  ];
  const randomBanner = bannerGradients[Math.floor(Math.random() * bannerGradients.length)];

  const den = await prisma.den.create({
    data: {
      name: formData.name,
      slug: slug,
      description: formData.description,
      banner: randomBanner,
      icon: formData.icon,
    },
  });

  // Create a default general channel
  await prisma.channel.create({
    data: {
      name: "general",
      slug: "general",
      denId: den.id,
    },
  });

  revalidatePath("/");
  return den;
}

export async function createChannel(formData: {
  name: string;
  denId: number;
}) {
  const slug = formData.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const den = await prisma.den.findUnique({
    where: { id: formData.denId }
  });

  if (!den) throw new Error("Den not found");

  const channel = await prisma.channel.create({
    data: {
      name: formData.name.toLowerCase().trim().replace(/\s+/g, "-"),
      slug: slug,
      denId: formData.denId,
    },
  });

  revalidatePath(`/d/${den.slug}`);
  return channel;
}
