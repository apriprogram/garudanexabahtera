import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, LogOut, HelpCircle, Eye, PanelLeft, User, Sun, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileSidebar, toggleSidebar, isSidebarCollapsed, theme, toggleTheme } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const userObj = JSON.parse(storedUser);
      setCurrentUser(userObj);
      
      // Fetch latest user data from DB to sync avatar/name changes
      const apiUrl = window.location.hostname === 'localhost' ? '/api.php' : '/api.php';
      fetch(`${apiUrl}?action=get_users`)
        .then(res => {
          if (!res.ok) throw new Error('API not available');
          return res.json();
        })
        .then(users => {
          if (Array.isArray(users)) {
            const freshData = users.find((u: any) => u.id == userObj.id);
            if (freshData) {
              setCurrentUser(freshData);
              localStorage.setItem('currentUser', JSON.stringify(freshData));
            }
          }
        })
        .catch(err => console.error("Header sync error:", err));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <>
    <header className={`sticky top-0 z-50 transition-colors duration-300 border-b h-14 flex items-center ${
      theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#080808] border-white/5'
    }`}>
      <div className="w-full px-3 md:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Toggle */}
          <button 
            onClick={() => toggleMobileSidebar(true)}
            className={`lg:hidden p-1.5 rounded-xl transition-all ${
              theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <PanelLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Desktop Sidebar Toggle */}
          <button 
            onClick={toggleSidebar}
            className={`hidden lg:flex p-1 md:p-1.5 rounded-xl transition-all ${
              theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <PanelLeft className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>

          <div className={`h-6 w-[1px] hidden md:block mx-1 transition-colors duration-300 ${
            theme === 'light' ? 'bg-slate-200' : 'bg-white/5'
          }`} />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm hidden md:flex">
            <span 
              className={`transition-colors cursor-pointer ${
                theme === 'light' ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
              }`} 
              onClick={() => navigate('/admin')}
            >
              Admin
            </span>
            {pathnames.filter(name => name.toLowerCase() !== 'admin').map((name, index, filteredArr) => {
              const isLast = index === filteredArr.length - 1;
              return (
                <React.Fragment key={name}>
                  <ChevronRight className={`w-3 md:w-3.5 h-3 md:h-3.5 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-300' : 'text-slate-700'
                  }`} />
                  <span 
                    className={`capitalize transition-colors duration-300 ${
                      isLast 
                        ? (theme === 'light' ? 'text-slate-900 font-semibold' : 'text-white font-medium') 
                        : 'text-slate-500'
                    }`}
                  >
                    {name.replace('-', ' ')}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Desktop Search Bar (Persistent) */}
          <div className="hidden lg:flex items-center w-60 xl:w-72 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 transition-colors duration-200" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-1.5 md:py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition-all duration-300"
            />
          </div>

          {/* Mobile Search Toggle */}
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={`lg:hidden p-1.5 md:p-2 rounded-xl transition-all ${
              isMobileSearchOpen 
                ? 'text-blue-400 bg-blue-400/10' 
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5')
            }`}
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Grouped Icons (Mata, Notifikasi & DarkMode) */}
          <div className="flex items-center gap-0.5 md:gap-1">
            {/* Preview Website */}
            <button 
              onClick={() => window.open('/', '_blank')}
              className={`p-1 md:p-1.5 rounded-xl transition-all ${
                theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="View Live Website"
            >
              <Eye className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Notifications */}
            <button className={`p-1 md:p-1.5 rounded-xl transition-all relative ${
              theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
              <Bell className="w-4 h-4 md:w-5 md:h-5" />
              <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full border ${
                theme === 'light' ? 'border-white' : 'border-[#080808]'
              }`} />
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className={`p-1 md:p-1.5 rounded-xl transition-all ${
                theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 md:w-5 md:h-5" />
              ) : (
                <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-spin-slow" />
              )}
            </button>
          </div>

          <div className={`h-6 w-[1px] mx-0.5 transition-colors duration-300 ${
            theme === 'light' ? 'bg-slate-200' : 'bg-white/5'
          }`} />

          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-1.5 p-0.5 md:p-1 rounded-xl transition-all ${
                theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5'
              }`}
            >
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] md:text-sm font-bold shadow-lg shadow-blue-600/20 overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.charAt(0) || 'A'
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className={`text-xs md:text-sm font-bold leading-none transition-colors duration-300 ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{currentUser?.name || 'Admin User'}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">Administrator</p>
              </div>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`absolute right-0 mt-1 w-60 rounded-[20px] p-2 shadow-2xl z-[60] border profile-dropdown ${
                      theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-900'
                        : 'bg-[#0D0D0D] border-white/10 text-white'
                    }`}
                  >
                    {/* Header Identity Block - Neat & Soft with Avatar */}
                    <div className={`flex items-center gap-3 px-3 py-3 mb-2 rounded-[14px] border ${
                      theme === 'light' 
                        ? 'bg-slate-50/70 border-slate-100/50' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                        {currentUser?.avatar ? (
                          <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          currentUser?.name?.charAt(0) || 'A'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate mb-0.5 ${
                          theme === 'light' ? 'text-slate-800' : 'text-white'
                        }`}>{currentUser?.name || 'Admin User'}</p>
                        <p className={`text-[10px] font-medium truncate ${
                          theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                        }`}>{currentUser?.email || 'admin@garudanexa.com'}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { navigate('/admin/profile'); setIsDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                        theme === 'light'
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <User className={`w-5 h-5 transition-colors duration-200 ${
                        theme === 'light' ? 'text-slate-400 group-hover:text-slate-900' : 'text-slate-500 group-hover:text-white'
                      }`} />
                      Edit Profil
                    </button>
                    <button 
                      onClick={() => { navigate('/admin/help'); setIsDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                        theme === 'light'
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <HelpCircle className={`w-5 h-5 transition-colors duration-200 ${
                        theme === 'light' ? 'text-slate-400 group-hover:text-slate-900' : 'text-slate-500 group-hover:text-white'
                      }`} />
                      Catatan Perubahan
                    </button>
                    
                    <div className={`h-[1px] my-1.5 mx-2 ${
                      theme === 'light' ? 'bg-slate-100/70' : 'bg-white/5'
                    }`} />
                    
                    <button 
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                        theme === 'light'
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-50/70'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
                      }`}
                    >
                      <LogOut className={`w-5 h-5 transition-colors duration-200 ${
                        theme === 'light' ? 'text-red-400 group-hover:text-red-700' : 'text-red-500 group-hover:text-red-300'
                      }`} />
                      Keluar
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Search Bar — below header, pushes content down */}
    <AnimatePresence>
      {isMobileSearchOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`overflow-hidden border-b ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0D0D0D]/50 border-white/5'
          }`}
        >
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                autoFocus
                placeholder="Search settings, users, or products..." 
                className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500/50 transition-all ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    : 'bg-white/5 border-white/10 text-white placeholder:text-slate-600'
                }`}
              />
            </div>
          </div>
        </motion.div>
      )}  
    </AnimatePresence>
    </>
  );
};

export default Header;
