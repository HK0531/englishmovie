import type {
  ArtStyle,
  ExpressionItem,
  QuizQuestion,
  SceneSetup,
  StoryBeat,
} from '../types';

export const DEFAULT_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'expr-1',
    expression: 'I was going to study last night, but I fell asleep.',
    koreanMeaning: '어젯밤에 공부하려고 했는데 잠들어 버렸어.',
    movie: 'Notting Hill',
  },
  {
    id: 'expr-2',
    expression: "I'm really bummed about the result.",
    koreanMeaning: '결과 때문에 정말 속상해.',
    movie: 'Inside Out 2',
  },
  {
    id: 'expr-3',
    expression: 'That hit me harder than I expected.',
    koreanMeaning: '생각보다 훨씬 마음이 아팠어.',
    movie: 'Inside Out 2',
  },
  {
    id: 'expr-4',
    expression: 'Let me',
    koreanMeaning: '내가 ~할게',
    movie: 'Notting Hill',
  },
  {
    id: 'expr-5',
    expression: "I'm over the moon about the news.",
    koreanMeaning: '그 소식에 뛸 듯이 기뻐.',
    movie: 'Inside Out 2',
  },
];

export const DEFAULT_SCENE_SETUP: SceneSetup = {
  place:
    'Cozy university campus cafe near the library with warm wooden tables and soft daylight.',
  characters:
    'Mina (a 21-year-old Korean female university student wearing a beige knit cardigan and round glasses) and Jiho (a 21-year-old Korean male university student wearing a navy hoodie).',
  situation:
    'Mina is upset after getting a low morning quiz score because she fell asleep instead of studying, and Jiho cheers her up with a warm latte and exciting news that their team passed a university contest.',
  style: '2D animation',
};

export const DEFAULT_STORY_BEATS: StoryBeat[] = [
  {
    id: 'beat-1',
    beatNumber: 1,
    label: 'Hook',
    startSec: 0,
    endSec: 7,
    sceneDescription:
      'At a cozy campus cafe table, Jiho notices Mina sighing tiredly over her laptop and asks what happened.',
    lines: [
      {
        id: 'b1-l1',
        speaker: 'Jiho',
        english: 'You look so exhausted today. What happened?',
        korean: '오늘 엄청 피곤해 보인다. 무슨 일 있어?',
      },
      {
        id: 'b1-l2',
        speaker: 'Mina',
        english: 'I was going to study last night, but I fell asleep.',
        korean: '어젯밤에 공부하려고 했는데 잠들어 버렸어.',
      },
    ],
  },
  {
    id: 'beat-2',
    beatNumber: 2,
    label: 'Problem',
    startSec: 7,
    endSec: 15,
    sceneDescription:
      'Mina looks down at her morning quiz score on her smartphone with a gloomy face while Jiho listens sympathetically.',
    lines: [
      {
        id: 'b2-l1',
        speaker: 'Mina',
        english: "I'm really bummed about the result.",
        korean: '결과 때문에 정말 속상해.',
      },
      {
        id: 'b2-l2',
        speaker: 'Mina',
        english: 'That hit me harder than I expected.',
        korean: '생각보다 훨씬 마음이 아팠어.',
      },
    ],
  },
  {
    id: 'beat-3',
    beatNumber: 3,
    label: 'Turn',
    startSec: 15,
    endSec: 23,
    sceneDescription:
      'Jiho smiles warmly, slides a cup of latte toward Mina, and shows a contest acceptance message on his phone screen.',
    lines: [
      {
        id: 'b3-l1',
        speaker: 'Jiho',
        english: 'Let me treat you to a latte.',
        korean: '내가 라떼 한 잔 살게.',
      },
      {
        id: 'b3-l2',
        speaker: 'Jiho',
        english: 'And guess what? Our team just passed the contest!',
        korean: '그거 알아? 우리 팀 공모전 합격했대!',
      },
    ],
  },
  {
    id: 'beat-4',
    beatNumber: 4,
    label: 'Close',
    startSec: 23,
    endSec: 30,
    sceneDescription:
      "Mina's eyes widen with joy, and both students smile brightly and clink their coffee cups together to celebrate.",
    lines: [
      {
        id: 'b4-l1',
        speaker: 'Mina',
        english: "Wait, really? I'm over the moon about the news.",
        korean: '잠깐, 진짜? 그 소식에 뛸 듯이 기뻐.',
      },
      {
        id: 'b4-l2',
        speaker: 'Jiho',
        english: "You totally earned it. Let's celebrate together!",
        korean: '넌 충분히 그럴 자격 있어. 같이 축하하자!',
      },
    ],
  },
];

