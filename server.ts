import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '4mb' }));

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getBetaAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory TTS cache keyed by speaker + text so style switching reuses identical voice WAVs
const ttsCache = new Map<string, string>();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Regenerate a single storyboard beat using gemini-4-hydrogen
app.post('/api/storyboard/regenerate-beat', async (req, res) => {
  try {
    const { beat, allBeats, expressions, scene } = req.body as {
      beat: {
        beatNumber: 1 | 2 | 3 | 4;
        label: string;
        startSec: number;
        endSec: number;
        sceneDescription: string;
      };
      allBeats: Array<{
        beatNumber: number;
        label: string;
        lines: Array<{ speaker: string; english: string }>;
      }>;
      expressions: Array<{
        expression: string;
        koreanMeaning: string;
        movie: string;
      }>;
      scene: {
        place: string;
        characters: string;
        situation: string;
        style: string;
      };
    };

    const ai = getAiClient();
    const otherWords = (allBeats || [])
      .filter((b) => b.beatNumber !== beat.beatNumber)
      .reduce(
        (sum, b) =>
          sum +
          b.lines.reduce(
            (ls, l) => ls + l.english.trim().split(/\s+/).filter(Boolean).length,
            0,
          ),
        0,
      );
    const targetBeatWords = Math.max(12, Math.min(20, 65 - otherWords));

    const prompt = `You are a friendly short-film writer for Korean university students learning everyday English.
Rewrite ONLY Beat ${beat.beatNumber} (${beat.startSec}-${beat.endSec}s ${beat.label}) of a 30-second animated campus cafe script.

Scene Setup:
- Place: ${scene.place}
- Characters: ${scene.characters}
- Situation: ${scene.situation}

Target Movie Expressions (preserve exact expression phrases that naturally belong in this beat):
${expressions.map((e, i) => `${i + 1}. "${e.expression}" (${e.koreanMeaning} / ${e.movie})`).join('\n')}

Other Beats for Continuity:
${(allBeats || [])
  .filter((b) => b.beatNumber !== beat.beatNumber)
  .map(
    (b) =>
      `Beat ${b.beatNumber} (${b.label}): ${b.lines.map((l) => `${l.speaker}: "${l.english}"`).join(' ')}`,
  )
  .join('\n')}

Requirements:
- Keep Beat ${beat.beatNumber}'s English dialogue around ${targetBeatWords} words total so the entire 4-beat film stays 60-70 words.
- Provide 2 short natural dialogue lines spoken by Jiho or Mina.
- Provide a concise 1-sentence sceneDescription and natural Korean translations for each line.
- Keep it family-friendly and grounded in the cozy university cafe.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneDescription: { type: Type.STRING },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  english: { type: Type.STRING },
                  korean: { type: Type.STRING },
                },
                required: ['speaker', 'english', 'korean'],
              },
            },
          },
          required: ['sceneDescription', 'lines'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const lines = Array.isArray(parsed.lines)
      ? parsed.lines.slice(0, 3).map((l: { speaker?: string; english?: string; korean?: string }, idx: number) => ({
          id: `b${beat.beatNumber}-l${idx + 1}-${Date.now()}`,
          speaker: l.speaker === 'Mina' ? 'Mina' : 'Jiho',
          english: String(l.english ?? '').trim(),
          korean: String(l.korean ?? '').trim(),
        }))
      : [];

    res.json({
      sceneDescription: String(parsed.sceneDescription ?? beat.sceneDescription).trim(),
      lines,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to regenerate beat.';
    res.status(500).json({ error: message });
  }
});

// Generate a complete 4-beat 60-70 word storyboard + 3-question quiz from custom expressions
app.post('/api/storyboard/generate-script', async (req, res) => {
  try {
    const { expressions, scene } = req.body as {
      expressions: Array<{
        expression: string;
        koreanMeaning: string;
        movie: string;
      }>;
      scene: {
        place: string;
        characters: string;
        situation: string;
      };
    };

    const ai = getAiClient();
    const prompt = `You are a friendly short-film writer for Korean university students learning everyday English.
Write a 30-second, 4-beat animated dialogue scene (total English dialogue strictly 60-70 words) incorporating ALL 5 expressions verbatim:

Expressions to embed verbatim (case-exact if possible):
${expressions.map((e, i) => `${i + 1}. "${e.expression}" (${e.koreanMeaning} / ${e.movie})`).join('\n')}

Scene Setup:
- Place: ${scene.place}
- Characters: ${scene.characters} (speakers must be "Jiho" or "Mina")
- Situation: ${scene.situation}

Beats:
1. Hook (0-7s)
2. Problem (7-15s)
3. Turn (15-23s)
4. Close (23-30s)

Also generate 3 multiple-choice quiz questions ("표현 퀴즈") testing the Korean meanings of 3 of the expressions used in the script (4 Korean options each, 1 correct answer, and a friendly Korean explanation).`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            beats: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  beatNumber: { type: Type.INTEGER },
                  label: { type: Type.STRING },
                  sceneDescription: { type: Type.STRING },
                  lines: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        speaker: { type: Type.STRING },
                        english: { type: Type.STRING },
                        korean: { type: Type.STRING },
                      },
                      required: ['speaker', 'english', 'korean'],
                    },
                  },
                },
                required: ['beatNumber', 'label', 'sceneDescription', 'lines'],
              },
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  expression: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  movie: { type: Type.STRING },
                },
                required: [
                  'expression',
                  'prompt',
                  'options',
                  'correctIndex',
                  'explanation',
                  'movie',
                ],
              },
            },
          },
          required: ['beats', 'quiz'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const timings: Array<[number, number, 'Hook' | 'Problem' | 'Turn' | 'Close']> = [
      [0, 7, 'Hook'],
      [7, 15, 'Problem'],
      [15, 23, 'Turn'],
      [23, 30, 'Close'],
    ];

    const beats = timings.map(([startSec, endSec, label], idx) => {
      const b = parsed.beats?.[idx] ?? {};
      const beatNum = (idx + 1) as 1 | 2 | 3 | 4;
      return {
        id: `beat-${beatNum}`,
        beatNumber: beatNum,
        label,
        startSec,
        endSec,
        sceneDescription: String(b.sceneDescription ?? '').trim(),
        lines: Array.isArray(b.lines)
          ? b.lines.map(
              (
                l: { speaker?: string; english?: string; korean?: string },
                lIdx: number,
              ) => ({
                id: `b${beatNum}-l${lIdx + 1}-${Date.now()}`,
                speaker: l.speaker === 'Mina' ? 'Mina' : 'Jiho',
                english: String(l.english ?? '').trim(),
                korean: String(l.korean ?? '').trim(),
              }),
            )
          : [],
      };
    });

    const quiz = Array.isArray(parsed.quiz)
      ? parsed.quiz.slice(0, 3).map(
          (
            q: {
              expression?: string;
              prompt?: string;
              options?: string[];
              correctIndex?: number;
              explanation?: string;
              movie?: string;
            },
            qIdx: number,
          ) => ({
            id: `quiz-${qIdx + 1}-${Date.now()}`,
            expression: String(q.expression ?? ''),
            prompt: String(q.prompt ?? ''),
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
            correctIndex:
              typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: String(q.explanation ?? ''),
            movie: String(q.movie ?? ''),
          }),
        )
      : [];

    res.json({ beats, quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate script.';
    res.status(500).json({ error: message });
  }
});

// Generate 3-question Korean meaning quiz for current expressions & storyboard
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { expressions, beats } = req.body as {
      expressions: Array<{
        expression: string;
        koreanMeaning: string;
        movie: string;
      }>;
      beats: Array<{
        lines: Array<{ english: string }>;
      }>;
    };

    const ai = getAiClient();
    const scriptText = (beats || [])
      .flatMap((b) => b.lines.map((l) => l.english))
      .join(' ');

    const prompt = `Create a 3-question multiple-choice quiz ("표현 퀴즈") for Korean university students testing the Korean meanings of 3 English expressions used in this campus cafe story.

Expressions:
${expressions.map((e, i) => `${i + 1}. "${e.expression}" = "${e.koreanMeaning}" (Movie: ${e.movie})`).join('\n')}

Story dialogue:
${scriptText}

Rules:
- Exactly 3 questions.
- Each question has 4 Korean options (1 accurate meaning, 3 plausible distractors).
- Keep explanations friendly and concise in Korean.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              expression: { type: Type.STRING },
              prompt: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              movie: { type: Type.STRING },
            },
            required: [
              'expression',
              'prompt',
              'options',
              'correctIndex',
              'explanation',
              'movie',
            ],
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '[]').trim());
    const quiz = Array.isArray(parsed)
      ? parsed.slice(0, 3).map((q, idx) => ({
          id: `quiz-${idx + 1}-${Date.now()}`,
          expression: String(q.expression ?? ''),
          prompt: String(q.prompt ?? ''),
          options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          explanation: String(q.explanation ?? ''),
          movie: String(q.movie ?? ''),
        }))
      : [];

    res.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate quiz.';
    res.status(500).json({ error: message });
  }
});

