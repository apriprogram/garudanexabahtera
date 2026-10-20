import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, 
  Image as ImageIcon, 
  Package, 
  Briefcase, 
  CreditCard, 
  Activity, 
  HelpCircle, 
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Upload,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSettings from './HeroSettings';
import {
  Button,
  Chip,
  Eyebrow,
  Field,
  FLOAT_PANEL,
  FOCUS_INSET,
  IconBox,
  IconButton,
  Input,
  MENU_ITEM,
  Modal,
  PageHeader,
  Panel,
  PanelHeader,
  Tabs,
  Textarea,
  checkboxClass,
  cn,
  controlClass,
  panelClass,
} from '../../components/admin/ui';

/* Kotak unggah gambar (garis putus-putus): pratinjau + lapisan "ganti" saat hover/fokus. */
function UploadTile({
  preview,
  emptyLabel,
  changeLabel,
  onChange,
}: {
  preview?: React.ReactNode;
  emptyLabel: React.ReactNode;
  changeLabel: React.ReactNode;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-adm-line-strong bg-adm-ghost transition-colors hover:border-cobalt focus-within:border-cobalt">
      {preview ? (
        <>
          {preview}
          <span className="adm-keep-white absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            <span className="text-xs font-medium">{changeLabel}</span>
          </span>
        </>
      ) : (
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-adm-surface text-adm-muted ring-1 ring-inset ring-adm-line transition-colors group-hover:text-cobalt">
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-xs font-medium text-adm-muted transition-colors group-hover:text-adm-cobalt-fg">{emptyLabel}</span>
        </>
      )}
      <input type="file" accept="image/*" className="sr-only" onChange={onChange} />
    </label>
  );
}

/* Gaya toast notifikasi per jenis (ikut tema lewat token). */
const NOTIFY_TONE = {
  success: { icon: <CheckCircle2 />, tone: 'mint' },
  error: { icon: <AlertCircle />, tone: 'danger' },
  warning: { icon: <AlertCircle />, tone: 'warning' },
} as const;

/** Respons get_settings: setting_key → setting_value. Daftar di bawah disimpan sebagai string JSON. */
type SettingsMap = Record<string, string>;

/** Satu entri products_data. */
interface ProductItem {
  id: string;
  category: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  logo?: string;
  buttonText?: string;
  buttonLink?: string;
}

/** Satu entri portfolio_data. */
interface PortfolioItem {
  title: string;
  desc: string;
  image: string;
  span: string;
}

/** Satu entri process_data. */
interface ProcessItem {
  step: string;
  title: string;
  desc: string;
  back_title?: string;
  detail?: string;
}

/** Satu entri pricing_data. */
interface PricingItem {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string;
  isPopular: boolean;
  buttonText: string;
}

/** Satu entri faq_data. */
interface FaqItem {
  question: string;
  answer: string;
}

const SiteSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    description: string;
  } | null>(null);

  const tabs = [
    { id: 'hero', label: 'Hero', icon: ImageIcon },
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'portfolio', label: 'Portofolio', icon: Briefcase },
    { id: 'process', label: 'Proses', icon: Activity },
    { id: 'pricing', label: 'Harga', icon: CreditCard },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'services', label: 'Banner CTA', icon: HelpCircle },
    { id: 'footer', label: 'Footer', icon: Layout },
  ];

  const showNotify = useCallback((type: 'success' | 'error' | 'warning', message: string, description: string) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // State values for all settings
  const [settings, setSettings] = useState<SettingsMap>({});
  
  // Hero section States
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroLogos, setHeroLogos] = useState<{name: string, src: string}[]>([]);

  // Products tab States
  const [productsCategories, setProductsCategories] = useState<{ id: string; label: string }[]>([]);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<ProductItem>({
    id: '',
    category: '',
    badge: '',
    title: '',
    description: '',
    image: '',
    logo: '',
    buttonText: 'Pesan Sekarang',
    buttonLink: ''
  });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  // Portfolio tab States
  const [portfolioList, setPortfolioList] = useState<PortfolioItem[]>([]);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState<number | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    desc: '',
    image: '',
    span: 'md:col-span-4'
  });
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isProductCategoryDropdownOpen, setIsProductCategoryDropdownOpen] = useState(false);
  const [isPortfolioSpanDropdownOpen, setIsPortfolioSpanDropdownOpen] = useState(false);

  // Process tab States
  const [processList, setProcessList] = useState<ProcessItem[]>([]);

  // Pricing tab States
  const [pricingList, setPricingList] = useState<PricingItem[]>([]);
  const [editingPricingIndex, setEditingPricingIndex] = useState<number | null>(null);
  const [pricingForm, setPricingForm] = useState({
    name: '',
    price: '',
    period: '',
    description: '',
    features: '',
    isPopular: false,
    buttonText: 'Pesan Sekarang'
  });
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // FAQ tab States
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: ''
  });
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);



  const fetchSettings = useCallback(async () => {
    try {
      const apiUrl = '/api.php';
      const response = await fetch(`${apiUrl}?action=get_settings`);
      const data: SettingsMap = await response.json();
      setSettings(data);
      
      // Load Hero Image Slider
      if (data.hero_images) setHeroImages(JSON.parse(data.hero_images));
      if (data.hero_logos) setHeroLogos(JSON.parse(data.hero_logos));

      // Load Products tab data
      if (data.products_categories) {
        setProductsCategories(JSON.parse(data.products_categories));
      } else {
        setProductsCategories([
          { id: 'all', label: 'Semua' },
          { id: 'website', label: 'Website' },
          { id: 'santri', label: 'I-Santri' },
          { id: 'school', label: 'I-School' },
          { id: 'pos', label: 'POS' },
          { id: 'absensi', label: 'Absensi' },
          { id: 'invitation', label: 'Undangan Digital' }
        ]);
      }
      
      if (data.products_data) {
        setProductsList(JSON.parse(data.products_data));
      } else {
        setProductsList([
          {
            id: 'website',
            category: 'website',
            badge: 'Jasa Pembuatan Website',
            title: 'Profil Perusahaan & Web Kustom',
            description: 'Website sekolah/instansi, Landing Page Produk, dan Website Custom System.',
            image: '/assets/portofolio/portfolio1.png'
          },
          {
            id: 'santri',
            category: 'santri',
            logo: '/assets/logo/logoisantri.png',
            badge: 'Aplikasi I-Santri',
            title: 'Manajemen Pesantren Modern',
            description: 'Manajemen pesantren yang lebih terstruktur dan modern dengan sistem digital terintegrasi.',
            image: '/assets/product/isantri.png'
          },
          {
            id: 'school',
            category: 'school',
            logo: '/assets/logo/logoischool.png',
            badge: 'Aplikasi I-School',
            title: 'Digitalisasi Ekosistem Sekolah',
            description: 'Manajemen sekolah berbasis digital tingkat lanjut untuk efisiensi administrasi dan akademik.',
            image: '/assets/product/ischool.png'
          },
          {
            id: 'pos',
            category: 'pos',
            badge: 'Aplikasi Kasir',
            title: 'Sistem POS Cerdas untuk UMKM',
            description: 'Sistem Point of Sale (POS) yang memudahkan transaksi dan manajemen stok untuk UMKM & retail.',
            image: '/assets/product/pos.png'
          },
          {
            id: 'absensi',
            category: 'absensi',
            badge: 'Aplikasi Absensi',
            title: 'Kehadiran Digital Real-time',
            description: 'Sistem absensi digital berbasis web dan mobile dengan verifikasi yang akurat dan aman.',
            image: '/assets/product/absensi.png'
          },
          {
            id: 'invitation',
            category: 'invitation',
            logo: '/assets/logo/logowedding.png',
            badge: 'Undangan Digital Premium',
            title: 'Undangan Digital Interaktif',
            description: 'Solusi undangan pernikahan dan acara spesial dalam bentuk website modern yang elegan dan mudah dibagikan.',
            image: '/assets/product/undangan_digital.png'
          }
        ]);
      }

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

      // Load Process tab data
      if (data.process_data) {
        setProcessList(JSON.parse(data.process_data));
      } else {
        setProcessList([
          { 
            step: '01', 
            title: 'Consultation', 
            desc: 'Needs Analysis & Planning', 
            back_title: 'DETAIL CONSULTATION',
            detail: 'Kami memulai dengan mendalami visi bisnis Anda. Sesi brainstorming intensif untuk menentukan fitur utama, target pasar, dan strategi teknologi yang paling efektif untuk mencapai tujuan Anda.' 
          },
          { 
            step: '02', 
            title: 'Desain UI/UX', 
            desc: 'Wireframing & Prototyping', 
            back_title: 'DETAIL DESAIN UI/UX',
            detail: 'Fokus pada pengalaman pengguna yang intuitif dan estetika modern. Kami membuat purwarupa interaktif sehingga Anda dapat merasakan alur navigasi aplikasi sebelum proses coding dimulai.' 
          },
          { 
            step: '03', 
            title: 'Development', 
            desc: 'Coding & System Testing', 
            back_title: 'DETAIL DEVELOPMENT',
            detail: 'Tim engineer kami membangun sistem menggunakan teknologi terkini yang skalabel. Kami menerapkan standar keamanan tinggi dan pengujian menyeluruh (QA) untuk memastikan performa yang stabil.' 
          },
          { 
            step: '04', 
            title: 'Launching', 
            desc: 'Deployment & Maintenance', 
            back_title: 'DETAIL LAUNCHING',
            detail: 'Membantu proses rilis ke App Store/Play Store atau hosting cloud. Kami tidak berhenti di sana; kami menyediakan dukungan teknis berkelanjutan dan pemeliharaan untuk menjaga sistem tetap prima.' 
          }
        ]);
      }

      // Load Pricing tab data
      if (data.pricing_data) {
        setPricingList(JSON.parse(data.pricing_data));
      } else {
        setPricingList([
          { name: 'Basic Package', price: 'Rp 2.000.000', period: 'one-time', description: 'For SMEs & landing pages', features: 'Max 5 Pages, Form & WA Button, 1 Month Maintenance, Basic SEO, Duration: 4-7 Days', isPopular: false, buttonText: 'Pilih Paket' },
          { name: 'Professional Package', price: 'Rp 4.500.000', period: 'one-time', description: 'Exclusive custom design', features: 'Max 10 Pages, Custom Branding Design, CMS & Blog, Advanced SEO Optimization, Duration: 10-14 Days', isPopular: true, buttonText: 'Pilih Paket' },
          { name: 'Premium Package', price: 'Rp 8.500.000', period: 'one-time', description: 'E-commerce & Custom Systems', features: 'Dynamic Web / E-Commerce, Catalog & Cart, Payment Gateway, Membership / Account, 3 Months Maintenance', isPopular: false, buttonText: 'Pilih Paket' }
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



    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotify('error', 'Gagal memuat pengaturan', 'Pengaturan website tidak bisa dimuat. Coba muat ulang halaman.');
    }
  }, [showNotify]);

  useEffect(() => {
    // fetchSettings baru memanggil setState setelah await; aturan ini tidak membedakan fungsi async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    
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
      
      // Products data
      products_categories: JSON.stringify(productsCategories),
      products_data: JSON.stringify(productsList),

      // Portfolio data
      portfolio_data: JSON.stringify(portfolioList),

      // Process data
      process_data: JSON.stringify(processList),

      // Pricing data
      pricing_title: (document.getElementById('pricing_title') as HTMLInputElement)?.value || settings.pricing_title || "Paket Layanan Kami",
      pricing_subtitle: (document.getElementById('pricing_subtitle') as HTMLTextAreaElement)?.value || settings.pricing_subtitle || "Pilih paket yang sesuai dengan skala bisnis dan kebutuhan Anda",
      pricing_data: JSON.stringify(pricingList),

      // FAQ data
      faq_data: JSON.stringify(faqList),



      // CTA Banner data
      cta_title: (document.getElementById('cta_title') as HTMLTextAreaElement)?.value || settings.cta_title || "Siap Membangun Sistem Digital?\nKonsultasikan Sekarang Juga!",
      cta_button: (document.getElementById('cta_button') as HTMLInputElement)?.value || settings.cta_button || "Hubungi WhatsApp",
      cta_link: (document.getElementById('cta_link') as HTMLInputElement)?.value || settings.cta_link || "",
      cta_phone: (document.getElementById('cta_phone') as HTMLInputElement)?.value || settings.cta_phone || "085188009152",
      cta_note: (document.getElementById('cta_note') as HTMLInputElement)?.value || settings.cta_note || "Konsultasi GRATIS",

      // Footer data
      footer_address: (document.getElementById('footer_address') as HTMLTextAreaElement)?.value || settings.footer_address || "Mitra terpercaya untuk inovasi digital bisnis Anda. Membantu dari ide hingga menjadi produk siap rilis.",
      footer_phone: (document.getElementById('footer_phone') as HTMLInputElement)?.value || settings.footer_phone || "085188009152",
      footer_email: (document.getElementById('footer_email') as HTMLInputElement)?.value || settings.footer_email || "info@garudanexa.co.id",
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
          settings: updatedSettings
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        showNotify('success', 'Pengaturan berhasil disimpan', 'Konten website sudah diperbarui.');
        setSettings(updatedSettings);
        fetchSettings(); // Refresh settings to pull newly generated paths from PHP backend
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const message = error instanceof Error ? error.message : '';
      const msg = message.includes('HTTP')
        ? `Gagal menyimpan: ${message}`
        : "Gagal terhubung ke API. Pastikan server API berjalan (lihat 'cara menjalankan aplikasi') & cek konsol browser.";
      showNotify('error', 'Gagal menyimpan pengaturan', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Base64 helper for local files
  const handleImageFileLoad = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      callback(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // =================== TABS ACTION HANDLERS ===================
  
  // Category management
  const handleAddCategory = () => {
    if (!newCategoryLabel.trim()) return;
    const catId = newCategoryLabel.toLowerCase().replace(/\s+/g, '-');
    if (productsCategories.some(c => c.id === catId)) {
      showNotify('warning', 'Kategori sudah ada', 'Kategori ini sudah ada. Pakai nama lain.');
      return;
    }
    setProductsCategories(prev => [...prev, { id: catId, label: newCategoryLabel }]);
    setNewCategoryLabel('');
  };

  const handleDeleteCategory = (catId: string) => {
    if (catId === 'all') return;
    setProductsCategories(prev => prev.filter(c => c.id !== catId));
    setProductsList(prev => prev.filter(p => p.category !== catId));
  };

  // Product CRUD
  const handleOpenProductModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingProductIndex(index);
      setProductForm({ 
        buttonText: 'Pesan Sekarang',
        buttonLink: '',
        ...productsList[index] 
      });
    } else {
      setEditingProductIndex(null);
      setProductForm({
        id: 'prod-' + Date.now(),
        category: productsCategories[1]?.id || 'website',
        badge: '',
        title: '',
        description: '',
        image: '',
        logo: '',
        buttonText: 'Pesan Sekarang',
        buttonLink: ''
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.title || !productForm.description) {
      showNotify('warning', 'Data belum lengkap', 'Judul dan deskripsi wajib diisi.');
      return;
    }
    if (editingProductIndex !== null) {
      const updated = [...productsList];
      updated[editingProductIndex] = productForm;
      setProductsList(updated);
    } else {
      setProductsList(prev => [...prev, productForm]);
    }
    setIsProductModalOpen(false);
  };

  // Portfolio CRUD
  const handleOpenPortfolioModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingPortfolioIndex(index);
      setPortfolioForm({ ...portfolioList[index] });
    } else {
      setEditingPortfolioIndex(null);
      setPortfolioForm({
        title: '',
        desc: '',
        image: '',
        span: 'md:col-span-4'
      });
    }
    setIsPortfolioModalOpen(true);
  };

  const handleSavePortfolio = () => {
    if (!portfolioForm.title || !portfolioForm.desc) {
      showNotify('warning', 'Data belum lengkap', 'Judul dan tag/kategori wajib diisi.');
      return;
    }
    if (editingPortfolioIndex !== null) {
      const updated = [...portfolioList];
      updated[editingPortfolioIndex] = portfolioForm;
      setPortfolioList(updated);
    } else {
      setPortfolioList(prev => [...prev, portfolioForm]);
    }
    setIsPortfolioModalOpen(false);
  };

  // Pricing CRUD
  const handleOpenPricingModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingPricingIndex(index);
      setPricingForm({ ...pricingList[index] });
    } else {
      setEditingPricingIndex(null);
      setPricingForm({
        name: '',
        price: '',
        period: 'one-time',
        description: '',
        features: '',
        isPopular: false,
        buttonText: 'Pesan Sekarang'
      });
    }
    setIsPricingModalOpen(true);
  };

  const handleSavePricing = () => {
    if (!pricingForm.name || !pricingForm.price) {
      showNotify('warning', 'Data belum lengkap', 'Nama paket dan harga wajib diisi.');
      return;
    }
    if (editingPricingIndex !== null) {
      const updated = [...pricingList];
      updated[editingPricingIndex] = pricingForm;
      setPricingList(updated);
    } else {
      setPricingList(prev => [...prev, pricingForm]);
    }
    setIsPricingModalOpen(false);
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
      showNotify('warning', 'Data belum lengkap', 'Pertanyaan dan jawaban wajib diisi.');
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
          />
        );

      case 'products':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Categories Management Panel */}
            <Panel>
              <PanelHeader title="Kategori produk" subtitle="Atur kategori filter untuk bagian etalase produk." />
              <div className="flex max-w-md gap-2">
                <Input
                  type="text"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="mis. Jasa Desain, Custom App"
                  wrapperClassName="flex-1"
                />
                <Button icon={<Plus />} onClick={handleAddCategory} className="shrink-0 max-sm:h-11">
                  Tambah
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {productsCategories.map(cat => (
                  <span
                    key={cat.id}
                    className={cn(
                      'inline-flex h-8 max-w-full items-center gap-1 rounded-lg bg-adm-ghost text-xs font-medium text-adm-fg',
                      cat.id !== 'all' ? 'pl-2.5 pr-0.5' : 'px-2.5',
                    )}
                  >
                    <span className="truncate">{cat.label}</span>
                    {cat.id !== 'all' && (
                      <IconButton
                        icon={<X />}
                        label={`Hapus ${cat.label}`}
                        size="xs"
                        variant="danger-ghost"
                        onClick={() => handleDeleteCategory(cat.id)}
                      />
                    )}
                  </span>
                ))}
              </div>
            </Panel>

            {/* Products CRUD Panel */}
            <div>
              <PanelHeader
                title="Daftar produk"
                subtitle="Kelola produk yang tampil di carousel solusi digital."
                action={
                  <Button size="sm" icon={<Plus />} onClick={() => handleOpenProductModal()}>
                    Tambah kartu produk
                  </Button>
                }
              />

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {productsList.map((prod, index) => (
                  <Panel key={index} padding="none" className="flex flex-col overflow-hidden sm:flex-row">
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-adm-ghost sm:aspect-square sm:w-36">
                      {prod.image ? (
                        <img src={prod.image} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-adm-subtle"><ImageIcon className="h-7 w-7" strokeWidth={1.75} /></div>
                      )}
                      <span className="absolute left-2 top-2 max-w-[calc(100%-16px)] truncate rounded-full bg-cobalt px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
                        {prod.category}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                      <div className="min-w-0">
                        <Eyebrow className="truncate">{prod.badge || 'PRODUK'}</Eyebrow>
                        <h4 className="mt-1 line-clamp-1 text-sm font-semibold text-adm-fg sm:text-[15px]">{prod.title}</h4>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-adm-muted sm:text-[13px]">{prod.description}</p>
                      </div>
                      <div className="mt-auto flex justify-end gap-1 pt-3">
                        <IconButton icon={<Edit2 />} label={`Edit ${prod.title}`} size="sm" onClick={() => handleOpenProductModal(index)} />
                        <IconButton
                          icon={<Trash2 />}
                          label={`Hapus ${prod.title}`}
                          size="sm"
                          variant="danger-ghost"
                          onClick={() => setProductsList(prev => prev.filter((_, i) => i !== index))}
                        />
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div>
            <PanelHeader
              title="Proyek portofolio"
              subtitle="Kelola galeri portofolio klien yang tampil di bawah bagian produk."
              action={
                <Button size="sm" icon={<Plus />} onClick={() => handleOpenPortfolioModal()}>
                  Tambah portofolio
                </Button>
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
                    <span className="adm-keep-white absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                      Lebar: {item.span || '4'}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-semibold text-adm-fg">{item.title}</h4>
                      <p className="mt-0.5 break-words text-xs font-medium uppercase tracking-[0.04em] text-adm-cobalt-fg">{item.desc}</p>
                    </div>
                    <div className="mt-3 flex justify-end gap-1 pt-1">
                      <IconButton icon={<Edit2 />} label={`Edit ${item.title}`} size="sm" onClick={() => handleOpenPortfolioModal(index)} />
                      <IconButton
                        icon={<Trash2 />}
                        label={`Hapus ${item.title}`}
                        size="sm"
                        variant="danger-ghost"
                        onClick={() => setPortfolioList(prev => prev.filter((_, i) => i !== index))}
                      />
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        );

      case 'process':
        return (
          <div>
            <PanelHeader title="Langkah proses kerja" subtitle="Atur langkah-langkah alur proses yang tampil di beranda." />

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              {processList.map((step, index) => (
                <Panel key={index} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[22px] font-semibold tabular-nums text-adm-cobalt-fg">{step.step}</span>
                    <Chip>Langkah {index + 1}</Chip>
                  </div>
                  <div className="space-y-4">
                    <Field label="Judul kartu depan">
                      <Input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].title = e.target.value;
                          setProcessList(updated);
                        }}
                        placeholder="mis. Konsultasi"
                        className="font-medium"
                      />
                    </Field>
                    <Field label="Deskripsi kartu depan">
                      <Input
                        type="text"
                        value={step.desc}
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].desc = e.target.value;
                          setProcessList(updated);
                        }}
                        placeholder="mis. Analisis kebutuhan & perencanaan"
                      />
                    </Field>
                    <Field label="Judul kartu belakang">
                      <Input
                        type="text"
                        value={step.back_title || `DETAIL ${step.title}`.toUpperCase()}
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].back_title = e.target.value;
                          setProcessList(updated);
                        }}
                        placeholder="mis. DETAIL KONSULTASI"
                        className="font-medium"
                      />
                    </Field>
                    <Field label="Deskripsi kartu belakang">
                      <Textarea
                        value={step.detail || ''}
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].detail = e.target.value;
                          setProcessList(updated);
                        }}
                        placeholder="Tulis deskripsi kartu belakang..."
                        className="min-h-[100px] resize-y"
                      />
                    </Field>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Section Headers */}
            <Panel className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Judul bagian" htmlFor="pricing_title">
                <Input id="pricing_title" type="text" defaultValue={settings.pricing_title || "Paket Layanan Kami"} />
              </Field>
              <Field label="Deskripsi bagian" htmlFor="pricing_subtitle">
                <Textarea id="pricing_subtitle" className="min-h-[60px] resize-y" defaultValue={settings.pricing_subtitle || "Pilih paket yang sesuai dengan skala bisnis dan kebutuhan Anda"} />
              </Field>
            </Panel>

            <div>
              <PanelHeader
                title="Paket harga"
                subtitle="Kelola paket harga beserta daftar fiturnya."
                action={
                  <Button size="sm" icon={<Plus />} onClick={() => handleOpenPricingModal()}>
                    Tambah paket
                  </Button>
                }
              />

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {pricingList.map((tier, index) => (
                  <Panel key={index} tone={tier.isPopular ? 'cobalt' : 'surface'} className="flex flex-col justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="min-w-0 break-words text-sm font-semibold text-adm-fg sm:text-[15px]">{tier.name}</h4>
                        {tier.isPopular && (
                          <span className="shrink-0 rounded-full bg-cobalt px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
                            Populer
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-semibold tabular-nums tracking-tight text-adm-fg sm:text-xl">
                          {tier.price.toLowerCase().startsWith('rp') ? tier.price : `Rp ${tier.price}`}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-adm-muted sm:text-[13px]">{tier.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tier.features?.split(',').map((f: string, fi: number) => (
                          <Chip key={fi} className="h-auto min-h-6 max-w-full whitespace-normal break-words py-0.5">
                            ✓ {f.trim()}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-1 border-t border-adm-line pt-3">
                      <IconButton icon={<Edit2 />} label={`Edit ${tier.name}`} size="sm" onClick={() => handleOpenPricingModal(index)} />
                      <IconButton
                        icon={<Trash2 />}
                        label={`Hapus ${tier.name}`}
                        size="sm"
                        variant="danger-ghost"
                        onClick={() => setPricingList(prev => prev.filter((_, i) => i !== index))}
                      />
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
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
                      onClick={() => setFaqList(prev => prev.filter((_, i) => i !== index))}
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
                <Textarea id="cta_title" className="min-h-[60px] resize-y" placeholder="Siap Membangun Sistem Digital?&#10;Konsultasikan Sekarang Juga!" defaultValue={settings.cta_title || "Siap Membangun Sistem Digital?\\nKonsultasikan Sekarang Juga!"} />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Teks tombol WhatsApp" htmlFor="cta_button">
                  <Input id="cta_button" type="text" placeholder="Hubungi WhatsApp" defaultValue={settings.cta_button || "Hubungi WhatsApp"} />
                </Field>
                <Field label="Link atau nomor WhatsApp" htmlFor="cta_link">
                  <Input id="cta_link" type="text" placeholder="mis. 6285188009152 atau link lain" defaultValue={settings.cta_link || ""} />
                </Field>
                <Field label="Nomor HP yang ditampilkan" htmlFor="cta_phone">
                  <Input id="cta_phone" type="text" inputMode="tel" placeholder="mis. 085188009152" defaultValue={settings.cta_phone || "085188009152"} />
                </Field>
                <Field label="Catatan konsultasi gratis" htmlFor="cta_note">
                  <Input id="cta_note" type="text" placeholder="Konsultasi GRATIS" defaultValue={settings.cta_note || "Konsultasi GRATIS"} />
                </Field>
              </div>
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
                    <Input id="footer_email" type="email" autoCapitalize="none" placeholder="info@garudanexa.co.id" defaultValue={settings.footer_email || "info@garudanexa.co.id"} />
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

  const notifyTone = notification ? NOTIFY_TONE[notification.type] : null;

  return (
    <div className="pb-10">
      {/* Header */}
      <PageHeader
        title="Pengaturan website"
        description="Atur isi setiap bagian website kamu, dari Hero sampai Footer."
        actions={
          <Button icon={<Save />} loading={isSaving} onClick={handleSave}>
            {isSaving ? 'Menyimpan...' : 'Simpan semua perubahan'}
          </Button>
        }
      />

      {/* Dynamic Notification */}
      <AnimatePresence>
        {notification && notifyTone && (
          <div className="pointer-events-none fixed inset-x-4 top-4 z-[150] flex justify-center sm:top-6">
            <motion.div
              role={notification.type === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.18 }}
              className={cn(FLOAT_PANEL, 'pointer-events-auto flex w-full max-w-[400px] items-start gap-3 px-4 py-3')}
            >
              <IconBox icon={notifyTone.icon} tone={notifyTone.tone} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-adm-fg">{notification.message}</p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-adm-muted">{notification.description}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            subtitle="Perbarui isi dan tampilan bagian ini di website kamu."
            className="mb-5 border-b border-adm-line pb-4 sm:mb-6 sm:pb-5"
          />

          {/* Dynamic Form Content */}
          <div className="space-y-4 sm:space-y-6">
            {renderTabContent()}
          </div>
        </motion.div>
      </div>

      {/* =================== MODAL OVERLAYS FOR CRUD =================== */}

      {/* 1. PRODUCT CRUD MODAL */}
      <Modal
        open={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setIsProductCategoryDropdownOpen(false); }}
        title={editingProductIndex !== null ? 'Edit produk' : 'Tambah produk'}
        icon={<Package />}
        size="md"
        bodyClassName="space-y-5"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsProductModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveProduct}>Simpan produk</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kategori produk" className="relative">
            <button
              type="button"
              onClick={() => setIsProductCategoryDropdownOpen(!isProductCategoryDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={isProductCategoryDropdownOpen}
              className={controlClass('md', false, 'flex cursor-pointer items-center justify-between gap-2 text-left')}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cobalt" aria-hidden />
                <span className="truncate capitalize">
                  {productsCategories.find(c => c.id === productForm.category)?.label || 'Pilih kategori'}
                </span>
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-adm-subtle transition-transform duration-200', isProductCategoryDropdownOpen && 'rotate-180')} strokeWidth={1.75} aria-hidden />
            </button>

            <AnimatePresence>
              {isProductCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProductCategoryDropdownOpen(false)} />
                  <motion.div
                    role="listbox"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className={cn(FLOAT_PANEL, 'absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-0.5')}
                  >
                    {productsCategories.filter(c => c.id !== 'all').map((opt) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={productForm.category === opt.id}
                        key={opt.id}
                        onClick={() => {
                          setProductForm(prev => ({ ...prev, category: opt.id }));
                          setIsProductCategoryDropdownOpen(false);
                        }}
                        className={cn(MENU_ITEM, 'justify-between', productForm.category === opt.id && 'bg-adm-hover')}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cobalt" aria-hidden />
                          <span className={cn('truncate', productForm.category === opt.id ? 'text-adm-fg' : 'text-adm-muted')}>{opt.label}</span>
                        </span>
                        {productForm.category === opt.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-cobalt" strokeWidth={1.75} aria-hidden />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </Field>
          <Field label="Teks badge">
            <Input
              type="text"
              value={productForm.badge}
              onChange={(e) => setProductForm(prev => ({ ...prev, badge: e.target.value }))}
              placeholder="mis. Jasa Pembuatan Website"
            />
          </Field>
        </div>
        <Field label="Judul produk">
          <Input
            type="text"
            value={productForm.title}
            onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="mis. Profil Perusahaan & Web Kustom"
          />
        </Field>
        <Field label="Deskripsi produk">
          <Textarea
            value={productForm.description}
            onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Tulis deskripsi singkat..."
            className="min-h-[80px] resize-y"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teks tombol">
            <Input
              type="text"
              value={productForm.buttonText || ''}
              onChange={(e) => setProductForm(prev => ({ ...prev, buttonText: e.target.value }))}
              placeholder="Pesan Sekarang"
            />
          </Field>
          <Field label="Link tombol (opsional)">
            <Input
              type="text"
              autoCapitalize="none"
              value={productForm.buttonLink || ''}
              onChange={(e) => setProductForm(prev => ({ ...prev, buttonLink: e.target.value }))}
              placeholder="mis. link WhatsApp atau URL lain"
            />
          </Field>
        </div>

        {/* Hero-Styled Image Upload Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Field label="Gambar sampul">
            <UploadTile
              preview={productForm.image ? <img src={productForm.image} className="h-full w-full object-cover" alt="" /> : undefined}
              emptyLabel="Tambah sampul"
              changeLabel="Ganti gambar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFileLoad(file, (base64) => setProductForm(prev => ({ ...prev, image: base64 })));
              }}
            />
          </Field>
          <Field label="Logo brand (opsional)">
            <UploadTile
              preview={
                productForm.logo ? (
                  <div className="flex h-full w-full items-center justify-center bg-obsidian p-2">
                    <img src={productForm.logo} className="max-h-full max-w-full object-contain brightness-0 invert" alt="" />
                  </div>
                ) : undefined
              }
              emptyLabel="Tambah logo"
              changeLabel="Ganti logo"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFileLoad(file, (base64) => setProductForm(prev => ({ ...prev, logo: base64 })));
              }}
            />
          </Field>
        </div>
      </Modal>

      {/* 2. PORTFOLIO CRUD MODAL */}
      <Modal
        open={isPortfolioModalOpen}
        onClose={() => { setIsPortfolioModalOpen(false); setIsPortfolioSpanDropdownOpen(false); }}
        title={editingPortfolioIndex !== null ? 'Edit portofolio' : 'Tambah portofolio'}
        icon={<Briefcase />}
        size="md"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPortfolioModalOpen(false)}>Batal</Button>
            <Button onClick={handleSavePortfolio}>Simpan proyek</Button>
          </>
        }
      >
        <Field label="Nama proyek">
          <Input
            type="text"
            value={portfolioForm.title}
            onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="mis. Web App Dashboard"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tag / kategori">
            <Input
              type="text"
              value={portfolioForm.desc}
              onChange={(e) => setPortfolioForm(prev => ({ ...prev, desc: e.target.value }))}
              placeholder="mis. SAAS / FINANCE"
            />
          </Field>
          <Field label="Lebar grid (desktop)" className="relative">
            <button
              type="button"
              onClick={() => setIsPortfolioSpanDropdownOpen(!isPortfolioSpanDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={isPortfolioSpanDropdownOpen}
              className={controlClass('md', false, 'flex cursor-pointer items-center justify-between gap-2 text-left')}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-5 w-10 shrink-0 items-center rounded bg-adm-ghost p-0.5 ring-1 ring-inset ring-adm-line-strong" aria-hidden>
                  {(() => {
                    const currentSpan = portfolioForm.span || 'md:col-span-4';
                    const activePct =
                      currentSpan === 'md:col-span-4' ? '33.3%' :
                      currentSpan === 'md:col-span-5' ? '41.7%' :
                      currentSpan === 'md:col-span-6' ? '50%' :
                      currentSpan === 'md:col-span-7' ? '58.3%' : '100%';
                    return (
                      <span
                        style={{ width: activePct }}
                        className="block h-full rounded-[1.5px] bg-cobalt transition-all duration-300"
                      />
                    );
                  })()}
                </span>
                <span className="truncate font-medium">
                  {portfolioForm.span === 'md:col-span-4' ? 'Ringkas (1/3 lebar)' :
                   portfolioForm.span === 'md:col-span-5' ? 'Agak sempit (5/12)' :
                   portfolioForm.span === 'md:col-span-6' ? 'Setengah (1/2 lebar)' :
                   portfolioForm.span === 'md:col-span-7' ? 'Agak lebar (7/12)' :
                   'Lebar penuh (12/12)'}
                </span>
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-adm-subtle transition-transform duration-200', isPortfolioSpanDropdownOpen && 'rotate-180')} strokeWidth={1.75} aria-hidden />
            </button>

            <AnimatePresence>
              {isPortfolioSpanDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPortfolioSpanDropdownOpen(false)} />
                  <motion.div
                    role="listbox"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className={cn(FLOAT_PANEL, 'absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-0.5')}
                  >
                    {[
                      { id: 'md:col-span-4', label: 'Ringkas (1/3 lebar)', pct: '33.3%' },
                      { id: 'md:col-span-5', label: 'Agak sempit (5/12)', pct: '41.7%' },
                      { id: 'md:col-span-6', label: 'Setengah (1/2 lebar)', pct: '50%' },
                      { id: 'md:col-span-7', label: 'Agak lebar (7/12)', pct: '58.3%' },
                      { id: 'md:col-span-12', label: 'Lebar penuh (12/12)', pct: '100%' }
                    ].map((opt) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={portfolioForm.span === opt.id}
                        key={opt.id}
                        onClick={() => {
                          setPortfolioForm(prev => ({ ...prev, span: opt.id }));
                          setIsPortfolioSpanDropdownOpen(false);
                        }}
                        className={cn(MENU_ITEM, 'justify-between', portfolioForm.span === opt.id && 'bg-adm-hover')}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-5 w-10 shrink-0 items-center rounded bg-adm-ghost p-0.5 ring-1 ring-inset ring-adm-line-strong" aria-hidden>
                            <span style={{ width: opt.pct }} className="block h-full rounded-[1.5px] bg-cobalt" />
                          </span>
                          <span className={cn('truncate', portfolioForm.span === opt.id ? 'text-adm-fg' : 'text-adm-muted')}>{opt.label}</span>
                        </span>
                        {portfolioForm.span === opt.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-cobalt" strokeWidth={1.75} aria-hidden />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </Field>
        </div>
        {/* Hero-Styled Cover Image Upload Card */}
        <Field label="Tangkapan layar proyek">
          <UploadTile
            preview={portfolioForm.image ? <img src={portfolioForm.image} className="h-full w-full object-cover" alt="" /> : undefined}
            emptyLabel="Tambah tangkapan layar"
            changeLabel="Ganti tangkapan layar"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFileLoad(file, (base64) => setPortfolioForm(prev => ({ ...prev, image: base64 })));
            }}
          />
        </Field>
      </Modal>

      {/* 3. PRICING CRUD MODAL */}
      <Modal
        open={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        title={editingPricingIndex !== null ? 'Edit paket harga' : 'Tambah paket harga'}
        icon={<CreditCard />}
        size="md"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPricingModalOpen(false)}>Batal</Button>
            <Button onClick={handleSavePricing}>Simpan paket</Button>
          </>
        }
      >
        <Field label="Nama paket">
          <Input
            type="text"
            value={pricingForm.name}
            onChange={(e) => setPricingForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="mis. Paket Bisnis Pro"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Harga (format: 3.499.000)">
            <Input
              type="text"
              value={pricingForm.price}
              onChange={(e) => setPricingForm(prev => ({ ...prev, price: e.target.value }))}
              placeholder="mis. 3.499.000"
            />
          </Field>
          <Field label="Periode tagihan">
            <Input
              type="text"
              value={pricingForm.period}
              onChange={(e) => setPricingForm(prev => ({ ...prev, period: e.target.value }))}
              placeholder="mis. one-time, / proyek, / bulan"
            />
          </Field>
        </div>
        <Field label="Deskripsi singkat">
          <Textarea
            value={pricingForm.description}
            onChange={(e) => setPricingForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Tulis penjelasan singkat..."
            className="min-h-[60px] resize-y"
          />
        </Field>
        <Field label="Fitur (pisahkan dengan koma)">
          <Textarea
            value={pricingForm.features}
            onChange={(e) => setPricingForm(prev => ({ ...prev, features: e.target.value }))}
            placeholder="mis. Domain .com, Hosting SSD 5GB, 10 Halaman, Desain Premium"
            className="min-h-[80px] resize-y"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex h-11 items-center gap-2.5 rounded-xl bg-adm-ghost px-3.5 ring-1 ring-inset ring-adm-line sm:self-end">
            <input
              type="checkbox"
              id="popular_chk"
              checked={pricingForm.isPopular}
              onChange={(e) => setPricingForm(prev => ({ ...prev, isPopular: e.target.checked }))}
              className={checkboxClass}
            />
            <label htmlFor="popular_chk" className="cursor-pointer select-none text-sm font-medium text-adm-fg">Tandai sebagai populer</label>
          </div>
          <Field label="Teks tombol CTA">
            <Input
              type="text"
              value={pricingForm.buttonText}
              onChange={(e) => setPricingForm(prev => ({ ...prev, buttonText: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

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
    </div>
  );
};

export default SiteSettings;
