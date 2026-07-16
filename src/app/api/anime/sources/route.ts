import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fetch direct streaming sources (m3u8) for a specific episode using AnimeUnity
// Wraps URLs with our stream-proxy to bypass Referer headers and CORS restrictions
export async function GET(req: NextRequest) {
  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if (!episodeId) {
    return NextResponse.json({ error: "Missing 'episodeId' parameter" }, { status: 400 });
  }

  try {
    const AnimeUnity = (await import("@consumet/extensions/dist/providers/anime/animeunity")).default;
    const animeUnity = new AnimeUnity();
    const sources = await animeUnity.fetchEpisodeSources(episodeId);

    if (!sources || !sources.sources || sources.sources.length === 0) {
      return NextResponse.json(
        { error: "No streaming sources found for this episode" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sources: sources.sources.map((s: any) => {
        const originalUrl = s.url;
        // Wrap the HLS playlist URL with our server-side referer/CORS proxy
        const proxiedUrl = `/api/anime/stream-proxy?url=${encodeURIComponent(originalUrl)}`;

        return {
          url: proxiedUrl,
          originalUrl: originalUrl,
          quality: s.quality || "default",
          isM3U8: s.isM3U8 ?? originalUrl?.includes(".m3u8"),
        };
      }),
      headers: sources.headers || {},
      subtitles: sources.subtitles || [],
    });
  } catch (error: any) {
    console.error("Streaming sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streaming sources", details: error.message },
      { status: 500 }
    );
  }
}
