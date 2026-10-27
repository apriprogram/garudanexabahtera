// Grafik halaman Statistik kunjungan (recharts, dimuat lazy bersama halamannya; docs/platform/SITE-STATS-SPEC.md §4):
// Tren (area harian/mingguan, seri bisa disembunyikan), Sumber kunjungan (bar horizontal + persen), Perangkat (donut +
// legenda persen), Jam ramai (24 bar WIB, jam tertinggi disorot), Hari ramai (Senin–Minggu dari data harian).
// Aksesibilitas: setiap grafik punya judul, ringkasan teks, dan tombol "Lihat sebagai tabel" yang menampilkan data yang
// sama dalam <table>; warna tidak pernah satu-satunya pembeda (garis putus-putus, label nilai, legenda bertulisan).
// Warna dari token situs (variabel CSS, dengan nilai cadangan) yang lolos uji kontras & buta warna; animasi grafik mati
// bila pengguna memilih prefers-reduced-motion (`reducedMotion`, dari usePrefersReducedMotion di halaman).
import { useId, useMemo, useState, type ReactNode } from 'react';
import { ChartColumn, Table2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
  type TooltipContentProps,
} from 'recharts';
import type { SiteStatsResponse, SiteVisitDevice } from '../../../types/siteStats';
import {
  formatCount,
  formatDayShort,
  formatDecimal,
  formatHour,
  formatPercent,
  devicesSummary,
  hoursSummary,
  peakOf,
  share,
  sourcesSummary,
  trendPointLabel,
  trendPoints,
  trendSummary,
  weekdayRows,
  weekdaysSummary,
  type TrendPoint,
} from './statsModel';

/**
 * Warna grafik. Tampilan halaman (primary) vs pengunjung unik (warning-700): lolos uji CVD & kontras ≥ 3:1 di atas
 * putih; perangkat menambah brand-400. Bar biasa brand-300 + bar tertinggi primary (nilainya juga ditulis di atas bar).
 */
const STATS_COLORS = {
  views: 'var(--color-primary, #211ffe)',
  visitors: 'var(--color-warning-700, #b54708)',
  bar: 'var(--color-brand-300, #9c9aff)',
  peak: 'var(--color-primary, #211ffe)',
  grid: 'var(--site-line, #e3e6ee)',
  cursor: 'var(--site-line-strong, #cbd0db)',
  hover: 'var(--site-alt, #f7f8fb)',
  axis: 'var(--site-muted, #4b5262)',
  text: 'var(--site-fg, #121620)',
  surface: 'var(--site-surface, #ffffff)',
} as const;

const DEVICE_COLORS: Record<SiteVisitDevice, string> = {
  desktop: 'var(--color-primary, #211ffe)',
  mobile: 'var(--color-warning-700, #b54708)',
  tablet: 'var(--color-brand-400, #6c6aff)',
};

const TICK = { fill: STATS_COLORS.axis, fontSize: 12 };
/** Yang dibaca tooltip kustom: aktif + titik data di bawah kursor (payload[0].payload). */
type TipProps = Pick<TooltipContentProps, 'active' | 'payload'>;
const WEEKDAY_SHORT: Record<number, string> = { 0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };

// ─── Kerangka kartu grafik & tabel ──────────────────────────────────────────

