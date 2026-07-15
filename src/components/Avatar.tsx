"use client";

import { getAvatarBg, getAvatarEmoji, getAvatarUrl } from "@/lib/avatar";

interface AvatarProps {
  avatar: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({ avatar, className = "w-8 h-8", style }: AvatarProps) {
  const url = getAvatarUrl(avatar);
  const bg = getAvatarBg(avatar);
  const emoji = getAvatarEmoji(avatar);

  return (
    <div className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border ${bg} ${className}`} style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Avatar"
          className="w-full h-full object-cover select-none pointer-events-none"
          onError={(e) => {
            // Fallback to emoji if image fails to load
            (e.target as HTMLElement).style.display = "none";
            const parent = (e.target as HTMLElement).parentElement;
            if (parent) {
              const span = document.createElement("span");
              span.innerText = emoji;
              parent.appendChild(span);
            }
          }}
        />
      ) : (
        <span className="select-none">{emoji}</span>
      )}
    </div>
  );
}
