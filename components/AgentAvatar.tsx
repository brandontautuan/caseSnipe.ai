"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * AgentAvatar — shows state-based GIFs for Prosecutor and Defense
 * Place GIFs in public/gifs/: prosecutor-idle.gif, prosecutor-speaking.gif, etc.
 */

export type GifState = "idle" | "speaking" | "objecting" | "researching" | "resting";

const FALLBACK_ICONS: Record<"prosecution" | "defense", string> = {
  prosecution: "⚔",
  defense: "🛡",
};

const GIF_NAMES: Record<GifState, string> = {
  idle: "idle",
  speaking: "speaking",
  objecting: "objecting",
  researching: "researching",
  resting: "resting",
};

interface AgentAvatarProps {
  role: "prosecution" | "defense";
  gifState: GifState;
  className?: string;
  compact?: boolean;
}

export default function AgentAvatar({ role, gifState, className = "", compact = false }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const name = GIF_NAMES[gifState];
  const gifName = gifState === "resting" ? "idle" : name;
  const fileRole = role === "prosecution" ? "prosecutor" : role; // files use "prosecutor" not "prosecution"
  const path = `/gifs/${fileRole}-${gifName}.gif`;

  useEffect(() => setImgError(false), [path]);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-transparent ${className}`}
      style={{ minHeight: compact ? 40 : 120, minWidth: compact ? 48 : 80 }}
    >
      {imgError ? (
        <span className="text-base">{FALLBACK_ICONS[role]}</span>
      ) : (
        <Image
          src={path}
          alt={`${role} ${gifState}`}
          width={140}
          height={140}
          className={compact ? "h-12 w-auto object-contain" : "max-h-[140px] w-auto object-contain"}
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
    </div>
  );
}
