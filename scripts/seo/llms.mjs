// /llms.txt dan /llms-full.txt (docs/platform/SEO-PLAN.md §5.4 langkah 3, Lampiran C; https://llmstxt.org/).
// Dipanggil prerender WP2 saat deploy:
//   buildLlmsTxt({ facts: COMPANY_FACTS, templates: data.templates, entries: getIndexableRoutes(data) })
//   buildLlmsFullTxt({ facts, templates, entries })
// Semua fakta dari COMPANY_FACTS (field null tidak ditulis), harga & daftar template dari data API saat build, tautan
// hanya ke halaman yang `index` (entries), jadi halaman stub tidak pernah disebut. Tiap blok diberi tanggal.
// Argumen opsional (bila tersedia di prerender):
//   date         YYYY-MM-DD data diambil (atau builtAt ISO dari prerender; bawaan: hari ini, UTC) → "harga per {tanggal}"
//   pages        { [path]: { title, description } } dari getHead, untuk keterangan tautan
//   faqs         [{ question, answer }] FAQ yang sama persis dengan di situs (WP6); bawaan: tanya jawab dari COMPANY_FACTS
//   guides       [{ slug, title, description, dateModified }] artikel panduan (WP8)
//   cmsSections  { [template_code]: string[] } nama bagian yang bisa diubah lewat CMS per template
// Disajikan sebagai text/plain; charset=utf-8 (snippet .htaccess untuk WP2 ada di docs/platform/SEO-RUNBOOK.md).
// Modul ESM murni tanpa dependensi.

const SITE = 'https://garudanexa.com';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-10-23" → "23 Oktober 2026". */
export function formatDateId(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!match) return String(iso ?? '');
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

const today = () => new Date().toISOString().slice(0, 10);
const toDate = (value) => /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''))?.[1] ?? null;
const latest = (values) => values.map(toDate).filter(Boolean).sort().pop() ?? null;

/** 1390000 → "Rp1.390.000" (sama dengan formatPriceFull di src/seo/format.ts). */
export const formatPrice = (price) => `Rp${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const isPrice = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const sentence = (value) => {
  const text = clean(value);
  return !text || /[.!?]$/.test(text) ? text : `${text}.`;
};

/** Template terbit dengan slug sah, urut sort_order. */
export function publishedTemplates(templates) {
  return (Array.isArray(templates) ? templates : [])
    .filter((t) => t && typeof t.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug) && t.status !== 'draft')
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

/** Rentang harga "Rp990.000–Rp1.790.000" (atau satu harga), null bila tidak ada harga. */
export function priceRange(templates) {
  const prices = publishedTemplates(templates).map((t) => Number(t.price)).filter(isPrice);
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`;
}

/** "Template website + setup awal, Domain tahun pertama, …" → kalimat daftar dengan "dan". */
const joinList = (items) => {
  const list = items.map(clean).filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')}, dan ${list[list.length - 1]}`;
};

const lowerFirst = (value) => (value ? value.charAt(0).toLowerCase() + value.slice(1) : value);

/** Label & keterangan bawaan per path (dipakai bila `pages` tidak diberikan). Hanya ditulis bila path-nya `index`. */
const PAGE_LABELS = {
  '/': ['Beranda', 'template website siap pakai dan jasa custom'],
  '/template': ['Katalog template', 'semua template, harga, kategori, dan demo'],
  '/jasa-pembuatan-website': ['Jasa pembuatan website', 'website custom, konsultasi gratis lalu penawaran'],
  '/jasa-pembuatan-aplikasi-mobile': ['Jasa pembuatan aplikasi mobile', 'aplikasi Android & iOS custom, konsultasi gratis'],
  '/pesan-custom': ['Pesan custom', 'formulir kebutuhan website atau aplikasi, konsultasi gratis'],
  '/harga': ['Harga', 'harga template, yang sudah termasuk, dan cara penentuan biaya custom'],
  '/syarat-ketentuan': ['Syarat & Ketentuan', ''],
  '/kebijakan-privasi': ['Kebijakan Privasi', ''],
  '/kebijakan-pengembalian-dana': ['Kebijakan Pengembalian Dana', ''],
  '/panduan': ['Panduan', 'artikel tentang biaya, domain & hosting, dan memilih website'],
  '/tentang': ['Tentang Garuda Nexa', ''],
  '/kontak': ['Kontak', 'WhatsApp, email'],
};

