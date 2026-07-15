"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client dynamically from process env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  // No cookie or invalid cookie — user must register
  return null;
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

export async function registerNewUser(data: {
  username: string;
  avatar: string;
}) {
  const cleanUsername = data.username.trim();
  if (!cleanUsername) throw new Error("Username cannot be empty");
  if (cleanUsername.length < 2) throw new Error("Username must be at least 2 characters");
  if (cleanUsername.length > 25) throw new Error("Username must be 25 characters or less");

  // Check if username is already taken
  const existing = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });
  if (existing) {
    throw new Error("That username is already taken. Try another one!");
  }

  // Generate a unique 4-digit discriminator
  let discriminator = String(Math.floor(1000 + Math.random() * 9000));
  for (let i = 0; i < 10; i++) {
    const discExists = await prisma.user.findFirst({
      where: { username: cleanUsername, discriminator },
    });
    if (!discExists) break;
    discriminator = String(Math.floor(1000 + Math.random() * 9000));
  }

  // Save avatar as is (preset keys, custom urls, or base64 data)
  const avatar = data.avatar || "default";

  // Create new user
  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      discriminator,
      avatar,
      bio: "",
    },
  });

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set("current_user_id", user.id.toString(), { path: "/" });

  revalidatePath("/");
  return user;
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
  passcode?: string;
}) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");



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
  const passcode = formData.passcode?.trim() || "1234";

  const den = await prisma.den.create({
    data: {
      name: formData.name,
      slug: slug,
      description: formData.description,
      banner: randomBanner,
      icon: formData.icon,
      ownerId: user.id,
      passcode: passcode,
    },
  });

  // Automatically join the Den as creator
  await prisma.denMember.create({
    data: {
      denId: den.id,
      userId: user.id,
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

  // Save community creator tracking row + passcode to cloud Supabase
  if (supabaseUrl && supabaseAnonKey && user.supabaseUid) {
    try {
      // 1. Insert into CommunityCreator
      await supabase.from("CommunityCreator").insert([
        {
          denId: den.id,
          denSlug: den.slug,
          ownerId: user.id,
          supabaseUid: user.supabaseUid,
        }
      ]);

      // 2. Upsert into Den table so passcode is persisted in the cloud
      await supabase.from("Den").upsert([
        {
          id: den.id,
          name: den.name,
          slug: den.slug,
          description: den.description,
          icon: den.icon,
          ownerId: den.ownerId,
          passcode: passcode,
        }
      ], { onConflict: "id" });
    } catch (err) {
      console.error("Failed to sync Den to Supabase:", err);
    }
  }

  revalidatePath("/");
  return den;
}

export async function createChannel(formData: {
  name: string;
  denId: number;
  type?: string;
  password?: string;
}) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const den = await prisma.den.findUnique({
    where: { id: formData.denId }
  });

  if (!den) throw new Error("Den not found");

  // Verify that the current user is the owner (admin)
  if (den.ownerId !== user.id) {
    throw new Error("Only the Den creator (admin) can create channels.");
  }

  const slug = formData.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const channel = await prisma.channel.create({
    data: {
      name: formData.name.toLowerCase().trim().replace(/\s+/g, "-"),
      slug: slug,
      type: formData.type || "TEXT",
      denId: formData.denId,
      password: formData.password || null,
    },
  });

  revalidatePath(`/d/${den.slug}`);
  return channel;
}

export async function joinDenWithPasscode(denId: number, passcode: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Check local SQLite first
  const den = await prisma.den.findUnique({ where: { id: denId } });
  if (!den) throw new Error("Community not found.");

  const inputCode = passcode.trim();
  let isValid = den.passcode === inputCode;

  // 2. If local check fails, fallback to Supabase cloud Den table
  if (!isValid && supabaseUrl && supabaseAnonKey) {
    try {
      const { data, error } = await supabase
        .from("Den")
        .select("passcode")
        .eq("id", denId)
        .single();

      if (!error && data?.passcode) {
        isValid = data.passcode === inputCode;
        // Sync correct passcode back to local SQLite for future lookups
        if (isValid) {
          await prisma.den.update({
            where: { id: denId },
            data: { passcode: data.passcode },
          });
        }
      }
    } catch (err) {
      console.error("Supabase passcode fallback error:", err);
    }
  }

  if (!isValid) {
    throw new Error("Invalid passcode. Please ask the community admin for the correct code.");
  }

  // Create membership (upsert to avoid duplicate errors)
  await prisma.denMember.upsert({
    where: { denId_userId: { denId, userId: user.id } },
    update: {},
    create: { denId, userId: user.id },
  });

  revalidatePath(`/d/${den.slug}`);
  revalidatePath("/");
}

export async function kickUserFromDen(denId: number, userId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const den = await prisma.den.findUnique({
    where: { id: denId },
  });

  if (!den) throw new Error("Den not found");

  // Verify that the current user is the owner
  if (den.ownerId !== user.id) {
    throw new Error("Only the Den creator (admin) can kick members.");
  }

  // Delete the membership record
  await prisma.denMember.delete({
    where: {
      denId_userId: {
        denId: denId,
        userId: userId,
      },
    },
  });

  revalidatePath(`/d/${den.slug}`);
  revalidatePath("/");
}

export async function updateUserProfile(formData: {
  username: string;
  bio: string;
  avatar?: string;
}) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const cleanUsername = formData.username.trim();
  const cleanBio = formData.bio.trim();

  if (!cleanUsername) throw new Error("Username cannot be empty");

  // Check if username is already taken by another user
  const existing = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });

  if (existing && existing.id !== user.id) {
    throw new Error("Username is already taken");
  }

  // Update user in database
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      username: cleanUsername,
      bio: cleanBio,
      ...(formData.avatar !== undefined ? { avatar: formData.avatar } : {}),
    },
  });

  revalidatePath("/");
  return updatedUser;
}

