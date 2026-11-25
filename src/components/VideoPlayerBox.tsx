import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Languages,
  Loader2,
  Music,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { STYLE_OPTIONS } from '../data/defaults';
import type { ArtStyle, StoryBeat } from '../types';
import {
  DEFAULT_CAFE_SCORE,
  cloneAudioBufferForContext,
  decodeAudioDataUrl,
  renderSoftBgmBuffer,
  trimAndNormalizeSpeechBuffer,
  type MusicScore,
} from '../utils/audioEngine';
import {
  preloadSceneArtwork,
  renderVideoFrame,
  type LoadedStyleImages,
} from '../utils/videoRenderer';
import {
  buildAudioSyncedTimings,
  type SyncedLineSegment,
} from '../utils/voiceSync';

interface VideoPlayerBoxProps {
  beats: StoryBeat[];
  style: ArtStyle;
  situation: string;
  onChangeStyle: (nextStyle: ArtStyle) => void;
  showDownloadButton?: boolean;
  onVideoWatched?: () => void;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.min(30, Math.floor(sec)));
  return `00:${s.toString().padStart(2, '0')}`;
}

export function VideoPlayerBox({
  beats,
  style,
  situation,
  onChangeStyle,
  showDownloadButton = false,
  onVideoWatched,
}: VideoPlayerBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<LoadedStyleImages | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showKorean, setShowKorean] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showStyleDrawer, setShowStyleDrawer] = useState(false);

  const [ttsStatus, setTtsStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isComposingBgm, setIsComposingBgm] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // Store trimmed, normalized AudioBuffers & measured durations keyed by line signature
  const trimmedBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const [durationsByLineId, setDurationsByLineId] = useState<
    Record<string, number>
  >({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmBufferRef = useRef<AudioBuffer | null>(null);
  const musicScoreRef = useRef<MusicScore>(DEFAULT_CAFE_SCORE);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const spokenFallbackIdsRef = useRef<Set<string>>(new Set());
  const inFlightVoiceLoadRef = useRef<{
    signature: string;
    promise: Promise<Record<string, number> | null>;
  } | null>(null);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const timings = useMemo(
    () => buildAudioSyncedTimings(beats, durationsByLineId),
    [beats, durationsByLineId],
  );

  const timingsRef = useRef(timings);
  timingsRef.current = timings;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const styleRef = useRef(style);
  styleRef.current = style;

  const showKoreanRef = useRef(showKorean);
  showKoreanRef.current = showKorean;

  const getDecodeContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // Preload 2D beat artwork and style images once
  useEffect(() => {
    let mounted = true;
    preloadSceneArtwork().then((loaded) => {
      if (!mounted) return;
      imagesRef.current = loaded;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        renderVideoFrame({
          ctx,
          width: canvas.width,
          height: canvas.height,
          currentTime: currentTimeRef.current,
          beats,
          timings: timingsRef.current,
          style: styleRef.current,
          images: loaded,
          showKorean: showKoreanRef.current,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, [beats]);

  // Pre-render soft instrumental BGM WAV buffer
  useEffect(() => {
    let cancelled = false;
    renderSoftBgmBuffer(musicScoreRef.current, 30).then((buf) => {
      if (!cancelled) {
        bgmBufferRef.current = buf;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-render current frame whenever static props change while paused
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    renderVideoFrame({
      ctx,
      width: canvas.width,
      height: canvas.height,
      currentTime,
      beats,
      timings,
      style,
      images: imagesRef.current,
      showKorean,
    });
  }, [beats, timings, style, showKorean, currentTime]);

  const stopAllAudio = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    });
    activeSourcesRef.current = [];
    spokenFallbackIdsRef.current.clear();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakFallbackLine = useCallback(
    (seg: SyncedLineSegment) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        !voiceEnabledRef.current
      ) {
        return;
      }
      const utterance = new SpeechSynthesisUtterance(seg.line.english);
      utterance.lang = 'en-US';
      const voices = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().startsWith('en'));

      if (voices.length > 0) {
        if (seg.line.speaker === 'Jiho') {
          const male = voices.find((v) =>
            /male|david|daniel|mark|alex|google us english/i.test(v.name),
          );
          utterance.voice = male ?? voices[0];
          utterance.pitch = 0.94;
        } else {
          const female = voices.find((v) =>
            /female|samantha|karen|victoria|zira|google uk english female/i.test(
              v.name,
            ),
          );
          utterance.voice = female ?? voices[voices.length - 1];
          utterance.pitch = 1.08;
        }
      } else {
        utterance.pitch = seg.line.speaker === 'Jiho' ? 0.94 : 1.08;
      }
      utterance.rate = Math.min(1.15, Math.max(0.92, seg.playbackRate));
      utterance.volume = 1.0;
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  // Warm up browser SpeechSynthesis English voice list on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
    const onVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener?.(
        'voiceschanged',
        onVoicesChanged,
      );
    };
  }, []);

  // Fetch, decode, trim silence, and normalize every line across all 4 beats
  const ensureVoicesLoaded = useCallback(async (): Promise<
    Record<string, number> | null
  > => {
    const allLines = beats.flatMap((beat, beatIndex) =>
      beat.lines
        .filter((line) => line.english.trim().length > 0)
        .map((line) => ({ beatIndex, line })),
    );

    const signature = allLines
      .map(({ line }) => `${line.id}:${line.speaker}:${line.english}`)
      .join('|');

    if (inFlightVoiceLoadRef.current?.signature === signature) {
      return inFlightVoiceLoadRef.current.promise;
    }

    const loadTask = (async (): Promise<Record<string, number> | null> => {
      const ctx = getDecodeContext();
      const measured: Record<string, number> = {};

      const missing = allLines.filter(({ line }) => {
        const key = `${line.id}:${line.speaker}:${line.english}`;
        const existing = trimmedBufferCacheRef.current.get(key);
        if (existing) {
          measured[line.id] = existing.duration;
          return false;
        }
        return true;
      });

      if (missing.length === 0) {
        setDurationsByLineId(measured);
        setTtsStatus('ready');
        return measured;
      }

      setTtsStatus('loading');
      setTtsError(null);

      const errors: string[] = [];

      for (let i = 0; i < missing.length; i += 4) {
        const chunk = missing.slice(i, i + 4);
        const results = await Promise.allSettled(
          chunk.map(async ({ beatIndex, line }) => {
            const mood =
              beatIndex === 0
                ? 'gentle and curious'
                : beatIndex === 1
                  ? 'a bit disappointed and empathetic'
                  : beatIndex === 2
                    ? 'warm, cheerful, and encouraging'
                    : 'excited and joyful';

            const res = await fetch('/api/tts/line', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                speaker: line.speaker,
                text: line.english,
                mood,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Voice synthesis failed.');
            }
            const rawDecoded = await decodeAudioDataUrl(ctx, data.audioDataUrl);
            const trimmed = trimAndNormalizeSpeechBuffer(ctx, rawDecoded);
            const key = `${line.id}:${line.speaker}:${line.english}`;
            trimmedBufferCacheRef.current.set(key, trimmed);
            measured[line.id] = trimmed.duration;
          }),
        );

        results.forEach((r) => {
          if (r.status === 'rejected') {
            errors.push(
              r.reason instanceof Error ? r.reason.message : String(r.reason),
            );
          }
        });
      }

      setDurationsByLineId(measured);
      if (errors.length === 0) {
        setTtsStatus('ready');
        return measured;
      }

      const hitRateLimit = errors.some((e) => e.includes('429'));
      setTtsStatus('ready');
      setTtsError(
        hitRateLimit
          ? 'Gemini TTS reached its daily Free Tier request limit for some lines — clear English browser voices are filling in so every line across all 4 beats still plays word-for-word.'
          : errors[0],
      );
      return measured;
    })();

    inFlightVoiceLoadRef.current = { signature, promise: loadTask };
    try {
      return await loadTask;
    } finally {
      if (inFlightVoiceLoadRef.current?.promise === loadTask) {
        inFlightVoiceLoadRef.current = null;
      }
    }
  }, [beats, getDecodeContext]);



  // Preload all 8 voice buffers automatically when entering Video or Final screen
  useEffect(() => {
    void ensureVoicesLoaded();
  }, [ensureVoicesLoaded]);

  // Synchronous audio scheduling with zero async decoding drift
  const schedulePlaybackAudio = useCallback(
    async (
      startOffsetSec: number,
      syncedSegments: SyncedLineSegment[],
      targetCtx?: BaseAudioContext,
      dest?: AudioNode,
    ) => {
      const ctx = targetCtx ?? getDecodeContext();

      if (ctx instanceof AudioContext && ctx.state === 'suspended') {
        await ctx.resume();
      }

      const outputNode = dest ?? ctx.destination;
      // Capture `now` AFTER any await so t=0 aligns with exact AudioContext clock
      const now = ctx.currentTime + 0.02;

      // Schedule soft instrumental BGM with voice ducking
      if (bgmEnabled && bgmBufferRef.current) {
        const bgmBuffer = targetCtx
          ? cloneAudioBufferForContext(ctx, bgmBufferRef.current)
          : bgmBufferRef.current;

        const bgmSource = ctx.createBufferSource();
        bgmSource.buffer = bgmBuffer;

        const bgmGain = ctx.createGain();
        bgmGain.gain.setValueAtTime(voiceEnabled ? 0.24 : 0.6, now);

        if (voiceEnabled) {
          syncedSegments.forEach((seg) => {
            if (seg.audioEndSec <= startOffsetSec) return;
            const relStart = Math.max(0, seg.audioStartSec - startOffsetSec);
            const relEnd = Math.max(relStart, seg.audioEndSec - startOffsetSec);
            bgmGain.gain.setValueAtTime(0.18, now + relStart);
            bgmGain.gain.setValueAtTime(0.32, now + relEnd);
          });
        }

        bgmSource.connect(bgmGain);
        bgmGain.connect(outputNode);
        bgmSource.start(now, Math.max(0, Math.min(29.9, startOffsetSec)));
        if (!targetCtx) {
          activeSourcesRef.current.push(bgmSource);
        }
      }

      // Schedule every trimmed, normalized English voice line in exact sync with subtitles
      if (voiceEnabled) {
        syncedSegments.forEach((seg) => {
          if (seg.audioEndSec <= startOffsetSec) return;
          const key = `${seg.line.id}:${seg.line.speaker}:${seg.line.english}`;
          const cachedBuf = trimmedBufferCacheRef.current.get(key);
          if (!cachedBuf) return;

          const playBuf = targetCtx
            ? cloneAudioBufferForContext(ctx, cachedBuf)
            : cachedBuf;

          const voiceSource = ctx.createBufferSource();
          voiceSource.buffer = playBuf;
          voiceSource.playbackRate.value = seg.playbackRate;

          const voiceGain = ctx.createGain();
          voiceGain.gain.value = 1.05;

          voiceSource.connect(voiceGain);
          voiceGain.connect(outputNode);

          const delaySec = Math.max(0, seg.audioStartSec - startOffsetSec);
          const bufferOffset =
            startOffsetSec > seg.audioStartSec
              ? (startOffsetSec - seg.audioStartSec) * seg.playbackRate
              : 0;

          if (bufferOffset < playBuf.duration) {
            voiceSource.start(now + delaySec, bufferOffset);
            if (!targetCtx) {
              activeSourcesRef.current.push(voiceSource);
            }
          }
        });
      }
    },
    [bgmEnabled, getDecodeContext, voiceEnabled],
  );

  // Main requestAnimationFrame playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      const nextTime = currentTimeRef.current + dt;

      if (nextTime >= 30) {
        setCurrentTime(30);
        setIsPlaying(false);
        stopAllAudio();
        onVideoWatched?.();
        return;
      }

      setCurrentTime(nextTime);

      // Trigger browser English voice fallback for any line without a Gemini WAV buffer
      if (voiceEnabledRef.current) {
        for (const seg of timingsRef.current) {
          const key = `${seg.line.id}:${seg.line.speaker}:${seg.line.english}`;
          const hasGeminiWav = trimmedBufferCacheRef.current.has(key);
          if (
            !hasGeminiWav &&
            nextTime >= seg.audioStartSec &&
            nextTime < seg.audioEndSec &&
            !spokenFallbackIdsRef.current.has(seg.line.id)
          ) {
            spokenFallbackIdsRef.current.add(seg.line.id);
            speakFallbackLine(seg);
          }
        }
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        renderVideoFrame({
          ctx,
          width: canvas.width,
          height: canvas.height,
          currentTime: nextTime,
          beats,
          timings: timingsRef.current,
          style: styleRef.current,
          images: imagesRef.current,
          showKorean: showKoreanRef.current,
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [beats, isPlaying, onVideoWatched, speakFallbackLine, stopAllAudio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const prepareSyncedTimings = useCallback(async () => {
    if (ttsStatus !== 'ready') {
      const measured = await ensureVoicesLoaded();
      if (measured) {
        const nextTimings = buildAudioSyncedTimings(beats, measured);
        timingsRef.current = nextTimings;
        return nextTimings;
      }
    }
    return timingsRef.current;
  }, [beats, ensureVoicesLoaded, ttsStatus]);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAllAudio();
      return;
    }

    const startAt = currentTime >= 29.8 ? 0 : currentTime;
    if (startAt === 0) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }

    const synced = await prepareSyncedTimings();
    stopAllAudio();
    await schedulePlaybackAudio(startAt, synced);
    setIsPlaying(true);
  };

  const handleRestart = async () => {
    stopAllAudio();
    currentTimeRef.current = 0;
    setCurrentTime(0);
    const synced = await prepareSyncedTimings();
    await schedulePlaybackAudio(0, synced);
    setIsPlaying(true);
  };

  const handleJumpBeat = async (startSec: number) => {
    stopAllAudio();
    currentTimeRef.current = startSec;
    setCurrentTime(startSec);
    if (isPlaying) {
      const synced = await prepareSyncedTimings();
      await schedulePlaybackAudio(startSec, synced);
    }
  };

  const handleComposeNewBgm = async () => {
    setIsComposingBgm(true);
    try {
      const res = await fetch('/api/music/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, situation }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.beatChords)) {
        musicScoreRef.current = data;
        bgmBufferRef.current = await renderSoftBgmBuffer(data, 30);
      }
    } catch {
      // Keep default cafe score if offline
    } finally {
      setIsComposingBgm(false);
    }
  };

  const handleDownloadVideoWebm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      setExportError('Video export is not supported in this browser.');
      return;
    }

    setExportError(null);
    setIsExporting(true);
    setExportProgress(0);
    stopAllAudio();
    setIsPlaying(false);

    try {
      const synced = await prepareSyncedTimings();

      const exportCtx = new AudioContext();
      const dest = exportCtx.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(combinedStream, { mimeType })
        : new MediaRecorder(combinedStream);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const donePromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
        };
      });

      await schedulePlaybackAudio(0, synced, exportCtx, dest);
      recorder.start(250);

      const startMs = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const elapsedSec = (now - startMs) / 1000;
          const clamped = Math.min(30, elapsedSec);
          setExportProgress(Math.round((clamped / 30) * 100));
          setCurrentTime(clamped);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderVideoFrame({
              ctx,
              width: canvas.width,
              height: canvas.height,
              currentTime: clamped,
              beats,
              timings: synced,
              style: styleRef.current,
              images: imagesRef.current,
              showKorean: showKoreanRef.current,
            });
          }

          if (elapsedSec >= 30) {
            resolve();
          } else {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      });

      recorder.stop();
      const videoBlob = await donePromise;
      await exportCtx.close();

      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CampusScene-30-${style.replace(/\s+/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onVideoWatched?.();
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Failed to export video.',
      );
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const activeBeat =
    beats.find((b) => currentTime >= b.startSec && currentTime < b.endSec) ??
    beats[beats.length - 1];

  const activeSegment =
    timings.find(
      (seg) => currentTime >= seg.startSec && currentTime < seg.endSec,
    ) ?? timings[timings.length - 1];

  return (
    <div className="space-y-5">
      {/* Main 16:9 Video Canvas Stage */}
      <div className="overflow-hidden rounded-2xl border border-[#D8D0C3] bg-[#181B19] shadow-sm">
        <div className="relative aspect-video w-full">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            data-testid="video-canvas"
            data-playing={isPlaying ? 'true' : 'false'}
            data-style={style}
            data-tts-status={ttsStatus}
            data-korean-subtitles={showKorean ? 'on' : 'off'}
            data-active-beat={activeBeat?.beatNumber ?? 1}
            data-active-line-id={activeSegment?.line.id ?? ''}
            data-active-speaker={activeSegment?.line.speaker ?? ''}
            data-active-subtitle={activeSegment?.line.english ?? ''}
            className="h-full w-full object-contain"
          />

          {ttsStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
              <div className="flex items-center gap-3 rounded-2xl bg-[#FAF8F5] px-6 py-4 text-base font-semibold text-[#1F2421] shadow-md">
                <Loader2
                  className="h-5 w-5 animate-spin text-[#2D6A4F]"
                  aria-hidden="true"
                />
                <span>Generating Jiho &amp; Mina English voices...</span>
              </div>
            </div>
          )}

          {isExporting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-xs">
              <div className="rounded-2xl bg-[#FAF8F5] px-6 py-4 text-center shadow-md">
                <p className="font-display text-base font-bold text-[#1F2421]">
                  Rendering 30s Video ({exportProgress}%)
                </p>
                <p className="mt-1 text-sm text-[#575D59]">
                  Mixing English voices, soft BGM, and burned-in subtitles...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scrubber & Playback Controls */}
        <div className="space-y-3 border-t border-[#2E3330] bg-[#1F2421] px-4 py-4 text-white sm:px-6">
          {/* 4-Beat Timeline Segments */}
          <div className="grid grid-cols-4 gap-2">
            {beats.map((b) => {
              const isCurrent = activeBeat?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleJumpBeat(b.startSec)}
                  className={`min-h-[40px] rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-[#2D6A4F] text-white'
                      : 'bg-[#2B312E] text-[#CBD2CE] hover:bg-[#363D39]'
                  }`}
                >
                  <span className="block truncate font-semibold">
                    {b.beatNumber}. {b.label}
                  </span>
                  <span className="font-mono text-[11px] opacity-80 tabular-nums">
                    {b.startSec}–{b.endSec}s
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isExporting}
                aria-label={isPlaying ? 'Pause video' : 'Play 30s video'}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#3A8463] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Play className="h-5 w-5" aria-hidden="true" />
                )}
                <span>{isPlaying ? 'Pause' : 'Play 30s'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                disabled={isExporting}
                aria-label="Restart from 0 seconds"
                className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-[#2B312E] px-3 text-white transition-colors hover:bg-[#38403B]"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </button>

              <span className="font-mono text-sm font-semibold text-[#E5DFD5] tabular-nums whitespace-nowrap shrink-0">
                {formatClock(currentTime)} / 00:30
              </span>

              {activeSegment && (
                <span className="hidden text-xs text-[#CBD2CE] lg:inline truncate max-w-md">
                  {activeSegment.line.speaker}: {activeSegment.line.english}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                aria-pressed={voiceEnabled}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  voiceEnabled
                    ? 'bg-[#2B312E] text-white'
                    : 'bg-[#2B312E]/50 text-[#9AA19D]'
                }`}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Voices</span>
              </button>

              <button
                type="button"
                onClick={() => setBgmEnabled((b) => !b)}
                aria-pressed={bgmEnabled}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  bgmEnabled
                    ? 'bg-[#2B312E] text-white'
                    : 'bg-[#2B312E]/50 text-[#9AA19D]'
                }`}
              >
                <Music className="h-4 w-4" aria-hidden="true" />
                <span>BGM {bgmEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Directly Below the Video Player */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5DFD5] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Korean Subtitle Toggle */}
          <button
            type="button"
            onClick={() => setShowKorean((prev) => !prev)}
            aria-pressed={showKorean}
            className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl border px-5 py-2.5 text-base font-semibold transition-colors whitespace-nowrap shrink-0 ${
              showKorean
                ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                : 'border-[#D8D0C3] bg-[#FAF8F5] text-[#1F2421] hover:bg-[#F2EFE9]'
            }`}
          >
            <Languages className="h-5 w-5" aria-hidden="true" />
            <span>한국어 뜻 보기</span>
          </button>

          {/* Style Switcher */}
          <button
            type="button"
            onClick={() => setShowStyleDrawer((prev) => !prev)}
            aria-expanded={showStyleDrawer}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-5 py-2.5 text-base font-semibold text-[#1F2421] transition-colors hover:bg-[#F2EFE9] whitespace-nowrap shrink-0"
          >
            <Palette className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
            <span>스타일 바꾸기 (Switch Style)</span>
          </button>

          <button
            type="button"
            onClick={handleComposeNewBgm}
            disabled={isComposingBgm}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#D8D0C3] bg-white px-4 py-2.5 text-sm font-medium text-[#373D39] transition-colors hover:bg-[#F2EFE9] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isComposingBgm ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Music className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
            )}
            <span>Refresh Soft BGM</span>
          </button>
        </div>

        {showDownloadButton && (
          <button
            type="button"
            onClick={handleDownloadVideoWebm}
            disabled={isExporting}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#B45309] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#92400E] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            <span>
              {isExporting ? `Exporting ${exportProgress}%` : 'Download Video'}
            </span>
          </button>
        )}
      </div>

      {/* Expandable Style Switcher Panel */}
      {showStyleDrawer && (
        <div
          role="region"
          aria-label="Switch art style"
          className="rounded-2xl border border-[#E5DFD5] bg-white p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-bold text-[#1F2421]">
              Switch art style (keeps your 30s script and English voices)
            </p>
            <span className="text-sm font-medium text-[#2D6A4F]">
              Current: {style}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STYLE_OPTIONS.map((opt) => {
              const active = opt.id === style;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeStyle(opt.id);
                    setShowStyleDrawer(false);
                  }}
                  className={`flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                    active
                      ? 'border-[#2D6A4F] bg-[#E9F2EC] ring-2 ring-[#2D6A4F]/30'
                      : 'border-[#E5DFD5] bg-[#FAF8F5] hover:border-[#B9B0A2]'
                  }`}
                >
                  <img
                    src={opt.previewImage}
                    alt={opt.label}
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full object-cover"
                  />
                  <div className="p-2.5">
                    <p className="text-sm font-bold text-[#1F2421]">
                      {opt.label}
                    </p>
                    <p className="text-xs text-[#575D59]">{opt.koreanLabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(ttsError || exportError) && (
        <div
          role="status"
          className="rounded-xl border border-[#F59E0B]/40 bg-[#FEF3C7]/70 px-4 py-3 text-sm text-[#78350F]"
        >
          {ttsError || exportError}
        </div>
      )}
    </div>
  );
}
