import { Suspense, type ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
// Semua halaman (dan kerangka) panel admin lazy, lihat ./lazyPages.tsx
import {
  AdminLayout,
  Changelog,
  ClientManager,
  Dashboard,
  DocSettings,
  DocumentEditor,
  Documents,
  HelpCenter,
  HeroSettings,
  InputDomain,
  KelolaTemplate,
  LayoutFallback,
  NavbarManager,
  OrderMasuk,
  PageFallback,
  ProductManager,
  ProfileSettings,
  ProjectClients,
  ProjectDashboard,
  ProjectWorkspace,
  ServicesManager,
  SiteSettings,
  TemplateAktif,
  UserManager,
} from './lazyPages';

const page = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

/** Rute lama yang fiturnya sudah dihapus (Monitoring server, Monitor produk): arahkan ke Dashboard, bukan 404. */
const toDashboard = <Navigate to="/admin" replace />;

/** Rute panel admin (`/admin/*`), dipasang di src/App.tsx. */
export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <Suspense fallback={<LayoutFallback />}>
        <AdminLayout />
      </Suspense>
    }
  >
    <Route index element={page(<Dashboard />)} />
    <Route path="pesanan-template" element={page(<OrderMasuk />)} />
    <Route path="pesanan-template/input-domain" element={page(<InputDomain />)} />
    <Route path="pesanan-template/kelola-template" element={page(<KelolaTemplate />)} />
    <Route path="pesanan-template/template-aktif" element={page(<TemplateAktif />)} />
    <Route path="project-clients" element={page(<ProjectClients />)} />
    {/* Dokumen proyek (docs/platform/PROJECT-DOCS-SPEC.md §7); "pengaturan" menang atas ":id" (segmen statis) */}
    <Route path="proyek" element={page(<ProjectDashboard />)} />
    <Route path="proyek/pengaturan" element={page(<DocSettings />)} />
    <Route path="proyek/:id" element={page(<ProjectWorkspace />)} />
    <Route path="proyek/:id/dokumen/:docId" element={page(<DocumentEditor />)} />
    <Route path="klien" element={page(<ClientManager />)} />
    <Route
      path="hero"
      element={page(
        <HeroSettings
          settings={{}}
          heroImages={[]}
          setHeroImages={() => {}}
          heroLogos={[]}
          setHeroLogos={() => {}}
          heroBgMode="default"
          setHeroBgMode={() => {}}
          heroVideo=""
          setHeroVideo={() => {}}
          heroVideoPoster=""
          setHeroVideoPoster={() => {}}
        />,
      )}
    />
    <Route path="services" element={page(<ServicesManager />)} />
    <Route path="product-manager" element={page(<ProductManager />)} />
    <Route path="documents" element={page(<Documents />)} />
    <Route path="changelog" element={page(<Changelog />)} />
    <Route path="navbar-manager" element={page(<NavbarManager />)} />
    <Route path="users" element={page(<UserManager />)} />
    <Route path="settings" element={page(<SiteSettings />)} />
    <Route path="profile" element={page(<ProfileSettings />)} />
    <Route path="help" element={page(<HelpCenter />)} />
    <Route path="monitoring-server/*" element={toDashboard} />
    <Route path="products/*" element={toDashboard} />
    <Route path="*" element={toDashboard} />
  </Route>
);
