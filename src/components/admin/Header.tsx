import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, LogOut, Settings, HelpCircle, Eye, PanelLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileSidebar, toggleSidebar, isSidebarCollapsed } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const userObj = JSON.parse(storedUser);
      setCurrentUser(userObj);
      
      // Fetch latest user data from DB to sync avatar/name changes
      fetch(`/api.php?action=get_users`)
        .then(res => res.json())
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
    <header className="bg-[#080808]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Toggle */}
          <button 
            onClick={() => toggleMobileSidebar(true)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <PanelLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Desktop Sidebar Toggle */}
          <button 
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <PanelLeft className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>

          <div className="h-6 w-[1px] bg-white/5 hidden md:block mx-1" />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm hidden md:flex">
            <span className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" onClick={() => navigate('/admin')}>Admin</span>
            {pathnames.filter(name => name.toLowerCase() !== 'admin').map((name, index, filteredArr) => {
              const isLast = index === filteredArr.length - 1;
              return (
                <React.Fragment key={name}>
                  <ChevronRight className="w-3 md:w-3.5 h-3 md:h-3.5 text-slate-700" />
                  <span 
                    className={`capitalize ${isLast ? 'text-white font-medium' : 'text-slate-500'}`}
                  >
                    {name.replace('-', ' ')}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:gap-4">
          {/* Desktop Search Bar (Persistent) */}
          <div className="hidden lg:flex items-center w-64 xl:w-80 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Mobile Search Toggle */}
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={`lg:hidden p-1.5 md:p-2.5 rounded-xl transition-all ${isMobileSearchOpen ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Preview Website */}
          <button 
            onClick={() => window.open('/', '_blank')}
            className="p-1.5 md:p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="View Live Website"
          >
            <Eye className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Notifications */}
          <button className="p-1.5 md:p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all relative">
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full border border-[#080808]" />
          </button>

          <div className="h-6 w-[1px] bg-white/5 mx-1" />

          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1 md:p-1.5 hover:bg-white/5 rounded-xl transition-all"
            >
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] md:text-sm font-bold shadow-lg shadow-blue-600/20 overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.charAt(0) || 'A'
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs md:text-sm font-bold text-white leading-none">{currentUser?.name || 'Admin User'}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">Administrator</p>
              </div>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-56 bg-[#0D0D0D] border border-white/10 rounded-2xl p-2 shadow-2xl z-[60]"
                  >
                    <div className="px-4 py-3 border-b border-white/5 mb-2">
                      <p className="text-xs text-slate-500 mb-0.5">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{currentUser?.email || 'admin@garudanexa.com'}</p>
                    </div>
                    
                    <button 
                      onClick={() => { navigate('/admin/profile'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
                    >
                      <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                      Edit Profil
                    </button>
                    <button 
                      onClick={() => { navigate('/admin/help'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Bantuan
                    </button>
                    
                    <div className="h-[1px] bg-white/5 my-2 mx-2" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded-xl transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Search Input Bar */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#0D0D0D]/50 border-t border-white/5"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search settings, users, or products..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
