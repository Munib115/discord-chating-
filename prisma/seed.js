const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear DB
  console.log("Clearing existing database...");
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.denMember.deleteMany();
  await prisma.den.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating default users...");
  const luffy = await prisma.user.create({
    data: {
      username: "Luffy_PirateKing",
      avatar: "luffy",
      bio: "I'm going to be the King of the Pirates! 🍖",
    },
  });

  const zoro = await prisma.user.create({
    data: {
      username: "Zoro_Lost",
      avatar: "zoro",
      bio: "Nothing happened... ⚔️",
    },
  });

  const sailor = await prisma.user.create({
    data: {
      username: "SailorMoon",
      avatar: "sailor",
      bio: "In the name of the moon, I'll punish you! 🌙",
    },
  });

  const goku = await prisma.user.create({
    data: {
      username: "Goku_Saiyan",
      avatar: "goku",
      bio: "Hey, it's me, Goku! Let's fight! ⚡",
    },
  });

  const deku = await prisma.user.create({
    data: {
      username: "Deku_Hero",
      avatar: "deku",
      bio: "Go Beyond! Plus Ultra! 💥",
    },
  });

  console.log("Creating default Dens (forums)...");
  const shonen = await prisma.den.create({
    data: {
      name: "Shonen Central",
      slug: "shonen",
      description: "Discussion, theories, and fanart for action-packed Shonen anime and manga.",
      banner: "from-indigo-600 to-slate-900",
      icon: "⚔️",
      ownerId: luffy.id,
      passcode: "1234",
    },
  });

  const sliceOfLife = await prisma.den.create({
    data: {
      name: "Slice of Life & Chill",
      slug: "slice-of-life",
      description: "Cozy vibes only. Share your favorite comfort anime, romance, and school life series.",
      banner: "from-rose-500 to-slate-900",
      icon: "🌸",
      ownerId: sailor.id,
      passcode: "5678",
    },
  });

  const fantasy = await prisma.den.create({
    data: {
      name: "Isekai & Fantasy",
      slug: "fantasy",
      description: "Reborn in another world? Discuss magic systems, demon lords, and fantasy worlds here.",
      banner: "from-emerald-600 to-slate-900",
      icon: "🔮",
      ownerId: goku.id,
      passcode: "9999",
    },
  });

  const gaming = await prisma.den.create({
    data: {
      name: "Anime Gaming",
      slug: "gaming",
      description: "For players of Genshin Impact, Honkai Star Rail, anime fighters, and visual novels.",
      banner: "from-purple-600 to-slate-900",
      icon: "🎮",
      ownerId: deku.id,
      passcode: "0000",
    },
  });

  console.log("Seeding Den Memberships...");
  // Seed Shonen Central memberships (everyone is a member initially)
  const members = [luffy, zoro, goku, sailor, deku];
  for (const user of members) {
    await prisma.denMember.create({
      data: { denId: shonen.id, userId: user.id },
    });
  }

  // Seed Slice of Life memberships
  await prisma.denMember.create({
    data: { denId: sliceOfLife.id, userId: sailor.id },
  });
  await prisma.denMember.create({
    data: { denId: sliceOfLife.id, userId: luffy.id },
  });

  // Seed Fantasy membership
  await prisma.denMember.create({
    data: { denId: fantasy.id, userId: goku.id },
  });

  // Seed Gaming membership
  await prisma.denMember.create({
    data: { denId: gaming.id, userId: deku.id },
  });

  console.log("Creating default channels...");
  // Channels inside Shonen Central
  const shonenGeneral = await prisma.channel.create({
    data: { name: "general", slug: "general", denId: shonen.id },
  });
  const shonenTheories = await prisma.channel.create({
    data: { name: "theories", slug: "theories", denId: shonen.id },
  });
  const shonenManga = await prisma.channel.create({
    data: { name: "manga-spoilers", slug: "manga-spoilers", denId: shonen.id },
  });
  const shonenVoice = await prisma.channel.create({
    data: { name: "Voice Lobby", slug: "voice-lobby", type: "VOICE", denId: shonen.id },
  });

  // Channels inside Slice of Life
  const solGeneral = await prisma.channel.create({
    data: { name: "general", slug: "general", denId: sliceOfLife.id },
  });
  const solRecommendations = await prisma.channel.create({
    data: { name: "recommendations", slug: "recommendations", denId: sliceOfLife.id },
  });
  const solVoice = await prisma.channel.create({
    data: { name: "cozy-music-room", slug: "cozy-music-room", type: "VOICE", denId: sliceOfLife.id },
  });

  // Channels inside Fantasy
  const fanGeneral = await prisma.channel.create({
    data: { name: "general", slug: "general", denId: fantasy.id },
  });
  const fanVoice = await prisma.channel.create({
    data: { name: "magical-meeting", slug: "magical-meeting", type: "VOICE", denId: fantasy.id },
  });

  // Channels inside Gaming
  const gamingGeneral = await prisma.channel.create({
    data: { name: "general", slug: "general", denId: gaming.id },
  });
  const gamingVoice = await prisma.channel.create({
    data: { name: "co-op-party", slug: "co-op-party", type: "VOICE", denId: gaming.id },
  });

  console.log("Creating default posts...");
  // Posts inside Shonen Central
  const post1 = await prisma.post.create({
    data: {
      title: "Who wins: Gear 5 Luffy or Mastered Ultra Instinct Goku?",
      content: "Let's settle this once and for all. Luffy has absolute cartoon physics freedom, but Goku has galaxy-shattering combat speed and god ki. Who takes it in a serious fight?",
      tags: "Discussion,VS Battle",
      authorId: goku.id,
      denId: shonen.id,
      channelId: shonenGeneral.id,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "One Piece Chapter 1120 Spoilers & Discussion Thread",
      content: "The latest chapter just dropped! The revelations about the Void Century are getting insane. What do you think the Giant Robot's final message means?",
      tags: "Spoilers,Manga",
      authorId: luffy.id,
      denId: shonen.id,
      channelId: shonenManga.id,
    },
  });

  // Posts inside Slice of Life
  const post3 = await prisma.post.create({
    data: {
      title: "Looking for comfort anime recommendations like Frieren",
      content: "Just finished Frieren: Beyond Journey's End and I feel an empty void in my chest. I need something beautiful, slightly melancholic, with cozy music and high production values. Help!",
      tags: "Recommendations,Help",
      authorId: sailor.id,
      denId: sliceOfLife.id,
      channelId: solRecommendations.id,
    },
  });

  console.log("Creating comments...");
  // Comments for Luffy vs Goku post
  const comment1 = await prisma.comment.create({
    data: {
      content: "Luffy's Gear 5 is fun, but Goku can literally destroy the planet from space. Luffy still needs air to breathe! Goku wins easily.",
      postId: post1.id,
      authorId: zoro.id,
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      content: "Hey, Zoro! I can just grab the planet and turn it into rubber, then jump back up! 🍖",
      postId: post1.id,
      authorId: luffy.id,
      parentId: comment1.id,
    },
  });

  const comment3 = await prisma.comment.create({
    data: {
      content: "Let's all just eat some food and train together instead of fighting. But if we did fight, it would be awesome!",
      postId: post1.id,
      authorId: goku.id,
    },
  });

  console.log("Creating votes...");
  // Votes
  await prisma.vote.create({
    data: { value: 1, userId: luffy.id, postId: post1.id },
  });
  await prisma.vote.create({
    data: { value: 1, userId: sailor.id, postId: post1.id },
  });
  await prisma.vote.create({
    data: { value: -1, userId: zoro.id, postId: post1.id },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