interface ChartCardProps {
  /** Awalan id elemen (judul, ringkasan, isi) */
  id: string;
  title: string;
  summary: string;
  /** Data yang sama dalam <table> (tombol "Lihat sebagai tabel") */
  table: ReactNode;
  /** Di antara ringkasan dan grafik (mis. sakelar seri) — hanya saat grafik tampil */
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Kartu satu grafik: judul, ringkasan teks, lalu grafik atau tabelnya. */
export function ChartCard({ id, title, summary, table, controls, children, className = '' }: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);
  return (
    // @container: kartu sempit (setengah lebar, HP) = tombol tabel di bawah ringkasan, rata kiri dengan teksnya
    <section aria-labelledby={`${id}-judul`} className={`@container card-site min-w-0 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-col items-start gap-1 @lg:flex-row @lg:justify-between @lg:gap-4">
        <div className="min-w-0 @lg:flex-1">
          <h2 id={`${id}-judul`} className="text-base font-semibold text-fg">
            {title}
          </h2>
          <p id={`${id}-ringkasan`} className="mt-1 text-sm leading-relaxed text-muted">
            {summary}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-controls={`${id}-isi`}
          className="btn btn-ghost btn-sm -ml-3 shrink-0 @lg:-mr-2 @lg:ml-0"
        >
          {asTable ? <ChartColumn className="h-4 w-4" aria-hidden /> : <Table2 className="h-4 w-4" aria-hidden />}
          {asTable ? 'Lihat sebagai grafik' : 'Lihat sebagai tabel'} <span className="sr-only">{title}</span>
        </button>
      </div>
      {!asTable && controls}
      <div id={`${id}-isi`} className="mt-4">
        {asTable ? table : children}
      </div>
    </section>
  );
}

interface StatsTableProps {
  caption: string;
  head: string[];
  /** Sel per baris; sel pertama = kepala baris (th scope="row") */
  rows: ReactNode[][];
  /** Kolom angka (rata kanan), per indeks kolom */
  numeric?: number[];
  /** Tabel panjang (tren harian 90 hari) digulir di dalam kotak, bukan memanjangkan halaman */
  scroll?: boolean;
}

/** Tabel data grafik / daftar: caption untuk pembaca layar, kepala kolom & baris, angka rata kanan. */
export function StatsTable({ caption, head, rows, numeric = [], scroll = false }: StatsTableProps) {
  const align = (i: number) => (numeric.includes(i) ? 'text-right tabular-nums' : 'text-left');
  return (
    // Kotak bergulir (tabel panjang): region berlabel yang bisa difokus, jadi bisa digulir dengan papan ketik
    <div
      className={`overflow-auto rounded-xl ring-1 ring-inset ring-line ${scroll ? 'max-h-80' : ''}`}
      tabIndex={scroll ? 0 : undefined}
      role={scroll ? 'region' : undefined}
      aria-label={scroll ? caption : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-alt text-xs text-muted">
          <tr>
            {head.map((label, i) => (
              <th key={label} scope="col" className={`px-3 py-2 align-bottom font-medium max-sm:px-2 ${align(i)}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((cells, r) => (
            <tr key={r}>
              {cells.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="px-3 py-2 text-left font-normal text-fg max-sm:px-2">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className={`whitespace-nowrap px-3 py-2 text-fg max-sm:px-2 ${align(i)}`}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Kotak tooltip grafik (lapisan melayang: boleh shadow-float). */
function TooltipBox({ title, rows }: { title: string; rows: { key: string; swatch?: ReactNode; label: string; value: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl bg-surface px-3 py-2 text-xs shadow-float ring-1 ring-line">
      <p className="font-semibold text-fg">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-muted">
            {row.swatch}
            <span>{row.label}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-fg">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Contoh garis seri: penuh (tampilan halaman) atau putus-putus (pengunjung unik). */
function LineSwatch({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden className="shrink-0">
      <line x1="1" y1="4" x2="17" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
  );
}

function DotSwatch({ color }: { color: string }) {
  return <span className="block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />;
}

/**
 * Nilai di ujung kanan bar horizontal ("420 · 44%"), satu baris. LabelList bawaan memecah teks yang melewati area
 * plot jadi dua baris; teks ini ditaruh di margin kanan grafik.
 */
function renderBarEndLabel({ x, y, width, height, value }: LabelProps) {
  return (
    <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dy="0.35em" fill={STATS_COLORS.text} fontSize={12}>
      {String(value ?? '')}
    </text>
  );
}

/** Wadah grafik: tinggi tetap, lebar penuh kartu. */
function ChartBox({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`w-full min-w-0 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

// ─── 1. Tren ────────────────────────────────────────────────────────────────

type SeriesKey = 'views' | 'visitors';
const SERIES: { key: SeriesKey; label: string; color: string; dashed: boolean }[] = [
  { key: 'views', label: 'Tampilan halaman', color: STATS_COLORS.views, dashed: false },
  { key: 'visitors', label: 'Pengunjung unik', color: STATS_COLORS.visitors, dashed: true },
];

export function TrendChart({ stats, reducedMotion }: { stats: SiteStatsResponse; reducedMotion: boolean }) {
  const weekly = stats.range === 365;
  const points = useMemo(() => trendPoints(stats), [stats]);
  const summary = trendSummary(stats, points);
  const [shown, setShown] = useState<Record<SeriesKey, boolean>>({ views: true, visitors: true });
  const gradientId = `gn-tren-${useId().replace(/[^\w-]/g, '')}`;
  const visibleCount = SERIES.filter((s) => shown[s.key]).length;

  const renderTooltip = ({ active, payload }: TipProps) => {
    const point = payload?.[0]?.payload as TrendPoint | undefined;
    if (!active || !point) return null;
    return (
      <TooltipBox
        title={trendPointLabel(point, weekly)}
        rows={SERIES.filter((s) => shown[s.key]).map((s) => ({
          key: s.key,
          swatch: <LineSwatch color={s.color} dashed={s.dashed} />,
          label: s.label,
          value: formatCount(point[s.key]),
        }))}
      />
    );
  };

  return (
    <ChartCard
      id="tren"
      title={weekly ? 'Tren kunjungan per pekan' : 'Tren kunjungan harian'}
      summary={summary}
      controls={
        <div role="group" aria-label="Seri yang ditampilkan" className="mt-3 flex flex-wrap gap-2">
          {SERIES.map((s) => {
            const on = shown[s.key];
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                // Seri terakhir yang tampil tidak bisa disembunyikan (grafik tidak pernah kosong)
                disabled={on && visibleCount === 1}
                onClick={() => setShown((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium ring-1 ring-inset transition-colors disabled:cursor-not-allowed ${
                  on ? 'bg-surface text-fg ring-line-strong' : 'bg-alt text-subtle line-through ring-line hover:text-muted'
                }`}
              >
                <LineSwatch color={s.color} dashed={s.dashed} />
                {s.label}
              </button>
            );
          })}
        </div>
      }
      table={
        <StatsTable
          caption={weekly ? 'Tampilan halaman, kunjungan, dan pengunjung unik per pekan' : 'Tampilan halaman, kunjungan, dan pengunjung unik per hari'}
          head={[weekly ? 'Pekan' : 'Tanggal', 'Tampilan halaman', 'Kunjungan', 'Pengunjung unik']}
          numeric={[1, 2, 3]}
          scroll
          rows={points.map((p) => [trendPointLabel(p, weekly).replace(/^Pekan /, ''), formatCount(p.views), formatCount(p.visits), formatCount(p.visitors)])}
        />
      }
    >
      <ChartBox className="h-64 sm:h-72">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} title="Tren kunjungan" desc={summary}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STATS_COLORS.views} stopOpacity={0.18} />
              <stop offset="100%" stopColor={STATS_COLORS.views} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={STATS_COLORS.grid} />
          <XAxis
            dataKey="key"
            tickFormatter={(key: string) => formatDayShort(key)}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: STATS_COLORS.grid }}
            minTickGap={24}
            interval="preserveStartEnd"
          />
          <YAxis allowDecimals={false} tickFormatter={(v: number) => formatCount(v)} tick={TICK} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={renderTooltip} cursor={{ stroke: STATS_COLORS.cursor, strokeWidth: 1 }} isAnimationActive={!reducedMotion} />
          {shown.views && (
            <Area
              type="monotone"
              dataKey="views"
              name="Tampilan halaman"
              stroke={STATS_COLORS.views}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: STATS_COLORS.surface }}
              isAnimationActive={!reducedMotion}
            />
          )}
          {shown.visitors && (
            <Area
              type="monotone"
              dataKey="visitors"
              name="Pengunjung unik"
              stroke={STATS_COLORS.visitors}
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              activeDot={{ r: 4, strokeWidth: 2, stroke: STATS_COLORS.surface }}
              isAnimationActive={!reducedMotion}
            />
          )}
        </AreaChart>
      </ChartBox>
    </ChartCard>
  );
}

