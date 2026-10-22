// @vitest-environment node
// Jalankan: npx vitest run src/seo
// Bentuk JSON-LD (docs/platform/SEO-PLAN.md §5.3 langkah 6) dicek terhadap properti wajib/dianjurkan Google:
// - Product snippet & merchant listing: name, image, offers.price, offers.priceCurrency (wajib); availability, url,
//   description, sku, brand, itemCondition (dianjurkan). https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
// - Breadcrumb: itemListElement berisi ListItem dengan position berurutan dari 1, name, item (URL absolut).
// - Organization: @id, name, legalName, url, logo PNG ≥ 112 px, contactPoint; sameAs/address hanya bila nyata.
// Juga: tanpa aggregateRating/review di mana pun, @id saling merujuk, dan JSON aman di dalam <script>.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANY_FACTS } from '../../lib/companyFacts';
import {
  ORGANIZATION_ID,
  WEBSITE_ID,
  article,
  breadcrumb,
  faqPage,
  itemList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
  service,
  socialProfiles,
} from '../jsonld';
import { getHead, getIndexableRoutes } from '../routes';
import { templatePath } from '../paths';
import { DATA, SETTINGS, TEMPLATES } from './fixtures';

type Node = Record<string, unknown>;
const nodesOf = (path: string) => getHead(path, DATA).jsonLd as Node[];
const byType = (nodes: Node[], type: string) => nodes.find((n) => n['@type'] === type) as Node;

/** Semua kunci di seluruh pohon objek. */
const allKeys = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(allKeys)
    : value && typeof value === 'object'
      ? Object.entries(value).flatMap(([k, v]) => [k, ...allKeys(v)])
      : [];

const isAbsoluteHttps = (url: unknown) => typeof url === 'string' && /^https:\/\/garudanexa\.com\//.test(url);

describe('Product + Offer (halaman template)', () => {
  it.each(TEMPLATES.map((t) => [t.slug, t] as const))('%s: properti wajib & dianjurkan merchant listing', (slug, template) => {
    const product = byType(nodesOf(templatePath(slug)), 'Product');
    expect(product['@id']).toBe(`https://garudanexa.com/template/${slug}#product`);
    expect(product.name).toBe(template.name);
    expect(product.sku).toBe(slug);
    expect(product.category).toBe(template.category);
    expect(String(product.description).length).toBeGreaterThan(20);
    expect((product.brand as Node).name).toBe(COMPANY_FACTS.name);
    const images = product.image as string[];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image).toMatch(/^https:\/\/garudanexa\.com\/.+\.(webp|png|jpe?g)$/);
    const offer = product.offers as Node;
    expect(offer['@type']).toBe('Offer');
    expect(offer.price).toBe(template.price);
    expect(offer.priceCurrency).toBe('IDR');
    expect(offer.availability).toBe('https://schema.org/InStock');
    expect(offer.itemCondition).toBe('https://schema.org/NewCondition');
    expect(offer.url).toBe(`https://garudanexa.com/template/${slug}`);
    expect(offer.seller).toEqual({ '@id': ORGANIZATION_ID });
  });

  it('tanpa ulasan/rating buatan dan tanpa LocalBusiness (keputusan default 6)', () => {
    for (const { path } of getIndexableRoutes(DATA)) {
      const keys = allKeys(getHead(path, DATA).jsonLd);
      expect(keys, path).not.toContain('aggregateRating');
      expect(keys, path).not.toContain('review');
      expect(JSON.stringify(getHead(path, DATA).jsonLd), path).not.toContain('LocalBusiness');
    }
  });
});

