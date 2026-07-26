"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";

const YOUTUBE_ID = "m7lSSzq6xg4";
const YOUTUBE_URL = `https://youtu.be/${YOUTUBE_ID}`;
const THUMB_MAXRES = `https://img.youtube.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`;
// maxresdefault.jpg nem sempre existe para todo vídeo — hqdefault.jpg é
// gerado sempre pelo YouTube, serve de fallback via onError da própria img.
const THUMB_FALLBACK = `https://img.youtube.com/vi/${YOUTUBE_ID}/hqdefault.jpg`;

export function VideoCover() {
  const t = ptBr.entrar.video;
  const [thumbSrc, setThumbSrc] = useState(THUMB_MAXRES);

  return (
    <a
      href={YOUTUBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.ariaLabel}
      className="group relative flex min-h-[220px] w-full items-center justify-center overflow-hidden lg:min-h-full lg:w-1/2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail externa do YouTube, fora do domínio configurado no next/image */}
      <img
        src={thumbSrc}
        onError={() => setThumbSrc(THUMB_FALLBACK)}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-military/85 via-military/40 to-military/10"
      />

      <div className="relative flex flex-col items-center gap-4 px-8 text-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-salmon text-on-salmon shadow-soft-lg transition-transform group-hover:scale-105">
          <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" aria-hidden="true" />
        </span>
        <p className="max-w-xs rounded-lg bg-military/70 px-4 py-2 text-sm font-medium text-on-military backdrop-blur-sm">
          {t.texto}
        </p>
      </div>
    </a>
  );
}
