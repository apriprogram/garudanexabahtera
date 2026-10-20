// Situs aktif pembeli di domain utama (/situs/:siteId): konten dari get_site_public {site_id}, dengan bar pratinjau tipis.
import { ExternalLink, Eye, Home as HomeIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SiteRenderer } from '../../templates/SiteRenderer';
import { SiteStatus } from '../../templates/SiteStatus';
import { applySiteHead } from '../../templates/siteHead';
import { useSitePublic } from '../../templates/useSitePublic';

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;

export default function SitePreview() {
  const { siteId } = useParams();
  const id = Number(siteId);
  const valid = /^\d+$/.test(siteId || '') && Number.isSafeInteger(id) && id > 0;
  const { state, retry } = useSitePublic(valid ? { site_id: id } : null);
  const site = state.status === 'ready' ? state.site : null;
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
    return applySiteHead(site.template_code, site.content);
  }, [site, state.status]);

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
            {domainOk && (
              <a
                href={`https://${domain}`}
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
      <SiteRenderer
        templateCode={state.site.template_code}
        content={state.site.content}
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
    </>
  );
}
