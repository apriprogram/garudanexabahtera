// Newsroom & In the press. Newsroom: kepala section dengan tombol tagar (#All #Lines #Terminals …) yang benar-benar
// menyaring, lalu MOSAIK ubin bersudut kecil (grid 12 kolom × 2 baris, tata letak mengikuti jumlah ubin agar tidak ada
// sel kosong): ubin pertama berlapis warna tema pejal + tanggal + "Read story >", ubin lain berfoto dengan judul putih di
// atas gradasi navy. "Read story" membuka isi lengkap di panel baca di bawah mosaik (fokus pindah ke judulnya, tombol
// tutup mengembalikan fokus), atau tautan berita bila diisi. HP: satu kolom kartu + tagar yang bisa digeser.
// In the press: judul di kiri, rel kutipan liputan media (nama media, tanggal, judul) dengan tombol ‹ › di kanan.
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Newspaper, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, paragraphs, text, type LinkAction } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { useEnquiry } from './context';
import { scrollRail, useRail } from './hooks';
import { filterNews, matchType, mosaicCells, newsTags, parseStoryDate, storyTags, type PortlineModel } from './model';
import { PORTLINE_PHOTOS } from './photos';
import { C, DISPLAY, TYPE_P } from './styles';
import { SectionHead, SectionLabel, TextLink } from './ui';

function StoryDateLabel({ raw, m, className = '' }: { raw: string; m: PortlineModel; className?: string }) {
  if (!raw) return null;
  const date = parseStoryDate(raw, m.lang);
  return date ? (
    <time dateTime={date.iso} className={className}>
      {date.label}
    </time>
  ) : (
    <span className={className}>{raw}</span>
  );
}

function Tile({
  m,
  item,
  feature,
  wide,
  cell,
  sizes,
  index,
  open,
  readerId,
  onRead,
  buttonRef,
}: {
  m: PortlineModel;
  item: ListItem;
  feature: boolean;
  /** HP 2 kolom: ubin selebar dua kolom (ubin unggulan, atau ubin terakhir yang sendirian) */
  wide: boolean;
  cell: string;
  sizes: string;
  index: number;
  open: boolean;
  readerId: string;
  onRead: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const title = field(item, 'title');
  const image = field(item, 'image');
  const tags = storyTags(field(item, 'tags'));
  const link: LinkAction | null = m.linkOr(field(item, 'url'), null);
  const readable = !link && paragraphs(field(item, 'body')).length > 0;
  // Seluruh ubin bisa diklik lewat ::after pada tautan/tombol judul (satu target, satu label)
  const stretch = 'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-4px] focus-visible:after:outline-white';
  const heading = link ? (
    <ActionLink action={link} className={stretch}>
      {title}
    </ActionLink>
  ) : readable ? (
    <button ref={buttonRef} type="button" onClick={onRead} aria-expanded={open} aria-controls={readerId} className={`text-left [text-transform:inherit] ${stretch}`}>
      {title}
    </button>
  ) : (
    title
  );
  const dark = !feature || m.accentTone === 'inverse';
  return (
    <Reveal
      as="article"
      delay={stagger(index, 90)}
      data-tpl-tone={dark ? 'inverse' : undefined}
      className={`group relative isolate flex min-h-[300px] flex-col overflow-hidden rounded-[6px] bg-(--pl-deep) @2xl:min-h-[320px] @4xl:min-h-0 ${
        wide ? '@2xl:col-span-2' : ''
      } ${cell}`}
    >
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt=""
          fallback="none"
          sizes={sizes}
          className="absolute inset-0 -z-20"
          imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
        />
      )}
      {feature ? (
        <div aria-hidden className="absolute inset-0 -z-10 bg-(--tpl-accent) opacity-[0.9] transition-opacity duration-500 group-hover:opacity-[0.86]" />
      ) : (
        <>
          <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-(--pl-deep) via-(--pl-deep)/55 via-45% to-(--pl-deep)/10" />
          {/* Pita atas untuk tanggal (foto langit terang) */}
          <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-24 bg-linear-to-b from-(--pl-deep)/75 to-transparent" />
        </>
      )}
      <div className={`flex items-center justify-between gap-3 p-5 text-[12.5px] font-semibold @3xl:p-6 ${feature && !dark ? 'text-(--tpl-on-accent)' : 'text-white'}`}>
        <span className="inline-flex items-center gap-2">
          <CalendarDays aria-hidden className="h-4 w-4" strokeWidth={1.8} />
          <StoryDateLabel raw={field(item, 'date')} m={m} />
        </span>
        <ArrowUpRight aria-hidden className="h-5 w-5 opacity-80 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className={`mt-auto p-5 @3xl:p-6 ${feature && !dark ? 'text-(--tpl-on-accent)' : 'text-white'}`}>
        <h3 className={`${TYPE_P.tile} ${feature ? '@4xl:text-[26px] @6xl:text-[30px]' : ''} text-balance`}>{heading}</h3>
        {feature && field(item, 'excerpt') && <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed opacity-90">{field(item, 'excerpt')}</p>}
        {tags.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-x-3 text-[12px] font-semibold tracking-[0.04em] opacity-85">
            {tags.map((tag) => (
              <span key={tag}>#{tag.replace(/\s+/g, '')}</span>
            ))}
          </p>
        )}
        {feature && (link || readable) && (
          <span aria-hidden className="mt-6 inline-flex items-center gap-1.5 border-b-2 border-current pb-1 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
            {m.ui.readStory}
            <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
          </span>
        )}
      </div>
    </Reveal>
  );
}

