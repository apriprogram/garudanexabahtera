import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { displayPhone } from '../../../hooks/useSiteSettings';
import { FIRST_ORDER_DISCOUNT_PERCENT, firstOrderPrice } from '../../../lib/firstOrderDiscount';
import { formatRupiah, type Template } from '../../../types/platform';
import type { ProjectCardData } from '../../sections/projects/projectItems';
import { SmartLink } from '../SmartLink';
import {
  LINKS,
  MAX_CARDS,
  PAGE_LABEL,
  PAGE_LABEL_EN,
  TEMPLATE_PATH,
  humanize,
  isEnglishReply,
  parseReply,
  type NexaCards,
  type NexaCatalog,
} from './replyModel';

// Komponen jawaban Nexa: teks rapi (paragraf, daftar, tebal, tautan berlabel) + kartu template/proyek bergambar.
// Aturan & pengurai ada di replyModel.ts.

const linkClass =
  'font-semibold text-primary underline decoration-primary/30 decoration-[1.5px] underline-offset-[3px] transition-colors hover:decoration-primary';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Kata label yang sudah ditulis tepat sebelum tautan tidak diulang: "di halaman /harga" → "di " + [halaman Harga]. */
function absorbLead(before: string, label: string): string {
  const words = label.split(' ');
  for (let count = words.length; count > 0; count -= 1) {
    const lead = new RegExp(`(^|\\s)${escapeRegExp(words.slice(0, count).join(' '))}\\s*$`, 'i').exec(before);
    if (lead) return before.slice(0, lead.index + lead[1].length);
  }
  return before;
}

/** Kalimat yang sedang ditulis sampai tautan (teks setelah . ! ? terakhir). */
const sentenceOf = (before: string) => before.slice(Math.max(before.lastIndexOf('. '), before.lastIndexOf('! '), before.lastIndexOf('? ')) + 1);

/** Path template dalam kurung tepat setelah teks tebal: "**Aura Studio** (/template/aura-studio)". */
const TEMPLATE_AFTER_BOLD = /^[ \t]*\([ \t]*(\/template\/[a-z0-9-]+)[ \t]*\)/;

/**
 * Satu baris teks: **tebal** + tautan berlabel ramah, tanpa mengulang kata yang sudah ditulis model di sekitarnya.
 * english: jawaban berbahasa Inggris (isEnglishReply), label halaman ikut Inggris.
 */
function Inline({
  text,
  templates,
  english,
  onNavigate,
}: {
  text: string;
  templates: Map<string, Template>;
  english: boolean;
  onNavigate: () => void;
}) {
  const templateName = (slug: string) => templates.get(slug)?.name ?? humanize(slug);
  const newTab = english ? 'new tab' : 'tab baru';

  // prior: teks polos baris ini sebelum segmen (termasuk kata yang ditebalkan), untuk memeriksa kalimat yang sedang ditulis
  const linkify = (segment: string, keyBase: string, prior: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const match of segment.matchAll(LINKS)) {
      const start = (match.index ?? 0) + match[1].length;
      let end = (match.index ?? 0) + match[0].length;
      let before = segment.slice(cursor, start);
      const sentence = sentenceOf(prior + segment.slice(0, start));
      const key = `${keyBase}-${start}`;
      let link: React.ReactNode;
      if (match[3]) {
        const number = match[3];
        const absorbed = absorbLead(before, 'WhatsApp');
        // "Chat WhatsApp kami di wa.me/…": kata WhatsApp sudah tertulis, jadi tautannya menampilkan nomor
        const label = absorbed === before && /whatsapp/i.test(sentence) ? displayPhone(number) : 'WhatsApp';
        before = absorbed;
        link = (
          <a
            key={key}
            href={`https://wa.me/${number}`}
            target="_blank"
            rel="noopener noreferrer"
            // Nama aksesibel memuat teks yang terlihat (WCAG 2.5.3): "WhatsApp (…)" atau "0851-… (WhatsApp, …)"
            aria-label={label === 'WhatsApp' ? `WhatsApp (wa.me/${number}, ${newTab})` : `${label} (WhatsApp, ${newTab})`}
            className={linkClass}
          >
            {label}
          </a>
        );
      } else {
        const path = match[2];
        const slug = TEMPLATE_PATH.exec(path)?.[1];
        let label = slug ? templateName(slug) : ((english ? PAGE_LABEL_EN : PAGE_LABEL)[path] ?? humanize(path.split('/').pop() ?? path));
        // "Aura Studio (/template/aura-studio)" / "halaman Harga (/harga)" → satu tautan bernama itu, tanpa kurung
        const opened = /\(\s*$/.exec(before);
        const closed = /^\s*\)/.exec(segment.slice(end));
        const named = opened && closed ? new RegExp(`${escapeRegExp(label)}\\s*$`, 'i').exec(before.slice(0, opened.index)) : null;
        if (opened && closed && named) {
          label = named[0].trim();
          before = before.slice(0, named.index);
          end += closed[0].length;
        } else if (!slug) {
          const absorbed = absorbLead(before, label);
          // "lihat katalog template di /template" → "… di sini"
          if (absorbed === before && sentence.toLowerCase().includes(label.toLowerCase())) {
            label = english ? 'this link' : /\bdi\s*$/i.test(before) ? 'sini' : 'tautan ini';
          }
          before = absorbed;
        }
        link = (
          <Link key={key} to={path} onClick={onNavigate} className={linkClass}>
            {label}
          </Link>
        );
      }
      if (before) parts.push(before);
      parts.push(link);
      cursor = end;
    }
    parts.push(segment.slice(cursor));
    return parts;
  };

  const plain = (upTo: number) => text.slice(0, upTo).replace(/\*\*/g, '');
  const nodes: React.ReactNode[] = [];
  const bold = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  for (const match of text.matchAll(bold)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(...linkify(text.slice(cursor, start), `t${cursor}`, plain(cursor)));
    let next = start + match[0].length;
    // "**Aura Studio** (/template/aura-studio)" → nama tebal itu sendiri jadi tautan, tanpa "(Aura Studio)"
    const after = TEMPLATE_AFTER_BOLD.exec(text.slice(next));
    const slug = after ? TEMPLATE_PATH.exec(after[1])?.[1] : undefined;
    const ownLink = after && slug && match[1].trim().toLowerCase() === templateName(slug).toLowerCase() ? after : null;
    nodes.push(
      <strong key={`b${start}`} className="font-semibold text-fg">
        {ownLink ? (
          <Link to={ownLink[1]} onClick={onNavigate} className={linkClass}>
            {match[1]}
          </Link>
        ) : (
          linkify(match[1], `b${start}`, plain(start))
        )}
      </strong>,
    );
    if (ownLink) next += ownLink[0].length;
    cursor = next;
  }
  nodes.push(...linkify(text.slice(cursor).replace(/\*\*/g, ''), `t${cursor}`, plain(cursor)));
  return <>{nodes}</>;
}

