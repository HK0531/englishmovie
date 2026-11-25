import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STORY_BEATS } from '../data/defaults';
import { buildAudioSyncedTimings, findSpeechBounds } from './voiceSync';

test('findSpeechBounds trims leading and trailing silence cleanly', () => {
  const sampleRate = 1000;
  const samples = new Float32Array(2000); // 2.0s total
  // Put speech from 0.4s to 1.4s
  for (let i = 400; i < 1400; i++) {
    samples[i] = 0.25;
  }
  const bounds = findSpeechBounds(samples, sampleRate, 0.01, 0.05);
  assert.equal(bounds.startSample, 350);
  assert.equal(bounds.endSample, 1450);
  assert.ok(Math.abs(bounds.trimmedDurationSec - 1.1) < 0.01);
});

test('buildAudioSyncedTimings ensures all 8 lines play sequentially with zero overlap across 4 beats', () => {
  const measured: Record<string, number> = {
    'b1-l1': 2.6,
    'b1-l2': 3.5,
    'b2-l1': 2.4,
    'b2-l2': 2.7,
    'b3-l1': 2.3,
    'b3-l2': 3.4,
    'b4-l1': 3.1,
    'b4-l2': 2.8,
  };

  const synced = buildAudioSyncedTimings(DEFAULT_STORY_BEATS, measured);
  assert.equal(synced.length, 8);

  for (let i = 0; i < synced.length; i++) {
    const seg = synced[i];
    const beat = DEFAULT_STORY_BEATS[seg.beatIndex];
    assert.ok(seg.audioStartSec >= beat.startSec);
    assert.ok(seg.audioEndSec <= beat.endSec);
    assert.ok(seg.startSec <= seg.audioStartSec);
    assert.ok(seg.endSec >= seg.audioEndSec);
    if (i > 0) {
      assert.ok(
        seg.audioStartSec >= synced[i - 1].audioEndSec,
        `Line ${i + 1} overlapped line ${i}`,
      );
      assert.ok(
        seg.startSec >= synced[i - 1].endSec - 0.001,
        `Subtitle ${i + 1} overlapped subtitle ${i}`,
      );
    }
  }
});

test('buildAudioSyncedTimings gently scales playbackRate if audio exceeds beat window', () => {
  const longDurations: Record<string, number> = {
    'b1-l1': 4.2,
    'b1-l2': 4.4,
  };
  const synced = buildAudioSyncedTimings([DEFAULT_STORY_BEATS[0]], longDurations);
  assert.equal(synced.length, 2);
  assert.ok(synced[0].playbackRate > 1.0);
  assert.ok(synced[1].audioEndSec <= 7.0);
});

test('buildAudioSyncedTimings falls back cleanly for lines without measured WAV durations', () => {
  const partial: Record<string, number> = { 'b1-l1': 3.2 };
  const synced = buildAudioSyncedTimings(DEFAULT_STORY_BEATS, partial);
  assert.equal(synced.length, 8);
  synced.forEach((seg, idx) => {
    const beat = DEFAULT_STORY_BEATS[seg.beatIndex];
    assert.ok(seg.audioStartSec >= beat.startSec);
    assert.ok(seg.audioEndSec <= beat.endSec);
    assert.ok(seg.audioDurationSec >= 0.8);
    assert.ok(seg.startSec <= seg.audioStartSec);
    assert.ok(seg.endSec >= seg.audioEndSec);
    if (idx > 0) {
      assert.ok(seg.audioStartSec >= synced[idx - 1].audioEndSec);
    }
  });
});

