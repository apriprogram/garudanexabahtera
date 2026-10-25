import React from 'react';
import { ArrowRight, Facebook, Instagram, Linkedin, Mail, MessageCircle, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../ui/LogoMark';
import { Reveal } from '../ui/Reveal';
import { SplitText } from '../ui/SplitText';
import { SmartLink } from './SmartLink';
import {
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_CONTACT_PHONE,
  displayPhone,
  getHiddenSections,
  getWhatsappNumber,
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

/** Judul CTA dua baris: dipisah di baris baru dari admin, atau sesudah "?". */
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

/** Tombol ajakan: pil 48px di desktop (sama dengan tombol hero), teks 15px; HP 36px, teks 12px (pemilik 2026-10-25) */
const CTA_BTN = 'btn max-sm:h-9 max-sm:gap-1.5 max-sm:px-4 max-sm:text-xs sm:h-12 sm:px-6 sm:text-[15px]';
const CTA_ICON = 'h-3.5 w-3.5 sm:h-4 sm:w-4';

// Footer gelap gaya Mobbin: judul kolom abu kecil, tautan putih
const linkClass =
  'inline-flex min-h-8 items-center gap-2.5 text-xs text-white transition-colors hover:text-white/65 sm:min-h-0 sm:text-[15px]';

const socialClass =
  'relative flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors after:absolute after:-inset-1 hover:bg-white/10 hover:text-white';

/** Kolom tautan (judul abu kecil). Di HP tiap tautan setinggi 32px (rapat, pemilik 2026-10-25). */
const LinkColumn: React.FC<{ title: string; links: FooterLink[]; className?: string }> = ({ title, links, className = '' }) => (
  <nav aria-label={title} className={className}>
    <h3 className="text-xs font-medium text-white/55 sm:text-sm">{title}</h3>
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
  /**
   * false = tanpa banner ajakan (WhatsApp + Pesan Custom), mis. di /pesan-custom yang sudah punya form dan satu tombol
   * WhatsApp sendiri (pemilik 2026-10-24: tombol WhatsApp cukup satu).
   */
  cta?: boolean;
}

/**
 * Footer publik gaya Mobbin (permintaan pemilik 2026-10-24): ajakan `#kontak` putih — judul besar dua baris, satu kalimat,
 * tombol gelap WhatsApp + tombol abu "Pesan Custom" — yang sudut bawahnya membulat di atas footer gelap (bg-fg): logo +
 * deskripsi, kolom tautan, hak cipta, akun & media sosial, lalu teks besar "GARUDA NEXA" selebar layar.
 * Nomor & email ada di footer gelap, tidak diulang di ajakan.
 */
const Footer: React.FC<FooterProps> = ({ alt, chrome, cta = true }) => {
  const { settings } = useSiteSettings();
  // Admin bisa menyembunyikan banner CTA (Pengaturan website → Banner CTA, kunci "cta" di disabled_sections); anchor
  // #kontak lalu pindah ke footer putih supaya tautan "Konsultasi" tetap sampai ke kontak
  const hiddenSections = getHiddenSections(settings);
  const ctaHidden = !cta || hiddenSections.has('cta');
  // Saklar Panduan (Pengaturan website → Panduan) juga menyembunyikan tautannya di kolom Perusahaan
  const companyLinks = hiddenSections.has('panduan') ? COMPANY_LINKS.filter((link) => link.href !== HUB_PATHS.guides) : COMPANY_LINKS;
  const pick = (key: keyof typeof DEFAULTS) => settings[key]?.trim() || DEFAULTS[key];
  const session = sessionKind(useSessionRole());

  const whatsapp = getWhatsappNumber(settings);
  const [ctaLead, ctaAccent] = splitCtaTitle(pick('cta_title'));
  // Baris kedua judul mulai beranimasi sesudah kata terakhir baris pertama (SplitText: jeda antarkata 45 ms)
  const ctaAccentDelay = 80 + ctaLead.split(/\s+/).filter(Boolean).length * 45;

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
    <footer className="overflow-hidden bg-fg">
      {/* ---------- Ajakan #kontak (gaya Mobbin: putih, judul besar, dua tombol) ---------- */}
      {/* Latar padat (bukan transparan seperti section beranda): sudut bawahnya membulat di atas footer gelap. Beranda
          (chrome) memakai putih, sama dengan nada #kontak di SectionChrome. */}
      {!ctaHidden && (
      <div className={`rounded-b-[28px] pb-20 pt-20 sm:rounded-b-[40px] sm:pb-28 sm:pt-28 lg:pb-36 lg:pt-36 ${!chrome && alt ? 'bg-alt' : 'bg-canvas'}`}>
        {/* Anchor #kontak di pembungkus polos (bukan di dalam Reveal yang ber-transform), agar scroll-margin tepat */}
        <div id="kontak" className="container-site scroll-mt-[calc(var(--nav-offset)+1rem)] text-center lg:scroll-mt-[calc(var(--nav-offset)+1.5rem)]">
          <h2 className="mx-auto max-w-4xl text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-fg sm:text-5xl sm:leading-[1.04] sm:tracking-[-0.035em] lg:text-6xl">
            <SplitText delay={80} className="block" parts={ctaLead} />
            {ctaAccent && <SplitText delay={ctaAccentDelay} className="block" parts={ctaAccent} />}
          </h2>

          <Reveal delay={0.25}>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted sm:mt-5 sm:text-base">
              Ceritakan kebutuhan Anda. Tim kami bantu memilih template yang pas atau menyusun solusi website dan aplikasi
              mobile custom, gratis tanpa komitmen.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8">
              <a href={ctaHref} target="_blank" rel="noopener noreferrer" className={`${CTA_BTN} btn-dark`}>
                <MessageCircle className={CTA_ICON} aria-hidden />
                {pick('cta_button')}
              </a>
              <Link to="/pesan-custom" className={`${CTA_BTN} group bg-fg/6 text-fg hover:bg-fg/10 active:bg-fg/15`}>
                Pesan Custom
                <ArrowRight className={`${CTA_ICON} transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none`} aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
      )}

      {/* ---------- Footer gelap ---------- */}
      <div
        id={ctaHidden ? 'kontak' : undefined}
        // Cincin fokus putih: biru brand bawaan hampir tak terlihat di atas latar gelap
        className="scroll-mt-[var(--nav-offset)] text-white [&_:focus-visible]:outline-white"
      >
        <div className="container-site grid grid-cols-2 gap-x-4 gap-y-8 pb-12 pt-14 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-10 sm:pb-16 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pt-24">
          <div className="col-span-2 sm:col-span-4 lg:col-span-4">
            <Link to="/" className="inline-flex rounded-full" aria-label="Garuda Nexa Bahtera, ke beranda">
              <BrandLogo tone="onMedia" />
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/60 sm:text-sm">{pick('footer_address')}</p>
            {/* Baris fakta (NAP): nama badan hukum, alamat bila sudah ada, WhatsApp, email */}
            <address className="mt-5 max-w-sm text-xs not-italic leading-relaxed text-white/60 sm:text-sm">
              <span className="block font-semibold text-white">{COMPANY_FACTS.legalName}</span>
              {addressLine && <span className="mt-0.5 block">{addressLine}</span>}
              <span className="mt-1 flex flex-col items-start sm:flex-row sm:flex-wrap sm:gap-x-4">
                <a
                  href={whatsappUrl(COMPANY_FACTS.whatsapp, CONTACT_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center gap-2 transition-colors hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                  <span>
                    WhatsApp <span className="tabular-nums">{displayPhone(COMPANY_FACTS.whatsapp)}</span>
                  </span>
                  <span className="sr-only"> (tab baru)</span>
                </a>
                <a href={`mailto:${COMPANY_FACTS.email}`} className="inline-flex min-h-8 min-w-0 max-w-full items-center gap-2 transition-colors hover:text-white">
                  <Mail className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                  <EmailText email={COMPANY_FACTS.email} />
                </a>
              </span>
            </address>
          </div>

          <LinkColumn title="Template" links={TEMPLATE_LINKS} className="lg:col-span-2" />
          <LinkColumn title="Jasa" links={SERVICE_LINKS} className="lg:col-span-2" />
          <LinkColumn title="Perusahaan" links={companyLinks} className="lg:col-span-2" />
          <LinkColumn title="Legal" links={LEGAL_COLUMN} className="lg:col-span-2" />
        </div>

        {/* Bar bawah: hak cipta + akun (kiri), media sosial (kanan); di HP rata tengah (pemilik 2026-10-25) */}
        <div className="container-site flex flex-col-reverse items-center gap-4 pb-8 pt-2 text-center sm:flex-row sm:items-center sm:justify-between sm:pb-10 sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:items-start lg:flex-row lg:items-center lg:gap-6">
            <p className="text-[11px] text-white/60 sm:text-[13px]">{pick('footer_copyright')}</p>
            {/* Akun mengikuti sesi (sama dengan tombol akun di Navbar): tamu, pembeli template, atau staf */}
            <nav aria-label="Akun">
              <ul className="flex flex-wrap justify-center gap-x-4 sm:justify-start">
                {ACCOUNT_LINKS[session].map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="inline-flex min-h-8 items-center text-[11px] text-white/60 transition-colors hover:text-white sm:text-[13px]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {/* WhatsApp sudah ada di baris fakta; baris ini hanya untuk akun media sosial yang diisi admin */}
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

        {/* Teks merek raksasa ala Mobbin: selebar layar (textLength), huruf utuh tanpa terpotong (pemilik 2026-10-25);
            dekoratif. viewBox setinggi huruf kapital (± 0,73 em) + sedikit ruang di bawah */}
        <svg viewBox="0 0 1000 120" className="block w-full select-none text-white/[0.06]" aria-hidden focusable="false">
          <text x="0" y="110" textLength="1000" lengthAdjust="spacingAndGlyphs" fill="currentColor" fontSize="142" fontWeight="600">
            GARUDA NEXA
          </text>
        </svg>
      </div>
    </footer>
  );
};

export default Footer;
