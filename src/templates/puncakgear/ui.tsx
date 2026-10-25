// Komponen kecil PuncakGear: label section huruf kapital dengan titik aksen, tombol pil + panah, ikon otomatis dari
// judul, bintang rating, dan garis kontur topografi (SVG dihitung di peramban, tanpa file gambar).
// Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';

/** Label section: huruf kapital kecil dengan titik aksen (latar terang) atau titik bercahaya (latar gelap/foto). */
export function SectionLabel({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p
      className={`inline-flex max-w-full items-center gap-2.5 text-[12px] font-semibold uppercase leading-snug tracking-[0.16em] ${
        tone === 'dark' ? 'text-white/80' : 'text-[#59625C]'
      } ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone === 'dark' ? 'bg-(--pg-glow)' : 'bg-(--tpl-accent) ring-1 ring-[#0E1512]/25'}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Tombol pil + panah. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  arrow = true,
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  arrow?: boolean;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate}>
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />}
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden />;
}

/** Rating 1–5 sebagai bintang + angka ("4,9"). Bintang dekoratif; angka dibacakan lewat teks sr-only. */
export function Stars({ value, className = '' }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < full ? 'fill-[#0E1512] text-[#0E1512]' : 'text-[#0E1512]/25'}`} strokeWidth={1.5} />
        ))}
      </span>
      <span className="text-[13px] font-medium tabular-nums text-[#0E1512]">
        <span className="sr-only">Rating </span>
        {value.toFixed(1).replace('.', ',')}
        <span className="sr-only"> dari 5</span>
      </span>
    </span>
  );
}

// ─── Kontur topografi ─────────────────────────────────────────────────────────

type Point = [number, number];

/** Satu garis kontur tertutup: lingkaran yang dilonggarkan gelombang sinus, dihaluskan Catmull-Rom → kurva kubik. */
function contour(cx: number, cy: number, r: number, seed: number, stretch: number): string {
  const n = 22;
  const pts: Point[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + 0.12 * Math.sin(3 * a + seed) + 0.07 * Math.sin(5 * a + seed * 1.7) + 0.04 * Math.sin(2 * a - seed));
    return [cx + rr * Math.cos(a) * stretch, cy + rr * Math.sin(a)];
  });
  const at = (i: number) => pts[(i + n) % n];
  const f = (v: number) => Math.round(v);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** Dua "puncak" bergaris kontur (dihitung sekali per modul). */
let TOPO: string[] | null = null;
const topoPaths = (): string[] => {
  if (!TOPO) {
    TOPO = [
      ...Array.from({ length: 9 }, (_, i) => contour(590, 190, 26 + i * 34, 0.9 + i * 0.22, 1.3)),
      ...Array.from({ length: 6 }, (_, i) => contour(170, 470, 22 + i * 30, 2.4 + i * 0.3, 1.15)),
    ];
  }
  return TOPO;
};

/** Garis kontur dekoratif (warna = currentColor). Atur ukuran, posisi, warna, dan opasitas lewat className. */
export function Topo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" className={`pointer-events-none ${className}`}>
      {topoPaths().map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={i % 4 === 0 ? 1.4 : 0.9} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
