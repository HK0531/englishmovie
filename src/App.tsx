import { useState } from 'react';
import {
  DEFAULT_EXPRESSIONS,
  DEFAULT_QUIZ_QUESTIONS,
  DEFAULT_SCENE_SETUP,
  DEFAULT_STORY_BEATS,
} from './data/defaults';
import { ExpressionsScreen } from './components/ExpressionsScreen';
import { FinalScreen } from './components/FinalScreen';
import { SceneScreen } from './components/SceneScreen';
import { StepNav } from './components/StepNav';
import { StoryboardScreen } from './components/StoryboardScreen';
import { VideoScreen } from './components/VideoScreen';
import type {
  AppStep,
  ArtStyle,
  ExpressionItem,
  QuizQuestion,
  SceneSetup,
  StoryBeat,
} from './types';
import { validateExpressions } from './utils/storyLogic';

const STEP_ORDER: AppStep[] = [
  'expressions',
  'scene',
  'storyboard',
  'video',
  'final',
];

function getInitialStep(): AppStep {
  if (typeof window === 'undefined') return 'expressions';
  const params = new URLSearchParams(window.location.search);
  const stepParam = params.get('step') as AppStep | null;
  if (stepParam && STEP_ORDER.includes(stepParam)) return stepParam;
  if (params.get('autostart') === '1') return 'video';
  return 'expressions';
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>(getInitialStep);
  const [expressions, setExpressions] =
    useState<ExpressionItem[]>(DEFAULT_EXPRESSIONS);
  const [scene, setScene] = useState<SceneSetup>(DEFAULT_SCENE_SETUP);
  const [beats, setBeats] = useState<StoryBeat[]>(DEFAULT_STORY_BEATS);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    DEFAULT_QUIZ_QUESTIONS,
  );

  const validation = validateExpressions(expressions);

  const primaryActionMap: Record<
    AppStep,
    { label: string; next: AppStep; disabled?: boolean }
  > = {
    expressions: {
      label: 'Scene Setup',
      next: 'scene',
      disabled: !validation.valid,
    },
    scene: { label: 'Storyboard', next: 'storyboard' },
    storyboard: { label: 'Create Video', next: 'video' },
    video: { label: 'Final & Quiz', next: 'final' },
    final: { label: 'Start Over', next: 'expressions' },
  };

  const activePrimary = primaryActionMap[currentStep];

  const handleSelectStep = (step: AppStep) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleStyleSwitch = (nextStyle: ArtStyle) => {
    setScene((prev) => ({ ...prev, style: nextStyle }));
  };

  const handleResetDefaults = () => {
    setExpressions(DEFAULT_EXPRESSIONS);
    setScene(DEFAULT_SCENE_SETUP);
    setBeats(DEFAULT_STORY_BEATS);
    setQuizQuestions(DEFAULT_QUIZ_QUESTIONS);
  };

  return (
    <div id="top" className="min-h-screen bg-[#FAF8F5] text-[#1F2421]">
      <StepNav
        currentStep={currentStep}
        onSelectStep={handleSelectStep}
        onPrimaryAction={() => handleSelectStep(activePrimary.next)}
        primaryLabel={activePrimary.label}
        canProceed={!activePrimary.disabled}
      />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 md:pb-16">
        {currentStep === 'expressions' && (
          <ExpressionsScreen
            expressions={expressions}
            onChangeExpressions={setExpressions}
            onResetDefaults={handleResetDefaults}
            onNext={() => handleSelectStep('scene')}
          />
        )}

        {currentStep === 'scene' && (
          <SceneScreen
            scene={scene}
            onChangeScene={setScene}
            onBack={() => handleSelectStep('expressions')}
            onNext={() => handleSelectStep('storyboard')}
          />
        )}

        {currentStep === 'storyboard' && (
          <StoryboardScreen
            beats={beats}
            expressions={expressions}
            scene={scene}
            onChangeBeats={setBeats}
            onUpdateQuiz={setQuizQuestions}
            onBack={() => handleSelectStep('scene')}
            onNext={() => handleSelectStep('video')}
          />
        )}

        {currentStep === 'video' && (
          <VideoScreen
            beats={beats}
            style={scene.style}
            situation={scene.situation}
            onChangeStyle={handleStyleSwitch}
            onBack={() => handleSelectStep('storyboard')}
            onNext={() => handleSelectStep('final')}
            onVideoWatched={() => {}}
          />
        )}

        {currentStep === 'final' && (
          <FinalScreen
            beats={beats}
            style={scene.style}
            situation={scene.situation}
            expressions={expressions}
            quizQuestions={quizQuestions}
            onChangeStyle={handleStyleSwitch}
            onUpdateQuiz={setQuizQuestions}
            onBack={() => handleSelectStep('video')}
          />
        )}
      </main>
    </div>
  );
}
