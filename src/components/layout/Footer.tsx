import React from 'react';
import { Facebook, Instagram, Linkedin, Mail, MessageCircle, Phone, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../ui/LogoMark';
import { Reveal } from '../ui/Reveal';
import { SplitText } from '../ui/SplitText';
import { SmartLink } from './SmartLink';
import {
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_CONTACT_PHONE,
  displayPhone,
  getWhatsappNumber,
  telHref,
  useSiteSettings,
  whatsappUrl,
} from '../../hooks/useSiteSettings';
import { sessionKind, useSessionRole, type SessionKind } from '../../hooks/useSessionRole';
import { CATEGORY_LIST } from '../../content/categories';
import { COMPANY_FACTS } from '../../lib/companyFacts';
import { LEGAL_LINKS } from '../../lib/legal';
import { HUB_PATHS, categoryPath } from '../../seo/paths';

const DEFAULTS = {
  footer_address: 'Mitra terpercaya untuk inovasi digital bisnis Anda. Membantu dari ide hingga menjadi produk siap rilis.',
  footer_phone: DEFAULT_CONTACT_PHONE,
  footer_email: DEFAULT_CONTACT_EMAIL,
  footer_copyright: `© ${new Date().getFullYear()} PT. Garuda Nexa Bahtera. Semua hak dilindungi.`,
  cta_title: 'Siap membangun sistem digital?\nKonsultasikan sekarang juga!',
  cta_button: 'Hubungi WhatsApp',
  cta_note: 'Konsultasi GRATIS',
};

const CONTACT_MESSAGE = 'Halo Admin, saya tertarik dengan template website atau jasa pembuatan website/aplikasi Garuda Nexa.';

interface FooterLink {
  label: string;
  href: string;
}

// Kolom footer = semua halaman hub (docs/platform/SEO-PLAN.md §5.5 langkah 6, Lampiran A.4): tautan nyata, anchor
// berupa nama halaman/merek (bukan kata kunci yang dijejalkan). Kategori dari src/content/categories.ts.
const TEMPLATE_LINKS: FooterLink[] = [
  { label: 'Semua template', href: HUB_PATHS.catalog },
  ...CATEGORY_LIST.map((meta) => ({ label: meta.name, href: categoryPath(meta.slug) })),
];

const SERVICE_LINKS: FooterLink[] = [
  { label: 'Website custom', href: HUB_PATHS.webService },
  { label: 'Aplikasi mobile', href: HUB_PATHS.mobileService },
  { label: 'Pesan Custom', href: HUB_PATHS.customOrder },
  { label: 'Harga', href: HUB_PATHS.pricing },
];

const COMPANY_LINKS: FooterLink[] = [
  { label: 'Tentang', href: HUB_PATHS.about },
  { label: 'Panduan', href: HUB_PATHS.guides },
  { label: 'Kontak', href: HUB_PATHS.contact },
];

const LEGAL_COLUMN: FooterLink[] = LEGAL_LINKS.map((link) => ({ label: link.label, href: link.to }));

/** Kolom Akun mengikuti sesi (sama seperti tombol akun di Navbar): tamu, pembeli template, atau staf. */
const ACCOUNT_LINKS: Record<SessionKind, FooterLink[]> = {
  guest: [
    { label: 'Masuk', href: '/masuk' },
    { label: 'Daftar Akun', href: '/daftar' },
  ],
  customer: [{ label: 'Akun Saya', href: '/akun' }],
  staff: [{ label: 'Panel Admin', href: '/admin' }],
};

const TikTok: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.37-2.48V9.66a5.73 5.73 0 0 0-.77-.05A5.7 5.7 0 0 0 4.16 15.3 5.7 5.7 0 0 0 9.86 21a5.7 5.7 0 0 0 5.7-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.26-1.48Z" />
  </svg>
);

