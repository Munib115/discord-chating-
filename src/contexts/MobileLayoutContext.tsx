"use client";

import React, { createContext, useContext, useState } from "react";

interface MobileLayoutContextType {
  isLeftOpen: boolean;
  isRightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftOpen: (val: boolean) => void;
  setRightOpen: (val: boolean) => void;
}

const MobileLayoutContext = createContext<MobileLayoutContextType | undefined>(undefined);

export function MobileLayoutProvider({ children }: { children: React.ReactNode }) {
  const [isLeftOpen, setLeftOpen] = useState(false);
  const [isRightOpen, setRightOpen] = useState(false);

  const toggleLeft = () => setLeftOpen((prev) => !prev);
  const toggleRight = () => setRightOpen((prev) => !prev);

  return (
    <MobileLayoutContext.Provider value={{ isLeftOpen, isRightOpen, toggleLeft, toggleRight, setLeftOpen, setRightOpen }}>
      {children}
    </MobileLayoutContext.Provider>
  );
}

export function useMobileLayout() {
  const context = useContext(MobileLayoutContext);
  if (!context) {
    throw new Error("useMobileLayout must be used inside MobileLayoutProvider");
  }
  return context;
}
