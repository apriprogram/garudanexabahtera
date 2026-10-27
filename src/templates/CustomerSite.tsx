// Situs pembeli yang dibuka lewat domainnya sendiri (dimuat terpisah oleh SiteHostGate). Rute dari path
// (siteRoutes.ts, docs/platform/SITE-POSTS-SEO-SPEC.md §3, §7): beranda, /berita, /pengumuman, /berita/{slug},
// /pengumuman/{slug}; path lain = halaman tidak ditemukan. Data awal dari preload backend/site.php, lalu yang terbaru;
// kepala halaman (title, robots, canonical, OG, JSON-LD) dari siteSeo.ts dengan aturan yang sama dengan site.php.
// Path bergaris miring di akhir ("/berita/") diganti path tanpa garis miring, seperti 301 site.php; situs tanpa fitur
// Berita & Pengumuman aktif (template tidak mampu, atau `site.addons.posts` tidak true — docs/platform/SITE-ADDONS-SPEC.md
// §6) hanya punya beranda dengan berita biasa: tulisan tidak diminta, halaman lain = tidak ditemukan (servedRoute, sama
// dengan 404 site.php). Statistik kunjungan (docs/platform/SITE-STATS-SPEC.md §2): satu site_visit per rute yang tampil,
// hanya di sini (domain pembeli), bukan di SitePreview / demo / pratinjau CMS.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { readPreload } from '../lib/preload';
import type { SiteContent } from './index';
import { SiteRenderer } from './SiteRenderer';
import { SiteStatus } from './SiteStatus';
import type { SiteData } from './shared/siteData';
import { sendSiteVisit, utmSourceOf } from './shared/siteVisit';
import { mainSiteUrl } from './siteHosts';
import { parseSiteRoute, servedRoute, sitePath, trimTrailingSlash } from './siteRoutes';
import { applySiteSeoHead } from './siteSeo';
import { countPostView, siteOriginOf, sitePostsEnabled, useSiteNavigate, useSitePages, useSitePublic } from './useSitePublic';

export default function CustomerSite({ hostname }: { hostname: string }) {
  const { pathname, search, hash } = useLocation();
  const routerNavigate = useNavigate();
  // "/berita/" (mis. tautan tambahan tulisan yang dibuka tanpa muat ulang) → "/berita"; path tak dikenal tetap apa adanya
  const trimmed = trimTrailingSlash(pathname);
  const redirect = trimmed !== pathname && parseSiteRoute(trimmed).kind !== 'notfound';
  const path = redirect ? trimmed : pathname;
  const route = useMemo(() => parseSiteRoute(path), [path]);
  useEffect(() => {
    if (redirect) routerNavigate(`${trimmed}${search}${hash}`, { replace: true });
  }, [redirect, trimmed, search, hash, routerNavigate]);
  // site.php sudah menjawab 404 untuk path awal (preload.path null): tulisan tidak ada, tanpa meminta API lagi.
  // utm_source halaman pertama (statistik kunjungan) dibaca sekali saat situs dibuka
  const [initial] = useState(() => ({ pathname, missing: readPreload()?.path === null, utm: utmSourceOf(search) }));
  const { state, retry } = useSitePublic({ domain: hostname });
  const site = state.status === 'ready' ? state.site : null;
  // Fitur Berita & Pengumuman aktif (template mampu + addons.posts); tidak aktif = berita biasa, hanya beranda
  const hasPosts = sitePostsEnabled(site);
  const pages = useSitePages(site ? site.id : null, route, { posts: hasPosts, missing: initial.missing && pathname === initial.pathname });
  const { navigate, historyPop } = useSiteNavigate('');
  const siteOrigin = siteOriginOf(site?.domain);
  const data = useMemo<SiteData>(() => ({ ...pages.data, basePath: '', siteOrigin, navigate, historyPop }), [pages.data, siteOrigin, navigate, historyPop]);
  // Rute untuk kepala halaman: tanpa fitur aktif → /berita dsb. = tidak ditemukan (sama dengan site.php)
  const headRoute = useMemo(() => servedRoute(route, hasPosts), [route, hasPosts]);
  const post = headRoute.kind === 'post' ? pages.data.post : undefined;

  useEffect(() => {
    if (state.status === 'notfound') document.title = 'Situs tidak ditemukan';
    if (!site) return;
    applySiteSeoHead({
      domain: site.domain,
      templateCode: site.template_code,
      content: site.content as SiteContent | null,
      seo: pages.seo,
      route: headRoute,
      post,
      listCount: headRoute.kind === 'list' ? (pages.listCount ?? 0) : undefined,
    });
  }, [site, state.status, pages.seo, headRoute, post, pages.listCount]);

  // Jumlah dilihat: sekali per sesi browser per tulisan (bukan pratinjau)
  const viewedSlug = site && headRoute.kind === 'post' && post ? post.slug : null;
  useEffect(() => {
    if (site && viewedSlug) countPostView(site.id, viewedSlug);
  }, [site, viewedSlug]);

  // Statistik kunjungan: dikirim setelah rute siap (beranda: situs siap; daftar: daftarnya ada; tulisan: tulisannya
  // ada). Tidak ditemukan, pengalihan garis miring, memuat, dan gagal tidak dihitung. Path yang sama berturut-turut
  // (menu "/#kontak" di beranda, data yang disegarkan, effect ganda StrictMode) = satu tampilan.
  const listReady = headRoute.kind === 'list' && Array.isArray(pages.data.posts[headRoute.postKind]);
  const routeReady = headRoute.kind === 'home' || listReady || (headRoute.kind === 'post' && !!post);
  const visitPath = site && !redirect && routeReady ? sitePath(headRoute) : null;
  const visitSiteId = site ? site.id : null;
  const lastVisit = useRef<string | null>(null);
  useEffect(() => {
    if (visitSiteId === null || visitPath === null) {
      // Halaman lain (memuat, tidak ditemukan) di antaranya: kembali ke path yang sama dihitung lagi
      lastVisit.current = null;
      return;
    }
    if (lastVisit.current === visitPath) return;
    lastVisit.current = visitPath;
    sendSiteVisit({ site_id: visitSiteId, path: visitPath, utm_source: initial.utm });
  }, [visitSiteId, visitPath, initial.utm]);

  if (state.status === 'loading') return <SiteStatus kind="loading" />;
  if (state.status === 'notfound') return <SiteStatus kind="notfound" poweredByHref={mainSiteUrl()} />;
  if (state.status === 'error') return <SiteStatus kind="error" message={state.message} onRetry={retry} poweredByHref={mainSiteUrl()} />;
  // Tanpa fitur Berita & Pengumuman aktif: hanya beranda
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
