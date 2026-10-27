// Section Pengumuman profesional ("papan pengumuman", fitur Berita & Pengumuman aktif,
// docs/platform/SITE-ADDONS-SPEC.md §6): judul section milik template (satu H2), lalu baris berisi blok tanggal
// (tanggal besar + bulan), label berwarna (Penting merah lembut, Wajib kuning tanah, lainnya warna tema), judul,
// ringkasan, dan "Lihat detail"; tombol "Lihat semua pengumuman" → /pengumuman.
// Data: tulisan terbit (baris menaut ke halaman pengumuman lewat judulnya) atau, bila belum ada, item CMS section itu
// tanpa tautan detail. Daftar mengikuti lebarnya sendiri (@container): penuh, atau kolom di samping Agenda.
import type { ReactNode } from 'react';
import type { SectionContent } from '../../../types';
import { Reveal } from '../../Animated';
import { stagger } from '../../motion';
import { TemplateSection } from '../../Shell';
import type { PostTheme } from '../theme';
import { badgeTone, hasPostLinks, proDate, proItems, type ProItem } from './model';
import { ProAllLink, ProMore, ProTitle } from './parts';

/** Jumlah pengumuman di beranda (sisanya di /pengumuman). */
const BOARD_MAX = 6;

function DateBlock({ raw, theme }: { raw: string; theme: PostTheme }) {
  const date = proDate(raw);
  if (!date) return null;
  return (
    <time
      dateTime={date.iso}
      className={`flex h-[72px] w-[64px] shrink-0 flex-col items-center justify-center rounded-[16px] ${theme.soft} ${theme.heading}`}
    >
      <span className={`${theme.display} text-[26px] leading-none tabular-nums`}>{date.day}</span>
      <span className={`mt-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${theme.muted}`}>
        {date.monthShort} <span className="sr-only">{date.year}</span>
      </span>
    </time>
  );
}

function Notice({ item, theme }: { item: ProItem; theme: PostTheme }) {
  const parsed = proDate(item.date) !== null;
  return (
    <article className={`flex min-w-0 gap-4 @xl:gap-5 ${item.path ? 'group relative' : ''}`}>
      <DateBlock raw={item.date} theme={theme} />
      <div className="flex min-w-0 flex-1 flex-col">
        {(item.tag || (!parsed && item.date)) && (
          <p className="mb-1.5 flex flex-wrap items-center gap-2">
            {item.tag && (
              <span
                data-pro-badge=""
                className={`inline-flex h-6 max-w-full items-center rounded-full px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] ${badgeTone(item.tag, theme)}`}
              >
                <span className="truncate">{item.tag}</span>
              </span>
            )}
            {!parsed && item.date && <span className={`text-[13px] font-medium ${theme.muted}`}>{item.date}</span>}
          </p>
        )}
        <h3 className={`text-[16.5px] font-semibold leading-snug ${theme.heading}`}>
          <ProTitle title={item.title} path={item.path} />
        </h3>
        {item.excerpt && <p className={`mt-1 line-clamp-3 text-[14.5px] leading-relaxed ${theme.muted}`}>{item.excerpt}</p>}
        {item.path && <ProMore label="Lihat detail" theme={theme} className="mt-1" />}
      </div>
    </article>
  );
}

export function ProAnnouncementsSection({
  section,
  theme,
  head,
  className = '',
}: {
  /** Section `announcements` (items sudah digabung useContentWithPosts) */
  section: SectionContent;
  theme: PostTheme;
  /** Judul section milik template (eyebrow + satu H2) */
  head: ReactNode;
  /** Kelas section (kolom grid, panel, jarak) */
  className?: string;
}) {
  const items = proItems(section, 'announcements');
  if (items.length === 0) return null;
  const shown = items.slice(0, BOARD_MAX);
  return (
    <TemplateSection sectionKey="announcements" data-pro-section="announcements" className={`min-w-0 ${className}`}>
      {head}
      <ul className={`mt-7 border-t @container ${theme.line}`}>
        {shown.map((item, i) => (
          <Reveal as="li" key={item.key} delay={stagger(i, 50)} className={`border-b py-5 ${theme.line}`}>
            <Notice item={item} theme={theme} />
          </Reveal>
        ))}
      </ul>
      {hasPostLinks(items) && (
        <div className="mt-6">
          <ProAllLink path="/pengumuman" label="Lihat semua pengumuman" theme={theme} />
        </div>
      )}
    </TemplateSection>
  );
}
