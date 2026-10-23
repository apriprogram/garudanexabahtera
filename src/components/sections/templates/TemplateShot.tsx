import { useState, type ReactNode } from 'react';
import { Eye, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { templatePreviewAlt } from '../../../content/templateCopy';
import { formatRupiah, type Template } from '../../../types/platform';
import { LogoMark } from '../../ui/LogoMark';
import { Reveal } from '../../ui/Reveal';
import { TINT } from './catalog';

/** Tautan demo: demo_url eksternal (http/https) atau /demo/:slug, selalu di tab baru. */
function DemoLink({ template, className, children }: { template: Template; className: string; children: ReactNode }) {
  const external = /^https?:\/\//i.test(template.demo_url || '');
  const href = external ? (template.demo_url as string) : `/demo/${encodeURIComponent(template.slug)}`;
  // Nama aksesibel diawali label yang terlihat ("Lihat Demo"), lalu nama template & keterangan tab baru
  const common = { className, 'aria-label': `Lihat Demo ${template.name} (tab baru)` };
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
  /** Lencana kategori hanya berguna bila katalog punya ≥ 2 kategori (Templates.tsx yang menentukan). */
  showCategory?: boolean;
  /** Tingkat judul kartu: h3 di grid utama, h4 bila grid berada di bawah sub-judul (mis. "Template yang tersedia"). */
  headingLevel?: 3 | 4;
}

/**
 * Kartu template bergaya "shot" Dribbble: gambar 4:3 tanpa garis & shadow (zoom halus saat hover), di bawahnya
 * baris avatar + nama + lencana + harga, deskripsi singkat, lalu tombol "Lihat Demo" & "Pesan". Isi & aksi selalu
 * terlihat di semua perangkat (kontrak kartu SPEC §8), tanpa lapisan hover. Di HP dan kartu sempit (< 20rem)
 * harga turun ke baris sendiri di bawah nama, jadi nama tidak terpotong dan tepi kanan bebas dari tombol WhatsApp.
 */
export function TemplateShot({ template, index, isNew = false, showCategory = false, headingLevel = 3 }: TemplateShotProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const slug = encodeURIComponent(template.slug);
  const detailHref = `/template/${slug}`;
  const orderHref = `/pesan/${slug}`;
  const showImage = Boolean(template.preview_image) && !imageBroken;
  const Heading = headingLevel === 4 ? 'h4' : 'h3';

  return (
    <li className="min-w-0">
      {/* Muncul berurutan per baris (gaya CPNS: pudar + naik; ringan di HP, langsung tampil bila kurangi gerak) */}
      <Reveal height="100%" delay={(index % 4) * 0.07}>
        <article className="group/shot @container relative flex h-full min-w-0 flex-col">
          {/* Gambar: tautan duplikat dari judul, jadi dikeluarkan dari urutan Tab (judul tetap bisa difokus) */}
          <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
            <Link to={detailHref} tabIndex={-1} aria-hidden="true" className="block h-full w-full">
              {showImage ? (
                // Alt deskriptif (SEO-PLAN §5.5 langkah 7): tautan gambar aria-hidden, jadi alt tidak dibacakan dua kali
                <img
                  src={template.preview_image as string}
                  alt={templatePreviewAlt(template)}
                  width={1600}
                  height={1000}
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
          </div>

          {/* Baris info ala Dribbble: avatar + nama + lencana | harga (HP & kartu sempit: harga di baris kedua) */}
          <div className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 max-sm:grid-cols-[auto_minmax(0,1fr)] @max-[20rem]:grid-cols-[auto_minmax(0,1fr)]">
            <BrandAvatar />
            {/* Nama mengalah (terpotong elipsis) lebih dulu; lencana kategori dibatasi 9rem dan ikut terpotong bila perlu */}
            <div className="flex min-w-0 items-center gap-2">
              <Heading className="min-w-0 text-base font-semibold leading-snug text-fg sm:text-[17px]">
                {/* truncate di span dalam (bukan di tautan/judul): outline fokus & area sentuh ::after (44px) tidak terpotong */}
                <Link
                  to={detailHref}
                  className="relative block rounded-sm transition-colors after:absolute after:inset-x-0 after:-inset-y-3 hover:text-primary"
                >
                  <span className="block truncate">{template.name}</span>
                </Link>
              </Heading>
              {isNew ? (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-primary px-2 text-[11px] font-semibold text-white">
                  Baru
                </span>
              ) : (
                showCategory &&
                template.category && (
                  <span className="badge-site max-w-[9rem] shrink-0" title={template.category}>
                    <span className="sr-only">Kategori </span>
                    <span className="min-w-0 truncate">{template.category}</span>
                  </span>
                )
              )}
            </div>

            <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-fg max-sm:col-start-2 sm:text-[15px] @max-[20rem]:col-start-2">
              <span className="sr-only">Harga </span>
              {formatRupiah(template.price)}
            </p>
          </div>

          {/* Deskripsi + tombol selalu terlihat; mt-auto menyejajarkan tombol di dasar kartu dalam satu baris grid */}
          <div className="flex flex-1 flex-col">
            {template.short_description && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{template.short_description}</p>
            )}
            {/* btn-sm (36px) mulai sm; HP tetap 40px agar mudah diketuk. px-3/gap-1.5: muat di kartu tersempit (±270px) */}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-3 sm:pt-4">
              <DemoLink template={template} className="btn btn-outline btn-sm px-3 max-sm:h-10 max-sm:text-[13px]">
                <Eye className="h-4 w-4" aria-hidden />
                Lihat Demo
              </DemoLink>
              <Link
                to={orderHref}
                className="btn btn-primary btn-sm px-3 max-sm:h-10 max-sm:text-[13px]"
                aria-label={`Pesan Template ${template.name}`}
              >
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

/** Kilau berjalan untuk skeleton (animasi CSS `animate-shimmer`; tidak tampil bila pengguna memilih kurangi gerak). */
function Shimmer() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden"
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
