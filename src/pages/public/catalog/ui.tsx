// Komponen bersama halaman katalog /template, kategori /template/kategori/{slug} dan detail template
// (docs/platform/SEO-PLAN.md §5.5). Semua tautan berupa <a href> asli (Link) supaya terbaca crawler di HTML prerender.
import { ChevronDown, ChevronRight, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { findNewestSlug } from '../../../components/sections/templates/catalog';
import { TemplateShot } from '../../../components/sections/templates/TemplateShot';
import type { CategoryMeta } from '../../../content/categories';
import { preloadNow } from '../../../lib/preload';
import type { FaqItem } from '../../../seo/jsonld';
import { HUB_PATHS, categoryPath } from '../../../seo/paths';
import type { Template } from '../../../types/platform';

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

export interface Crumb {
  label: string;
  to: string;
}

/**
 * Remah roti Beranda › … › halaman ini (sama dengan BreadcrumbList JSON-LD). Di HP nama halaman ini disembunyikan bila
 * `hideCurrentOnMobile` (sudah ada di H1 tepat di bawahnya), supaya baris tidak terpotong.
 */
export function Breadcrumbs({ trail, current, hideCurrentOnMobile = false }: { trail: Crumb[]; current: string; hideCurrentOnMobile?: boolean }) {
  const linkClass = 'inline-flex min-h-10 items-center truncate font-medium text-muted transition-colors hover:text-primary';
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 text-[13px] text-subtle">
      <ol className="flex min-w-0 items-center gap-1.5">
        <li className="flex shrink-0 items-center">
          <Link to={HUB_PATHS.home} className={linkClass}>
            Beranda
          </Link>
        </li>
        {trail.map((crumb) => (
          <li key={crumb.to} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <Link to={crumb.to} className={linkClass}>
              {crumb.label}
            </Link>
          </li>
        ))}
        <li className={`min-w-0 items-center gap-1.5 ${hideCurrentOnMobile ? 'hidden sm:flex' : 'flex'}`}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate" aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}

// ─── Kepala halaman ──────────────────────────────────────────────────────────

export function PageHeader({ badge, title, children }: { badge: string; title: string; children?: ReactNode }) {
  return (
    <header className="mt-3 max-w-3xl sm:mt-5">
      <span className="badge-site">{badge}</span>
      <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-5xl sm:leading-[1.08]">{title}</h1>
      {children}
    </header>
  );
}

/** Judul bagian (H2) halaman konten: ukuran sama dengan bagian detail template. */
export function SectionTitle({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`text-xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px] sm:leading-tight ${className}`}>
      {children}
    </h2>
  );
}

// ─── Kategori ────────────────────────────────────────────────────────────────

const chipClass =
  'chip-site max-sm:h-8 max-sm:px-3 max-sm:text-xs max-sm:after:-inset-y-1.5 aria-[current=page]:bg-primary aria-[current=page]:text-white aria-[current=page]:ring-primary';

/** Chip kategori berupa tautan nyata (katalog & kategori). Kategori tanpa template tidak ditampilkan. */
export function CategoryChips({
  categories,
  counts,
  active,
  total,
}: {
  categories: readonly CategoryMeta[];
  counts: Readonly<Record<string, number>>;
  /** Slug kategori halaman ini; null = katalog (chip "Semua" aktif). */
  active: string | null;
  total: number;
}) {
  const shown = categories.filter((meta) => (counts[meta.slug] ?? 0) > 0 || meta.slug === active);
  return (
    <nav aria-label="Kategori template" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-1 sm:px-1 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 py-1.5">
        <li>
          <Link to={HUB_PATHS.catalog} aria-current={active === null ? 'page' : undefined} className={chipClass}>
            Semua
            <span className="tabular-nums opacity-70">{total}</span>
          </Link>
        </li>
        {shown.map((meta) => (
          <li key={meta.slug}>
            <Link to={categoryPath(meta.slug)} aria-current={active === meta.slug ? 'page' : undefined} className={chipClass}>
              {meta.name}
              <span className="tabular-nums opacity-70">{counts[meta.slug] ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Kartu template ──────────────────────────────────────────────────────────

const GRID_GAP = 'grid grid-cols-1 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-8';

/** Kolom grid mengikuti jumlah kartu (sama dengan section Template beranda). */
const gridFor = (count: number) => {
  if (count <= 2) return `${GRID_GAP} sm:grid-cols-2 lg:max-w-5xl`;
  if (count === 3) return `${GRID_GAP} sm:grid-cols-2 lg:grid-cols-3`;
  return `${GRID_GAP} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
};

/** Grid kartu template (TemplateShot): gambar & nama → /template/{slug}, Lihat Demo, Pesan. */
export function TemplateGrid({ templates, showCategory = false, labelledBy }: { templates: Template[]; showCategory?: boolean; labelledBy?: string }) {
  // "Sekarang" = waktu data preload saat hidrasi, supaya lencana "Baru" sama dengan HTML server
  const newestSlug = findNewestSlug(templates, preloadNow());
  return (
    <ul className={gridFor(templates.length)} aria-labelledby={labelledBy}>
      {templates.map((template, index) => (
        <TemplateShot key={template.slug} template={template} index={index} isNew={template.slug === newestSlug} showCategory={showCategory} />
      ))}
    </ul>
  );
}

/** Skeleton grid saat daftar template belum ada (render tanpa preload). */
export function TemplateGridSkeleton() {
  return (
    <>
      <span className="sr-only" role="status">
        Memuat template…
      </span>
      <ul className={gridFor(4)} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className={`min-w-0 ${i >= 2 ? 'max-lg:hidden' : i >= 1 ? 'max-sm:hidden' : ''}`}>
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-fg/5" />
            <div className="mt-3 h-3.5 w-2/5 animate-pulse rounded-full bg-fg/5" />
          </li>
        ))}
      </ul>
    </>
  );
}

// ─── Sudah termasuk ──────────────────────────────────────────────────────────

/** Kotak "Sudah termasuk" + catatan tahun ke-2 (setting harga, sama dengan halaman template). */
export function IncludedBox({ includes, note, title = 'Sudah termasuk di setiap template', footer }: {
  includes: string[];
  note: string;
  title?: string;
  footer?: ReactNode;
}) {
  if (includes.length === 0 && !note && !footer) return null;
  return (
    <div className="rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:p-7">
      <p className="text-base font-semibold text-fg sm:text-lg">{title}</p>
      {includes.length > 0 && (
        <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm text-fg sm:mt-4 sm:grid-cols-2 sm:text-[15px]">
          {includes.map((item) => (
            <li key={item} className="flex gap-2.5">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-3 text-[13px] leading-relaxed text-muted sm:mt-4 sm:text-sm">{note}</p>}
      {footer}
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

/**
 * Daftar tanya jawab dengan <details> bawaan browser: jawabannya selalu ada di HTML (terbaca crawler dan tanpa
 * JavaScript), bisa dibuka-tutup dengan keyboard, dan tidak memengaruhi hidrasi.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.question}>
          <details className="group rounded-[20px] bg-surface ring-1 ring-inset ring-line open:ring-line-strong" open={index === 0}>
            <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex-1 text-[14px] font-semibold leading-snug text-fg sm:text-base">{item.question}</span>
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <p className="px-4 pb-4 text-[14px] leading-relaxed text-muted sm:px-5 sm:pb-5 sm:text-[15px]">{item.answer}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

// ─── Tautan lanjutan ─────────────────────────────────────────────────────────

export interface NextLink {
  to: string;
  title: string;
  text: string;
  icon: ReactNode;
}

/** Kartu tautan ke halaman lain (harga, jasa custom, panduan). */
export function NextLinks({ links }: { links: NextLink[] }) {
  return (
    <ul className={`grid gap-3 sm:gap-4 ${links.length >= 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className="card-flat lift flex h-full items-start gap-3.5 p-4 sm:p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alt text-primary ring-1 ring-inset ring-line [&>svg]:h-5 [&>svg]:w-5">
              {link.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-fg sm:text-lg">{link.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{link.text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