function context({ facts, templates, entries, date, builtAt, pages = {}, guides = [] }) {
  if (!facts || !facts.name || !facts.url) throw new Error('[llms] facts (COMPANY_FACTS) wajib diisi');
  const origin = String(facts.url || SITE).replace(/\/+$/, '');
  const list = publishedTemplates(templates);
  const indexable = new Map((Array.isArray(entries) ? entries : []).map((e) => [e.path, e]));
  const url = (path) => (path === '/' ? `${origin}/` : `${origin}${path}`);
  const label = (path) => {
    const fromHead = pages[path];
    const [name, note] = PAGE_LABELS[path] ?? [path, ''];
    const title = clean(fromHead?.title ?? '').replace(/\s*\|\s*Garuda Nexa$/, '') || name;
    return { title, note: clean(fromHead?.description ?? '') || note };
  };
  const link = (path, override) => {
    if (!indexable.has(path)) return null;
    const { title, note } = label(path);
    const text = override ?? note;
    return `- [${title}](${url(path)})${text ? `: ${text}` : ''}`;
  };
  const indexGuides = (Array.isArray(guides) ? guides : []).filter((g) => g && indexable.has(`/panduan/${g.slug}`));
  return { facts, origin, list, indexable, url, link, label, date: toDate(date ?? builtAt) ?? today(), guides: indexGuides };
}

const summary = (facts) =>
  `> ${facts.name} (${facts.legalName}, Indonesia) menjual template website siap pakai yang sudah termasuk domain, hosting, dan SSL tahun pertama, serta menerima jasa pembuatan website dan aplikasi mobile Android/iOS custom.`;

function factLines({ facts, list, date }) {
  const pkg = facts.templatePackage ?? {};
  const range = priceRange(list);
  const lines = [];
  if (range) lines.push(`- Harga template: ${range} (per ${formatDateId(date)})${pkg.renewalCost ? `; tahun ke-2: ${clean(pkg.renewalCost)}` : ''}`);
  if (Array.isArray(pkg.includes) && pkg.includes.length) lines.push(`- Sudah termasuk: ${lowerFirst(joinList(pkg.includes))}`);
  if (pkg.activationTime) lines.push(`- Website template aktif: ${clean(pkg.activationTime)} setelah pembayaran dikonfirmasi`);
  lines.push(`- Bayar online via ${clean(pkg.paymentProvider || 'Midtrans')}; ${lowerFirst(sentence(pkg.contentManagement || 'isi website dikelola sendiri lewat CMS.'))}`);
  if (facts.customPricing) lines.push(`- Jasa custom: ${lowerFirst(sentence(facts.customPricing))}`);
  if (facts.refundGuarantee) lines.push(`- Jaminan: ${lowerFirst(sentence(facts.refundGuarantee))}`);
  lines.push(`- Kontak: WhatsApp ${facts.whatsappDisplay}, ${facts.email}`);
  if (facts.address) {
    const a = facts.address;
    lines.push(`- Alamat: ${[a.streetAddress, a.locality, a.region, a.postalCode].filter(Boolean).join(', ')}`);
  }
  if (facts.serviceHours) lines.push(`- Jam layanan: ${clean(facts.serviceHours)}`);
  return lines;
}

const templateLine = (ctx, t) => {
  const price = isPrice(Number(t.price)) ? `, ${formatPrice(Number(t.price))}` : '';
  const lead = clean(t.short_description);
  return `- [${clean(t.name)}](${ctx.url(`/template/${t.slug}`)}): template ${clean(t.category) || 'website'}${price}${lead ? `. ${sentence(lead)}` : ''}`;
};

const section = (title, lines) => {
  const body = lines.filter(Boolean);
  return body.length ? [`## ${title}`, ...body, ''] : [];
};

const LEGAL = ['/syarat-ketentuan', '/kebijakan-privasi', '/kebijakan-pengembalian-dana'];

