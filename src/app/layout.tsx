import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/db";
import DenSidebar from "@/components/DenSidebar";
import { cn } from "@/lib/utils";
import { getLoggedInUser } from "@/app/actions";
import RegisterModal from "@/components/RegisterModal";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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

import { MobileLayoutProvider } from "@/contexts/MobileLayoutContext";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch Dens for the leftmost icon sidebar
  let dens: any[] = [];
  let currentUser: any = null;
  try {
    dens = await prisma.den.findMany({
      orderBy: { id: "asc" },
    });
  } catch {
    // DB may not exist during build/static generation
  }

  // Check if the current visitor has a registered identity
  try {
    currentUser = await getLoggedInUser();
  } catch {
    // DB may not exist during build/static generation
  }

  return (
    <html lang="en" className={cn("h-full antialiased dark", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('otakuden_theme');
                  if (theme) {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#1e1f22] text-[#dbdee1] h-screen max-h-screen flex overflow-hidden`}>
        <MobileLayoutProvider>
          {/* Registration gate — shown when no user cookie exists */}
          {!currentUser && <RegisterModal />}

          {/* Leftmost Den List (Permanent Sidebar) - Hidden on mobile, shown on md+ */}
          <div className="hidden md:flex flex-shrink-0">
            <DenSidebar dens={dens} />
          </div>
          
          {/* Child Pages (containing Channel sidebar and Main Content) */}
          <div className="flex flex-1 overflow-hidden min-w-0">
            {children}
          </div>
        </MobileLayoutProvider>
      </body>
    </html>
  );
}
