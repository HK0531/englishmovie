import { useState } from 'react';
import {
  BookOpen,
  Check,
  Edit3,
  Film,
  Loader2,
  RefreshCw,
  Wand2,
  X,
} from 'lucide-react';
import type {
  DialogueLine,
  ExpressionItem,
  QuizQuestion,
  SceneSetup,
  StoryBeat,
} from '../types';
import {
  countStoryboardWords,
  findExpressionMatches,
  findMatchedExpressionIds,
} from '../utils/storyLogic';

interface StoryboardScreenProps {
  beats: StoryBeat[];
  expressions: ExpressionItem[];
  scene: SceneSetup;
  onChangeBeats: (next: StoryBeat[]) => void;
  onUpdateQuiz?: (quiz: QuizQuestion[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StoryboardScreen({
  beats,
  expressions,
  scene,
  onChangeBeats,
  onUpdateQuiz,
  onBack,
  onNext,
}: StoryboardScreenProps) {
  const [selectedExpression, setSelectedExpression] =
    useState<ExpressionItem | null>(null);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState('');
  const [draftLines, setDraftLines] = useState<DialogueLine[]>([]);
  const [regeneratingBeatId, setRegeneratingBeatId] = useState<string | null>(
    null,
  );
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const totalWords = countStoryboardWords(beats);
  const wordRangeOk = totalWords >= 60 && totalWords <= 70;
  const matchedIds = findMatchedExpressionIds(beats, expressions);

  const startEditing = (beat: StoryBeat) => {
    setEditingBeatId(beat.id);
    setDraftDescription(beat.sceneDescription);
    setDraftLines(beat.lines.map((l) => ({ ...l })));
  };

  const cancelEditing = () => {
    setEditingBeatId(null);
    setDraftLines([]);
  };

  const saveEditing = (beatId: string) => {
    onChangeBeats(
      beats.map((b) =>
        b.id === beatId
          ? {
              ...b,
              sceneDescription: draftDescription.trim(),
              lines: draftLines.map((l) => ({
                ...l,
                english: l.english.trim(),
                korean: l.korean.trim(),
              })),
            }
          : b,
      ),
    );
    setEditingBeatId(null);
  };

  const handleRegenerateBeat = async (beat: StoryBeat) => {
    setApiError(null);
    setRegeneratingBeatId(beat.id);
    try {
      const response = await fetch('/api/storyboard/regenerate-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beat,
          allBeats: beats,
          expressions,
          scene,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not regenerate this beat.');
      }
      if (Array.isArray(data.lines) && data.lines.length > 0) {
        onChangeBeats(
          beats.map((b) =>
            b.id === beat.id
              ? {
                  ...b,
                  sceneDescription: data.sceneDescription || b.sceneDescription,
                  lines: data.lines,
                }
              : b,
          ),
        );
      }
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Failed to regenerate beat.',
      );
    } finally {
      setRegeneratingBeatId(null);
    }
  };

  const handleRegenerateFullScript = async () => {
    setApiError(null);
    setIsGeneratingFull(true);
    try {
      const response = await fetch('/api/storyboard/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions, scene }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not generate a new script.');
      }
      if (Array.isArray(data.beats) && data.beats.length === 4) {
        onChangeBeats(data.beats);
      }
      if (Array.isArray(data.quiz) && data.quiz.length > 0 && onUpdateQuiz) {
        onUpdateQuiz(data.quiz);
      }
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Failed to generate script.',
      );
    } finally {
      setIsGeneratingFull(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold text-[#2D6A4F]">
            Step 3 of 5 · 30-Second Storyboard
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#1F2421] sm:text-4xl">
            4 Beats · 30 Seconds
          </h1>
          <p className="text-base leading-relaxed text-[#575D59]">
            Click any highlighted expression in the dialogue to see its Korean
            meaning and movie source. Edit or regenerate any beat anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegenerateFullScript}
          disabled={isGeneratingFull}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#D8D0C3] bg-white px-5 py-2.5 text-sm font-semibold text-[#1F2421] transition-colors hover:bg-[#F2EFE9] disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {isGeneratingFull ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Wand2 className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
          )}
          <span>Adapt Script to My Expressions</span>
        </button>
      </div>

      {/* Storyboard status summary (unboxed clean metadata) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[#E5DFD5] py-4 text-sm text-[#4A504C]">
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <span
            data-testid="storyboard-word-count"
            className={`font-semibold ${
              wordRangeOk ? 'text-[#2D6A4F]' : 'text-[#B45309]'
            }`}
          >
            {totalWords} words
          </span>
          <span aria-hidden="true">·</span>
          <span>Target 60–70 words</span>
          <span aria-hidden="true">·</span>
          <span>
            {matchedIds.size} / {expressions.length} expressions highlighted
          </span>
        </div>
        <span className="text-sm font-medium text-[#575D59]">
          Style: {scene.style}
        </span>
      </div>

      {apiError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] px-5 py-4 text-sm text-[#991B1B]"
        >
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => setApiError(null)}
            aria-label="Dismiss error"
            className="min-h-[40px] min-w-[40px] rounded-lg p-2 hover:bg-[#FEE2E2]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Selected expression detail card when clicked */}
      {selectedExpression && (
        <div
          data-testid="expression-popover"
          role="region"
          aria-label="Expression meaning and movie source"
          className="rounded-2xl border border-[#2D6A4F]/35 bg-[#E9F2EC] p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#2D6A4F]">
                <Film className="h-4 w-4" aria-hidden="true" />
                <span>Movie: {selectedExpression.movie}</span>
              </div>
              <p className="font-display text-xl font-bold text-[#1F2421]">
                &ldquo;{selectedExpression.expression}&rdquo;
              </p>
              <p className="text-lg font-medium text-[#274C3A]">
                {selectedExpression.koreanMeaning}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedExpression(null)}
              aria-label="Close expression details"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#2D6A4F] hover:bg-[#DCEBE1]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 4 Beats Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {beats.map((beat) => {
          const isEditing = editingBeatId === beat.id;
          const isRegenerating = regeneratingBeatId === beat.id;

          return (
            <article
              key={beat.id}
              data-testid={`beat-card-${beat.beatNumber}`}
              className="flex flex-col justify-between rounded-2xl border border-[#E5DFD5] bg-white p-6"
            >
              <div className="space-y-4">
                {/* Beat header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-mono text-sm font-semibold text-[#2D6A4F] tabular-nums">
                      Beat {beat.beatNumber} · {beat.startSec}–{beat.endSec}s ·{' '}
                      {beat.label}
                    </p>
                    <h2 className="font-display text-xl font-bold text-[#1F2421]">
                      {beat.label}
                    </h2>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(beat)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-3.5 py-2 text-sm font-medium text-[#373D39] transition-colors hover:bg-[#F2EFE9]"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateBeat(beat)}
                        disabled={isRegenerating}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#2D6A4F]/40 bg-[#E9F2EC] px-3.5 py-2 text-sm font-semibold text-[#2D6A4F] transition-colors hover:bg-[#DCEBE1] disabled:opacity-60"
                      >
                        {isRegenerating ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>Regenerate</span>
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#373D39]">
                        Scene Description
                      </label>
                      <textarea
                        rows={2}
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        className="w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-3.5 py-2.5 text-base text-[#1F2421] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
                      />
                    </div>

                    {draftLines.map((line, lIdx) => (
                      <div
                        key={line.id}
                        className="space-y-2 rounded-xl bg-[#FAF8F5] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#373D39]">
                            Line {lIdx + 1} Speaker
                          </span>
                          <select
                            value={line.speaker}
                            onChange={(e) => {
                              const speaker =
                                e.target.value === 'Mina' ? 'Mina' : 'Jiho';
                              setDraftLines((prev) =>
                                prev.map((item, idx) =>
                                  idx === lIdx ? { ...item, speaker } : item,
                                ),
                              );
                            }}
                            className="min-h-[40px] rounded-lg border border-[#D8D0C3] bg-white px-3 text-sm font-medium text-[#1F2421]"
                          >
                            <option value="Jiho">Jiho</option>
                            <option value="Mina">Mina</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={line.english}
                          onChange={(e) =>
                            setDraftLines((prev) =>
                              prev.map((item, idx) =>
                                idx === lIdx
                                  ? { ...item, english: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          aria-label={`Beat ${beat.beatNumber} line ${lIdx + 1} English`}
                          className="min-h-[44px] w-full rounded-lg border border-[#D8D0C3] bg-white px-3 py-2 text-base text-[#1F2421]"
                        />
                        <input
                          type="text"
                          value={line.korean}
                          onChange={(e) =>
                            setDraftLines((prev) =>
                              prev.map((item, idx) =>
                                idx === lIdx
                                  ? { ...item, korean: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          aria-label={`Beat ${beat.beatNumber} line ${lIdx + 1} Korean`}
                          placeholder="Korean subtitle translation"
                          className="min-h-[44px] w-full rounded-lg border border-[#D8D0C3] bg-white px-3 py-2 text-sm text-[#575D59]"
                        />
                      </div>
                    ))}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="min-h-[44px] rounded-xl border border-[#D8D0C3] bg-white px-4 py-2 text-sm font-medium text-[#373D39]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditing(beat.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2D6A4F] px-5 py-2 text-sm font-semibold text-white"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>Save Beat</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-base leading-relaxed text-[#575D59]">
                      {beat.sceneDescription}
                    </p>

                    <div className="space-y-3 border-t border-[#EFEAE1] pt-4">
                      {beat.lines.map((line) => {
                        const segments = findExpressionMatches(
                          line.english,
                          expressions,
                        );
                        return (
                          <div key={line.id} className="space-y-1">
                            <p className="text-lg leading-relaxed text-[#1F2421]">
                              <span className="mr-2 font-display text-sm font-bold text-[#2D6A4F]">
                                {line.speaker}:
                              </span>
                              {segments.map((seg, sIdx) =>
                                seg.matchedExpression ? (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedExpression(
                                        seg.matchedExpression,
                                      )
                                    }
                                    className="mx-0.5 inline rounded-md bg-[#FEF3C7] px-1.5 py-0.5 font-semibold text-[#92400E] underline decoration-[#D97706] decoration-2 underline-offset-4 transition-colors hover:bg-[#FDE68A]"
                                  >
                                    {seg.text}
                                  </button>
                                ) : (
                                  <span key={sIdx}>{seg.text}</span>
                                ),
                              )}
                            </p>
                            <p className="text-sm text-[#6B726E]">
                              {line.korean}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Quick legend of all 5 expressions */}
      <div className="rounded-2xl border border-[#E5DFD5] bg-[#F2EFE9]/70 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#373D39]">
          <BookOpen className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
          <span>Click any target expression to inspect meaning &amp; movie</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {expressions.map((expr) => {
            const used = matchedIds.has(expr.id);
            return (
              <button
                key={expr.id}
                type="button"
                onClick={() => setSelectedExpression(expr)}
                className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-left text-sm transition-colors ${
                  selectedExpression?.id === expr.id
                    ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                    : used
                      ? 'border-[#D97706]/40 bg-[#FEF3C7]/80 text-[#78350F] hover:bg-[#FDE68A]'
                      : 'border-[#D8D0C3] bg-white text-[#575D59] hover:bg-[#FAF8F5]'
                }`}
              >
                {expr.expression}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[#D8D0C3] bg-white px-6 py-3 text-base font-semibold text-[#373D39] transition-colors hover:bg-[#F2EFE9]"
        >
          Back to Scene
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-[#2D6A4F] px-8 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-[#23533D]"
        >
          Generate &amp; Watch 30s Video
        </button>
      </div>
    </section>
  );
}
