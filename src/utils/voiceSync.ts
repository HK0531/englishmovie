import type { StoryBeat, TimedLineSegment } from '../types';
import { countWords } from './storyLogic';

export interface TrimmedBufferBounds {
  startSample: number;
  endSample: number;
  trimmedDurationSec: number;
}

/**
 * Finds the active speech region in mono/stereo PCM samples by stripping
 * leading and trailing digital silence while keeping a small natural breath pad.
 */
export function findSpeechBounds(
  samples: Float32Array,
  sampleRate: number,
  threshold = 0.008,
  padSec = 0.04,
): TrimmedBufferBounds {
  const len = samples.length;
  if (len === 0 || sampleRate <= 0) {
    return { startSample: 0, endSample: 0, trimmedDurationSec: 0 };
  }

  let first = -1;
  let last = -1;
  for (let i = 0; i < len; i++) {
    if (Math.abs(samples[i]) > threshold) {
      if (first === -1) first = i;
      last = i;
    }
  }

  if (first === -1 || last === -1) {
    return {
      startSample: 0,
      endSample: len,
      trimmedDurationSec: len / sampleRate,
    };
  }

  const padSamples = Math.round(padSec * sampleRate);
  const startSample = Math.max(0, first - padSamples);
  const endSample = Math.min(len, last + padSamples + 1);
  return {
    startSample,
    endSample,
    trimmedDurationSec: Math.max(0.1, (endSample - startSample) / sampleRate),
  };
}

export interface SyncedLineSegment extends TimedLineSegment {
  audioStartSec: number;
  audioEndSec: number;
  audioDurationSec: number;
  playbackRate: number;
}

/**
 * Schedules every line across all 4 beats so:
 * 1. Audio never overlaps across lines or beats.
 * 2. Subtitle display windows (`startSec`..`endSec`) wrap the exact spoken audio window (`audioStartSec`..`audioEndSec`).
 * 3. If a beat's lines exceed its beat window, `playbackRate` scales gently (capped <= 1.25x) so every word finishes inside the beat.
 */
export function buildAudioSyncedTimings(
  beats: StoryBeat[],
  durationsByLineId: Record<string, number>,
): SyncedLineSegment[] {
  const segments: SyncedLineSegment[] = [];

  beats.forEach((beat, beatIndex) => {
    const lines = beat.lines;
    if (lines.length === 0) return;

    const beatDuration = Math.max(1, beat.endSec - beat.startSec);
    const leadIn = Math.min(0.25, beatDuration * 0.05);
    const tailPad = Math.min(0.15, beatDuration * 0.03);
    const interGap = lines.length > 1 ? 0.25 : 0;

    // Estimate fallback duration from word count (~2.4 words/sec) if audio hasn't loaded yet
    const rawDurations = lines.map((l) => {
      const measured = durationsByLineId[l.id];
      if (typeof measured === 'number' && measured > 0.1) {
        return measured;
      }
      return Math.max(1.2, countWords(l.english) / 2.4);
    });

    const availableForSpeech = Math.max(
      0.8,
      beatDuration - leadIn - tailPad - interGap * (lines.length - 1),
    );
    const totalRawSpeech = rawDurations.reduce((a, b) => a + b, 0);

    // Gently speed up only if spoken audio exceeds available beat window
    const playbackRate =
      totalRawSpeech > availableForSpeech
        ? Math.min(1.25, totalRawSpeech / availableForSpeech)
        : 1.0;

    const scaledDurations = rawDurations.map((d) => d / playbackRate);
    const totalScaledSpeech = scaledDurations.reduce((a, b) => a + b, 0);

    // Distribute any leftover beat slack smoothly as natural breathing room
    const leftover = Math.max(
      0,
      beatDuration - leadIn - tailPad - totalScaledSpeech - interGap * (lines.length - 1),
    );
    const actualGap =
      lines.length > 1
        ? interGap + Math.min(0.45, leftover / lines.length)
        : 0;

    let cursor = beat.startSec + leadIn;
    lines.forEach((line, idx) => {
      const dur = scaledDurations[idx];
      const audioStartSec = Number(cursor.toFixed(3));
      const audioEndSec = Number(
        Math.min(beat.endSec - 0.02, cursor + dur).toFixed(3),
      );

      // Subtitle appears right when audio starts (or beat start for line 0) and stays until next line starts (or beat end for last line)
      const subStartSec = idx === 0 ? beat.startSec : audioStartSec;
      const subEndSec =
        idx === lines.length - 1
          ? beat.endSec
          : Number((audioEndSec + actualGap * 0.65).toFixed(3));

      segments.push({
        beatIndex,
        beatId: beat.id,
        beatLabel: beat.label,
        line,
        startSec: subStartSec,
        endSec: Math.max(subStartSec + 0.1, subEndSec),
        audioStartSec,
        audioEndSec,
        audioDurationSec: Number((audioEndSec - audioStartSec).toFixed(3)),
        playbackRate: Number(playbackRate.toFixed(3)),
      });

      cursor = audioEndSec + actualGap;
    });
  });

  return segments;
}
