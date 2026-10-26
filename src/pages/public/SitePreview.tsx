// Situs aktif pembeli di domain utama (/situs/:siteId/*): konten dari get_site_public {site_id}, dengan bar pratinjau tipis.
// Halaman di dalamnya sama dengan domain pembeli (/situs/12/berita, /situs/12/berita/{slug}; basePath "/situs/12"), tetapi
// tanpa canonical & selalu noindex (domain null di applySiteSeoHead) dan tanpa menghitung jumlah dilihat.
import { ExternalLink, Eye, Home as HomeIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTemplate, type SiteContent } from '../../templates';
import { SiteRenderer } from '../../templates/SiteRenderer';
import { SiteStatus } from '../../templates/SiteStatus';
import type { SiteData } from '../../templates/shared/siteData';
import { parseSiteRoute, servedRoute, sitePath } from '../../templates/siteRoutes';
import { applySiteSeoHead, removeSiteSeoHead } from '../../templates/siteSeo';
import { useSiteNavigate, useSitePages, useSitePublic } from '../../templates/useSitePublic';

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;

export default function SitePreview() {
  const { siteId, '*': rest = '' } = useParams();
  const id = Number(siteId);
  const valid = /^\d+$/.test(siteId || '') && Number.isSafeInteger(id) && id > 0;
  const basePath = `/situs/${siteId ?? ''}`;
  // "/situs/12/berita/" → "/berita" (di domain pembeli site.php mengalihkan garis miring di akhir)
  const path = `/${rest.replace(/\/+$/, '')}`;
  const route = useMemo(() => parseSiteRoute(path), [path]);
  const { state, retry } = useSitePublic(valid ? { site_id: id } : null);
  const site = state.status === 'ready' ? state.site : null;
  const hasPosts = getTemplate(site?.template_code)?.features?.posts === true;
  const pages = useSitePages(site ? site.id : null, route, { posts: hasPosts });
  const { navigate, historyPop } = useSiteNavigate(basePath);
  const data = useMemo<SiteData>(() => ({ ...pages.data, basePath, navigate, historyPop }), [pages.data, basePath, navigate, historyPop]);
  // Rute untuk kepala halaman: template tanpa fitur tulisan → /berita dsb. = tidak ditemukan (sama dengan domain pembeli)
  const headRoute = useMemo(() => servedRoute(route, hasPosts), [route, hasPosts]);
  const post = headRoute.kind === 'post' ? pages.data.post : undefined;
  const [bannerOpen, setBannerOpen] = useState(true);

  useEffect(() => {
    if (!site) {
      if (state.status !== 'notfound') return;
      const previous = document.title;
      document.title = 'Situs tidak ditemukan | Garuda Nexa';
      return () => {
        document.title = previous;
      };
    }
    applySiteSeoHead({
      domain: null,
      templateCode: site.template_code,
      content: site.content as SiteContent | null,
      seo: pages.seo,
      route: headRoute,
      post,
      listCount: headRoute.kind === 'list' ? (pages.listCount ?? 0) : undefined,
    });
  }, [site, state.status, pages.seo, headRoute, post, pages.listCount]);

  // Tag situs pembeli (title, ikon, theme-color, JSON-LD) dilepas saat pratinjau ditutup
  useEffect(() => () => removeSiteSeoHead(), []);

  if (state.status === 'loading') return <SiteStatus kind="loading" />;
  if (state.status === 'error') return <SiteStatus kind="error" message={state.message} onRetry={retry} />;
  if (state.status === 'notfound') {
    return (
      <SiteStatus
        kind="notfound"
        actions={
          <Link to="/" className="btn btn-primary">
            <HomeIcon className="h-4 w-4" aria-hidden />
            Ke beranda Garuda Nexa
          </Link>
        }
      />
    );
  }

  const domain = String(state.site.domain || '').trim().toLowerCase();
  const domainOk = DOMAIN_PATTERN.test(domain);

  return (
    <>
      {bannerOpen && (
        <div className="border-b border-brand-100 bg-brand-50">
          <div className="mx-auto flex min-h-11 max-w-[1240px] items-center gap-3 px-4 py-1.5 text-[13px] sm:px-6">
            <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-brand-800">
              Pratinjau situs{domainOk && <span className="font-semibold"> {domain}</span>}
            </p>
            {/* Halaman yang sama di domain pembeli (rute tak dikenal → beranda) */}
            {domainOk && (
              <a
                href={`https://${domain}${sitePath(route)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
              >
                <span className="max-sm:hidden">Buka domain</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only sm:hidden">Buka domain {domain}</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setBannerOpen(false)}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-brand-100 after:absolute after:-inset-1.5"
              aria-label="Tutup bar pratinjau"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
      {route.kind !== 'home' && !hasPosts ? (
        <SiteStatus
          kind="pagenotfound"
          fullScreen={false}
          actions={
            <Link to={basePath} className="btn btn-primary">
              Ke beranda situs
            </Link>
          }
        />
      ) : (
        <SiteRenderer
          templateCode={state.site.template_code}
          content={state.site.content}
          data={data}
          fallback={
            <SiteStatus
              kind="unavailable"
              fullScreen={false}
              actions={
                <Link to="/" className="btn btn-outline">
                  Ke beranda Garuda Nexa
                </Link>
              }
            />
          }
        />
      )}
    </>
  );
}
