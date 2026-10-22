// Komponen gerak template: muncul saat digulir, strip logo berjalan, dan angka berjalan. Semuanya menulis ke DOM
// secara imperatif (atribut data / variabel CSS), jadi tidak ada render ulang per frame dan isi tetap utuh di HTML
// (pembaca layar & uji). Gerak mati (pratinjau CMS, prefers-reduced-motion) → isi tampil statis apa adanya.
import {
  Children,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { formatCount, parseCount, useMotionEnabled, watchEntrance } from './motion';

type RevealTag =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'header'
  | 'footer'
  | 'li'
  | 'ul'
  | 'ol'
  | 'dl'
  | 'figure'
  | 'blockquote'
  | 'p'
  | 'span'
  | 'h1'
  | 'h2'
  | 'h3';

export type RevealVariant = 'up' | 'fade' | 'scale' | 'left' | 'right';

export interface RevealProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Elemen yang dirender (default div). Pakai "li" di dalam <ul> agar grid tidak rusak. */
  as?: RevealTag;
  /** up (default): naik 20px + memudar · fade · scale (0.97 → 1) · left/right: geser 24px */
  variant?: RevealVariant;
  /** Jeda dalam ms; untuk daftar pakai stagger(i) dari ./motion */
  delay?: number;
  children?: ReactNode;
}

/**
 * Isi memudar masuk saat digulir ke layar (sekali). Jangan dipakai untuk item di dalam rel gulir horizontal
 * (item di luar layar tetap tersembunyi sampai digeser) — bungkus relnya saja.
 */
export function Reveal({ as = 'div', variant = 'up', delay = 0, className = '', style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const enabled = useMotionEnabled();

  useLayoutEffect(() => {
    const el = ref.current;
    // Tab latar (mis. pratinjau tersembunyi): IntersectionObserver bisa tidak berjalan, jadi jangan sembunyikan isi
    if (!el || !enabled || el.dataset.reveal === 'shown' || document.visibilityState === 'hidden') return;
    return watchEntrance(el, {
      arm: () => {
        el.dataset.reveal = 'pending';
      },
      enter: () => {
        el.dataset.reveal = 'shown';
      },
    });
  }, [enabled]);

  const Tag = as as 'div';
  const merged = delay ? ({ ...style, '--tpl-delay': `${Math.max(0, delay)}ms` } as CSSProperties) : style;
  return (
    <Tag ref={ref as RefObject<HTMLDivElement>} {...rest} data-reveal-variant={variant} className={`tpl-reveal ${className}`} style={merged}>
      {children}
    </Tag>
  );
}

export interface MarqueeProps {
  /** Item strip (mis. <ClientLogo>), masing-masing dibungkus <li> */
  children: ReactNode;
  /** Nama daftar untuk pembaca layar, mis. "Klien kami" */
  label: string;
  /** Detik untuk satu putaran (default 40) */
  duration?: number;
  /** Jarak antar item dalam px, juga jarak di sambungan salinan agar putaran mulus (default 56) */
  gap?: number;
  /** Kelas wadah luar */
  className?: string;
  /** Kelas tiap <li> */
  itemClassName?: string;
  /** Kelas daftar statis saat gerak mati (default rata tengah, membungkus) */
  staticClassName?: string;
}

const COPIES = 4;

/**
 * Strip logo berjalan pelan, berhenti saat disorot/difokus. Salinan untuk putaran disembunyikan dari pembaca layar
 * (inert + aria-hidden). Gerak mati → daftar statis rata tengah yang membungkus.
 */
export function Marquee({
  children,
  label,
  duration = 40,
  gap = 56,
  className = '',
  itemClassName = '',
  staticClassName = 'flex flex-wrap items-center justify-center gap-x-10 gap-y-6',
}: MarqueeProps) {
  const enabled = useMotionEnabled();
  const items = Children.toArray(children);
  if (items.length === 0) return null;
  const list = (key: number) =>
    items.map((item, i) => (
      <li key={`${key}-${i}`} className={`flex shrink-0 items-center ${itemClassName}`}>
        {item}
      </li>
    ));

  if (!enabled) {
    return (
      <ul aria-label={label} className={`${staticClassName} ${className}`}>
        {list(0)}
      </ul>
    );
  }

  // Padding kanan = jarak antar item, agar jarak di sambungan salinan sama dengan jarak antar item
  const groupStyle: CSSProperties = { gap, paddingRight: gap };
  return (
    <div className={`tpl-marquee ${className}`}>
      <div
        className="tpl-marquee-track"
        style={{ '--tpl-marquee-duration': `${duration}s`, '--tpl-marquee-copies': COPIES } as CSSProperties}
      >
        {Array.from({ length: COPIES }, (_, copy) =>
          copy === 0 ? (
            <ul key={copy} aria-label={label} className="flex shrink-0 items-center" style={groupStyle}>
              {list(copy)}
            </ul>
          ) : (
            <ul key={copy} aria-hidden inert className="flex shrink-0 items-center" style={groupStyle}>
              {list(copy)}
            </ul>
          ),
        )}
      </div>
    </div>
  );
}

export interface CountUpProps {
  /** Teks angka dari konten, mis. "350+", "12.000+", "98%", "4,8". Bukan angka → tampil apa adanya. */
  value: string;
  className?: string;
  /** Lama hitung dalam ms (default 1600) */
  duration?: number;
}

/**
 * Angka statistik yang menghitung naik saat masuk layar. Teks asli selalu ada di DOM (lebar tetap, terbaca
 * pembaca layar); angka berjalan digambar lewat ::before di lapisan aria-hidden.
 */
export function CountUp({ value, className = '', duration = 1600 }: CountUpProps) {
  const enabled = useMotionEnabled();
  const parts = useMemo(() => parseCount(value), [value]);
  const finalRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<HTMLSpanElement>(null);

  // Layout effect: angka yang sudah terlihat saat dipasang disiapkan (0) sebelum digambar, tanpa kedip nilai akhir
  useLayoutEffect(() => {
    const final = finalRef.current;
    const run = runRef.current;
    if (!enabled || !parts || parts.value <= 0 || !final || !run || document.visibilityState === 'hidden') return;
    let frame = 0;
    let safety = 0;
    // Berhenti total: batalkan frame berikutnya juga, agar pengaman (tab latar) tidak disusul tick yang menulis
    // angka berjalan lagi di atas nilai akhir yang sudah tampil
    const reset = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      window.clearTimeout(safety);
      run.removeAttribute('data-count');
      final.style.opacity = '';
    };
    const stop = watchEntrance(final, {
      arm: () => {
        final.style.opacity = '0';
        run.setAttribute('data-count', formatCount(parts, 0));
      },
      enter: () => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / Math.max(1, duration));
          const eased = 1 - (1 - t) ** 4;
          run.setAttribute('data-count', formatCount(parts, parts.value * eased));
          if (t < 1) frame = window.requestAnimationFrame(tick);
          else reset();
        };
        frame = window.requestAnimationFrame(tick);
        // Pengaman bila frame animasi ditahan browser (tab latar): nilai akhir tetap muncul
        safety = window.setTimeout(reset, duration + 600);
      },
    });
    return () => {
      stop();
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(safety);
      reset();
    };
  }, [enabled, parts, duration]);

  return (
    <span className={`inline-grid tabular-nums ${className}`}>
      <span ref={finalRef} className="col-start-1 row-start-1">
        {value}
      </span>
      <span ref={runRef} aria-hidden className="tpl-count pointer-events-none col-start-1 row-start-1" />
    </span>
  );
}
