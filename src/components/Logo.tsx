import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Speech Bubble Base Outer Shape */}
      <path
        d="M15 20C15 11.7157 21.7157 5 30 5H70C78.2843 5 85 11.7157 85 20V60C85 68.2843 78.2843 75 70 75H40L20 90V75C17.1634 75 15 72.8366 15 70V20Z"
        fill="currentColor"
        className="text-indigo-600 dark:text-indigo-500"
      />
      {/* Japanese Torii Gate Inner Shape in White */}
      {/* Curved Kasagi (Top Lintel) */}
      <path
        d="M28 25C38 23.2 62 23.2 72 25C75 25.6 76 27.5 76 28.5V31H24V28.5C24 27.5 25 25.6 28 25Z"
        fill="white"
      />
      {/* Shimaki/Nuki (Horizontal bar) */}
      <rect x="28" y="34" width="44" height="4" fill="white" />
      {/* Left Pillar */}
      <path d="M37 34V60C37 61 38 62 39 62H42C43 62 44 61 44 60V34H37Z" fill="white" />
      {/* Right Pillar */}
      <path d="M56 34V60C56 61 57 62 58 62H61C62 62 63 61 63 60V34H56Z" fill="white" />
      {/* Center Gakuzuka (Small vertical block) */}
      <rect x="48" y="29" width="4" height="5" fill="white" />
    </svg>
  );
}
