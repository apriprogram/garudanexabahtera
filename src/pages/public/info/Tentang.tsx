// /tentang (docs/platform/SEO-PLAN.md §5.6 langkah 7): hanya fakta yang sudah pasti (COMPANY_FACTS, data template,
// dokumen legal). Alamat, NIB, tim dan produk sendiri baru tampil setelah pemilik mengisinya di companyFacts.ts:
// selama null, bagiannya tidak dirender sama sekali. Tanpa testimoni, angka statistik, atau cerita yang dikarang.
import React from 'react';
import { Code2, LayoutTemplate, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { formatDateId, formatPriceRange } from '../../../seo/format';
import { LEGAL_LINKS } from '../../../lib/legal';
import { HUB_PATHS } from '../../../seo/paths';
import { CompanyFactsCard } from './CompanyFactsCard';
import { InfoPage, InfoSection } from './InfoPage';
import { ABOUT_UPDATED } from './Tentang.seo';

const SERVICE_ICONS = { template: LayoutTemplate, website: Code2, mobile: Smartphone } as const;

const TextLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="link-site font-medium">
    {children}
  </Link>
);

export default function Tentang() {
  const { templates } = usePublishedTemplates();
  const priceDate = usePriceDate();
  const range = formatPriceRange(templates.map((t) => t.price));
  const facts = COMPANY_FACTS;
  const pkg = facts.templatePackage;

  const principles: { title: string; text: React.ReactNode }[] = [
    {
      title: 'Harga template tertera, bukan "hubungi kami"',
      text: (
        <>
          {range ? (
            <>
              Harga template saat ini {range} (per <time dateTime={priceDate}>{formatDateId(priceDate)}</time>),{' '}
            </>
          ) : (
            'Harga setiap template tertera di halamannya, '
          )}
          sudah termasuk setup, domain, hosting, dan SSL tahun pertama. Lihat <TextLink to={HUB_PATHS.pricing}>daftar harga</TextLink>.
        </>
      ),
    },
    {
      title: 'Bayar online, pantau sendiri',
      text: `Pesanan template dibayar online lewat ${pkg.paymentProvider}, dan setiap tahapnya, dari pembayaran sampai website aktif, bisa Anda pantau di Akun Saya.`,
    },
    {
      title: 'Isi website dikelola pemiliknya',
      text: 'Teks, foto, dan kontak di website Anda ubah sendiri lewat CMS di Akun Saya, tanpa coding. Isi yang Anda masukkan, seperti teks, gambar, logo, dan data, tetap milik Anda.',
    },
    {
      title: 'Proyek custom dimulai dari penawaran tertulis',
      text: `${facts.customPricing} Lingkup, jadwal, tahapan pembayaran, revisi, dan kepemilikan kode sumber dituliskan sebelum pengerjaan dimulai.`,
    },
    {
      title: 'Dana kembali bila pesanan ditolak',
      text: facts.refundGuarantee,
    },
  ];

  return (
    <InfoPage
      crumb="Tentang"
      badge="Tentang kami"
      title={`Tentang ${facts.name}`}
      lead={
        <p>
          {facts.name} adalah merek dari {facts.legalName}, perusahaan Indonesia yang menjual template website siap pakai dan menerima jasa
          pembuatan website serta aplikasi mobile Android dan iOS custom. Kami melayani klien di seluruh Indonesia secara online, dari
          konsultasi sampai website atau aplikasi Anda dipakai.
        </p>
      }
      aside={<CompanyFactsCard updated={ABOUT_UPDATED} />}
    >
      <InfoSection
        id="layanan"
        title="Yang kami kerjakan"
        intro={<p>Tiga layanan, dengan satu cara kerja: jelas sejak awal soal harga, isi, dan siapa mengerjakan apa.</p>}
      >
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {facts.services.map((service) => {
            const Icon = SERVICE_ICONS[service.key];
            return (
              <li key={service.key}>
                <Link to={service.path} className="card-flat lift flex h-full flex-col p-5 sm:p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-fg sm:text-xl">{service.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">{service.summary}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </InfoSection>

      <InfoSection id="cara-kerja" title="Cara kami bekerja">
        <ol className="grid max-w-5xl gap-x-10 gap-y-6 md:grid-cols-2">
          {principles.map((item, index) => (
            <li key={item.title} className="border-t border-line pt-4">
              <h3 className="flex items-baseline gap-2.5 text-base font-semibold text-fg sm:text-lg">
                <span className="font-mono text-xs tabular-nums text-subtle">{String(index + 1).padStart(2, '0')}</span>
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{item.text}</p>
            </li>
          ))}
        </ol>
      </InfoSection>

      {facts.ownProducts && facts.ownProducts.length > 0 && (
        <InfoSection id="produk" title="Produk kami">
          <ul className="flex flex-wrap gap-2">
            {facts.ownProducts.map((product) => (
              <li key={product} className="chip-site">
                {product}
              </li>
            ))}
          </ul>
        </InfoSection>
      )}

      <InfoSection
        id="dokumen"
        title="Dokumen & kebijakan"
        intro={<p>Aturan pemesanan, privasi, dan pengembalian dana kami tertulis dan bisa Anda baca sebelum memesan.</p>}
      >
        <ul className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          {LEGAL_LINKS.map((link) => (
            <li key={link.key}>
              <Link to={link.to} className="btn btn-outline max-sm:w-full">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to={HUB_PATHS.contact} className="btn btn-primary max-sm:w-full">
              Hubungi kami
            </Link>
          </li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
