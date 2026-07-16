"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client dynamically from process env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabase = supabaseUrl.includes("placeholder") ? null! : createClient(supabaseUrl, supabaseAnonKey);

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
  flair?: string | null;
  bannerImage?: string | null;
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
      ...(formData.flair !== undefined ? { flair: formData.flair } : {}),
      ...(formData.bannerImage !== undefined ? { bannerImage: formData.bannerImage } : {}),
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

// ─────────────────────────────────────────────────────────────
// FEATURE: Custom Status Message
// ─────────────────────────────────────────────────────────────
export async function updateUserStatus(data: { statusEmoji: string; statusText: string }) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const emoji = data.statusEmoji.trim().slice(0, 2);
  const text = data.statusText.trim().slice(0, 80);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { statusEmoji: emoji, statusText: text },
  });

  if (supabase && user.supabaseUid) {
    try {
      await supabase.from("UserStatus").upsert([
        {
          userId: user.id,
          supabaseUid: user.supabaseUid,
          emoji,
          text,
          updatedAt: new Date().toISOString(),
        },
      ], { onConflict: "userId" });
    } catch (err) {
      console.error("Failed to sync status to Supabase:", err);
    }
  }

  revalidatePath("/");
  return updatedUser;
}

// ─────────────────────────────────────────────────────────────
// FEATURE: Den Invite Links
// ─────────────────────────────────────────────────────────────
export async function createDenInvite(denId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const den = await prisma.den.findUnique({ where: { id: denId } });
  if (!den) throw new Error("Den not found");

  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }

  const invite = await prisma.denInvite.create({
    data: {
      token,
      denId,
      createdBy: user.id,
      maxUses: 0,
    },
  });

  if (supabase) {
    try {
      await supabase.from("DenInvite").insert([
        {
          token: invite.token,
          denId: invite.denId,
          createdBy: invite.createdBy,
          maxUses: 0,
          uses: 0,
        },
      ]);
    } catch (err) {
      console.error("Failed to sync invite to Supabase:", err);
    }
  }

  return invite;
}

export async function joinDenWithInvite(token: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const invite = await prisma.denInvite.findUnique({
    where: { token },
    include: { den: true },
  });

  if (!invite) throw new Error("Invalid or expired invite link.");

  if (invite.maxUses && invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    throw new Error("This invite link has reached its maximum number of uses.");
  }

  await prisma.denMember.upsert({
    where: { denId_userId: { denId: invite.denId, userId: user.id } },
    update: {},
    create: { denId: invite.denId, userId: user.id },
  });

  await prisma.denInvite.update({
    where: { id: invite.id },
    data: { uses: invite.uses + 1 },
  });

  revalidatePath(`/d/${invite.den.slug}`);
  revalidatePath("/");

  return invite.den;
}

export async function getDenInvite(denId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  let invite = await prisma.denInvite.findFirst({
    where: { denId, createdBy: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!invite) {
    invite = await createDenInvite(denId);
  }

  return invite;
}

// ─────────────────────────────────────────────────────────────
// FEATURE: @Mention & Reply & Vote Notifications
// ─────────────────────────────────────────────────────────────
function extractMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_-]{2,25})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

async function createMentionNotifications(
  content: string,
  postId: number,
  authorId: number,
  authorUsername: string
) {
  const mentions = extractMentions(content);
  if (mentions.length === 0) return;

  for (const username of mentions) {
    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser || targetUser.id === authorId) continue;

    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: "mention",
        message: `@${authorUsername} mentioned you in a post`,
        link: `/posts/${postId}`,
        read: false,
      },
    });
  }
}

export async function getNotifications() {
  const user = await getLoggedInUser();
  if (!user) return [];

  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadNotificationCount() {
  const user = await getLoggedInUser();
  if (!user) return 0;

  return prisma.notification.count({
    where: { userId: user.id, read: false },
  });
}

export async function markNotificationsRead() {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────
// GAMIFICATION: XP, Levels, Streaks, Badges
// ─────────────────────────────────────────────────────────────
export async function addXP(userId: number, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newXP = user.xp + amount;
  let tempLevel = 1;
  let tempXpThreshold = 0;
  while (true) {
    const nextThreshold = Math.floor(100 * Math.pow(1.5, tempLevel - 1));
    if (newXP >= tempXpThreshold + nextThreshold) {
      tempXpThreshold += nextThreshold;
      tempLevel++;
    } else {
      break;
    }
  }

  const didLevelUp = tempLevel > user.level;

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: tempLevel,
    },
  });

  if (didLevelUp) {
    await prisma.notification.create({
      data: {
        userId,
        type: "badge",
        message: `🎉 Level Up! You reached Level ${tempLevel}!`,
        link: "/",
      },
    });
  }

  if (tempLevel >= 5) {
    await awardBadge(userId, "Rising Anime", "⚡");
  }
  if (tempLevel >= 10) {
    await awardBadge(userId, "Den Veteran", "⚔️");
  }

  revalidatePath("/");
}

