import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatRupiah, type Template } from '../../../types/platform';
import { LogoMark } from '../../ui/LogoMark';
import { Reveal } from '../../ui/Reveal';
import { shortCategory, TINT } from './catalog';

/** Tautan demo: demo_url eksternal (http/https) atau /demo/:slug, selalu di tab baru. */
function DemoLink({ template, className, children, label }: { template: Template; className: string; children: ReactNode; label?: string }) {
  const external = /^https?:\/\//i.test(template.demo_url || '');
  const href = external ? (template.demo_url as string) : `/demo/${encodeURIComponent(template.slug)}`;
  const common = { className, 'aria-label': label, title: label ? 'Lihat demo' : undefined };
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...common}>
      {children}
    </a>
  ) : (
    <Link to={href} target="_blank" rel="noopener" {...common}>
      {children}
    </Link>
  );
}

/** Avatar bulat brand (sayap Garuda Nexa putih di atas biru) seperti avatar pembuat di Dribbble. */
const BrandAvatar = () => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary" aria-hidden>
    <LogoMark className="h-2.5 text-white" />
  </span>
);

interface TemplateShotProps {
  template: Template;
  index: number;
  isNew?: boolean;
}

/**
 * Kartu template bergaya "shot" Dribbble: gambar 4:3 tanpa garis & shadow, di bawahnya baris avatar + nama +
 * lencana + harga. Desktop (pointer halus, ≥ lg): saat hover muncul gradien gelap lembut dengan nama dan tombol
 * bulat "Lihat demo" & "Pesan". Layar sentuh / sempit: deskripsi singkat + tombol di bawah kartu.
 */
export function TemplateShot({ template, index, isNew = false }: TemplateShotProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const slug = encodeURIComponent(template.slug);
  const detailHref = `/template/${slug}`;
  const orderHref = `/pesan/${slug}`;
  const showImage = Boolean(template.preview_image) && !imageBroken;

  return (
    <li className="min-w-0">
      {/* Muncul berurutan per baris (gaya CPNS: pudar + naik; ringan di HP, langsung tampil bila kurangi gerak) */}
      <Reveal height="100%" delay={(index % 4) * 0.07}>
        <article className="group/shot @container relative flex h-full min-w-0 flex-col">
          {/* Gambar: tautan duplikat dari judul, jadi dikeluarkan dari urutan Tab (judul tetap bisa difokus) */}
          <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
            <Link to={detailHref} tabIndex={-1} aria-hidden="true" className="block h-full w-full">
              {showImage ? (
                <img
                  src={template.preview_image as string}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageBroken(true)}
                  className="h-full w-full object-cover object-top transition-transform duration-500 ease-out motion-safe:group-hover/shot:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand-50 to-brand-100">
                  <LogoMark className="h-10 text-brand-300" />
                </span>
              )}
            </Link>

            {/* Lapisan hover (desktop): gradien bawah + kategori/nama + tombol bulat */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-end gap-3 bg-linear-to-t from-fg/70 via-fg/25 to-transparent px-4 pb-4 pt-20 opacity-0 transition-opacity duration-300 group-focus-within/shot:opacity-100 group-hover/shot:opacity-100 motion-reduce:transition-none lg:pointer-fine:flex">
              <div className="min-w-0 flex-1">
                {template.category && (
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">{template.category}</p>
                )}
                <p className="mt-0.5 truncate text-[15px] font-semibold leading-snug text-white">{template.name}</p>
              </div>
              <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                <DemoLink
                  template={template}
                  label={`Lihat demo ${template.name} (tab baru)`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-fg transition-colors hover:bg-brand-50 hover:text-primary"
                >
                  <Eye className="h-[18px] w-[18px]" aria-hidden />
                </DemoLink>
                <Link
                  to={orderHref}
                  aria-label={`Pesan template ${template.name}`}
                  title="Pesan"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover active:bg-brand-800"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          {/* Baris info ala Dribbble: avatar + nama + lencana | harga + ikon demo */}
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <BrandAvatar />
            {/* Nama mengalah (terpotong elipsis) lebih dulu; lencana pendek selalu tampil seperti "PRO" di Dribbble */}
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="min-w-0 text-sm font-medium leading-5 text-fg">
                {/* truncate di span dalam (bukan di tautan/h3): outline fokus & area sentuh ::after (44px) tidak terpotong */}
                <Link
                  to={detailHref}
                  className="relative block rounded-sm transition-colors after:absolute after:inset-x-0 after:-inset-y-3 hover:text-primary"
                >
                  <span className="block truncate">{template.name}</span>
                </Link>
              </h3>
              {isNew ? (
                <span className="inline-block h-4 shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-white">
                  Baru
                </span>
              ) : (
                template.category && (
                  <span
                    className="inline-block h-4 max-w-[5.5rem] shrink-0 truncate rounded-full bg-fg px-1.5 text-[10px] font-semibold leading-4 text-white"
                    title={template.category}
                  >
                    <span aria-hidden>{shortCategory(template.category)}</span>
                    <span className="sr-only">Kategori {template.category}</span>
                  </span>
                )
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {/* 13px (seperti angka statistik di Dribbble) agar nama template tetap utuh di kartu 4 kolom 1366px */}
              <p className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-fg">
                <span className="sr-only">Harga </span>
                {formatRupiah(template.price)}
              </p>
              {/* Ikon demo hanya di kartu lebar (≥ 352px); kartu desktop yang lebih sempit memakai tombol demo di lapisan hover */}
              <DemoLink
                template={template}
                label={`Lihat demo ${template.name} (tab baru)`}
                className="hidden h-7 w-7 items-center justify-center rounded-full text-subtle transition-colors hover:bg-brand-50 hover:text-primary @[22rem]:lg:pointer-fine:inline-flex"
              >
                <Eye className="h-4 w-4" aria-hidden />
              </DemoLink>
            </div>
          </div>

          {/* Layar sentuh / sempit: deskripsi + tombol selalu terlihat (tanpa lapisan hover) */}
          <div className="flex flex-1 flex-col lg:pointer-fine:hidden">
            {template.short_description && (
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{template.short_description}</p>
            )}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
              {/* px-3/gap-1.5: muat di kartu 2 kolom tersempit (±270px) tanpa teks meluber */}
              <DemoLink template={template} className="btn btn-outline gap-1.5 px-3">
                <Eye className="h-4 w-4" aria-hidden />
                Lihat demo
                <span className="sr-only"> {template.name} (tab baru)</span>
              </DemoLink>
              <Link to={orderHref} className="btn btn-primary gap-1.5 px-3" aria-label={`Pesan template ${template.name}`}>
                <ShoppingBag className="h-4 w-4" aria-hidden />
                Pesan
              </Link>
            </div>
          </div>
        </article>
      </Reveal>
    </li>
  );
}

/** Kilau berjalan untuk skeleton (diam bila pengguna memilih kurangi gerak). */
function Shimmer() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent"
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/** Skeleton satu kartu: blok gambar 4:3 berkilau + baris avatar/nama/harga (tanpa shadow). */
export function TemplateShotSkeleton({ className = '' }: { className?: string }) {
  return (
    <li className={`min-w-0 ${className}`} aria-hidden>
      <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
        <Shimmer />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`h-6 w-6 shrink-0 rounded-full ${TINT}`} />
        <span className={`h-3.5 w-2/5 rounded-full ${TINT}`} />
        <span className={`ml-auto h-3.5 w-1/4 rounded-full ${TINT}`} />
      </div>
    </li>
  );
}
