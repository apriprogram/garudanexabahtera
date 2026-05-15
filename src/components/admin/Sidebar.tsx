import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  LayoutDashboard, 
  Users, 
  Moon,
  LogOut,
  X
} from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, isMobileSidebarOpen, toggleMobileSidebar } = useStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Auto-close mobile sidebar when transitioning to desktop
      if (window.innerWidth >= 1024 && isMobileSidebarOpen) {
        toggleMobileSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileSidebarOpen, toggleMobileSidebar]);
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Settings, label: 'Website Settings', path: '/admin/settings' },
    { icon: Users, label: 'Users', path: '/admin/users' },
  ];

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
          width: !isDesktop ? 224 : (isSidebarCollapsed ? 80 : 256),
          x: isDesktop ? 0 : (isMobileSidebarOpen ? 0 : -240)
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} 
        className={`
          bg-[#0D0D0D] border-r border-white/5 flex flex-col z-[101]
          fixed inset-y-0 left-0 lg:relative
          ${isMobileSidebarOpen ? 'w-56 md:w-64' : ''}
        `}
      >
        {/* Header / Logo */}
        <div className={`p-4 md:p-6 flex items-center h-16 md:h-20 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link to="/" className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <motion.img 
              src="/assets/logo/logognbputih.png" 
              alt="Logo" 
              className="h-5 md:h-6 w-auto object-contain min-w-[20px] md:min-w-[24px]" 
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
                  className="font-bold text-base md:text-lg tracking-tight whitespace-nowrap text-white"
                >
                  Garuda Nexa
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* Close Button (Mobile) */}
          <button 
            onClick={() => toggleMobileSidebar(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-2.5 md:px-3 mt-2 md:mt-4 space-y-1 md:space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={() => toggleMobileSidebar(false)}
              className={({ isActive }) => `
                flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-xl transition-all group relative
                ${isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
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
                    <item.icon className="w-4.5 h-4.5 md:w-5 md:h-5 min-w-[18px] md:min-w-[20px]" />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {!isSidebarCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0, x: -10 }}
                        animate={{ opacity: 1, width: 'auto', x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="text-[13px] md:text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {/* Tooltip for collapsed mode */}
                  {isSidebarCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-white text-black text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 md:p-4 border-t border-white/5 space-y-1">
          <button className={`w-full flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <Moon className="w-4.5 h-4.5 md:w-5 md:h-5 min-w-[18px] md:min-w-[20px]" />
            {!isSidebarCollapsed && <span className="text-[13px] md:text-sm font-medium">Dark Mode</span>}
          </button>
          <Link to="/login" className={`w-full flex items-center gap-2.5 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded-xl transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <LogOut className="w-4.5 h-4.5 md:w-5 md:h-5 min-w-[18px] md:min-w-[20px]" />
            {!isSidebarCollapsed && <span className="text-[13px] md:text-sm font-medium whitespace-nowrap">Logout</span>}
          </Link>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