export async function awardBadge(userId: number, badgeName: string, icon: string) {
  const existing = await prisma.userBadge.findFirst({
    where: { userId, name: badgeName },
  });

  if (!existing) {
    await prisma.userBadge.create({
      data: {
        userId,
        name: badgeName,
        icon,
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: "badge",
        message: `🎖️ New Badge Awarded: "${badgeName}" ${icon}!`,
        link: "/",
      },
    });
    revalidatePath("/");
  }
}

export async function handleDailyLogin() {
  const user = await getLoggedInUser();
  if (!user) return;

  const todayStr = new Date().toISOString().split("T")[0];
  if (user.lastLoginDate === todayStr) return;

  let newStreak = 1;
  if (user.lastLoginDate) {
    const lastDate = new Date(user.lastLoginDate);
    const today = new Date(todayStr);
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = user.loginStreak + 1;
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginStreak: newStreak,
      lastLoginDate: todayStr,
    },
  });

  await addXP(user.id, 5 + newStreak * 2);

  if (newStreak >= 7) {
    await awardBadge(user.id, "7-Day Streak", "🔥");
  }
  if (newStreak >= 30) {
    await awardBadge(user.id, "30-Day Streak", "💎");
  }

  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────
// FEATURE: Watch Party Rooms
// ─────────────────────────────────────────────────────────────
export async function createWatchPartyRoom(denId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const code = Math.random().toString(36).substring(2, 8).toLowerCase();

  const room = await prisma.watchPartyRoom.create({
    data: {
      roomCode: code,
      denId,
      hostId: user.id,
    },
  });

  revalidatePath("/");
  return room;
}

export async function updateWatchPartyUrl(roomCode: string, url: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { videoUrl: url },
  });

  revalidatePath(`/watch-party/${roomCode}`);
}

// ─────────────────────────────────────────────────────────────
// FEATURE: Polls
// ─────────────────────────────────────────────────────────────
export async function votePoll(pollId: number, optionIndex: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.pollVote.upsert({
    where: {
      pollId_userId: {
        pollId,
        userId: user.id,
      },
    },
    update: {
      optionIndex,
    },
    create: {
      pollId,
      userId: user.id,
      optionIndex,
    },
  });

  await addXP(user.id, 2);
}

// ─────────────────────────────────────────────────────────────
// FEATURE: Watchlist
// ─────────────────────────────────────────────────────────────
export async function updateWatchlist(formData: {
  animeName: string;
  status: string;
  episode?: number;
  rating?: number;
  notes?: string;
  animeImage?: string;
}) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.watchlistEntry.upsert({
    where: {
      userId_animeName: {
        userId: user.id,
        animeName: formData.animeName,
      },
    },
    update: {
      status: formData.status,
      episode: formData.episode ?? 0,
      rating: formData.rating || null,
      notes: formData.notes || null,
      animeImage: formData.animeImage || undefined,
    },
    create: {
      userId: user.id,
      animeName: formData.animeName,
      status: formData.status,
      episode: formData.episode ?? 0,
      rating: formData.rating || null,
      notes: formData.notes || null,
      animeImage: formData.animeImage || null,
    },
  });

  const totalWatchlist = await prisma.watchlistEntry.count({
    where: { userId: user.id },
  });

  if (totalWatchlist >= 10) {
    await awardBadge(user.id, "Anime Scholar", "📚");
  }

  revalidatePath("/");
}

