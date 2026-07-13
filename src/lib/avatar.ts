export function getAvatarEmoji(avatar: string) {
  switch (avatar) {
    case "luffy": return "🍖";
    case "zoro": return "⚔️";
    case "goku": return "⚡";
    case "sailor": return "🌙";
    case "deku": return "💥";
    default: return "👤";
  }
}

export function getAvatarBg(avatar: string) {
  switch (avatar) {
    case "luffy": return "bg-red-500/20 text-red-400 border-red-500/40";
    case "zoro": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    case "goku": return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    case "sailor": return "bg-pink-500/20 text-pink-400 border-pink-500/40";
    case "deku": return "bg-teal-500/20 text-teal-400 border-teal-500/40";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  }
}
