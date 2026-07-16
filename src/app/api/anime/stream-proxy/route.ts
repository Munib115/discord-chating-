import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

// Streaming proxy using axios (which matches the exact HTTP signature of the working AnimeUnity client)
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(urlParam);

  try {
    // Request using axios, matching the signature that succeeds in node tests
    const response = await axios.get(decodedUrl, {
      responseType: "arraybuffer", // Handle binary data (.ts segments) and text (.m3u8) properly
      validateStatus: () => true, // Do not throw error on non-200 responses
    });

    if (response.status !== 200) {
      return new Response(`Target server responded with ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers["content-type"] || "";

    // If it's an HLS playlist (.m3u8), we parse and rewrite the segment/key URLs
    if (
      contentType.includes("mpegurl") ||
      contentType.includes("mpegURL") ||
      decodedUrl.includes(".m3u8")
    ) {
      // Decode arraybuffer to string for playlist manipulation
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(response.data);
      const lines = text.split("\n");

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Ignore comments except key URI lines
        if (trimmed.startsWith("#")) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const absoluteUri = resolveUrl(decodedUrl, uri);
              return `URI="/api/anime/stream-proxy?url=${encodeURIComponent(absoluteUri)}"`;
            });
          }
          return line;
        }

        // Rewrite relative/absolute segment URLs to go through our proxy
        const absoluteSegmentUrl = resolveUrl(decodedUrl, trimmed);
        return `/api/anime/stream-proxy?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      return new Response(rewrittenLines.join("\n"), {
        headers: {
          "Content-Type": "application/x-mpegURL",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Direct binary stream (.ts segments)
    return new Response(response.data, {
      headers: {
        "Content-Type": contentType || "video/MP2T",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Stream proxy error:", error);
    return new Response(`Proxy Error: ${error.message}`, { status: 500 });
  }
}

function resolveUrl(baseUrl: string, relativeUrl: string): string {
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }
  const url = new URL(relativeUrl, baseUrl);
  return url.toString();
}
