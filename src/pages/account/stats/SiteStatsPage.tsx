// Statistik kunjungan situs pembeli (/akun/situs/:siteId/statistik), untuk semua template. docs/platform/SITE-STATS-SPEC.md
// §3–§4. Kerangka halaman per situs yang sama dengan SEO (SitePageHeader + pil SiteNav), lalu: pemilih rentang (7 hari ·
// 30 hari · 90 hari · 12 bulan, tersimpan di ?rentang=), kartu ringkasan dengan perubahan terhadap periode sebelumnya,
// grafik (StatsCharts.tsx), tabel (StatsLists.tsx), "Unduh CSV" data harian, dan catatan privasi. Situs dimuat lewat
// useSiteLoader; statistiknya terpisah (useSiteStats), jadi ganti rentang hanya meminta statistik lagi dan galat
// statistik (mis. 503 STATS_NOT_READY) tampil di dalam halaman dengan Coba lagi.
import { useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChartNoAxesColumn, Download, ExternalLink, LoaderCircle, Minus, ShieldCheck, Sparkles } from 'lucide-react';
import { SITE_STATS_RANGES, SITE_STATS_RANGE_DEFAULT, type SiteStatsRange, type SiteStatsResponse } from '../../../types/siteStats';
import type { Site } from '../../../types/platform';
import { EditorLoadError, EditorNotFound } from '../cms/EditorStates';
import { useDocumentTitle } from '../components/payment';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { PageContainer, SitePageHeader, SuspendedNotice } from '../posts/SitePage';
import { parseSiteId, useSiteLoader } from '../posts/useSiteLoader';
import { downloadCsv, toCsv } from './csv';
import { DevicesChart, HoursChart, SourcesChart, TrendChart, WeekdaysChart } from './StatsCharts';
import { Browsers, Referrers, TopPages } from './StatsLists';
import {
  RANGE_LABEL,
  RANGE_PARAM,
  changeOf,
  changeSentence,
  changeText,
  formatCount,
  formatPeriod,
  hasNoData,
  parseRange,
  previousLabel,
  statsCsvName,
  statsCsvRows,
  yesterdayOf,
  type Change,
} from './statsModel';
import { usePrefersReducedMotion } from './useReducedMotion';
import { useSiteStats } from './useSiteStats';

const LOAD_ERROR = 'Situs gagal dimuat. Silakan coba lagi.';
const PRIVACY_NOTE = 'Tanpa cookie. Alamat IP tidak disimpan.';

/** Halaman ini hanya butuh situsnya dari useSiteLoader; statistik dimuat terpisah (useSiteStats). */
const noData = async () => null;

