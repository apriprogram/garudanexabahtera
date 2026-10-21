import { Navigate, Route } from 'react-router-dom';
import AdminLayout from './Layout';
import Dashboard from './Dashboard';
import HeroSettings from './HeroSettings';
import ServicesManager from './ServicesManager';
import ProductManager from './ProductManager';
import UserManager from './UserManager';
import SiteSettings from './SiteSettings';
import ProfileSettings from './ProfileSettings';
import HelpCenter from './HelpCenter';
import NavbarManager from './navbar-manager';
import Documents from './Documents';
import Changelog from './Changelog';
import OrderMasuk from './template-orders/OrderMasuk';
import InputDomain from './template-orders/InputDomain';
import KelolaTemplate from './template-orders/KelolaTemplate';
import TemplateAktif from './template-orders/TemplateAktif';
import ProjectClients from './project-clients';
import ProjectDashboard from './project-docs/ProjectDashboard';
import ProjectWorkspace from './project-docs/ProjectWorkspace';
import DocumentEditor from './project-docs/DocumentEditor';
import ClientManager from './project-docs/ClientManager';
import DocSettings from './project-docs/DocSettings';

/** Rute lama yang fiturnya sudah dihapus (Monitoring server, Monitor produk): arahkan ke Dashboard, bukan 404. */
const toDashboard = <Navigate to="/admin" replace />;

/** Rute panel admin (`/admin/*`), dipasang di src/App.tsx. */
export const adminRoutes = (
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<Dashboard />} />
    <Route path="pesanan-template" element={<OrderMasuk />} />
    <Route path="pesanan-template/input-domain" element={<InputDomain />} />
    <Route path="pesanan-template/kelola-template" element={<KelolaTemplate />} />
    <Route path="pesanan-template/template-aktif" element={<TemplateAktif />} />
    <Route path="project-clients" element={<ProjectClients />} />
    {/* Dokumen proyek (docs/platform/PROJECT-DOCS-SPEC.md §7); "pengaturan" menang atas ":id" (segmen statis) */}
    <Route path="proyek" element={<ProjectDashboard />} />
    <Route path="proyek/pengaturan" element={<DocSettings />} />
    <Route path="proyek/:id" element={<ProjectWorkspace />} />
    <Route path="proyek/:id/dokumen/:docId" element={<DocumentEditor />} />
    <Route path="klien" element={<ClientManager />} />
    <Route path="hero" element={<HeroSettings settings={{}} heroImages={[]} setHeroImages={() => {}} heroLogos={[]} setHeroLogos={() => {}} />} />
    <Route path="services" element={<ServicesManager />} />
    <Route path="product-manager" element={<ProductManager />} />
    <Route path="documents" element={<Documents />} />
    <Route path="changelog" element={<Changelog />} />
    <Route path="navbar-manager" element={<NavbarManager />} />
    <Route path="users" element={<UserManager />} />
    <Route path="settings" element={<SiteSettings />} />
    <Route path="profile" element={<ProfileSettings />} />
    <Route path="help" element={<HelpCenter />} />
    <Route path="monitoring-server/*" element={toDashboard} />
    <Route path="products/*" element={toDashboard} />
    <Route path="*" element={toDashboard} />
  </Route>
);
