import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://otakuden.example.com";

  // Base index route
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
  ];

  try {
    // Dynamic channel views
    const channels = await prisma.channel.findMany({
      include: { den: true },
    });

    channels.forEach((c) => {
      routes.push({
        url: `${baseUrl}/d/${c.den.slug}/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "hourly" as const,
        priority: 0.8,
      });
    });

    // Dynamic thread views
    const posts = await prisma.post.findMany();

    posts.forEach((p) => {
      routes.push({
        url: `${baseUrl}/posts/${p.id}`,
        lastModified: p.updatedAt || new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }

  return routes;
}
