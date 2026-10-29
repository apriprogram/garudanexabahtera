import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Layout, 
  Image as ImageIcon, 
  Briefcase, 
  CreditCard, 
  Activity, 
  HelpCircle, 
  LayoutTemplate,
  Table2,
  BookOpen,
  Bot,
  Save,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  FileArchive
} from 'lucide-react';
import { motion } from 'framer-motion';
import HeroSettings from './HeroSettings';
import { NexaCustomProviderCard, type NexaCustomConfig } from './nexa/NexaCustomProviderCard';
import { parseHeroOverlay, parseHeroTextTone } from '../../components/sections/hero/heroBgConfig';
import type { HeroTextTone } from '../../components/sections/hero/heroContrast';
import {
  heroMediaBaseline,
  omitUnchangedHeroMedia,
  parseHeroImages,
  parseHeroLogos,
  type HeroBgMode,
  type HeroMediaBaseline,
} from './hero/heroMedia';
import { ApiError, apiGet, apiPost, errorMessage } from '../../lib/api';
import { DOMAIN_TLDS, HOSTING_RENEWAL_DEFAULT, HOSTING_RENEWAL_SETTING, hostingRenewalPrice, rupiahCompact } from '../../lib/domainPricing';
import { useDomainPrices } from '../../lib/useDomainPrices';
import {
  Button,
  ConfirmDialog,
  Field,
  FOCUS_INSET,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Panel,
  PanelHeader,
  PasswordInput,
  Segmented,
  Switch,
  Tabs,
  Textarea,
  cn,
  panelClass,
} from '../../components/admin/ui';
import {
  addonPostsPrice,
  DEFAULT_CONTACT_EMAIL,
  getHiddenSections,
  TEMPLATE_PRICE_INCLUDES_DEFAULT,
  TEMPLATE_PRICE_NOTE_DEFAULT,
} from '../../hooks/useSiteSettings';
import { ADDON_POSTS_PRICE_DEFAULT, ADDON_POSTS_PRICE_SETTING } from '../../types/siteAddons';
import { GUIDES_INTRO_DEFAULT } from '../public/panduan/PanduanIndex.seo';
import { GuidesManager } from './guides/GuidesManager';
import type { PortfolioItem } from '../../components/sections/projects/portfolio';
import PortfolioEditor from './portfolio/PortfolioEditor';
import PortfolioImportDialog from './portfolio/PortfolioImportDialog';
import { addImportedProject } from './portfolio/portfolioImport';
import { useToast } from './template-orders/shared/hooks';
import { Toast } from './template-orders/shared/OrderUi';

/** Judul CTA bawaan (sentence case; baris kedua tampil lebih lembut di website). */
const CTA_TITLE_DEFAULT = 'Siap membangun sistem digital?\nKonsultasikan sekarang juga!';

/**
 * Nilai isian rupiah untuk disimpan: hanya angka (dibulatkan); kosong/tidak valid → '' (= harga bawaan di website &
 * backend, mis. pf_hosting_renewal_price / sa_price).
 */
const rupiahDigits = (value: string): string => {
  const text = value.trim();
  const number = Number(text);
  return text && Number.isFinite(number) && number >= 0 ? String(Math.round(number)) : '';
};

/*
 * Isian harga rupiah satu setting (hosting & jasa tahun ke-2, harga fitur tambahan). Tidak terkontrol seperti isian
 * lain di tab ini (dibaca lewat id saat simpan, lalu rupiahDigits); state hanya untuk petunjuk harga yang akan dibayar
 * pembeli. Setting yang belum pernah disimpan tampil dengan harga bawaannya.
 */
function RupiahSettingField({
  setting,
  label,
  stored,
  fallback,
  priceOf,
  hint,
}: {
  setting: string;
  label: string;
  stored: string | undefined;
  fallback: number;
  /** Harga yang berlaku untuk nilai isian (sama dengan backend: kosong/0/tidak valid → bawaan) */
  priceOf: (settings: SettingsMap) => number;
  hint: (price: number) => React.ReactNode;
}) {
  const initial = stored ?? String(fallback);
  const [draft, setDraft] = useState(initial);
  const price = priceOf({ [setting]: rupiahDigits(draft) });
  const hintId = `${setting}_hint`;
  return (
    <Field label={label} htmlFor={setting} hint={<span id={hintId}>{hint(price)}</span>}>
      <Input
        id={setting}
        name={setting}
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        defaultValue={initial}
        onChange={(event) => setDraft(event.target.value)}
        aria-describedby={hintId}
        className="tabular-nums"
      />
    </Field>
  );
}

const DOMAIN_MARKUP_SETTING = 'domain_markup_percent';
const DOMAIN_MARKUP_MAX = 500;

/** Markup untuk disimpan: bilangan bulat 0–500 (sama dengan domain_markup_percent di backend); selain itu '' (= bawaan). */
const percentDigits = (value: string): string => {
  const text = value.trim();
  const number = Number(text);
  return /^\d{1,3}$/.test(text) && number <= DOMAIN_MARKUP_MAX ? String(number) : '';
};

/** Ekstensi berharga tetap dari pemilik (tidak ikut markup), sama dengan DOMAIN_FIXED_PRICES di backend. */
const FIXED_PRICE_TLDS = ['com', 'id', 'my.id', 'web.id'];

interface DomainPricingInfo {
  source: 'default' | 'dewabiz';
  markup_percent: number;
  markup_default: number;
}

/*
 * Markup harga beli DewaBiz untuk ekstensi selain yang harganya tetap (setting domain_markup_percent). Tidak ikut
 * get_settings publik, jadi dimuat lewat admin_get_domain_pricing; isian baru muncul setelah nilainya dimuat sehingga
 * simpan tidak pernah menimpa markup dengan nilai yang belum dibaca (dibaca lewat id saat simpan).
 */
