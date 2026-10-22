import { lazy } from 'react';

// Halaman panel admin, dimuat hanya saat /admin dibuka: halaman publik tidak ikut mengunduh kerangka admin,
// dashboard (recharts), editor dokumen (pdfmake/docx), navbar manager (dnd-kit) maupun AI chat (react-markdown).
// Dipasang lewat ./routes.tsx. docs/platform/SEO-PLAN.md §5.7.
export const AdminLayout = lazy(() => import('./Layout'));
export const Dashboard = lazy(() => import('./Dashboard'));
export const HeroSettings = lazy(() => import('./HeroSettings'));
export const ServicesManager = lazy(() => import('./ServicesManager'));
export const ProductManager = lazy(() => import('./ProductManager'));
export const UserManager = lazy(() => import('./UserManager'));
export const SiteSettings = lazy(() => import('./SiteSettings'));
export const ProfileSettings = lazy(() => import('./ProfileSettings'));
export const HelpCenter = lazy(() => import('./HelpCenter'));
export const NavbarManager = lazy(() => import('./navbar-manager'));
export const Documents = lazy(() => import('./Documents'));
export const Changelog = lazy(() => import('./Changelog'));
export const OrderMasuk = lazy(() => import('./template-orders/OrderMasuk'));
export const InputDomain = lazy(() => import('./template-orders/InputDomain'));
export const KelolaTemplate = lazy(() => import('./template-orders/KelolaTemplate'));
export const TemplateAktif = lazy(() => import('./template-orders/TemplateAktif'));
export const ProjectClients = lazy(() => import('./project-clients'));
export const ProjectDashboard = lazy(() => import('./project-docs/ProjectDashboard'));
export const ProjectWorkspace = lazy(() => import('./project-docs/ProjectWorkspace'));
export const DocumentEditor = lazy(() => import('./project-docs/DocumentEditor'));
export const ClientManager = lazy(() => import('./project-docs/ClientManager'));
export const DocSettings = lazy(() => import('./project-docs/DocSettings'));

/** Penanda muat saat kerangka panel (sidebar + header) belum terunduh: memenuhi layar dengan latar admin. */
export const LayoutFallback = () => (
  <div className="admin-panel flex min-h-screen items-center justify-center bg-adm-canvas" role="status" aria-label="Memuat panel admin">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-adm-line border-t-primary" />
  </div>
);

/** Penanda muat satu halaman di dalam panel (sidebar & header tetap tampil). */
export const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Memuat halaman">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-adm-line border-t-primary" />
  </div>
);
