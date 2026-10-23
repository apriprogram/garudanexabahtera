// /tentang (docs/platform/SEO-PLAN.md §5.6 langkah 7): hanya fakta yang sudah pasti (COMPANY_FACTS, data template,
// dokumen legal). Direksi dan titik peta kantor tampil dari COMPANY_FACTS (pemilik 2026-10-24); alamat tertulis, NIB, dan
// produk sendiri baru tampil setelah pemilik mengisinya: selama null, bagiannya tidak dirender sama sekali. Tanpa
// testimoni, angka statistik, atau cerita yang dikarang. Kontak (WhatsApp, telepon, email) dari setting, sama dengan
// Footer & /kontak.
import React from 'react';
import { ArrowUpRight, Code2, LayoutTemplate, Mail, MapPin, MessageCircle, Phone, Smartphone, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import {
  displayPhone,
  getContactEmail,
  getContactPhone,
  getWhatsappNumber,
  telHref,
  useSiteSettings,
  whatsappUrl,
} from '../../../hooks/useSiteSettings';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { formatDateId, formatPriceRange } from '../../../seo/format';
import { LEGAL_LINKS } from '../../../lib/legal';
import { HUB_PATHS } from '../../../seo/paths';
import { CompanyFactsCard } from './CompanyFactsCard';
import { InfoPage, InfoSection, Prose } from './InfoPage';
import { ABOUT_UPDATED } from './Tentang.seo';

const SERVICE_ICONS = { template: LayoutTemplate, website: Code2, mobile: Smartphone } as const;

const CONTACT_MESSAGE = 'Halo Admin, saya ingin konsultasi tentang template website atau jasa pembuatan website/aplikasi Garuda Nexa.';

/** Peta Google tanpa kunci API, berpusat pada titik kantor (pin netral, tanpa nama tempat). */
const mapEmbedUrl = (latitude: number, longitude: number) =>
  `https://maps.google.com/maps?q=${latitude},${longitude}&z=17&hl=id&output=embed`;

const TextLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="link-site font-medium">
    {children}
  </Link>
);

interface ContactCardProps {
  icon: LucideIcon;
  /** Kelas ikon (latar + warna) */
  tone: string;
  label: string;
  value: React.ReactNode;
  hint: string;
  href: string;
  external?: boolean;
}

/** Kartu kontak: seluruh kartu satu tautan (WhatsApp / tel: / mailto:). */
const ContactCard: React.FC<ContactCardProps> = ({ icon: Icon, tone, label, value, hint, href, external }) => (
  <li>
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="card-flat lift group flex items-center gap-4 p-4 sm:p-5"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-muted">{label}</span>
        <span className="mt-0.5 block text-base font-semibold text-fg [overflow-wrap:anywhere] sm:text-lg">{value}</span>
        <span className="mt-0.5 block text-[13px] text-subtle">{hint}</span>
      </span>
      <ArrowUpRight
        className="h-5 w-5 shrink-0 text-subtle transition-[color,translate] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
        aria-hidden
      />
      {external && <span className="sr-only"> (tab baru)</span>}
    </a>
  </li>
);

