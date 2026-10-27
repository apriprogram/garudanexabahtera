// Berita (kunci `news`) + pengumuman (`announcements`) & agenda (`agenda`) berbagi satu pita. Bentuk data berita,
// pengumuman, dan agenda SAMA dengan Bestari/Cakrawala/Madani (title, date, category, excerpt, body, image, url /
// title, date, text, badge, url / date, title, time, place), jadi Berita & Pengumuman dari tulisan dipasang dengan cara
// yang sama.
// Berita: kepala section + tombol kategori (aria-pressed), lalu kartu putih berfoto 3:2: chip kategori + tanggal
// (<time>), judul, ringkasan, "Baca selengkapnya" (tautan berita bila diisi, kalau tidak membuka isi lengkap di kartu,
// aria-expanded). HP: tiga kartu pertama, sisanya lewat "Tampilkan berita lain". Pengumuman: kartu bergaris tipis,
// kolom tanggal kiri, label "Penting" merah lembut, tautan "Lampiran". Agenda: UBIN KALENDER (pita bulan warna tema,
// tanggal besar, hari) yang terlipat turun sekali saat daftar terlihat.
// Berita/pengumuman dari tulisan (site_posts, kunci POST_PATH_KEY): kartu menaut ke halaman tulisan lewat judulnya.
// Fitur Berita & Pengumuman aktif (usePostsEnabled) → Berita dan Pengumuman diganti section profesional bersama
// (shared/posts/pro) dengan label & judul Pradipta; Agenda tetap.
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, Clock, MapPin, Paperclip } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { usePostsEnabled, useSitePosts } from '../shared/posts/hooks';
import { POST_PATH_KEY, isUrgentBadge } from '../shared/posts/model';
import { ProAnnouncementsSection, ProNewsSection } from '../shared/posts/pro';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SiteLink } from '../shared/SiteLink';
import { field, hasImage, safeUrl, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { displayDate, filterNews, isPdf, newsCategories, paragraphsOf, parseSchoolDate, type PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, CARD, CHIP, DISPLAY, SECTION_PAD, TYPE_P, ZOOM, cardOn, postThemeOn, type Tone } from './styles';
import { Head, PillLink, SectionTag, TextLink } from './ui';

/** Kartu tulisan: tautan judul selebar kartu (lapisan ::after mengikuti radius kartu), cincin fokus mengelilinginya. */
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-(--pd-ink) decoration-current/40 underline-offset-4";
const POST_CARD = {
  news: { link: 'after:rounded-[20px] group-hover/news:underline', line: 'group-hover/news:decoration-current' },
  notice: { link: 'after:rounded-[14px] group-hover/notice:underline', line: 'group-hover/notice:decoration-current' },
} as const;
type PostCardKind = keyof typeof POST_CARD;

/** Judul item: tautan ke halaman tulisan bila item berasal dari tulisan (kartu `relative`), selain itu teks biasa. */
function ItemTitle({ item, card }: { item: ListItem; card: PostCardKind }) {
  const title = field(item, 'title');
  const postPath = field(item, POST_PATH_KEY);
  if (!postPath) return <>{title}</>;
  return (
    <SiteLink path={postPath} className={`${STRETCHED_LINK} ${POST_CARD[card].link}`}>
      {title}
    </SiteLink>
  );
}

/** "Baca selengkapnya →" di kartu tulisan (hiasan: tautannya judul kartu). */
function MoreHint({ card, className = 'mt-3' }: { card: PostCardKind; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-(--pd-ink) ${className}`}>
      <span className={`underline decoration-current/30 underline-offset-4 ${POST_CARD[card].line}`}>Baca selengkapnya</span>
      <ArrowRight className="pd-nudge h-4 w-4" />
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

/** "Baca selengkapnya": tautan berita/tulisan, atau tombol buka-tutup isi lengkap (status buka dipegang kartunya). */
function ReadMore({ item, title, open, onToggle }: { item: ListItem; title: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  // Tulisan: tautannya judul kartu (halaman /berita/{slug})
  if (field(item, POST_PATH_KEY)) return <MoreHint card="news" />;
  const href = safeUrl(field(item, 'url'));
  const body = paragraphsOf(field(item, 'body'));
  if (href) {
    return (
      <ActionLink
        action={{ kind: 'external', href }}
        aria-label={`Baca selengkapnya: ${title}`}
        className="group mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-(--pd-ink)"
      >
        <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Baca selengkapnya</span>
        <ArrowUpRight aria-hidden className="h-4 w-4" />
      </ActionLink>
    );
  }
  if (body.length === 0) return null;
  return (
    <>
      <div id={id} data-open={open} inert={!open} className="pd-collapse">
        <div className="overflow-hidden">
          <div className={`space-y-3 pt-3 text-[14.5px] leading-relaxed ${C.body}`}>
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
        onClick={onToggle}
        className="group mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-(--pd-ink)"
      >
        <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{open ? 'Tutup' : 'Baca selengkapnya'}</span>
        <ChevronDown aria-hidden className={`pd-turn h-4 w-4 ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">: {title}</span>
      </button>
    </>
  );
}

function NewsCard({ item, tone }: { item: ListItem; tone: Tone }) {
  const [open, setOpen] = useState(false);
  const title = field(item, 'title');
  const image = field(item, 'image');
  const category = field(item, 'category');
  const date = field(item, 'date');
  const post = !!field(item, POST_PATH_KEY);
  // Kartu tertutup sejajar lewat tinggi minimal judul (3 baris) & ringkasan (3 baris), bukan h-full: kartu yang dibuka
  // memanjang sendiri tanpa menarik kartu lain di barisnya (grid items-start)
  return (
    <article className={`group/news group flex flex-col p-2 ${cardOn(tone)} ${post ? 'relative' : ''}`}>
      {hasImage(image) && (
        // Pembungkus memotong foto: foto membesar pelan saat kartu disorot (ZOOM di wadah KitPhoto), sekali zoom-out
        // saat muncul (KitPhoto zoom di <img>)
        <div className="overflow-hidden rounded-[14px]">
          <KitPhoto
            src={image}
            alt={field(item, 'image_alt') || PRADIPTA_PHOTOS.alt(image, title)}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
            width={post ? 1200 : undefined}
            height={post ? 800 : undefined}
            zoom
            className={`aspect-[3/2] ${ZOOM}`}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-3 pt-4">
        {(category || date) && (
          <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] ${C.muted}`}>
            {category && <span className={CHIP.meta}>{category}</span>}
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                <DateText raw={date} />
              </span>
            )}
          </p>
        )}
        <h3 className={`mt-3 line-clamp-3 text-balance ${DISPLAY} text-[17px] font-semibold leading-snug tracking-[-0.01em] @3xl:min-h-[4.125em] ${C.ink}`}>
          <ItemTitle item={item} card="news" />
        </h3>
        {field(item, 'excerpt') && (
          // Dibuka → ringkasan utuh (tidak terpotong "…" tepat di atas isi lengkap)
          <p className={`mt-2 text-pretty text-[14.5px] leading-relaxed @3xl:min-h-[4.875em] ${open ? '' : 'line-clamp-3'} ${C.body}`}>{field(item, 'excerpt')}</p>
        )}
        <div className="flex flex-col">
          <ReadMore item={item} title={title} open={open} onToggle={() => setOpen((v) => !v)} />
        </div>
      </div>
    </article>
  );
}

export function News({ m }: { m: PradiptaModel }) {
  const { news } = m;
  const tone = m.tone('news');
  const items = m.items('news');
  const pro = usePostsEnabled();
  const posts = useSitePosts('berita');
  const [category, setCategory] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const buttonLabel = text(news, 'button_label');
  const buttonUrl = safeUrl(text(news, 'button_url'));
  const cmsButton =
    buttonLabel && buttonUrl ? <PillLink action={{ kind: 'external', href: buttonUrl }} label={buttonLabel} variant={tone === 'sky' ? 'light' : 'soft'} external /> : null;
  if (pro) {
    return (
      <ProNewsSection
        section={news}
        theme={postThemeOn(tone)}
        className={`${SECTION_PAD} ${BAND[tone]}`}
        extra={cmsButton}
        head={(filters) => (
          <Head
            sectionKey="news"
            eyebrow={text(news, 'eyebrow')}
            title={text(news, 'title') || 'Berita terbaru'}
            fallback="Berita"
            subtitle={text(news, 'subtitle')}
            tone={tone}
            aside={filters}
          />
        )}
      />
    );
  }
  if (items.length === 0) return null;
  const categories = newsCategories(items);
  const shown = filterNews(items, category);
  const allLabel = text(news, 'all_label') || 'Semua';

  const filters =
    categories.length > 1 ? (
      <div role="group" aria-label="Saring berita menurut kategori" className="pd-rail -mx-5 flex max-w-[calc(100%+40px)] snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1 @2xl:mx-0 @2xl:max-w-full @2xl:flex-wrap @2xl:px-0 @5xl:justify-end">
        {[null, ...categories].map((c) => {
          const pressed = (c ?? null) === (category ?? null);
          return (
            <button
              key={c ?? 'semua'}
              type="button"
              aria-pressed={pressed}
              onClick={() => setCategory(c)}
              className={`${CHIP.filter} ${pressed ? CHIP.on : tone === 'sky' ? CHIP.offSky : CHIP.offWhite}`}
            >
              {c ?? allLabel}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <TemplateSection sectionKey="news" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head sectionKey="news" eyebrow={text(news, 'eyebrow')} title={text(news, 'title')} fallback="Berita" subtitle={text(news, 'subtitle')} tone={tone} aside={filters} />
        <p className="sr-only" role="status">
          {category ? `${shown.length} berita kategori ${category}` : ''}
        </p>
        {/* Kolom tetap (tidak bergantung jumlah hasil filter): 1 → 2 → 4 (tanpa 3 kolom: empat kartu tidak menyisakan
            satu kartu yatim). items-start: kartu yang dibuka tidak memanjangkan kartu lain. HP: tiga kartu pertama. */}
        <ul className="mt-10 grid gap-4 @3xl:mt-12 @3xl:grid-cols-2 @3xl:items-start @6xl:grid-cols-4">
          {shown.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className={i >= 3 && !more ? 'hidden @3xl:block' : ''}>
              <NewsCard item={item} tone={tone} />
            </Reveal>
          ))}
        </ul>
        {shown.length > 3 && !more && (
          <div className="mt-6 @3xl:hidden">
            <button
              type="button"
              onClick={() => setMore(true)}
              className={`${tone === 'sky' ? 'bg-white ring-1 ring-inset ring-(--pd-ring)' : 'bg-(--pd-sky2)'} flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold ${C.ink}`}
            >
              Tampilkan berita lain
            </button>
          </div>
        )}
        {(posts || cmsButton) && (
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 @xl:flex-row @xl:items-center @3xl:mt-12">
            {posts && <PillLink action={{ kind: 'site', path: '/berita' }} label="Lihat semua berita" variant="primary" />}
            {cmsButton}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

/** Kepala kecil pengumuman & agenda: label pil + H2. */
function SmallHead({ sectionKey, eyebrow, title, fallback, tone }: { sectionKey: string; eyebrow: string; title: string; fallback: string; tone: Tone }) {
  return (
    <>
      <SectionTag sectionKey={sectionKey} label={eyebrow} tone={tone} />
      {title ? <h2 className={`${eyebrow ? 'mt-4' : ''} text-balance ${C.ink} ${TYPE_P.h2sm}`}>{title}</h2> : <h2 className="sr-only">{fallback}</h2>}
    </>
  );
}

function Announcements({ m, tone }: { m: PradiptaModel; tone: Tone }) {
  const { announcements } = m;
  const items = m.items('announcements');
  const pro = usePostsEnabled();
  const posts = useSitePosts('pengumuman');
  const head = (
    <SmallHead sectionKey="announcements" eyebrow={text(announcements, 'eyebrow')} title={text(announcements, 'title') || (pro ? 'Pengumuman' : '')} fallback="Pengumuman" tone={tone} />
  );
  if (pro) return <ProAnnouncementsSection section={announcements} theme={postThemeOn(tone)} head={head} />;
  return (
    <TemplateSection sectionKey="announcements" className="min-w-0">
      {head}
      <Reveal as="ul" className={`mt-6 divide-y divide-(--pd-ring) ${cardOn(tone)}`}>
        {items.map((item, i) => {
          const badge = field(item, 'badge');
          const post = !!field(item, POST_PATH_KEY);
          const href = post ? null : safeUrl(field(item, 'url'));
          const date = field(item, 'date');
          return (
            <li key={`${field(item, 'title')}-${i}`} className={`grid gap-1.5 p-5 @xl:grid-cols-[110px_minmax(0,1fr)] @xl:gap-5 @3xl:px-6 ${post ? 'group/notice relative' : ''}`}>
              <div className={`${DISPLAY} text-[13.5px] font-medium tabular-nums text-(--pd-ink)`}>{date && <DateText raw={date} />}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1.5">
                  <h3 className={`min-w-0 text-[16.5px] font-semibold leading-snug ${C.ink}`}>
                    <ItemTitle item={item} card="notice" />
                  </h3>
                  {badge && (
                    <span
                      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold ${
                        isUrgentBadge(badge) ? 'bg-[#FEECEB] text-[#B42318]' : 'bg-(--pd-sky2) text-(--pd-ink)'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                {field(item, 'text') && <p className={`mt-1.5 ${C.body} ${TYPE_P.small}`}>{field(item, 'text')}</p>}
                {post && <MoreHint card="notice" className="mt-1" />}
                {href && (
                  <ActionLink action={{ kind: 'external', href }} className="group mt-1 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold text-(--pd-ink)">
                    <Paperclip aria-hidden className="h-3.5 w-3.5" />
                    <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">Lampiran</span>
                    {isPdf(href) && <span className="inline-flex h-5 items-center rounded-full bg-(--pd-sky2) px-1.5 text-[11px] font-semibold">PDF</span>}
                  </ActionLink>
                )}
              </div>
            </li>
          );
        })}
      </Reveal>
      {posts && <TextLink action={{ kind: 'site', path: '/pengumuman' }} label="Lihat semua pengumuman" className="mt-4" />}
    </TemplateSection>
  );
}

/** Ubin kalender: pita bulan warna tema di atas, tanggal besar, lalu hari. */
function CalendarTile({ raw, index }: { raw: string; index: number }) {
  const date = parseSchoolDate(raw);
  if (!date)
    return (
      <span className="inline-flex w-16 shrink-0 items-center justify-center rounded-[14px] bg-(--pd-sky2) px-1.5 py-2 text-center text-[12px] font-semibold leading-tight text-(--pd-ink)">
        {displayDate(raw) || '—'}
      </span>
    );
  return (
    <time
      dateTime={date.iso}
      style={{ '--pd-delay': `${stagger(index, 80)}ms` } as CSSProperties}
      className="pd-page flex w-16 shrink-0 flex-col overflow-hidden rounded-[14px] bg-white text-center ring-1 ring-inset ring-(--pd-ring)"
    >
      <span className="block h-[22px] bg-(--tpl-accent) text-[11px] font-semibold uppercase leading-[22px] tracking-[0.08em] text-(--tpl-on-accent)">{date.month}</span>
      <span className={`${DISPLAY} mt-1.5 block text-[26px] font-semibold leading-none ${C.ink}`}>{date.day}</span>
      <span className={`mb-2 mt-1 block text-[11px] font-medium ${C.muted}`}>
        {date.weekday}
        <span className="sr-only"> {date.year}</span>
      </span>
    </time>
  );
}

function Agenda({ m, tone }: { m: PradiptaModel; tone: Tone }) {
  const { agenda } = m;
  const items = m.items('agenda');
  return (
    <TemplateSection sectionKey="agenda" className="min-w-0">
      <SmallHead sectionKey="agenda" eyebrow={text(agenda, 'eyebrow')} title={text(agenda, 'title')} fallback="Agenda kegiatan" tone={tone} />
      <Reveal variant="fade" className={`mt-6 p-2 ${tone === 'sky' ? CARD.onSky : CARD.sky}`}>
        <ul className="divide-y divide-(--pd-ring)">
          {items.map((item, i) => {
            const meta = [field(item, 'time') && { icon: Clock, text: field(item, 'time') }, field(item, 'place') && { icon: MapPin, text: field(item, 'place') }].filter(
              (x): x is { icon: typeof Clock; text: string } => !!x,
            );
            return (
              <li key={`${field(item, 'title')}-${i}`} className="flex items-center gap-4 p-3">
                <CalendarTile raw={field(item, 'date')} index={i} />
                <div className="min-w-0">
                  <h3 className={`text-[16px] font-semibold leading-snug ${C.ink}`}>{field(item, 'title')}</h3>
                  {meta.length > 0 && (
                    <p className={`mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] ${C.muted}`}>
                      {meta.map(({ icon: Icon, text: value }, j) => (
                        <span key={`${value}-${j}`} className="inline-flex items-center gap-1.5">
                          <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                          {value}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </TemplateSection>
  );
}

/** Pengumuman (7 kolom) & agenda (5 kolom) dalam SATU pita; satu saja tampil → selebar penuh. */
export function Notices({ m }: { m: PradiptaModel }) {
  const showAnnouncements = m.shown('announcements');
  const showAgenda = m.shown('agenda');
  if (!showAnnouncements && !showAgenda) return null;
  const both = showAnnouncements && showAgenda;
  const tone = m.tone('announcements');
  return (
    <div className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={`${CONTAINER} grid items-start gap-12 ${both ? '@5xl:grid-cols-12 @5xl:gap-10' : ''}`}>
        {showAnnouncements && (
          <div className={`min-w-0 ${both ? '@5xl:col-span-7' : ''}`}>
            <Announcements m={m} tone={tone} />
          </div>
        )}
        {showAgenda && (
          <div className={`min-w-0 ${both ? '@5xl:col-span-5' : ''}`}>
            <Agenda m={m} tone={tone} />
          </div>
        )}
      </div>
    </div>
  );
}
