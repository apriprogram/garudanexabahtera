import { useState, type ReactNode } from 'react';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { templatePreviewAlt } from '../../../content/templateCopy';
import { formatRupiah, type Template } from '../../../types/platform';
import { Reveal } from '../../ui/Reveal';
import { TINT } from './catalog';
import { compactCount, useTemplateEngagement } from './useTemplateEngagement';
import { FIRST_ORDER_DISCOUNT_PERCENT, firstOrderPrice } from '../../../lib/firstOrderDiscount';

/** Tautan demo: demo_url eksternal (http/https) atau /demo/:slug, selalu di tab baru. */
function DemoLink({
  template,
  className,
  children,
  onClick,
}: {
  template: Template;
  className: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const external = /^https?:\/\//i.test(template.demo_url || '');
  const href = external ? (template.demo_url as string) : `/demo/${encodeURIComponent(template.slug)}`;
  // Nama aksesibel diawali label yang terlihat ("Lihat Demo"), lalu nama template & keterangan tab baru
  const common = { className, onClick, 'aria-label': `Lihat Demo ${template.name} (tab baru)` };
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

interface TemplateShotProps {
  template: Template;
  index: number;
  isNew?: boolean;
  /** Dulu: lencana kategori; kini kategori selalu tertulis di baris info kartu (prop tetap diterima). */
  showCategory?: boolean;
  /** Tingkat judul kartu: h3 di grid utama, h4 bila grid berada di bawah sub-judul (mis. "Template yang tersedia"). */
  headingLevel?: 3 | 4;
}

/**
 * Kartu template gaya Dribbble (permintaan pemilik 2026-10-23): gambar 4:3 tanpa logo, garis & shadow. Saat di-hover
 * (atau difokus keyboard) muncul lapisan gradasi bawah berisi judul + deskripsi singkat dan tombol "Demo" & "Pesan";
 * di layar sentuh tombolnya selalu terlihat. Di bawah gambar: judul | ♥ suka (bisa diklik) · 👁 dilihat (dihitung saat
 * template dibuka dari kartu, lihat useTemplateEngagement), kategori · jumlah terjual, lalu harga normal dicoret + harga
 * pembelian pertama (−20%, lib/firstOrderDiscount) dengan label.
 */
export function TemplateShot({ template, index, isNew = false, headingLevel = 3 }: TemplateShotProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const slug = encodeURIComponent(template.slug);
  const detailHref = `/template/${slug}`;
  const orderHref = `/pesan/${slug}`;
  const showImage = Boolean(template.preview_image) && !imageBroken;
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  const sold = template.sold_count ?? 0;
  const { liked, likes, views, toggleLike, recordView, busy } = useTemplateEngagement(
    template.slug,
    template.like_count ?? 0,
    template.view_count ?? 0,
  );

  return (
    <li className="min-w-0">
      {/* Muncul berurutan per baris (gaya CPNS: pudar + naik; ringan di HP, langsung tampil bila kurangi gerak) */}
      <Reveal height="100%" delay={(index % 4) * 0.07}>
        <article className="group/shot relative flex h-full min-w-0 flex-col">
          <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
            {/* Gambar: tautan duplikat dari judul, jadi dikeluarkan dari urutan Tab (judul tetap bisa difokus) */}
            <Link to={detailHref} tabIndex={-1} aria-hidden="true" onClick={recordView} className="block h-full w-full">
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
                <span className="block h-full w-full bg-linear-to-br from-brand-50 to-brand-100" />
              )}
            </Link>

            {/* Lapisan hover: gradasi bawah (cukup gelap untuk teks putih di atas pratinjau terang) + judul & deskripsi
                (perangkat ber-mouse) + tombol Demo & Pesan (cincin fokus putih di atas gradasi gelap) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-linear-to-t from-fg/90 via-fg/55 to-transparent p-3 pt-16 transition-opacity duration-300 group-focus-within/shot:opacity-100 sm:p-4 sm:pt-20 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/shot:opacity-100">
              <div className="min-w-0 flex-1 [@media(hover:none)]:hidden">
                <p className="truncate text-sm font-semibold text-white sm:text-[15px]">{template.name}</p>
                {template.short_description && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/85 sm:text-[13px]">{template.short_description}</p>
                )}
              </div>
              <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
                <DemoLink template={template} className="btn btn-sm h-9 bg-white px-3.5 text-fg hover:bg-white/90 focus-visible:outline-white" onClick={recordView}>
                  <Eye className="h-4 w-4" aria-hidden />
                  Demo
                </DemoLink>
                <Link
                  to={orderHref}
                  onClick={recordView}
                  className="btn btn-primary btn-sm h-9 px-3.5 focus-visible:outline-white"
                  aria-label={`Pesan Template ${template.name}`}
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                  Pesan
                </Link>
              </div>
            </div>
          </div>

          {/* Baris info ala Dribbble: judul | ♥ suka · 👁 dilihat, lalu kategori · harga selebar kartu */}
          <div className="mt-3 min-w-0">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Heading className="min-w-0 text-base font-semibold leading-snug text-fg sm:text-[17px]">
                  {/* truncate di span dalam (bukan di tautan/judul): outline fokus & area sentuh ::after tidak terpotong */}
                  <Link
                    to={detailHref}
                    onClick={recordView}
                    className="relative block rounded-sm transition-colors after:absolute after:inset-x-0 after:-inset-y-3 hover:text-primary"
                  >
                    <span className="block truncate">{template.name}</span>
                  </Link>
                </Heading>
                {isNew && (
                  <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-primary px-2 text-[11px] font-semibold text-white">
                    Baru
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3 text-[13px] tabular-nums text-muted">
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  disabled={busy}
                  aria-pressed={liked}
                  aria-label={`${liked ? 'Batal suka' : 'Suka'} ${template.name}, ${likes} suka`}
                  className={`relative inline-flex items-center gap-1 rounded-full transition-colors after:absolute after:-inset-2 hover:text-fg ${liked ? 'text-[#e8466f]' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} aria-hidden />
                  {compactCount(likes)}
                </button>
                <span className="inline-flex items-center gap-1" title={`${views} kali dilihat`}>
                  <Eye className="h-4 w-4" aria-hidden />
                  {compactCount(views)}
                  <span className="sr-only"> kali dilihat</span>
                </span>
              </div>
            </div>
            {/* Kategori · jumlah terjual (pesanan dibayar dari server, permintaan pemilik 2026-10-24); 0 terjual tidak ditulis */}
            {(template.category || sold > 0) && (
              <p className="mt-0.5 truncate text-sm text-muted">
                {template.category && (
                  <>
                    <span className="sr-only">Kategori </span>
                    {template.category}
                  </>
                )}
                {template.category && sold > 0 && (
                  <>
                    <span aria-hidden> · </span>
                    <span className="sr-only">, </span>
                  </>
                )}
                {sold > 0 && <span className="tabular-nums">{compactCount(sold)} terjual</span>}
              </p>
            )}
            {/* Harga jujur: harga template sebenarnya dicoret, harga pembelian pertama (−20%, sama dengan yang dibayar
                akun baru di checkout) di sebelahnya, dengan label (permintaan pemilik 2026-10-24) */}
            {template.price > 0 ? (
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="tabular-nums text-subtle line-through">
                  <span className="sr-only">Harga normal </span>
                  {formatRupiah(template.price)}
                </span>
                <span className="font-semibold tabular-nums text-fg">
                  <span className="sr-only">Harga pembelian pertama </span>
                  {formatRupiah(firstOrderPrice(template.price))}
                </span>
                <span className="inline-flex h-5 items-center rounded-full bg-success-50 px-2 text-[11px] font-semibold text-success-700">
                  −{FIRST_ORDER_DISCOUNT_PERCENT}% pembelian pertama
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-fg">Gratis</p>
            )}
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

/** Skeleton satu kartu: blok gambar 4:3 berkilau + baris nama/angka (tanpa shadow). */
export function TemplateShotSkeleton({ className = '' }: { className?: string }) {
  return (
    <li className={`min-w-0 ${className}`} aria-hidden>
      <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
        <Shimmer />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`h-3.5 w-2/5 rounded-full ${TINT}`} />
        <span className={`ml-auto h-3.5 w-1/5 rounded-full ${TINT}`} />
      </div>
    </li>
  );
}