export default function Tentang() {
  const { templates } = usePublishedTemplates();
  const priceDate = usePriceDate();
  const { settings } = useSiteSettings();
  const range = formatPriceRange(templates.map((t) => t.price));
  const facts = COMPANY_FACTS;
  const pkg = facts.templatePackage;
  const phone = getContactPhone(settings);
  const email = getContactEmail(settings);
  const whatsapp = getWhatsappNumber(settings);

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
      actions={
        <>
          <a href="#hubungi" className="btn btn-dark sm:h-12 sm:px-6 sm:text-[15px]">
            Hubungi kami
          </a>
          <Link to={HUB_PATHS.catalog} className="btn bg-fg/6 text-fg hover:bg-fg/10 sm:h-12 sm:px-6 sm:text-[15px]">
            Lihat template
          </Link>
        </>
      }
      aside={<CompanyFactsCard updated={ABOUT_UPDATED} />}
    >
      <InfoSection id="profil" title="Profil perusahaan">
        <Prose
          paragraphs={[
            <>
              {facts.legalName} membangun website dan aplikasi untuk bisnis dan organisasi di Indonesia: UMKM, klinik dan salon, klub
              olahraga, startup, sekolah, sampai instansi. Tujuannya sederhana, yaitu membuat bisnis Anda mudah ditemukan, terlihat
              profesional, dan isinya bisa Anda kelola sendiri.
            </>,
            <>
              Ada dua jalur. Pertama, <TextLink to={HUB_PATHS.catalog}>template website siap pakai</TextLink> dengan harga tertera yang
              sudah termasuk domain, hosting, dan SSL tahun pertama. Kedua, website dan aplikasi custom yang dirancang dari nol setelah
              konsultasi gratis. Semuanya berjalan online, jadi kami bisa melayani klien di kota mana pun.
            </>,
          ]}
        />
      </InfoSection>

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

      {facts.leadership.length > 0 && (
        <InfoSection id="direksi" title="Direksi" intro={<p>Orang-orang yang memimpin {facts.legalName}.</p>}>
          <ul className="grid max-w-3xl gap-x-6 gap-y-8 sm:grid-cols-2">
            {facts.leadership.map((person) => (
              <li key={person.name}>
                <figure className="group">
                  <div className="aspect-[4/5] overflow-hidden rounded-[24px] bg-alt">
                    <img
                      src={person.photo}
                      alt={`Foto ${person.name}`}
                      width={720}
                      height={900}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 ease-calm motion-safe:group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="mt-4">
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg sm:text-xl">{person.name}</h3>
                    <p className="mt-0.5 text-sm text-muted sm:text-[15px]">
                      {person.role} · {facts.legalName}
                    </p>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </InfoSection>
      )}

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
        id="hubungi"
        title="Hubungi kami"
        intro={<p>Konsultasi gratis lewat WhatsApp, telepon, atau email. Ceritakan kebutuhan Anda, kami bantu memilih jalur yang paling pas.</p>}
      >
        <div className={`grid gap-4 sm:gap-6 ${facts.location ? 'lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]' : ''}`}>
          <ul className={`grid content-start gap-3 ${facts.location ? '' : 'max-w-3xl sm:grid-cols-3'}`}>
            <ContactCard
              icon={MessageCircle}
              tone="bg-whatsapp text-white"
              label="WhatsApp"
              value={displayPhone(whatsapp)}
              hint="Chat langsung"
              href={whatsappUrl(whatsapp, CONTACT_MESSAGE)}
              external
            />
            <ContactCard icon={Phone} tone="bg-brand-50 text-primary" label="Telepon" value={displayPhone(phone)} hint="Telepon langsung" href={telHref(phone)} />
            <ContactCard icon={Mail} tone="bg-fg/6 text-fg" label="Email" value={email} hint="Untuk dokumen & penawaran" href={`mailto:${email}`} />
          </ul>

          {facts.location && (
            // Kolom fleksibel: di desktop peta mengisi sisa tinggi baris, keterangan + tautan tetap terlihat di bawahnya
            <figure className="flex flex-col overflow-hidden rounded-[24px] bg-surface ring-1 ring-inset ring-line">
              <iframe
                title={`Peta lokasi kantor ${facts.legalName}`}
                src={mapEmbedUrl(facts.location.latitude, facts.location.longitude)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="block h-[300px] w-full border-0 bg-alt sm:h-[380px] lg:h-auto lg:min-h-[340px] lg:flex-1"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                <span className="flex items-center gap-2 text-sm font-medium text-fg">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Lokasi kantor {facts.legalName}
                </span>
                <a href={facts.location.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                  Buka di Google Maps
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                  <span className="sr-only"> (tab baru)</span>
                </a>
              </figcaption>
            </figure>
          )}
        </div>
      </InfoSection>

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
              Halaman kontak
            </Link>
          </li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
