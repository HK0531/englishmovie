import { AlertTriangle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { ExpressionItem } from '../types';
import { validateExpressions } from '../utils/storyLogic';

interface ExpressionsScreenProps {
  expressions: ExpressionItem[];
  onChangeExpressions: (next: ExpressionItem[]) => void;
  onResetDefaults: () => void;
  onNext: () => void;
}

export function ExpressionsScreen({
  expressions,
  onChangeExpressions,
  onResetDefaults,
  onNext,
}: ExpressionsScreenProps) {
  const validation = validateExpressions(expressions);

  const handleUpdate = (
    id: string,
    field: keyof Omit<ExpressionItem, 'id'>,
    value: string,
  ) => {
    onChangeExpressions(
      expressions.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleAdd = () => {
    onChangeExpressions([
      ...expressions,
      {
        id: `expr-${Date.now()}`,
        expression: '',
        koreanMeaning: '',
        movie: '',
      },
    ]);
  };

  const handleRemove = (id: string) => {
    onChangeExpressions(expressions.filter((item) => item.id !== id));
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold text-[#2D6A4F]">
            Step 1 of 5 · Movie Expressions
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#1F2421] sm:text-4xl">
            Collect 5 English expressions you learned from movies
          </h1>
          <p className="text-base leading-relaxed text-[#575D59]">
            Add at least 5 expressions from 2 or more movies. We&apos;ll weave
            them naturally into a 30-second animated campus dialogue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#D8D0C3] bg-white px-4 py-2.5 text-sm font-medium text-[#373D39] transition-colors hover:bg-[#F2EFE9] whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Sample (5)</span>
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#2D6A4F] bg-[#E9F2EC] px-5 py-2.5 text-sm font-semibold text-[#2D6A4F] transition-colors hover:bg-[#DCEBE1] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Expression</span>
          </button>
        </div>
      </div>

      {/* Validation summary and warnings */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[#E5DFD5] py-4 text-sm text-[#4A504C]">
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <span className="font-semibold text-[#1F2421]">
            {validation.filledCount} / 5+ expressions ready
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {validation.distinctMovies.length} distinct{' '}
            {validation.distinctMovies.length === 1 ? 'movie' : 'movies'}
          </span>
        </div>
        <span
          className={`font-semibold ${
            validation.valid ? 'text-[#2D6A4F]' : 'text-[#B45309]'
          }`}
        >
          {validation.valid ? 'Ready for scene setup' : 'Action needed'}
        </span>
      </div>

      {validation.warnings.length > 0 && (
        <div
          role="alert"
          data-testid="expression-warning"
          className="rounded-2xl border border-[#F59E0B]/50 bg-[#FEF3C7]/70 p-5 text-[#78350F]"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]"
              aria-hidden="true"
            />
            <div className="space-y-1.5">
              <p className="font-display text-base font-bold">
                Check your expression list before continuing
              </p>
              <ul className="space-y-1 text-base leading-snug">
                {validation.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Expression rows */}
      <div className="space-y-5">
        {expressions.map((item, idx) => (
          <div
            key={item.id}
            data-testid="expression-row"
            className="rounded-2xl border border-[#E5DFD5] bg-white p-5 sm:p-6 shadow-xs"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-[#1F2421] tabular-nums">
                Expression {idx + 1}
              </h2>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove expression ${idx + 1}`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[#6B726E] transition-colors hover:bg-[#FDECEC] hover:text-[#B91C1C]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <label
                  htmlFor={`${item.id}-expr`}
                  className="mb-1.5 block text-sm font-semibold text-[#373D39]"
                >
                  English Expression
                </label>
                <input
                  id={`${item.id}-expr`}
                  type="text"
                  value={item.expression}
                  onChange={(e) =>
                    handleUpdate(item.id, 'expression', e.target.value)
                  }
                  placeholder="e.g. I'm really bummed about the result."
                  className="min-h-[48px] w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-4 py-3 text-base text-[#1F2421] placeholder:text-[#8E9490] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="lg:col-span-4">
                <label
                  htmlFor={`${item.id}-ko`}
                  className="mb-1.5 block text-sm font-semibold text-[#373D39]"
                >
                  Korean Meaning (한국어 뜻)
                </label>
                <input
                  id={`${item.id}-ko`}
                  type="text"
                  value={item.koreanMeaning}
                  onChange={(e) =>
                    handleUpdate(item.id, 'koreanMeaning', e.target.value)
                  }
                  placeholder="e.g. 결과 때문에 정말 속상해."
                  className="min-h-[48px] w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-4 py-3 text-base text-[#1F2421] placeholder:text-[#8E9490] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor={`${item.id}-movie`}
                  className="mb-1.5 block text-sm font-semibold text-[#373D39]"
                >
                  Movie Source (영화)
                </label>
                <input
                  id={`${item.id}-movie`}
                  type="text"
                  value={item.movie}
                  onChange={(e) =>
                    handleUpdate(item.id, 'movie', e.target.value)
                  }
                  placeholder="e.g. Inside Out 2"
                  className="min-h-[48px] w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-4 py-3 text-base text-[#1F2421] placeholder:text-[#8E9490] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#575D59]">
          Tip: Keep movie titles across at least 2 films to unlock richer
          everyday situations.
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={!validation.valid}
          className="inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-[#2D6A4F] px-8 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-[#23533D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Scene Setup
        </button>
      </div>
    </section>
  );
}
