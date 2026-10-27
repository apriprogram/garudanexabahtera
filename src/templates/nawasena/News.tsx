// Berita (kunci `news`, anchor #berita), pita putih. Bentuk data SAMA dengan Bestari/Cakrawala/Madani (title, date,
// category, excerpt, body, image, url), jadi fitur Berita & Pengumuman (site_posts) terpasang dengan cara yang sama.
// Tata letak majalah: kiri 7 kolom berita utama (foto 3:2, kategori + tanggal mono, judul serif, ringkasan, "Baca
// selengkapnya"); kanan 5 kolom tiga berita bergaris tipis (foto kecil 4:3, kategori · tanggal, judul, ringkasan dua
// baris); di bawah keduanya daftar ringkas "Berita lainnya" (berita ke-5 dst., tanpa foto) selebar penuh dalam dua kolom.
// "Baca selengkapnya" membuka isi berita di tempat (aria-expanded), atau tautan berita bila diisi. HP: berita utama, tiga
// berita, lalu daftar ringkas.
// Fitur Berita & Pengumuman aktif (usePostsEnabled) → section profesional bersama (shared/posts/pro: ProNewsSection)
// dengan label & judul Nawasena; tulisan menaut ke /berita/{slug} lewat judulnya.
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { usePostsEnabled, useSitePosts } from '../shared/posts/hooks';
import { POST_PATH_KEY } from '../shared/posts/model';
import { ProNewsSection } from '../shared/posts/pro';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SiteLink } from '../shared/SiteLink';
import { field, hasImage, safeUrl, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { paragraphsOf, parseSchoolDate, type NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, CARD, DISPLAY, POST_THEME, SECTION_PAD, TYPE_N } from './styles';
import { ButtonLink, SectionHead, TextLink } from './ui';

const TAG = 'inline-flex h-6 max-w-full items-center rounded-[4px] bg-(--nw-tint) px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-(--nw-ink)';
const MORE = 'nw-link group inline-flex min-h-11 items-center gap-1.5 self-start text-[14.5px] font-semibold text-(--nw-ink)';

function DateText({ raw, className = '' }: { raw: string; className?: string }) {
  if (!raw) return null;
  const date = parseSchoolDate(raw);
  return date ? (
    <time dateTime={date.iso} className={className}>
      {date.label}
    </time>
  ) : (
    <span className={className}>{raw}</span>
  );
}

/** Kategori + tanggal (mono). */
function Meta({ item, tag = true }: { item: ListItem; tag?: boolean }) {
  const category = field(item, 'category');
  const date = field(item, 'date');
  if (!category && !date) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${C.muted}`}>
      {category && (tag ? <span className={TAG}>{category}</span> : <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-(--nw-ink)">{category}</span>)}
      {category && !tag && date && <span aria-hidden>·</span>}
      <DateText raw={date} className={TYPE_N.mono} />
    </p>
  );
}

/** Judul: tautan ke halaman tulisan bila item berasal dari tulisan, selain itu teks biasa. */
function ItemTitle({ item }: { item: ListItem }) {
  const title = field(item, 'title');
  const path = field(item, POST_PATH_KEY);
  if (!path) return <>{title}</>;
  return (
    <SiteLink path={path} className="underline-offset-4 hover:underline">
      {title}
    </SiteLink>
  );
}

/** "Baca selengkapnya": tautan berita bila diisi, kalau tidak membuka isi lengkap di tempat (aria-expanded). */
function ReadMore({ item }: { item: ListItem }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const title = field(item, 'title');
  const path = field(item, POST_PATH_KEY);
  if (path) return <TextLink action={{ kind: 'site', path }} label="Baca selengkapnya" ariaLabel={`Baca selengkapnya: ${title}`} className="mt-2" />;
  const href = safeUrl(field(item, 'url'));
  if (href) {
    return (
      <ActionLink action={{ kind: 'external', href }} aria-label={`Baca selengkapnya: ${title}`} className={`${MORE} mt-2`}>
        <span className="nw-underline">Baca selengkapnya</span>
        <ArrowUpRight aria-hidden className="h-4 w-4" />
      </ActionLink>
    );
  }
  const body = paragraphsOf(field(item, 'body'));
  if (body.length === 0) return null;
  return (
    <>
      <div id={id} data-open={open} inert={!open} className="nw-collapse">
        <div className="overflow-hidden">
          <div className={`max-w-[62ch] space-y-3 pt-3 text-[15px] leading-relaxed ${C.body}`}>
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className={`${MORE} mt-2`}>
        <span className="nw-underline">{open ? 'Tutup berita' : 'Baca selengkapnya'}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        <span className="sr-only">: {title}</span>
      </button>
    </>
  );
}

function LeadStory({ item }: { item: ListItem }) {
  const image = field(item, 'image');
  const photo = hasImage(image);
  const excerpt = field(item, 'excerpt');
  return (
    <article className={`group flex flex-col ${photo ? '' : `p-6 @3xl:p-8 ${CARD.surface}`}`}>
      {photo && (
        <KitPhoto
          src={image}
          alt={field(item, 'image_alt') || NAWASENA_PHOTOS.alt(image, field(item, 'title'))}
          sizes="(min-width: 1024px) 54vw, 92vw"
          width={1200}
          height={800}
          zoom
          className="aspect-[3/2] rounded-[8px]"
          imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
        />
      )}
      <div className={photo ? 'mt-6' : ''}>
        <Meta item={item} />
      </div>
      <h3 className={`mt-4 max-w-[30ch] text-balance text-[26px] leading-[1.15] ${C.navy} ${DISPLAY} font-normal @3xl:text-[32px]`}>
        <ItemTitle item={item} />
      </h3>
      {excerpt && <p className={`mt-3 max-w-[62ch] text-[16px] leading-relaxed @3xl:text-[16.5px] ${C.body}`}>{excerpt}</p>}
      <ReadMore item={item} />
    </article>
  );
}

function RowStory({ item }: { item: ListItem }) {
  const image = field(item, 'image');
  const photo = hasImage(image);
  const excerpt = field(item, 'excerpt');
  return (
    <article className="group flex gap-4 @xl:gap-5">
      {photo && (
        <KitPhoto
          src={image}
          alt={field(item, 'image_alt') || NAWASENA_PHOTOS.alt(image, field(item, 'title'))}
          sizes="(min-width: 576px) 132px, 96px"
          width={480}
          height={360}
          className="aspect-[4/3] w-24 shrink-0 self-start rounded-[6px] @xl:w-[132px]"
          imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Meta item={item} tag={false} />
        <h3 className={`mt-2 ${C.navy} ${TYPE_N.h3Sans}`}>
          <ItemTitle item={item} />
        </h3>
        {excerpt && <p className={`mt-1.5 line-clamp-2 text-[14.5px] leading-relaxed ${C.muted}`}>{excerpt}</p>}
        <ReadMore item={item} />
      </div>
    </article>
  );
}

function CompactStory({ item }: { item: ListItem }) {
  return (
    <article className="flex flex-col gap-1 @xl:flex-row @xl:gap-6">
      <DateText raw={field(item, 'date')} className={`shrink-0 pt-1 @xl:w-28 ${TYPE_N.mono} ${C.muted}`} />
      <div className="min-w-0 flex-1">
        <h3 className={`text-[16px] font-semibold leading-snug ${C.navy}`}>
          <ItemTitle item={item} />
        </h3>
        {field(item, 'excerpt') && <p className={`mt-1 text-[14.5px] leading-relaxed ${C.muted}`}>{field(item, 'excerpt')}</p>}
        <ReadMore item={item} />
      </div>
    </article>
  );
}

export function News({ m }: { m: NawasenaModel }) {
  const { news } = m;
  const items = m.items('news');
  const pro = usePostsEnabled();
  const posts = useSitePosts('berita');
  const buttonLabel = text(news, 'button_label');
  const buttonUrl = safeUrl(text(news, 'button_url'));
  const cmsButton = buttonLabel && buttonUrl ? <ButtonLink action={{ kind: 'external', href: buttonUrl }} label={buttonLabel} variant="outline" /> : null;
  const headProps = { eyebrow: text(news, 'eyebrow'), number: m.number('news'), title: text(news, 'title') || 'Berita terbaru', subtitle: text(news, 'subtitle') };
  // Versi profesional: rel filter kategori di baris sendiri selebar penuh di bawah judul (semua kategori muat di layar
  // lebar, menggulir di HP), bukan berdesakan di kolom kanan judul
  const proHead = (filters: ReactNode) => (
    <>
      <SectionHead {...headProps} />
      {filters && <div className="mt-8 min-w-0 @3xl:mt-10">{filters}</div>}
    </>
  );
  if (pro) return <ProNewsSection section={news} theme={POST_THEME} className={`bg-white ${SECTION_PAD}`} extra={cmsButton} head={proHead} />;
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  const rows = rest.slice(0, 3);
  const compact = rest.slice(3);
  const allLink = posts ? <TextLink action={{ kind: 'site', path: '/berita' }} label="Lihat semua berita" /> : null;
  const moreTitle = text(news, 'more_title') || 'Berita lainnya';

  return (
    <TemplateSection sectionKey="news" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead {...headProps} aside={allLink} />
        {/* HP: berita utama → tiga berita → daftar ringkas; layar lebar: utama di kiri, tiga berita di kanan, lalu daftar
            ringkas selebar penuh dalam dua kolom (kedua kolom atas sama tinggi, tanpa ruang kosong di bawah kolom kanan) */}
        <div className={`mt-10 grid gap-x-8 gap-y-10 @3xl:mt-14 ${rows.length ? '@5xl:grid-cols-12 @5xl:items-start @7xl:gap-x-12' : ''}`}>
          <Reveal className={`min-w-0 ${rows.length ? '@5xl:col-span-7' : ''}`}>
            <LeadStory item={lead} />
          </Reveal>
          {rows.length > 0 && (
            <ul className="min-w-0 divide-y divide-black/[0.08] border-y border-black/[0.08] @5xl:col-span-5 @5xl:border-t-0">
              {rows.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 80)} className="py-6 @5xl:first:pt-0">
                  <RowStory item={item} />
                </Reveal>
              ))}
            </ul>
          )}
          {compact.length > 0 && (
            <Reveal delay={120} className="min-w-0 @5xl:col-span-12">
              <p className={`${TYPE_N.mono} ${C.muted}`}>{moreTitle}</p>
              <ul className="mt-3 grid border-t border-black/[0.08] @4xl:grid-cols-2 @4xl:gap-x-8 @7xl:gap-x-12">
                {compact.map((item, i) => (
                  <li key={`${field(item, 'title')}-${i}`} className="border-b border-black/[0.08] py-5">
                    <CompactStory item={item} />
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
        {cmsButton && <div className="mt-10 flex justify-center @3xl:mt-12">{cmsButton}</div>}
      </div>
    </TemplateSection>
  );
}
