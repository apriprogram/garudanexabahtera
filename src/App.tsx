import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Auth from './pages/Auth';
import Home from './pages/public/Home';
import { adminRoutes } from './pages/admin/routes';
import SiteHostGate from './templates/SiteHostGate';
import { isMainHost } from './templates/siteHosts';

// Halaman di luar beranda dimuat saat dibuka agar bundel beranda tetap ringan
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
const MyProjects = lazy(() => import('./pages/account/projects/MyProjects'));
const MyProjectDetail = lazy(() => import('./pages/account/projects/MyProjectDetail'));
const MyProjectDocument = lazy(() => import('./pages/account/projects/MyProjectDocument'));

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
          <Route path="/template/:slug" element={lazyPage(<TemplateDetail />)} />
          <Route path="/demo/:slug" element={lazyPage(<TemplateDemo />)} />
          <Route path="/situs/:siteId" element={lazyPage(<SitePreview />)} />
          <Route path="/pesan/:slug" element={lazyPage(<OrderTemplate />)} />
          <Route path="/pesan-custom" element={lazyPage(<CustomOrder />)} />
          <Route path="/masuk" element={lazyPage(<CustomerLogin />)} />
          <Route path="/daftar" element={lazyPage(<CustomerRegister />)} />

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
          <Route path="/login" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          {adminRoutes}

          <Route path="*" element={lazyPage(<NotFound />)} />
        </Routes>
      </SiteHostGate>
    </div>
  );
}

export default App;
