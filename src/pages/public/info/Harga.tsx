// /harga (docs/platform/SEO-PLAN.md §5.6 langkah 6): "Harga berlaku per {tanggal}", tabel semua template dari data,
// harga domain per ekstensi, yang sudah termasuk + biaya tahun berikutnya (hosting & jasa + domain, dengan contoh), cara
// memperpanjang, cara biaya custom ditentukan (tanpa angka), dua tabel perbandingan (Lampiran D + cara membuat website,
// tanpa nama pesaing), Midtrans, jaminan pengembalian dana, FAQ.
// Angka harga template HANYA dari data template (get_templates). Domain tidak termasuk harga template (pemilik
// 2026-10-25): harganya dari get_domain_prices (render awal = tabel bawaan domainPricing.ts, sama dengan halaman pesan),
// hosting & jasa tahun ke-2 dari setting template_hosting_renewal_price (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md).
import React from 'react';
import { Check, ChevronDown, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaqAccordion } from '../../../components/sections/faq/FaqAccordion';
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { DOMAIN_TLDS, hostingRenewalPrice, RENEWAL_MAX_YEARS_AHEAD, RENEWAL_YEAR_OPTIONS, rupiahCompact, type DomainTld } from '../../../lib/domainPricing';
import { useDomainPrices } from '../../../lib/useDomainPrices';
import { faqContext, faqItems, PRICING_FAQ_IDS } from '../../../content/faq';
import {
  buildOptionsTable,
  CMS_INCLUDE,
  CUSTOM_COST_FACTORS,
  domainPriceFrom,
  renewalExamples,
  shortPriceRange,
  templateVsCustomTable,
} from '../../../content/pricing';
import { getTemplatePricing, getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../../hooks/useSiteSettings';
import { useGuides } from '../../../hooks/useGuides';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { formatDateId, formatPriceFull, formatPriceRange, isPrice } from '../../../seo/format';
import { ARTICLE_SLUGS, HUB_PATHS, LEGAL_PATHS, categoryPath, templatePath } from '../../../seo/paths';
import { categorySlugOf } from '../../../seo/templateSeo';
import { RENEWAL_WARNING_DAYS } from '../../account/components/activePeriod';
import { guideLink } from '../catalog/guideLink';
import { ComparisonTable } from './ComparisonTable';
import { InfoPage, InfoSection, Prose } from './InfoPage';

const TextLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="link-site font-medium">
    {children}
  </Link>
);

/** Tautan ke section lain di halaman ini (#harga-domain, #perpanjangan). */
const AnchorLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} className="link-site font-medium">
    {children}
  </a>
);

/** Panduan biaya di pasar (Lampiran A.3); hanya artikel yang sudah terbit yang ditautkan. */
const COST_GUIDES = [
  { slug: ARTICLE_SLUGS.websiteCost, anchor: 'biaya pembuatan website company profile' },
  { slug: ARTICLE_SLUGS.appCost, anchor: 'biaya pembuatan aplikasi Android & iOS' },
] as const;

const CostGuides: React.FC = () => {
  const { articles } = useGuides();
  const guides = COST_GUIDES.map((guide) => ({ ...guide, link: guideLink([guide.slug], articles) })).filter((guide) => guide.link.article);
  if (guides.length === 0) return null;
  return (
    <>
      {' '}
      Kisaran biaya di pasar kami bahas di panduan{' '}
      {guides.map((guide, index) => (
        <React.Fragment key={guide.slug}>
          {index > 0 && ' dan '}
          <TextLink to={guide.link.href}>{guide.anchor}</TextLink>
        </React.Fragment>
      ))}
      .
    </>
  );
};

/** Ekstensi yang disorot di tabel harga domain (paling banyak dipilih). */
const POPULAR_TLDS: ReadonlySet<string> = new Set(['com', 'id']);
/** Ekstensi tabel bawaan; ekstensi tambahan dari DewaBiz tampil di daftar lipat di bawah tabel. */
const DEFAULT_TLDS: ReadonlySet<string> = new Set(DOMAIN_TLDS.map((t) => t.tld));

