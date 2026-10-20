import React from 'react';
import { ExternalLink, Play } from 'lucide-react';

interface YouTubePlayerProps {
  url?: string;
  title: string;
}

function getVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) return null;
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const match = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})$/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ url, title }) => {
  if (!url) return null;
  const videoId = getVideoId(url);

  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex aspect-video w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
      >
        <Play className="h-4 w-4" />
        <span>Buscar demonstração no YouTube</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={`Demonstração: ${title}`}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
