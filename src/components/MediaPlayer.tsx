// Affichage des médias : image, vidéo YouTube ou fichier vidéo.
// Mode « son seulement » (blind test) : la vidéo joue cachée, on ne voit qu'une animation musicale.
// L'animateur peut mettre en pause, reprendre, recommencer ou dévoiler la vidéo ;
// la lecture se met en pause automatiquement quand quelqu'un buzze.
import { useEffect, useRef } from 'react';
import type { Media } from '../types';
import { youtubeId } from '../util';

export interface PlayerControl { paused?: boolean; restartKey?: number; reveal?: boolean }

export function ytEmbedUrl(media: Media, autoplay = true): string | null {
  const id = youtubeId(media.src);
  if (!id) return null;
  const start = media.start ?? Number(media.src.match(/[?&]t=(\d+)/)?.[1] ?? 0);
  const p = new URLSearchParams({ autoplay: autoplay ? '1' : '0', rel: '0', enablejsapi: '1', playsinline: '1', modestbranding: '1' });
  if (start) p.set('start', String(start));
  if (media.end) p.set('end', String(media.end));
  if (typeof location !== 'undefined') p.set('origin', location.origin);
  return `https://www.youtube.com/embed/${id}?${p}`;
}

export function MediaView({ media, className = 'stage-media', control, autoplay = true }: { media?: Media; className?: string; control?: PlayerControl; autoplay?: boolean }) {
  if (!media?.src) return null;
  if (media.kind === 'image') return <img className={className} src={media.src} alt="" />;
  return <VideoPlayer media={media} control={control} autoplay={autoplay} />;
}

function VideoPlayer({ media, control = {}, autoplay = true }: { media: Media; control?: PlayerControl; autoplay?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const yt = ytEmbedUrl(media, autoplay);
  const hidden = media.audioOnly && !control.reveal;

  const cmd = (func: string, args: unknown[] = []) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  };

  // pause / reprise
  useEffect(() => {
    if (control.paused === undefined) return;
    if (yt) cmd(control.paused ? 'pauseVideo' : 'playVideo');
    else if (video.current) { if (control.paused) video.current.pause(); else void video.current.play().catch(() => {}); }
  }, [control.paused, yt]);

  // recommencer
  useEffect(() => {
    if (!control.restartKey) return;
    const start = media.start ?? 0;
    if (yt) { cmd('seekTo', [start, true]); cmd('playVideo'); }
    else if (video.current) { video.current.currentTime = start; void video.current.play().catch(() => {}); }
  }, [control.restartKey]);

  const player = yt
    ? <iframe ref={frame} className="stage-video" src={yt} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title="vidéo"
        onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*')} />
    : <video ref={video} className="stage-video" src={media.src} controls={!hidden} autoPlay={autoplay}
        onLoadedMetadata={(e) => { if (media.start) e.currentTarget.currentTime = media.start; }}
        onTimeUpdate={(e) => { if (media.end && e.currentTarget.currentTime >= media.end) e.currentTarget.pause(); }} />;

  // le lecteur reste le même élément quand on le dévoile : la musique continue sans recommencer
  return (
    <>
      {hidden && (
        <div className={`audio-only ${control.paused ? 'is-paused' : ''}`}>
          <div className="eq">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.12}s`, background: `var(--a${(i % 6) + 1})` }} />)}</div>
          <div className="audio-label">{control.paused ? '⏸ En pause' : '🎧 Écoute bien…'}</div>
        </div>
      )}
      {/* caché : taille minimale exigée par YouTube, quasi transparent */}
      <div className={hidden ? 'hidden-player' : 'video-wrap'} aria-hidden={hidden}>{player}</div>
    </>
  );
}
