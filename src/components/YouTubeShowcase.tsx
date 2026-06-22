import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_VIDEOS = [
  { id: "_rWPvpP1jmU", title: "Lavadoras de alta pressão WR - Vito Pro-Power" },
  { id: "l2PQO8Sg-y0", title: "Rebarbadoras RAD / RADPRO - Vito" },
];

function embedUrl(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://materassist.vercel.app";
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(origin)}&widgetid=1&playlist=${id}`;
}

export function YouTubeShowcase({ background }: { background?: boolean }) {
  const [videos, setVideos] = useState<{ id: string; title: string }[]>(DEFAULT_VIDEOS);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "videos").maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const ids = data.value as string[];
          setVideos(ids.map((id: string) => ({ id, title: id })));
        }
      }, () => {});
  }, []);

  if (background) {
    const activeVideo = videos.find((v) => !failed.has(v.id));
    return (
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#1a1a2e] to-[#0f3460]">
        {activeVideo && (
          <iframe
            key={activeVideo.id}
            src={embedUrl(activeVideo.id)}
            title={activeVideo.title}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
            tabIndex={-1}
            aria-hidden="true"
            onError={() => setFailed((prev) => new Set(prev).add(activeVideo.id))}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 mb-6 px-4">
      <p className="text-center text-sm font-semibold text-white/40 uppercase tracking-widest mb-4 select-none">
        Produtos em destaque
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map((video) =>
          failed.has(video.id) ? null : (
            <div
              key={video.id}
              className="relative group rounded-2xl overflow-hidden bg-black/40 shadow-lg border border-white/10"
              style={{ aspectRatio: "16 / 9" }}
            >
              <iframe
                src={embedUrl(video.id)}
                title={video.title}
                className="absolute inset-0 w-full h-full pointer-events-none"
                loading="lazy"
                allow="autoplay; encrypted-media"
                tabIndex={-1}
                aria-hidden="true"
                onError={() => setFailed((prev) => new Set(prev).add(video.id))}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                <p className="text-xs font-semibold text-white/80 truncate">
                  {video.title}
                </p>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
