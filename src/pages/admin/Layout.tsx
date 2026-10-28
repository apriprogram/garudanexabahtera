import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';
import Header from '../../components/admin/Header';
import { getToken } from '../../lib/auth';

/** Peran yang boleh membuka panel admin (SPEC §2). `customer` = pembeli template → /akun. */
const STAFF_ROLES = ['admin', 'user'];
/** Rute yang hanya boleh dibuka admin; staf biasa diarahkan ke Dashboard. */
const ADMIN_ONLY_ROUTES = ['/admin/users'];

/** Profil dari respons `login` yang disimpan setSession() di localStorage. */
const readStoredRole = (): string | null => {
  try {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return null;
    const user = JSON.parse(stored) as { role?: unknown } | null;
    return typeof user?.role === 'string' ? user.role : null;
  } catch {
    return null;
  }
};

const AdminLayout: React.FC = () => {
  const location = useLocation();

  // Penjaga akses dihitung saat render (bukan di useEffect) supaya isi panel tidak sempat tampil
  // ke tamu atau pembeli. Server tetap memeriksa token & peran di setiap action.
  const role = getToken() ? readStoredRole() : null;
  if (!role) {
    const here = location.pathname + location.search;
    const next = here === '/admin' ? '' : `?next=${encodeURIComponent(here)}`;
    return <Navigate to={`/login${next}`} replace />;
  }
  if (role === 'customer') return <Navigate to="/akun" replace />;
  if (!STAFF_ROLES.includes(role)) return <Navigate to="/login" replace />;
  const path = location.pathname.replace(/\/+$/, '');
  if (role !== 'admin' && ADMIN_ONLY_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))) {
    return <Navigate to="/admin" replace />;
  }

  // Kerangka "kanvas dalam kanvas": latar abu + gutter 8px, sidebar & panel konten putih rounded terpisah
  return (
    <div className="admin-panel min-h-screen bg-adm-canvas font-sans text-adm-fg transition-colors duration-300 lg:flex lg:gap-2 lg:p-2">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-obsidian focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke konten
      </a>
      {/* Penutup gutter atas agar konten yang digulir tidak tampak di atas topbar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden h-2 bg-adm-canvas lg:block" aria-hidden />

      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-adm-surface lg:min-h-[calc(100vh-16px)] lg:rounded-[20px] lg:ring-1 lg:ring-inset lg:ring-adm-line">
        <Header />
        <main id="konten" className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-10 pt-5 sm:px-6 sm:pt-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
