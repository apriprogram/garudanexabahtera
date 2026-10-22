// "Tentang" + baris angka Arena Club (brief §1.4 #2–#3). Pernyataan besar di kanan pil label, lalu bento TIGA kartu
// pejal tanpa garis: (a) navy berteks dengan ikon lapangan + jam buka, (b) foto dengan label kaca buram, (c) kartu abu
// dengan angka besar + baris titik level yang "terisi" satu per satu. Lalu baris angka TERPUSAT bergaris tipis.
import { Clock } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, isEnabled, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { CourtIcon } from './marks';
import { leadSentence, levelRows, type ArenaModel } from './model';
import { ARENA_PHOTOS } from './photos';
import { C, CARD, TYPE_A } from './styles';
import { SectionPill } from './ui';

const DOTS = 10;

function LevelDots({ dots }: { dots: number }) {
  return (
    <span className="flex items-center gap-[5px]" aria-hidden>
      {Array.from({ length: DOTS }, (_, i) => (
        <span
          key={i}
          style={{ transitionDelay: `${200 + Math.min(i * 40, 800)}ms` }}
          className={`h-[11px] w-[11px] shrink-0 rounded-full transition-opacity duration-300 @5xl:h-3 @5xl:w-3 ${
            i < dots ? 'bg-(--tpl-accent) [[data-reveal=pending]_&]:opacity-15' : 'bg-[#0B1220]/[0.08]'
          }`}
        />
      ))}
    </span>
  );
}