export async function deleteWatchlistEntry(animeName: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.watchlistEntry.delete({
    where: {
      userId_animeName: {
        userId: user.id,
        animeName,
      },
    },
  });

  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────
// FEATURE: User Follow & Bookmarks & Reports
// ─────────────────────────────────────────────────────────────
export async function followUser(targetUserId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");
  if (user.id === targetUserId) throw new Error("Cannot follow yourself");

  await prisma.userFollow.upsert({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: targetUserId,
      },
    },
    update: {},
    create: {
      followerId: user.id,
      followingId: targetUserId,
    },
  });

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "follow",
      message: `👤 @${user.username} started following you!`,
      link: "/",
    },
  });

  const followCount = await prisma.userFollow.count({
    where: { followerId: user.id },
  });
  if (followCount >= 10) {
    await awardBadge(user.id, "Social Butterfly", "🦋");
  }

  revalidatePath("/");
}

export async function unfollowUser(targetUserId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.userFollow.deleteMany({
    where: {
      followerId: user.id,
      followingId: targetUserId,
    },
  });

  revalidatePath("/");
}

export async function bookmarkPost(postId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.savedPost.upsert({
    where: {
      userId_postId: {
        userId: user.id,
        postId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      postId,
    },
  });

  revalidatePath("/");
}

export async function unbookmarkPost(postId: number) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.savedPost.deleteMany({
    where: {
      userId: user.id,
      postId,
    },
  });

  revalidatePath("/");
}

export async function reportPost(postId: number, reason: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.postReport.upsert({
    where: {
      postId_userId: {
        postId,
        userId: user.id,
      },
    },
    update: {
      reason,
    },
    create: {
      postId,
      userId: user.id,
      reason,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// FEATURE: Den Management (Welcome & Rules)
// ─────────────────────────────────────────────────────────────
export async function updateDenWelcomeMessage(denId: number, welcomeMessage: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const den = await prisma.den.findUnique({ where: { id: denId } });
  if (!den || den.ownerId !== user.id) throw new Error("Only Den owners can do this");

  await prisma.den.update({
    where: { id: denId },
    data: { welcomeMessage },
  });

  revalidatePath(`/d/${den.slug}`);
}

export async function updateDenRules(denId: number, rules: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const den = await prisma.den.findUnique({ where: { id: denId } });
  if (!den || den.ownerId !== user.id) throw new Error("Only Den owners can do this");

  await prisma.den.update({
    where: { id: denId },
    data: { rules },
  });

  revalidatePath(`/d/${den.slug}`);
}

// ─────────────────────────────────────────────────────────────
// FEATURE: Message Reactions
// ─────────────────────────────────────────────────────────────
export async function toggleMessageReaction(messageId: string, channelId: number, emoji: string) {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: user.id,
        emoji,
      },
    },
  });

  if (existing) {
    await prisma.messageReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.messageReaction.create({
      data: {
        messageId,
        channelId,
        userId: user.id,
        emoji,
      },
    });
  }

  await addXP(user.id, 1);
}

export async function getReactionsForChannel(channelId: number) {
  return prisma.messageReaction.findMany({
    where: { channelId },
    include: { user: { select: { username: true } } },
  });
}

export async function searchAnimeFromJikan(query: string) {
  // Try AniList first (fast, robust, higher rate limits)
  try {
    const graphqlQuery = `
      query ($search: String) {
        Page(perPage: 10) {
          media(search: $search, type: ANIME) {
            id
            idMal
            title {
              english
              romaji
            }
            coverImage {
              medium
              large
            }
            description
            episodes
            trailer {
              id
              site
            }
          }
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query.trim() },
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const mediaList = json.data?.Page?.media || [];
      return mediaList.map((item: any) => ({
        mal_id: item.idMal || item.id,
        title: item.title.english || item.title.romaji || "Unknown Anime",
        images: {
          jpg: {
            image_url: item.coverImage.large || item.coverImage.medium || "",
            small_image_url: item.coverImage.medium || "",
          }
        },
        synopsis: item.description ? item.description.replace(/<[^>]*>/g, "") : "No synopsis available.",
        episodes: item.episodes,
        type: "TV",
        trailer: item.trailer?.site === "youtube" ? { url: `https://www.youtube.com/watch?v=${item.trailer.id}` } : null,
      }));
    }
  } catch (err) {
    console.error("AniList search failed, falling back to Jikan:", err);
  }

  // Fallback to Jikan API
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query.trim())}&limit=10`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch from Jikan: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error("Jikan API Server fetch error:", err);
    return [];
  }
}