function Reader({ m, item, id, onClose }: { m: PortlineModel; item: ListItem; id: string; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const title = field(item, 'title');
  const image = field(item, 'image');
  const tags = storyTags(field(item, 'tags'));
  useEffect(() => {
    heading.current?.focus();
  }, [title]);
  return (
    <div
      id={id}
      role="region"
      aria-label={`${m.ui.storyOpen}: ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className={`mt-4 grid gap-6 rounded-[8px] bg-(--pl-ice) p-5 @3xl:p-8 ${hasImage(image) ? '@4xl:grid-cols-12 @4xl:gap-10' : ''}`}
    >
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt={PORTLINE_PHOTOS.alt(image, title)}
          fallback="none"
          sizes="(min-width: 896px) 40vw, 92vw"
          className="aspect-[3/2] rounded-[6px] @4xl:col-span-5"
        />
      )}
      <div className="min-w-0 @4xl:col-span-7">
        <div className="flex items-start justify-between gap-4">
          <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold ${C.muted}`}>
            <StoryDateLabel raw={field(item, 'date')} m={m} />
            {tags.map((tag) => (
              <span key={tag} className="text-(--pl-ink)">
                #{tag.replace(/\s+/g, '')}
              </span>
            ))}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.ui.closeStory}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] text-(--pl-deep) transition-colors hover:bg-white"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <h3 ref={heading} tabIndex={-1} className={`mt-2 ${TYPE_P.tile} @3xl:text-[26px] ${C.ink} focus:outline-none`}>
          {title}
        </h3>
        <div className={`mt-4 grid max-w-[68ch] gap-3 ${TYPE_P.body} ${C.body}`}>
          {paragraphs(field(item, 'body')).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Newsroom({ m }: { m: PortlineModel }) {
  const { newsroom } = m;
  const items = m.items('newsroom');
  const tags = newsTags(items);
  const [tag, setTag] = useState<string | null>(null);
  // Berita yang dibuka di panel baca: indeks di daftar asli (objek item dibuat ulang setiap render)
  const [open, setOpen] = useState<number | null>(null);
  const readerId = useId();
  const buttons = useRef(new Map<number, HTMLButtonElement | null>());
  const { setPrefill } = useEnquiry();
  const activeTag = tag && tags.includes(tag) ? tag : null;
  const shown = filterNews(items, activeTag);
  const cells = mosaicCells(shown.length);
  const openItem = open !== null ? (items[open] ?? null) : null;
  const allLabel = text(newsroom, 'all_label') || 'All';
  const buttonLabel = text(newsroom, 'button_label');
  const buttonUrl = text(newsroom, 'button_url');
  const more = m.linkOr(buttonUrl, m.contactAction);

  const close = () => {
    const button = open !== null ? buttons.current.get(open) : null;
    setOpen(null);
    window.setTimeout(() => button?.focus(), 0);
  };

  const filters: ReactNode = tags.length > 0 && (
    <div role="group" aria-label={m.ui.filterLabel} className="pl-rail -mx-5 flex gap-1 overflow-x-auto px-5 @2xl:mx-0 @2xl:px-0 @5xl:justify-end">
      {[null, ...tags].map((t) => {
        const pressed = t === activeTag;
        return (
          <button
            key={t ?? '__all'}
            type="button"
            aria-pressed={pressed}
            onClick={() => setTag(t)}
            className={`relative h-11 shrink-0 px-3 text-[13px] font-semibold tracking-[0.02em] transition-colors duration-300 ${pressed ? C.ink : `${C.muted} hover:text-(--pl-deep)`}`}
          >
            #{(t ?? allLabel).replace(/\s+/g, '')}
            <span aria-hidden className={`absolute inset-x-3 bottom-1.5 h-[2px] bg-(--tpl-accent) transition-transform duration-300 ${pressed ? 'scale-x-100' : 'scale-x-0'}`} />
          </button>
        );
      })}
    </div>
  );

  return (
    <TemplateSection sectionKey="newsroom" className="bg-white pb-12 pt-16 @3xl:pb-14 @3xl:pt-22 @5xl:pt-28">
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(newsroom, 'eyebrow')} title={text(newsroom, 'title')} aside={filters || undefined} />
        <div className="mt-8 grid grid-cols-1 gap-3 @2xl:grid-cols-2 @3xl:mt-10 @4xl:grid-cols-12 @4xl:grid-rows-[repeat(2,minmax(250px,auto))] @6xl:grid-rows-[repeat(2,minmax(272px,auto))]">
          {shown.map((item, i) => {
            const at = items.findIndex((x) => x === item);
            return (
              <Tile
                key={`${field(item, 'title')}-${i}-${activeTag ?? 'all'}`}
                m={m}
                item={item}
                feature={i === 0}
                wide={i === 0 || (i === shown.length - 1 && (shown.length - 1) % 2 === 1)}
                cell={cells[i][0]}
                sizes={cells[i][1]}
                index={i}
                open={open === at}
                readerId={readerId}
                onRead={() => setOpen((cur) => (cur === at ? null : at))}
                buttonRef={(el) => {
                  buttons.current.set(at, el);
                }}
              />
            );
          })}
        </div>
        {openItem && <Reader m={m} item={openItem} id={readerId} onClose={close} />}
        {buttonLabel && more && (
          <div className="mt-6 flex justify-end">
            <TextLink
              action={more}
              label={buttonLabel}
              onNavigate={() => {
                if (!buttonUrl && more.kind === 'section' && more.target === 'contact') setPrefill({ type: matchType(m.types, /media|press|pers/i) });
              }}
            />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

export function Press({ m }: { m: PortlineModel }) {
  const { press } = m;
  const items = m.items('press');
  const rail = useRef<HTMLUListElement>(null);
  const { start, end } = useRail(rail, items.length);
  const title = text(press, 'title');
  const eyebrow = text(press, 'eyebrow');
  const arrow =
    'flex h-11 w-11 items-center justify-center rounded-[4px] text-(--pl-deep) ring-1 ring-inset ring-(--pl-deep)/20 transition-colors duration-300 hover:bg-(--pl-ice) aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent';
  return (
    <TemplateSection sectionKey="press" className="bg-white pb-14 @3xl:pb-20">
      <div className={CONTAINER}>
        <div className="grid gap-6 border-t border-(--pl-deep)/[0.12] pt-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-10 @3xl:pt-12">
          <div className="flex items-end justify-between gap-4 @5xl:col-span-3 @5xl:block">
            <div className="min-w-0">
              {eyebrow && eyebrow.toLowerCase() !== title.toLowerCase() && <SectionLabel>{eyebrow}</SectionLabel>}
              {title && <h2 className={`${eyebrow && eyebrow.toLowerCase() !== title.toLowerCase() ? 'mt-3' : ''} ${TYPE_P.h2s} ${C.ink}`}>{title}</h2>}
            </div>
            {!(start && end) && (
              <div className="flex shrink-0 gap-2 @5xl:mt-6">
                <button type="button" aria-label={m.ui.previous} aria-disabled={start || undefined} onClick={() => !start && scrollRail(rail.current, -1)} className={arrow}>
                  <ChevronLeft aria-hidden className="h-5 w-5" />
                </button>
                <button type="button" aria-label={m.ui.next} aria-disabled={end || undefined} onClick={() => !end && scrollRail(rail.current, 1)} className={arrow}>
                  <ChevronRight aria-hidden className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-9">
            <ul ref={rail} aria-label={m.ui.pressList} tabIndex={0} className="pl-rail -mx-1 flex snap-x snap-mandatory scroll-px-1 gap-6 overflow-x-auto px-1 py-1">
              {items.map((item, i) => {
                const link = m.linkOr(field(item, 'url'), null);
                const headline = field(item, 'headline');
                return (
                  <li
                    key={`${headline}-${i}`}
                    className={`flex w-[86%] shrink-0 snap-start gap-4 @2xl:w-[calc(50%-12px)] ${i > 0 ? 'border-l border-(--pl-deep)/[0.12] pl-6' : ''}`}
                  >
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-(--pl-ice) text-(--pl-ink)">
                      <Newspaper className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2.5 text-[12.5px]">
                        {field(item, 'outlet') && <span className="font-bold uppercase tracking-[0.06em] text-(--pl-ink)">{field(item, 'outlet')}</span>}
                        <StoryDateLabel raw={field(item, 'date')} m={m} className={C.muted} />
                      </p>
                      <p className={`mt-1.5 ${DISPLAY} text-[18px] font-semibold leading-snug @3xl:text-[19px] ${C.ink}`}>
                        {link ? (
                          <ActionLink action={link} className="underline decoration-(--pl-deep)/25 underline-offset-4 transition-colors hover:decoration-(--tpl-accent)">
                            {headline}
                          </ActionLink>
                        ) : (
                          headline
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
