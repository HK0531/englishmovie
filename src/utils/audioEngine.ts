import { findSpeechBounds } from './voiceSync';

// Soft, low-volume instrumental campus-cafe music synthesizer & dialogue audio mixer

export interface MusicScore {
  bpm: number;
  title: string;
  // 4 beats x 4 chords per beat x MIDI note numbers
  beatChords: number[][][];
}

export const DEFAULT_CAFE_SCORE: MusicScore = {
  bpm: 80,
  title: 'Morning Library Latte (Acoustic Lo-Fi)',
  beatChords: [
    // Beat 1 (Hook): Warm Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    [
      [53, 60, 64, 69],
      [52, 59, 62, 67],
      [50, 57, 60, 65],
      [48, 55, 59, 64],
    ],
    // Beat 2 (Problem): Gentle reflective Am7 -> Em7 -> Fmaj7 -> G6
    [
      [57, 60, 64, 67],
      [52, 59, 62, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 64],
    ],
    // Beat 3 (Turn): Hopeful Fmaj7 -> G7sus4 -> Em7 -> Am9
    [
      [53, 60, 64, 69],
      [55, 60, 62, 67],
      [52, 59, 62, 67],
      [57, 60, 64, 71],
    ],
    // Beat 4 (Close): Bright celebratory Dm9 -> G13 -> Cmaj9 -> Cmaj7
    [
      [50, 57, 60, 64],
      [55, 59, 64, 69],
      [48, 55, 59, 62],
      [48, 55, 60, 64],
    ],
  ],
};

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Renders a 30-second soft, warm instrumental WAV AudioBuffer using OfflineAudioContext.
 * Keeps volume very gentle (~0.11 peak) so dialogue voices always stay front and clear.
 */
export async function renderSoftBgmBuffer(
  score: MusicScore = DEFAULT_CAFE_SCORE,
  durationSec = 30,
): Promise<AudioBuffer> {
  const sampleRate = 24000;
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(sampleRate * durationSec),
    sampleRate,
  );

  const master = offline.createGain();
  master.gain.value = 0.11;

  const lowpass = offline.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1550;
  lowpass.Q.value = 0.7;

  master.connect(lowpass);
  lowpass.connect(offline.destination);

  const beatWindows: Array<[number, number]> = [
    [0, 7],
    [7, 15],
    [15, 23],
    [23, 30],
  ];

  const chordsByBeat =
    Array.isArray(score.beatChords) && score.beatChords.length === 4
      ? score.beatChords
      : DEFAULT_CAFE_SCORE.beatChords;

  beatWindows.forEach(([startSec, endSec], beatIdx) => {
    const chords =
      chordsByBeat[beatIdx] || DEFAULT_CAFE_SCORE.beatChords[beatIdx];
    const chordCount = Math.max(1, chords.length);
    const chordDur = (endSec - startSec) / chordCount;

    chords.forEach((notes, cIdx) => {
      const chordStart = startSec + cIdx * chordDur;
      notes.forEach((midi, nIdx) => {
        const freq = midiToHz(midi);
        const osc = offline.createOscillator();
        const g = offline.createGain();
        osc.type = nIdx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, chordStart);

        const noteStart = chordStart + nIdx * 0.035;
        const noteEnd = Math.min(durationSec, chordStart + chordDur - 0.05);
        g.gain.setValueAtTime(0.0001, noteStart);
        g.gain.linearRampToValueAtTime(nIdx === 0 ? 0.22 : 0.14, noteStart + 0.08);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          Math.max(noteStart + 0.15, noteEnd),
        );

        osc.connect(g);
        g.connect(master);
        osc.start(noteStart);
        osc.stop(Math.min(durationSec, noteEnd + 0.05));
      });

      const topNote = notes[notes.length - 1] ?? 64;
      const melodyTimes = [
        chordStart + chordDur * 0.45,
        chordStart + chordDur * 0.75,
      ];
      melodyTimes.forEach((mStart, mIdx) => {
        if (mStart >= durationSec - 0.2) return;
        const mMidi = topNote + (mIdx === 1 && beatIdx >= 2 ? 4 : 2);
        const osc = offline.createOscillator();
        const g = offline.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToHz(mMidi), mStart);
        g.gain.setValueAtTime(0.0001, mStart);
        g.gain.linearRampToValueAtTime(0.1, mStart + 0.03);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          Math.min(durationSec, mStart + 0.55),
        );
        osc.connect(g);
        g.connect(master);
        osc.start(mStart);
        osc.stop(Math.min(durationSec, mStart + 0.6));
      });
    });
  });

  master.gain.setValueAtTime(0.11, Math.max(0, durationSec - 1.2));
  master.gain.linearRampToValueAtTime(0.001, durationSec);

  return offline.startRendering();
}

export async function decodeAudioDataUrl(
  ctx: BaseAudioContext,
  dataUrl: string,
): Promise<AudioBuffer> {
  const response = await fetch(dataUrl);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

/**
 * Strips leading/trailing digital silence and normalizes peak dialogue loudness
 * so Jiho & Mina sound crisp and balanced at every beat.
 */
export function trimAndNormalizeSpeechBuffer(
  ctx: BaseAudioContext,
  decoded: AudioBuffer,
): AudioBuffer {
  const channel = decoded.getChannelData(0);
  const bounds = findSpeechBounds(channel, decoded.sampleRate, 0.008, 0.04);
  const outLen = Math.max(1, bounds.endSample - bounds.startSample);

  const outBuf = ctx.createBuffer(
    decoded.numberOfChannels,
    outLen,
    decoded.sampleRate,
  );

  let peak = 0;
  for (let i = bounds.startSample; i < bounds.endSample; i++) {
    const abs = Math.abs(channel[i]);
    if (abs > peak) peak = abs;
  }
  const gainScale = peak > 0.02 && peak < 0.78 ? Math.min(2.4, 0.84 / peak) : 1.0;

  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const src = decoded.getChannelData(ch);
    const dst = outBuf.getChannelData(ch);
    for (let i = 0; i < outLen; i++) {
      const sample = src[bounds.startSample + i] * gainScale;
      dst[i] = Math.max(-0.98, Math.min(0.98, sample));
    }
  }

  return outBuf;
}

/**
 * Clones an AudioBuffer synchronously into another BaseAudioContext (e.g., WebM export context).
 */
export function cloneAudioBufferForContext(
  targetCtx: BaseAudioContext,
  source: AudioBuffer,
): AudioBuffer {
  const cloned = targetCtx.createBuffer(
    source.numberOfChannels,
    source.length,
    source.sampleRate,
  );
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    cloned.copyToChannel(source.getChannelData(ch), ch);
  }
  return cloned;
}
