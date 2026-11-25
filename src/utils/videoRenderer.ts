import {
  BEAT_ARTWORK_2D,
  COVER_THUMBNAIL_IMAGE,
  STYLE_ARTWORK,
} from '../data/defaults';
import type { ArtStyle, StoryBeat, TimedLineSegment } from '../types';
import { formatSubtitleLines } from './storyLogic';

export interface LoadedStyleImages {
  beatImages2D: Record<1 | 2 | 3 | 4, HTMLImageElement | null>;
  styleImages: Record<ArtStyle, HTMLImageElement | null>;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function preloadSceneArtwork(): Promise<LoadedStyleImages> {
  const [b1, b2, b3, b4, clay, watercolor, liveaction] = await Promise.all([
    loadImage(BEAT_ARTWORK_2D[1]),
    loadImage(BEAT_ARTWORK_2D[2]),
    loadImage(BEAT_ARTWORK_2D[3]),
    loadImage(BEAT_ARTWORK_2D[4]),
    loadImage(STYLE_ARTWORK.clay),
    loadImage(STYLE_ARTWORK.watercolor),
    loadImage(STYLE_ARTWORK['live-action style']),
  ]);

  return {
    beatImages2D: { 1: b1, 2: b2, 3: b3, 4: b4 },
    styleImages: {
      '2D animation': b1,
      clay,
      watercolor,
      'live-action style': liveaction,
    },
  };
}

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  currentTime: number;
  beats: StoryBeat[];
  timings: TimedLineSegment[];
  style: ArtStyle;
  images: LoadedStyleImages | null;
  showKorean: boolean;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const imgRatio = img.width / img.height;
  const boxRatio = dw / dh;
  let drawW = dw;
  let drawH = dh;
  if (imgRatio > boxRatio) {
    drawH = dh * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = dw * zoom;
    drawH = drawW / imgRatio;
  }
  const offsetX = dx + (dw - drawW) / 2 + panX;
  const offsetY = dy + (dh - drawH) / 2 + panY;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

export function renderVideoFrame({
  ctx,
  width,
  height,
  currentTime,
  beats,
  timings,
  style,
  images,
  showKorean,
}: RenderFrameParams) {
  const clampedTime = Math.max(0, Math.min(30, currentTime));
  const activeBeat =
    beats.find((b) => clampedTime >= b.startSec && clampedTime < b.endSec) ??
    beats[beats.length - 1];

  const activeSegment =
    timings.find(
      (seg) => clampedTime >= seg.startSec && clampedTime < seg.endSec,
    ) ??
    (clampedTime >= 30 ? timings[timings.length - 1] : undefined);

  const beatDuration = Math.max(1, activeBeat.endSec - activeBeat.startSec);
  const beatProgress = Math.max(
    0,
    Math.min(1, (clampedTime - activeBeat.startSec) / beatDuration),
  );

  // Stop-motion cadence for Clay style (12fps stepped time)
  const animTime =
    style === 'clay' ? Math.floor(clampedTime * 12) / 12 : clampedTime;
  const animProgress =
    style === 'clay'
      ? Math.floor(beatProgress * 12 * beatDuration) / (12 * beatDuration)
      : beatProgress;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Warm fallback canvas backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#F6EFE2');
  bgGrad.addColorStop(1, '#E6D6BC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Pick image for current beat + style
  const chosenImg =
    style === '2D animation'
      ? images?.beatImages2D[activeBeat.beatNumber] ?? null
      : images?.styleImages[style] ?? null;

  if (chosenImg) {
    // Beat-specific camera framing so every beat feels alive and distinct across all styles
    let zoom = 1.04 + animProgress * 0.06;
    let panX = 0;
    let panY = 0;

    if (activeBeat.beatNumber === 1) {
      zoom = 1.03 + animProgress * 0.05;
      panX = (animProgress - 0.5) * -28;
      panY = 0;
    } else if (activeBeat.beatNumber === 2) {
      zoom = 1.12 + animProgress * 0.05;
      panX = style === '2D animation' ? 12 : 42;
      panY = -10;
    } else if (activeBeat.beatNumber === 3) {
      zoom = 1.1 + (1 - animProgress) * 0.05;
      panX = style === '2D animation' ? -10 : -36;
      panY = 4;
    } else {
      zoom = 1.08 - animProgress * 0.05;
      panX = 0;
      panY = -6 * Math.sin(animProgress * Math.PI);
    }

    if (style === 'watercolor') {
      ctx.filter = 'saturate(0.95) contrast(0.96) brightness(1.03)';
    } else if (style === 'live-action style') {
      ctx.filter = 'contrast(1.05) saturate(0.98) sepia(0.06)';
    } else if (style === 'clay') {
      ctx.filter = 'saturate(1.06) contrast(1.04)';
    } else {
      ctx.filter = 'none';
    }

    drawCoverImage(ctx, chosenImg, 0, 0, width, height, zoom, panX, panY);
    ctx.filter = 'none';
  }

  // Style-specific atmosphere overlays
  if (style === 'watercolor') {
    // Soft warm paper edge wash
    const edge = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.28,
      width / 2,
      height / 2,
      width * 0.65,
    );
    edge.addColorStop(0, 'rgba(250, 246, 238, 0)');
    edge.addColorStop(1, 'rgba(250, 245, 236, 0.34)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, width, height);
  } else if (style === 'live-action style') {
    // Subtle warm 35mm indie cinema letterbox bars
    const barH = Math.round(height * 0.045);
    ctx.fillStyle = 'rgba(18, 16, 14, 0.9)';
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);
  }

  // Animated coffee steam + floating sunlit dust motes (consistent cozy cafe ambiance)
  for (let i = 0; i < 14; i++) {
    const seed = i * 1.37;
    const px = ((seed * 193 + animTime * (10 + (i % 4) * 3)) % width);
    const py =
      height * 0.15 +
      ((seed * 89 + Math.sin(animTime * 0.9 + seed) * 28) % (height * 0.55));
    const r = 1.6 + (i % 3) * 1.1;
    const alpha = 0.14 + 0.1 * Math.sin(animTime * 1.4 + seed);
    ctx.fillStyle = `rgba(255, 245, 215, ${Math.max(0.04, alpha)})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Beat 4 celebratory warm sparkles when they clink cups!
  if (activeBeat.beatNumber === 4) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + animTime * 0.5;
      const dist = 48 + Math.sin(animTime * 2.5 + i) * 18;
      const sx = width * 0.5 + Math.cos(angle) * dist;
      const sy = height * 0.48 + Math.sin(angle) * (dist * 0.6);
      const pulse = 0.35 + 0.45 * Math.abs(Math.sin(animTime * 3 + i));
      ctx.fillStyle = `rgba(255, 232, 158, ${pulse})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cross-fade dissolve between beats (first 0.35s of beat)
  if (activeBeat.beatNumber > 1 && beatProgress * beatDuration < 0.35) {
    const fadeAlpha = 1 - (beatProgress * beatDuration) / 0.35;
    ctx.fillStyle = `rgba(250, 246, 238, ${fadeAlpha * 0.35})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Measured contrast scrim at bottom for burned-in subtitles
  const scrimH = showKorean ? height * 0.38 : height * 0.3;
  const scrim = ctx.createLinearGradient(0, height - scrimH, 0, height);
  scrim.addColorStop(0, 'rgba(12, 14, 13, 0)');
  scrim.addColorStop(0.45, 'rgba(12, 14, 13, 0.55)');
  scrim.addColorStop(1, 'rgba(12, 14, 13, 0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height - scrimH, width, scrimH);

  // Subtle speaker & beat indicator (clean unboxed text at top-left, no pills)
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(12, 14, 13, 0.85)';
  ctx.fillStyle = 'rgba(255, 250, 240, 0.98)';
  const headerTop = style === 'live-action style' ? height * 0.065 : 22;
  const beatHeaderText = `Beat ${activeBeat.beatNumber} · ${activeBeat.label}`;
  ctx.strokeText(beatHeaderText, 28, headerTop);
  ctx.fillText(beatHeaderText, 28, headerTop);
  ctx.shadowBlur = 0;

  // Burned-in English Subtitles (white bold text, bottom of screen, max 2 lines, 1 thought per line)
  if (activeSegment) {
    const englishLines = formatSubtitleLines(activeSegment.line.english).slice(0, 2);
    const baseBottom = style === 'live-action style' ? height - 44 : height - 28;
    const koreanLineHeight = showKorean ? 34 : 0;
    const englishLineHeight = 40;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Speaker label cleanly above subtitles
    const speakerY =
      baseBottom -
      koreanLineHeight -
      englishLines.length * englishLineHeight -
      8;
    ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FCD34D';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(activeSegment.line.speaker, width / 2, speakerY);

    // Burned-in bold white English subtitle lines
    ctx.font = '700 30px "Plus Jakarta Sans", "DM Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(10, 12, 11, 0.88)';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;

    englishLines.forEach((lineText, idx) => {
      const y =
        baseBottom -
        koreanLineHeight -
        (englishLines.length - 1 - idx) * englishLineHeight;
      ctx.strokeText(lineText, width / 2, y);
      ctx.fillText(lineText, width / 2, y);
    });

    // Optional natural Korean translation line beneath English subtitles
    if (showKorean && activeSegment.line.korean.trim()) {
      ctx.font = '600 22px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#FDE68A';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10, 12, 11, 0.9)';
      ctx.strokeText(activeSegment.line.korean, width / 2, baseBottom);
      ctx.fillText(activeSegment.line.korean, width / 2, baseBottom);
    }

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export async function downloadCoverThumbnailPng(
  filename = 'CampusScene-30-Cover.png',
): Promise<void> {
  const img = await loadImage(COVER_THUMBNAIL_IMAGE);
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (img) {
    drawCoverImage(ctx, img, 0, 0, 1280, 720, 1, 0, 0);
  } else {
    ctx.fillStyle = '#EFE6D5';
    ctx.fillRect(0, 0, 1280, 720);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