const SOCIALS = [
  { key: 'footer_instagram', label: 'Instagram', Icon: Instagram },
  { key: 'footer_facebook', label: 'Facebook', Icon: Facebook },
  { key: 'footer_linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'footer_youtube', label: 'YouTube', Icon: Youtube },
  { key: 'footer_tiktok', label: 'TikTok', Icon: TikTok },
] as const;

/** Judul CTA dua bagian: baris kedua (atau kalimat setelah "?") diberi warna lebih lembut. */
const splitCtaTitle = (title: string): [string, string] => {
  const newline = title.indexOf('\n');
  if (newline > 0) return [title.slice(0, newline).trim(), title.slice(newline + 1).trim()];
  const question = title.indexOf('? ');
  return question > 0 ? [title.slice(0, question + 1), title.slice(question + 2)] : [title, ''];
};

/**
 * Alamat email yang boleh terpotong baris HANYA setelah "@", jadi di kolom sempit (HP) menjadi "info@" /
 * "garudanexa.com" dengan domain utuh, bukan menyisakan satu huruf. `overflow-wrap:anywhere` hanya cadangan untuk
 * domain yang tetap lebih lebar dari kolomnya.
 */
const EmailText: React.FC<{ email: string }> = ({ email }) => {
  const at = email.lastIndexOf('@');
  return (
    <span className="min-w-0 [overflow-wrap:anywhere]">
      {at > 0 ? (
        <>
          {email.slice(0, at + 1)}
          <wbr />
          {email.slice(at + 1)}
        </>
      ) : (
        email
      )}
    </span>
  );
};

const linkClass =
  'inline-flex min-h-10 items-center gap-2.5 text-[13px] text-muted transition-colors hover:text-fg sm:min-h-0 sm:text-sm';

const socialClass =
  'relative flex h-9 w-9 items-center justify-center rounded-full text-muted ring-1 ring-inset ring-line transition-colors after:absolute after:-inset-1 hover:bg-brand-50 hover:text-primary hover:ring-brand-200';

/** Kolom tautan (judul eyebrow). Di HP tiap tautan setinggi 40px. */
const LinkColumn: React.FC<{ title: string; links: FooterLink[]; className?: string }> = ({ title, links, className = '' }) => (
  <nav aria-label={title} className={className}>
    <h3 className="eyebrow">{title}</h3>
    <ul className="mt-2 sm:mt-4 sm:space-y-3">
      {links.map((link) => (
        <li key={`${link.label}-${link.href}`}>
          <SmartLink href={link.href} className={linkClass}>
            {link.label}
          </SmartLink>
        </li>
      ))}
    </ul>
  </nav>
);

interface FooterProps {
  /** Latar abu lembut di area CTA (halaman lain; selang-seling dengan section terakhir). */
  alt?: boolean;
  /** Beranda: area CTA transparan agar latar crossfade SectionChrome terlihat. */
  chrome?: boolean;
}

/**
 * Footer publik gaya BELAJAR CPNS (terang): blok CTA biru brand `#kontak` (pola titik + cahaya lembut, bukan
 * blok gelap), lalu footer putih bergaris rambut: logo + deskripsi, kolom tautan, hak cipta & media sosial.
 */
const Footer: React.FC<FooterProps> = ({ alt, chrome }) => {
  const { settings } = useSiteSettings();
  const pick = (key: keyof typeof DEFAULTS) => settings[key]?.trim() || DEFAULTS[key];
  const session = sessionKind(useSessionRole());

  const whatsapp = getWhatsappNumber(settings);
  const phone = pick('footer_phone');
  const email = pick('footer_email');
  const ctaPhone = (settings.cta_phone || '').trim() || phone;
  const [ctaLead, ctaAccent] = splitCtaTitle(pick('cta_title'));

  // cta_link dari admin bisa berupa URL lengkap atau nomor WhatsApp
  const ctaLink = (settings.cta_link || '').trim();
  const ctaHref = /^https?:\/\//i.test(ctaLink)
    ? ctaLink
    : whatsappUrl(ctaLink.replace(/\D/g, '') || whatsapp, CONTACT_MESSAGE);

  const socials = SOCIALS.filter(({ key }) => {
    const url = (settings[key] || '').trim();
    return url && url !== '#';
  });
  // Baris fakta dari COMPANY_FACTS (satu sumber NAP, sama dengan /kontak dan JSON-LD); field null tidak dirender
  const { address } = COMPANY_FACTS;
  const addressLine = address ? [address.streetAddress, address.locality, address.region, address.postalCode].filter(Boolean).join(', ') : null;

  return (
    <footer>
      {/* ---------- CTA biru brand ---------- */}
      <div className={`pb-12 pt-12 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24 ${chrome ? '' : alt ? 'bg-alt' : 'bg-canvas'}`}>
        {/*
          Anchor #kontak sengaja di pembungkus polos: kartu di dalamnya overflow-hidden (jadi scroll container, sehingga
          scroll-margin diabaikan Chrome) dan ikut transform animasi Reveal (posisi visualnya bergeser saat diukur).
        */}
        <div id="kontak" className="container-site scroll-mt-[calc(var(--nav-offset)+1rem)] lg:scroll-mt-[calc(var(--nav-offset)+1.5rem)]">
          <Reveal variant="scale">
            <div className="relative isolate overflow-hidden rounded-[24px] bg-primary px-5 py-12 text-center text-white sm:rounded-[28px] sm:px-12 sm:py-20 lg:py-24">
              {/* Dekorasi: cahaya bergerak pelan + pola titik putih yang memudar ke tepi */}
              <span className="cta-orb cta-orb--a -z-10" aria-hidden />
              <span className="cta-orb cta-orb--b -z-10" aria-hidden />
              <div
                className="grid-dots-light pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]"
                aria-hidden
              />

              <span className="inline-flex h-7 items-center gap-2 rounded-full bg-white/15 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white ring-1 ring-inset ring-white/25 sm:h-8 sm:px-4 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                {pick('cta_note')}
              </span>

              <SplitText
                as="h2"
                delay={80}
                className="mx-auto mt-5 block max-w-4xl text-2xl font-semibold leading-[1.2] tracking-[-0.025em] text-white sm:mt-6 sm:text-5xl sm:leading-[1.04] sm:tracking-[-0.035em] xl:text-6xl"
                parts={[{ text: ctaLead }, ...(ctaAccent ? [{ text: ctaAccent, className: 'text-brand-200' }] : [])]}
              />

              <Reveal delay={0.25}>
                <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/80 sm:mt-5 sm:text-lg">
                  Ceritakan kebutuhan Anda. Tim kami bantu memilih template yang pas atau menyusun solusi website dan aplikasi
                  mobile custom, gratis tanpa komitmen.
                </p>
              </Reveal>

              <Reveal delay={0.35}>
                <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:mt-10 sm:flex-row sm:items-center sm:gap-3">
                  <a href={ctaHref} target="_blank" rel="noopener noreferrer" className="btn btn-light btn-xl">
                    <MessageCircle className="h-5 w-5 max-sm:h-4 max-sm:w-4" aria-hidden />
                    {pick('cta_button')}
                  </a>
                  <Link to="/pesan-custom" className="btn btn-on-brand btn-xl">
                    Pesan Custom
                  </Link>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-1 sm:mt-8">
                  <a
                    href={telHref(ctaPhone)}
                    className="inline-flex min-h-10 items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    <span className="font-medium tabular-nums tracking-wide">{displayPhone(ctaPhone)}</span>
                  </a>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
                  >
                    <Mail className="h-4 w-4 shrink-0" aria-hidden />
                    <EmailText email={email} />
                  </a>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ---------- Footer putih ---------- */}
      <div className="border-t border-line bg-canvas">
        <div className="container-site grid grid-cols-2 gap-x-4 gap-y-8 py-12 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-10 sm:py-16 lg:grid-cols-12 lg:gap-8">
          <div className="col-span-2 sm:col-span-4 lg:col-span-4">
            <Link to="/" className="inline-flex rounded-full" aria-label="Garuda Nexa Bahtera, ke beranda">
              <BrandLogo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{pick('footer_address')}</p>
            {/* Baris fakta (NAP): nama badan hukum, alamat bila sudah ada, WhatsApp, email */}
            <address className="mt-5 max-w-sm text-[13px] not-italic leading-relaxed text-muted sm:text-sm">
              <span className="block font-semibold text-fg">{COMPANY_FACTS.legalName}</span>
              {addressLine && <span className="mt-0.5 block">{addressLine}</span>}
              <span className="mt-1 flex flex-col items-start sm:flex-row sm:flex-wrap sm:gap-x-4">
                <a
                  href={whatsappUrl(COMPANY_FACTS.whatsapp, CONTACT_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 transition-colors hover:text-fg sm:min-h-8"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                  <span>
                    WhatsApp <span className="tabular-nums">{displayPhone(COMPANY_FACTS.whatsapp)}</span>
                  </span>
                  <span className="sr-only"> (tab baru)</span>
                </a>
                <a href={`mailto:${COMPANY_FACTS.email}`} className="inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 transition-colors hover:text-fg sm:min-h-8">
                  <Mail className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                  <EmailText email={COMPANY_FACTS.email} />
                </a>
              </span>
            </address>
          </div>

          <LinkColumn title="Template" links={TEMPLATE_LINKS} className="lg:col-span-2" />
          <LinkColumn title="Jasa" links={SERVICE_LINKS} className="lg:col-span-2" />
          <LinkColumn title="Perusahaan" links={COMPANY_LINKS} className="lg:col-span-2" />
          <LinkColumn title="Legal" links={LEGAL_COLUMN} className="lg:col-span-2" />
        </div>

        {/* Bar bawah: ruang bawah/kanan untuk tombol WhatsApp melayang agar tidak menutupi teks & ikon */}
        <div className="border-t border-line">
          <div className="container-site flex flex-col-reverse items-start gap-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pt-6 sm:flex-row sm:items-center sm:justify-between sm:pb-24 lg:pb-6">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-6">
              <p className="text-xs text-muted sm:text-[13px]">{pick('footer_copyright')}</p>
              {/* Akun mengikuti sesi (sama dengan tombol akun di Navbar): tamu, pembeli template, atau staf */}
              <nav aria-label="Akun">
                <ul className="flex flex-wrap gap-x-4">
                  {ACCOUNT_LINKS[session].map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="inline-flex min-h-10 items-center text-xs text-muted transition-colors hover:text-fg sm:min-h-8 sm:text-[13px]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            {/* WhatsApp sudah ada di "Hubungi kami"; baris ini hanya untuk akun media sosial yang diisi admin */}
            {socials.length > 0 && (
              <ul className="flex items-center gap-2 lg:mr-20" aria-label="Media sosial">
                {socials.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <a href={settings[key]} target="_blank" rel="noopener noreferrer" aria-label={label} className={socialClass}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
