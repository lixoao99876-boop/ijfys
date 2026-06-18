"use client";

import { useEffect, useRef } from "react";

interface Props {
  url: string;
  poster?: string;
  title?: string;
  onTimeUpdate?: (current: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
  /** 视频拉到首帧/可播放时触发，附带从挂载到首帧的耗时（ms） */
  onReady?: (firstFrameMs: number) => void;
}

export default function VideoPlayer({ url, poster, onTimeUpdate, onEnded, onError, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<unknown>(null);
  const handlersRef = useRef({ onTimeUpdate, onEnded, onError, onReady });
  const mountedAtRef = useRef<number>(0);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    handlersRef.current = { onTimeUpdate, onEnded, onError, onReady };
  }, [onTimeUpdate, onEnded, onError, onReady]);

  useEffect(() => {
    if (!containerRef.current || !url) return;
    let cancelled = false;
    let art: { destroy: (b?: boolean) => void; on: (e: string, cb: (...a: unknown[]) => void) => void } | null = null;
    mountedAtRef.current = performance.now();
    readyFiredRef.current = false;

    (async () => {
      const [{ default: Artplayer }, { default: Hls }] = await Promise.all([
        import("artplayer"),
        import("hls.js"),
      ]);
      if (cancelled || !containerRef.current) return;

      art = new Artplayer({
        container: containerRef.current,
        url,
        poster,
        volume: 0.7,
        autoplay: false,
        pip: true,
        autoSize: false,
        autoMini: true,
        screenshot: false,
        setting: true,
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        airplay: true,
        theme: "#ef4444",
        lang: "zh-cn",
        moreVideoAttr: { crossOrigin: "anonymous" },
        type: "m3u8",
        customType: {
          m3u8: (video: HTMLVideoElement, src: string) => {
            if (Hls.isSupported()) {
              const hls = new Hls({ enableWorker: true });
              hls.loadSource(src);
              hls.attachMedia(video);
              hls.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) handlersRef.current.onError?.(data);
              });
              video.addEventListener("destroy", () => hls.destroy(), { once: true });
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = src;
            } else {
              handlersRef.current.onError?.(new Error("当前浏览器不支持 HLS 播放"));
            }
          },
        },
      }) as unknown as typeof art;

      art!.on("video:timeupdate", () => {
        const v = (art as unknown as { video: HTMLVideoElement }).video;
        if (v && !isNaN(v.duration)) {
          handlersRef.current.onTimeUpdate?.(v.currentTime, v.duration);
        }
      });
      // 首帧 / canplay 触发 → 上报响应时间
      const fireReady = () => {
        if (readyFiredRef.current) return;
        readyFiredRef.current = true;
        const elapsed = Math.round(performance.now() - mountedAtRef.current);
        handlersRef.current.onReady?.(elapsed);
      };
      art!.on("video:canplay", fireReady);
      art!.on("video:loadeddata", fireReady);
      art!.on("video:ended", () => handlersRef.current.onEnded?.());
      art!.on("error", (err: unknown) => handlersRef.current.onError?.(err));
      artRef.current = art;
    })();

    return () => {
      cancelled = true;
      try {
        (artRef.current as { destroy?: (b?: boolean) => void } | null)?.destroy?.(false);
      } catch {
        /* noop */
      }
      artRef.current = null;
    };
  }, [url, poster]);

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden ring-1 ring-white/5">
      <div ref={containerRef} className="w-full aspect-video" />
    </div>
  );
}
