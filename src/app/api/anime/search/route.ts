import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Server-side anime search using AnimeUnity (direct import to avoid broken AnimeSama)
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    // Direct import to avoid loading broken AnimeSama provider
    const AnimeUnity = (await import("@consumet/extensions/dist/providers/anime/animeunity")).default;
    const animeUnity = new AnimeUnity();
    const results = await animeUnity.search(query);

    if (!results.results || results.results.length === 0) {
      return NextResponse.json({ results: [], provider: "animeunity" });
    }

    return NextResponse.json({
      provider: "animeunity",
      results: results.results.slice(0, 20).map((r: any) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        cover: r.cover,
        rating: r.rating,
        releaseDate: r.releaseDate,
        subOrDub: r.subOrDub || "sub",
        type: r.type,
        url: r.url,
      })),
    });
  } catch (error: any) {
    console.error("Anime search error:", error);
    return NextResponse.json(
      { error: "Failed to search anime", details: error.message },
      { status: 500 }
    );
  }
}