/** /llms.txt: ringkasan + tautan (format Lampiran C). */
export function buildLlmsTxt(input) {
  const ctx = context(input);
  const { facts, list, link } = ctx;
  const templateLinks = list.filter((t) => ctx.indexable.has(`/template/${t.slug}`)).map((t) => templateLine(ctx, t));
  const lines = [
    `# ${facts.name}`,
    summary(facts),
    '',
    `Diperbarui ${formatDateId(ctx.date)}.`,
    '',
    ...factLines(ctx),
    '',
    ...section('Template website', [link('/template'), ...templateLinks]),
    ...section('Jasa custom', [link('/jasa-pembuatan-website'), link('/jasa-pembuatan-aplikasi-mobile'), link('/pesan-custom')]),
    ...section('Harga & kebijakan', [link('/harga'), ...LEGAL.map((path) => link(path))]),
    ...section('Panduan', [
      link('/panduan'),
      ...ctx.guides.map((g) => `- [${clean(g.title)}](${ctx.url(`/panduan/${g.slug}`)})${g.description ? `: ${clean(g.description)}` : ''}`),
    ]),
    ...section('Optional', [
      link('/tentang'),
      link('/kontak'),
      `- [Informasi lengkap](${ctx.url('/llms-full.txt')}): fakta perusahaan, detail setiap template, jasa custom, tanya jawab, kebijakan`,
    ]),
  ];
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** Tanya jawab dari COMPANY_FACTS (dipakai bila FAQ situs tidak diberikan). Field null tidak ditulis. */
export function factFaqs(facts, list) {
  const pkg = facts.templatePackage ?? {};
  const range = priceRange(list);
  const faqs = [];
  if (Array.isArray(pkg.includes) && pkg.includes.length) {
    faqs.push({
      question: 'Apa saja yang sudah termasuk dalam harga template?',
      answer: `${joinList(pkg.includes)}.${range ? ` Harga template saat ini ${range}.` : ''}`,
    });
  }
  if (pkg.renewalCost) faqs.push({ question: 'Berapa biaya mulai tahun ke-2?', answer: sentence(pkg.renewalCost) });
  if (pkg.activationTime) faqs.push({ question: 'Berapa lama sampai website aktif?', answer: sentence(`${pkg.activationTime} setelah pembayaran dikonfirmasi`) });
  faqs.push({ question: 'Bagaimana cara membayar?', answer: `Pembayaran dilakukan online lewat ${clean(pkg.paymentProvider || 'Midtrans')}.` });
  if (pkg.contentManagement) faqs.push({ question: 'Siapa yang mengubah isi website?', answer: sentence(pkg.contentManagement) });
  if (facts.customPricing) faqs.push({ question: 'Berapa biaya website atau aplikasi custom?', answer: sentence(facts.customPricing) });
  if (facts.refundGuarantee) faqs.push({ question: 'Bagaimana jika pesanan yang sudah dibayar ditolak?', answer: sentence(facts.refundGuarantee) });
  if (facts.contentOwnership) faqs.push({ question: 'Siapa pemilik isi website?', answer: sentence(facts.contentOwnership) });
  return faqs;
}

/** /llms-full.txt: fakta, detail per template, jasa, tanya jawab, kebijakan, panduan (Lampiran C). */
export function buildLlmsFullTxt(input) {
  const ctx = context(input);
  const { facts, list, url, indexable, date } = ctx;
  const pkg = facts.templatePackage ?? {};
  const cms = input.cmsSections ?? {};
  const out = [`# ${facts.name}: informasi lengkap`, summary(facts), '', `Diperbarui ${formatDateId(date)}. Versi ringkas: ${url('/llms.txt')}`, ''];

  out.push('## Fakta perusahaan', `Diperbarui ${formatDateId(date)}.`, '');
  out.push(`- Nama merek: ${facts.name}`, `- Badan hukum: ${facts.legalName}`, `- Situs: ${url('/')}`);
  if (facts.areaServed?.label) out.push(`- Area layanan: ${clean(facts.areaServed.label)}`);
  if (facts.nib) out.push(`- NIB: ${clean(facts.nib)}`);
  if (facts.pse) out.push(`- Tanda daftar PSE: ${clean(facts.pse)}`);
  out.push(...factLines(ctx));
  if (Array.isArray(facts.services) && facts.services.length) {
    out.push('- Layanan:');
    facts.services.forEach((s, i) => out.push(`  ${i + 1}. ${clean(s.name)}: ${sentence(s.summary)}${indexable.has(s.path) ? ` ${url(s.path)}` : ''}`));
  }
  if (Array.isArray(facts.ownProducts) && facts.ownProducts.length) out.push(`- Produk sendiri: ${facts.ownProducts.map(clean).join(', ')}`);
  out.push('');

  const shown = list.filter((t) => indexable.has(`/template/${t.slug}`));
  if (shown.length) {
    out.push('## Template website', `Diperbarui ${formatDateId(latest(shown.map((t) => t.updated_at)) ?? date)}.`, '');
    for (const t of shown) {
      const demo = /^https?:\/\//i.test(String(t.demo_url ?? '')) ? clean(t.demo_url) : url(`/demo/${t.slug}`);
      const features = (Array.isArray(t.features) ? t.features : []).map(clean).filter(Boolean);
      const sections = (cms[t.template_code] ?? []).map(clean).filter(Boolean);
      out.push(`### ${clean(t.name)}`, `- Halaman: ${url(`/template/${t.slug}`)}`);
      if (t.category) out.push(`- Kategori: ${clean(t.category)}`);
      if (isPrice(Number(t.price))) {
        const includes = Array.isArray(pkg.includes) && pkg.includes.length ? `, sudah termasuk ${lowerFirst(joinList(pkg.includes))}` : '';
        out.push(`- Harga: ${formatPrice(Number(t.price))} (per ${formatDateId(date)})${includes}`);
      }
      if (t.short_description) out.push(`- Ringkasan: ${sentence(t.short_description)}`);
      if (features.length) out.push(`- Fitur: ${features.join('; ')}`);
      out.push(`- Bisa diubah sendiri lewat CMS: ${sections.length ? sections.join(', ') : lowerFirst(sentence(pkg.contentManagement || 'isi website'))}`);
      out.push(`- Demo: ${demo} (konten demo fiktif)`);
      const paragraphs = String(t.description ?? '')
        .split(/\n\s*\n/)
        .map(clean)
        .filter(Boolean);
      if (paragraphs.length) out.push('', ...paragraphs.flatMap((p) => [p, '']));
      else out.push('');
    }
  }

  out.push('## Jasa custom', `Diperbarui ${formatDateId(date)}.`, '');
  for (const s of (facts.services ?? []).filter((x) => x.key !== 'template')) {
    out.push(`- ${clean(s.name)}: ${sentence(s.summary)}${indexable.has(s.path) ? ` ${url(s.path)}` : ''}`);
  }
  if (facts.customPricing) out.push(`- Biaya: ${lowerFirst(sentence(facts.customPricing))}`);
  out.push(
    `- Cara memesan: isi formulir di ${url('/pesan-custom')} atau hubungi WhatsApp ${facts.whatsappDisplay}; konsultasi gratis, lalu penawaran dikirim.`,
    '',
  );

  const faqs = Array.isArray(input.faqs) && input.faqs.length ? input.faqs : factFaqs(facts, list);
  out.push('## Tanya jawab', `Diperbarui ${formatDateId(date)}.`, '');
  for (const f of faqs) out.push(`### ${clean(f.question)}`, clean(f.answer), '');

  const legal = LEGAL.filter((path) => indexable.has(path));
  if (legal.length || facts.refundGuarantee) {
    out.push('## Kebijakan', `Diperbarui ${formatDateId(latest(legal.map((p) => indexable.get(p)?.lastmod)) ?? date)}.`, '');
    for (const path of legal) {
      const { title, note } = ctx.label(path);
      out.push(`- ${title}: ${url(path)}${note ? `. ${sentence(note)}` : ''}`);
    }
    if (facts.refundGuarantee) out.push(`- Pengembalian dana: ${sentence(facts.refundGuarantee)}`);
    if (facts.contentOwnership) out.push(`- Kepemilikan isi: ${sentence(facts.contentOwnership)}`);
    out.push('');
  }

  if (ctx.guides.length) {
    out.push('## Panduan', `Diperbarui ${formatDateId(latest(ctx.guides.map((g) => g.dateModified)) ?? date)}.`, '');
    for (const g of ctx.guides) out.push(`- ${clean(g.title)}: ${url(`/panduan/${g.slug}`)}${g.description ? `. ${sentence(g.description)}` : ''}`);
    out.push('');
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}