export function About({ m }: { m: ArenaModel }) {
  const { about, contact } = m;
  const eyebrow = text(about, 'eyebrow');
  const title = text(about, 'title');
  const { lead, rest, more } = leadSentence(text(about, 'body'));
  const points = list(about, 'points', 4)
    .map((p) => field(p, 'text'))
    .filter(Boolean);
  const image = text(about, 'image');
  const imageLabel = text(about, 'image_label');
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');
  const badgeText = text(about, 'badge_text');
  const levelsTitle = text(about, 'levels_title');
  const levels = levelRows(list(about, 'levels', 4));
  const hours = isEnabled(contact) ? text(contact, 'hours') : '';

  const darkCard = !!(lead || hours);
  const photoCard = hasImage(image) || !!imageLabel;
  const statCard = !!(badgeValue || badgeLabel || badgeText || levels.length > 0);
  const cards = [darkCard, photoCard, statCard].filter(Boolean).length;
  const grid = cards >= 3 ? '@3xl:grid-cols-2 @5xl:grid-cols-3' : cards === 2 ? '@3xl:grid-cols-2' : '';
  const photoDelay = stagger(darkCard ? 1 : 0);
  const statDelay = stagger((darkCard ? 1 : 0) + (photoCard ? 1 : 0));

  return (
    <TemplateSection sectionKey="about" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || more.length > 0 || points.length > 0) && (
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:gap-8">
            <Reveal className="@5xl:col-span-4">
              <SectionPill>{eyebrow}</SectionPill>
            </Reveal>
            <div className="@5xl:col-span-8">
              {title && (
                <Reveal as="h2" className={`max-w-[34ch] text-balance ${TYPE_A.statement} ${C.ink}`}>
                  {title}
                </Reveal>
              )}
              {more.map((paragraph, i) => (
                <Reveal as="p" key={i} delay={80} className={`mt-5 max-w-[62ch] ${TYPE_A.body} ${C.muted}`}>
                  {paragraph}
                </Reveal>
              ))}
              {points.length > 0 && (
                <Reveal as="ul" delay={160} className="mt-6 flex flex-wrap gap-2">
                  {points.map((point, i) => (
                    <li
                      key={i}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${C.surface} ${C.ink}`}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--tpl-accent)" />
                      {point}
                    </li>
                  ))}
                </Reveal>
              )}
            </div>
          </div>
        )}

        {cards > 0 && (
          <ul className={`mt-10 grid gap-4 @3xl:mt-14 @3xl:gap-5 ${grid}`}>
            {darkCard && (
              <Reveal
                as="li"
                data-tpl-tone="inverse"
                className={`flex min-h-[300px] flex-col justify-between gap-8 p-6 text-white @3xl:p-8 @5xl:min-h-[400px] ${CARD.radius} ${C.navyBg}`}
              >
                <CourtIcon className="h-8 w-8 text-(--tpl-accent)" />
                {lead && (
                  <p className="text-[20px] font-normal leading-[1.35] tracking-[-0.01em] @5xl:text-[22px]">
                    {lead} {rest && <span className="text-white/65">{rest}</span>}
                  </p>
                )}
                {hours && (
                  <p className="inline-flex w-fit items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 text-[13px] text-white/90">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {hours}
                  </p>
                )}
              </Reveal>
            )}

            {photoCard &&
              (hasImage(image) ? (
                <Reveal as="li" delay={photoDelay} className={`relative overflow-hidden ${CARD.radius}`}>
                  <KitPhoto
                    src={image}
                    alt={ARENA_PHOTOS.alt(image, imageLabel || title)}
                    zoom
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="aspect-[4/3] h-full w-full @3xl:aspect-auto @3xl:min-h-[360px] @5xl:min-h-[400px]"
                  />
                  {imageLabel && (
                    <p className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-5">
                      <span className="max-w-full truncate rounded-full bg-[#0E1B2E]/50 px-5 py-2.5 text-[15px] font-medium text-white ring-1 ring-inset ring-white/30 backdrop-blur-md">
                        {imageLabel}
                      </span>
                    </p>
                  )}
                </Reveal>
              ) : (
                <Reveal
                  as="li"
                  delay={photoDelay}
                  className={`flex min-h-[240px] items-center justify-center p-6 @5xl:min-h-[400px] ${CARD.radius} bg-(--tpl-accent)`}
                >
                  <span className="max-w-full truncate rounded-full bg-white/70 px-5 py-2.5 text-[15px] font-medium text-[#0B1220]">{imageLabel}</span>
                </Reveal>
              ))}

            {statCard && (
              <Reveal
                as="li"
                delay={statDelay}
                className={`flex flex-col justify-between gap-8 p-6 @3xl:p-8 @5xl:min-h-[400px] ${cards >= 3 ? '@3xl:col-span-2 @5xl:col-span-1' : ''} ${CARD.radius} ${C.surface}`}
              >
                <div>
                  {badgeValue && <CountUp value={badgeValue} className={`${TYPE_A.stat} text-[56px] @5xl:text-[64px] ${C.ink}`} />}
                  {badgeLabel && <p className={`mt-3 text-[16px] font-medium ${C.ink}`}>{badgeLabel}</p>}
                  {badgeText && <p className={`mt-1.5 max-w-[36ch] text-[14px] leading-relaxed ${C.muted}`}>{badgeText}</p>}
                </div>
                {levels.length > 0 && (
                  <div>
                    {levelsTitle && <p className={`text-[12px] font-medium uppercase tracking-[0.12em] ${C.muted}`}>{levelsTitle}</p>}
                    <Reveal as="ul" variant="fade" className={`${levelsTitle ? 'mt-3' : ''} space-y-3`}>
                      {levels.map((row, i) => (
                        <li
                          key={i}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[13px] @7xl:grid-cols-[minmax(0,1fr)_auto_auto]"
                        >
                          <span className={`col-start-1 row-start-1 truncate ${C.ink}`}>{row.label}</span>
                          <span
                            role="img"
                            aria-label={`${row.label}: ${row.value}`}
                            className="col-span-2 row-start-2 @7xl:col-span-1 @7xl:col-start-2 @7xl:row-start-1"
                          >
                            <LevelDots dots={row.dots} />
                          </span>
                          <span className={`col-start-2 row-start-1 min-w-10 text-right tabular-nums @7xl:col-start-3 ${C.muted}`} aria-hidden>
                            {row.value}
                          </span>
                        </li>
                      ))}
                    </Reveal>
                  </div>
                )}
              </Reveal>
            )}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

// ─── Baris angka terpusat ─────────────────────────────────────────────────────

export function Numbers({ m }: { m: ArenaModel }) {
  const { advantages } = m;
  const title = text(advantages, 'title');
  const stats = list(advantages, 'stats', 4).filter((s) => field(s, 'value') || field(s, 'label'));
  if (!title && stats.length === 0) return null;
  const cols = stats.length >= 4 ? '@3xl:grid-cols-4' : stats.length === 3 ? '@3xl:grid-cols-3' : '';

  return (
    <TemplateSection sectionKey="advantages" className="pb-16 @3xl:pb-24 @5xl:pb-28">
      <div className={CONTAINER}>
        <div className="border-y border-[#0B1220]/[0.08] py-12 @3xl:py-16">
          {title && (
            <Reveal as="h2" className={`mx-auto max-w-[32ch] text-balance text-center ${TYPE_A.side} ${C.ink}`}>
              {title}
            </Reveal>
          )}
          {stats.length > 0 && (
            <ul className={`mx-auto grid max-w-[1100px] grid-cols-2 gap-x-6 gap-y-10 ${title ? 'mt-10 @3xl:mt-14' : ''} ${cols}`}>
              {stats.map((stat, i) => (
                <Reveal as="li" key={i} delay={stagger(i)} className="text-center">
                  <CountUp value={field(stat, 'value')} className={`${TYPE_A.stat} text-[40px] @3xl:text-[48px] @5xl:text-[56px] ${C.ink}`} />
                  {field(stat, 'label') && <p className={`mt-3 text-[14px] ${C.muted}`}>{field(stat, 'label')}</p>}
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