/** "1, 2, atau 3" (pilihan masa perpanjangan, sama dengan backend). */
const YEAR_CHOICES = `${RENEWAL_YEAR_OPTIONS.slice(0, -1).join(', ')}, atau ${RENEWAL_YEAR_OPTIONS[RENEWAL_YEAR_OPTIONS.length - 1]}`;

/** Tabel harga domain per tahun: ekstensi, harga, keterangan (syarat). HP: keterangan di bawah ekstensi. */
const DomainPriceTable: React.FC<{ domains: readonly DomainTld[]; dateText: string; priceDate: string }> = ({ domains, dateText, priceDate }) => {
  const main = domains.filter((d) => DEFAULT_TLDS.has(d.tld));
  const rows = main.length ? main : domains;
  const others = main.length ? domains.filter((d) => !DEFAULT_TLDS.has(d.tld)) : [];
  return (
    <div className="card-flat overflow-hidden">
      <table className="w-full border-collapse text-left text-[13px] sm:text-[15px]">
        <caption className="sr-only">Harga domain per tahun per ekstensi, per {dateText}</caption>
        <thead className="bg-alt text-[11px] uppercase tracking-[0.08em] text-subtle sm:text-xs">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold sm:px-6">
              Ekstensi
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold sm:px-6">
              Harga per tahun
            </th>
            <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell sm:pr-6">
              Keterangan
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const popular = POPULAR_TLDS.has(row.tld);
            const note = row.requirement ?? 'Cukup data pemesan';
            return (
              <tr key={row.tld} className={`border-t border-line ${popular ? 'bg-brand-50/60' : ''}`}>
                <th scope="row" className="px-4 py-3.5 align-top font-normal sm:px-6 sm:py-4">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">.{row.tld}</span>
                    {popular && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-inset ring-brand-100">
                        Populer
                      </span>
                    )}
                  </span>
                  {/* HP: keterangan di bawah ekstensi (kolom keterangan disembunyikan) */}
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted sm:hidden">{note}</span>
                </th>
                <td className="whitespace-nowrap px-4 py-3.5 text-right align-top font-semibold tabular-nums text-fg sm:px-6 sm:py-4">
                  {rupiahCompact(row.price)}
                </td>
                <td className="hidden px-4 py-3.5 align-top leading-relaxed text-muted sm:table-cell sm:py-4 sm:pr-6">{note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {others.length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-fg sm:px-6 [&::-webkit-details-marker]:hidden">
            Ekstensi lain ({others.length})
            <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="grid gap-x-6 gap-y-2 px-4 pb-4 text-[13px] sm:grid-cols-2 sm:px-6 sm:text-sm lg:grid-cols-3">
            {others.map((row) => (
              <li key={row.tld} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5">
                <span className="font-medium text-fg">.{row.tld}</span>
                <span className="tabular-nums text-muted">{rupiahCompact(row.price)}/tahun</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-subtle sm:px-6 sm:text-[13px]">
        Harga per <time dateTime={priceDate}>{dateText}</time>, dalam rupiah, sama untuk tahun pertama dan perpanjangan.
      </p>
    </div>
  );
};

/** Contoh biaya per tahun mulai tahun ke-2: hosting & jasa + domain = total. HP: rincian di bawah nama domain. */
const RenewalExampleTable: React.FC<{ hosting: number; domains: readonly DomainTld[] }> = ({ hosting, domains }) => {
  const examples = renewalExamples(hosting, domains);
  if (examples.length === 0) return null;
  return (
    <div className="card-flat overflow-hidden">
      <table className="w-full border-collapse text-left text-[13px] sm:text-sm">
        <caption className="px-4 pt-4 text-left text-sm font-semibold text-fg sm:px-5">Contoh biaya per tahun mulai tahun ke-2</caption>
        <thead className="text-[11px] uppercase tracking-[0.08em] text-subtle">
          <tr>
            <th scope="col" className="px-4 pb-2 pt-3 font-semibold sm:px-5">
              Contoh domain
            </th>
            <th scope="col" className="hidden px-3 pb-2 pt-3 text-right font-semibold sm:table-cell">
              Hosting & jasa
            </th>
            <th scope="col" className="hidden px-3 pb-2 pt-3 text-right font-semibold sm:table-cell">
              Domain
            </th>
            <th scope="col" className="px-4 pb-2 pt-3 text-right font-semibold sm:px-5">
              Total per tahun
            </th>
          </tr>
        </thead>
        <tbody>
          {examples.map((row) => (
            <tr key={row.tld} className="border-t border-line">
              <th scope="row" className="px-4 py-3 align-top font-normal sm:px-5">
                <span className="font-medium text-fg">namabisnis.{row.tld}</span>
                <span className="mt-0.5 block text-xs tabular-nums text-muted sm:hidden">
                  {rupiahCompact(row.hosting)} + {rupiahCompact(row.domain)}
                </span>
              </th>
              <td className="hidden whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-muted sm:table-cell">{rupiahCompact(row.hosting)}</td>
              <td className="hidden whitespace-nowrap px-3 py-3 text-right align-top tabular-nums text-muted sm:table-cell">{rupiahCompact(row.domain)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right align-top font-semibold tabular-nums text-fg sm:px-5">{rupiahCompact(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function Harga() {
  const { settings } = useSiteSettings();
  const { status, templates } = usePublishedTemplates();
  const { domains } = useDomainPrices();
  const priceDate = usePriceDate();
  const dateText = formatDateId(priceDate);
  const pricing = getTemplatePricing(settings);
  const hosting = hostingRenewalPrice(settings);
  const domainFrom = rupiahCompact(domainPriceFrom(domains));
  const range = formatPriceRange(templates.map((t) => t.price));
  const pkg = COMPANY_FACTS.templatePackage;
  const whatsapp = whatsappUrl(getWhatsappNumber(settings), 'Halo Admin, saya ingin bertanya tentang harga template atau jasa custom Garuda Nexa.');
  const renewalWhatsapp = whatsappUrl(getWhatsappNumber(settings), 'Halo Admin, saya ingin bertanya tentang perpanjangan website template saya.');
  const faqs = faqItems(PRICING_FAQ_IDS, faqContext(templates));
  const compare = templateVsCustomTable(
    { priceRange: shortPriceRange(templates), priceDate, hostingRenewal: hosting },
    { full: true, formatDate: formatDateId },
  );
  const priced = templates.filter((t) => isPrice(t.price));

  const renewalSteps: { title: string; text: React.ReactNode }[] = [
    {
      title: 'Pantau masa aktif',
      text: `Tanggal berakhir hosting dan domain tampil di detail pesanan, lengkap dengan hitung mundur. Mulai ${RENEWAL_WARNING_DAYS} hari sebelum berakhir, Akun Saya menampilkan pengingat perpanjangan.`,
    },
    {
      title: `Pilih ${YEAR_CHOICES} tahun`,
      text: (
        <>
          Buka <TextLink to="/akun">Akun Saya</TextLink>, pilih pesanan di <span className="font-medium text-fg">Pesanan saya</span>, lalu tekan{' '}
          <span className="font-medium text-fg">Perpanjang masa aktif</span>. Totalnya langsung terlihat: hosting & jasa ditambah domain, dikali
          jumlah tahun.
        </>
      ),
    },
    {
      title: `Bayar lewat ${pkg.paymentProvider}`,
      text: `Pilih metode pembayaran yang tersedia di ${pkg.paymentProvider}. Setelah pembayaran berhasil, masa aktif hosting dan domain bertambah otomatis.`,
    },
    {
      title: 'Simpan notanya',
      text: 'Nota perpanjangan resmi tersedia di detail pesanan setelah lunas, dan bisa Anda lihat atau unduh kapan saja.',
    },
  ];

  const renewalNotes: { title: string; text: React.ReactNode }[] = [
    {
      title: 'Masa aktif baru dihitung dari mana?',
      text: `Dari tanggal berakhir yang sedang berjalan, jadi memperpanjang lebih awal tidak memotong sisa masa aktif. Bila masa aktif sudah lewat, masa baru dihitung dari tanggal pembayaran. Masa aktif paling lama ${RENEWAL_MAX_YEARS_AHEAD} tahun ke depan.`,
    },
    {
      title: 'Harga yang berlaku',
      text: (
        <>
          Biaya perpanjangan mengikuti harga di halaman ini saat Anda membayar: hosting & jasa {rupiahCompact(hosting)}/tahun ditambah{' '}
          <AnchorLink href="#harga-domain">harga domain</AnchorLink> sesuai ekstensinya. Tagihan perpanjangan yang belum dibayar bisa Anda
          batalkan sendiri.
        </>
      ),
    },
    {
      title: 'Bila tidak diperpanjang',
      text: (
        <>
          Setelah masa aktif berakhir, situs dapat dinonaktifkan sementara sampai perpanjangan dibayar. Domain yang kedaluwarsa dan sudah
          melewati masa tenggang registri bisa didaftarkan orang lain, sehingga nama itu bisa hilang. Rinciannya ada di{' '}
          <TextLink to={LEGAL_PATHS.terms}>Syarat & Ketentuan</TextLink>.
        </>
      ),
    },
    {
      title: 'Butuh bantuan?',
      text: (
        <>
          Bila domain Anda belum bisa diperpanjang online atau ada pertanyaan tentang tagihan,{' '}
          <a href={renewalWhatsapp} target="_blank" rel="noopener noreferrer" className="link-site font-medium">
            hubungi kami via WhatsApp
            <span className="sr-only"> (tab baru)</span>
          </a>
          .
        </>
      ),
    },
  ];

  return (
    <InfoPage
      crumb="Harga"
      badge="Harga"
      title="Harga template website & jasa pembuatan website"
      lead={
        <>
          <p>
            Harga setiap template {COMPANY_FACTS.name} tertera jelas{range ? `, saat ini ${range}` : ''}, dan sudah termasuk setup awal, hosting,
            serta SSL tahun pertama. Domain dipilih saat memesan, mulai {domainFrom}/tahun. Website dan aplikasi custom dihitung lewat penawaran
            tertulis setelah konsultasi gratis.
          </p>
          <p className="mt-3 text-[13px] text-subtle sm:text-sm">
            Harga berlaku per <time dateTime={priceDate}>{dateText}</time>.
          </p>
        </>
      }
      actions={
        <>
          <Link to={HUB_PATHS.catalog} className="btn btn-primary btn-lg max-sm:flex-1">
            Pilih Template
          </Link>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg max-sm:flex-1">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Konsultasi Gratis
            <span className="sr-only">(tab baru)</span>
          </a>
        </>
      }
    >
      <InfoSection
        id="daftar-harga"
        title="Daftar harga template website"
        intro={
          <p>
            Satu harga per template untuk tahun pertama, ditambah harga domain yang Anda pilih saat memesan. Klik nama template untuk melihat
            isi halamannya, galeri, dan demonya.
          </p>
        }
      >
        <div className="card-flat overflow-hidden">
          <table className="w-full border-collapse text-left text-[13px] sm:text-[15px]">
            <caption className="sr-only">Harga template website per {dateText}</caption>
            <thead className="bg-alt text-[11px] uppercase tracking-[0.08em] text-subtle sm:text-xs">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold sm:px-6">
                  Template
                </th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                  Kategori
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold sm:px-6">
                  Harga
                </th>
              </tr>
            </thead>
            <tbody>
              {priced.map((template) => {
                const category = categorySlugOf(template.category);
                return (
                  <tr key={template.slug} className="border-t border-line">
                    <th scope="row" className="px-4 py-3.5 align-top font-normal sm:px-6 sm:py-4">
                      <Link to={templatePath(template.slug)} className="font-semibold text-fg transition-colors hover:text-primary">
                        {template.name}
                      </Link>
                      {/* HP: kategori di bawah nama (kolom kategori disembunyikan) */}
                      <span className="mt-0.5 block text-xs text-muted sm:hidden">{template.category}</span>
                    </th>
                    <td className="hidden px-4 py-3.5 align-top text-muted sm:table-cell sm:py-4">
                      {category ? (
                        <Link to={categoryPath(category)} className="transition-colors hover:text-primary">
                          {template.category}
                        </Link>
                      ) : (
                        template.category
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right align-top font-semibold tabular-nums text-fg sm:px-6 sm:py-4">
                      {formatPriceFull(template.price)}
                    </td>
                  </tr>
                );
              })}
              {priced.length === 0 && (
                <tr className="border-t border-line">
                  <td colSpan={3} className="px-4 py-6 text-muted sm:px-6">
                    {status === 'loading' ? (
                      <span className="block h-4 w-2/3 animate-pulse rounded bg-alt" aria-label="Memuat harga template" />
                    ) : (
                      <>
                        Daftar harga belum bisa dimuat. Lihat harga di <TextLink to={HUB_PATHS.catalog}>katalog template</TextLink>.
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-subtle sm:px-6 sm:text-[13px]">
            Harga berlaku per <time dateTime={priceDate}>{dateText}</time>, dalam rupiah, untuk satu website pada satu domain. Harga domain
            terpisah, lihat <AnchorLink href="#harga-domain">harga domain</AnchorLink>.
          </p>
        </div>
      </InfoSection>

      <InfoSection
        id="harga-domain"
        title="Harga domain"
        intro={
          <p>
            Domain dipilih dan dibayar bersama pesanan template, mulai {domainFrom}/tahun. Harga per tahun di bawah sama untuk tahun pertama dan
            untuk perpanjangan tahun berikutnya.
          </p>
        }
      >
        <DomainPriceTable domains={domains} dateText={dateText} priceDate={priceDate} />
        <Prose
          className="mt-6"
          paragraphs={[
            'Ketersediaan nama domain dicek langsung di halaman pesan, sebelum Anda membayar. Setelah pembayaran berhasil, domain didaftarkan atas nama Anda sesuai data pemesan.',
            'Ekstensi dengan syarat khusus, seperti .co.id untuk badan usaha atau .sch.id untuk sekolah, memerlukan dokumen pendukung sebelum domain bisa didaftarkan.',
          ]}
        />
      </InfoSection>

      <InfoSection
        id="sudah-termasuk"
        title="Sudah termasuk & biaya tahun berikutnya"
        intro={<p>Harga template bukan harga desain saja. Untuk tahun pertama, yang Anda bayar di awal sudah mencakup semua yang dibutuhkan agar website online:</p>}
      >
        <div className="space-y-4 sm:space-y-6">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...pricing.includes, CMS_INCLUDE].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-[20px] bg-surface p-4 text-sm text-fg ring-1 ring-inset ring-line sm:text-[15px]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="grid gap-5 rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10 lg:p-8">
            <div>
              <h3 className="text-base font-semibold text-fg sm:text-lg">Mulai tahun ke-2</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">
                Agar website tetap online, biaya perpanjangan per tahun terdiri dari dua bagian:
              </p>
              <dl className="mt-4 divide-y divide-line rounded-xl bg-surface ring-1 ring-inset ring-line">
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-fg sm:text-[15px]">Hosting & jasa</dt>
                  <dd className="whitespace-nowrap text-sm font-semibold tabular-nums text-fg sm:text-[15px]">{rupiahCompact(hosting)}/tahun</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-fg sm:text-[15px]">Domain</dt>
                  <dd className="text-right text-sm text-muted sm:text-[15px]">
                    sesuai ekstensi, mulai <span className="whitespace-nowrap font-semibold tabular-nums text-fg">{domainFrom}/tahun</span>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-[15px]">
                Perpanjangan bisa {YEAR_CHOICES} tahun sekaligus dari Akun Saya, dibayar lewat {pkg.paymentProvider}.{' '}
                <AnchorLink href="#perpanjangan">Lihat cara memperpanjang</AnchorLink>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[15px]">
                Bila biaya perpanjangan tidak dibayar sampai jatuh tempo, situs dapat dinonaktifkan sementara. Rinciannya ada di{' '}
                <TextLink to={LEGAL_PATHS.terms}>Syarat & Ketentuan</TextLink>.
              </p>
            </div>
            <RenewalExampleTable hosting={hosting} domains={domains} />
          </div>
        </div>
      </InfoSection>

      <InfoSection
        id="perpanjangan"
        title="Cara memperpanjang untuk tahun berikutnya"
        intro={
          <p>
            Masa aktif website template berlaku satu tahun sejak website aktif. Untuk lanjut ke tahun berikutnya, Anda memperpanjangnya sendiri
            dari Akun Saya, tanpa perlu menghubungi kami lebih dulu.
          </p>
        }
      >
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {renewalSteps.map((step, index) => (
            <li key={step.title} className="border-t border-line pt-4">
              <h3 className="flex items-baseline gap-2 text-sm font-semibold text-fg sm:text-base">
                <span className="font-mono text-xs tabular-nums text-subtle" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{step.text}</p>
            </li>
          ))}
        </ol>
        <dl className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 md:gap-6">
          {renewalNotes.map((note) => (
            <div key={note.title} className="rounded-[24px] bg-surface p-5 ring-1 ring-inset ring-line sm:p-6">
              <dt className="text-base font-semibold text-fg sm:text-lg">{note.title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{note.text}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection
        id="harga-custom"
        title="Harga website dan aplikasi custom"
        intro={
          <p>
            {COMPANY_FACTS.customPricing} Kami tidak memasang daftar harga untuk jasa custom, karena biayanya mengikuti cakupan proyek.
            Penawaran tertulis memuat biaya, jadwal, tahapan pembayaran, dan revisi, dan pengerjaan baru dimulai setelah Anda menyetujuinya.
          </p>
        }
      >
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOM_COST_FACTORS.map((factor, index) => (
            <div key={factor.title} className="border-t border-line pt-4">
              <dt className="flex items-baseline gap-2 text-sm font-semibold text-fg sm:text-base">
                <span className="font-mono text-xs tabular-nums text-subtle">{String(index + 1).padStart(2, '0')}</span>
                {factor.title}
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{factor.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-muted sm:text-[17px]">
          Detail layanannya ada di halaman <TextLink to={HUB_PATHS.webService}>jasa pembuatan website</TextLink> dan{' '}
          <TextLink to={HUB_PATHS.mobileService}>jasa pembuatan aplikasi Android & iOS</TextLink>, atau langsung ceritakan kebutuhan Anda
          lewat <TextLink to={HUB_PATHS.customOrder}>formulir Pesan Custom</TextLink>.
          <CostGuides />
        </p>
      </InfoSection>

      <InfoSection
        id="perbandingan"
        title="Template, website custom, atau aplikasi mobile?"
        intro={<p>Perbandingan tiga cara bekerja dengan kami, dari yang paling cepat online sampai yang dirancang dari nol.</p>}
      >
        <ComparisonTable table={compare} caption="Perbandingan template siap pakai, website custom, dan aplikasi mobile custom" highlight={0} />
      </InfoSection>

      <InfoSection
        id="cara-membuat-website"
        title="Cara membuat website: mana yang cocok untuk Anda?"
        intro={
          <p>
            Selain lewat kami, ada beberapa cara umum untuk punya website. Tabel ini membandingkannya secara garis besar, tanpa menyebut
            penyedia tertentu; detail setiap layanan bisa berbeda.
          </p>
        }
      >
        <ComparisonTable table={buildOptionsTable()} caption="Perbandingan cara membuat website" highlight={3} />
      </InfoSection>

      <InfoSection id="pembayaran" title={`Pembayaran aman lewat ${pkg.paymentProvider}`}>
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Prose
            paragraphs={[
              `Pembayaran template dan perpanjangan tahunan diproses oleh ${pkg.paymentProvider}. Di halaman pembayaran, Anda memilih metode yang tersedia di ${pkg.paymentProvider}; setelah pembayaran berhasil, status pesanan di Akun Saya berubah otomatis.`,
              'Pesanan yang belum dibayar bisa Anda batalkan sendiri tanpa biaya. Proyek custom dibayar sesuai tahapan yang tertulis di penawaran yang Anda setujui.',
            ]}
          />
          <div className="flex items-start gap-4 rounded-[24px] bg-surface p-5 ring-1 ring-inset ring-line sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-semibold text-fg sm:text-lg">Jaminan pengembalian dana</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{COMPANY_FACTS.refundGuarantee}</p>
              <p className="mt-2 text-sm">
                <TextLink to={LEGAL_PATHS.refund}>Baca Kebijakan Pengembalian Dana</TextLink>
              </p>
            </div>
          </div>
        </div>
      </InfoSection>

      <InfoSection id="faq" title="Pertanyaan tentang harga">
        <FaqAccordion items={faqs} className="max-w-4xl" />
      </InfoSection>
    </InfoPage>
  );
}
