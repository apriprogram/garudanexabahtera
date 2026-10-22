// Pelatih (kartu potret 4:5 membulat; HP = rel snap) dan acara (daftar bergaris dengan tanggal besar) — brief §1.4
// #6–#7.
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { splitDate, type ArenaModel } from './model';
import { ARENA_PHOTOS } from './photos';
import { C, DISPLAY, RAIL, TYPE_A } from './styles';
import { SectionPill } from './ui';

/** Kepala section: pil + judul kiri, deskripsi kanan (desktop). */
function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <Reveal className="grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8">
      <div className="@5xl:col-span-7">
        <SectionPill>{eyebrow}</SectionPill>
        {title && <h2 className={`${eyebrow ? 'mt-5' : ''} max-w-[22ch] text-balance ${TYPE_A.h2} ${C.ink}`}>{title}</h2>}
      </div>
      {subtitle && <p className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end ${TYPE_A.lead} ${C.muted}`}>{subtitle}</p>}
    </Reveal>
  );
}

// ─── Pelatih ──────────────────────────────────────────────────────────────────

export function Team({ m }: { m: ArenaModel }) {
  const { team } = m;
  const items = list(team, 'items', 8).filter((item) => field(item, 'name') || hasImage(field(item, 'photo')));
  const title = text(team, 'title');
  if (!title && items.length === 0) return null;
  const cols = items.length >= 4 ? '@5xl:grid-cols-4' : items.length === 3 ? '@5xl:grid-cols-3' : '';

  return (
    <TemplateSection sectionKey="team" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(team, 'eyebrow')} title={title} subtitle={text(team, 'subtitle')} />
        {items.length > 0 && (
          <Reveal className="mt-10 @3xl:mt-14">
            <ul className={`${RAIL} @3xl:grid @3xl:snap-none @3xl:grid-cols-3 @3xl:overflow-visible ${cols}`} aria-label={title || 'Pelatih'}>
              {items.map((item, i) => {
                const name = field(item, 'name');
                const role = field(item, 'role');
                const photo = field(item, 'photo');
                return (
                  <li key={i} className="w-[72%] shrink-0 snap-start @xl:w-[44%] @3xl:w-auto">
                    {hasImage(photo) ? (
                      <KitPhoto
                        src={photo}
                        alt={name ? `${name}${role ? `, ${role}` : ''}` : ARENA_PHOTOS.alt(photo, 'Pelatih')}
                        zoom
                        position="50% 25%"
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 72vw"
                        className="aspect-[4/5] rounded-[24px]"
                      />
                    ) : (
                      <div aria-hidden className="flex aspect-[4/5] items-center justify-center rounded-[24px] bg-(--tpl-accent-100)">
                        <span className={`${DISPLAY} text-[56px] font-light text-(--tpl-accent-ink)`}>{initials(name, '?')}</span>
                      </div>
                    )}
                    {name && <h3 className={`mt-4 text-[18px] font-medium tracking-[-0.01em] ${C.ink}`}>{name}</h3>}
                    {role && <p className="mt-0.5 text-[14px] font-medium text-(--tpl-accent-ink)">{role}</p>}
                    {field(item, 'description') && (
                      <p className={`mt-2 line-clamp-3 text-[14px] leading-relaxed ${C.muted}`}>{field(item, 'description')}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}

// ─── Acara ────────────────────────────────────────────────────────────────────

export function Events({ m }: { m: ArenaModel }) {
  const { events } = m;
  const items = list(events, 'items', 6).filter((item) => field(item, 'title') || field(item, 'date'));
  const title = text(events, 'title');
  if (!title && items.length === 0) return null;

  return (
    <TemplateSection sectionKey="events" className="pb-16 pt-8 @3xl:pb-24 @3xl:pt-8 @5xl:pb-28 @7xl:pb-32">
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(events, 'eyebrow')} title={title} subtitle={text(events, 'subtitle')} />
        {items.length > 0 && (
          <ul className="mt-10 border-b border-[#0B1220]/[0.08] @3xl:mt-14">
            {items.map((item, i) => {
              const name = field(item, 'title');
              const [day, month] = splitDate(field(item, 'date'));
              const location = field(item, 'location');
              const tag = field(item, 'tag');
              const image = field(item, 'image');
              const action = resolveAction(
                field(item, 'url'),
                name ? m.askAction(`Halo ${m.companyName}, saya ingin daftar ${name}.`) : m.bookAction,
              );
              return (
                <Reveal
                  as="li"
                  key={i}
                  delay={stagger(i)}
                  className={`grid gap-4 border-t border-[#0B1220]/[0.08] py-6 @3xl:items-center @3xl:gap-8 @3xl:py-7 ${
                    hasImage(image) ? '@3xl:grid-cols-[150px_minmax(0,1fr)_200px_auto]' : '@3xl:grid-cols-[150px_minmax(0,1fr)_auto]'
                  }`}
                >
                  <p className={`flex items-baseline gap-2 ${C.ink} @3xl:flex-col @3xl:gap-1`}>
                    <span className={`${DISPLAY} text-[40px] font-light leading-none tabular-nums @3xl:text-[48px]`}>{day}</span>
                    {month && <span className={`text-[14px] ${C.muted}`}>{month}</span>}
                  </p>
                  <div className="min-w-0">
                    {tag && (
                      <p className="mb-2 w-fit rounded-full bg-(--tpl-accent-100) px-2.5 py-0.5 text-[12px] font-medium text-[#0E1B2E]">{tag}</p>
                    )}
                    {name && <h3 className={`text-[19px] font-medium leading-snug tracking-[-0.01em] @3xl:text-[21px] ${C.ink}`}>{name}</h3>}
                    {location && (
                      <p className={`mt-1.5 flex items-start gap-1.5 text-[14px] ${C.muted}`}>
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {location}
                      </p>
                    )}
                  </div>
                  {hasImage(image) && (
                    <KitPhoto
                      src={image}
                      alt={ARENA_PHOTOS.alt(image, name)}
                      fallback="none"
                      sizes="(min-width: 768px) 200px, 90vw"
                      className="hidden aspect-[4/3] rounded-[20px] @3xl:block"
                    />
                  )}
                  {action && (
                    <ActionLink
                      action={action}
                      aria-label={name ? `Daftar ${name}` : 'Daftar acara'}
                      className="inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-[14px] font-medium text-[#0B1220] ring-1 ring-inset ring-[#0B1220]/15 transition-colors hover:bg-[#0E1B2E] hover:text-white @3xl:w-11 @3xl:justify-center @3xl:px-0"
                    >
                      <span className="@3xl:sr-only">Daftar</span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </ActionLink>
                  )}
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