// ─── 2. Sumber kunjungan ────────────────────────────────────────────────────

export function SourcesChart({ stats, reducedMotion }: { stats: SiteStatsResponse; reducedMotion: boolean }) {
  const total = stats.sources.reduce((sum, s) => sum + s.visits, 0);
  const rows = stats.sources.map((s) => {
    const percent = share(s.visits, total);
    return { ...s, percent, valueLabel: `${formatCount(s.visits)} · ${formatPercent(percent)}` };
  });
  const summary = sourcesSummary(stats);

  const renderTooltip = ({ active, payload }: TipProps) => {
    const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
    if (!active || !row) return null;
    return <TooltipBox title={row.label} rows={[{ key: 'visits', label: 'Kunjungan', value: `${formatCount(row.visits)} (${formatPercent(row.percent)})` }]} />;
  };

  return (
    <ChartCard
      id="sumber"
      title="Sumber kunjungan"
      summary={summary}
      table={
        <StatsTable
          caption="Kunjungan per sumber"
          head={['Sumber', 'Kunjungan', 'Persen']}
          numeric={[1, 2]}
          rows={rows.map((r) => [r.label, formatCount(r.visits), formatPercent(r.percent)])}
        />
      }
    >
      <ChartBox className="h-56">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 84, bottom: 0, left: 0 }} barCategoryGap={10} title="Sumber kunjungan" desc={summary}>
          <XAxis type="number" hide domain={[0, (max: number) => Math.max(max, 1)]} />
          <YAxis type="category" dataKey="label" width={116} tick={TICK} tickLine={false} axisLine={false} />
          <Tooltip content={renderTooltip} cursor={{ fill: STATS_COLORS.hover }} isAnimationActive={!reducedMotion} />
          <Bar dataKey="visits" name="Kunjungan" fill={STATS_COLORS.views} radius={[0, 4, 4, 0]} isAnimationActive={!reducedMotion}>
            <LabelList dataKey="valueLabel" content={renderBarEndLabel} />
          </Bar>
        </BarChart>
      </ChartBox>
    </ChartCard>
  );
}

