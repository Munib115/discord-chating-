"use client";

import React, { useEffect, useState } from "react";
import { parseContentFull } from "@/lib/spoiler";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const parseMarkdown = async () => {
      try {
        const { marked } = await import("marked");
        const DOMPurify = (await import("dompurify")).default;

        // Custom renderer for spoiler support inside markdown
        const rawHtml = await marked.parse(content, { async: true });
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        setHtml(cleanHtml);
      } catch (e) {
        console.error("Markdown parsing failed", e);
        setHtml(content);
      }
    };

    parseMarkdown();
  }, [content]);

  // If html is parsed, render it safely. Otherwise fallback to simple spoiler/mention parser.
  if (html) {
    return (
      <div 
        className={`prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Fallback to text with spoiler/mention highlight
  return (
    <div className={`text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words ${className}`}>
      {parseContentFull(content)}
    </div>
  );
}
