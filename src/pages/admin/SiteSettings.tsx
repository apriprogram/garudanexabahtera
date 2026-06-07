import React, { useState, useEffect } from 'react';
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

const SiteSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    description: string;
  } | null>(null);

  const tabs = [
    { id: 'hero', label: 'Hero Section', icon: ImageIcon },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'process', label: 'Process', icon: Activity },
    { id: 'pricing', label: 'Pricelist', icon: CreditCard },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'services', label: 'CTA Banner', icon: HelpCircle },
    { id: 'footer', label: 'Footer', icon: Layout },
  ];

  const showNotify = (type: 'success' | 'error' | 'warning', message: string, description: string) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 4000);
  };

  // State values for all settings
  const [settings, setSettings] = useState<any>({});
  
  // Hero section States
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroLogos, setHeroLogos] = useState<{name: string, src: string}[]>([]);

  // Products tab States
  const [productsCategories, setProductsCategories] = useState<{ id: string; label: string }[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({
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
  const [portfolioList, setPortfolioList] = useState<any[]>([]);
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
  const [processList, setProcessList] = useState<any[]>([]);

  // Pricing tab States
  const [pricingList, setPricingList] = useState<any[]>([]);
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
  const [faqList, setFaqList] = useState<any[]>([]);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: ''
  });
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);



  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const apiUrl = '/api.php';
      const response = await fetch(`${apiUrl}?action=get_settings`);
      const data = await response.json();
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
      showNotify('error', 'Error!', 'Failed to fetch website settings.');
    }
  };

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
        showNotify('success', 'Settings Saved!', 'Website content has been updated successfully.');
        setSettings(updatedSettings);
        fetchSettings(); // Refresh settings to pull newly generated paths from PHP backend
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const msg = error?.message?.includes('HTTP') 
        ? `Server error: ${error.message}` 
        : 'Gagal terhubung ke API. Cek XAMPP & konsol browser.';
      showNotify('error', 'Save Failed!', msg);
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
      showNotify('warning', 'Duplicate Category!', 'This category already exists.');
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
      showNotify('warning', 'Validation Error', 'Title and Description are required!');
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
      showNotify('warning', 'Validation Error', 'Title and Category/Tag are required!');
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
      showNotify('warning', 'Validation Error', 'Tier Name and Price are required!');
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
      showNotify('warning', 'Validation Error', 'Question and Answer are required!');
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
          <div className="space-y-8">
            {/* Categories Management Panel */}
            <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-4">
              <div>
                <h3 className="text-white text-base font-semibold">Product Categories</h3>
                <p className="text-slate-500 text-xs mt-0.5">Define filtering categories for the product showcase section.</p>
              </div>
              <div className="flex gap-2.5 max-w-md">
                <input 
                  type="text" 
                  value={newCategoryLabel} 
                  onChange={(e) => setNewCategoryLabel(e.target.value)} 
                  placeholder="E.g. Jasa Desain, Custom App" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500/50 transition-all text-xs md:text-sm"
                />
                <button 
                  onClick={handleAddCategory}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {productsCategories.map(cat => (
                  <span 
                    key={cat.id} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-xs font-semibold uppercase tracking-wider group"
                  >
                    {cat.label}
                    {cat.id !== 'all' && (
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)} 
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Products CRUD Panel */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                <div>
                  <h3 className="text-white text-base font-semibold">Custom Product Items</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Manage products that appear in the digital solutions carousel.</p>
                </div>
                <button 
                  onClick={() => handleOpenProductModal()}
                  className="self-start px-4 py-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 border border-blue-400/40 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product Card
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {productsList.map((prod, index) => (
                  <div key={index} className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row relative group">
                    <div className="w-full md:w-36 aspect-video md:aspect-square bg-slate-900 overflow-hidden relative flex-shrink-0">
                      {prod.image ? (
                        <img src={prod.image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="w-8 h-8" /></div>
                      )}
                      <span className="absolute top-2 left-2 bg-blue-600/90 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                        {prod.category}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{prod.badge || 'PRODUK'}</div>
                        <h4 className="text-white font-bold text-sm md:text-base mt-1 line-clamp-1">{prod.title}</h4>
                        <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{prod.description}</p>
                      </div>
                      <div className="flex gap-2 justify-end pt-3 mt-auto">
                        <button 
                          onClick={() => handleOpenProductModal(index)}
                          className="p-1.5 bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 border border-transparent rounded-lg text-slate-400 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setProductsList(prev => prev.filter((_, i) => i !== index))}
                          className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent rounded-lg text-slate-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div>
                <h3 className="text-white text-base font-semibold">Portfolio Projects</h3>
                <p className="text-slate-500 text-xs mt-0.5">Manage grid gallery of client portfolio items shown below products.</p>
              </div>
              <button 
                onClick={() => handleOpenPortfolioModal()}
                className="self-start px-4 py-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 border border-blue-400/40 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Add Portfolio Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioList.map((item, index) => (
                <div key={index} className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden group flex flex-col relative">
                  <div className="aspect-video bg-slate-900 overflow-hidden relative">
                    {item.image ? (
                      <img src={item.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600"><Briefcase className="w-8 h-8" /></div>
                    )}
                    <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-slate-300 text-[8px] font-bold px-2 py-0.5 rounded">
                      Span: {item.span || '4'}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-white font-bold text-sm">{item.title}</h4>
                      <p className="text-blue-400 text-[10px] mt-0.5 font-bold uppercase tracking-wider">{item.desc}</p>
                    </div>
                    <div className="flex gap-2 justify-end pt-3 mt-3">
                      <button 
                        onClick={() => handleOpenPortfolioModal(index)}
                        className="p-1.5 bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 border border-transparent rounded-lg text-slate-400 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setPortfolioList(prev => prev.filter((_, i) => i !== index))}
                        className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent rounded-lg text-slate-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'process':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-white text-base font-semibold">Workflow Process Steps</h3>
              <p className="text-slate-500 text-xs mt-0.5">Customize the step-by-step digital process flow steps on the homepage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processList.map((step, index) => (
                <div key={index} className="bg-[#121212] border border-white/5 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-black text-blue-500/30">{step.step}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Step {index + 1}</span>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Front Card Title</label>
                      <input 
                        type="text" 
                        value={step.title} 
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].title = e.target.value;
                          setProcessList(updated);
                        }} 
                        placeholder="Front Title (e.g. Consultation)" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 text-[11px] md:text-sm font-semibold transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Front Card Description</label>
                      <input 
                        type="text" 
                        value={step.desc} 
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].desc = e.target.value;
                          setProcessList(updated);
                        }} 
                        placeholder="Front Description (e.g. Needs Analysis & Planning)" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 text-[11px] md:text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Back Card Title</label>
                      <input 
                        type="text" 
                        value={step.back_title || `DETAIL ${step.title}`.toUpperCase()} 
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].back_title = e.target.value;
                          setProcessList(updated);
                        }} 
                        placeholder="Back Title (e.g. DETAIL CONSULTATION)" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 text-[11px] md:text-sm font-semibold transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Back Card Description</label>
                      <textarea 
                        value={step.detail || ''} 
                        onChange={(e) => {
                          const updated = [...processList];
                          updated[index].detail = e.target.value;
                          setProcessList(updated);
                        }} 
                        placeholder="Back Description text" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 md:px-5 md:py-4 text-white outline-none focus:border-blue-500/50 text-[11px] md:text-sm leading-relaxed text-slate-300 overflow-hidden min-h-[100px] transition-all resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            {/* Section Headers */}
            <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Section Title</label>
                <input id="pricing_title" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" defaultValue={settings.pricing_title || "Paket Layanan Kami"} />
              </div>
              <div>
                <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Section Description</label>
                <textarea id="pricing_subtitle" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-2xl px-3 py-2.5 md:px-5 md:py-4 text-white outline-none focus:border-blue-500/50 overflow-hidden min-h-[60px] transition-all resize-y text-[11px] md:text-sm" defaultValue={settings.pricing_subtitle || "Pilih paket yang sesuai dengan skala bisnis dan kebutuhan Anda"} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div>
                <h3 className="text-white text-base font-semibold">Pricing Tiers</h3>
                <p className="text-slate-500 text-xs mt-0.5">Manage pricing tiers with listing features for custom development.</p>
              </div>
              <button 
                onClick={() => handleOpenPricingModal()}
                className="self-start px-4 py-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 border border-blue-400/40 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tier
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingList.map((tier, index) => (
                <div key={index} className={`bg-[#121212] border rounded-2xl p-5 flex flex-col justify-between relative ${tier.isPopular ? 'border-blue-500/30 bg-blue-500/[0.02]' : 'border-white/5'}`}>
                  {tier.isPopular && (
                    <span className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest">
                      POPULAR
                    </span>
                  )}
                  <div>
                    <h4 className="text-white font-bold text-sm md:text-base">{tier.name}</h4>
                     <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-lg md:text-xl font-black text-white">
                        {tier.price.toLowerCase().startsWith('rp') ? tier.price : `Rp ${tier.price}`}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{tier.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tier.features?.split(',').map((f: string, fi: number) => (
                        <span key={fi} className="text-[9px] font-semibold text-slate-300 bg-white/5 border border-white/5 rounded px-2 py-0.5 whitespace-nowrap">
                          ✓ {f.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-5 mt-4 border-t border-white/5">
                    <button 
                      onClick={() => handleOpenPricingModal(index)}
                      className="p-1.5 bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 border border-transparent rounded-lg text-slate-400 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setPricingList(prev => prev.filter((_, i) => i !== index))}
                      className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent rounded-lg text-slate-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div>
                <h3 className="text-white text-base font-semibold">Frequently Asked Questions</h3>
                <p className="text-slate-500 text-xs mt-0.5">Manage questions and answers displayed in accordion format.</p>
              </div>
              <button 
                onClick={() => handleOpenFaqModal()}
                className="self-start px-4 py-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 border border-blue-400/40 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {faqList.map((faq, index) => (
                <div key={index} className="bg-[#121212] border border-white/5 p-4 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-xs md:text-sm">Q: {faq.question}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">A: {faq.answer}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleOpenFaqModal(index)}
                      className="p-1.5 bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 border border-transparent rounded-lg text-slate-400 transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setFaqList(prev => prev.filter((_, i) => i !== index))}
                      className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent rounded-lg text-slate-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-white text-base font-semibold">CTA Banner Section</h3>
              <p className="text-slate-500 text-xs mt-0.5">Manage the highly engaging call-to-action banner displayed above the footer.</p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-4">
              <div>
                <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">CTA Title Text (Use newline to split header)</label>
                <textarea id="cta_title" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-2xl px-3 py-2.5 md:px-5 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all overflow-hidden min-h-[60px] resize-y text-[11px] md:text-sm" placeholder="Siap Membangun Sistem Digital?&#10;Konsultasikan Sekarang Juga!" defaultValue={settings.cta_title || "Siap Membangun Sistem Digital?\\nKonsultasikan Sekarang Juga!"} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">WhatsApp Button Text</label>
                  <input id="cta_button" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="Hubungi WhatsApp" defaultValue={settings.cta_button || "Hubungi WhatsApp"} />
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">WhatsApp Direct Link or Number</label>
                  <input id="cta_link" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="E.g., 6285188009152 or custom link" defaultValue={settings.cta_link || ""} />
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Display Phone Number</label>
                  <input id="cta_phone" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="E.g. 085188009152" defaultValue={settings.cta_phone || "085188009152"} />
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Free Consultation Note</label>
                  <input id="cta_note" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="Konsultasi GRATIS" defaultValue={settings.cta_note || "Konsultasi GRATIS"} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-white text-base font-semibold">Footer & Contact Settings</h3>
              <p className="text-slate-500 text-xs mt-0.5">Manage global contact channels, WhatsApp float link, address, and copyright.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-white font-bold text-xs md:text-sm uppercase tracking-wider text-blue-400">Contact Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Company Address</label>
                    <textarea id="footer_address" className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-2xl px-3 py-2.5 md:px-5 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all overflow-hidden min-h-[60px] resize-y text-[11px] md:text-sm" placeholder="Address..." defaultValue={settings.footer_address || "Mitra terpercaya untuk inovasi digital bisnis Anda. Membantu dari ide hingga menjadi produk siap rilis."} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Office Telephone</label>
                      <input id="footer_phone" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="E.g. 085188009152" defaultValue={settings.footer_phone || "085188009152"} />
                    </div>
                    <div>
                      <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">WhatsApp (Float Widget)</label>
                      <input id="footer_whatsapp" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="E.g. 6285188009152" defaultValue={settings.footer_whatsapp || "6285188009152"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Email Address</label>
                    <input id="footer_email" type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="info@garudanexa.co.id" defaultValue={settings.footer_email || "info@garudanexa.co.id"} />
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-white font-bold text-xs md:text-sm uppercase tracking-wider text-blue-400">Social Media Links</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Instagram Link</label>
                      <input id="footer_instagram" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="https://instagram.com/..." defaultValue={settings.footer_instagram || "#"} />
                    </div>
                    <div>
                      <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Facebook Link</label>
                      <input id="footer_facebook" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="https://facebook.com/..." defaultValue={settings.footer_facebook || "#"} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">LinkedIn Link</label>
                      <input id="footer_linkedin" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="https://linkedin.com/in/..." defaultValue={settings.footer_linkedin || "#"} />
                    </div>
                    <div>
                      <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">TikTok Link</label>
                      <input id="footer_tiktok" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="https://tiktok.com/@..." defaultValue={settings.footer_tiktok || "#"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">YouTube Channel Link</label>
                    <input id="footer_youtube" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="https://youtube.com/..." defaultValue={settings.footer_youtube || "#"} />
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright & Branding Footer */}
            <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-white font-bold text-xs md:text-sm uppercase tracking-wider text-blue-400">Branding Copyright</h4>
              <div>
                <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Copyright Line</label>
                <input id="footer_copyright" type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm" placeholder="&copy; 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi." defaultValue={settings.footer_copyright || "© 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi."} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const notifyStyles = notification ? (
    notification.type === 'success' 
      ? { 
          bg: 'bg-emerald-950/80 border-emerald-500/20 light-theme:bg-emerald-50/85 light-theme:backdrop-blur-md light-theme:border-emerald-200/90',
          iconColor: 'text-emerald-500 light-theme:!text-emerald-600',
          titleColor: 'text-white light-theme:!text-emerald-950',
          descColor: 'text-slate-400 light-theme:!text-emerald-800/90'
        }
      : notification.type === 'error'
        ? { 
          bg: 'bg-rose-950/80 border-rose-500/20 light-theme:bg-rose-50/85 light-theme:backdrop-blur-md light-theme:border-rose-200/90',
          iconColor: 'text-rose-500 light-theme:!text-rose-600',
          titleColor: 'text-white light-theme:!text-rose-950',
          descColor: 'text-slate-400 light-theme:!text-rose-800/90'
        }
        : { 
          bg: 'bg-amber-950/80 border-amber-500/20 light-theme:bg-amber-50/85 light-theme:backdrop-blur-md light-theme:border-amber-200/90',
          iconColor: 'text-amber-500 light-theme:!text-amber-600',
          titleColor: 'text-white light-theme:!text-amber-950',
          descColor: 'text-slate-400 light-theme:!text-amber-800/90'
        }
  ) : null;

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">Site Settings</h1>
          <p className="text-[10px] md:text-sm text-slate-400 mt-1">Manage global configuration and sections.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-1.5 px-4 py-2 md:px-5 md:py-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-full font-bold transition-all border border-blue-400/40 active:scale-95 text-[10px] md:text-xs"
        >
          {isSaving ? (
            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4 md:w-5 md:h-5" />
          )}
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
      
      {/* Dynamic Notification */}
      <AnimatePresence>
        {notification && notifyStyles && (
          <div className="fixed top-6 left-4 right-4 z-[100] flex justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`
                ${notifyStyles.bg} backdrop-blur-xl border-2
                px-6 py-3.5 md:px-8 md:py-4 rounded-2xl 
                shadow-[0_25px_60px_rgba(0,0,0,0.7)] light-theme:shadow-[0_8px_32px_rgba(31,38,135,0.06)]
                flex items-center gap-4 md:gap-5 pointer-events-auto w-full max-w-[400px]
              `}
            >
              <div className="flex-shrink-0">
                {notification.type === 'success' && <CheckCircle2 className={`w-5 h-5 md:w-7 md:h-7 ${notifyStyles.iconColor}`} />}
                {notification.type === 'error' && <AlertCircle className={`w-5 h-5 md:w-7 md:h-7 ${notifyStyles.iconColor}`} />}
                {notification.type === 'warning' && <AlertCircle className={`w-5 h-5 md:w-7 md:h-7 ${notifyStyles.iconColor}`} />}
              </div>
              <div>
                <p className={`font-bold text-sm md:text-base tracking-tight leading-none mb-1 md:mb-1.5 ${notifyStyles.titleColor}`}>{notification.message}</p>
                <p className={`text-[10px] md:text-[11px] font-medium leading-tight ${notifyStyles.descColor}`}>{notification.description}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 md:gap-8 items-start">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-0.5 md:gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-2 py-2 md:px-2.5 md:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs md:text-sm font-medium w-full
                ${activeTab === tab.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[inset_0_0_10px_rgba(37,99,235,0.03)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <tab.icon className="w-4 h-4 md:w-4.5 md:h-4.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#0D0D0D] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-2xl min-h-[400px] md:min-h-[600px] relative overflow-hidden"
          >
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-blue-600/5 blur-[60px] md:blur-[100px] rounded-full pointer-events-none" />
            
            {/* Tab Title */}
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="p-2.5 md:p-3 bg-blue-600/10 rounded-xl md:rounded-2xl text-blue-400">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || ImageIcon, { className: 'w-5 h-5 md:w-6 md:h-6' })}
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white capitalize">{activeTab} Settings</h2>
                <p className="text-slate-500 text-[10px] md:text-xs">Update the content and behavior of your {activeTab} section.</p>
              </div>
            </div>

            {/* Dynamic Form Content */}
            <div className="space-y-6 md:space-y-8">
              {renderTabContent()}
            </div>
          </motion.div>
        </div>
      </div>

      {/* =================== MODAL OVERLAYS FOR CRUD =================== */}

      {/* 1. PRODUCT CRUD MODAL */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="text-white font-bold text-base">{editingProductIndex !== null ? 'Edit Product Item' : 'Add Product Item'}</h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Product Category</label>
                    <div 
                      onClick={() => setIsProductCategoryDropdownOpen(!isProductCategoryDropdownOpen)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm flex justify-between items-center cursor-pointer hover:bg-white/[0.08] min-h-[38px] md:min-h-[46px]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                        <span className="text-white capitalize">
                          {productsCategories.find(c => c.id === productForm.category)?.label || 'Select Category'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isProductCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {isProductCategoryDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsProductCategoryDropdownOpen(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            className="absolute top-[105%] left-0 right-0 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden p-1 flex flex-col gap-0.5"
                          >
                            {productsCategories.filter(c => c.id !== 'all').map((opt) => (
                              <div 
                                key={opt.id}
                                onClick={() => { 
                                  setProductForm(prev => ({ ...prev, category: opt.id })); 
                                  setIsProductCategoryDropdownOpen(false); 
                                }}
                                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg transition-all ${productForm.category === opt.id ? 'bg-white/5' : ''}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                  <span className={`text-[11px] md:text-sm font-medium ${productForm.category === opt.id ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                                </div>
                                {productForm.category === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                              </div>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Badge Text</label>
                    <input 
                      type="text"
                      value={productForm.badge}
                      onChange={(e) => setProductForm(prev => ({ ...prev, badge: e.target.value }))}
                      placeholder="E.g. Jasa Pembuatan Website"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Product Title</label>
                  <input 
                    type="text"
                    value={productForm.title}
                    onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="E.g. Profil Perusahaan & Web Kustom"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                  />
                </div>
                 <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Product Description</label>
                  <textarea 
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide short description..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 overflow-hidden min-h-[80px] transition-all resize-y text-[11px] md:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Button Text</label>
                    <input 
                      type="text"
                      value={productForm.buttonText || ''}
                      onChange={(e) => setProductForm(prev => ({ ...prev, buttonText: e.target.value }))}
                      placeholder="Pesan Sekarang"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Button Link (Optional)</label>
                    <input 
                      type="text"
                      value={productForm.buttonLink || ''}
                      onChange={(e) => setProductForm(prev => ({ ...prev, buttonLink: e.target.value }))}
                      placeholder="e.g. WhatsApp Link or custom URL"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                    />
                  </div>
                </div>
                
                {/* Hero-Styled Image Upload Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] md:text-xs font-normal text-slate-400 mb-1.5">Cover Image</label>
                    <label className="aspect-video w-full rounded-lg border-2 border-dashed border-white/10 bg-white/5 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer group transition-all relative overflow-hidden">
                      {productForm.image ? (
                        <>
                          <img src={productForm.image} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all gap-1 text-white">
                            <Upload className="w-4 h-4 text-blue-400" />
                            <span className="text-[8px] uppercase tracking-wider font-bold">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-1.5 bg-white/5 group-hover:bg-blue-500/20 rounded-full transition-all">
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-widest">Add Cover</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageFileLoad(file, (base64) => setProductForm(prev => ({ ...prev, image: base64 })));
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-normal text-slate-400 mb-1.5">Brand Logo (Optional)</label>
                    <label className="aspect-video w-full rounded-lg border-2 border-dashed border-white/10 bg-white/5 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer group transition-all relative overflow-hidden">
                      {productForm.logo ? (
                        <>
                          <div className="w-full h-full p-2 bg-slate-950 flex items-center justify-center">
                            <img src={productForm.logo} className="max-w-full max-h-full object-contain brightness-0 invert" alt="" />
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all gap-1 text-white">
                            <Upload className="w-4 h-4 text-blue-400" />
                            <span className="text-[8px] uppercase tracking-wider font-bold">Change Logo</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-1.5 bg-white/5 group-hover:bg-blue-500/20 rounded-full transition-all">
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-widest">Add Logo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageFileLoad(file, (base64) => setProductForm(prev => ({ ...prev, logo: base64 })));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#0D0D0D] flex gap-3">
                <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-semibold transition-all">Cancel</button>
                <button onClick={handleSaveProduct} className="flex-1 py-2 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400/40 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-semibold transition-all">Save Item</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. PORTFOLIO CRUD MODAL */}
      <AnimatePresence>
        {isPortfolioModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="text-white font-bold text-base">{editingPortfolioIndex !== null ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</h3>
                <button onClick={() => setIsPortfolioModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-left">
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Project Name</label>
                  <input 
                    type="text"
                    value={portfolioForm.title}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="E.g. Web App Dashboard"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Tags / Category Description</label>
                    <input 
                      type="text"
                      value={portfolioForm.desc}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, desc: e.target.value }))}
                      placeholder="E.g. SAAS / FINANCE"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm h-[38px] md:h-[46px]"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Desktop Grid Width</label>
                    <div 
                      onClick={() => setIsPortfolioSpanDropdownOpen(!isPortfolioSpanDropdownOpen)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm flex justify-between items-center cursor-pointer hover:bg-white/[0.08] h-[38px] md:h-[46px] whitespace-nowrap overflow-hidden flex-nowrap"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-5 bg-white/5 border border-white/15 rounded flex items-center p-0.5 flex-shrink-0">
                          {(() => {
                            const currentSpan = portfolioForm.span || 'md:col-span-4';
                            const activePct = 
                              currentSpan === 'md:col-span-4' ? '33.3%' :
                              currentSpan === 'md:col-span-5' ? '41.7%' :
                              currentSpan === 'md:col-span-6' ? '50%' :
                              currentSpan === 'md:col-span-7' ? '58.3%' : '100%';
                            return (
                              <div 
                                style={{ width: activePct }} 
                                className="h-full bg-orange-500 rounded-[1.5px] transition-all duration-300 shadow-[0_0_6px_rgba(249,115,22,0.4)]" 
                              />
                            );
                          })()}
                        </div>
                        <span className="text-white text-[11px] md:text-sm font-medium truncate whitespace-nowrap">
                          {portfolioForm.span === 'md:col-span-4' ? 'Compact (1/3 Width)' :
                           portfolioForm.span === 'md:col-span-5' ? 'Slightly Narrower (5/12)' :
                           portfolioForm.span === 'md:col-span-6' ? 'Half (1/2 Width)' :
                           portfolioForm.span === 'md:col-span-7' ? 'Slightly Wider (7/12)' :
                           'Full Width (12/12)'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 flex-shrink-0 ${isPortfolioSpanDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {isPortfolioSpanDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsPortfolioSpanDropdownOpen(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            className="absolute top-[105%] left-0 right-0 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden p-1 flex flex-col gap-0.5"
                          >
                            {[
                              { id: 'md:col-span-4', label: 'Compact (1/3 Width)', pct: '33.3%' },
                              { id: 'md:col-span-5', label: 'Slightly Narrower (5/12)', pct: '41.7%' },
                              { id: 'md:col-span-6', label: 'Half (1/2 Width)', pct: '50%' },
                              { id: 'md:col-span-7', label: 'Slightly Wider (7/12)', pct: '58.3%' },
                              { id: 'md:col-span-12', label: 'Full Width (12/12)', pct: '100%' }
                            ].map((opt) => (
                              <div 
                                key={opt.id}
                                onClick={() => { 
                                  setPortfolioForm(prev => ({ ...prev, span: opt.id })); 
                                  setIsPortfolioSpanDropdownOpen(false); 
                                }}
                                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg transition-all ${portfolioForm.span === opt.id ? 'bg-white/5' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-5 bg-white/5 border border-white/15 rounded flex items-center p-0.5 flex-shrink-0">
                                    <div 
                                      style={{ width: opt.pct }} 
                                      className="h-full bg-orange-500 rounded-[1.5px] shadow-[0_0_6px_rgba(249,115,22,0.4)]" 
                                    />
                                  </div>
                                  <span className={`text-[11px] md:text-sm font-medium ${portfolioForm.span === opt.id ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                                </div>
                                {portfolioForm.span === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                              </div>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {/* Hero-Styled Cover Image Upload Card */}
                <div>
                  <label className="block text-[10px] md:text-xs font-normal text-slate-400 mb-1.5">Project Screenshot</label>
                  <label className="aspect-video w-full rounded-lg border-2 border-dashed border-white/10 bg-white/5 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer group transition-all relative overflow-hidden">
                    {portfolioForm.image ? (
                      <>
                        <img src={portfolioForm.image} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all gap-1.5 text-white">
                          <Upload className="w-5 h-5 text-blue-400" />
                          <span className="text-[9px] uppercase tracking-wider font-bold">Change Screenshot</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-white/5 group-hover:bg-blue-500/20 rounded-full transition-all">
                          <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-widest">Add Screenshot</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileLoad(file, (base64) => setPortfolioForm(prev => ({ ...prev, image: base64 })));
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#0D0D0D] flex gap-3">
                <button onClick={() => setIsPortfolioModalOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-semibold transition-all">Cancel</button>
                <button onClick={handleSavePortfolio} className="flex-1 py-2 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400/40 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-semibold transition-all">Save Project</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. PRICING CRUD MODAL */}
      <AnimatePresence>
        {isPricingModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="text-white font-bold text-base">{editingPricingIndex !== null ? 'Edit Pricing Tier' : 'Add Pricing Tier'}</h3>
                <button onClick={() => setIsPricingModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-left">
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Tier Name</label>
                  <input 
                    type="text"
                    value={pricingForm.name}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="E.g. Business Pro System"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Pricing (Format: 3.499.000)</label>
                    <input 
                      type="text"
                      value={pricingForm.price}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="E.g. 3.499.000"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Billing Period</label>
                    <input 
                      type="text"
                      value={pricingForm.period}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, period: e.target.value }))}
                      placeholder="E.g. one-time, / project, / bulan"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Short Description</label>
                  <textarea 
                    value={pricingForm.description}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide short explanation..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 overflow-hidden min-h-[60px] transition-all resize-y text-[11px] md:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Features (Separate with COMMAS)</label>
                  <textarea 
                    value={pricingForm.features}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, features: e.target.value }))}
                    placeholder="E.g. Domain .com, Hosting SSD 5GB, 10 Halaman, Desain Premium"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 overflow-hidden min-h-[80px] transition-all resize-y text-[11px] md:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/10">
                    <input 
                      type="checkbox"
                      id="popular_chk"
                      checked={pricingForm.isPopular}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 focus:ring-offset-0 bg-[#0D0D0D] border-white/20 transition-all"
                    />
                    <label htmlFor="popular_chk" className="text-xs text-white cursor-pointer select-none">Mark as Popular</label>
                  </div>
                  <div>
                    <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Button Call to Action</label>
                    <input 
                      type="text"
                      value={pricingForm.buttonText}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, buttonText: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#0D0D0D] flex gap-3">
                <button onClick={() => setIsPricingModalOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-semibold transition-all">Cancel</button>
                <button onClick={handleSavePricing} className="flex-1 py-2 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400/40 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-semibold transition-all">Save Tier</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. FAQ CRUD MODAL */}
      <AnimatePresence>
        {isFaqModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="text-white font-bold text-base">{editingFaqIndex !== null ? 'Edit FAQ Item' : 'Add FAQ Item'}</h3>
                <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 text-left">
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Question Text</label>
                  <input 
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="E.g. Apakah ada biaya bulanan?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Answer Text</label>
                  <textarea 
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="E.g. Tidak ada biaya bulanan wajib kecuali perpanjangan tahunan domain & hosting..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 overflow-hidden min-h-[100px] transition-all resize-y text-[11px] md:text-sm"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#0D0D0D] flex gap-3">
                <button onClick={() => setIsFaqModalOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-semibold transition-all">Cancel</button>
                <button onClick={handleSaveFaq} className="flex-1 py-2 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400/40 hover:from-blue-600 hover:to-blue-700 text-white rounded-full text-xs font-semibold transition-all">Save FAQ</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default SiteSettings;
