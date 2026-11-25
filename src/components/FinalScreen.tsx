import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { COVER_THUMBNAIL_IMAGE } from '../data/defaults';
import type {
  ArtStyle,
  ExpressionItem,
  QuizQuestion,
  StoryBeat,
} from '../types';
import { gradeQuiz } from '../utils/storyLogic';
import { downloadCoverThumbnailPng } from '../utils/videoRenderer';
import { VideoPlayerBox } from './VideoPlayerBox';

interface FinalScreenProps {
  beats: StoryBeat[];
  style: ArtStyle;
  situation: string;
  expressions: ExpressionItem[];
  quizQuestions: QuizQuestion[];
  onChangeStyle: (nextStyle: ArtStyle) => void;
  onUpdateQuiz: (nextQuiz: QuizQuestion[]) => void;
  onBack: () => void;
}

export function FinalScreen({
  beats,
  style,
  situation,
  expressions,
  quizQuestions,
  onChangeStyle,
  onUpdateQuiz,
  onBack,
}: FinalScreenProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [isDownloadingThumb, setIsDownloadingThumb] = useState(false);
  const [isRefreshingQuiz, setIsRefreshingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const quizResult = gradeQuiz(quizQuestions, selectedAnswers);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleDownloadThumbnail = async () => {
    setIsDownloadingThumb(true);
    try {
      await downloadCoverThumbnailPng('CampusScene-30-Thumbnail.png');
    } finally {
      setIsDownloadingThumb(false);
    }
  };

  const handleRegenerateQuiz = async () => {
    setQuizError(null);
    setIsRefreshingQuiz(true);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions, beats }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not refresh quiz.');
      }
      if (Array.isArray(data.quiz) && data.quiz.length > 0) {
        onUpdateQuiz(data.quiz);
        setSelectedAnswers({});
      }
    } catch (err) {
      setQuizError(
        err instanceof Error ? err.message : 'Failed to refresh quiz.',
      );
    } finally {
      setIsRefreshingQuiz(false);
    }
  };

  return (
    <section className="space-y-10">
      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-semibold text-[#2D6A4F]">
          Step 5 of 5 · Play, Download &amp; Practice
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#1F2421] sm:text-4xl">
          Your CampusScene 30 film is ready
        </h1>
        <p className="text-base leading-relaxed text-[#575D59]">
          Watch or download your 30-second clip, save the cover thumbnail, and
          test your memory with the expression quiz below.
        </p>
      </div>

      {/* Play & Download 30s Video */}
      <VideoPlayerBox
        beats={beats}
        style={style}
        situation={situation}
        onChangeStyle={onChangeStyle}
        showDownloadButton={true}
      />

      {/* Cover Thumbnail + Expression Quiz 2-Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Cover Thumbnail Card */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-[#E5DFD5] bg-white p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-[#1F2421]">
                Cover Thumbnail
              </h2>
              <p className="text-sm text-[#575D59]">
                Features &ldquo;CampusScene 30&rdquo; with Mina and Jiho at the
                campus cafe.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E5DFD5] bg-[#EFEAE1]">
              {!thumbFailed ? (
                <img
                  src={COVER_THUMBNAIL_IMAGE}
                  alt="CampusScene 30 cover thumbnail featuring Mina and Jiho"
                  referrerPolicy="no-referrer"
                  onError={() => setThumbFailed(true)}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-[#EFEAE1] p-6 text-center">
                  <ImageIcon
                    className="h-8 w-8 text-[#575D59]"
                    aria-hidden="true"
                  />
                  <p className="font-display text-lg font-bold text-[#1F2421]">
                    CampusScene 30
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownloadThumbnail}
              disabled={isDownloadingThumb}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#23533D] disabled:opacity-60"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              <span>
                {isDownloadingThumb
                  ? 'Preparing Thumbnail...'
                  : 'Download Thumbnail (.png)'}
              </span>
            </button>
          </div>
        </div>

        {/* 3-Question Expression Quiz ("표현 퀴즈") */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-[#E5DFD5] bg-white p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#1F2421]">
                  표현 퀴즈 (Expression Quiz)
                </h2>
                <p className="text-sm text-[#575D59]">
                  Check the Korean meanings of the expressions from your clip.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  data-testid="quiz-score"
                  className="font-mono text-base font-bold text-[#2D6A4F] tabular-nums whitespace-nowrap shrink-0"
                >
                  Score: {quizResult.score} / {quizResult.total}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAnswers({})}
                  aria-label="Reset quiz answers"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-3.5 py-2 text-sm font-medium text-[#373D39] hover:bg-[#F2EFE9] whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateQuiz}
                  disabled={isRefreshingQuiz}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#2D6A4F]/40 bg-[#E9F2EC] px-3.5 py-2 text-sm font-semibold text-[#2D6A4F] hover:bg-[#DCEBE1] disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {isRefreshingQuiz ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>New Quiz</span>
                </button>
              </div>
            </div>

            {quizError && (
              <p role="alert" className="text-sm text-[#B91C1C]">
                {quizError}
              </p>
            )}

            <div className="space-y-6">
              {quizQuestions.map((q, qIdx) => {
                const status = quizResult.perQuestion[q.id];
                const answered = status?.answered;

                return (
                  <div
                    key={q.id}
                    data-testid={`quiz-question-${qIdx + 1}`}
                    className="space-y-3 border-t border-[#EFEAE1] pt-5 first:border-t-0 first:pt-0"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#575D59]">
                        Question {qIdx + 1} · {q.movie}
                      </p>
                      <p className="font-display text-lg font-bold text-[#1F2421]">
                        {q.prompt}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => {
                        const isPicked = status?.selectedIndex === optIdx;
                        const isRightOption = optIdx === q.correctIndex;

                        let btnClass =
                          'border-[#D8D0C3] bg-[#FAF8F5] text-[#1F2421] hover:bg-[#F2EFE9]';
                        if (answered) {
                          if (isRightOption) {
                            btnClass =
                              'border-[#2D6A4F] bg-[#E9F2EC] text-[#1B4332] font-semibold';
                          } else if (isPicked && !isRightOption) {
                            btnClass =
                              'border-[#DC2626] bg-[#FEF2F2] text-[#991B1B]';
                          }
                        } else if (isPicked) {
                          btnClass =
                            'border-[#2D6A4F] bg-[#E9F2EC] text-[#1F2421]';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`flex min-h-[50px] items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-base transition-colors ${btnClass}`}
                          >
                            <span>{opt}</span>
                            {answered && isRightOption && (
                              <CheckCircle2
                                className="h-5 w-5 shrink-0 text-[#2D6A4F]"
                                aria-hidden="true"
                              />
                            )}
                            {answered && isPicked && !isRightOption && (
                              <XCircle
                                className="h-5 w-5 shrink-0 text-[#DC2626]"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div
                        data-testid={`quiz-feedback-${qIdx + 1}`}
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          status.isCorrect
                            ? 'bg-[#E9F2EC] text-[#1B4332]'
                            : 'bg-[#FEF3C7]/80 text-[#78350F]'
                        }`}
                      >
                        <span className="font-bold">
                          {status.isCorrect ? '정답이에요! ' : '아쉬워요! '}
                        </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {quizResult.allAnswered && (
              <div
                data-testid="quiz-summary"
                className="rounded-2xl border border-[#2D6A4F]/35 bg-[#E9F2EC] p-4 text-center"
              >
                <p className="font-display text-lg font-bold text-[#1B4332]">
                  완료! Final Score: {quizResult.score} / {quizResult.total}
                </p>
                <p className="mt-1 text-sm text-[#274C3A]">
                  {quizResult.score === quizResult.total
                    ? '완벽해요! 영화 속 5가지 표현을 모두 자연스럽게 익혔어요.'
                    : '좋아요! 영상을 한 번 더 보면서 헷갈렸던 표현을 복습해 보세요.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back link + Exact Required Credit */}
      <div className="flex flex-col gap-4 border-t border-[#E5DFD5] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-[#D8D0C3] bg-white px-6 py-3 text-base font-semibold text-[#373D39] transition-colors hover:bg-[#F2EFE9]"
        >
          Back to Video Player
        </button>

        <p className="text-center text-base font-medium text-[#575D59] sm:text-right">
          Made with Google AI Studio · Script by Hyun Kim
        </p>
      </div>
    </section>
  );
}
