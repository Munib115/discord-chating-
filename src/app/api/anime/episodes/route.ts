import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fetch episode list using AnimeUnity (direct import)
export async function GET(req: NextRequest) {
  const animeId = req.nextUrl.searchParams.get("id");
  if (!animeId) {
    return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
  }

  try {
    const AnimeUnity = (await import("@consumet/extensions/dist/providers/anime/animeunity")).default;
    const animeUnity = new AnimeUnity();
    const info = await animeUnity.fetchAnimeInfo(animeId);

    return NextResponse.json({
      id: info.id,
      title: info.title,
      image: info.image,
      description: info.description,
      totalEpisodes: info.totalEpisodes,
      genres: info.genres,
      releaseDate: info.releaseDate,
      status: info.status,
      subOrDub: info.subOrDub,
      episodes: (info.episodes || []).map((ep: any) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        url: ep.url,
      })),
    });
  } catch (error: any) {
    console.error("Episode info error:", error);
    return NextResponse.json(
      { error: "Failed to fetch episode info", details: error.message },
      { status: 500 }
    );
  }
}
