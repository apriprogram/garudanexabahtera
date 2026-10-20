// Situs pembeli yang dibuka lewat domainnya sendiri (dimuat terpisah oleh SiteHostGate).
import { useEffect } from 'react';
import { SiteRenderer } from './SiteRenderer';
import { SiteStatus } from './SiteStatus';
import { mainSiteUrl } from './siteHosts';
import { applySiteHead } from './siteHead';
import { useSitePublic } from './useSitePublic';

export default function CustomerSite({ hostname }: { hostname: string }) {
  const { state, retry } = useSitePublic({ domain: hostname });
  const site = state.status === 'ready' ? state.site : null;

  useEffect(() => {
    if (state.status === 'notfound') document.title = 'Situs tidak ditemukan';
    if (!site) return;
    return applySiteHead(site.template_code, site.content);
  }, [site, state.status]);

  if (state.status === 'loading') return <SiteStatus kind="loading" />;
  if (state.status === 'notfound') return <SiteStatus kind="notfound" poweredByHref={mainSiteUrl()} />;
  if (state.status === 'error') return <SiteStatus kind="error" message={state.message} onRetry={retry} poweredByHref={mainSiteUrl()} />;
  return (
    <SiteRenderer
      templateCode={state.site.template_code}
      content={state.site.content}
      fallback={<SiteStatus kind="unavailable" poweredByHref={mainSiteUrl()} />}
    />
  );
}
