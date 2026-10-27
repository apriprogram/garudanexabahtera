// Berita (kunci `news`) + pengumuman (`announcements`) & agenda (`agenda`) berdampingan.
// Berita: judul kiri, tombol kategori di kanan (referensi Negmar: tab tag; tombol filter aria-pressed), berita pertama
// besar (foto 16:10) dan sisanya kartu mendatar; meta = chip kategori + tanggal (<time>). "Baca selengkapnya" membuka
// tautan berita bila diisi, kalau tidak membuka isi lengkap di kartu (aria-expanded). Pengumuman: kartu abu berisi
// daftar bertanggal dengan label "Penting" merah lembut dan tautan lampiran. Agenda: kartu putih bergaris tipis dengan
// ubin tanggal, waktu, dan tempat.
// Berita/pengumuman dari tulisan (site_posts, kunci POST_PATH_KEY): kartu menaut ke halaman tulisan lewat judulnya
// ("Baca selengkapnya", bukan isi di tempat atau "Lihat lampiran"), plus "Lihat semua berita/pengumuman".
// Fitur Berita & Pengumuman aktif (usePostsEnabled) → Berita dan bagian Pengumuman diganti section profesional bersama
// (shared/posts/pro) dengan judul section Cakrawala; Agenda tetap. Tidak aktif = tampilan di atas dari item CMS.
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, Clock, MapPin, Paperclip } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { usePostsEnabled, useSitePosts } from '../shared/posts/hooks';
import { POST_PATH_KEY } from '../shared/posts/model';
import { ProAnnouncementsSection, ProNewsSection } from '../shared/posts/pro';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SiteLink } from '../shared/SiteLink';
import { field, hasImage, list, safeUrl, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { displayDate, filterNews, isUrgent, newsCategories, newsItems, paragraphsOf, parseSchoolDate, type CakrawalaModel } from './model';
import { CAKRAWALA_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, POST_THEME, SECTION_PAD, TYPE_C } from './styles';
import { Eyebrow, PillLink, SectionHead, TextLink } from './ui';

/** Judul tulisan sebagai tautan selebar kartu (kartu `relative`); cincin fokus mengelilingi kartu. */
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-(--ck-ink) decoration-current/40 underline-offset-4 group-hover:underline";

/** Judul item: tautan ke halaman tulisan bila item berasal dari tulisan, selain itu teks biasa. */
function ItemTitle({ item }: { item: ListItem }) {
  const title = field(item, 'title');
  const postPath = field(item, POST_PATH_KEY);
  if (!postPath) return <>{title}</>;
  return (
    <SiteLink path={postPath} className={STRETCHED_LINK}>
      {title}
    </SiteLink>
  );
}

/** "Baca selengkapnya →" di kartu tulisan (hiasan: tautannya judul kartu). */
function MoreHint({ className = 'mt-4' }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-(--ck-ink) ${className}`}>
      <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Baca selengkapnya</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  );
}

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

function Meta({ item }: { item: ListItem }) {
  const category = field(item, 'category');
  const date = field(item, 'date');
  if (!category && !date) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium ${C.muted}`}>
      {category && <span className="rounded-full bg-(--ck-tint) px-2.5 py-1 font-semibold text-(--ck-ink)">{category}</span>}
      {date && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden className="h-3.5 w-3.5" />
          <DateText raw={date} />
        </span>
      )}
    </p>
  );
}

