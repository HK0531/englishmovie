import type { ArtStyle, StoryBeat } from '../types';
import { VideoPlayerBox } from './VideoPlayerBox';

interface VideoScreenProps {
  beats: StoryBeat[];
  style: ArtStyle;
  situation: string;
  onChangeStyle: (nextStyle: ArtStyle) => void;
  onBack: () => void;
  onNext: () => void;
  onVideoWatched: () => void;
}

export function VideoScreen({
  beats,
  style,
  situation,
  onChangeStyle,
  onBack,
  onNext,
  onVideoWatched,
}: VideoScreenProps) {
  return (
    <section className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-semibold text-[#2D6A4F]">
          Step 4 of 5 · 30-Second Video Preview
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#1F2421] sm:text-4xl">
          Watch your 30-second animated campus clip
        </h1>
        <p className="text-base leading-relaxed text-[#575D59]">
          Enjoy Jiho and Mina&apos;s dialogue with burned-in English subtitles,
          soft background music, and instant art style switching.
        </p>
      </div>

      <VideoPlayerBox
        beats={beats}
        style={style}
        situation={situation}
        onChangeStyle={onChangeStyle}
        onVideoWatched={onVideoWatched}
      />

      {/* Beat Script Reference Summary */}
      <div className="rounded-2xl border border-[#E5DFD5] bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-[#1F2421]">
          4-Beat Continuity Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {beats.map((b) => (
            <div key={b.id} className="space-y-1.5 border-t border-[#EFEAE1] pt-3">
              <p className="font-mono text-xs font-semibold text-[#2D6A4F] tabular-nums">
                Beat {b.beatNumber} · {b.startSec}–{b.endSec}s · {b.label}
              </p>
              {b.lines.map((l) => (
                <p key={l.id} className="text-sm leading-snug text-[#373D39]">
                  <span className="font-semibold text-[#1F2421]">
                    {l.speaker}:
                  </span>{' '}
                  {l.english}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[#D8D0C3] bg-white px-6 py-3 text-base font-semibold text-[#373D39] transition-colors hover:bg-[#F2EFE9]"
        >
          Back to Storyboard
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-[#2D6A4F] px-8 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-[#23533D]"
        >
          Go to Final Screen &amp; Quiz
        </button>
      </div>
    </section>
  );
}
