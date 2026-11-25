import { ArrowRight } from 'lucide-react';
import type { AppStep } from '../types';

export interface StepItem {
  id: AppStep;
  num: string;
  label: string;
  shortLabel: string;
}

export const APP_STEPS: StepItem[] = [
  { id: 'expressions', num: '1', label: 'Expressions', shortLabel: '1. Words' },
  { id: 'scene', num: '2', label: 'Scene', shortLabel: '2. Scene' },
  { id: 'storyboard', num: '3', label: 'Storyboard', shortLabel: '3. Story' },
  { id: 'video', num: '4', label: 'Video', shortLabel: '4. Video' },
  { id: 'final', num: '5', label: 'Final', shortLabel: '5. Final' },
];

interface StepNavProps {
  currentStep: AppStep;
  onSelectStep: (step: AppStep) => void;
  onPrimaryAction: () => void;
  primaryLabel: string;
  canProceed?: boolean;
}

export function StepNav({
  currentStep,
  onSelectStep,
  onPrimaryAction,
  primaryLabel,
  canProceed = true,
}: StepNavProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E5DFD5] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectStep('expressions');
            }}
            className="font-display text-xl font-bold tracking-tight text-[#1F2421] whitespace-nowrap shrink-0"
          >
            CampusScene 30
          </a>

          <nav
            aria-label="Creation steps"
            className="hidden md:flex items-center gap-6"
          >
            {APP_STEPS.map((step) => {
              const isActive = step.id === currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2D6A4F] ${
                    isActive
                      ? 'border-[#2D6A4F] text-[#2D6A4F] font-semibold'
                      : 'border-transparent text-[#575D59] hover:text-[#1F2421]'
                  }`}
                >
                  {step.num}. {step.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={!canProceed}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#23533D] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6A4F]"
            >
              <span>{primaryLabel}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile step navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#E5DFD5] bg-[#FAF8F5]/95 backdrop-blur-md md:hidden"
      >
        {APP_STEPS.map((step) => {
          const isActive = step.id === currentStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              aria-current={isActive ? 'step' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center px-1 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#E9F2EC] text-[#2D6A4F] font-semibold'
                  : 'text-[#575D59] hover:text-[#1F2421]'
              }`}
            >
              <span>{step.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
