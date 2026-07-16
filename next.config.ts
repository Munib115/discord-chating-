import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@consumet/extensions",
    "got-scraping",
    "cheerio",
  ],
};

export default nextConfig;
