// Berita (kunci `news`) + pengumuman (`announcements`) & agenda (`agenda`) berdampingan. Bentuk data berita dan
// pengumuman SAMA dengan Madani/Cakrawala (title, date, category, excerpt, body, image, url / title, date, text, badge,
// url), jadi integrasi CRUD berita sekolah dipasang dengan cara yang sama.
// Berita: label bernomor, judul kiri, tombol kategori di kanan (aria-pressed), lalu kartu pasir berfoto (referensi
// Finovate): foto membulat di dalam kartu, chip kategori + tanggal (<time>), judul, ringkasan, "Baca selengkapnya"
// (tautan berita bila diisi, kalau tidak membuka isi lengkap di kartu, aria-expanded). Pengumuman: daftar bergaris tipis
// bertanggal dengan label "Penting" merah lembut dan tautan lampiran. Agenda: ubin tanggal warna tema, waktu, tempat.
import { ArrowUpRight, CalendarDays, ChevronDown, Clock, MapPin, Paperclip } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeUrl, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { displayDate, filterNews, isUrgent, newsCategories, newsItems, paragraphsOf, parseSchoolDate, type BestariModel } from './model';
import { BESTARI_PHOTOS } from './photos';
import { C, CARD, DISPLAY, SECTION_PAD, TYPE_B } from './styles';
import { PillLink, SectionHead, SectionLabel } from './ui';

function DateText({ raw, className = '' }: { raw: string; className?: string }) {
  const date = parseSchoolDate(raw);
  if (!raw) return null;
  return date ? (
    <time dateTime={date.iso} className={className}>
      {date.label}
    </time>
  ) : (
    <span className={className}>{raw}</span>
  );
}

function ReadMore({ item, title }: { item: ListItem; title: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const href = safeUrl(field(item, 'url'));
  const body = paragraphsOf(field(item, 'body'));
  if (href) {
    return (
      <ActionLink action={{ kind: 'external', href }} aria-label={`Baca selengkapnya: ${title}`} className="group mt-3 inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-semibold text-(--bs-ink)">
        <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Baca selengkapnya</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
      </ActionLink>
    );
  }
  if (body.length === 0) return null;
  return (
    <>
      <div id={id} data-open={open} inert={!open} className="bs-collapse">
        <div className="overflow-hidden">
          <div className={`space-y-3 pt-3 ${TYPE_B.small} ${C.muted}`}>
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="group mt-3 inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-semibold text-(--bs-ink)"
      >
        <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{open ? 'Tutup berita' : 'Baca selengkapnya'}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">: {title}</span>
      </button>
    </>
  );
}

function NewsCard({ item }: { item: ListItem }) {
  const title = field(item, 'title');
  const image = field(item, 'image');
  const category = field(item, 'category');
  const date = field(item, 'date');
  return (
    <article className="group/news flex h-full flex-col rounded-[24px] bg-[#F5F2ED] p-2.5">
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt={BESTARI_PHOTOS.alt(image, title)}
          sizes="(min-width: 1024px) 31vw, (min-width: 768px) 46vw, 92vw"
          className="aspect-[3/2] rounded-[18px]"
          imgClassName="transition-[scale] duration-700 ease-out group-hover/news:scale-[1.03]"
        />
      )}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-4 @3xl:px-4">
        {(category || date) && (
          <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium ${C.muted}`}>
            {category && <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-(--bs-ink)">{category}</span>}
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                <DateText raw={date} />
              </span>
            )}
          </p>
        )}
        <h3 className={`mt-3 text-balance ${DISPLAY} text-[19px] font-medium leading-snug tracking-[-0.015em] ${C.ink} @3xl:text-[20px]`}>{title}</h3>
        {field(item, 'excerpt') && <p className={`mt-2 ${TYPE_B.small} ${C.muted}`}>{field(item, 'excerpt')}</p>}
        <ReadMore item={item} title={title} />
      </div>
    </article>
  );
}

export function News({ m }: { m: BestariModel }) {
  const { news } = m;
  const items = newsItems(news);
  const [category, setCategory] = useState<string | null>(null);
  if (items.length === 0) return null;
  const categories = newsCategories(items);
  const shown = filterNews(items, category);
  const allLabel = text(news, 'all_label') || 'Semua';
  const buttonLabel = text(news, 'button_label');
  const buttonUrl = safeUrl(text(news, 'button_url'));
  const cols = shown.length === 1 ? '' : shown.length === 2 || shown.length === 4 ? '@3xl:grid-cols-2' : '@3xl:grid-cols-2 @5xl:grid-cols-3';

  const filters =
    categories.length > 1 ? (
      <div role="group" aria-label="Saring berita menurut kategori" className="bs-rail -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1">
        {[null, ...categories].map((c) => {
          const pressed = (c ?? null) === (category ?? null);
          return (
            <button
              key={c ?? 'semua'}
              type="button"
              aria-pressed={pressed}
              onClick={() => setCategory(c)}
              className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors duration-300 ${
                pressed ? 'bg-[#1C1917] text-white' : `bg-[#F5F2ED] ${C.ink} hover:bg-[#ECE7DF]`
              }`}
            >
              {c ?? allLabel}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <TemplateSection sectionKey="news" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(news, 'eyebrow')} number={m.number('news')} title={text(news, 'title')} subtitle={text(news, 'subtitle')} aside={filters} />
        <p className="sr-only" role="status">
          {category ? `${shown.length} berita kategori ${category}` : ''}
        </p>
        <ul className={`mt-10 grid gap-3 @3xl:mt-12 @3xl:gap-4 ${cols}`}>
          {shown.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 80)}>
              <NewsCard item={item} />
            </Reveal>
          ))}
        </ul>
        {buttonLabel && buttonUrl && (
          <div className="mt-10 flex justify-center @3xl:mt-12">
            <PillLink action={{ kind: 'external', href: buttonUrl }} label={buttonLabel} variant="outline" />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

const SMALL_H2 = `${DISPLAY} text-balance text-[25px] font-medium leading-tight tracking-[-0.025em] @3xl:text-[30px]`;

function Announcements({ m }: { m: BestariModel }) {
  const { announcements } = m;
  const items = list(announcements, 'items', 8).filter((item) => field(item, 'title'));
  const title = text(announcements, 'title');
  return (
    <TemplateSection sectionKey="announcements" className={`min-w-0 p-5 @3xl:p-8 ${CARD.white}`}>
      <SectionLabel label={text(announcements, 'eyebrow')} className="border-t-0 pt-0" />
      {title && <h2 className={`mt-3 ${SMALL_H2} ${C.ink}`}>{title}</h2>}
      <ul className="mt-6 divide-y divide-[#1C1917]/[0.08]">
        {items.map((item, i) => {
          const badge = field(item, 'badge');
          const href = safeUrl(field(item, 'url'));
          const date = field(item, 'date');
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                {badge && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${isUrgent(badge) ? 'bg-[#FEECEB] text-[#B42318]' : 'bg-(--bs-tint) text-(--bs-ink)'}`}>{badge}</span>
                )}
                {date && <DateText raw={date} className={`text-[12.5px] font-medium ${C.muted}`} />}
              </div>
              <h3 className={`mt-2 text-[16px] font-semibold leading-snug ${C.ink}`}>{field(item, 'title')}</h3>
              {field(item, 'text') && <p className={`mt-1 ${TYPE_B.small} ${C.muted}`}>{field(item, 'text')}</p>}
              {href && (
                <ActionLink action={{ kind: 'external', href }} className="group mt-2 inline-flex min-h-9 items-center gap-1.5 text-[13.5px] font-semibold text-(--bs-ink)">
                  <Paperclip aria-hidden className="h-3.5 w-3.5" />
                  <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Lihat lampiran</span>
                </ActionLink>
              )}
            </Reveal>
          );
        })}
      </ul>
    </TemplateSection>
  );
}

