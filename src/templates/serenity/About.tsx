// Tentang: foto tegak membulat dengan kartu kaca terang (teks besar + keterangan) di kiri; label, judul dengan kata
// sorotan bergradasi, cerita, poin bertanda centang (2 kolom), dan baris angka dipisah garis tipis di kanan. Tanpa
// foto → teks selebar baca di tengah. HP: foto 4:3 dulu, lalu teks; angka 3 kolom tetap (angka pendek).
import { Check, Sun } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SerenityModel } from './model';
import { SERENITY_PHOTOS } from './photos';
import { C, TYPE_S } from './styles';
import { Highlighted, SectionLabel } from './ui';

export function About({ m }: { m: SerenityModel }) {
  const { about } = m;
  const eyebrow = text(about, 'eyebrow');
  const title = text(about, 'title');
  const body = paragraphs(text(about, 'body'));
  const image = text(about, 'image');
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');
  const points = list(about, 'points', 6).filter((item) => field(item, 'text'));
  const stats = list(about, 'stats', 3).filter((item) => field(item, 'value'));
  const withImage = hasImage(image);
  if (!title && body.length === 0 && !withImage && points.length === 0 && stats.length === 0) return null;

  return (
    <TemplateSection sectionKey="about" className={SECTION_Y}>
      <div className={`${CONTAINER} grid items-center gap-12 @5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16`}>
        {withImage && (
          <Reveal variant="scale" className="relative min-w-0 @5xl:col-span-6 @7xl:col-span-5">
            <KitPhoto
              src={image}
              alt={SERENITY_PHOTOS.alt(image, title || `Suasana ${m.companyName}`)}
              fallback="none"
              zoom
              sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] rounded-[28px] @xl:aspect-[4/5] @3xl:rounded-[32px] @5xl:aspect-[5/6]"
            />
            {(badgeValue || badgeLabel) && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-[20px] bg-white/85 p-3 pr-5 ring-1 ring-inset ring-white/70 backdrop-blur-xl @xl:bottom-5 @xl:left-5 @xl:right-auto @xl:max-w-[340px]">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--sr-tint) text-(--tpl-accent-ink)">
                  <Sun className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  {badgeValue && <span className={`block text-[18px] leading-tight text-[#151833] ${TYPE_S.h3} @3xl:text-[19px]`}>{badgeValue}</span>}
                  {badgeLabel && <span className={`block text-[13px] leading-snug ${C.muted}`}>{badgeLabel}</span>}
                </span>
              </div>
            )}
          </Reveal>
        )}

        <div className={`min-w-0 ${withImage ? '@5xl:col-span-6 @7xl:col-span-7 @7xl:pl-6' : `@5xl:col-span-10 @5xl:col-start-2 @7xl:col-span-8 @7xl:col-start-3`}`}>
          {eyebrow && (
            <Reveal>
              <SectionLabel>{eyebrow}</SectionLabel>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance text-[#151833] ${TYPE_S.h2}`}>
              <Highlighted title={title} highlight={text(about, 'highlight')} tone="light" />
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={160} className={`mt-6 max-w-[60ch] space-y-4 ${TYPE_S.lead} ${C.muted}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {points.length > 0 && (
            <ul className="mt-8 grid gap-x-8 gap-y-3.5 @2xl:grid-cols-2">
              {points.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'text')}-${i}`} delay={stagger(i, 60)} className="flex items-start gap-3 text-[15px] leading-snug text-[#151833] @3xl:text-[16px]">
                  <span aria-hidden className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--sr-tint) text-(--tpl-accent-ink)">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  {field(item, 'text')}
                </Reveal>
              ))}
            </ul>
          )}
          {stats.length > 0 && (
            <dl className="mt-10 grid grid-cols-3 border-t border-black/[0.08] pt-8">
              {stats.map((item, i) => (
                <Reveal
                  key={`${field(item, 'value')}-${i}`}
                  delay={stagger(i)}
                  className={`flex min-w-0 flex-col-reverse justify-end gap-2 pr-2 ${i > 0 ? 'border-l border-black/[0.08] pl-4 @3xl:pl-8' : ''}`}
                >
                  {/* Keterangan dulu di DOM (dt sebelum dd), tampil di bawah angka */}
                  <dt className={`text-[13px] leading-snug @3xl:text-[14px] ${C.muted}`}>{field(item, 'label')}</dt>
                  <dd>
                    <CountUp value={field(item, 'value')} className={`text-[#151833] ${TYPE_S.stat}`} />
                  </dd>
                </Reveal>
              ))}
            </dl>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
