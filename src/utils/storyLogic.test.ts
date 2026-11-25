import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EXPRESSIONS,
  DEFAULT_QUIZ_QUESTIONS,
  DEFAULT_STORY_BEATS,
} from '../data/defaults';
import {
  buildDialogueTimings,
  countStoryboardWords,
  findExpressionMatches,
  findMatchedExpressionIds,
  formatSubtitleLines,
  gradeQuiz,
  validateExpressions,
} from './storyLogic';

test('validateExpressions passes with default 5 expressions across 2 movies', () => {
  const result = validateExpressions(DEFAULT_EXPRESSIONS);
  assert.equal(result.valid, true);
  assert.equal(result.hasMinCount, true);
  assert.equal(result.hasMultipleMovies, true);
  assert.equal(result.filledCount, 5);
  assert.equal(result.distinctMovies.length, 2);
  assert.equal(result.warnings.length, 0);
});

test('validateExpressions warns when fewer than 5 expressions', () => {
  const result = validateExpressions(DEFAULT_EXPRESSIONS.slice(0, 4));
  assert.equal(result.valid, false);
  assert.equal(result.hasMinCount, false);
  assert.equal(result.warnings.length, 1);
});

test('validateExpressions warns when all expressions come from only 1 movie', () => {
  const sameMovie = DEFAULT_EXPRESSIONS.map((item) => ({
    ...item,
    movie: 'Notting Hill',
  }));
  const result = validateExpressions(sameMovie);
  assert.equal(result.valid, false);
  assert.equal(result.hasMinCount, true);
  assert.equal(result.hasMultipleMovies, false);
  assert.equal(result.distinctMovies.length, 1);
  assert.equal(result.warnings.length, 1);
});

test('default 4-beat storyboard has exactly 63 words (within 60-70 range)', () => {
  const totalWords = countStoryboardWords(DEFAULT_STORY_BEATS);
  assert.equal(totalWords, 63);
  assert.ok(totalWords >= 60 && totalWords <= 70);
});

test('findExpressionMatches highlights all 5 target expressions across the default beats', () => {
  const matchedIds = findMatchedExpressionIds(
    DEFAULT_STORY_BEATS,
    DEFAULT_EXPRESSIONS,
  );
  assert.equal(matchedIds.size, 5);

  const beat3Line = findExpressionMatches(
    'Let me treat you to a latte.',
    DEFAULT_EXPRESSIONS,
  );
  assert.equal(beat3Line[0].matchedExpression?.expression, 'Let me');
  assert.equal(beat3Line[1].text, ' treat you to a latte.');
});

test('formatSubtitleLines caps subtitles at 2 balanced lines', () => {
  const shortLines = formatSubtitleLines("I'm really bummed about the result.");
  assert.equal(shortLines.length, 1);

  const longLines = formatSubtitleLines(
    'I was going to study last night, but I fell asleep.',
  );
  assert.equal(longLines.length, 2);
  assert.equal(
    longLines.join(' '),
    'I was going to study last night, but I fell asleep.',
  );
  assert.ok(longLines[0].endsWith(','));
});

test('buildDialogueTimings spans 0 to 30 seconds cleanly', () => {
  const timings = buildDialogueTimings(DEFAULT_STORY_BEATS);
  assert.equal(timings.length, 8);
  assert.equal(timings[0].startSec, 0);
  assert.equal(timings[timings.length - 1].endSec, 30);
});

test('gradeQuiz computes score and feedback accurately', () => {
  const perfect = gradeQuiz(DEFAULT_QUIZ_QUESTIONS, {
    'quiz-1': 0,
    'quiz-2': 1,
    'quiz-3': 2,
  });
  assert.equal(perfect.score, 3);
  assert.equal(perfect.total, 3);
  assert.equal(perfect.allAnswered, true);

  const partial = gradeQuiz(DEFAULT_QUIZ_QUESTIONS, {
    'quiz-1': 0,
    'quiz-2': 0,
  });
  assert.equal(partial.score, 1);
  assert.equal(partial.allAnswered, false);
  assert.equal(partial.perQuestion['quiz-1'].isCorrect, true);
  assert.equal(partial.perQuestion['quiz-2'].isCorrect, false);
  assert.equal(partial.perQuestion['quiz-3'].answered, false);
});
