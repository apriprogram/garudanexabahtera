import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from './hooks/useSiteSettings';
import Home from './pages/public/Home';
import { adminRoutes } from './pages/admin/routes';
import SiteHostGate from './templates/SiteHostGate';
import { LEGAL_PATHS } from './lib/legal';
import { HUB_PATHS } from './seo/paths';
import { trackVisitOnce } from './lib/visitTracking';

// Halaman di luar beranda dimuat saat dibuka agar bundel beranda tetap ringan
const Auth = lazy(() => import('./pages/Auth'));
const CatalogPage = lazy(() => import('./pages/public/catalog/CatalogPage'));
const CategoryPage = lazy(() => import('./pages/public/catalog/CategoryPage'));
const JasaWebsite = lazy(() => import('./pages/public/services/JasaWebsite'));
const JasaAplikasi = lazy(() => import('./pages/public/services/JasaAplikasi'));
const Harga = lazy(() => import('./pages/public/info/Harga'));
const Tentang = lazy(() => import('./pages/public/info/Tentang'));
const Kontak = lazy(() => import('./pages/public/info/Kontak'));
const PanduanIndex = lazy(() => import('./pages/public/panduan/PanduanIndex'));
const PanduanArticle = lazy(() => import('./pages/public/panduan/PanduanArticle'));
const TemplateDetail = lazy(() => import('./pages/public/TemplateDetail'));
const TemplateDemo = lazy(() => import('./pages/public/TemplateDemo'));
const SitePreview = lazy(() => import('./pages/public/SitePreview'));
const OrderTemplate = lazy(() => import('./pages/public/OrderTemplate'));
const CustomOrder = lazy(() => import('./pages/public/CustomOrder'));
const CustomerLogin = lazy(() => import('./pages/public/CustomerLogin'));
const CustomerRegister = lazy(() => import('./pages/public/CustomerRegister'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const AccountHome = lazy(() => import('./pages/account/AccountHome'));
const AccountOrderDetail = lazy(() => import('./pages/account/AccountOrderDetail'));
const AccountInvoice = lazy(() => import('./pages/account/AccountInvoice'));
const AccountInvoices = lazy(() => import('./pages/account/AccountInvoices'));
const AccountProfile = lazy(() => import('./pages/account/AccountProfile'));
const SiteEditor = lazy(() => import('./pages/account/SiteEditor'));
const SyaratKetentuan = lazy(() => import('./pages/public/legal/SyaratKetentuan'));
const KebijakanPrivasi = lazy(() => import('./pages/public/legal/KebijakanPrivasi'));
const KebijakanPengembalianDana = lazy(() => import('./pages/public/legal/KebijakanPengembalianDana'));
const MyProjects = lazy(() => import('./pages/account/projects/MyProjects'));
const MyProjectDetail = lazy(() => import('./pages/account/projects/MyProjectDetail'));
const MyProjectDocument = lazy(() => import('./pages/account/projects/MyProjectDocument'));
const SitePostsPage = lazy(() => import('./pages/account/posts/SitePostsPage'));
const SitePostEditor = lazy(() => import('./pages/account/posts/SitePostEditor'));
const SiteSeoPage = lazy(() => import('./pages/account/seo/SiteSeoPage'));

/**
 * Website hanya berbahasa Indonesia (sakelar ID/EN & Google Translate dihapus): bersihkan sisa pilihan bahasa lama
 * di browser pengunjung, yaitu `language` di localStorage dan cookie `googtrans` milik Google Translate.
 */
const clearLegacyLanguage = () => {
  try {
    localStorage.removeItem('language');
  } catch {
    // penyimpanan diblokir: tidak ada yang perlu dibersihkan
  }
  if (!document.cookie.includes('googtrans=')) return;
  const host = window.location.hostname;
  for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) {
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain}`;
  }
};

const PageFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Memuat halaman">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
  </div>
);

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

/** Pesan pembuka tautan "Chat WhatsApp" di jawaban Nexa. */
const WA_GREETING = 'Halo Admin, saya tertarik dengan template website atau jasa pembuatan website/aplikasi Garuda Nexa.';
// Halaman tanpa chat Nexa: alur fokus (masuk/daftar/login), demo template & situs pelanggan, akun, dan panel admin
const NEXA_EXCLUDED = ['/demo', '/situs', '/akun', '/login', '/auth', '/admin', '/masuk', '/daftar'];

/**
 * Chat Nexa AI melayang di semua halaman situs utama, selalu tampil di semua ukuran layar (pemilik 2026-10-24; tombol
 * WhatsApp melayang dihapus, jalur WhatsApp lewat jawaban Nexa & footer). Beranda juga mendapat tombol "ke atas".
 */
function FloatingNexa() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  if (NEXA_EXCLUDED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  // Saklar admin (Pengaturan website → Tanya Nexa): '0' menyembunyikan chat di seluruh situs; tombol "ke atas"
  // beranda tetap tampil
  const chat = settings.nexa_enabled !== '0';
  const backToTop = pathname === '/';
  if (!chat && !backToTop) return null;
  return <FloatingWhatsApp href={whatsappUrl(getWhatsappNumber(settings), WA_GREETING)} backToTop={backToTop} chat={chat} />;
}

function App() {
  const { theme } = useStore();

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  useEffect(() => {
    clearLegacyLanguage();
  }, []);

  useEffect(() => {
    // Sekali per sesi, host utama saja, dengan host referrer + path landing + utm_source (src/lib/visitTracking.ts)
    trackVisitOnce();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SiteHostGate>
        {/* caseSensitive: server (.htaccess, seo.php) membedakan huruf besar-kecil, jadi /Harga atau /Template/x adalah 404
            di server dan juga NotFound di klien (tanpa itu React Router merender halaman aslinya di atas HTML 404). */}
        <Routes>
          {/* Website publik */}
          <Route caseSensitive path="/" element={<Home />} />
          {/* Katalog & kategori (docs/platform/SEO-PLAN.md §2). "kategori" bukan slug template (ditolak kedua backend),
              dan /template/kategori/:category lebih spesifik dari /template/:slug, jadi slug template tetap menang. */}
          <Route caseSensitive path={HUB_PATHS.catalog} element={lazyPage(<CatalogPage />)} />
          <Route caseSensitive path="/template/kategori/:category" element={lazyPage(<CategoryPage />)} />
          <Route caseSensitive path="/template/:slug" element={lazyPage(<TemplateDetail />)} />
          <Route caseSensitive path="/demo/:slug" element={lazyPage(<TemplateDemo />)} />
          <Route caseSensitive path="/situs/:siteId/*" element={lazyPage(<SitePreview />)} />
          <Route caseSensitive path="/pesan/:slug" element={lazyPage(<OrderTemplate />)} />
          <Route caseSensitive path="/pesan-custom" element={lazyPage(<CustomOrder />)} />
          <Route caseSensitive path="/masuk" element={lazyPage(<CustomerLogin />)} />
          <Route caseSensitive path="/daftar" element={lazyPage(<CustomerRegister />)} />

          {/* Jasa custom, harga, perusahaan, panduan */}
          <Route caseSensitive path={HUB_PATHS.webService} element={lazyPage(<JasaWebsite />)} />
          <Route caseSensitive path={HUB_PATHS.mobileService} element={lazyPage(<JasaAplikasi />)} />
          <Route caseSensitive path={HUB_PATHS.pricing} element={lazyPage(<Harga />)} />
          <Route caseSensitive path={HUB_PATHS.about} element={lazyPage(<Tentang />)} />
          <Route caseSensitive path={HUB_PATHS.contact} element={lazyPage(<Kontak />)} />
          <Route caseSensitive path={HUB_PATHS.guides} element={lazyPage(<PanduanIndex />)} />
          <Route caseSensitive path="/panduan/:slug" element={lazyPage(<PanduanArticle />)} />

          {/* Dokumen legal (ditautkan di Footer, checkout, dan form daftar) */}
          <Route caseSensitive path={LEGAL_PATHS.terms} element={lazyPage(<SyaratKetentuan />)} />
          <Route caseSensitive path={LEGAL_PATHS.privacy} element={lazyPage(<KebijakanPrivasi />)} />
          <Route caseSensitive path={LEGAL_PATHS.refund} element={lazyPage(<KebijakanPengembalianDana />)} />

          {/* Akun pembeli template */}
          <Route caseSensitive path="/akun" element={lazyPage(<AccountLayout />)}>
            {/* Menu sidebar akun (src/pages/account/components/accountNav.ts): Beranda, Pesanan saya, Situs saya, Nota */}
            <Route index element={lazyPage(<AccountHome />)} />
            <Route caseSensitive path="pesanan" element={lazyPage(<AccountHome view="orders" />)} />
            <Route caseSensitive path="situs" element={lazyPage(<AccountHome view="sites" />)} />
            <Route caseSensitive path="nota" element={lazyPage(<AccountInvoices />)} />
            <Route caseSensitive path="pesanan/:orderNumber" element={lazyPage(<AccountOrderDetail />)} />
            {/* Nota pembelian & perpanjangan, profil pembeli (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §4, §6) */}
            <Route caseSensitive path="pesanan/:orderNumber/nota" element={lazyPage(<AccountInvoice />)} />
            <Route caseSensitive path="pesanan/:orderNumber/nota/:renewalNumber" element={lazyPage(<AccountInvoice />)} />
            <Route caseSensitive path="profil" element={lazyPage(<AccountProfile />)} />
            <Route caseSensitive path="situs/:siteId" element={lazyPage(<SiteEditor />)} />
            {/* Dokumen proyek custom (docs/platform/PROJECT-DOCS-SPEC.md §7) */}
            <Route caseSensitive path="proyek" element={lazyPage(<MyProjects />)} />
            <Route caseSensitive path="proyek/:id" element={lazyPage(<MyProjectDetail />)} />
            <Route caseSensitive path="proyek/:id/dokumen/:docId" element={lazyPage(<MyProjectDocument />)} />
            {/* Berita & pengumuman (template sekolah) dan SEO situs (docs/platform/SITE-POSTS-SEO-SPEC.md §8) */}
            <Route caseSensitive path="situs/:siteId/berita" element={lazyPage(<SitePostsPage />)} />
            <Route caseSensitive path="situs/:siteId/berita/:postId" element={lazyPage(<SitePostEditor />)} />
            <Route caseSensitive path="situs/:siteId/seo" element={lazyPage(<SiteSeoPage />)} />
          </Route>

          {/* Login staf & panel admin */}
          <Route caseSensitive path="/login" element={lazyPage(<Auth />)} />
          <Route caseSensitive path="/auth" element={lazyPage(<Auth />)} />
          {adminRoutes}

          <Route path="*" element={lazyPage(<NotFound />)} />
        </Routes>
        <FloatingNexa />
      </SiteHostGate>
    </div>
  );
}

export default App;
