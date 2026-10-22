// Pengatur head host utama di klien (docs/platform/SEO-PLAN.md §5.3).
// STUB dari WP1: belum melakukan apa pun. WP3: aktif hanya jika isMainHost(location.hostname) (domain pembeli tetap
// diatur siteHead.ts), membaca useLocation() + cache data, lalu applyHead(getHead(pathname, data)).
// WP2 memasangnya di samping <App/> di dalam router (main.tsx, entry-server.tsx).

export function SeoManager(): null {
  return null;
}

export default SeoManager;
