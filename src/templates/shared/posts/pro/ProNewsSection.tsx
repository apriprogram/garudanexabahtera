// Section Berita profesional ("newsroom", fitur Berita & Pengumuman aktif, docs/platform/SITE-ADDONS-SPEC.md §6):
// judul section milik template (satu H2) + tombol filter kategori, berita utama besar (foto 16:10, chip kategori,
// tanggal, judul, ringkasan, "Baca selengkapnya"), lalu maks. 4 berita berikutnya (thumbnail + kategori + tanggal +
// judul) di samping (layar lebar) atau di bawahnya (HP), dan tombol "Lihat semua berita" → /berita.
// Data: tulisan terbit (kartu menaut ke halaman tulisan lewat judulnya) atau, bila belum ada, item CMS section itu
// dalam tata letak yang sama tanpa tautan detail. Datar, warna & huruf dari PostTheme template.
import { CalendarDays } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { KitPhoto } from '../../../kit/Photo';
import { usePhotoSet } from '../../../kit/context';
import type { SectionContent } from '../../../types';
import { Reveal } from '../../Animated';
import { CONTAINER } from '../../layout';
import { stagger } from '../../motion';
import { TemplateSection } from '../../Shell';
import { hasImage, text } from '../../utils';
import type { PostTheme } from '../theme';
import { hasPostLinks, matchesTag, proItems, tagKey, uniqueTags, type ProItem } from './model';
import { ProAllLink, ProDateText, ProMore, ProTitle, TagFilter } from './parts';

/** Jumlah berita berikutnya di samping berita utama. */
const MORE_MAX = 4;

function Meta({ item, theme, className = '' }: { item: ProItem; theme: PostTheme; className?: string }) {
  if (!item.tag && !item.date) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-medium ${theme.muted} ${className}`}>
      {item.tag && (
        <span className={`inline-flex h-7 max-w-full items-center rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.06em] ${theme.chip}`}>
          <span className="truncate">{item.tag}</span>
        </span>
      )}
      {item.date && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <ProDateText raw={item.date} />
        </span>
      )}
    </p>
  );
}

/** Berita utama; `solo` = tanpa berita berikutnya (foto kiri + teks kanan juga di layar lebar). */
function LeadStory({ item, theme, solo }: { item: ProItem; theme: PostTheme; solo: boolean }) {
  const photos = usePhotoSet();
  const photo = hasImage(item.image);
  return (
    // Tablet: foto kiri + teks kanan (foto 16:10 selebar layar terlalu tinggi); HP & layar lebar: bertumpuk
    <article
      data-pro-lead=""
      className={`grid min-w-0 ${item.path ? 'group relative' : ''} ${
        photo
          ? `gap-5 @3xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] @3xl:items-center @3xl:gap-8 ${solo ? '@5xl:gap-12' : '@5xl:grid-cols-1 @5xl:items-start @5xl:gap-5'}`
          : `p-6 @3xl:p-8 ${theme.radius} ${theme.soft}`
      }`}
    >
      {photo && (
        <KitPhoto
          src={item.image}
          alt={item.imageAlt || photos.alt(item.image, item.title)}
          width={1600}
          height={1000}
          sizes="(min-width: 1024px) 56vw, (min-width: 768px) 55vw, 92vw"
          className={`aspect-[16/10] ${theme.photoRadius}`}
          imgClassName="transition-[scale] duration-500 group-hover:scale-[1.02]"
        />
      )}
      <div className="flex min-w-0 flex-col">
        <Meta item={item} theme={theme} />
        <h3 className={`mt-3 text-balance text-[22px] leading-[1.2] tracking-[-0.02em] @3xl:text-[26px] @5xl:text-[28px] @7xl:text-[32px] ${theme.display} ${theme.heading}`}>
          <ProTitle title={item.title} path={item.path} />
        </h3>
        {item.excerpt && <p className={`mt-3 line-clamp-4 max-w-[62ch] text-pretty text-[15.5px] leading-relaxed @5xl:text-[16.5px] ${theme.muted}`}>{item.excerpt}</p>}
        {item.path && <ProMore label="Baca selengkapnya" theme={theme} className="mt-3" />}
      </div>
    </article>
  );
}

function MoreStory({ item, theme }: { item: ProItem; theme: PostTheme }) {
  const photos = usePhotoSet();
  const photo = hasImage(item.image);
  return (
    <article className={`flex min-w-0 gap-4 ${item.path ? 'group relative' : ''}`}>
      {photo && (
        <KitPhoto
          src={item.image}
          alt={item.imageAlt || photos.alt(item.image, item.title)}
          width={480}
          height={360}
          sizes="(min-width: 1024px) 160px, 30vw"
          className="aspect-[4/3] w-[30%] min-w-24 max-w-40 shrink-0 self-start rounded-[14px]"
          imgClassName="transition-[scale] duration-500 group-hover:scale-[1.04]"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {(item.tag || item.date) && (
          <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] font-medium ${theme.muted}`}>
            {item.tag && <span className={`font-semibold uppercase tracking-[0.06em] ${theme.accent}`}>{item.tag}</span>}
            {item.tag && item.date && <span aria-hidden>·</span>}
            <ProDateText raw={item.date} />
          </p>
        )}
        <h3 className={`mt-1.5 line-clamp-3 text-[16px] font-semibold leading-snug ${theme.heading}`}>
          <ProTitle title={item.title} path={item.path} />
        </h3>
      </div>
    </article>
  );
}

