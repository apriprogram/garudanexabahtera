// /harga (docs/platform/SEO-PLAN.md §5.6 langkah 6): "Harga berlaku per {tanggal}", tabel semua template dari data,
// yang sudah termasuk + biaya tahun berikutnya, cara biaya custom ditentukan (tanpa angka), dua tabel perbandingan
// (Lampiran D + cara membuat website, tanpa nama pesaing), Midtrans, jaminan pengembalian dana, FAQ.
// Angka harga HANYA dari data template (get_templates), tidak pernah ditulis di kode.
import React from 'react';
import { Check, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaqAccordion } from '../../../components/sections/faq/FaqAccordion';
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { faqContext, faqItems, PRICING_FAQ_IDS } from '../../../content/faq';
import { buildOptionsTable, CMS_INCLUDE, CUSTOM_COST_FACTORS, shortPriceRange, templateVsCustomTable } from '../../../content/pricing';
import { getTemplatePricing, getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../../hooks/useSiteSettings';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { formatDateId, formatPriceFull, formatPriceRange, isPrice } from '../../../seo/format';
import { ARTICLE_SLUGS, HUB_PATHS, LEGAL_PATHS, categoryPath, templatePath } from '../../../seo/paths';
import { categorySlugOf } from '../../../seo/templateSeo';
import { guideLink } from '../catalog/guideLink';
import { ComparisonTable } from './ComparisonTable';
import { InfoPage, InfoSection, Prose } from './InfoPage';

const TextLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="link-site font-medium">
    {children}
  </Link>
);

/** Panduan biaya di pasar (Lampiran A.3); hanya artikel yang sudah terbit yang ditautkan. */
const COST_GUIDES = [
  { slug: ARTICLE_SLUGS.websiteCost, anchor: 'biaya pembuatan website company profile' },
  { slug: ARTICLE_SLUGS.appCost, anchor: 'biaya pembuatan aplikasi Android & iOS' },
] as const;

const CostGuides: React.FC = () => {
  const guides = COST_GUIDES.map((guide) => ({ ...guide, link: guideLink([guide.slug]) })).filter((guide) => guide.link.article);
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

export default function Harga() {
  const { settings } = useSiteSettings();
  const { status, templates } = usePublishedTemplates();
  const priceDate = usePriceDate();
  const dateText = formatDateId(priceDate);
  const pricing = getTemplatePricing(settings);
  const range = formatPriceRange(templates.map((t) => t.price));
  const pkg = COMPANY_FACTS.templatePackage;
  const whatsapp = whatsappUrl(getWhatsappNumber(settings), 'Halo Admin, saya ingin bertanya tentang harga template atau jasa custom Garuda Nexa.');
  const faqs = faqItems(PRICING_FAQ_IDS, faqContext(templates));
  const compare = templateVsCustomTable({ priceRange: shortPriceRange(templates), priceDate }, { full: true, formatDate: formatDateId });
  const priced = templates.filter((t) => isPrice(t.price));

  return (
    <InfoPage
      crumb="Harga"
      badge="Harga"
      title="Harga template website & jasa pembuatan website"
      lead={
        <>
          <p>
            Harga setiap template {COMPANY_FACTS.name} tertera jelas{range ? `, saat ini ${range}` : ''}, dan sudah termasuk setup, domain,
            hosting, serta SSL tahun pertama. Website dan aplikasi custom dihitung lewat penawaran tertulis setelah konsultasi gratis.
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
            Satu harga per template, dibayar sekali di awal untuk tahun pertama. Klik nama template untuk melihat isi halamannya, galeri,
            dan demonya.
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
            Harga berlaku per <time dateTime={priceDate}>{dateText}</time>, dalam rupiah, untuk satu website pada satu domain.
          </p>
        </div>
      </InfoSection>

      <InfoSection
        id="sudah-termasuk"
        title="Sudah termasuk & biaya tahun berikutnya"
        intro={<p>Harga template bukan harga desain saja. Yang Anda bayar di awal sudah mencakup semua yang dibutuhkan agar website online:</p>}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-8">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[...pricing.includes, CMS_INCLUDE].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-[20px] bg-surface p-4 text-sm text-fg ring-1 ring-inset ring-line sm:text-[15px]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:p-6">
            <h3 className="text-base font-semibold text-fg sm:text-lg">Mulai tahun ke-2</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">
              {pkg.renewalCost
                ? `Perpanjangan domain dan hosting ${pkg.renewalCost} per tahun.`
                : pricing.note || 'Perpanjangan domain dan hosting ditagih per tahun. Biayanya kami informasikan sebelum jatuh tempo.'}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[15px]">
              Bila biaya perpanjangan tidak dibayar sampai jatuh tempo, situs dapat dinonaktifkan sementara. Rinciannya ada di{' '}
              <TextLink to={LEGAL_PATHS.terms}>Syarat & Ketentuan</TextLink>.
            </p>
          </div>
        </div>
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
              `Pembayaran template diproses oleh ${pkg.paymentProvider}. Di halaman pembayaran, Anda memilih metode yang tersedia di ${pkg.paymentProvider}; setelah pembayaran berhasil, status pesanan di Akun Saya berubah otomatis.`,
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
