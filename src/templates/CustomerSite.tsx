// Situs pembeli yang dibuka lewat domainnya sendiri (dimuat terpisah oleh SiteHostGate). Rute dari path
// (siteRoutes.ts, docs/platform/SITE-POSTS-SEO-SPEC.md §3, §7): beranda, /berita, /pengumuman, /berita/{slug},
// /pengumuman/{slug}; path lain = halaman tidak ditemukan. Data awal dari preload backend/site.php, lalu yang terbaru;
// kepala halaman (title, robots, canonical, OG, JSON-LD) dari siteSeo.ts dengan aturan yang sama dengan site.php.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { readPreload } from '../lib/preload';
import { getTemplate, type SiteContent } from './index';
import { SiteRenderer } from './SiteRenderer';
import { SiteStatus } from './SiteStatus';
import type { SiteData } from './shared/siteData';
import { mainSiteUrl } from './siteHosts';
import { parseSiteRoute } from './siteRoutes';
import { applySiteSeoHead } from './siteSeo';
import { countPostView, useSiteNavigate, useSitePages, useSitePublic } from './useSitePublic';

export default function CustomerSite({ hostname }: { hostname: string }) {
  const { pathname } = useLocation();
  const route = useMemo(() => parseSiteRoute(pathname), [pathname]);
  // site.php sudah menjawab 404 untuk path awal (preload.path null): tulisan tidak ada, tanpa meminta API lagi
  const [initial] = useState(() => ({ pathname, missing: readPreload()?.path === null }));
  const { state, retry } = useSitePublic({ domain: hostname });
  const site = state.status === 'ready' ? state.site : null;
  const hasPosts = getTemplate(site?.template_code)?.features?.posts === true;
  const pages = useSitePages(site ? site.id : null, route, { posts: hasPosts, missing: initial.missing && pathname === initial.pathname });
  const navigate = useSiteNavigate('');
  const data = useMemo<SiteData>(() => ({ ...pages.data, basePath: '', navigate }), [pages.data, navigate]);
  const post = route.kind === 'post' ? (hasPosts ? pages.data.post : null) : undefined;

  useEffect(() => {
    if (state.status === 'notfound') document.title = 'Situs tidak ditemukan';
    if (!site) return;
    applySiteSeoHead({
      domain: site.domain,
      templateCode: site.template_code,
      content: site.content as SiteContent | null,
      seo: pages.seo,
      route,
      post,
      listCount: route.kind === 'list' ? (pages.listCount ?? 0) : undefined,
    });
  }, [site, state.status, pages.seo, route, post, pages.listCount]);

  // Jumlah dilihat: sekali per sesi browser per tulisan (bukan pratinjau)
  const viewedSlug = site && route.kind === 'post' && post ? post.slug : null;
  useEffect(() => {
    if (site && viewedSlug) countPostView(site.id, viewedSlug);
  }, [site, viewedSlug]);

  if (state.status === 'loading') return <SiteStatus kind="loading" />;
  if (state.status === 'notfound') return <SiteStatus kind="notfound" poweredByHref={mainSiteUrl()} />;
  if (state.status === 'error') return <SiteStatus kind="error" message={state.message} onRetry={retry} poweredByHref={mainSiteUrl()} />;
  // Template tanpa fitur berita: hanya beranda
  if (route.kind !== 'home' && !hasPosts) {
    return (
      <SiteStatus
        kind="pagenotfound"
        poweredByHref={mainSiteUrl()}
        actions={
          <Link to="/" className="btn btn-primary">
            Ke beranda
          </Link>
        }
      />
    );
  }
  return (
    <SiteRenderer
      templateCode={state.site.template_code}
      content={state.site.content}
      data={data}
      fallback={<SiteStatus kind="unavailable" poweredByHref={mainSiteUrl()} />}
    />
  );
}
