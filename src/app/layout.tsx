import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/db";
import DenSidebar from "@/components/DenSidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OtakuDen - Premium Anime Community Forum",
  description: "The ultimate discussion forum for anime and manga enthusiasts. Join themed chambers, participate in threads, share fan art, and connect with other Otakus.",
  metadataBase: new URL("https://otakuden.example.com"),
  openGraph: {
    title: "OtakuDen - Premium Anime Community Forum",
    description: "The ultimate discussion forum for anime and manga enthusiasts. Join themed chambers, participate in threads, share fan art, and connect with other Otakus.",
    siteName: "OtakuDen",
    locale: "en_US",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch Dens for the leftmost icon sidebar
  const dens = await prisma.den.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${inter.className} bg-[#1e1f22] text-[#dbdee1] min-h-screen flex overflow-hidden`}>
        {/* Leftmost Den List (Permanent Sidebar) */}
        <DenSidebar dens={dens} />
        
        {/* Child Pages (containing Channel sidebar and Main Content) */}
        <div className="flex flex-1 overflow-hidden min-w-0">
          {children}
        </div>
      </body>
    </html>
  );
}
