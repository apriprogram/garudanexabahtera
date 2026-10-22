// Kepala halaman jasa custom: Service (tanpa harga) + BreadcrumbList + WebPage + FAQPage (teks sama persis dengan FAQ
// yang terlihat, src/content/faq.ts). Modul murni untuk JasaWebsite.seo.ts dan JasaAplikasi.seo.ts.
import { faqItems } from '../../../content/faq';
import type { ServiceContent } from '../../../content/services';
import { breadcrumb, faqPage, service, webPage } from '../../../seo/jsonld';
import { pageHead, staticPage, type StaticPageSeo } from '../../../seo/page';
import { absoluteUrl } from '../../../seo/paths';

/** Tanggal terakhir isi halaman jasa berubah (src/content/services.ts, ServicePage.tsx, FAQ-nya). */
export const SERVICES_UPDATED = '2026-10-23';

export function serviceSeo(content: ServiceContent, copy: { title: string; description: string; ogImage: string; ogImageAlt: string }): StaticPageSeo {
  return staticPage({
    path: content.path,
    updated: SERVICES_UPDATED,
    head: (data) =>
      pageHead(data, {
        path: content.path,
        title: copy.title,
        description: copy.description,
        ogImage: copy.ogImage,
        ogImageAlt: copy.ogImageAlt,
        jsonLd: [
          webPage({ path: content.path, name: content.h1, description: copy.description, mainEntity: `${absoluteUrl(content.path)}#service`, dateModified: SERVICES_UPDATED }),
          service({ path: content.path, name: content.serviceName, description: content.lead, serviceType: content.serviceType }),
          breadcrumb([
            { name: 'Beranda', path: '/' },
            { name: content.crumb, path: content.path },
          ]),
          faqPage({ path: content.path, items: faqItems(content.faqIds) }),
        ],
      }),
  });
}
