// /kontak (docs/platform/SEO-PLAN.md §5.6 langkah 7): WhatsApp, telepon, email dari setting yang sama dengan Footer
// (NAP identik). Alamat, peta, jam layanan dan waktu respons hanya tampil bila sudah diisi pemilik di COMPANY_FACTS
// (null = tidak dirender, tanpa placeholder).
import { LayoutTemplate, Mail, MapPin, MessageCircle, Phone, ReceiptText, Smartphone, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { LEGAL_PATHS } from '../../../lib/legal';
import {
  displayPhone,
  getContactEmail,
  getContactPhone,
  getWhatsappNumber,
  telHref,
  useSiteSettings,
  whatsappUrl,
} from '../../../hooks/useSiteSettings';
import { HUB_PATHS } from '../../../seo/paths';
import { CompanyFactsCard } from './CompanyFactsCard';
import { InfoPage, InfoSection } from './InfoPage';
import { formatAddress } from './useFactRows';

interface Channel {
  key: string;
  Icon: LucideIcon;
  label: string;
  value: string;
  href: string;
  note: string;
  external?: boolean;
}

const ROUTES = [
  {
    Icon: LayoutTemplate,
    title: 'Ingin membeli template',
    text: 'Lihat semua template beserta harga dan demonya, lalu pesan dan bayar online.',
    links: [
      { to: HUB_PATHS.catalog, label: 'Pilih Template' },
      { to: HUB_PATHS.pricing, label: 'Lihat harga' },
    ],
  },
  {
    Icon: Smartphone,
    title: 'Butuh website atau aplikasi custom',
    text: 'Ceritakan kebutuhan Anda lewat formulir; tim kami menghubungi Anda untuk konsultasi gratis.',
    links: [
      { to: HUB_PATHS.customOrder, label: 'Pesan Custom' },
      { to: HUB_PATHS.webService, label: 'Jasa website' },
      { to: HUB_PATHS.mobileService, label: 'Jasa aplikasi' },
    ],
  },
  {
    Icon: ReceiptText,
    title: 'Sudah memesan',
    text: 'Status pesanan, pembayaran, dan pengelolaan situs ada di Akun Saya. Untuk pengembalian dana, baca kebijakannya.',
    links: [
      { to: '/akun', label: 'Akun Saya' },
      { to: LEGAL_PATHS.refund, label: 'Kebijakan Pengembalian Dana' },
    ],
  },
] as const;

export default function Kontak() {
  const { settings } = useSiteSettings();
  const phone = getContactPhone(settings);
  const email = getContactEmail(settings);
  const whatsapp = getWhatsappNumber(settings);
  const address = formatAddress(COMPANY_FACTS);
  const sameNumber = displayPhone(whatsapp) === displayPhone(phone);

  const channels: Channel[] = [
    {
      key: 'whatsapp',
      Icon: MessageCircle,
      label: 'WhatsApp',
      value: displayPhone(whatsapp),
      href: whatsappUrl(whatsapp, 'Halo Admin, saya ingin bertanya tentang layanan Garuda Nexa.'),
      note: 'Cara tercepat untuk konsultasi gratis dan pertanyaan seputar template.',
      external: true,
    },
    {
      key: 'telepon',
      Icon: Phone,
      label: 'Telepon',
      value: displayPhone(phone),
      href: telHref(phone),
      note: sameNumber ? 'Nomor yang sama dengan WhatsApp.' : 'Telepon langsung ke tim kami.',
    },
    {
      key: 'email',
      Icon: Mail,
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
      note: 'Untuk pertanyaan yang lebih panjang atau mengirim dokumen.',
    },
  ];

  return (
    <InfoPage
      crumb="Kontak"
      badge="Kontak"
      title={`Hubungi ${COMPANY_FACTS.name}`}
      lead={
        <p>
          Tanya tentang template, konsultasi website dan aplikasi custom, atau pesanan Anda lewat WhatsApp, telepon, atau email. Konsultasi
          gratis, dan kami melayani klien di seluruh Indonesia secara online.
        </p>
      }
    >
      <section aria-label="Saluran kontak" className="pt-2">
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {channels.map(({ key, Icon, label, value, href, note, external }) => (
            <li key={key}>
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="card-flat lift flex h-full flex-col p-5 sm:p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-4 text-sm font-medium text-muted">{label}</span>
                <span className="mt-0.5 text-lg font-semibold text-fg [overflow-wrap:anywhere] sm:text-xl">{value}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{note}</span>
                {external && <span className="sr-only">(tab baru)</span>}
              </a>
            </li>
          ))}
        </ul>
        {(address || COMPANY_FACTS.serviceHours) && (
          <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2">
            {address && (
              <div className="card-flat flex items-start gap-4 p-5 sm:p-6">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-muted">Alamat</p>
                  <address className="mt-0.5 text-[15px] not-italic text-fg">{address}</address>
                </div>
              </div>
            )}
            {COMPANY_FACTS.serviceHours && (
              <div className="card-flat p-5 sm:p-6">
                <p className="text-sm font-medium text-muted">Jam layanan</p>
                <p className="mt-0.5 text-[15px] text-fg">{COMPANY_FACTS.serviceHours}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <InfoSection id="jalur" title="Pilih jalur yang paling cepat" intro={<p>Sebagian besar pertanyaan bisa langsung terjawab di halaman berikut.</p>}>
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {ROUTES.map(({ Icon, title, text, links }) => (
            <li key={title} className="flex flex-col rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:p-6">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-base font-semibold text-fg sm:text-lg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map((link, index) => (
                  <Link key={link.to} to={link.to} className={`btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline'}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection id="perusahaan" title="Data perusahaan" intro={<p>Nama, kontak, dan area layanan yang sama dengan yang tertulis di seluruh situs ini.</p>}>
        <CompanyFactsCard className="max-w-2xl" />
      </InfoSection>
    </InfoPage>
  );
}