// Baris kartu selebar gelembung (margin negatif = padding gelembung: 16 px di HP, 20 px desktop), bisa digeser. pt-1/pb-1:
// cincin fokus keyboard (outline 2px + offset 2px) tidak terpotong oleh area gulir
const cardRowClass = '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:thin] sm:-mx-5 sm:gap-2.5 sm:px-5';
/** Judul kecil di atas baris kartu (ul sudah berlabel untuk pembaca layar, jadi judul ini aria-hidden). */
const cardLabelClass = 'mb-0.5 mt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted';

const cardClass =
  'group/card block w-[148px] shrink-0 sm:w-[168px] xl:w-[180px] overflow-hidden rounded-2xl bg-surface text-left ring-1 ring-inset ring-line transition-shadow hover:ring-brand-200';

/** Gambar kartu; gagal dimuat (berkas terhapus) → hanya gradasi latar, bukan ikon gambar rusak (= TemplateShot, Projects). */
function CardImage({ src, height }: { src: string | null | undefined; height: number }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src) return null;
  return (
    <img
      src={src}
      alt=""
      width={336}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(src)}
      className="h-full w-full object-cover object-top transition-transform duration-300 motion-safe:group-hover/card:scale-[1.04]"
    />
  );
}

function TemplateCard({ template, onNavigate }: { template: Template; onNavigate: () => void }) {
  const price = Number(template.price) || 0;
  return (
    <li>
      <Link to={`/template/${template.slug}`} onClick={onNavigate} className={cardClass}>
        <span className="relative block aspect-[16/10] overflow-hidden bg-linear-to-br from-brand-50 to-brand-100">
          <CardImage src={template.preview_image} height={210} />
          {price > 0 && (
            // Diskon pembelian pertama (= kartu katalog); harga di bawah sudah berlabel untuk pembaca layar
            <span
              aria-hidden
              className="absolute left-2 top-2 rounded-full bg-success-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-success-700"
            >
              −{FIRST_ORDER_DISCOUNT_PERCENT}%
            </span>
          )}
        </span>
        <span className="block px-3 pb-2.5 pt-2">
          <span className="block truncate text-[13px] font-semibold text-fg">{template.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">{template.category}</span>
          {price > 0 ? (
            // Harga tidak terpotong di tengah ("Rp" / "1.200.000"); harga coret turun ke baris berikut bila kartu sempit
            <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
              <span className="whitespace-nowrap text-[12px] font-semibold text-fg">
                <span className="sr-only">Harga pembelian pertama </span>
                {formatRupiah(firstOrderPrice(price))}
              </span>
              <span className="whitespace-nowrap text-[10px] text-subtle line-through">
                <span className="sr-only">Harga normal </span>
                {formatRupiah(price)}
              </span>
            </span>
          ) : (
            <span className="mt-1 block text-[12px] font-semibold text-fg">Gratis</span>
          )}
        </span>
      </Link>
    </li>
  );
}

function ProjectCard({ project, onNavigate }: { project: ProjectCardData; onNavigate: () => void }) {
  return (
    <li>
      {/* SmartLink: di beranda menggulir ke #projects (Link biasa hanya mengganti hash tanpa menggulir) */}
      <SmartLink href="/#projects" onClick={onNavigate} className={cardClass}>
        <span className="block aspect-[4/3] overflow-hidden bg-linear-to-br from-brand-50 to-brand-100">
          <CardImage src={project.image} height={252} />
        </span>
        <span className="block px-3 pb-2.5 pt-2">
          <span className="block truncate text-[13px] font-semibold text-fg">{project.title}</span>
          {project.label && <span className="mt-0.5 block truncate text-[11px] text-muted">{project.label}</span>}
        </span>
      </SmartLink>
    </li>
  );
}

/** Isi jawaban Nexa: blok teks rapi + kartu template & proyek bergambar. */
export function NexaReply({
  text,
  cards,
  catalog,
  onNavigate,
}: {
  text: string;
  /** Kartu tambahan tanpa disebut di teks: semua template / proyek teratas (topik cepat, pertanyaan proyek) */
  cards?: NexaCards;
  catalog: NexaCatalog;
  onNavigate: () => void;
}) {
  const { blocks, templateSlugs, projectKeys } = parseReply(text);
  const english = isEnglishReply(text);

  const templates = (
    templateSlugs.length > 0 ? templateSlugs.map((slug) => catalog.templates.get(slug)).filter((t): t is Template => Boolean(t)) : []
  ).concat(cards === 'templates' && templateSlugs.length === 0 ? catalog.templateList : []);
  const byKey = new Map(catalog.projects.map((p) => [p.statsKey, p]));
  // Galeri cadangan (pertanyaan proyek tanpa kode di jawaban) hanya bila jawaban tidak sedang membahas template
  const projects =
    projectKeys.length > 0
      ? projectKeys.map((key) => byKey.get(key)).filter((p): p is ProjectCardData => Boolean(p))
      : cards === 'projects' && templateSlugs.length === 0
        ? catalog.projects
        : [];

  return (
    <>
      <div className="space-y-2 sm:space-y-2.5">
        {blocks.map((block, index) => {
          if (block.kind === 'p') {
            return (
              <p key={index}>
                <Inline text={block.text} templates={catalog.templates} english={english} onNavigate={onNavigate} />
              </p>
            );
          }
          // Sub-daftar (butir menjorok tepat setelah daftar): sejajar teks butir induk (titik 16 px, nomor 28 px)
          const parent = index > 0 ? blocks[index - 1] : undefined;
          const nested = block.indent && parent && parent.kind !== 'p' ? (parent.kind === 'ol' ? 'ml-7' : 'ml-4') : '';
          return block.kind === 'ul' ? (
            // Titik biru kecil sejajar baris pertama (½ tinggi baris − ½ titik); role="list" karena list-style: none
            <ul key={index} role="list" data-block="ul" className={`space-y-1.5 ${nested}`}>
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="relative pl-4 before:absolute before:left-0.5 before:top-[calc(0.8125em-3px)] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/60"
                >
                  <Inline text={item} templates={catalog.templates} english={english} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          ) : (
            // Langkah bernomor: lingkaran biru muda berisi nomor; mulai dari nomor model ("2." setelah sub-butir tetap 2)
            <ol key={index} role="list" start={block.start} data-block="ol" className={`space-y-2 ${nested}`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="relative pl-7">
                  <span className="absolute left-0 top-[calc(0.8125em-10px)] flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold tabular-nums text-primary">
                    {block.start + itemIndex}
                  </span>
                  <Inline text={item} templates={catalog.templates} english={english} onNavigate={onNavigate} />
                </li>
              ))}
            </ol>
          );
        })}
      </div>
      {templates.length > 0 && (
        <>
          <p aria-hidden className={cardLabelClass}>
            {english
              ? templateSlugs.length > 0
                ? 'Related templates'
                : 'Featured templates'
              : templateSlugs.length > 0
                ? 'Template terkait'
                : 'Template pilihan'}
          </p>
          <ul aria-label="Template yang disebut" className={cardRowClass}>
            {templates.slice(0, MAX_CARDS).map((template) => (
              <TemplateCard key={template.slug} template={template} onNavigate={onNavigate} />
            ))}
          </ul>
        </>
      )}
      {projects.length > 0 && (
        <>
          <p aria-hidden className={cardLabelClass}>
            {english ? 'Our projects' : 'Proyek kami'}
          </p>
          <ul aria-label="Proyek yang sudah dikerjakan" className={cardRowClass}>
            {projects.slice(0, MAX_CARDS).map((project) => (
              <ProjectCard key={project.statsKey} project={project} onNavigate={onNavigate} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
