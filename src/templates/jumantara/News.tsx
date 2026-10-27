// Berita (kunci `news`) + pengumuman (`announcements`) & agenda (`agenda`) berdampingan di satu pita tint. Bentuk data
// berita, pengumuman, dan agenda SAMA dengan Bestari/Madani/Cakrawala (title, date, category, excerpt, body, image, url /
// title, date, text, badge, url / date, title, time, place), jadi fitur Berita & Pengumuman terpasang dengan cara sama.
// Berita: label + H2 + tombol CMS (mis. Instagram) di kanan; berita utama besar (foto 3:2, chip kategori, <time>, judul,
// ringkasan, tombol baca) di 7 kolom, berita lain sebagai baris bergaris rambut dengan gambar kecil di 5 kolom. Tombol
// baca: tautan berita bila diisi, kalau tidak membuka isi lengkap di tempat (aria-expanded).
// Pengumuman: baris bertanggal dengan label "Penting" merah lembut, chip PDF untuk lampiran PDF, dan "Lihat lampiran".
// Agenda: ubin tanggal warna tema (hari + bulan), nama kegiatan, hari & tanggal lengkap, waktu, tempat.
// Fitur Berita & Pengumuman aktif (usePostsEnabled) → Berita & Pengumuman diganti section profesional bersama
// (shared/posts/pro) dengan label & judul Jumantara; Agenda tetap. Item dari tulisan (POST_PATH_KEY) menaut ke halaman
// tulisannya lewat judul.
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronDown, Clock, FileText, MapPin, Paperclip } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { usePostsEnabled } from '../shared/posts/hooks';
import { POST_PATH_KEY } from '../shared/posts/model';
import { ProAnnouncementsSection, ProNewsSection } from '../shared/posts/pro';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SiteLink } from '../shared/SiteLink';
import { field, hasImage, safeUrl, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { isPdf, isUrgent, paragraphsOf, parseSchoolDate, shortFreeDate, type JumantaraModel } from './model';
import { JUMANTARA_PHOTOS } from './photos';
import { BTN, C, CHIP, DISPLAY, DIVIDE, LINE, POST_THEME, POST_THEME_BAND, SECTION_PAD, TYPE_J, URGENT } from './styles';
import { SectionHead, SectionLabel, SectionRule } from './ui';

/** Tautan judul selebar kartu untuk tulisan (kartu `relative`); cincin fokus mengelilingi kartu. */
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] after:rounded-[12px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-(--jm-ink) hover:underline underline-offset-4";

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

const READ = 'group/read inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-(--jm-ink)';

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

/** Tombol baca: tulisan → petunjuk (tautannya judul), tautan berita → keluar, isi lengkap → buka di tempat. */
function ReadMore({ item, label }: { item: ListItem; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const title = field(item, 'title');
  if (field(item, POST_PATH_KEY)) {
    return (
      <span aria-hidden className={`${READ} mt-1`}>
        <span className="underline decoration-current/30 underline-offset-4">{label}</span>
        <ArrowRight className="h-4 w-4" />
      </span>
    );
  }
  const href = safeUrl(field(item, 'url'));
  if (href) {
    return (
      <ActionLink action={{ kind: 'external', href }} aria-label={`${label}: ${title}`} className={`${READ} mt-1`}>
        <span className="underline decoration-current/30 underline-offset-4 group-hover/read:decoration-current">{label}</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover/read:-translate-y-0.5 group-hover/read:translate-x-0.5" />
      </ActionLink>
    );
  }
  const body = paragraphsOf(field(item, 'body'));
  if (body.length === 0) return null;
  return (
    <>
      <div id={id} data-open={open} inert={!open} className="jm-collapse">
        <div className="overflow-hidden">
          <div className={`max-w-[62ch] space-y-3 pt-3 text-[14.5px] leading-relaxed ${C.muted}`}>
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className={`${READ} mt-1`}>
        <span className="underline decoration-current/30 underline-offset-4 group-hover/read:decoration-current">{open ? 'Tutup' : label}</span>
        <ChevronDown aria-hidden className={`jm-acc h-4 w-4 ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">: {title}</span>
      </button>
    </>
  );
}

function Meta({ item, compact = false }: { item: ListItem; compact?: boolean }) {
  const category = field(item, 'category');
  const date = field(item, 'date');
  if (!category && !date) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-medium ${C.muted}`}>
      {category &&
        (compact ? (
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-(--jm-ink)">{category}</span>
        ) : (
          <span className={CHIP}>{category}</span>
        ))}
      {date && (
        <span className="inline-flex items-center gap-1.5">
          {!compact && <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          <DateText raw={date} />
        </span>
      )}
    </p>
  );
}

function LeadStory({ item, readLabel }: { item: ListItem; readLabel: string }) {
  const title = field(item, 'title');
  const image = field(item, 'image');
  const post = !!field(item, POST_PATH_KEY);
  return (
    <article className={`group/news flex flex-col ${post ? 'relative' : ''}`}>
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt={field(item, 'image_alt') || JUMANTARA_PHOTOS.alt(image, title)}
          sizes="(min-width: 1024px) 56vw, 100vw"
          width={post ? 1200 : undefined}
          height={post ? 800 : undefined}
          className="mb-6 aspect-[3/2] rounded-[12px] @5xl:aspect-[16/9]"
          imgClassName="transition-[scale] duration-700 ease-out group-hover/news:scale-[1.04]"
        />
      )}
      <Meta item={item} />
      <h3 className={`mt-4 max-w-[30ch] text-balance ${DISPLAY} text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] @5xl:text-[26px] ${C.ink}`}>
        <ItemTitle item={item} />
      </h3>
      {field(item, 'excerpt') && <p className={`mt-3 max-w-[62ch] ${TYPE_J.body} ${C.muted}`}>{field(item, 'excerpt')}</p>}
      <ReadMore item={item} label={readLabel} />
    </article>
  );
}

function StoryRow({ item, readLabel }: { item: ListItem; readLabel: string }) {
  const title = field(item, 'title');
  const image = field(item, 'image');
  const post = !!field(item, POST_PATH_KEY);
  return (
    <article className={`group/news flex gap-4 @3xl:gap-5 ${post ? 'relative' : ''}`}>
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt={field(item, 'image_alt') || JUMANTARA_PHOTOS.alt(image, title)}
          sizes="(min-width: 1280px) 144px, (min-width: 768px) 112px, 88px"
          width={post ? 1200 : undefined}
          height={post ? 800 : undefined}
          className="aspect-[4/3] w-[88px] shrink-0 self-start rounded-[8px] @3xl:w-28 @6xl:w-36"
          imgClassName="transition-[scale] duration-700 ease-out group-hover/news:scale-[1.06]"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Meta item={item} compact />
        <h3 className={`mt-1.5 text-balance text-[16px] font-semibold leading-snug ${C.ink} @3xl:text-[17px]`}>
          <ItemTitle item={item} />
        </h3>
        {/* Layar lebar: ringkasan 2 baris, agar kolom daftar seimbang dengan berita utama */}
        {field(item, 'excerpt') && <p className={`mt-1.5 hidden text-[14px] leading-relaxed ${C.muted} @5xl:line-clamp-2`}>{field(item, 'excerpt')}</p>}
        <ReadMore item={item} label={readLabel} />
      </div>
    </article>
  );
}

export function News({ m }: { m: JumantaraModel }) {
  const { news } = m;
  const items = m.items('news');
  const pro = usePostsEnabled();
  const readLabel = text(news, 'read_label') || 'Baca selengkapnya';
  const buttonLabel = text(news, 'button_label');
  const buttonUrl = safeUrl(text(news, 'button_url'));
  const cmsButton =
    buttonLabel && buttonUrl ? (
      <ActionLink action={{ kind: 'external', href: buttonUrl }} className={`group ${BTN.outline} ${BTN.md}`}>
        <span className="truncate">{buttonLabel}</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </ActionLink>
    ) : null;

  if (pro) {
    return (
      <ProNewsSection
        section={news}
        theme={POST_THEME}
        className={SECTION_PAD}
        extra={cmsButton}
        // Tombol saring kategori di bawah deskripsi, selebar wadah (di kanan judul, deretnya terpotong di layar lebar)
        head={(filters) => (
          <SectionHead layout="stack" eyebrow={text(news, 'eyebrow')} title={text(news, 'title') || 'Berita terbaru'} subtitle={text(news, 'subtitle')} aside={filters} />
        )}
      />
    );
  }
  if (items.length === 0) return null;
  const [lead, ...rest] = items;

  return (
    <TemplateSection sectionKey="news" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('news')} />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(news, 'eyebrow')} title={text(news, 'title')} fallback="Berita terbaru" subtitle={text(news, 'subtitle')} aside={cmsButton} />
        <div className={`mt-10 grid gap-10 @3xl:mt-12 ${rest.length > 0 ? '@5xl:grid-cols-12 @5xl:gap-12' : ''}`}>
          <Reveal className={rest.length > 0 ? 'min-w-0 @5xl:col-span-7' : 'min-w-0 @5xl:max-w-[880px]'}>
            <LeadStory item={lead} readLabel={readLabel} />
          </Reveal>
          {rest.length > 0 && (
            <ul className={`min-w-0 divide-y border-t ${DIVIDE} ${LINE} @5xl:col-span-5 @5xl:border-t-0`}>
              {rest.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className="py-5 @5xl:first:pt-0">
                  <StoryRow item={item} readLabel={readLabel} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

function Announcements({ m }: { m: JumantaraModel }) {
  const { announcements } = m;
  const items = m.items('announcements');
  const pro = usePostsEnabled();
  const title = text(announcements, 'title');
  const head = (
    <>
      <SectionLabel label={text(announcements, 'eyebrow')} />
      <h2 className={`${text(announcements, 'eyebrow') ? 'mt-4' : ''} ${C.ink} ${TYPE_J.h2Small}`}>{title || 'Pengumuman'}</h2>
    </>
  );
  if (pro) return <ProAnnouncementsSection section={announcements} theme={POST_THEME_BAND} head={head} />;
  return (
    <TemplateSection sectionKey="announcements" className="min-w-0">
      {head}
      <ul className={`mt-7 divide-y border-t ${DIVIDE} ${LINE}`}>
        {items.map((item, i) => {
          const badge = field(item, 'badge');
          const post = !!field(item, POST_PATH_KEY);
          const href = post ? null : safeUrl(field(item, 'url'));
          const date = field(item, 'date');
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className={`py-5 ${post ? 'group relative' : ''}`}>
              {(date || badge || (href && isPdf(href))) && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {date && <DateText raw={date} className={`text-[13px] font-medium tabular-nums ${C.muted}`} />}
                  {badge && (
                    <span className={isUrgent(badge) ? URGENT : `inline-flex h-6 items-center rounded-[6px] border bg-white px-2 text-[12px] font-semibold text-(--jm-ink) ${LINE}`}>
                      {badge}
                    </span>
                  )}
                  {href && isPdf(href) && (
                    <span className={`inline-flex h-6 items-center gap-1 rounded-[6px] border bg-white px-2 text-[12px] font-semibold ${C.ink} ${LINE}`}>
                      <FileText aria-hidden className="h-3.5 w-3.5" />
                      PDF
                    </span>
                  )}
                </p>
              )}
              <h3 className={`mt-2 text-[16.5px] font-semibold leading-snug ${C.ink}`}>
                <ItemTitle item={item} />
              </h3>
              {field(item, 'text') && <p className={`mt-1.5 line-clamp-3 text-[14.5px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</p>}
              {href && (
                <ActionLink action={{ kind: 'external', href }} className="group/att mt-1 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold text-(--jm-ink)">
                  <Paperclip aria-hidden className="h-3.5 w-3.5" />
                  <span className="underline decoration-current/30 underline-offset-4 group-hover/att:decoration-current">Lihat lampiran</span>
                </ActionLink>
              )}
            </Reveal>
          );
        })}
      </ul>
    </TemplateSection>
  );
}

function Agenda({ m }: { m: JumantaraModel }) {
  const { agenda } = m;
  const items = m.items('agenda');
  const eyebrow = text(agenda, 'eyebrow');
  const title = text(agenda, 'title');
  return (
    <TemplateSection sectionKey="agenda" className="min-w-0">
      <SectionLabel label={eyebrow} />
      <h2 className={`${eyebrow ? 'mt-4' : ''} ${C.ink} ${TYPE_J.h2Small}`}>{title || 'Agenda'}</h2>
      <ul className={`mt-7 divide-y border-t ${DIVIDE} ${LINE}`}>
        {items.map((item, i) => {
          const raw = field(item, 'date');
          const date = parseSchoolDate(raw);
          const time = field(item, 'time');
          const place = field(item, 'place');
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="flex gap-4 py-4">
              <span aria-hidden className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[10px] bg-(--tpl-accent) text-(--tpl-on-accent)">
                {date ? (
                  <>
                    <span className={`${DISPLAY} text-[24px] font-bold leading-none tabular-nums`}>{date.day}</span>
                    <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em]">{date.month}</span>
                  </>
                ) : (
                  <span className="px-1 text-center text-[12px] font-semibold leading-tight">{shortFreeDate(raw) || '—'}</span>
                )}
              </span>
              <div className="min-w-0 self-center">
                <h3 className={`text-[16px] font-semibold leading-snug ${C.ink}`}>{field(item, 'title')}</h3>
                <p className={`mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] ${C.muted}`}>
                  {(date || raw) && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {date ? <time dateTime={date.iso}>{date.long}</time> : raw}
                    </span>
                  )}
                  {time && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {time}
                    </span>
                  )}
                  {place && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {place}
                    </span>
                  )}
                </p>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </TemplateSection>
  );
}

/** Pengumuman (7 kolom) & agenda (5 kolom, garis rambut di kiri) di satu pita tint; satu saja tampil → lebar sendiri. */
export function Notices({ m }: { m: JumantaraModel }) {
  const showAnnouncements = m.shown('announcements');
  const showAgenda = m.shown('agenda');
  if (!showAnnouncements && !showAgenda) return null;
  const both = showAnnouncements && showAgenda;
  return (
    // .jm-notices (jumantara.css): jarak gulir menu ke #pengumuman/#agenda memperhitungkan padding pita ini
    <div className={`jm-notices bg-(--jm-tint) ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid ${both ? '@5xl:grid-cols-12' : ''}`}>
        {showAnnouncements && (
          <div className={`min-w-0 ${both ? '@5xl:col-span-7 @5xl:pr-10' : 'max-w-[880px]'}`}>
            <Announcements m={m} />
          </div>
        )}
        {showAgenda && (
          <div className={`min-w-0 ${both ? `mt-14 border-t pt-12 ${LINE} @5xl:col-span-5 @5xl:mt-0 @5xl:border-l @5xl:border-t-0 @5xl:pl-10 @5xl:pt-0` : 'max-w-[720px]'}`}>
            <Agenda m={m} />
          </div>
        )}
      </div>
    </div>
  );
}