// ─── 3. Perangkat ───────────────────────────────────────────────────────────

export function DevicesChart({ stats, reducedMotion }: { stats: SiteStatsResponse; reducedMotion: boolean }) {
  const total = stats.devices.reduce((sum, d) => sum + d.visits, 0);
  const rows = stats.devices.map((d) => ({ ...d, percent: share(d.visits, total), color: DEVICE_COLORS[d.key] }));
  const summary = devicesSummary(stats);
  // Tanpa kunjungan: cincin abu sebagai tempat donut
  const pieData = total > 0 ? rows : [{ key: 'kosong', label: 'Belum ada data', visits: 1, color: STATS_COLORS.grid }];

  const renderTooltip = ({ active, payload }: TipProps) => {
    const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
    if (!active || !row || total === 0) return null;
    return (
      <TooltipBox
        title={row.label}
        rows={[
          { key: 'visits', swatch: <DotSwatch color={row.color} />, label: 'Kunjungan', value: `${formatCount(row.visits)} (${formatPercent(row.percent)})` },
          { key: 'visitors', label: 'Pengunjung unik', value: formatCount(row.visitors) },
        ]}
      />
    );
  };

  return (
    <ChartCard
      id="perangkat"
      title="Perangkat"
      summary={summary}
      table={
        <StatsTable
          caption="Kunjungan per perangkat"
          head={['Perangkat', 'Kunjungan', 'Persen', 'Pengunjung unik']}
          numeric={[1, 2, 3]}
          rows={rows.map((r) => [r.label, formatCount(r.visits), formatPercent(r.percent), formatCount(r.visitors)])}
        />
      }
    >
      {/* Kartu sempit: donut di atas legenda; lebar: berdampingan */}
      <div className="flex flex-col items-center gap-5 @lg:flex-row @lg:gap-8">
        <div className="relative h-44 w-44 shrink-0">
          <ChartBox className="h-full">
            <PieChart title="Perangkat" desc={summary}>
              <Pie
                data={pieData}
                dataKey="visits"
                nameKey="label"
                innerRadius="64%"
                outerRadius="100%"
                paddingAngle={total > 0 ? 2 : 0}
                stroke={STATS_COLORS.surface}
                strokeWidth={2}
                isAnimationActive={!reducedMotion}
              >
                {pieData.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={renderTooltip} isAnimationActive={!reducedMotion} />
            </PieChart>
          </ChartBox>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
            <span className="text-xl font-semibold tabular-nums text-fg">{formatCount(total)}</span>
            <span className="text-xs text-muted">kunjungan</span>
          </div>
        </div>
        <ul className="w-full min-w-0 space-y-3" aria-label="Legenda perangkat">
          {rows.map((r) => (
            <li key={r.key} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 shrink-0">
                <DotSwatch color={r.color} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-fg">{r.label}</span>
                  <span className="font-semibold tabular-nums text-fg">{formatPercent(r.percent)}</span>
                </span>
                <span className="block text-[13px] tabular-nums text-muted">
                  {formatCount(r.visits)} kunjungan · {formatCount(r.visitors)} pengunjung
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

// ─── 4. Jam ramai ───────────────────────────────────────────────────────────

export function HoursChart({ stats, reducedMotion }: { stats: SiteStatsResponse; reducedMotion: boolean }) {
  const peak = peakOf(stats.hours, (h) => h.views);
  const rows = stats.hours.map((h) => ({ ...h, label: String(h.hour).padStart(2, '0'), peak: h === peak }));
  const summary = hoursSummary(stats);

  const renderTooltip = ({ active, payload }: TipProps) => {
    const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
    if (!active || !row) return null;
    return (
      <TooltipBox
        title={`Pukul ${formatHour(row.hour)}–${row.label}.59 WIB${row.peak ? ' (tertinggi)' : ''}`}
        rows={[{ key: 'views', label: 'Tampilan halaman', value: formatCount(row.views) }]}
      />
    );
  };

  return (
    <ChartCard
      id="jam"
      title="Jam ramai (WIB)"
      summary={summary}
      table={
        <StatsTable
          caption="Tampilan halaman per jam (WIB)"
          head={['Jam (WIB)', 'Tampilan halaman']}
          numeric={[1]}
          scroll
          rows={rows.map((r) => [`${formatHour(r.hour)}–${r.label}.59${r.peak ? ' (tertinggi)' : ''}`, formatCount(r.views)])}
        />
      }
    >
      <ChartBox className="h-56">
        <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: 0 }} barCategoryGap={2} title="Jam ramai" desc={summary}>
          <CartesianGrid vertical={false} stroke={STATS_COLORS.grid} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: STATS_COLORS.grid }} interval={2} />
          <YAxis allowDecimals={false} tickFormatter={(v: number) => formatCount(v)} tick={TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={renderTooltip} cursor={{ fill: STATS_COLORS.hover }} isAnimationActive={!reducedMotion} />
          <Bar dataKey="views" name="Tampilan halaman" radius={[3, 3, 0, 0]} isAnimationActive={!reducedMotion}>
            {rows.map((r) => (
              <Cell key={r.hour} fill={r.peak ? STATS_COLORS.peak : STATS_COLORS.bar} />
            ))}
            <LabelList dataKey={(r: (typeof rows)[number]) => (r.peak ? formatCount(r.views) : '')} position="top" fill={STATS_COLORS.text} fontSize={12} />
          </Bar>
        </BarChart>
      </ChartBox>
    </ChartCard>
  );
}

// ─── 5. Hari ramai ──────────────────────────────────────────────────────────

export function WeekdaysChart({ stats, reducedMotion }: { stats: SiteStatsResponse; reducedMotion: boolean }) {
  const base = useMemo(() => weekdayRows(stats), [stats]);
  const peak = peakOf(base, (r) => r.average);
  const rows = base.map((r) => ({ ...r, short: WEEKDAY_SHORT[r.weekday], peak: r === peak }));
  const summary = weekdaysSummary(base);

  const renderTooltip = ({ active, payload }: TipProps) => {
    const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
    if (!active || !row) return null;
    return (
      <TooltipBox
        title={`${row.label}${row.peak ? ' (tertinggi)' : ''}`}
        rows={[{ key: 'avg', label: 'Rata-rata tampilan per hari', value: formatDecimal(row.average) }]}
      />
    );
  };

  return (
    <ChartCard
      id="hari"
      title="Hari ramai"
      summary={summary}
      table={
        <StatsTable
          caption="Rata-rata tampilan halaman per hari, Senin sampai Minggu"
          head={['Hari', 'Rata-rata tampilan per hari', 'Jumlah hari']}
          numeric={[1, 2]}
          rows={rows.map((r) => [`${r.label}${r.peak ? ' (tertinggi)' : ''}`, formatDecimal(r.average), formatCount(r.days)])}
        />
      }
    >
      <ChartBox className="h-56">
        <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%" title="Hari ramai" desc={summary}>
          <CartesianGrid vertical={false} stroke={STATS_COLORS.grid} />
          <XAxis dataKey="short" tick={TICK} tickLine={false} axisLine={{ stroke: STATS_COLORS.grid }} />
          <YAxis allowDecimals tickFormatter={(v: number) => formatDecimal(v)} tick={TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={renderTooltip} cursor={{ fill: STATS_COLORS.hover }} isAnimationActive={!reducedMotion} />
          <Bar dataKey="average" name="Rata-rata tampilan per hari" radius={[4, 4, 0, 0]} isAnimationActive={!reducedMotion}>
            {rows.map((r) => (
              <Cell key={r.weekday} fill={r.peak ? STATS_COLORS.peak : STATS_COLORS.bar} />
            ))}
            <LabelList dataKey={(r: (typeof rows)[number]) => (r.peak ? formatDecimal(r.average) : '')} position="top" fill={STATS_COLORS.text} fontSize={12} />
          </Bar>
        </BarChart>
      </ChartBox>
    </ChartCard>
  );
}
