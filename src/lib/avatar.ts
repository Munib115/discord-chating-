export function getAvatarEmoji(avatar: string) {
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:image/")
  ) {
    return "👤";
  }
  switch (avatar) {
    case "luffy": return "🍖";
    case "zoro": return "⚔️";
    case "goku": return "⚡";
    case "vegeta": return "👑";
    case "naruto": return "🦊";
    case "sasuke": return "👁️";
    case "kakashi": return "📕";
    case "tanjiro": return "🌊";
    case "nezuko": return "🎋";
    case "eren": return "🕊️";
    case "sailor": return "🌙";
    case "deku": return "💥";
    default: return "👤";
  }
}

export function getAvatarBg(avatar: string) {
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:image/")
  ) {
    return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  }
  switch (avatar) {
    case "luffy": return "bg-red-500/20 text-red-400 border-red-500/40";
    case "zoro": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    case "goku": return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    case "vegeta": return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    case "naruto": return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    case "sasuke": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    case "kakashi": return "bg-slate-500/20 text-slate-400 border-slate-500/40";
    case "tanjiro": return "bg-teal-500/20 text-teal-400 border-teal-500/40";
    case "nezuko": return "bg-pink-500/20 text-pink-400 border-pink-500/40";
    case "eren": return "bg-stone-500/20 text-stone-400 border-stone-500/40";
    case "sailor": return "bg-pink-500/20 text-pink-400 border-pink-500/40";
    case "deku": return "bg-teal-500/20 text-teal-400 border-teal-500/40";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  }
}

export function getAvatarUrl(avatar: string): string | null {
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:image/")
  ) {
    return avatar;
  }
  
  // Stable, high-quality Anime Character Profile Picture (PFP) URLs
  switch (avatar) {
    case "luffy":   return "/avatars/luffy.png"; // Generated Luffy PFP
    case "zoro":    return "/avatars/zoro.png"; // Generated Zoro PFP
    case "goku":    return "/avatars/goku.png"; // Generated Goku PFP
    case "vegeta":  return "/avatars/vegeta.png"; // Generated Vegeta PFP
    case "naruto":  return "/avatars/naruto.png"; // Generated Naruto PFP
    case "sasuke":  return "/avatars/sasuke.png"; // Generated Sasuke PFP
    case "kakashi": return "/avatars/kakashi.png"; // Generated Kakashi PFP
    case "tanjiro": return "/avatars/tanjiro.png"; // Generated Tanjiro PFP
    case "nezuko":  return "/avatars/nezuko.png"; // Generated Nezuko PFP
    case "eren":    return "/avatars/eren.png"; // Generated Eren PFP
    case "sailor":  return "/avatars/sailor.png"; // Generated Sailor Moon PFP
    case "deku":    return "/avatars/deku.png"; // Generated Deku PFP
    default:        return null;
  }
}