export default function SiteStatsPage() {
  const { siteId: rawId } = useParams();
  const siteId = parseSiteId(rawId);
  const [params, setParams] = useSearchParams();
  const range = parseRange(params.get(RANGE_PARAM));
  const { load, reload } = useSiteLoader(siteId, noData, LOAD_ERROR);
  const { load: stats, retry } = useSiteStats(load.status === 'not_found' ? 0 : siteId, range);
  const reducedMotion = usePrefersReducedMotion();
  useDocumentTitle('Statistik kunjungan');

  const selectRange = useCallback(
    (next: SiteStatsRange) => {
      setParams(
        (prev) => {
          const query = new URLSearchParams(prev);
          if (next === SITE_STATS_RANGE_DEFAULT) query.delete(RANGE_PARAM);
          else query.set(RANGE_PARAM, String(next));
          return query;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  if (load.status === 'loading') return <StatsPageSkeleton />;
  if (load.status === 'not_found') return <EditorNotFound />;
  if (load.status === 'error') return <EditorLoadError message={load.message} onRetry={reload} />;

  const { site } = load;
  const back = site.order_number
    ? { to: `/akun/pesanan/${encodeURIComponent(site.order_number)}`, label: 'Detail pesanan' }
    : { to: '/akun', label: 'Pesanan saya' };
  // Data yang tampil: hasil rentang ini, atau hasil rentang sebelumnya (redup) selama yang baru dimuat
  const shown = stats.status === 'ready' ? stats.data : stats.status === 'loading' ? stats.previous : null;
  const busy = stats.status === 'loading';
  const csvReady = stats.status === 'ready' && !hasNoData(stats.data);

  return (
    <PageContainer busy={busy}>
      <SitePageHeader
        site={site}
        back={back}
        title="Statistik kunjungan"
        description="Berapa banyak orang membuka situs Anda, dari mana mereka datang, dan halaman apa yang paling sering dilihat."
        actions={
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!csvReady}
            onClick={() => {
              if (stats.status === 'ready') downloadCsv(statsCsvName(site.domain, stats.data), toCsv(statsCsvRows(stats.data)));
            }}
          >
            <Download className="h-4 w-4" aria-hidden />
            Unduh CSV <span className="sr-only">data harian</span>
          </button>
        }
      />

      {site.status !== 'active' && (
        <div className="mt-5">
          <SuspendedNotice site={site}>
            Situs ini dinonaktifkan sementara oleh admin, jadi kunjungan baru tidak tercatat. Statistik sebelumnya tetap bisa dilihat. Hubungi
            kami untuk mengaktifkannya kembali.
          </SuspendedNotice>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Rentang waktu" className="flex w-full rounded-full bg-alt p-1 ring-1 ring-inset ring-line sm:w-auto">
          {SITE_STATS_RANGES.map((value) => {
            const on = value === range;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => selectRange(value)}
                className={`h-9 flex-1 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                  on ? 'bg-primary text-white hover:bg-primary-hover' : 'text-muted hover:bg-surface hover:text-fg'
                }`}
              >
                {RANGE_LABEL[value]}
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          {busy && (
            <span role="status" className="inline-flex items-center gap-1.5">
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              Memuat…
            </span>
          )}
          {shown && !busy && (
            <span>
              {formatPeriod(shown.from, shown.to)} · waktu WIB
            </span>
          )}
        </p>
      </div>

      <div className="mt-5">
        {stats.status === 'error' ? (
          <ErrorState title="Statistik belum bisa dimuat" message={stats.message} onRetry={retry} />
        ) : !shown ? (
          <StatsSkeleton />
        ) : hasNoData(shown) ? (
          <StatsEmpty site={site} />
        ) : (
          <div className={`transition-opacity motion-reduce:transition-none ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <StatsBody stats={shown} site={site} reducedMotion={reducedMotion} />
          </div>
        )}
      </div>

      <p className="mt-8 flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <span>
          {PRIVACY_NOTE} Kunjungan dari pratinjau CMS dan demo tidak dihitung. Pengunjung unik dihitung per hari, jadi orang yang sama
          di dua hari berbeda terhitung dua kali.
        </span>
      </p>
    </PageContainer>
  );
}

// ─── Isi ────────────────────────────────────────────────────────────────────

function StatsBody({ stats, site, reducedMotion }: { stats: SiteStatsResponse; site: Site; reducedMotion: boolean }) {
  const compared = previousLabel(stats.range);
  const yesterday = yesterdayOf(stats);
  return (
    <>
      <section aria-labelledby="ringkasan-judul">
        <h2 id="ringkasan-judul" className="sr-only">
          Ringkasan {RANGE_LABEL[stats.range]}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard label="Tampilan halaman" value={stats.totals.views} change={changeOf(stats.totals.views, stats.previous.views)} compared={compared} />
          <KpiCard label="Kunjungan" value={stats.totals.visits} change={changeOf(stats.totals.visits, stats.previous.visits)} compared={compared} />
          <KpiCard
            label="Pengunjung unik"
            note="dihitung per hari"
            value={stats.totals.visitors}
            change={changeOf(stats.totals.visitors, stats.previous.visitors)}
            compared={compared}
          />
          <KpiCard
            label="Hari ini"
            note={`tampilan halaman · ${formatCount(stats.today.visitors)} pengunjung`}
            value={stats.today.views}
            change={changeOf(stats.today.views, yesterday.views)}
            compared="kemarin"
          />
        </dl>
      </section>

      <div className="mt-4">
        <TrendChart stats={stats} reducedMotion={reducedMotion} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SourcesChart stats={stats} reducedMotion={reducedMotion} />
        <DevicesChart stats={stats} reducedMotion={reducedMotion} />
        <HoursChart stats={stats} reducedMotion={reducedMotion} />
        <WeekdaysChart stats={stats} reducedMotion={reducedMotion} />
      </div>

      <div className="mt-4">
        <TopPages stats={stats} domain={site.domain} />
      </div>

      {/* Tabel butuh lebar: berdampingan baru di xl (di lg dengan sidebar, kolom host terpotong per huruf) */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Referrers stats={stats} />
        <Browsers stats={stats} />
      </div>
    </>
  );
}

const CHANGE_TONE: Record<Change['kind'], string> = {
  up: 'bg-success-50 text-success-700',
  down: 'bg-danger-50 text-danger-700',
  new: 'bg-brand-50 text-brand-800',
  flat: 'bg-alt text-muted',
};

const CHANGE_ICON: Record<Change['kind'], typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  new: Sparkles,
  flat: Minus,
};

/** Perubahan: ikon + teks (warna bukan satu-satunya pembeda) + kalimat lengkap untuk pembaca layar. */
function ChangeBadge({ change, compared }: { change: Change; compared: string }) {
  const Icon = CHANGE_ICON[change.kind];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 font-semibold tabular-nums ${CHANGE_TONE[change.kind]}`} aria-hidden>
        <Icon className="h-3.5 w-3.5" />
        {changeText(change)}
      </span>
      <span className="text-subtle" aria-hidden>
        vs {compared}
      </span>
      <span className="sr-only">{changeSentence(change, compared)}</span>
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  change: Change;
  compared: string;
  note?: string;
}

function KpiCard({ label, value, change, compared, note }: KpiCardProps) {
  return (
    <div className="card-site flex min-w-0 flex-col p-4 sm:p-5">
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-fg sm:text-[28px] sm:leading-9">{formatCount(value)}</dd>
      {note && <dd className="text-xs text-subtle">{note}</dd>}
      <dd className="mt-auto pt-3">
        <ChangeBadge change={change} compared={compared} />
      </dd>
    </div>
  );
}

/** Belum ada data sama sekali (spec §4): penjelasan + tautan ke situs. */
function StatsEmpty({ site }: { site: Site }) {
  return (
    <EmptyState
      icon={<ChartNoAxesColumn className="h-7 w-7" aria-hidden />}
      title="Belum ada kunjungan tercatat"
      description={
        <>
          Statistik mulai tercatat saat pengunjung membuka situs Anda di {site.domain}. Kunjungan dari pratinjau CMS tidak dihitung.
        </>
      }
      action={
        <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          <ExternalLink className="h-4 w-4" aria-hidden />
          Buka {site.domain}
          <span className="sr-only">(tab baru)</span>
        </a>
      }
    />
  );
}

// ─── Kerangka memuat ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div role="status" aria-label="Memuat statistik">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card-site p-4 sm:p-5">
            <Skeleton className="h-3 w-24 max-w-full" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-4 h-5 w-28 max-w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="card-site mt-4 p-4 sm:p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full" />
        <Skeleton className="mt-5 h-56 w-full" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card-site p-4 sm:p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
            <Skeleton className="mt-5 h-44 w-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat...</span>
    </div>
  );
}

/** Situs belum dimuat: kerangka kepala halaman (kembali, judul, pil) + kerangka statistik. */
function StatsPageSkeleton() {
  return (
    <PageContainer busy>
      <div aria-hidden>
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="mt-4 h-4 w-48" />
        <Skeleton className="mt-2 h-8 w-64 max-w-full" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-11 w-full rounded-full sm:w-96" />
      </div>
      <div className="mt-5">
        <StatsSkeleton />
      </div>
    </PageContainer>
  );
}