describe('BreadcrumbList', () => {
  it('halaman template: Beranda › Template › {Kategori} › {Nama}, position 1..n, URL absolut', () => {
    const crumbs = byType(nodesOf('/template/aura-studio'), 'BreadcrumbList');
    const items = crumbs.itemListElement as Node[];
    expect(items.map((i) => i.name)).toEqual(['Beranda', 'Template', 'Kecantikan & Klinik', 'Aura Studio']);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(items.map((i) => i['@type'])).toEqual(['ListItem', 'ListItem', 'ListItem', 'ListItem']);
    for (const item of items) expect(isAbsoluteHttps(item.item)).toBe(true);
    expect(items[2].item).toBe('https://garudanexa.com/template/kategori/kecantikan-klinik');
    expect(items[3].item).toBe('https://garudanexa.com/template/aura-studio');
  });

  it('kategori yang tidak punya halaman dilewati', () => {
    const odd = { ...TEMPLATES[0], slug: 'lain', name: 'Lain', category: 'Kategori Lain' };
    const data = { ...DATA, templates: [...TEMPLATES, odd], templateBySlug: { ...DATA.templateBySlug, lain: odd } };
    const items = (byType(getHead('/template/lain', data).jsonLd as Node[], 'BreadcrumbList').itemListElement as Node[]).map((i) => i.name);
    expect(items).toEqual(['Beranda', 'Template', 'Lain']);
  });

  it('builder: @id = halaman terakhir#breadcrumb', () => {
    expect(breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Harga', path: '/harga' }])['@id']).toBe('https://garudanexa.com/harga#breadcrumb');
  });
});

describe('Organization & WebSite', () => {
  it('Organization dari COMPANY_FACTS: logo PNG 512 px, kontak sales, tanpa alamat/sameAs selama belum ada', () => {
    const org = byType(nodesOf('/'), 'Organization');
    expect(org['@id']).toBe(ORGANIZATION_ID);
    expect(org.name).toBe('Garuda Nexa');
    expect(org.legalName).toBe('PT Garuda Nexa Bahtera');
    expect(org.url).toBe('https://garudanexa.com/');
    const logo = org.logo as Node;
    expect(logo.url).toBe('https://garudanexa.com/brand/logo-512.png');
    expect(logo.width).toBeGreaterThanOrEqual(112);
    expect(org.email).toBe(COMPANY_FACTS.email);
    expect(org.telephone).toBe(`+${COMPANY_FACTS.whatsapp}`);
    const contact = (org.contactPoint as Node[])[0];
    expect(contact).toMatchObject({ '@type': 'ContactPoint', contactType: 'sales', areaServed: 'ID', availableLanguage: ['id'] });
    expect(org).not.toHaveProperty('address'); // COMPANY_FACTS.address = null
    expect(org).not.toHaveProperty('sameAs'); // semua profil sosial di settings masih "#"
    // logo PNG yang dirujuk benar-benar ada, persegi dan ≥ 112 px
    const png = readFileSync(resolve(__dirname, '..', '..', '..', 'public', 'brand', 'logo-512.png'));
    expect(png.readUInt32BE(0)).toBe(0x89504e47);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([512, 512]);
  });

  it('sameAs hanya URL profil nyata; "#", kosong, garudanexa.id dan @garudanexa dilewati', () => {
    expect(socialProfiles(SETTINGS)).toEqual([]);
    const settings = {
      footer_instagram: 'https://www.instagram.com/garudanexabahtera/',
      footer_facebook: '#',
      footer_linkedin: 'https://www.linkedin.com/company/garuda-nexa-bahtera',
      footer_tiktok: 'https://www.tiktok.com/@garudanexa',
      footer_youtube: 'javascript:alert(1)',
      footer_twitter: 'https://garudanexa.id/',
    };
    expect(socialProfiles(settings)).toEqual([
      'https://www.instagram.com/garudanexabahtera/',
      'https://www.linkedin.com/company/garuda-nexa-bahtera',
    ]);
    expect(organization(settings).sameAs).toHaveLength(2);
  });

  it('WebSite: nama situs, id-ID, penerbit → organisasi, tanpa SearchAction', () => {
    const site = byType(nodesOf('/'), 'WebSite');
    expect(site).toMatchObject({ '@id': WEBSITE_ID, name: 'Garuda Nexa', inLanguage: 'id-ID', publisher: { '@id': ORGANIZATION_ID } });
    expect(site).not.toHaveProperty('potentialAction');
  });

  it('setiap rujukan @id menunjuk node yang ada di halaman yang sama', () => {
    for (const { path } of getIndexableRoutes(DATA)) {
      const nodes = nodesOf(path);
      const ids = new Set<string>();
      const collect = (value: unknown) => {
        if (Array.isArray(value)) return value.forEach(collect);
        if (value && typeof value === 'object') {
          const node = value as Node;
          if (typeof node['@id'] === 'string' && Object.keys(node).length > 1) ids.add(node['@id']);
          Object.values(node).forEach(collect);
        }
      };
      collect(nodes);
      const refs: string[] = [];
      const findRefs = (value: unknown) => {
        if (Array.isArray(value)) return value.forEach(findRefs);
        if (value && typeof value === 'object') {
          const node = value as Node;
          if (Object.keys(node).length === 1 && typeof node['@id'] === 'string') refs.push(node['@id']);
          else Object.values(node).forEach(findRefs);
        }
      };
      findRefs(nodes);
      for (const ref of refs) expect(ids.has(ref), `${path}: ${ref}`).toBe(true);
    }
  });
});

describe('builder lain', () => {
  it('service tanpa harga, provider → organisasi, area Indonesia', () => {
    const node = service({ path: '/jasa-pembuatan-website', name: 'Jasa pembuatan website', description: 'Website custom.', serviceType: 'Pembuatan website' });
    expect(node).toMatchObject({ '@type': 'Service', provider: { '@id': ORGANIZATION_ID }, areaServed: { '@type': 'Country', name: 'Indonesia' } });
    expect(allKeys(node)).not.toContain('offers');
    expect(allKeys(node)).not.toContain('price');
  });

  it('itemList, article, faqPage', () => {
    const list = itemList({ path: '/template', name: 'Template', items: [{ name: 'A', path: '/template/a' }] });
    expect(list.itemListElement).toEqual([{ '@type': 'ListItem', position: 1, name: 'A', url: 'https://garudanexa.com/template/a' }]);
    const art = article({
      path: '/panduan/x',
      headline: 'Judul',
      description: 'Ringkasan',
      datePublished: '2026-11-01',
      dateModified: '2026-11-02',
      author: { type: 'Organization', name: 'Garuda Nexa' },
      image: 'https://garudanexa.com/og/panduan.jpg',
    });
    expect(art).toMatchObject({ '@type': 'Article', author: { '@id': ORGANIZATION_ID }, publisher: { '@id': ORGANIZATION_ID }, dateModified: '2026-11-02' });
    const person = article({ ...{ path: '/panduan/y', headline: 'J', description: 'R', datePublished: '2026-11-01', dateModified: '2026-11-01', image: 'x' }, author: { type: 'Person', name: 'Nama Asli', url: 'https://www.linkedin.com/in/x' } });
    expect(person.author).toEqual({ '@type': 'Person', name: 'Nama Asli', url: 'https://www.linkedin.com/in/x' });
    const faq = faqPage({ path: '/harga', items: [{ question: 'Apa?', answer: 'Ini.' }] });
    expect(faq.mainEntity).toEqual([{ '@type': 'Question', name: 'Apa?', acceptedAnswer: { '@type': 'Answer', text: 'Ini.' } }]);
  });

  it('serializeJsonLd tidak bisa menutup <script> dan tetap JSON yang sah', () => {
    const doc = jsonLdGraph([{ '@type': 'Thing', name: '</script><script>alert(1)</script> & \u2028' }]);
    const text = serializeJsonLd(doc);
    expect(text).not.toMatch(/<|>|&|\u2028/);
    expect(JSON.parse(text)).toEqual(doc);
  });
});
