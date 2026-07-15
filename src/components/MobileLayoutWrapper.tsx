"use client";

import React, { useEffect } from "react";
import { useMobileLayout } from "@/contexts/MobileLayoutContext";
import DenSidebar from "@/components/DenSidebar";
import { usePathname } from "next/navigation";

interface MobileLayoutWrapperProps {
  channelSidebar: React.ReactNode;
  memberList: React.ReactNode;
  children: React.ReactNode;
  channelName: string;
  denName: string;
  denIcon: string;
  isChatMode: boolean;
  dens: any[];
}

export default function MobileLayoutWrapper({
  channelSidebar,
  memberList,
  children,
  channelName,
  denName,
  denIcon,
  isChatMode,
  dens,
}: MobileLayoutWrapperProps) {
  const { isLeftOpen, isRightOpen, toggleLeft, toggleRight, setLeftOpen, setRightOpen } = useMobileLayout();
  const pathname = usePathname();

  // Close drawers when user changes active channels/navigation paths
  useEffect(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, [pathname, setLeftOpen, setRightOpen]);

  return (
    <div className="flex flex-1 overflow-hidden min-w-0 relative">
      {/* 1. Mobile Left Drawer Overlay Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200 md:hidden ${
          isLeftOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setLeftOpen(false)}
      />

      {/* Mobile Left Drawer Container */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-row transition-transform duration-200 ease-in-out md:hidden ${
          isLeftOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Leftmost Den switcher */}
        <div className="w-[72px] flex-shrink-0 bg-[#1e1f22] flex flex-col items-center py-3 border-r border-[#151618] h-full overflow-y-auto no-scrollbar">
          <DenSidebar dens={dens} />
        </div>
        {/* Channels sidebar */}
        <div className="w-60 h-full flex-shrink-0 bg-[#2b2d31]">
          <React.Fragment key="mobile-sidebar-fragment">
            {channelSidebar}
          </React.Fragment>
        </div>
      </div>

      {/* 2. Desktop Inline Channel Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <React.Fragment key="desktop-sidebar-fragment">
          {channelSidebar}
        </React.Fragment>
      </div>

      {/* 3. Main Chat Feed Area */}
      <main className="flex-1 bg-[#313338] flex overflow-hidden min-w-0 flex-col h-full relative">
        {/* Mobile Header Bar */}
        <header className="h-12 bg-[#313338] border-b border-[#232428] flex items-center justify-between px-4 flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            {/* Hamburger button */}
            <button
              onClick={toggleLeft}
              className="p-1.5 text-[#949ba4] hover:text-white rounded hover:bg-[#35373c]/50 md:hidden"
              title="Open Navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xl font-semibold text-[#80848e]">#</span>
              <h2 className="text-base font-bold text-white truncate leading-none">
                {channelName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Members button (mobile/tablet only toggle) */}
            <button
              onClick={toggleRight}
              className="p-1.5 text-[#949ba4] hover:text-white rounded hover:bg-[#35373c]/50 lg:hidden"
              title="Toggle Members List"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Inner Chat Feed Area */}
        <div className="flex-1 flex overflow-hidden min-w-0 relative">
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {children}
          </div>

          {/* 4. Mobile Right Drawer Overlay Backdrop */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200 lg:hidden ${
              isRightOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setRightOpen(false)}
          />

          <div
            className={`fixed top-0 bottom-0 right-0 z-50 w-64 bg-[#2b2d31] flex flex-col border-l border-[#232428] transition-transform duration-200 ease-in-out lg:hidden ${
              isRightOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Mobile Members List Header */}
            <div className="h-12 border-b border-[#232428] flex items-center justify-between px-4 flex-shrink-0 select-none">
              <span className="font-bold text-white text-sm">Channel Info</span>
              <button
                onClick={() => setRightOpen(false)}
                className="p-1 text-[#949ba4] hover:text-white hover:bg-[#35373c]/50 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Mobile member list content wrapper */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
              <div key="mobile-about-card" className="bg-[#2b2d31] rounded-md border border-[#232428] overflow-hidden select-none">
                <div className={`h-12 bg-gradient-to-r from-indigo-600 to-slate-900 p-3 flex justify-between items-start`}>
                  <span className="text-2xl">{denIcon || "⚔️"}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white">About d/{denName}</h3>
                  <p className="text-xs text-[#b5bac1] leading-relaxed mt-1.5">
                    Welcome to the {denName} chamber.
                  </p>
                </div>
              </div>
              <React.Fragment key="mobile-members-fragment">
                {memberList}
              </React.Fragment>
            </div>
          </div>

          {/* 5. Desktop Right Sidebar (Hidden on mobile/tablet, inline on desktop/laptop) */}
          <aside className="w-64 border-l border-[#232428] bg-[#2b2d31]/30 hidden lg:flex flex-col p-4 gap-4 overflow-y-auto no-scrollbar select-none">
            {/* About Card */}
            <div key="desktop-about-card" className="bg-[#2b2d31] rounded-md border border-[#232428] overflow-hidden">
              <div className={`h-12 bg-gradient-to-r from-indigo-600 to-slate-900 p-3 flex justify-between items-start`}>
                <span className="text-2xl">{denIcon || "⚔️"}</span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-white">About d/{denName}</h3>
                <p className="text-xs text-[#b5bac1] leading-relaxed mt-1.5">
                  Welcome to the {denName} chamber.
                </p>
              </div>
            </div>

            <React.Fragment key="desktop-members-fragment">
              {memberList}
            </React.Fragment>
          </aside>
        </div>
      </main>
    </div>
  );
}
