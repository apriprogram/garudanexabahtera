// Testimoni (brief §3.4 #5, §4.3): kiri potret besar 4:5 radius 28 milik testimoni yang sedang tampil, kanan chip +
// judul + kartu kutipan (abu → putih di pita abu) dengan avatar pilihan dan tombol panah ← →. Karusel TIDAK berjalan
// sendiri; kutipan diumumkan lewat aria-live="polite". HP: potret 4:3 lalu kartu kutipan.
import { ArrowLeft, ArrowRight, Quote } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, safeImage, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import type { FinovaModel } from './model';
import { FINOVA_PHOTOS } from './photos';
import { C, SECTION_F, TYPE_F } from './styles';
import { SectionChip } from './ui';

const ROUND_BTN =
  'flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0B0F0E] ring-1 ring-inset ring-black/10 transition-colors hover:bg-(--fin-hl) hover:text-(--fin-on-hl) disabled:opacity-40';

export function Stories({ m }: { m: FinovaModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote') || field(item, 'name'));
  const [index, setIndex] = useState(0);
  const motion = useMotionEnabled();
  const eyebrow = text(testimonials, 'eyebrow');
  const title = text(testimonials, 'title');
  if (items.length === 0 && !title) return null;

  const current = items.length > 0 ? items[Math.min(index, items.length - 1)] : null;
  const active = Math.min(index, Math.max(0, items.length - 1));
  const hasPortraits = items.some((item) => safeImage(field(item, 'photo')));
  const go = (step: number) => setIndex((i) => (Math.min(i, items.length - 1) + step + items.length) % items.length);
  const name = current ? field(current, 'name') : '';
  const role = current ? field(current, 'role') : '';
  const photo = current ? field(current, 'photo') : '';
  const fade = motion ? 'motion-safe:animate-fade-in' : '';

  return (
    <TemplateSection sectionKey="testimonials" className={`${C.surface} ${SECTION_F}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-12`}>
        {hasPortraits && current && (
          <Reveal variant="scale" className="@5xl:col-span-5">
            <KitPhoto
              key={photo || name}
              src={photo}
              alt={name ? `${name}${role ? `, ${role}` : ''}` : FINOVA_PHOTOS.alt(photo, 'Potret pengguna')}
              fallback="tint"
              sizes="(min-width: 1024px) 40vw, 100vw"
              position="50% 25%"
              className={`aspect-[4/3] rounded-[24px] @3xl:aspect-[16/11] @5xl:aspect-[4/5] @5xl:rounded-[28px] ${fade}`}
            />
          </Reveal>
        )}

        <div className={hasPortraits && current ? '@5xl:col-span-7' : '@5xl:col-span-10 @5xl:col-start-2'}>
          {eyebrow && (
            <Reveal>
              <SectionChip tone="white">{eyebrow}</SectionChip>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance text-[#0B0F0E] ${TYPE_F.h2}`}>
              {title}
            </Reveal>
          )}

          {current && (
            <Reveal delay={160} className="mt-8 @3xl:mt-10">
              <figure className="rounded-[24px] bg-white p-6 @3xl:p-9">
                <Quote aria-hidden className="h-7 w-7 text-(--tpl-accent)" fill="currentColor" strokeWidth={0} />
                <div aria-live="polite">
                  <blockquote key={`q-${active}`} className={`mt-5 text-pretty text-[18px] leading-[1.55] tracking-[-0.01em] text-[#0B0F0E] @3xl:text-[21px] ${fade}`}>
                    {field(current, 'quote')}
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3 border-t border-black/[0.07] pt-6">
                    <span aria-hidden className="h-8 w-1 shrink-0 rounded-full bg-(--fin-hl) ring-1 ring-inset ring-black/10" />
                    <span className="min-w-0">
                      {name && <span className="block truncate text-[16px] font-semibold text-[#0B0F0E]">{name}</span>}
                      {role && <span className={`block truncate text-[14px] ${C.muted}`}>{role}</span>}
                    </span>
                  </figcaption>
                </div>
              </figure>

              {items.length > 1 && (
                <div className="mt-5 flex items-center justify-between gap-4">
                  <ul className="flex -space-x-2" aria-label="Pilih testimoni">
                    {items.map((item, i) => (
                      <li key={`${field(item, 'name')}-${i}`}>
                        <button
                          type="button"
                          onClick={() => setIndex(i)}
                          aria-pressed={i === active}
                          aria-label={`Tampilkan testimoni ${field(item, 'name') || i + 1}`}
                          className={`relative block rounded-full ring-2 transition-colors ${
                            i === active ? 'z-10 ring-(--tpl-accent)' : 'ring-[#F1F3F2] hover:z-10'
                          }`}
                        >
                          <KitAvatar name={field(item, 'name')} photo={field(item, 'photo')} sizes="44px" className="h-11 w-11 object-[50%_22%]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2">
                    <p className={`mr-2 text-[13px] tabular-nums ${C.muted}`}>
                      <span className="font-semibold text-[#0B0F0E]">{String(active + 1).padStart(2, '0')}</span> / {String(items.length).padStart(2, '0')}
                    </p>
                    <button type="button" onClick={() => go(-1)} aria-label="Testimoni sebelumnya" className={ROUND_BTN}>
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => go(1)} aria-label="Testimoni berikutnya" className={ROUND_BTN}>
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
