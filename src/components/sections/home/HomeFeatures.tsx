import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Check,
  FileText,
  Folder,
  ListFilter,
  Lock,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { DOMAIN_PRICE_FROM, rupiahCompact } from '../../../lib/domainPricing';
import { FIRST_ORDER_DISCOUNT_PERCENT, firstOrderPrice } from '../../../lib/firstOrderDiscount';
import { HUB_PATHS } from '../../../seo/paths';
import { formatRupiah, type Template } from '../../../types/platform';
import { Reveal } from '../../ui/Reveal';
import { SplitText } from '../../ui/SplitText';

/** Panel mockup di dalam kartu: abu sangat tipis + garis rambut (versi terang dari panel gelap Framer). */
const PANEL = 'rounded-2xl bg-fg/[0.025] ring-1 ring-inset ring-line';
/** Memudar ke bawah / ke kanan, seperti mockup yang "keluar" dari kartu. */
const FADE_DOWN = '[mask-image:linear-gradient(to_bottom,#000_62%,transparent)]';
const FADE_RIGHT = '[mask-image:linear-gradient(to_right,#000_70%,transparent)]';

const Dots: React.FC = () => (
  <span className="flex gap-1">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-1.5 w-1.5 rounded-full bg-fg/15" />
    ))}
  </span>
);

/** Pratinjau template (gambar atau gradasi cadangan). Dekoratif: kartu berada di dalam ilustrasi aria-hidden. */
const Shot: React.FC<{ template?: Template; className?: string; position?: string }> = ({ template, className = '', position = 'object-top' }) =>
  template?.preview_image ? (
    <img src={template.preview_image} alt="" loading="lazy" decoding="async" className={`h-full w-full object-cover ${position} ${className}`} />
  ) : (
    <span className={`block h-full w-full bg-linear-to-br from-brand-50 to-brand-100 ${className}`} />
  );

