import React from "react";
import SpoilerTag from "@/components/SpoilerTag";

/**
 * Parses both spoiler tags (||text||) and @mention highlights.
 * Avoids `s` regex flag for TS es2017 compatibility — uses [\s\S] instead.
 */
export function parseContentFull(text: string): React.ReactNode[] {
  // Split on ||spoiler|| boundaries
  const spoilerRegex = /\|\|([\s\S]*?)\|\|/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = spoilerRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...parseMentions(text.slice(lastIndex, match.index), key));
      key += 100;
    }
    nodes.push(<SpoilerTag key={key++}>{match[1]}</SpoilerTag>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...parseMentions(text.slice(lastIndex), key));
  }

  return nodes.length > 0 ? nodes : [text];
}

/**
 * Simpler spoilers-only version for cases without mention highlighting.
 */
export function parseSpoilers(text: string): React.ReactNode[] {
  const spoilerRegex = /\|\|([\s\S]*?)\|\|/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = spoilerRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(<SpoilerTag key={key++}>{match[1]}</SpoilerTag>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function parseMentions(text: string, baseKey: number): React.ReactNode[] {
  const mentionRegex = /(@[a-zA-Z0-9_-]{2,25})/g;
  const parts = text.split(mentionRegex);
  return parts
    .map((part, i) => {
      if (/^@[a-zA-Z0-9_-]{2,25}$/.test(part)) {
        return (
          <span key={baseKey + i} className="text-indigo-400 font-semibold hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part || undefined;
    })
    .filter(Boolean) as React.ReactNode[];
}
