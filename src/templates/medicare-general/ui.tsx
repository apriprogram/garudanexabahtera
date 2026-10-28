// Komponen kecil MediCare General: label section (garis biru tegak 4px + teks huruf biasa yang besar, bukan huruf kapital
// kecil), kepala section, judul dengan kata berwarna, tombol radius 10px, tautan teks bergaris bawah, ikon otomatis,
// daftar centang, dan kontrol "Ukuran teks" (A / A+ / A++). Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { useContext, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { TextSizeContext } from './hooks';
import { ICONS, iconKey } from './icons';
import { TEXT_SIZES } from './model';
import { BTN, C, T, TEXT_LINK } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: garis tegak tema (atau putih di pita gelap/merah) + teks. Kosong → tidak dirender. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-3 ${T.label} ${dark ? 'text-white' : 'text-(--tpl-accent-ink)'} ${className}`}>
      <span aria-hidden className={`h-5 w-1 shrink-0 rounded-full ${dark ? 'bg-white' : 'bg-(--tpl-accent)'}`} />
      <span className="min-w-0 text-balance">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` berwarna tema (tanpa miring/garis bawah). */
export function Highlighted({ title, highlight }: { title: string; highlight: string }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className="text-(--tpl-accent-ink)">{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section: label, H2, deskripsi bertumpuk (rata kiri). `aside` = isi di kanan pada layar lebar (mis. angka).
 * Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2). Semua kosong tanpa `srTitle` → null.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  aside,
  stack = false,
  className = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  srTitle?: string;
  tone?: Tone;
  aside?: ReactNode;
  /** true = bertumpuk tanpa grid 12 kolom (untuk kolom sempit) */
  stack?: boolean;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle && !aside) return null;
  const dark = tone === 'dark';
  return (
    <div className={`grid gap-y-8 ${stack ? '' : '@5xl:grid-cols-12 @5xl:items-end @5xl:gap-x-10'} ${className}`}>
      <div className={`min-w-0 ${stack ? '' : aside ? '@5xl:col-span-7' : '@5xl:col-span-9'}`}>
        {eyebrow && (
          <Reveal variant="fade">
            <SectionLabel label={eyebrow} tone={tone} />
          </Reveal>
        )}
        {title ? (
          <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[24ch] ${T.h2} ${dark ? 'text-white' : C.ink}`}>
            {title}
          </Reveal>
        ) : (
          <h2 className="sr-only">{srTitle || eyebrow || subtitle}</h2>
        )}
        {subtitle && (
          <Reveal as="p" delay={160} className={`mt-4 max-w-[56ch] text-pretty ${T.lead} ${dark ? 'text-white/90' : C.muted}`}>
            {subtitle}
          </Reveal>
        )}
      </div>
      {aside && <div className={`min-w-0 ${stack ? '' : '@5xl:col-span-5'}`}>{aside}</div>}
    </div>
  );
}

type Variant = keyof typeof BTN;

/** Tombol radius 10px + panah opsional. Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  icon,
  arrow = false,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  icon?: ReactNode;
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`${BTN[variant]} ${className}`}>
      {icon}
      <span className="min-w-0">{label}</span>
      {arrow && <ArrowRight aria-hidden className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </ActionLink>
  );
}

/** Tautan teks bergaris bawah; tautan keluar diberi panah serong, tautan di halaman panah kanan. */
export function TextLink({ action, label, className = '' }: { action: LinkAction | null; label: string; className?: string }) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${TEXT_LINK} ${className}`}>
      {label}
      <Icon aria-hidden className="h-5 w-5 shrink-0" />
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari nama (lihat ./icons). Dekoratif. */
export function AutoIcon({ name, className = 'h-7 w-7' }: { name: string; className?: string }) {
  const Icon = ICONS[iconKey(name)];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}

/** Daftar dengan tanda centang bulat (fasilitas, persiapan, aturan). */
export function CheckList({ items, label, tone = 'light', className = '' }: { items: string[]; label?: string; tone?: Tone; className?: string }) {
  if (items.length === 0) return null;
  const dark = tone === 'dark';
  return (
    <ul aria-label={label} className={`grid gap-3 ${className}`}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className={`flex items-start gap-3 ${T.body} ${dark ? 'text-white' : C.ink}`}>
          <span
            aria-hidden
            className={`mt-[0.2em] flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/15 text-white' : 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)'}`}
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Kontrol "Ukuran teks": tiga tombol A / A+ / A++ (aria-pressed). `tone="emergency"` = di strip merah (putih di
 * merah), `tone="light"` = di menu HP (biru di putih). Ukuran huruf tombol tetap (tidak ikut membesar).
 */
export function TextSizeControl({ tone = 'light', className = '' }: { tone?: 'light' | 'emergency'; className?: string }) {
  const { size, setSize } = useContext(TextSizeContext);
  const onRed = tone === 'emergency';
  return (
    <div role="group" aria-label="Ukuran teks" className={`flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className={`text-[14px] font-semibold ${onRed ? 'text-white' : C.ink}`}>
        Ukuran teks
      </span>
      <div className={`flex items-center gap-1 rounded-[10px] p-1 ${onRed ? 'bg-black/20' : 'bg-[#F3F7FC] ring-1 ring-inset ring-[#0E1B2E]/[0.12]'}`}>
        {TEXT_SIZES.map((option, i) => {
          const pressed = size === i;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={pressed}
              aria-label={`Ukuran teks ${option.name}`}
              onClick={() => setSize(i)}
              className={`flex items-center justify-center rounded-[8px] px-2 font-bold leading-none transition-colors duration-200 ${onRed ? 'h-10 min-w-11' : 'h-12 min-w-12'} ${
                ['text-[14px]', 'text-[16px]', 'text-[18px]'][i]
              } ${
                pressed
                  ? onRed
                    ? 'bg-white text-[#B71C1C]'
                    : 'bg-(--tpl-accent) text-(--tpl-on-accent)'
                  : onRed
                    ? 'text-white hover:bg-white/15'
                    : `${C.ink} hover:bg-white`
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
