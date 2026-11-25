import { Check, Film, MapPin, Sparkles, Users } from 'lucide-react';
import { STYLE_OPTIONS } from '../data/defaults';
import type { ArtStyle, SceneSetup } from '../types';

interface SceneScreenProps {
  scene: SceneSetup;
  onChangeScene: (next: SceneSetup) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SceneScreen({
  scene,
  onChangeScene,
  onBack,
  onNext,
}: SceneScreenProps) {
  const updateField = (field: keyof SceneSetup, value: string) => {
    onChangeScene({ ...scene, [field]: value });
  };

  const selectStyle = (style: ArtStyle) => {
    onChangeScene({ ...scene, style });
  };

  return (
    <section className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="text-sm font-semibold text-[#2D6A4F]">
          Step 2 of 5 · Scene &amp; Art Style
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#1F2421] sm:text-4xl">
          Set your campus scene and choose an animation style
        </h1>
        <p className="text-base leading-relaxed text-[#575D59]">
          Mina and Jiho meet at a sunlit campus cafe. Confirm the setting and
          pick your preferred visual style.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column: Place, Characters, Situation */}
        <div className="space-y-5 lg:col-span-6">
          <div className="rounded-2xl border border-[#E5DFD5] bg-white p-6 space-y-5">
            <div>
              <label
                htmlFor="scene-place"
                className="mb-2 flex items-center gap-2 text-base font-semibold text-[#1F2421]"
              >
                <MapPin className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
                <span>Place</span>
              </label>
              <textarea
                id="scene-place"
                rows={2}
                value={scene.place}
                onChange={(e) => updateField('place', e.target.value)}
                className="w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-4 py-3 text-base leading-relaxed text-[#1F2421] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="scene-characters"
                className="mb-2 flex items-center gap-2 text-base font-semibold text-[#1F2421]"
              >
                <Users className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
                <span>Characters</span>
              </label>
              <textarea
                id="scene-characters"
                rows={3}
                value={scene.characters}
                onChange={(e) => updateField('characters', e.target.value)}
                className="w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-4 py-3 text-base leading-relaxed text-[#1F2421] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="scene-situation"
                className="mb-2 flex items-center gap-2 text-base font-semibold text-[#1F2421]"
              >
                <Film className="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
                <span>Situation</span>
              </label>
              <textarea
                id="scene-situation"
                rows={4}
                value={scene.situation}
                onChange={(e) => updateField('situation', e.target.value)}
                className="w-full rounded-xl border border-[#D8D0C3] bg-[#FAF8F5] px-4 py-3 text-base leading-relaxed text-[#1F2421] focus:border-[#2D6A4F] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right column: Style Menu */}
        <div className="space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#1F2421]">
              Visual Style Menu
            </h2>
            <span className="text-sm font-medium text-[#575D59]">
              Selected: {scene.style}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Visual style"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {STYLE_OPTIONS.map((option) => {
              const isSelected = scene.style === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => selectStyle(option.id)}
                  className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6A4F] ${
                    isSelected
                      ? 'border-[#2D6A4F] bg-[#E9F2EC]/55 ring-2 ring-[#2D6A4F]/30'
                      : 'border-[#E5DFD5] bg-white hover:border-[#B9B0A2]'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-[#EFEAE1]">
                    <img
                      src={option.previewImage}
                      alt={`${option.label} style preview`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {isSelected && (
                      <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#2D6A4F] text-white shadow-sm">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="font-display text-lg font-bold text-[#1F2421]">
                        {option.label}
                      </p>
                      <p className="text-sm font-medium text-[#2D6A4F]">
                        {option.koreanLabel}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-[#575D59]">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[#D8D0C3] bg-white px-6 py-3 text-base font-semibold text-[#373D39] transition-colors hover:bg-[#F2EFE9]"
        >
          Back to Expressions
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#2D6A4F] px-8 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-[#23533D]"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <span>Open 30s Storyboard</span>
        </button>
      </div>
    </section>
  );
}
