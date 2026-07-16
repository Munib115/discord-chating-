"use client";

import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const initial = saved || "dark";
    setTheme(initial);
    document.documentElement.className = initial;
  }, []);

  const handleToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.className = next;
  };

  return (
    <button
      onClick={handleToggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition select-none flex items-center justify-center shrink-0"
    >
      <span className="text-sm">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
