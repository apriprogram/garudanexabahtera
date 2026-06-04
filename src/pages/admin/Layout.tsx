import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';
import Header from '../../components/admin/Header';
import { useStore } from '../../store/useStore';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useStore();

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (!stored) {
      navigate('/login');
      return;
    }

    // Hak akses: route yang hanya boleh diakses admin
    const adminOnlyRoutes = ['/admin/users'];
    const currentUser = JSON.parse(stored);
    const isAdmin = currentUser?.role === 'admin';

    if (!isAdmin && adminOnlyRoutes.some(route => location.pathname.startsWith(route))) {
      navigate('/admin'); // redirect ke dashboard
    }
  }, [navigate, location.pathname]);

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 admin-panel ${
      theme === 'light' ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#080808] text-white'
    }`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative lg:z-20">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