// Synthesize natural English TTS audio for one dialogue line using gemini-3.8-flash-lite-tts
app.post('/api/tts/line', async (req, res) => {
  try {
    const { speaker, text, mood } = req.body as {
      speaker: 'Jiho' | 'Mina';
      text: string;
      mood?: string;
    };

    const cleanText = String(text ?? '').trim();
    if (!cleanText) {
      res.status(400).json({ error: 'Dialogue text is required.' });
      return;
    }

    const cacheKey = crypto
      .createHash('sha256')
      .update(`${speaker}::${cleanText}`)
      .digest('hex');

    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ audioDataUrl: cached, cached: true });
      return;
    }

    const cacheDir = '/tmp/campusscene-tts-cache';
    const cacheFile = path.join(cacheDir, `${cacheKey}.txt`);
    if (fs.existsSync(cacheFile)) {
      const diskDataUrl = fs.readFileSync(cacheFile, 'utf8');
      if (diskDataUrl.startsWith('data:audio/')) {
        ttsCache.set(cacheKey, diskDataUrl);
        res.json({ audioDataUrl: diskDataUrl, cached: true });
        return;
      }
    }

    const ai = getBetaAiClient();
    const voiceName = speaker === 'Jiho' ? 'Puck' : 'Kore';
    const personaStyle =
      speaker === 'Jiho'
        ? `Warm, friendly 21-year-old male university student${mood ? `, ${mood}` : ''}`
        : `Warm, expressive 21-year-old female university student${mood ? `, ${mood}` : ''}`;

    const synthesizeWithModel = async (
      modelName: 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts',
    ) => {
      const interaction = await ai.interactions.create({
        model: modelName,
        input: [
          {
            type: 'text',
            text: cleanText,
            annotations: [
              {
                type: 'speech_metadata',
                style: personaStyle,
              },
            ],
          },
        ],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [
            {
              language: 'en-US',
              voice: voiceName,
            },
          ],
        },
      });
      return interaction.output_audio?.data;
    };

    let base64Audio: string | undefined;
    try {
      base64Audio = await synthesizeWithModel('gemini-3.8-flash-lite-tts');
    } catch (firstErr) {
      const firstMsg =
        firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (firstMsg.includes('429')) {
        base64Audio = await synthesizeWithModel('gemini-3.8-flash-tts');
      } else {
        throw firstErr;
      }
    }

    if (!base64Audio) {
      res.status(502).json({ error: 'No audio returned by Gemini TTS.' });
      return;
    }

    const audioDataUrl = `data:audio/wav;base64,${base64Audio}`;
    ttsCache.set(cacheKey, audioDataUrl);
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, audioDataUrl, 'utf8');
    } catch {
      // Ignore disk cache write errors in read-only environments
    }
    res.json({ audioDataUrl, cached: false });
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : 'Failed to synthesize voice.';
    const status = raw.includes('429') ? 429 : 500;
    res.status(status).json({ error: raw });
  }
});

// Compose an AI-directed 30-second soft instrumental cafe score using gemini-4-hydrogen
app.post('/api/music/compose', async (req, res) => {
  try {
    const { style, situation } = req.body as {
      style: string;
      situation: string;
    };
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Compose a gentle, warm 30-second instrumental background music progression (low-volume Rhodes piano + nylon acoustic) for a campus cafe short film in "${style}" style.
Situation: ${situation}
Return 4 beat chord progressions (4 chords per beat, MIDI note numbers around 48-76) and a tempo BPM between 74 and 88.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bpm: { type: Type.INTEGER },
            title: { type: Type.STRING },
            beatChords: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
              },
            },
          },
          required: ['bpm', 'title', 'beatChords'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to compose music score.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT ?? 3000);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CampusScene 30 listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
