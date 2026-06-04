import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  LayoutDashboard, 
  Users, 
  LogOut,
  X
} from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar, theme } = useStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Get current user role from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024 && isMobileSidebarOpen) {
        toggleMobileSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileSidebarOpen, toggleMobileSidebar]);
  
  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', adminOnly: false },
    { icon: Settings, label: 'Website Settings', path: '/admin/settings', adminOnly: false },
    { icon: Users, label: 'Users', path: '/admin/users', adminOnly: true },
  ];

  // Filter menu berdasarkan role
  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  const isDesktop = windowWidth >= 1024;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => toggleMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: !isDesktop ? 224 : (isSidebarCollapsed ? 70 : 232),
          x: isDesktop ? 0 : (isMobileSidebarOpen ? 0 : -240)
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} 
        className={`
          flex flex-col z-[101] lg:z-10 fixed inset-y-0 left-0 lg:relative transition-colors duration-300
          ${theme === 'light' ? 'bg-white border-r border-slate-200' : 'bg-[#0D0D0D] border-r border-white/5'}
          ${isMobileSidebarOpen ? 'w-56 md:w-64' : ''}
        `}
      >
        {/* Header / Logo */}
        <div className={`px-3 md:px-4 flex items-center justify-center h-14 relative border-b transition-colors duration-300 ${
          theme === 'light' ? 'border-slate-200' : 'border-white/5'
        }`}>
          <Link to="/" className="flex items-center justify-center gap-2 md:gap-2.5 overflow-hidden">
            <motion.img 
              src="/assets/logo/logognbputih.png" 
              alt="Logo" 
              className={`h-5 w-auto object-contain min-w-[20px] transition-all duration-300 ${
                theme === 'light' ? 'brightness-0' : ''
              }`}
              animate={{ scale: isSidebarCollapsed ? 0.9 : 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            <AnimatePresence mode="wait">
              {!isSidebarCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`font-bold text-sm md:text-base tracking-tight whitespace-nowrap transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Garuda Nexa
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* Close Button (Mobile) */}
          <button 
            onClick={() => toggleMobileSidebar(false)}
            className={`lg:hidden absolute right-3 p-1.5 rounded-lg transition-all ${
              theme === 'light' ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 md:px-4 mt-2 md:mt-3 space-y-0.5 md:space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={() => toggleMobileSidebar(false)}
              className={({ isActive }) => `
                flex items-center gap-2 md:gap-2.5 px-2.5 py-2 md:px-3 md:py-2.5 rounded-xl transition-all group relative border
                ${isActive 
                  ? (theme === 'light'
                      ? 'bg-blue-50/80 text-blue-600 border-blue-100 shadow-[inset_0_0_10px_rgba(37,99,235,0.03)]'
                      : 'bg-blue-600/10 text-blue-400 border-blue-600/20 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]')
                  : (theme === 'light' 
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent')}
                ${isSidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <item.icon className="w-4 h-4 md:w-4.5 md:h-4.5 min-w-[16px] md:min-w-[18px]" />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {!isSidebarCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0, x: -10 }}
                        animate={{ opacity: 1, width: 'auto', x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="text-[12.5px] md:text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {/* Tooltip for collapsed mode */}
                  {isSidebarCollapsed && (
                    <div className={`absolute left-full ml-4 px-3 py-2 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md ${
                      theme === 'light' ? 'bg-slate-900 text-white' : 'bg-white text-black'
                    }`}>
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className={`px-3 py-2.5 md:px-4 md:py-3 border-t transition-colors duration-300 ${
          theme === 'light' ? 'border-slate-200' : 'border-white/5'
        }`}>
          <Link 
            to="/login" 
            className={`w-full flex items-center gap-2 md:gap-2.5 px-2.5 py-2 md:px-3 md:py-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded-xl transition-all ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 md:w-4.5 md:h-4.5 min-w-[16px] md:min-w-[18px]" />
            {!isSidebarCollapsed && <span className="text-[12.5px] md:text-sm font-medium whitespace-nowrap">Logout</span>}
          </Link>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