function ReadMore({ item, title }: { item: ListItem; title: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // Tulisan: tautannya judul kartu (halaman /berita/{slug})
  if (field(item, POST_PATH_KEY)) return <MoreHint />;
  const href = safeUrl(field(item, 'url'));
  const body = paragraphsOf(field(item, 'body'));
  if (href) {
    return (
      <ActionLink action={{ kind: 'external', href }} aria-label={`Baca selengkapnya: ${title}`} className="group mt-4 inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-(--ck-ink)">
        <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Baca selengkapnya</span>
        <ArrowUpRight aria-hidden className="h-4 w-4" />
      </ActionLink>
    );
  }
  if (body.length === 0) return null;
  return (
    <>
      <div id={id} data-open={open} inert={!open} className="ck-collapse">
        <div className="overflow-hidden">
          <div className={`space-y-3 pt-3 ${TYPE_C.small} ${C.muted}`}>
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
        className="group mt-3 inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-semibold text-(--ck-ink)"
      >
        <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{open ? 'Tutup berita' : 'Baca selengkapnya'}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">: {title}</span>
      </button>
    </>
  );
}

function NewsCard({ item, featured }: { item: ListItem; featured: boolean }) {
  const title = field(item, 'title');
  const image = field(item, 'image');
  const post = !!field(item, POST_PATH_KEY);
  const photo = hasImage(image) && (
    <KitPhoto
      src={image}
      alt={field(item, 'image_alt') || CAKRAWALA_PHOTOS.alt(image, title)}
      sizes={featured ? '(min-width: 1024px) 50vw, 92vw' : '(min-width: 1024px) 220px, 34vw'}
      width={post ? (featured ? 1600 : 1200) : undefined}
      height={post ? (featured ? 1000 : 900) : undefined}
      className={featured ? 'aspect-[16/10] rounded-[20px]' : 'aspect-[4/3] w-[34%] max-w-[220px] shrink-0 self-start rounded-[16px] @xl:w-[38%]'}
    />
  );
  if (featured) {
    return (
      <article className={`flex h-full flex-col ${post ? 'group relative' : ''}`}>
        {photo}
        <div className={`flex flex-1 flex-col ${photo ? 'pt-5' : ''}`}>
          <Meta item={item} />
          <h3 className={`mt-3 text-balance ${DISPLAY} text-[21px] font-semibold leading-snug tracking-[-0.02em] ${C.ink} @3xl:text-[26px]`}>
            <ItemTitle item={item} />
          </h3>
          {field(item, 'excerpt') && <p className={`mt-2 ${TYPE_C.body} ${C.muted}`}>{field(item, 'excerpt')}</p>}
          <ReadMore item={item} title={title} />
        </div>
      </article>
    );
  }
  return (
    <article className={`flex gap-4 @xl:gap-5 ${post ? 'group relative' : ''}`}>
      {photo}
      <div className="flex min-w-0 flex-1 flex-col">
        <Meta item={item} />
        <h3 className={`mt-2.5 text-balance ${C.ink} ${TYPE_C.h3}`}>
          <ItemTitle item={item} />
        </h3>
        {field(item, 'excerpt') && <p className={`mt-1.5 line-clamp-3 ${TYPE_C.small} ${C.muted}`}>{field(item, 'excerpt')}</p>}
        <ReadMore item={item} title={title} />
      </div>
    </article>
  );
}

export function News({ m }: { m: CakrawalaModel }) {
  const { news } = m;
  const items = newsItems(news);
  const pro = usePostsEnabled();
  const posts = useSitePosts('berita');
  const [category, setCategory] = useState<string | null>(null);
  const buttonLabel = text(news, 'button_label');
  const buttonUrl = safeUrl(text(news, 'button_url'));
  const cmsButton =
    buttonLabel && buttonUrl ? <PillLink action={{ kind: 'external', href: buttonUrl }} label={buttonLabel} dot="ink" className={`${BTN.outline} ${BTN.md}`} /> : null;
  if (pro) {
    return (
      <ProNewsSection
        section={news}
        theme={POST_THEME}
        className={SECTION_PAD}
        extra={cmsButton}
        head={(filters) => (
          <SectionHead eyebrow={text(news, 'eyebrow')} title={text(news, 'title') || 'Berita terbaru'} subtitle={text(news, 'subtitle')} aside={filters} />
        )}
      />
    );
  }
  if (items.length === 0) return null;
  const categories = newsCategories(items);
  const shown = filterNews(items, category);
  const allLabel = text(news, 'all_label') || 'Semua';
  const [first, ...rest] = shown;

  const filters =
    categories.length > 1 ? (
      <div role="group" aria-label="Saring berita menurut kategori" className="ck-rail -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1">
        {[null, ...categories].map((c) => {
          const pressed = (c ?? null) === (category ?? null);
          return (
            <button
              key={c ?? 'semua'}
              type="button"
              aria-pressed={pressed}
              onClick={() => setCategory(c)}
              className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                pressed ? 'bg-[#0D1830] text-white' : `bg-[#F3F6FA] ${C.ink} hover:bg-[#E7ECF4]`
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
        <SectionHead eyebrow={text(news, 'eyebrow')} title={text(news, 'title')} subtitle={text(news, 'subtitle')} aside={filters} />
        <p className="sr-only" role="status">
          {category ? `${shown.length} berita kategori ${category}` : ''}
        </p>
        <div className={`mt-10 grid gap-8 @3xl:mt-12 ${rest.length ? '@5xl:grid-cols-2 @5xl:gap-10' : ''}`}>
          {first && (
            <Reveal key={`utama-${field(first, 'title')}`}>
              <NewsCard item={first} featured />
            </Reveal>
          )}
          {rest.length > 0 && (
            <ul className="grid content-start gap-6 divide-y divide-black/[0.07] @5xl:gap-0">
              {rest.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className="pt-6 first:pt-0 @5xl:py-6 @5xl:first:pt-0">
                  <NewsCard item={item} featured={false} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
        {(posts || cmsButton) && (
          <div className="mt-10 flex flex-col items-center justify-center gap-3 @xl:flex-row @3xl:mt-12">
            {posts && <PillLink action={{ kind: 'site', path: '/berita' }} label="Lihat semua berita" dot="white" className={`${BTN.ink} ${BTN.md}`} />}
            {cmsButton}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

const SMALL_H2 = `${DISPLAY} text-balance text-[24px] font-semibold leading-tight tracking-[-0.025em] @3xl:text-[28px]`;

function Announcements({ m }: { m: CakrawalaModel }) {
  const { announcements } = m;
  const pro = usePostsEnabled();
  const posts = useSitePosts('pengumuman');
  const items = list(announcements, 'items', 8).filter((item) => field(item, 'title'));
  const eyebrow = text(announcements, 'eyebrow');
  const title = text(announcements, 'title');
  if (pro) {
    // Papan putih (blok tanggal abu terlihat), sejajar kartu Agenda
    return (
      <ProAnnouncementsSection
        section={announcements}
        theme={POST_THEME}
        className={`p-5 @3xl:p-8 ${CARD.white}`}
        head={
          <>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h2 className={`${eyebrow ? 'mt-3' : ''} ${SMALL_H2} ${C.ink}`}>{title || 'Pengumuman'}</h2>
          </>
        }
      />
    );
  }
  return (
    <TemplateSection sectionKey="announcements" className={`min-w-0 p-5 @3xl:p-8 ${CARD.panel}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {title && <h2 className={`${eyebrow ? 'mt-3' : ''} ${SMALL_H2} ${C.ink}`}>{title}</h2>}
      <ul className="mt-6 grid gap-3">
        {items.map((item, i) => {
          const badge = field(item, 'badge');
          const post = !!field(item, POST_PATH_KEY);
          const href = post ? null : safeUrl(field(item, 'url'));
          const date = field(item, 'date');
          return (
            <Reveal
              as="li"
              key={`${field(item, 'title')}-${i}`}
              delay={stagger(i, 60)}
              className={`rounded-[16px] bg-white p-4 ring-1 ring-inset ring-black/[0.05] @3xl:p-5 ${post ? 'group relative' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {badge && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${isUrgent(badge) ? 'bg-[#FEECEB] text-[#B42318]' : 'bg-(--ck-tint) text-(--ck-ink)'}`}>{badge}</span>
                )}
                {date && <DateText raw={date} className={`text-[12.5px] font-medium ${C.muted}`} />}
              </div>
              <h3 className={`mt-2 text-[16px] font-semibold leading-snug ${C.ink}`}>
                <ItemTitle item={item} />
              </h3>
              {field(item, 'text') && <p className={`mt-1 ${TYPE_C.small} ${C.muted}`}>{field(item, 'text')}</p>}
              {post && <MoreHint className="mt-1.5" />}
              {href && (
                <ActionLink action={{ kind: 'external', href }} className="group mt-2 inline-flex min-h-9 items-center gap-1.5 text-[13.5px] font-semibold text-(--ck-ink)">
                  <Paperclip aria-hidden className="h-3.5 w-3.5" />
                  <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Lihat lampiran</span>
                </ActionLink>
              )}
            </Reveal>
          );
        })}
      </ul>
      {posts && <TextLink action={{ kind: 'site', path: '/pengumuman' }} label="Lihat semua pengumuman" className="mt-4" />}
    </TemplateSection>
  );
}

function Agenda({ m }: { m: CakrawalaModel }) {
  const { agenda } = m;
  const items = list(agenda, 'items', 8).filter((item) => field(item, 'title'));
  const eyebrow = text(agenda, 'eyebrow');
  const title = text(agenda, 'title');
  return (
    <TemplateSection sectionKey="agenda" className={`min-w-0 p-5 @3xl:p-8 ${CARD.white}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {title && <h2 className={`${eyebrow ? 'mt-3' : ''} ${SMALL_H2} ${C.ink}`}>{title}</h2>}
      <ul className="mt-6 divide-y divide-black/[0.07]">
        {items.map((item, i) => {
          const raw = field(item, 'date');
          const date = parseSchoolDate(raw);
          const meta = [field(item, 'time') && { icon: Clock, text: field(item, 'time') }, field(item, 'place') && { icon: MapPin, text: field(item, 'place') }].filter(
            (x): x is { icon: typeof Clock; text: string } => !!x,
          );
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-[14px] bg-(--ck-tint) py-2.5 text-(--ck-ink)">
                {date ? (
                  <time dateTime={date.iso} className="flex flex-col items-center">
                    <span className={`${DISPLAY} text-[22px] font-bold leading-none`}>{date.day}</span>
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

/** Pengumuman & agenda berdampingan (layar lebar); satu saja tampil → selebar penuh. */
/**
 * Pengumuman & agenda berdampingan. Biasanya jarak atasnya = jarak bawah section Berita; `padTop` = jarak atas
 * sendiri bila yang di atasnya panel tanpa jarak bawah (mis. Berita disembunyikan sehingga panel PPDB tepat di atas).
 */
export function Notices({ m, padTop = false }: { m: CakrawalaModel; padTop?: boolean }) {
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