interface TileProps {
  title: string;
  text: string;
  to: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Satu kartu bento: ilustrasi (dekoratif) di atas, lalu judul + panah dan satu kalimat. Seluruh kartu bisa diklik
 * (tautan judul diregangkan dengan ::after), jadi hanya ada satu tautan per kartu di urutan Tab.
 */
const Tile: React.FC<TileProps> = ({ title, text, to, className = '', children }) => (
  <li className={`group relative flex min-h-[300px] flex-col overflow-hidden bg-surface ${className}`}>
    <div className="relative min-h-[180px] flex-1 overflow-hidden" aria-hidden>
      {children}
    </div>
    {/* Tanpa `relative`: ::after tautan judul memakai li sebagai acuan, jadi seluruh kartu (termasuk ilustrasi) bisa diklik */}
    <div className="px-6 pb-6 pt-3 sm:px-7 sm:pb-7">
      <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">
        <Link to={to} className="inline-flex items-center gap-1.5 rounded-sm transition-colors after:absolute after:inset-0 hover:text-primary">
          {title}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </Link>
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  </li>
);

/* ------------------------------------------------------------------ ilustrasi ------------------------------------------------------------------ */

const ResponsiveIllo: React.FC<{ template?: Template }> = ({ template }) => (
  <div className="absolute inset-0 flex items-center justify-center px-8 pb-2 pt-10">
    <div className="relative w-[82%] max-w-[300px]">
      <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-line">
        <div className="flex h-5 items-center border-b border-line px-2.5">
          <Dots />
        </div>
        <div className="aspect-[16/10]">
          <Shot template={template} />
        </div>
      </div>
      <div className="absolute -bottom-5 -right-5 w-[30%] rounded-[16px] bg-surface p-1 ring-1 ring-line">
        <div className="aspect-[9/18] overflow-hidden rounded-[12px]">
          <Shot template={template} position="object-left-top" />
        </div>
      </div>
    </div>
  </div>
);

const CMS_PAGES = [
  { name: 'Beranda' },
  { name: 'Tentang' },
  { name: 'Layanan', count: 6, active: true },
  { name: 'Galeri', count: 24 },
  { name: 'Testimoni', count: 12 },
  { name: 'Kontak' },
];
const CMS_ROWS = [
  { title: 'Facial brightening', tone: 'from-brand-200 to-brand-400', live: true },
  { title: 'Perawatan jerawat', tone: 'from-success-50 to-brand-200', live: true },
  { title: 'Paket pengantin', tone: 'from-brand-100 to-brand-300', live: false },
  { title: 'Konsultasi dokter', tone: 'from-brand-50 to-brand-200', live: true },
  { title: 'Peeling wajah', tone: 'from-brand-200 to-brand-100', live: true },
];

const CmsIllo: React.FC = () => (
  <div className={`absolute inset-0 pl-6 pt-6 sm:pl-8 sm:pt-8 ${FADE_DOWN}`}>
    <div className={`flex h-full overflow-hidden rounded-tl-2xl bg-fg/[0.025] ring-1 ring-inset ring-line ${FADE_RIGHT}`}>
      <div className="w-[36%] min-w-[150px] shrink-0 border-r border-line p-3">
        <div className="flex w-fit gap-0.5 rounded-lg bg-surface p-0.5 ring-1 ring-inset ring-line">
          <span className="rounded-md bg-fg px-2.5 py-1 text-[11px] font-semibold text-white">Halaman</span>
          <span className="px-2.5 py-1 text-[11px] font-medium text-muted">Media</span>
        </div>
        <ul className="mt-3 space-y-0.5">
          {CMS_PAGES.map((page) => (
            <li
              key={page.name}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] ${page.active ? 'bg-surface font-semibold text-fg ring-1 ring-inset ring-line' : 'text-muted'}`}
            >
              {page.count ? <Folder className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{page.name}</span>
              {page.count && <span className="text-[10px] tabular-nums text-subtle">{page.count}</span>}
            </li>
          ))}
          <li className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-subtle">
            <Plus className="h-3.5 w-3.5" />
            Tambah…
          </li>
        </ul>
      </div>
      <div className="min-w-[340px] flex-1">
        <div className="flex h-11 items-center gap-4 border-b border-line px-4 text-muted">
          <Plus className="h-4 w-4" />
          <ArrowUpDown className="h-4 w-4" />
          <ListFilter className="h-4 w-4" />
          <Search className="h-4 w-4" />
        </div>
        <div className="grid grid-cols-[1fr_64px_72px] items-center gap-3 border-b border-line px-4 py-2.5 text-[11px] font-medium text-subtle">
          <span>Judul</span>
          <span>Gambar</span>
          <span>Status</span>
        </div>
        {CMS_ROWS.map((row) => (
          <div key={row.title} className="grid grid-cols-[1fr_64px_72px] items-center gap-3 border-b border-line px-4 py-2.5 text-[12px]">
            <span className="truncate text-fg">{row.title}</span>
            <span className={`h-6 w-11 rounded-md bg-linear-to-br ${row.tone}`} />
            <span
              className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.live ? 'bg-success-50 text-success-700' : 'bg-fg/5 text-muted'}`}
            >
              {row.live ? 'Tayang' : 'Draf'}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode; badge?: string }> = ({ label, value, badge }) => (
  <div>
    <p className="text-[11px] font-medium text-subtle">{label}</p>
    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-[12px] font-medium text-fg ring-1 ring-inset ring-line">
      <span className="truncate">{value}</span>
      {badge && <span className="shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">{badge}</span>}
    </div>
  </div>
);

const DomainIllo: React.FC = () => (
  <div className={`absolute inset-x-6 top-6 sm:inset-x-7 sm:top-7 ${FADE_DOWN}`}>
    <div className={`${PANEL} space-y-4 p-5`}>
      <p className="text-[15px] font-semibold text-fg">Pengaturan website</p>
      <Field label="Nama domain" value="namabisnis.com" badge="Aktif" />
      <Field label="Hosting" value="Tahun pertama sudah termasuk" badge="Aktif" />
      <Field label="Sertifikat SSL" value="HTTPS" badge="Aman" />
      <Field label="Status website" value="Online" />
    </div>
  </div>
);

const ORDER_STEPS = [
  { label: 'Menunggu pembayaran', state: 'done' },
  { label: 'Dibayar', state: 'done' },
  { label: 'Proses domain', state: 'now' },
  { label: 'Aktif', state: 'next' },
] as const;

const OrderIllo: React.FC = () => (
  <div className={`absolute inset-x-6 top-6 sm:inset-x-7 sm:top-7 ${FADE_DOWN}`}>
    <p className="flex items-center justify-between text-[13px] font-semibold text-fg">
      Status pesanan
      <span className="text-[11px] font-medium text-subtle">GN-2026</span>
    </p>
    <ul className="mt-3 space-y-1">
      {ORDER_STEPS.map((step) => (
        <li
          key={step.label}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] ${
            step.state === 'now' ? 'bg-fg/[0.04] font-semibold text-fg ring-1 ring-inset ring-line' : step.state === 'done' ? 'text-muted' : 'text-subtle'
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
              step.state === 'done' ? 'bg-primary text-white' : step.state === 'now' ? 'ring-2 ring-primary' : 'ring-1 ring-line-strong'
            }`}
          >
            {step.state === 'done' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </span>
          <span className="flex-1">{step.label}</span>
          {step.state === 'now' && <span className="text-[10px] font-medium text-primary">sekarang</span>}
        </li>
      ))}
    </ul>
  </div>
);

const DiscountIllo: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    {/* Sapuan cahaya lembut di sudut (versi terang dari lengkung di kartu Hosting Framer) */}
    <span className="absolute -right-16 -top-20 h-56 w-72 rotate-[-18deg] rounded-[50%] bg-linear-to-b from-brand-100/80 to-transparent blur-2xl" />
    <p className="relative text-center font-semibold leading-[0.85] tracking-[-0.06em]">
      <span className="block text-[84px] text-fg sm:text-[96px]">{FIRST_ORDER_DISCOUNT_PERCENT}%</span>
      <span className="block bg-linear-to-b from-fg/35 to-fg/0 bg-clip-text text-[52px] text-transparent sm:text-[60px]">diskon</span>
    </p>
  </div>
);

/**
 * Rincian bayar dari template berbayar yang benar-benar terbit (nama + harga asli, diskon sama dengan server). Tanpa
 * template berbayar: tanpa nama & angka rupiah, hanya persen diskon (tidak pernah harga karangan di nama template nyata).
 */
const PaymentIllo: React.FC<{ template?: Template }> = ({ template }) => {
  const price = template && template.price > 0 ? template.price : null;
  const total = price === null ? null : firstOrderPrice(price);
  return (
    <div className={`absolute inset-x-6 top-6 sm:inset-x-7 sm:top-7 ${FADE_DOWN}`}>
      <div className={`${PANEL} p-4 text-[12px]`}>
        <div className="flex justify-between gap-3 text-fg">
          <span className="truncate">{price === null ? 'Template pilihan Anda' : `Template ${template?.name}`}</span>
          {price !== null && <span className="tabular-nums">{formatRupiah(price)}</span>}
        </div>
        <div className="mt-1.5 flex justify-between gap-3 text-success-700">
          <span>Diskon pembelian pertama</span>
          <span className="tabular-nums">
            {price === null || total === null ? `−${FIRST_ORDER_DISCOUNT_PERCENT}%` : `−${formatRupiah(price - total)}`}
          </span>
        </div>
        <div className="mt-3 flex justify-between gap-3 border-t border-line pt-3 text-[13px] font-semibold text-fg">
          <span>Total</span>
          {total !== null && <span className="tabular-nums">{formatRupiah(total)}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex h-8 flex-1 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-white">Bayar</span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-subtle">
            <Lock className="h-3 w-3" />
            Midtrans
          </span>
        </div>
      </div>
    </div>
  );
};

const SslIllo: React.FC = () => (
  <div className={`absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-7 ${FADE_RIGHT}`}>
    <div className={`${PANEL} flex items-center gap-3 p-2 pl-3 sm:gap-4 sm:pl-4`}>
      <ArrowLeft className="h-4 w-4 shrink-0 text-subtle" />
      <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
      <RotateCw className="h-4 w-4 shrink-0 text-subtle" />
      <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface px-2.5 py-2 ring-1 ring-inset ring-line">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-white">
          <Lock className="h-3.5 w-3.5" />
        </span>
        <span className="whitespace-nowrap text-[15px] font-medium text-fg">https://namabisnis.com</span>
      </span>
    </div>
  </div>
);

const TemplatesIllo: React.FC<{ templates: Template[] }> = ({ templates }) => {
  const shown = [0, 1, 2].map((i) => templates[i]);
  return (
    <div className={`absolute inset-0 flex items-start justify-center gap-3 px-6 pt-10 sm:gap-5 sm:px-10 sm:pt-12 ${FADE_DOWN}`}>
      {shown.map((template, i) => (
        <div
          key={template?.slug ?? i}
          className={`w-1/3 max-w-[230px] shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line transition-transform duration-500 ease-calm ${
            i === 1 ? 'motion-safe:group-hover:-translate-y-2 sm:mt-0' : 'mt-6 sm:mt-8'
          }`}
        >
          <div className="flex h-4 items-center border-b border-line px-2">
            <Dots />
          </div>
          <div className="aspect-[16/10]">
            <Shot template={template} />
          </div>
          <p className="flex items-center justify-between gap-2 px-2.5 py-2 text-[11px] font-medium text-fg">
            <span className="truncate">{template?.name ?? 'Template'}</span>
            <span className="shrink-0 text-primary">Demo</span>
          </p>
        </div>
      ))}
    </div>
  );
};

const WhatsAppIllo: React.FC = () => (
  <div className={`absolute inset-x-6 top-6 sm:inset-x-7 sm:top-7 ${FADE_DOWN}`}>
    <div className={`${PANEL} overflow-hidden`}>
      <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-whatsapp text-[11px] font-bold text-white">AS</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-fg">Aura Studio</span>
          <span className="block text-[10px] text-success-700">online</span>
        </span>
      </div>
      <div className="space-y-2 p-3.5 text-[12px] leading-snug">
        <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-fg ring-1 ring-inset ring-line">
          Halo, mau booking facial hari Sabtu, bisa?
        </p>
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-success-50 px-3 py-2 text-fg">Bisa kak, mau jam berapa?</p>
      </div>
    </div>
  </div>
);

/**
 * Section beranda #keunggulan "Bukan sekadar template, semua sudah siap" (menggantikan "Cara kerja kami", permintaan
 * pemilik 2026-10-24): bento 3 kolom gaya Framer versi terang, tiap kartu = ilustrasi mockup UI + judul berpanah + satu
 * kalimat. Isinya hanya fitur yang benar-benar ada: tampilan responsif, CMS, hosting/SSL tahun pertama + domain yang
 * dipilih saat memesan (domain TIDAK termasuk harga template sejak 2026-10-25; harga dari domainPricing.ts), status
 * pesanan di akun, diskon pembelian pertama, pembayaran Midtrans, katalog + demo, dan tombol WhatsApp di template.
 * Gambar pratinjau diambil dari template yang terbit (data prerender); tanpa data → gradasi cadangan.
 */
const HomeFeatures: React.FC<{ alt?: boolean; number?: string }> = ({ alt }) => {
  const { templates } = usePublishedTemplates();
  const [first] = templates;
  const paid = templates.find((template) => template.price > 0);

  return (
    <section id="keunggulan" aria-labelledby="keunggulan-title" className={`section-screen ${alt ? 'bg-alt' : 'bg-canvas'}`}>
      <div className="container-site w-full">
        <div className="max-w-2xl">
          <h2
            id="keunggulan-title"
            className="text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-5xl sm:leading-[1.04] xl:text-[56px]"
          >
            <SplitText delay={80} className="block" parts="Bukan sekadar template," />
            <SplitText delay={260} className="block" parts={[{ text: 'semua sudah siap.', className: 'text-primary' }]} />
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted sm:mt-5 sm:text-lg sm:leading-relaxed">
              Domain, hosting, SSL, CMS, dan pembayaran dalam satu tempat. Anda tinggal mengisi konten.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          {/* Garis rambut antarkartu = latar ul yang terlihat di celah 1px (gap-px), sudut luar membulat */}
          <ul className="mt-10 grid gap-px overflow-hidden rounded-[28px] bg-line ring-1 ring-line sm:mt-14 sm:grid-flow-dense sm:grid-cols-2 lg:grid-cols-3">
            <Tile title="Responsif" text="Rapi di HP, tablet, dan desktop." to={HUB_PATHS.catalog} className="lg:col-start-1 lg:row-start-1 lg:min-h-[440px]">
              <ResponsiveIllo template={first} />
            </Tile>
            <Tile
              title="CMS"
              text="Ganti teks, foto, dan warna sendiri tanpa coding."
              to={HUB_PATHS.catalog}
              className="sm:col-span-2 lg:col-start-2 lg:row-start-1 lg:min-h-[440px]"
            >
              <CmsIllo />
            </Tile>
            <Tile
              title="Domain & hosting"
              text={`Hosting & SSL tahun pertama sudah termasuk. Domain mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun.`}
              to={HUB_PATHS.pricing}
              className="min-h-[380px] lg:col-start-1 lg:row-span-2 lg:row-start-2"
            >
              <DomainIllo />
            </Tile>
            <Tile title="Status pesanan" text="Pantau prosesnya dari akun Anda." to="/akun" className="lg:col-start-2 lg:row-start-2">
              <OrderIllo />
            </Tile>
            <Tile
              title="Promo"
              text={`Diskon ${FIRST_ORDER_DISCOUNT_PERCENT}% otomatis untuk pembelian template pertama.`}
              to={HUB_PATHS.catalog}
              className="lg:col-start-3 lg:row-start-2"
            >
              <DiscountIllo />
            </Tile>
            <Tile title="Pembayaran" text="Bayar aman lewat Midtrans." to={HUB_PATHS.pricing} className="lg:col-start-2 lg:row-start-3">
              <PaymentIllo template={paid} />
            </Tile>
            <Tile title="SSL" text="HTTPS aman sejak hari pertama." to={HUB_PATHS.pricing} className="lg:col-start-3 lg:row-start-3">
              <SslIllo />
            </Tile>
            <Tile
              title="Template & demo"
              text="Lihat demonya dulu, baru pilih."
              to={HUB_PATHS.catalog}
              className="min-h-[340px] sm:col-span-2 lg:col-start-1 lg:row-start-4 lg:min-h-[420px]"
            >
              <TemplatesIllo templates={templates} />
            </Tile>
            <Tile
              title="WhatsApp"
              text="Pengunjung langsung chat ke bisnis Anda."
              to={HUB_PATHS.catalog}
              className="sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-4 lg:min-h-[420px]"
            >
              <WhatsAppIllo />
            </Tile>
          </ul>
        </Reveal>

        {/* Kalimat lebih panjang sejak domain dibayar terpisah: di HP membungkus 2–3 baris, ikon sejajar baris pertama */}
        <div className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-muted sm:mt-8 sm:items-center sm:text-sm">
          <ShieldCheck className="mt-[3px] h-4 w-4 shrink-0 text-primary sm:mt-0" aria-hidden />
          <span>
            Harga template sudah termasuk setup awal, hosting, dan SSL tahun pertama; domain dipilih saat memesan, mulai{' '}
            {rupiahCompact(DOMAIN_PRICE_FROM)}/tahun.
          </span>
        </div>
      </div>
    </section>
  );
};

export default HomeFeatures;
