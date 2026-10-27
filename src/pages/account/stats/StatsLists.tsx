// Tabel halaman Statistik kunjungan (docs/platform/SITE-STATS-SPEC.md §4): Halaman terpopuler (judul/path, tampilan,
// bar proporsi, tautan ke halaman di domain situs, tab baru), Situs perujuk ("x (utm)" untuk utm:x), dan Browser
// ("Unknown" dari server tampil "Lainnya").
// Bar proporsi hanya hiasan (aria-hidden); angkanya selalu tertulis.
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import type { SiteStatsResponse } from '../../../types/siteStats';
import { browserLabel, formatCount, formatPercent, referrerLabel, share } from './statsModel';
import { StatsTable } from './StatsCharts';

function ListCard({ id, title, description, children, className = '' }: { id: string; title: string; description: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-judul`} className={`card-site min-w-0 p-4 sm:p-5 ${className}`}>
      <h2 id={`${id}-judul`} className="text-base font-semibold text-fg">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Persen + bar proporsi (bar disembunyikan dari pembaca layar). */
function Proportion({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-alt ring-1 ring-inset ring-line sm:block" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(percent > 0 ? 2 : 0, percent))}%` }} />
      </span>
      <span className="w-12 tabular-nums">{formatPercent(percent)}</span>
    </span>
  );
}

const EMPTY = 'Belum ada data pada rentang ini.';
const Empty = ({ children = EMPTY }: { children?: ReactNode }) => <p className="rounded-xl bg-alt px-4 py-6 text-center text-sm text-muted">{children}</p>;

export function TopPages({ stats, domain }: { stats: SiteStatsResponse; domain: string }) {
  const total = stats.totals.views;
  return (
    <ListCard id="halaman" title="Halaman terpopuler" description="10 halaman yang paling banyak dilihat. Porsi = bagian dari semua tampilan halaman.">
      {stats.pages.length === 0 ? (
        <Empty />
      ) : (
        <StatsTable
          caption="Halaman terpopuler"
          head={['Halaman', 'Tampilan', 'Porsi']}
          numeric={[1, 2]}
          rows={stats.pages.map((page) => [
            <a
              key={page.path}
              href={`https://${domain}${page.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-w-0 max-w-full flex-col py-0.5 hover:text-primary"
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-fg group-hover:text-primary">
                <span className="[overflow-wrap:anywhere]">{page.title ?? page.path}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />{' '}
                <span className="sr-only">(tab baru)</span>
              </span>{' '}
              {page.title && <span className="break-all text-xs text-subtle">{page.path}</span>}
            </a>,
            formatCount(page.views),
            <Proportion key="porsi" percent={share(page.views, total)} />,
          ])}
        />
      )}
    </ListCard>
  );
}

export function Referrers({ stats }: { stats: SiteStatsResponse }) {
  const total = stats.referrers.reduce((sum, r) => sum + r.visits, 0);
  return (
    <ListCard id="perujuk" title="Situs perujuk" description="Situs yang mengirim pengunjung ke situs Anda. Tanda (utm) = dari tautan berlabel utm_source.">
      {stats.referrers.length === 0 ? (
        <Empty>Belum ada kunjungan dari situs lain pada rentang ini.</Empty>
      ) : (
        <StatsTable
          caption="Situs perujuk"
          head={['Situs', 'Kunjungan', 'Porsi']}
          numeric={[1, 2]}
          rows={stats.referrers.map((r) => [
            <span key={r.host} className="break-all">
              {referrerLabel(r.host)}
            </span>,
            formatCount(r.visits),
            <Proportion key="porsi" percent={share(r.visits, total)} />,
          ])}
        />
      )}
    </ListCard>
  );
}

export function Browsers({ stats }: { stats: SiteStatsResponse }) {
  const total = stats.browsers.reduce((sum, b) => sum + b.visits, 0);
  return (
    <ListCard id="browser" title="Browser" description="Browser yang dipakai pengunjung (6 teratas).">
      {stats.browsers.length === 0 ? (
        <Empty />
      ) : (
        <StatsTable
          caption="Browser pengunjung"
          head={['Browser', 'Kunjungan', 'Porsi']}
          numeric={[1, 2]}
          rows={stats.browsers.map((b) => [browserLabel(b.name), formatCount(b.visits), <Proportion key="porsi" percent={share(b.visits, total)} />])}
        />
      )}
    </ListCard>
  );
}
