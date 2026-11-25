export type AppStep = 'expressions' | 'scene' | 'storyboard' | 'video' | 'final';

export type ArtStyle =
  | '2D animation'
  | 'clay'
  | 'watercolor'
  | 'live-action style';

export type SpeakerName = 'Jiho' | 'Mina';

export interface ExpressionItem {
  id: string;
  expression: string;
  koreanMeaning: string;
  movie: string;
}

export interface SceneSetup {
  place: string;
  characters: string;
  situation: string;
  style: ArtStyle;
}

export interface DialogueLine {
  id: string;
  speaker: SpeakerName;
  english: string;
  korean: string;
}

export interface StoryBeat {
  id: string;
  beatNumber: 1 | 2 | 3 | 4;
  label: 'Hook' | 'Problem' | 'Turn' | 'Close';
  startSec: number;
  endSec: number;
  sceneDescription: string;
  lines: DialogueLine[];
}

export interface QuizQuestion {
  id: string;
  expression: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  movie: string;
}

export interface TimedLineSegment {
  beatIndex: number;
  beatId: string;
  beatLabel: StoryBeat['label'];
  line: DialogueLine;
  startSec: number;
  endSec: number;
}
