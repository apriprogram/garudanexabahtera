// Komponen kecil SkyNusa: label section bergaya keterangan teknis (mono + kotak aksen), judul dua nada (bagian sorotan
// lebih muda), tombol persegi membulat dengan kotak panah, kepala section, harga dengan harga coret, ikon otomatis dari
// judul, tanda silang kisi (dekorasi), dan tombol "Tambah" keranjang demo. Ditulis di folder ini (bukan dibagi dengan
// template lain).
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { formatRupiah, parsePrice, savings } from './model';
import { useShop } from './shop';
import { BTN, C, MONO, TYPE_S } from './styles';

type Tone = 'light' | 'dark';

/** Label section: kotak kecil warna aksen + teks mono kapital, di atas bidang putih (terang) atau kaca (gelap). */
export function SectionLabel({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <p
      className={`inline-flex max-w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 leading-snug ${MONO} ${
        tone === 'dark' ? 'bg-white/[0.06] text-white/80 ring-1 ring-inset ring-white/10' : 'bg-white/80 text-[#0E1A1C] ring-1 ring-inset ring-black/[0.06]'
      } ${className}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 ${tone === 'dark' ? 'bg-(--sn-mint)' : 'bg-(--tpl-accent)'}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Judul dua nada: bagian `highlight` tampil lebih muda (abu ≥ 3,9:1 di kanvas terang, putih 55% di pita gelap). */
export function Toned({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-white/55' : 'text-[#66767A]'}>{mark}</span>
      {after}
    </>
  );
}

const ARROW_BOX = {
  ink: 'bg-white/[0.12]',
  light: 'bg-[#0E1A1C]/[0.06]',
  mint: 'bg-[#0E1A1C]/[0.1]',
  glass: 'bg-white/[0.12]',
} as const;

/**
 * Tombol + kotak panah. `variant` menentukan warna kotak panah (kelas warna tombol tetap dari BTN di ./styles).
 * Tanpa label atau aksi → tidak dirender.
 */
export function ButtonLink({
  action,
  label,
  className,
  variant,
  icon,
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  variant: keyof typeof ARROW_BOX;
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate}>
      {icon}
      <span className="truncate">{label}</span>
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ${ARROW_BOX[variant]}`}>
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
      </span>
    </ActionLink>
  );
}

/**
 * Kepala section: label, H2 dua nada, deskripsi. `split` = judul kiri & deskripsi kanan (layar lebar), `center` = terpusat,
 * `stack` = bertumpuk rata kiri.
 */
export function SectionHead({
  eyebrow,
  title,
  highlight = '',
  subtitle,
  tone = 'light',
  layout = 'split',
  className = '',
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle: string;
  tone?: Tone;
  layout?: 'split' | 'center' | 'stack';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  const titleColor = tone === 'dark' ? 'text-white' : 'text-[#0E1A1C]';
  const subColor = tone === 'dark' ? 'text-white/70' : C.muted;
  const label = eyebrow && (
    <Reveal>
      <SectionLabel tone={tone}>{eyebrow}</SectionLabel>
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} text-balance ${layout === 'center' ? 'mx-auto max-w-[20ch]' : 'max-w-[18ch]'} ${titleColor} ${TYPE_S.h2}`}>
      <Toned title={title} highlight={highlight} tone={tone} />
    </Reveal>
  );

  if (layout === 'split') {
    return (
      <div className={`grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">
          {label}
          {heading}
        </div>
        {subtitle && (
          <Reveal as="p" delay={160} className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_S.lead} ${subColor}`}>
            {subtitle}
          </Reveal>
        )}
      </div>
    );
  }
  return (
    <div className={`${layout === 'center' ? 'mx-auto max-w-[760px] text-center' : ''} ${className}`}>
      {label}
      {heading}
      {subtitle && (
        <Reveal as="p" delay={160} className={`mt-5 max-w-[52ch] ${layout === 'center' ? 'mx-auto' : ''} ${TYPE_S.lead} ${subColor}`}>
          {subtitle}
        </Reveal>
      )}
    </div>
  );
}

/** Harga + harga coret + chip hemat (bila harga coret lebih tinggi). */
export function Price({ price, oldPrice, tone = 'light', className = '' }: { price: string; oldPrice: string; tone?: Tone; className?: string }) {
  if (!price) return null;
  const saved = savings(price, oldPrice);
  const showOld = oldPrice && parsePrice(oldPrice) !== null && saved !== null;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 ${className}`}>
      <span className={`${TYPE_S.price} ${tone === 'dark' ? 'text-white' : 'text-[#0E1A1C]'}`}>{price}</span>
      {showOld && (
        <>
          <s className={`text-[14px] tabular-nums ${tone === 'dark' ? 'text-white/50' : C.muted}`}>
            <span className="sr-only">Harga normal </span>
            {oldPrice}
          </s>
          <span className={`rounded-[6px] px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.06em] ${tone === 'dark' ? 'bg-(--sn-mint) text-[#0E1A1C]' : 'bg-(--sn-tint) text-(--tpl-accent-ink)'}`}>
            Hemat {formatRupiah(saved)}
          </span>
        </>
      )}
    </p>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden />;
}

/** Tanda silang kecil di titik kisi (gaya gambar teknik). Dekoratif. */
export function Crosshair({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false" className={`pointer-events-none absolute h-4 w-4 ${className}`}>
      <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Tombol "Tambah" yang sesaat berubah jadi "Masuk keranjang" setelah diklik. */
export function AddButton({ id, name, onAdd, tone = 'light', className = '' }: { id: string; name: string; onAdd: () => void; tone?: 'light' | 'dark'; className?: string }) {
  const { lastAdded } = useShop();
  // Waktu tambah terakhir untuk barang ini; label kembali ke "Tambah" 1,6 dtk kemudian
  const fresh = lastAdded?.id === id ? lastAdded.at : 0;
  const [expired, setExpired] = useState(0);
  const justAdded = fresh > 0 && expired !== fresh;
  useEffect(() => {
    if (!fresh) return;
    const timer = window.setTimeout(() => setExpired(fresh), 1600);
    return () => window.clearTimeout(timer);
  }, [fresh]);
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Tambah ${name} ke keranjang`}
      className={`${tone === 'dark' ? BTN.mint : BTN.ink} h-10 gap-2 pl-3 pr-3.5 text-[14px] ${className}`}
    >
      {justAdded ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
      <span aria-hidden>{justAdded ? 'Masuk keranjang' : 'Tambah'}</span>
    </button>
  );
}