export function ProNewsSection({
  section,
  theme,
  head,
  className = '',
  extra,
}: {
  /** Section `news` (items sudah digabung useContentWithPosts) */
  section: SectionContent;
  theme: PostTheme;
  /** Judul section milik template (eyebrow + satu H2); `filters` = tombol filter kategori untuk diletakkan di sampingnya */
  head: (filters: ReactNode) => ReactNode;
  /** Kelas section (jarak atas/bawah template) */
  className?: string;
  /** Tombol dari CMS (mis. "Berita lainnya di Instagram") di samping "Lihat semua berita" */
  extra?: ReactNode;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const items = proItems(section, 'news');
  if (items.length === 0) return null;
  const categories = uniqueTags(items.map((item) => item.tag));
  // Kategori yang sudah tidak ada (daftar berganti) = semua
  const active = category !== null && categories.some((c) => tagKey(c) === tagKey(category)) ? category : null;
  const shown = items.filter((item) => matchesTag(item.tag, active));
  const [lead, ...rest] = shown;
  const more = rest.slice(0, MORE_MAX);
  const linked = hasPostLinks(items);

  const filters = (
    <TagFilter
      tags={categories}
      value={active}
      onChange={setCategory}
      label="Saring berita menurut kategori"
      allLabel={text(section, 'all_label') || 'Semua'}
      theme={theme}
    />
  );

  return (
    <TemplateSection sectionKey="news" data-pro-section="news" className={className}>
      <div className={CONTAINER}>
        {head(categories.length > 1 ? filters : null)}
        <p className="sr-only" role="status">
          {active ? `${shown.length} berita kategori ${active}` : ''}
        </p>
        <div className={`mt-10 grid gap-8 @3xl:mt-12 ${more.length ? '@5xl:grid-cols-12 @5xl:gap-12' : ''}`}>
          <Reveal key={`utama-${lead.key}`} className={more.length ? '@5xl:col-span-7' : ''}>
            <LeadStory item={lead} theme={theme} solo={more.length === 0} />
          </Reveal>
          {more.length > 0 && (
            // Garis pemisah di atas tiap berita; tablet 2 kolom; layar lebar 1 kolom di samping berita utama
            <ul className="grid content-start gap-x-8 gap-y-5 @3xl:grid-cols-2 @5xl:col-span-5 @5xl:grid-cols-1">
              {more.map((item, i) => (
                <Reveal as="li" key={item.key} delay={stagger(i, 70)} className={`border-t pt-5 @5xl:first:border-t-0 @5xl:first:pt-0 ${theme.line}`}>
                  <MoreStory item={item} theme={theme} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
        {(linked || extra) && (
          <div className="mt-10 flex flex-col items-center justify-center gap-3 @xl:flex-row @3xl:mt-12">
            {linked && <ProAllLink path="/berita" label="Lihat semua berita" theme={theme} />}
            {extra}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