export async function forwardMessageToDiscord(username: string, content: string, avatarEmoji?: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const isAudio = content.startsWith("data:audio/");
    const isImage = content.startsWith("img:");
    let text = content;
    if (isAudio) text = "🎙️ sent a voice note";
    else if (isImage) text = `🖼️ sent an image: ${content.replace("img:", "")}`;

    // Forward using the sender's username directly, removing the generic "OtakuDen Bot" persona
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: text,
        username: `${avatarEmoji ? avatarEmoji + " " : ""}${username}`,
      }),
    });
  } catch (err) {
    console.error("Error forwarding message to Discord webhook:", err);
  }
}

export async function registerOrLinkSupabaseUser(data: {
  email: string;
  supabaseUid: string;
}) {
  // 1. Check if a user with this supabaseUid already exists
  let user = await prisma.user.findUnique({
    where: { supabaseUid: data.supabaseUid },
  });

  if (!user) {
    // 2. Determine a unique username
    let baseUsername = data.email.split("@")[0];
    baseUsername = baseUsername.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!baseUsername) baseUsername = "Otaku";

    let finalUsername = baseUsername;
    while (true) {
      const exists = await prisma.user.findUnique({
        where: { username: finalUsername },
      });
      if (!exists) break;
      finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 3. Generate a unique 4-digit discriminator (Discord-style #XXXX)
    let discriminator = String(Math.floor(1000 + Math.random() * 9000));
    // Retry if discriminator+username combo is already taken (edge case)
    for (let i = 0; i < 10; i++) {
      const discExists = await prisma.user.findFirst({
        where: { username: finalUsername, discriminator },
      });
      if (!discExists) break;
      discriminator = String(Math.floor(1000 + Math.random() * 9000));
    }

    // 4. Select a random avatar
    const avatars = ["luffy", "zoro", "sailor", "goku", "deku", "default"];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    // 5. Create the new user profile in SQLite
    user = await prisma.user.create({
      data: {
        username: finalUsername,
        discriminator,
        avatar: randomAvatar,
        email: data.email,
        supabaseUid: data.supabaseUid,
        bio: "New member joined!",
      },
    });
  }

  // 5. Update session cookie
  const cookieStore = await cookies();
  cookieStore.set("current_user_id", user.id.toString(), { path: "/" });

  revalidatePath("/");
  return user;
}

export async function disconnectSupabaseUser(userId: number) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: null,
      supabaseUid: null,
    },
  });
  revalidatePath("/");
  return updatedUser;
}

export async function joinChannel(channelId: number, passwordInput?: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { den: true },
  });

  if (!channel) throw new Error("Channel not found");

  // Check if password is correct (if password is set)
  if (channel.password && channel.password.trim() !== "") {
    if (!passwordInput || passwordInput.trim() !== channel.password.trim()) {
      throw new Error("Incorrect channel password!");
    }
  }

  const member = await prisma.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId,
        userId: user.id,
      },
    },
    update: {},
    create: {
      channelId,
      userId: user.id,
    },
  });

  revalidatePath(`/d/${channel.den.slug}/${channel.slug}`);
  revalidatePath(`/d/${channel.den.slug}`);

  return member;
}

