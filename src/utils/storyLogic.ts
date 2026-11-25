import type {
  DialogueLine,
  ExpressionItem,
  QuizQuestion,
  StoryBeat,
  TimedLineSegment,
} from '../types';

export interface ExpressionValidationResult {
  valid: boolean;
  filledCount: number;
  hasMinCount: boolean;
  distinctMovies: string[];
  hasMultipleMovies: boolean;
  warnings: string[];
}

export function validateExpressions(
  expressions: ExpressionItem[],
): ExpressionValidationResult {
  const filled = expressions.filter(
    (item) =>
      item.expression.trim().length > 0 &&
      item.koreanMeaning.trim().length > 0 &&
      item.movie.trim().length > 0,
  );

  const distinctMovies = Array.from(
    new Set(
      filled
        .map((item) => item.movie.trim())
        .filter((movie) => movie.length > 0)
        .map((movie) => movie.toLowerCase()),
    ),
  );

  const hasMinCount = filled.length >= 5;
  const hasMultipleMovies = distinctMovies.length >= 2;
  const warnings: string[] = [];

  if (!hasMinCount) {
    warnings.push(
      `5개 이상의 완성된 표현을 입력해 주세요 (현재 ${filled.length}개). At least 5 complete expressions are required.`,
    );
  }
  if (!hasMultipleMovies) {
    warnings.push(
      `최소 2편 이상의 서로 다른 영화에서 표현을 가져와 주세요 (현재 ${distinctMovies.length}편). Please include expressions from at least 2 different movies.`,
    );
  }

  return {
    valid: hasMinCount && hasMultipleMovies,
    filledCount: filled.length,
    hasMinCount,
    distinctMovies,
    hasMultipleMovies,
    warnings,
  };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countStoryboardWords(beats: StoryBeat[]): number {
  return beats.reduce((sum, beat) => {
    const beatWords = beat.lines.reduce(
      (lineSum, line) => lineSum + countWords(line.english),
      0,
    );
    return sum + beatWords;
  }, 0);
}

export interface LineSegment {
  text: string;
  matchedExpression: ExpressionItem | null;
}

function isWordBoundaryChar(ch: string | undefined): boolean {
  if (!ch) return true;
  return !/[a-zA-Z0-9']/.test(ch);
}

export function findExpressionMatches(
  lineText: string,
  expressions: ExpressionItem[],
): LineSegment[] {
  if (!lineText) return [];
  const candidates = expressions
    .filter((item) => item.expression.trim().length > 0)
    .sort((a, b) => b.expression.trim().length - a.expression.trim().length);

  if (candidates.length === 0) {
    return [{ text: lineText, matchedExpression: null }];
  }

  const lowerLine = lineText.toLowerCase();
  const occupied: Array<{
    start: number;
    end: number;
    item: ExpressionItem;
  }> = [];

  for (const item of candidates) {
    const needle = item.expression.trim().toLowerCase();
    let searchFrom = 0;
    while (searchFrom < lowerLine.length) {
      const idx = lowerLine.indexOf(needle, searchFrom);
      if (idx === -1) break;

      const beforeChar = lineText[idx - 1];
      const afterChar = lineText[idx + needle.length];
      const boundaryOk =
        isWordBoundaryChar(beforeChar) && isWordBoundaryChar(afterChar);

      const overlaps = occupied.some(
        (span) => !(idx + needle.length <= span.start || idx >= span.end),
      );

      if (boundaryOk && !overlaps) {
        occupied.push({
          start: idx,
          end: idx + needle.length,
          item,
        });
      }
      searchFrom = idx + needle.length;
    }
  }

  if (occupied.length === 0) {
    return [{ text: lineText, matchedExpression: null }];
  }

  occupied.sort((a, b) => a.start - b.start);

  const segments: LineSegment[] = [];
  let cursor = 0;
  for (const span of occupied) {
    if (span.start > cursor) {
      segments.push({
        text: lineText.slice(cursor, span.start),
        matchedExpression: null,
      });
    }
    segments.push({
      text: lineText.slice(span.start, span.end),
      matchedExpression: span.item,
    });
    cursor = span.end;
  }

  if (cursor < lineText.length) {
    segments.push({
      text: lineText.slice(cursor),
      matchedExpression: null,
    });
  }

  return segments;
}

export function findMatchedExpressionIds(
  beats: StoryBeat[],
  expressions: ExpressionItem[],
): Set<string> {
  const matched = new Set<string>();
  for (const beat of beats) {
    for (const line of beat.lines) {
      for (const seg of findExpressionMatches(line.english, expressions)) {
        if (seg.matchedExpression) {
          matched.add(seg.matchedExpression.id);
        }
      }
    }
  }
  return matched;
}

/**
 * Splits a spoken English line into at most two balanced subtitle lines
 * with one thought/clause per line.
 */
export function formatSubtitleLines(text: string): string[] {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return [];

  if (clean.length <= 36) {
    return [clean];
  }

  // Prefer natural thought/clause boundaries near the middle
  const words = clean.split(' ');
  const midpoint = Math.floor(clean.length / 2);

  let bestBreakIdx = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  let runningLen = 0;

  for (let i = 0; i < words.length - 1; i++) {
    runningLen += words[i].length + (i > 0 ? 1 : 0);
    const endsWithPause = /[,?!.;:—-]$/.test(words[i]);
    const dist = Math.abs(runningLen - midpoint);
    const score = dist - (endsWithPause ? 14 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestBreakIdx = i + 1;
    }
  }

  if (bestBreakIdx <= 0 || bestBreakIdx >= words.length) {
    return [clean];
  }

  const line1 = words.slice(0, bestBreakIdx).join(' ');
  const line2 = words.slice(bestBreakIdx).join(' ');
  return [line1, line2];
}

export function buildDialogueTimings(beats: StoryBeat[]): TimedLineSegment[] {
  const segments: TimedLineSegment[] = [];

  beats.forEach((beat, beatIndex) => {
    const lines = beat.lines;
    if (lines.length === 0) return;

    const beatDuration = Math.max(1, beat.endSec - beat.startSec);
    const weights = lines.map((l) => Math.max(3, countWords(l.english)));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let currentSec = beat.startSec;
    lines.forEach((line: DialogueLine, idx: number) => {
      const share =
        idx === lines.length - 1
          ? beat.endSec - currentSec
          : (beatDuration * weights[idx]) / totalWeight;
      const startSec = Number(currentSec.toFixed(2));
      const endSec = Number((currentSec + share).toFixed(2));
      segments.push({
        beatIndex,
        beatId: beat.id,
        beatLabel: beat.label,
        line,
        startSec,
        endSec,
      });
      currentSec += share;
    });
  });

  return segments;
}

export interface QuizGradeResult {
  score: number;
  total: number;
  allAnswered: boolean;
  perQuestion: Record<
    string,
    {
      answered: boolean;
      selectedIndex: number | null;
      isCorrect: boolean;
    }
  >;
}

export function gradeQuiz(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>,
): QuizGradeResult {
  let score = 0;
  let answeredCount = 0;
  const perQuestion: QuizGradeResult['perQuestion'] = {};

  for (const q of questions) {
    const hasSelection = Object.prototype.hasOwnProperty.call(
      selectedAnswers,
      q.id,
    );
    const selectedIndex = hasSelection ? selectedAnswers[q.id] : null;
    const isCorrect = hasSelection && selectedIndex === q.correctIndex;
    if (hasSelection) answeredCount += 1;
    if (isCorrect) score += 1;
    perQuestion[q.id] = {
      answered: hasSelection,
      selectedIndex,
      isCorrect,
    };
  }

  return {
    score,
    total: questions.length,
    allAnswered: answeredCount === questions.length && questions.length > 0,
    perQuestion,
  };
}
