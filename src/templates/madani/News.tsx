// Berita (kunci `news`): kartu foto membulat dengan chip kategori di atas foto, tanggal (<time>), judul H3, ringkasan,
// dan tombol "Baca selengkapnya" yang membuka isi lengkap DI TEMPAT (aria-expanded, transisi tinggi bila gerak menyala)
// — situs satu halaman tidak punya halaman artikel. Tautan opsional (mis. unggahan Instagram) tampil sebagai tautan
// keluar. HP: 1 kolom; tablet: 2; layar lebar: 3.
import { ArrowUpRight, CalendarDays, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, resolveAction, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { parseSchoolDate, type MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { C, SECTION_PAD, TYPE_M } from './styles';
import { Chip, SectionHead } from './ui';

/** Tanggal: <time> bila formatnya dikenali, selain itu teks apa adanya. */
export function DateText({ raw, className = '' }: { raw: string; className?: string }) {
  const date = parseSchoolDate(raw);
  if (!raw) return null;
  return date ? (
    <time dateTime={date.iso} className={className}>
      {date.long}
    </time>
  ) : (
    <span className={className}>{raw}</span>
  );
}

function NewsCard({ item, index }: { item: ListItem; index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const title = field(item, 'title');
  const body = paragraphs(field(item, 'body'));
  const image = field(item, 'image');
  const photo = hasImage(image);
  const link = resolveAction(field(item, 'url'), null);
  const rawDate = field(item, 'date');
  // Kategori ikut baris tanggal bila tidak ada foto (dengan foto: chip di atas foto)
  const rowChip = !photo ? field(item, 'category') : '';
  return (
    <Reveal as="li" delay={stagger(index, 70)} className="flex min-w-0 flex-col">
      <article className="flex flex-1 flex-col">
        {photo && (
          <KitPhoto
            src={image}
            alt={MADANI_PHOTOS.alt(image, title)}
            sizes="(min-width: 1024px) 30vw, (min-width: 672px) 45vw, 100vw"
            zoom
            className="aspect-[4/3] rounded-[22px]"
          >
            {field(item, 'category') && (
              <span className="absolute left-4 top-4 max-w-[calc(100%-32px)]">
                <Chip tone="glass">{field(item, 'category')}</Chip>
              </span>
            )}
          </KitPhoto>
        )}
        {/* Baris tanggal hanya bila ada tanggal atau chip kategori (tanpa ikon kalender yatim bila tanggal kosong) */}
        {(rawDate || rowChip) && (
          <p className={`${photo ? 'mt-5' : ''} flex items-center gap-2 text-[13px] font-medium ${C.muted}`}>
            {rawDate && (
              <>
                <CalendarDays className="h-4 w-4 shrink-0 text-(--md-ink)" aria-hidden />
                <DateText raw={rawDate} />
              </>
            )}
            {rowChip && <Chip tone="tint" className={rawDate ? 'ml-1' : ''}>{rowChip}</Chip>}
          </p>
        )}
        <h3 className={`${rawDate || rowChip ? 'mt-2' : photo ? 'mt-5' : ''} text-balance text-(--md-deep) ${TYPE_M.h3}`}>{title}</h3>
        {field(item, 'excerpt') && <p className={`mt-2 text-[14.5px] leading-relaxed ${C.muted}`}>{field(item, 'excerpt')}</p>}
        {body.length > 0 && (
          <div id={panelId} data-open={open} inert={!open} className="md-collapse">
            <div className="overflow-hidden">
              <div className={`space-y-3 pt-3 text-[14.5px] leading-relaxed ${C.body}`}>
                {body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        )}
        {(body.length > 0 || link) && (
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-4">
            {body.length > 0 && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
                className="group inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-(--md-ink)"
              >
                {open ? 'Tutup' : 'Baca selengkapnya'}
                <span className="sr-only">: {title}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
              </button>
            )}
            {link && (
              <ActionLink action={link} className="inline-flex min-h-10 items-center gap-1 text-[14.5px] font-semibold text-(--md-ink) underline-offset-4 hover:underline">
                Buka tautan
                <span className="sr-only">: {title}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </ActionLink>
            )}
          </div>
        )}
      </article>
    </Reveal>
  );
}

export function News({ m }: { m: MadaniModel }) {
  const { news } = m;
  const items = list(news, 'items', 6).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="news" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(news, 'eyebrow')} title={text(news, 'title')} />
        <ul className="mt-10 grid gap-x-5 gap-y-12 @3xl:mt-12 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {items.map((item, i) => (
            <NewsCard key={`${field(item, 'title')}-${i}`} item={item} index={i} />
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