function DomainMarkupField() {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; info: DomainPricingInfo }>({
    status: 'loading',
  });
  useEffect(() => {
    let alive = true;
    apiGet<Partial<DomainPricingInfo>>('admin_get_domain_pricing')
      .then((data) => {
        const markupDefault = Number.isInteger(data.markup_default) ? Number(data.markup_default) : 25;
        const info: DomainPricingInfo = {
          source: data.source === 'dewabiz' ? 'dewabiz' : 'default',
          markup_percent: Number.isInteger(data.markup_percent) ? Number(data.markup_percent) : markupDefault,
          markup_default: markupDefault,
        };
        if (alive) setState({ status: 'ready', info });
      })
      .catch((err: unknown) => alive && setState({ status: 'error', message: errorMessage(err, 'Markup harga domain belum bisa dimuat.') }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'loading') return <p className="text-[13px] text-adm-muted">Memuat markup harga domain…</p>;
  if (state.status === 'error') return <p className="text-[13px] text-danger-700">{state.message}</p>;
  const { info } = state;
  const fixed = DOMAIN_TLDS.filter((t) => FIXED_PRICE_TLDS.includes(t.tld))
    .map((t) => `.${t.tld}`)
    .join(', ');
  const hintId = `${DOMAIN_MARKUP_SETTING}_hint`;
  return (
    <Field
      label="Markup harga domain dari DewaBiz (%)"
      htmlFor={DOMAIN_MARKUP_SETTING}
      hint={
        <span id={hintId}>
          Untuk ekstensi selain {fixed} (harganya tetap): harga jual = harga beli DewaBiz + markup, dibulatkan ke atas ke
          Rp100. Kosong = bawaan {info.markup_default}%.{' '}
          {info.source === 'dewabiz'
            ? 'Sumber harga saat ini: DewaBiz.'
            : 'Belum berlaku: DewaBiz belum terhubung (isi DEWABIZ_RESELLER_ID dan DEWABIZ_API_KEY di .env server), jadi harga memakai tabel bawaan.'}
        </span>
      }
    >
      <Input
        id={DOMAIN_MARKUP_SETTING}
        name={DOMAIN_MARKUP_SETTING}
        type="number"
        inputMode="numeric"
        min={0}
        max={DOMAIN_MARKUP_MAX}
        step={1}
        defaultValue={String(info.markup_percent)}
        aria-describedby={hintId}
        className="tabular-nums"
      />
    </Field>
  );
}

/* Harga domain yang dibayar pembeli (get_domain_prices: DewaBiz bila terhubung, selain itu tabel bawaan), hanya dibaca. */
function DomainPriceList() {
  const { domains } = useDomainPrices();
  return (
    <div className="min-w-0">
      <p id="domain-price-list-label" className="mb-1.5 text-[13px] font-medium text-adm-fg">
        Harga domain per tahun (tahun pertama & perpanjangan)
      </p>
      <ul aria-labelledby="domain-price-list-label" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((row) => (
          <li key={row.tld} className="rounded-xl border border-adm-line px-3 py-2 text-[13px]">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-adm-fg">.{row.tld}</span>
              <span className="tabular-nums text-adm-fg">{rupiahCompact(row.price)}</span>
            </span>
            {row.requirement && <span className="mt-0.5 block text-xs leading-relaxed text-adm-muted">{row.requirement}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs leading-relaxed text-adm-muted">
        Hanya dibaca: harga domain diatur di kode situs (atau dari DewaBiz bila terhubung) dan tampil di halaman Harga serta halaman pesan.
      </p>
    </div>
  );
}

/* Panel keterangan untuk tab yang isinya diatur otomatis / di kode (tanpa isian). */
function InfoNote({ children }: { children: React.ReactNode }) {
  return <Panel className="space-y-2 text-sm leading-relaxed text-adm-muted">{children}</Panel>;
}

/* Daftar FAQ & proyek baru tampil di website setelah simpan global: diingatkan di notifikasi tambah/ubah/hapus. */
const SAVE_REMINDER = 'Klik Simpan semua perubahan agar tersimpan di website.';

/** Teks pendek untuk judul dialog & notifikasi (pertanyaan FAQ bisa panjang; data JSON lama bisa tanpa isian). */
const clip = (text: string | undefined, max = 60) => {
  const value = String(text ?? '').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

/** Hapus yang menunggu konfirmasi: judul & keterangan dialog, lalu aksi yang dijalankan setelah "Ya, hapus". */
type Removal = { title: string; description: string; run: () => void };

/** Respons get_settings: setting_key → setting_value. Daftar di bawah disimpan sebagai string JSON. */
type SettingsMap = Record<string, string>;

/*
 * Saklar tampil/sembunyi per tab (permintaan pemilik 2026-10-23), kecuali Hero & Footer: kunci section di setting
 * `disabled_sections` (dibaca Home.tsx, Footer.tsx, Navbar). Disimpan bersama "Simpan semua perubahan".
 */
const SECTION_KEY_OF_TAB: Partial<Record<string, string>> = {
  templates: 'templates',
  portfolio: 'projects',
  compare: 'perbandingan',
  process: 'keunggulan',
  faq: 'faq',
  services: 'cta',
  // Bukan section beranda: menyembunyikan tautan Panduan di navbar & footer (halamannya tetap bisa dibuka)
  guides: 'panduan',
};

/** Konfigurasi AI widget Nexa dari nexa_get_config (kunci hanya topeng 4 karakter terakhir). */
interface NexaProviderConfig {
  on: boolean;
  key_masked: string;
  env_key: boolean;
}
interface NexaConfig {
  enabled: boolean;
  provider: 'anthropic' | 'gemini' | 'custom';
  anthropic: NexaProviderConfig;
  gemini: NexaProviderConfig;
  /** Endpoint custom OpenAI-compatible; tidak ada di backend lama (sebelum 2026-10-24) */
  custom?: NexaCustomConfig;
}
const NEXA_PROVIDER_LABEL = { anthropic: 'Claude (Anthropic)', gemini: 'Gemini (Google)', custom: 'Endpoint custom' } as const;
const NEXA_CUSTOM_EMPTY: NexaCustomConfig = { on: true, key_masked: '', env_key: false, url: '', model: '' };

/** Keterangan di bawah judul tab; tab lain memakai keterangan umum. */
const TAB_SUBTITLE: Partial<Record<string, string>> = {
  templates: 'Section "Pilih Template" di beranda. Katalognya diambil dari template yang terbit.',
  compare: 'Tabel "Pilih sesuai kebutuhanmu" di beranda.',
  pricing: 'Tampil di detail template, halaman pesan, akun pembeli, dan halaman Harga.',
  guides: 'Halaman /panduan dan artikel panduan.',
  nexa: 'Chat Nexa AI melayang di seluruh situs: penyedia jawaban dan kunci API-nya.',
};

/** Error simpan dengan pesan dari server yang ditampilkan apa adanya (mis. 409 latar hero diubah di tab lain). */
class SaveError extends Error {}

/** Pesan `error` dari respons JSON server, atau "" bila tidak ada / bukan JSON. */
async function serverErrorOf(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
    return typeof error === 'string' ? error.trim() : '';
  } catch {
    return '';
  }
}

/* Teks tombol simpan selama ditahan (lihat saveBlock). Gagal muat: teks tetap, alasannya tampil di sebelahnya. */
const SAVE_BLOCK_LABEL = {
  loading: 'Memuat pengaturan...',
  failed: 'Simpan semua perubahan',
  video: 'Menunggu unggahan video...',
  images: 'Memproses gambar...',
} as const;

/** Satu entri faq_data. */
interface FaqItem {
  question: string;
  answer: string;
}

const SiteSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hero');
  const [isSaving, setIsSaving] = useState(false);
  // Notifikasi melayang bersama panel admin (atas tengah layar): satu untuk halaman ini, diteruskan ke tab Hero,
  // editor & impor proyek, dan Panduan lewat prop `notify`
  const { toast, show: notify, dismiss: dismissToast } = useToast();
  // Setiap hapus dikonfirmasi dulu (pemilik 2026-10-29): FAQ, proyek, dan kunci AI tersimpan. Isi dialog dipertahankan
  // selama animasi tutup.
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const askRemove = (title: string, description: string, run: () => void) => {
    setRemoval({ title, description, run });
    setRemovalOpen(true);
  };

  // Urutan = urutan di website (beranda: Hero → Template → Proyek → Perbandingan → Keunggulan → FAQ → Banner CTA → Footer),
  // lalu halaman lain (harga template, Panduan). Produk & paket harga lama dihapus: tidak tampil di website (pemilik
  // 2026-10-24). id tab lama (process, services) dipertahankan agar saklar section tetap sama.
  const tabs = [
    { id: 'hero', label: 'Hero', icon: ImageIcon },
    { id: 'templates', label: 'Template', icon: LayoutTemplate },
    { id: 'portfolio', label: 'Proyek', icon: Briefcase },
    { id: 'compare', label: 'Perbandingan', icon: Table2 },
    { id: 'process', label: 'Keunggulan', icon: Activity },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'services', label: 'Banner CTA', icon: HelpCircle },
    { id: 'footer', label: 'Footer', icon: Layout },
    { id: 'pricing', label: 'Harga template', icon: CreditCard },
    { id: 'guides', label: 'Panduan', icon: BookOpen },
    { id: 'nexa', label: 'Tanya Nexa', icon: Bot },
  ];

  // State values for all settings
  const [settings, setSettings] = useState<SettingsMap>({});
  
  // Hero section States
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroLogos, setHeroLogos] = useState<{name: string, src: string}[]>([]);
  // Latar hero: mode + video (URL hasil upload_hero_video) + gambar sampul
  const [heroBgMode, setHeroBgMode] = useState<HeroBgMode>('default');
  const [heroVideo, setHeroVideo] = useState('');
  const [heroVideoPoster, setHeroVideoPoster] = useState('');
  // Teks hero di atas gambar/video: warna (hero_text_tone) dan lapisan dalam persen, dipakai persis (hero_overlay)
  const [heroTextTone, setHeroTextTone] = useState<HeroTextTone>('auto');
  const [heroOverlay, setHeroOverlay] = useState(() => parseHeroOverlay(undefined));
  // true selama video diunggah sampai sampulnya terpasang (juga setelah tab Hero ditutup): tombol simpan ditahan
  // supaya video setengah jadi atau video tanpa sampulnya tidak ikut tersimpan
  const [heroBusy, setHeroBusy] = useState(false);
  // Gambar latar yang sedang dikecilkan: tombol simpan ditahan sampai semuanya masuk daftar; juga ikut dihitung dalam
  // batas jumlah gambar oleh tab Hero yang dibuka lagi
  const [heroImagesPending, setHeroImagesPending] = useState(0);
  const handleHeroImagesProcessing = useCallback((delta: number) => setHeroImagesPending((n) => Math.max(0, n + delta)), []);
  // Pesan gambar latar yang selesai diproses setelah tab Hero ditutup (gagal dibaca, melewati batas)
  const handleHeroImageNotice = useCallback(
    (message: string) => notify('warning', 'Gambar latar tidak ditambahkan', message),
    [notify],
  );
  // Muat terakhir: simpan hanya boleh setelah get_settings berhasil, supaya muat gagal tidak menyimpan isian kosong
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Latar hero dari muat terakhir yang berhasil: dasar hero_media_base dan pembanding kunci yang tidak diubah
  const heroBaselineRef = useRef<HeroMediaBaseline | null>(null);

  // Portfolio tab States
  const [portfolioList, setPortfolioList] = useState<PortfolioItem[]>([]);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState<number | null>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  // Naik tiap kali editor dibuka: editor dipasang ulang dan mulai dari proyek yang dipilih
  const [portfolioEditorKey, setPortfolioEditorKey] = useState(0);
  // Impor ZIP (portfolio/PortfolioImportDialog.tsx); key naik tiap kali dibuka supaya mulai dari awal
  const [isPortfolioImportOpen, setIsPortfolioImportOpen] = useState(false);
  const [portfolioImportKey, setPortfolioImportKey] = useState(0);

  // FAQ tab States
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: ''
  });
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);



  /** Muat semua setting; true bila berhasil (baru setelah itu tombol simpan aktif). */
  const fetchSettings = useCallback(async (): Promise<boolean> => {
    try {
      const apiUrl = '/api.php';
      const response = await fetch(`${apiUrl}?action=get_settings`);
      // Respons gagal / {error} / bukan objek = muat gagal (bukan pengaturan kosong yang lalu ikut tersimpan).
      // Tabel setting yang masih kosong dikirim PHP sebagai [] (json_encode array kosong) → pengaturan kosong {}.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw: unknown = await response.json();
      const body = Array.isArray(raw) && raw.length === 0 ? {} : raw;
      if (!body || typeof body !== 'object' || Array.isArray(body) || 'error' in body) throw new Error('Respons get_settings tidak sesuai');
      const data = body as SettingsMap;
      setSettings(data);
      
      // Load Hero: gambar, logo, dan latar (isi state = dasar). JSON rusak → daftar kosong, tidak menggagalkan muat halaman.
      const heroBaseline = heroMediaBaseline(data);
      setHeroImages(parseHeroImages(data.hero_images));
      if (data.hero_logos) setHeroLogos(parseHeroLogos(data.hero_logos));
      setHeroBgMode(heroBaseline.hero_bg_mode);
      setHeroVideo(heroBaseline.hero_bg_video);
      setHeroVideoPoster(heroBaseline.hero_bg_video_poster);
      // Dinormalkan sama dengan website & backend (tidak dikenal → Otomatis, bukan angka → 40%)
      setHeroTextTone(parseHeroTextTone(data.hero_text_tone));
      setHeroOverlay(parseHeroOverlay(data.hero_overlay));

      // Load Portfolio tab data
      if (data.portfolio_data) {
        setPortfolioList(JSON.parse(data.portfolio_data));
      } else {
        setPortfolioList([
          { title: "Web App Dashboard", desc: "SAAS / FINANCE", image: "/assets/portofolio/portfolio1.png", span: "md:col-span-4" },
          { title: "Mobile POS App", desc: "RETAIL / ANDROID", image: "/assets/portofolio/portfolio2.png", span: "md:col-span-4" },
          { title: "E-Commerce System", desc: "SHOPPING / WEB", image: "/assets/product/ischool.png", span: "md:col-span-4" },
          { title: "Corporate Website", desc: "BRANDING / MODERN", image: "/assets/product/isantri.png", span: "md:col-span-7" },
          { title: "Sistem Informasi Desa", desc: "GOVERNMENT / WEB", image: "/assets/product/pos.png", span: "md:col-span-5" }
        ]);
      }

      // Load FAQ tab data
      if (data.faq_data) {
        setFaqList(JSON.parse(data.faq_data));
      } else {
        setFaqList([
          { question: "Berapa lama proses pembuatan satu website?", answer: "Waktu pengerjaan bervariasi tergantung paket. Paket Basic memakan waktu 4-7 hari, sedangkan Paket Profesional dan Premium berkisar antara 10-14 hari kerja." },
          { question: "Apakah harga sudah termasuk hosting dan domain?", answer: "Ya, untuk tahun pertama kami memberikan gratis Hosting Cloud kecepatan tinggi dan Domain (.com/.id/.net) untuk setiap paket yang Anda pilih." },
          { question: "Apakah website yang dibuat bisa saya edit sendiri?", answer: "Tentu. Kami menggunakan sistem CMS (Content Management System) yang memudahkan Anda untuk mengubah teks, gambar, atau menambahkan artikel blog tanpa harus mengerti bahasa pemrograman." },
          { question: "Bagaimana dengan sistem keamanannya?", answer: "Setiap website yang kami bangun dilengkapi dengan sertifikat SSL (HTTPS) gratis dan sistem keamanan standar industri untuk melindungi data Anda dan pengunjung." },
          { question: "Siapa pemilik konten yang saya buat?", answer: "Seluruh konten dan data yang ada pada website atau aplikasi Anda sepenuhnya adalah milik Anda. Kami hanya membantu dalam proses pengembangan dan pemeliharaan sistem." }
        ]);
      }



      // Semua bagian termuat: dasar latar hero dari muatan ini, tombol simpan boleh aktif
      heroBaselineRef.current = heroBaseline;
      setLoadState('ready');
      return true;
    } catch (error) {
      console.error('Error fetching settings:', error);
      notify('error', 'Gagal memuat pengaturan', 'Pengaturan website tidak bisa dimuat. Coba muat ulang halaman.');
      setLoadState('failed');
      return false;
    }
  }, [notify]);

  useEffect(() => {
    // fetchSettings baru memanggil setState setelah await; aturan ini tidak membedakan fungsi async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  // Alasan tombol simpan ditahan, null = boleh simpan: belum/gagal muat, video diunggah, atau gambar masih diproses
  const saveBlock: keyof typeof SAVE_BLOCK_LABEL | null =
    loadState !== 'ready' ? loadState : heroBusy ? 'video' : heroImagesPending > 0 ? 'images' : null;

  // ── Tab Tanya Nexa: konfigurasi AI (dimuat saat tab dibuka; kunci tidak pernah dikirim balik utuh) ──
  const [nexaCfg, setNexaCfg] = useState<NexaConfig | null>(null);
  const [nexaCfgState, setNexaCfgState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [nexaKeys, setNexaKeys] = useState({ anthropic: '', gemini: '', custom: '' });
  const [nexaClear, setNexaClear] = useState({ anthropic: false, gemini: false, custom: false });
  const [nexaSaving, setNexaSaving] = useState(false);
  // Alamat endpoint custom yang tersimpan di server: kunci tersimpan terikat ke servernya (lihat NexaCustomProviderCard)
  const [nexaCustomSavedUrl, setNexaCustomSavedUrl] = useState('');

  const loadNexaConfig = useCallback(async () => {
    try {
      const data = await apiPost<{ config?: NexaConfig }>('nexa_get_config', {});
      if (!data.config) throw new Error('config kosong');
      setNexaCfg(data.config);
      setNexaCustomSavedUrl(data.config.custom?.url ?? '');
      setNexaCfgState('ready');
    } catch {
      setNexaCfgState('failed');
    }
  }, []);

  useEffect(() => {
    // Hanya saat tab dibuka pertama kali; penanda 'loading' dipasang sinkron agar effect tidak berulang
    if (activeTab !== 'nexa' || nexaCfgState !== 'idle') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- satu kali per buka tab, seperti fetchSettings
    setNexaCfgState('loading');
    void loadNexaConfig();
  }, [activeTab, nexaCfgState, loadNexaConfig]);

  const retryNexaConfig = () => {
    setNexaCfgState('loading');
    void loadNexaConfig();
  };

  const saveNexaConfig = async () => {
    if (!nexaCfg || nexaSaving) return;
    setNexaSaving(true);
    try {
      // Kunci baru yang diketik menang atas "Hapus kunci tersimpan" (mengganti = menghapus lama + memakai yang baru)
      const keyField = (name: 'anthropic' | 'gemini' | 'custom') =>
        nexaKeys[name].trim() !== '' ? { key: nexaKeys[name].trim() } : nexaClear[name] ? { key: null } : {};
      const custom = nexaCfg.custom ?? NEXA_CUSTOM_EMPTY;
      const data = await apiPost<{ config?: NexaConfig }>('nexa_save_config', {
        provider: nexaCfg.provider,
        anthropic: { on: nexaCfg.anthropic.on, ...keyField('anthropic') },
        gemini: { on: nexaCfg.gemini.on, ...keyField('gemini') },
        custom: { on: custom.on, url: custom.url.trim(), model: custom.model.trim(), ...keyField('custom') },
      });
      if (data.config) {
        setNexaCfg(data.config);
        setNexaCustomSavedUrl(data.config.custom?.url ?? '');
      }
      setNexaKeys({ anthropic: '', gemini: '', custom: '' });
      setNexaClear({ anthropic: false, gemini: false, custom: false });
      notify('success', 'Pengaturan AI tersimpan', 'Kunci disimpan di server dan tidak pernah ditampilkan penuh.');
    } catch (error) {
      // Pesan utama server sudah menyebut alasannya (mis. "Alamat endpoint tidak valid: pakai https://…")
      notify('error', 'Gagal menyimpan pengaturan AI', error instanceof ApiError ? error.message : errorMessage(error));
    } finally {
      setNexaSaving(false);
    }
  };

  // "Hapus kunci tersimpan" hanya menandai; kuncinya dihapus server saat pengaturan AI disimpan. Menandai dikonfirmasi
  // dulu, membatalkan tanda tidak.
  const toggleNexaKeyClear = (name: 'anthropic' | 'gemini' | 'custom') => {
    if (nexaClear[name]) {
      setNexaClear((prev) => ({ ...prev, [name]: false }));
      return;
    }
    const masked = (name === 'custom' ? nexaCfg?.custom?.key_masked : nexaCfg?.[name].key_masked) ?? '';
    const label = NEXA_PROVIDER_LABEL[name];
    askRemove(
      `Hapus kunci API ${label}?`,
      `Kunci tersimpan${masked ? ` ${masked}` : ''} dihapus dari server saat kamu klik Simpan pengaturan AI.`,
      () => {
        setNexaClear((prev) => ({ ...prev, [name]: true }));
        notify('info', `Kunci API ${label} akan dihapus.`, 'Klik Simpan pengaturan AI untuk menghapusnya dari server.');
      },
    );
  };

  // Saklar section: ubah daftar disabled_sections di state; ikut terkirim lewat `...settings` saat disimpan
  const setSectionVisible = (key: string, visible: boolean) => {
    setSettings((prev) => {
      const hidden = getHiddenSections(prev);
      if (visible) hidden.delete(key);
      else hidden.add(key);
      return { ...prev, disabled_sections: JSON.stringify([...hidden]) };
    });
  };

  const handleSave = async () => {
    const heroBaseline = heroBaselineRef.current;
    if (isSaving || saveBlock || !heroBaseline) return;
    setIsSaving(true);

    // Catatan harga template hanya ditulis bila tab Harga sedang terbuka. Nilai kosong ikut disimpan (= sembunyikan
    // barisnya di website); setting yang belum pernah disimpan memakai teks bawaan di useSiteSettings.
    const priceIncludesEl = document.getElementById('template_price_includes') as HTMLTextAreaElement | null;
    const priceNoteEl = document.getElementById('template_price_note') as HTMLTextAreaElement | null;
    const hostingRenewalEl = document.getElementById(HOSTING_RENEWAL_SETTING) as HTMLInputElement | null;
    const addonPostsPriceEl = document.getElementById(ADDON_POSTS_PRICE_SETTING) as HTMLInputElement | null;
    // Markup DewaBiz: hanya bila isiannya tampil (tab Harga terbuka dan nilainya sudah dimuat)
    const domainMarkupEl = document.getElementById(DOMAIN_MARKUP_SETTING) as HTMLInputElement | null;
    // Teks pembuka /panduan (hanya bila tab Panduan terbuka; kosong = teks bawaan)
    const guidesIntroEl = document.getElementById('guides_intro') as HTMLTextAreaElement | null;

    // Read input values directly from DOM elements safely
    const updatedSettings = {
      ...settings,
      hero_badge: (document.getElementById('hero_badge') as HTMLInputElement)?.value || settings.hero_badge || "",
      hero_title: (document.getElementById('hero_title') as HTMLTextAreaElement)?.value || settings.hero_title || "",
      hero_subtitle: (document.getElementById('hero_subtitle') as HTMLTextAreaElement)?.value || settings.hero_subtitle || "",
      hero_primary_btn: (document.getElementById('hero_primary_btn') as HTMLInputElement)?.value || settings.hero_primary_btn || "Lihat Produk Kami",
      hero_secondary_btn: (document.getElementById('hero_secondary_btn') as HTMLInputElement)?.value || settings.hero_secondary_btn || "Hubungi Kami",
      hero_images: JSON.stringify(heroImages),
      hero_logos: JSON.stringify(heroLogos),
      // Latar hero (string semua). Sampul baru berupa data URI JPEG; backend menyimpannya sebagai file.
      hero_bg_mode: heroBgMode,
      hero_bg_video: heroVideo,
      hero_bg_video_poster: heroVideoPoster,
      hero_text_tone: heroTextTone,
      hero_overlay: String(heroOverlay),

      // Portfolio data
      portfolio_data: JSON.stringify(portfolioList),

      // Harga template
      ...(priceIncludesEl ? { template_price_includes: priceIncludesEl.value.trim() } : {}),
      ...(priceNoteEl ? { template_price_note: priceNoteEl.value.trim() } : {}),
      // Hosting & jasa per tahun mulai tahun ke-2: angka saja (kosong = bawaan Rp500.000)
      ...(hostingRenewalEl ? { [HOSTING_RENEWAL_SETTING]: rupiahDigits(hostingRenewalEl.value) } : {}),
      // Fitur Berita & Pengumuman, sekali bayar: angka saja (kosong = bawaan Rp350.000)
      ...(addonPostsPriceEl ? { [ADDON_POSTS_PRICE_SETTING]: rupiahDigits(addonPostsPriceEl.value) } : {}),
      // Markup harga domain DewaBiz: bilangan bulat 0–500 (kosong = bawaan 25%)
      ...(domainMarkupEl ? { [DOMAIN_MARKUP_SETTING]: percentDigits(domainMarkupEl.value) } : {}),

      // FAQ data
      faq_data: JSON.stringify(faqList),

      // Panduan
      ...(guidesIntroEl ? { guides_intro: guidesIntroEl.value.trim() } : {}),



      // CTA Banner data
      cta_title: (document.getElementById('cta_title') as HTMLTextAreaElement)?.value || settings.cta_title || CTA_TITLE_DEFAULT,
      cta_button: (document.getElementById('cta_button') as HTMLInputElement)?.value || settings.cta_button || "Hubungi WhatsApp",
      cta_link: (document.getElementById('cta_link') as HTMLInputElement)?.value || settings.cta_link || "",

      // Footer data
      footer_address: (document.getElementById('footer_address') as HTMLTextAreaElement)?.value || settings.footer_address || "Mitra terpercaya untuk inovasi digital bisnis Anda. Membantu dari ide hingga menjadi produk siap rilis.",
      footer_phone: (document.getElementById('footer_phone') as HTMLInputElement)?.value || settings.footer_phone || "085188009152",
      footer_email: (document.getElementById('footer_email') as HTMLInputElement)?.value || settings.footer_email || DEFAULT_CONTACT_EMAIL,
      footer_whatsapp: (document.getElementById('footer_whatsapp') as HTMLInputElement)?.value || settings.footer_whatsapp || "6285188009152",
      footer_instagram: (document.getElementById('footer_instagram') as HTMLInputElement)?.value || settings.footer_instagram || "#",
      footer_facebook: (document.getElementById('footer_facebook') as HTMLInputElement)?.value || settings.footer_facebook || "#",
      footer_linkedin: (document.getElementById('footer_linkedin') as HTMLInputElement)?.value || settings.footer_linkedin || "#",
      footer_tiktok: (document.getElementById('footer_tiktok') as HTMLInputElement)?.value || settings.footer_tiktok || "#",
      footer_youtube: (document.getElementById('footer_youtube') as HTMLInputElement)?.value || settings.footer_youtube || "#",
      footer_copyright: (document.getElementById('footer_copyright') as HTMLInputElement)?.value || settings.footer_copyright || "© 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi.",
    };

    try {
      const apiUrl = '/api.php';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_settings',
          // Latar hero yang tidak diubah sejak dimuat tidak dikirim, supaya tidak menimpa perubahan dari tab lain
          settings: omitUnchangedHeroMedia(updatedSettings, heroBaseline),
          // Video/sampul yang dimuat halaman ini: server menolak (409) bila sudah diganti di tab atau perangkat lain
          hero_media_base: heroBaseline.base,
        })
      });
      if (!response.ok) {
        // 4xx dengan pesan server (mis. 409 latar hero diubah di tab lain) → pesan itu apa adanya
        const serverError = response.status >= 400 && response.status < 500 ? await serverErrorOf(response) : '';
        if (serverError) throw new SaveError(serverError);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        notify('success', 'Pengaturan berhasil disimpan', 'Konten website sudah diperbarui.');
        setSettings(updatedSettings);
        // Muat ulang (path file baru dari backend, dasar latar hero baru) sebelum kunci dibuka, supaya isian yang
        // diubah selama menyimpan tidak tertimpa hasil muat ulang
        await fetchSettings();
      } else {
        throw new SaveError(typeof data.error === 'string' && data.error.trim() ? data.error.trim() : 'Server menolak perubahan.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const message = error instanceof Error ? error.message : '';
      const msg = error instanceof SaveError
        ? message
        : message.includes('HTTP')
          ? `Gagal menyimpan: ${message}`
          : "Gagal terhubung ke API. Pastikan server API berjalan (lihat 'cara menjalankan aplikasi') & cek konsol browser.";
      notify('error', 'Gagal menyimpan pengaturan', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // =================== TABS ACTION HANDLERS ===================
  
  // Portfolio CRUD: editor proyek (portfolio/PortfolioEditor.tsx) memeriksa isian & mengunggah gambar/video sendiri
  const handleOpenPortfolioModal = (index: number | null = null) => {
    setEditingPortfolioIndex(index);
    setPortfolioEditorKey((key) => key + 1);
    setIsPortfolioModalOpen(true);
  };

  const handleSavePortfolio = (item: PortfolioItem) => {
    if (editingPortfolioIndex !== null) {
      setPortfolioList((prev) => prev.map((old, i) => (i === editingPortfolioIndex ? item : old)));
    } else {
      setPortfolioList((prev) => [...prev, item]);
    }
    setIsPortfolioModalOpen(false);
    notify(
      'success',
      editingPortfolioIndex !== null ? `Proyek "${clip(item.title)}" diperbarui.` : `Proyek "${clip(item.title)}" ditambahkan ke daftar.`,
      SAVE_REMINDER,
    );
  };

  const askDeletePortfolio = (index: number) => {
    const name = clip(portfolioList[index]?.title);
    askRemove(
      name ? `Hapus proyek "${name}"?` : 'Hapus proyek ini?',
      'Kartu proyek ini beserta detailnya hilang dari section Proyek setelah kamu klik Simpan semua perubahan.',
      () => {
        setPortfolioList((prev) => prev.filter((_, i) => i !== index));
        notify('success', name ? `Proyek "${name}" dihapus dari daftar.` : 'Proyek dihapus dari daftar.', SAVE_REMINDER);
      },
    );
  };

  const handleOpenPortfolioImport = () => {
    setPortfolioImportKey((key) => key + 1);
    setIsPortfolioImportOpen(true);
  };

  // FAQ CRUD
  const handleOpenFaqModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingFaqIndex(index);
      setFaqForm({ ...faqList[index] });
    } else {
      setEditingFaqIndex(null);
      setFaqForm({
        question: '',
        answer: ''
      });
    }
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = () => {
    if (!faqForm.question || !faqForm.answer) {
      notify('warning', 'Data belum lengkap', 'Pertanyaan dan jawaban wajib diisi.');
      return;
    }
    if (editingFaqIndex !== null) {
      const updated = [...faqList];
      updated[editingFaqIndex] = faqForm;
      setFaqList(updated);
    } else {
      setFaqList(prev => [...prev, faqForm]);
    }
    setIsFaqModalOpen(false);
    notify('success', editingFaqIndex !== null ? 'FAQ diperbarui.' : 'FAQ ditambahkan ke daftar.', SAVE_REMINDER);
  };

  const askDeleteFaq = (index: number) => {
    const question = clip(faqList[index]?.question);
    askRemove(
      question ? `Hapus FAQ "${question}"?` : 'Hapus FAQ ini?',
      'Pertanyaan dan jawabannya hilang dari section FAQ setelah kamu klik Simpan semua perubahan.',
      () => {
        setFaqList((prev) => prev.filter((_, i) => i !== index));
        notify('success', 'FAQ dihapus dari daftar.', SAVE_REMINDER);
      },
    );
  };



  // Dynamic Content Tab Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'hero':
        return (
          <HeroSettings
            settings={settings}
            heroImages={heroImages}
            setHeroImages={setHeroImages}
            heroLogos={heroLogos}
            setHeroLogos={setHeroLogos}
            heroBgMode={heroBgMode}
            setHeroBgMode={setHeroBgMode}
            heroVideo={heroVideo}
            setHeroVideo={setHeroVideo}
            heroVideoPoster={heroVideoPoster}
            setHeroVideoPoster={setHeroVideoPoster}
            onBusyChange={setHeroBusy}
            videoUploading={heroBusy}
            onImagesProcessing={handleHeroImagesProcessing}
            imagesPending={heroImagesPending}
            onImageNotice={handleHeroImageNotice}
            notify={notify}
            saving={isSaving}
            heroTextTone={heroTextTone}
            setHeroTextTone={setHeroTextTone}
            heroOverlay={heroOverlay}
            setHeroOverlay={setHeroOverlay}
          />
        );

      case 'templates':
        return (
          <InfoNote>
            <p>
              Katalog di section ini diambil otomatis dari template yang sudah terbit: kartu, harga, gambar pratinjau, dan
              jumlah terjual. Tambah atau ubah template di menu{' '}
              <a href="/admin/pesanan-template/kelola-template" className="font-medium text-adm-cobalt-fg hover:underline">
                Pesanan Template → Kelola template
              </a>
              .
            </p>
          </InfoNote>
        );

      case 'portfolio':
        return (
          <div>
            <PanelHeader
              title="Proyek portofolio"
              subtitle="Cadangan section Proyek: tampil bila belum ada minimal 2 proyek klien yang layak di Project Clients."
              action={
                <>
                  <Button size="sm" variant="secondary" icon={<FileArchive />} onClick={handleOpenPortfolioImport}>
                    Impor proyek
                  </Button>
                  <Button size="sm" icon={<Plus />} onClick={() => handleOpenPortfolioModal()}>
                    Tambah portofolio
                  </Button>
                </>
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {portfolioList.map((item, index) => (
                <Panel key={index} padding="none" className="flex flex-col overflow-hidden">
                  <div className="relative aspect-video overflow-hidden bg-adm-ghost">
                    {item.image ? (
                      <img src={item.image} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-adm-subtle"><Briefcase className="h-7 w-7" strokeWidth={1.75} /></div>
                    )}
                    {/* Isi detail proyek sekilas: jumlah gambar detail, video, tautan */}
                    {(item.gallery?.length || item.video || item.url) && (
                      <span className="adm-keep-white absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                        {[item.gallery?.length ? `${item.gallery.length} gambar` : '', item.video ? 'video' : '', item.url ? 'tautan' : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-semibold text-adm-fg">{item.title}</h4>
                      <p className="mt-0.5 break-words text-xs font-medium uppercase tracking-[0.04em] text-adm-cobalt-fg">{item.desc}</p>
                      {item.tools && item.tools.length > 0 && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-adm-muted">{item.tools.join(', ')}</p>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end gap-1 pt-1">
                      <IconButton icon={<Edit2 />} label={`Edit ${item.title}`} size="sm" onClick={() => handleOpenPortfolioModal(index)} />
                      <IconButton
                        icon={<Trash2 />}
                        label={`Hapus ${item.title}`}
                        size="sm"
                        variant="danger-ghost"
                        onClick={() => askDeletePortfolio(index)}
                      />
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        );

      case 'compare':
        return (
          <InfoNote>
            <p>
              Tabel membandingkan template siap pakai, website custom, dan aplikasi mobile custom. Rentang harga template diambil
              otomatis dari template yang terbit; isi baris lainnya diatur di kode situs, jadi tidak ada isian di sini.
            </p>
          </InfoNote>
        );

      case 'process':
        return (
          <div>
            <PanelHeader
              title="Section keunggulan"
              subtitle="Kartu fitur “Bukan sekadar template, semua sudah siap.” di beranda (menggantikan alur proses kerja)."
            />
            <Panel className="space-y-2 text-sm leading-relaxed text-adm-muted">
              <p>
                Isinya mengikuti fitur yang benar-benar tersedia (CMS, domain, hosting & SSL, pembayaran Midtrans, status pesanan,
                diskon pembelian pertama, demo template, WhatsApp) dan diatur di kode situs, jadi tidak ada isian di sini.
              </p>
              <p>Gunakan saklar di kanan atas untuk menampilkan atau menyembunyikan section ini di beranda.</p>
            </Panel>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Isi harga template: tampil di detail template, halaman pesan, akun pembeli, dan halaman Harga */}
            <Panel className="space-y-4">
              <PanelHeader
                title="Harga template"
                titleAs="h4"
                subtitle="Daftar “Sudah termasuk” dan catatan di bawah harga template. Kosongkan isian untuk menyembunyikannya."
              />
              <Field
                label="Sudah termasuk"
                htmlFor="template_price_includes"
                hint="Satu item per baris. Domain tidak termasuk harga template: dipilih dan dibayar terpisah saat memesan."
              >
                <Textarea
                  id="template_price_includes"
                  className="min-h-[112px] resize-y"
                  placeholder={TEMPLATE_PRICE_INCLUDES_DEFAULT.join('\n')}
                  defaultValue={settings.template_price_includes ?? TEMPLATE_PRICE_INCLUDES_DEFAULT.join('\n')}
                />
              </Field>
              <Field
                label="Catatan harga"
                htmlFor="template_price_note"
                hint="Satu kalimat, mis. tentang domain dan biaya perpanjangan mulai tahun ke-2."
              >
                <Textarea
                  id="template_price_note"
                  className="min-h-[60px] resize-y"
                  placeholder={TEMPLATE_PRICE_NOTE_DEFAULT}
                  defaultValue={settings.template_price_note ?? TEMPLATE_PRICE_NOTE_DEFAULT}
                />
              </Field>
            </Panel>

            {/* Perpanjangan tahun ke-2 = hosting & jasa (setting ini) + domain sesuai ekstensi; dibayar dari Akun Saya */}
            <Panel className="space-y-4">
              <PanelHeader
                title="Biaya perpanjangan & domain"
                titleAs="h4"
                subtitle="Mulai tahun ke-2 pembeli memperpanjang 1, 2, atau 3 tahun sekaligus dari Akun Saya: hosting & jasa ditambah domain per tahun. Tampil di halaman Harga dan saat perpanjangan."
              />
              <RupiahSettingField
                setting={HOSTING_RENEWAL_SETTING}
                label="Hosting & jasa per tahun (mulai tahun ke-2)"
                stored={settings[HOSTING_RENEWAL_SETTING]}
                fallback={HOSTING_RENEWAL_DEFAULT}
                priceOf={hostingRenewalPrice}
                hint={(price) =>
                  `Pembeli membayar ${rupiahCompact(price)}/tahun ditambah perpanjangan domain sesuai daftar harga ekstensi di bawah. Kosong atau 0 = bawaan ${rupiahCompact(HOSTING_RENEWAL_DEFAULT)}.`
                }
              />
              <DomainMarkupField />
              <DomainPriceList />
            </Panel>

            {/* Fitur tambahan berbayar (docs/platform/SITE-ADDONS-SPEC.md §7); harga dicatat di tagihan saat dibuat */}
            <Panel className="space-y-4">
              <PanelHeader
                title="Fitur tambahan"
                titleAs="h4"
                subtitle="Fitur berbayar untuk template sekolah. Pembeli membelinya dari Akun Saya > Fitur tambahan; harganya juga tampil di halaman Harga."
              />
              <RupiahSettingField
                setting={ADDON_POSTS_PRICE_SETTING}
                label="Fitur Berita & Pengumuman (sekali bayar)"
                stored={settings[ADDON_POSTS_PRICE_SETTING]}
                fallback={ADDON_POSTS_PRICE_DEFAULT}
                priceOf={addonPostsPrice}
                hint={(price) =>
                  `Pembeli membayar ${rupiahCompact(price)} sekali, aktif selama situsnya aktif. Tagihan yang sudah dibuat tetap memakai harga lamanya. Kosong atau 0 = bawaan ${rupiahCompact(ADDON_POSTS_PRICE_DEFAULT)}.`
                }
              />
            </Panel>
          </div>
        );

      case 'faq':
        return (
          <div>
            <PanelHeader
              title="Pertanyaan yang sering diajukan"
              subtitle="Kelola pertanyaan dan jawaban yang tampil dalam format akordeon."
              action={
                <Button size="sm" icon={<Plus />} onClick={() => handleOpenFaqModal()}>
                  Tambah FAQ
                </Button>
              }
            />

            <div className="space-y-3">
              {faqList.map((faq, index) => (
                <Panel key={index} padding="sm" className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h4 className="break-words text-[13px] font-semibold text-adm-fg sm:text-sm">P: {faq.question}</h4>
                    <p className="break-words text-xs leading-relaxed text-adm-muted sm:text-[13px]">J: {faq.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton icon={<Edit2 />} label="Edit FAQ" size="sm" onClick={() => handleOpenFaqModal(index)} />
                    <IconButton
                      icon={<Trash2 />}
                      label="Hapus FAQ"
                      size="sm"
                      variant="danger-ghost"
                      onClick={() => askDeleteFaq(index)}
                    />
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        );

      case 'services':
        return (
          <div>
            <PanelHeader title="Bagian banner CTA" subtitle="Kelola banner ajakan (CTA) yang tampil di atas footer." />

            <Panel className="space-y-4">
              <Field label="Judul CTA (tekan Enter untuk memisah baris)" htmlFor="cta_title">
                <Textarea id="cta_title" className="min-h-[60px] resize-y" placeholder={CTA_TITLE_DEFAULT} defaultValue={settings.cta_title || CTA_TITLE_DEFAULT} />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Teks tombol WhatsApp" htmlFor="cta_button">
                  <Input id="cta_button" type="text" placeholder="Hubungi WhatsApp" defaultValue={settings.cta_button || "Hubungi WhatsApp"} />
                </Field>
                <Field label="Link atau nomor WhatsApp" htmlFor="cta_link">
                  <Input id="cta_link" type="text" placeholder="mis. 6285188009152 atau link lain" defaultValue={settings.cta_link || ""} />
                </Field>
              </div>
            </Panel>
          </div>
        );

      case 'guides':
        return (
          <div className="space-y-4 sm:space-y-6">
            <Panel className="space-y-4">
              <PanelHeader
                title="Halaman /panduan"
                titleAs="h4"
                subtitle="Saklar di kanan atas menampilkan atau menyembunyikan tautan Panduan di navbar dan footer; halamannya tetap bisa dibuka."
              />
              <Field label="Teks pembuka" htmlFor="guides_intro" hint="Paragraf di bawah judul /panduan. Kosongkan untuk memakai teks bawaan.">
                <Textarea
                  id="guides_intro"
                  className="min-h-[96px] resize-y"
                  placeholder={GUIDES_INTRO_DEFAULT}
                  defaultValue={settings.guides_intro ?? ''}
                />
              </Field>
            </Panel>

            {/* Artikel dari database: tambah/edit/hapus tersimpan lewat tombolnya sendiri, bukan "Simpan semua perubahan" */}
            <GuidesManager notify={notify} />
          </div>
        );

      case 'nexa':
        return (
          <div className="space-y-4 sm:space-y-6">
            <Panel className="space-y-4">
              <PanelHeader
                title="Penyedia jawaban AI"
                titleAs="h4"
                subtitle="Saklar di kanan atas menampilkan atau menyembunyikan chat Nexa di seluruh situs (disimpan lewat tombol Simpan semua perubahan). Tanpa penyedia aktif, Nexa menjawab dari data situs."
              />
              {nexaCfgState === 'failed' && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-adm-muted">
                  Gagal memuat pengaturan AI.
                  <Button size="sm" variant="secondary" icon={<RefreshCw />} onClick={retryNexaConfig}>
                    Coba lagi
                  </Button>
                </div>
              )}
              {!nexaCfg && nexaCfgState !== 'failed' && <p className="text-sm text-adm-muted">Memuat pengaturan AI…</p>}
              {nexaCfg && (
                <>
                  <Field
                    label="Penyedia utama"
                    hint="Bila penyedia pilihan mati atau belum lengkap, Nexa otomatis memakai penyedia lain yang aktif."
                  >
                    <Segmented
                      ariaLabel="Penyedia jawaban AI"
                      // Tiga pilihan tidak muat satu baris di HP: dibungkus agar "Endpoint custom" tetap terlihat
                      className="max-sm:flex-wrap"
                      items={[
                        { value: 'anthropic', label: NEXA_PROVIDER_LABEL.anthropic },
                        { value: 'gemini', label: NEXA_PROVIDER_LABEL.gemini },
                        { value: 'custom', label: NEXA_PROVIDER_LABEL.custom },
                      ]}
                      value={nexaCfg.provider}
                      onChange={(value) => setNexaCfg({ ...nexaCfg, provider: value as NexaConfig['provider'] })}
                    />
                  </Field>

                  {(['anthropic', 'gemini'] as const).map((name) => {
                    const provider = nexaCfg[name];
                    return (
                      <div key={name} className="space-y-3 rounded-2xl p-4 ring-1 ring-inset ring-adm-line">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-adm-fg">{NEXA_PROVIDER_LABEL[name]}</p>
                            <p className="mt-0.5 text-xs text-adm-muted">
                              {nexaClear[name]
                                ? 'Kunci tersimpan akan dihapus saat pengaturan AI disimpan.'
                                : provider.key_masked !== ''
                                  ? `Kunci tersimpan: ${provider.key_masked}`
                                  : provider.env_key
                                    ? 'Memakai kunci dari .env server (bisa ditimpa lewat kolom di bawah).'
                                    : 'Belum ada kunci.'}
                            </p>
                          </div>
                          <Switch
                            checked={provider.on}
                            onChange={(next) => setNexaCfg({ ...nexaCfg, [name]: { ...provider, on: next } })}
                            label={provider.on ? 'Aktif' : 'Nonaktif'}
                          />
                        </div>
                        <Field
                          label={`Kunci API ${NEXA_PROVIDER_LABEL[name]}`}
                          htmlFor={`nexa_${name}_key`}
                          hint="Isi untuk mengganti; biarkan kosong untuk mempertahankan kunci tersimpan."
                        >
                          <PasswordInput
                            id={`nexa_${name}_key`}
                            mono
                            autoComplete="new-password"
                            placeholder={name === 'anthropic' ? 'sk-ant-…' : 'AIza…'}
                            value={nexaKeys[name]}
                            onChange={(event) => {
                              const { value } = event.target;
                              setNexaKeys((prev) => ({ ...prev, [name]: value }));
                            }}
                          />
                        </Field>
                        {provider.key_masked !== '' && (
                          <button
                            type="button"
                            className="text-xs font-medium text-adm-muted underline-offset-2 hover:underline"
                            onClick={() => toggleNexaKeyClear(name)}
                          >
                            {nexaClear[name] ? 'Batal menghapus kunci' : 'Hapus kunci tersimpan'}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <NexaCustomProviderCard
                    value={nexaCfg.custom ?? NEXA_CUSTOM_EMPTY}
                    onChange={(custom) => setNexaCfg({ ...nexaCfg, custom })}
                    keyValue={nexaKeys.custom}
                    onKeyChange={(key) => setNexaKeys((prev) => ({ ...prev, custom: key }))}
                    clearKey={nexaClear.custom}
                    onToggleClear={() => toggleNexaKeyClear('custom')}
                    selected={nexaCfg.provider === 'custom'}
                    savedUrl={nexaCustomSavedUrl}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <Button icon={<Save />} disabled={nexaSaving} onClick={() => void saveNexaConfig()}>
                      {nexaSaving ? 'Menyimpan…' : 'Simpan pengaturan AI'}
                    </Button>
                    <p className="text-xs text-adm-muted">Kunci di sini menang atas kunci .env di server.</p>
                  </div>
                </>
              )}
            </Panel>
          </div>
        );

      case 'footer':
        return (
          <div>
            <PanelHeader title="Pengaturan footer & kontak" subtitle="Kelola kanal kontak, tombol WhatsApp melayang, alamat, dan hak cipta." />

            <div className="space-y-3 sm:space-y-4">
              {/* Contact Information */}
              <Panel>
                <PanelHeader title="Detail kontak" titleAs="h4" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Alamat perusahaan" htmlFor="footer_address" className="md:col-span-2">
                    <Textarea id="footer_address" className="min-h-[60px] resize-y" placeholder="Tulis alamat..." defaultValue={settings.footer_address || "Mitra terpercaya untuk inovasi digital bisnis Anda. Membantu dari ide hingga menjadi produk siap rilis."} />
                  </Field>
                  <Field label="Telepon kantor" htmlFor="footer_phone">
                    <Input id="footer_phone" type="text" inputMode="tel" placeholder="mis. 085188009152" defaultValue={settings.footer_phone || "085188009152"} />
                  </Field>
                  <Field label="WhatsApp (tombol melayang)" htmlFor="footer_whatsapp">
                    <Input id="footer_whatsapp" type="text" inputMode="tel" placeholder="mis. 6285188009152" defaultValue={settings.footer_whatsapp || "6285188009152"} />
                  </Field>
                  <Field label="Email" htmlFor="footer_email" className="md:col-span-2">
                    <Input id="footer_email" type="email" autoCapitalize="none" placeholder={`mis. ${DEFAULT_CONTACT_EMAIL}`} defaultValue={settings.footer_email || DEFAULT_CONTACT_EMAIL} />
                  </Field>
                </div>
              </Panel>

              {/* Social Channels */}
              <Panel>
                <PanelHeader title="Link media sosial" titleAs="h4" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Link Instagram" htmlFor="footer_instagram">
                    <Input id="footer_instagram" type="text" autoCapitalize="none" placeholder="https://instagram.com/..." defaultValue={settings.footer_instagram || "#"} />
                  </Field>
                  <Field label="Link Facebook" htmlFor="footer_facebook">
                    <Input id="footer_facebook" type="text" autoCapitalize="none" placeholder="https://facebook.com/..." defaultValue={settings.footer_facebook || "#"} />
                  </Field>
                  <Field label="Link LinkedIn" htmlFor="footer_linkedin">
                    <Input id="footer_linkedin" type="text" autoCapitalize="none" placeholder="https://linkedin.com/in/..." defaultValue={settings.footer_linkedin || "#"} />
                  </Field>
                  <Field label="Link TikTok" htmlFor="footer_tiktok">
                    <Input id="footer_tiktok" type="text" autoCapitalize="none" placeholder="https://tiktok.com/@..." defaultValue={settings.footer_tiktok || "#"} />
                  </Field>
                  <Field label="Link channel YouTube" htmlFor="footer_youtube" className="md:col-span-2">
                    <Input id="footer_youtube" type="text" autoCapitalize="none" placeholder="https://youtube.com/..." defaultValue={settings.footer_youtube || "#"} />
                  </Field>
                </div>
              </Panel>

              {/* Copyright & Branding Footer */}
              <Panel>
                <PanelHeader title="Hak cipta" titleAs="h4" />
                <Field label="Teks hak cipta" htmlFor="footer_copyright">
                  <Input id="footer_copyright" type="text" placeholder="&copy; 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi." defaultValue={settings.footer_copyright || "© 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi."} />
                </Field>
              </Panel>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pb-10">
      {/* Header */}
      <PageHeader
        title="Pengaturan website"
        description="Atur isi setiap bagian website kamu, dari Hero sampai Footer."
        actions={
          <>
            {loadState === 'failed' && (
              <>
                <p id="save-blocked-reason" className="text-xs leading-relaxed text-adm-danger-fg">
                  Pengaturan gagal dimuat, jadi belum bisa disimpan.
                </p>
                <Button variant="secondary" icon={<RefreshCw />} disabled={heroBusy} onClick={() => void fetchSettings()}>
                  Muat ulang
                </Button>
              </>
            )}
            <Button
              icon={<Save />}
              loading={isSaving}
              disabled={saveBlock !== null}
              aria-describedby={loadState === 'failed' ? 'save-blocked-reason' : undefined}
              onClick={handleSave}
            >
              {isSaving ? 'Menyimpan...' : saveBlock ? SAVE_BLOCK_LABEL[saveBlock] : 'Simpan semua perubahan'}
            </Button>
          </>
        }
      />

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[208px_minmax(0,1fr)]">
        {/* HP–lg: tab horizontal yang bisa digulir */}
        <Tabs
          className="justify-self-start xl:hidden"
          ariaLabel="Bagian pengaturan"
          items={tabs.map((tab) => ({ value: tab.id, label: tab.label, icon: tab.icon }))}
          value={activeTab}
          onChange={setActiveTab}
        />

        {/* xl+: daftar vertikal */}
        <nav aria-label="Bagian pengaturan" className="hidden xl:flex xl:flex-col xl:gap-0.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150',
                  FOCUS_INSET,
                  active ? 'bg-adm-hover text-adm-fg' : 'text-adm-muted hover:bg-adm-hover hover:text-adm-fg',
                )}
              >
                <tab.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-cobalt' : 'text-adm-subtle')} strokeWidth={1.75} aria-hidden />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={panelClass('lg')}
        >
          {/* Tab Title */}
          <PanelHeader
            icon={tabs.find(t => t.id === activeTab)?.icon || ImageIcon}
            iconTone="cobalt"
            title={tabs.find(t => t.id === activeTab)?.label}
            subtitle={TAB_SUBTITLE[activeTab] ?? 'Perbarui isi dan tampilan bagian ini di website kamu.'}
            action={(() => {
              if (activeTab === 'nexa') {
                const visible = settings.nexa_enabled !== '0';
                return (
                  <Switch
                    checked={visible}
                    onChange={(next) => setSettings((prev) => ({ ...prev, nexa_enabled: next ? '1' : '0' }))}
                    label={visible ? 'Tampil di website' : 'Disembunyikan'}
                    className="items-center"
                  />
                );
              }
              const key = SECTION_KEY_OF_TAB[activeTab];
              if (!key) return undefined;
              const visible = !getHiddenSections(settings).has(key);
              return (
                <Switch
                  checked={visible}
                  onChange={(next) => setSectionVisible(key, next)}
                  label={visible ? 'Tampil di website' : 'Disembunyikan'}
                  className="items-center"
                />
              );
            })()}
            className="mb-5 border-b border-adm-line pb-4 sm:mb-6 sm:pb-5"
          />

          {/* Dynamic Form Content */}
          <div className="space-y-4 sm:space-y-6">
            {renderTabContent()}
          </div>
        </motion.div>
      </div>

      {/* =================== MODAL OVERLAYS FOR CRUD =================== */}

      {/* 2. PORTFOLIO CRUD MODAL */}
      <PortfolioEditor
        key={portfolioEditorKey}
        open={isPortfolioModalOpen}
        item={editingPortfolioIndex !== null ? portfolioList[editingPortfolioIndex] ?? null : null}
        onClose={() => setIsPortfolioModalOpen(false)}
        onSave={handleSavePortfolio}
        notify={notify}
      />
      <PortfolioImportDialog
        key={`import-${portfolioImportKey}`}
        open={isPortfolioImportOpen}
        existing={portfolioList}
        onClose={() => setIsPortfolioImportOpen(false)}
        onImport={(item, replace) => setPortfolioList((prev) => addImportedProject(prev, item, replace))}
        notify={notify}
      />

      {/* 4. FAQ CRUD MODAL */}
      <Modal
        open={isFaqModalOpen}
        onClose={() => setIsFaqModalOpen(false)}
        title={editingFaqIndex !== null ? 'Edit FAQ' : 'Tambah FAQ'}
        icon={<HelpCircle />}
        size="md"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFaqModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveFaq}>Simpan FAQ</Button>
          </>
        }
      >
        <Field label="Pertanyaan">
          <Input
            type="text"
            value={faqForm.question}
            onChange={(e) => setFaqForm(prev => ({ ...prev, question: e.target.value }))}
            placeholder="mis. Apakah ada biaya bulanan?"
          />
        </Field>
        <Field label="Jawaban">
          <Textarea
            value={faqForm.answer}
            onChange={(e) => setFaqForm(prev => ({ ...prev, answer: e.target.value }))}
            placeholder="mis. Tidak ada biaya bulanan wajib kecuali perpanjangan tahunan domain & hosting..."
            className="min-h-[100px] resize-y"
          />
        </Field>
      </Modal>

      {/* Konfirmasi hapus FAQ, proyek, dan kunci AI (semuanya baru tersimpan lewat tombol simpannya) */}
      <ConfirmDialog
        open={removalOpen}
        onClose={() => setRemovalOpen(false)}
        onConfirm={() => {
          removal?.run();
          setRemovalOpen(false);
        }}
        tone="danger"
        title={removal?.title}
        description={removal?.description}
      />

      <Toast toast={toast} onClose={dismissToast} />
    </div>
  );
};

export default SiteSettings;