export const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'quiz-1',
    expression: "I'm really bummed about the result.",
    prompt: 'What does "I\'m really bummed about the result." mean in natural Korean?',
    options: [
      '결과 때문에 정말 속상해.',
      '결과가 너무 기대돼서 설레.',
      '시험 결과를 아직 못 확인했어.',
      '다음 시험은 꼭 잘 볼 수 있어.',
    ],
    correctIndex: 0,
    explanation:
      '"be bummed about ~"는 어떤 일 때문에 실망하거나 속상할 때 쓰는 자연스러운 일상 표현이에요.',
    movie: 'Inside Out 2',
  },
  {
    id: 'quiz-2',
    expression: 'That hit me harder than I expected.',
    prompt: 'Choose the closest Korean meaning for "That hit me harder than I expected."',
    options: [
      '생각보다 문제가 훨씬 쉬웠어.',
      '생각보다 훨씬 마음이 아팠어.',
      '예상보다 시간이 훨씬 빨리 갔어.',
      '기대했던 것보다 커피가 너무 써.',
    ],
    correctIndex: 1,
    explanation:
      '"hit someone hard"는 감정적으로 큰 타격을 주거나 마음이 많이 아플 때 자주 쓰입니다.',
    movie: 'Inside Out 2',
  },
  {
    id: 'quiz-3',
    expression: "I'm over the moon about the news.",
    prompt: 'What is the best Korean translation of "I\'m over the moon about the news."?',
    options: [
      '그 소식을 듣고 깜짝 놀랐어.',
      '그 소식 때문에 조금 걱정돼.',
      '그 소식에 뛸 듯이 기뻐.',
      '그 소식은 아직 비밀로 해줘.',
    ],
    correctIndex: 2,
    explanation:
      '"over the moon"은 달을 뛰어넘을 만큼 아주 행복하고 뛸 듯이 기쁘다는 관용 표현이에요.',
    movie: 'Inside Out 2',
  },
];

export const STYLE_OPTIONS: Array<{
  id: ArtStyle;
  label: string;
  koreanLabel: string;
  description: string;
  previewImage: string;
}> = [
  {
    id: '2D animation',
    label: '2D Animation',
    koreanLabel: '2D 애니메이션',
    description: 'Warm cel-shaded Korean webtoon & anime aesthetic with soft daylight.',
    previewImage: '/src/assets/images/beat1_hook_2d_1795579503696.jpg',
  },
  {
    id: 'clay',
    label: 'Clay',
    koreanLabel: '클레이 스톱모션',
    description: 'Handcrafted miniature clay figures with cozy studio lighting.',
    previewImage: '/src/assets/images/style_clay_cafe_1795579506664.jpg',
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    koreanLabel: '수채화 일러스트',
    description: 'Soft translucent washes on textured paper with gentle ink lines.',
    previewImage: '/src/assets/images/style_watercolor_cafe_1795579507002.jpg',
  },
  {
    id: 'live-action style',
    label: 'Live-Action Style',
    koreanLabel: '실사 인디 영화',
    description: 'Warm 35mm Korean campus indie film look with shallow depth of field.',
    previewImage: '/src/assets/images/style_liveaction_cafe_1795579507838.jpg',
  },
];

export const BEAT_ARTWORK_2D: Record<1 | 2 | 3 | 4, string> = {
  1: '/src/assets/images/beat1_hook_2d_1795579503696.jpg',
  2: '/src/assets/images/beat2_problem_2d_1795579503467.jpg',
  3: '/src/assets/images/beat3_turn_2d_1795579504716.jpg',
  4: '/src/assets/images/beat4_close_2d_1795579505556.jpg',
};

export const STYLE_ARTWORK: Record<ArtStyle, string> = {
  '2D animation': '/src/assets/images/beat1_hook_2d_1795579503696.jpg',
  clay: '/src/assets/images/style_clay_cafe_1795579506664.jpg',
  watercolor: '/src/assets/images/style_watercolor_cafe_1795579507002.jpg',
  'live-action style': '/src/assets/images/style_liveaction_cafe_1795579507838.jpg',
};

export const COVER_THUMBNAIL_IMAGE =
  '/src/assets/images/cover_campusscene_2d_1795579506205.jpg';
