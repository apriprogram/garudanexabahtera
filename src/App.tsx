import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Home from './pages/public/Home';
import { adminRoutes } from './pages/admin/routes';
import SiteHostGate from './templates/SiteHostGate';
import { isMainHost } from './templates/siteHosts';
import { LEGAL_PATHS } from './lib/legal';
import { HUB_PATHS } from './seo/paths';

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
const SiteEditor = lazy(() => import('./pages/account/SiteEditor'));
const SyaratKetentuan = lazy(() => import('./pages/public/legal/SyaratKetentuan'));
const KebijakanPrivasi = lazy(() => import('./pages/public/legal/KebijakanPrivasi'));
const KebijakanPengembalianDana = lazy(() => import('./pages/public/legal/KebijakanPengembalianDana'));
const MyProjects = lazy(() => import('./pages/account/projects/MyProjects'));
const MyProjectDetail = lazy(() => import('./pages/account/projects/MyProjectDetail'));
const MyProjectDocument = lazy(() => import('./pages/account/projects/MyProjectDocument'));

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

function App() {
  const { theme } = useStore();

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  useEffect(() => {
    clearLegacyLanguage();
  }, []);

  useEffect(() => {
    // Situs milik pembeli (domain lain) tidak dihitung di statistik pengunjung Garuda Nexa
    if (!isMainHost(window.location.hostname)) return;
    // Only track visit once per session
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (!hasVisited) {
      sessionStorage.setItem('hasVisited', 'true'); // Set immediately to prevent double fetch in StrictMode
      fetch('/api.php?action=track_visit').catch(err => {
        console.error('Error tracking visit:', err);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SiteHostGate>
        <Routes>
          {/* Website publik */}
          <Route path="/" element={<Home />} />
          {/* Katalog & kategori (docs/platform/SEO-PLAN.md §2). "kategori" bukan slug template (ditolak kedua backend),
              dan /template/kategori/:category lebih spesifik dari /template/:slug, jadi slug template tetap menang. */}
          <Route path={HUB_PATHS.catalog} element={lazyPage(<CatalogPage />)} />
          <Route path="/template/kategori/:category" element={lazyPage(<CategoryPage />)} />
          <Route path="/template/:slug" element={lazyPage(<TemplateDetail />)} />
          <Route path="/demo/:slug" element={lazyPage(<TemplateDemo />)} />
          <Route path="/situs/:siteId" element={lazyPage(<SitePreview />)} />
          <Route path="/pesan/:slug" element={lazyPage(<OrderTemplate />)} />
          <Route path="/pesan-custom" element={lazyPage(<CustomOrder />)} />
          <Route path="/masuk" element={lazyPage(<CustomerLogin />)} />
          <Route path="/daftar" element={lazyPage(<CustomerRegister />)} />

          {/* Jasa custom, harga, perusahaan, panduan */}
          <Route path={HUB_PATHS.webService} element={lazyPage(<JasaWebsite />)} />
          <Route path={HUB_PATHS.mobileService} element={lazyPage(<JasaAplikasi />)} />
          <Route path={HUB_PATHS.pricing} element={lazyPage(<Harga />)} />
          <Route path={HUB_PATHS.about} element={lazyPage(<Tentang />)} />
          <Route path={HUB_PATHS.contact} element={lazyPage(<Kontak />)} />
          <Route path={HUB_PATHS.guides} element={lazyPage(<PanduanIndex />)} />
          <Route path="/panduan/:slug" element={lazyPage(<PanduanArticle />)} />

          {/* Dokumen legal (ditautkan di Footer, checkout, dan form daftar) */}
          <Route path={LEGAL_PATHS.terms} element={lazyPage(<SyaratKetentuan />)} />
          <Route path={LEGAL_PATHS.privacy} element={lazyPage(<KebijakanPrivasi />)} />
          <Route path={LEGAL_PATHS.refund} element={lazyPage(<KebijakanPengembalianDana />)} />

          {/* Akun pembeli template */}
          <Route path="/akun" element={lazyPage(<AccountLayout />)}>
            <Route index element={lazyPage(<AccountHome />)} />
            <Route path="pesanan/:orderNumber" element={lazyPage(<AccountOrderDetail />)} />
            <Route path="situs/:siteId" element={lazyPage(<SiteEditor />)} />
            {/* Dokumen proyek custom (docs/platform/PROJECT-DOCS-SPEC.md §7) */}
            <Route path="proyek" element={lazyPage(<MyProjects />)} />
            <Route path="proyek/:id" element={lazyPage(<MyProjectDetail />)} />
            <Route path="proyek/:id/dokumen/:docId" element={lazyPage(<MyProjectDocument />)} />
          </Route>

          {/* Login staf & panel admin */}
          <Route path="/login" element={lazyPage(<Auth />)} />
          <Route path="/auth" element={lazyPage(<Auth />)} />
          {adminRoutes}

          <Route path="*" element={lazyPage(<NotFound />)} />
        </Routes>
      </SiteHostGate>
    </div>
  );
}

export default App;