function Agenda({ m }: { m: BestariModel }) {
  const { agenda } = m;
  const items = list(agenda, 'items', 8).filter((item) => field(item, 'title'));
  const title = text(agenda, 'title');
  return (
    <TemplateSection sectionKey="agenda" className={`min-w-0 p-5 @3xl:p-8 ${CARD.panel}`}>
      <SectionLabel label={text(agenda, 'eyebrow')} className="border-t-0 pt-0" />
      {title && <h2 className={`mt-3 ${SMALL_H2} ${C.ink}`}>{title}</h2>}
      <ul className="mt-6 grid gap-3">
        {items.map((item, i) => {
          const raw = field(item, 'date');
          const date = parseSchoolDate(raw);
          const meta = [field(item, 'time') && { icon: Clock, text: field(item, 'time') }, field(item, 'place') && { icon: MapPin, text: field(item, 'place') }].filter(
            (x): x is { icon: typeof Clock; text: string } => !!x,
          );
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="flex gap-4 rounded-[18px] bg-white p-3 pr-4">
              <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-[14px] bg-(--tpl-accent) py-2.5 text-(--tpl-on-accent)">
                {date ? (
                  <time dateTime={date.iso} className="flex flex-col items-center">
                    <span className={`${DISPLAY} text-[24px] font-medium leading-none`}>{date.day}</span>
                    <span className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em]">
                      {date.month} <span className="sr-only">{date.year}</span>
                    </span>
                  </time>
                ) : (
                  <span className="px-1 text-center text-[12px] font-semibold leading-tight">{displayDate(raw) || '—'}</span>
                )}
              </span>
              <div className="min-w-0 self-center">
                <h3 className={`text-[16px] font-semibold leading-snug ${C.ink}`}>{field(item, 'title')}</h3>
                {meta.length > 0 && (
                  <p className={`mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] ${C.muted}`}>
                    {meta.map(({ icon: Icon, text: value }) => (
                      <span key={value} className="inline-flex items-center gap-1.5">
                        <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        {value}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </Reveal>
          );
        })}
      </ul>
    </TemplateSection>
  );
}

/**
 * Pengumuman & agenda berdampingan (layar lebar); satu saja tampil → selebar penuh. Biasanya jarak atasnya = jarak
 * bawah section Berita; `padTop` = jarak atas sendiri bila Berita tidak tampil.
 */
export function Notices({ m, padTop = false }: { m: BestariModel; padTop?: boolean }) {
  const showAnnouncements = m.shown('announcements');
  const showAgenda = m.shown('agenda');
  if (!showAnnouncements && !showAgenda) return null;
  const both = showAnnouncements && showAgenda;
  return (
    <div className={`${CONTAINER} grid items-start gap-4 ${both ? '@5xl:grid-cols-12' : ''} ${padTop ? 'pt-14 @3xl:pt-20 @5xl:pt-24' : ''}`}>
      {showAnnouncements && (
        <div className={both ? '@5xl:col-span-7' : ''}>
          <Announcements m={m} />
        </div>
      )}
      {showAgenda && (
        <div className={both ? '@5xl:col-span-5' : ''}>
          <Agenda m={m} />
        </div>
      )}
    </div>
  );
}
