import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sun, Moon, Menu, X, Globe, ChevronDown, Globe2, 
  GraduationCap, ShoppingCart, Users2, ShieldCheck, 
  Rocket, Briefcase, MessageSquare, Info, Star, Zap,
  CheckCircle2, Layout, Smartphone, Cloud, Code2, HeartHandshake
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';

const Navbar: React.FC = () => {
  const { theme, toggleTheme, language, setLanguage } = useStore();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleLanguage = () => {
    const newLang = language === 'id' ? 'en' : 'id';
    setLanguage(newLang);
    
    // Google Translate cookie-based logic
    // Format: /source_lang/target_lang
    const gtValue = `/id/${newLang}`;
    document.cookie = `googtrans=${gtValue}; path=/`;
    document.cookie = `googtrans=${gtValue}; path=/; domain=${window.location.hostname}`;
    
    // Reload to apply translation
    window.location.reload();
  };

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 w-full z-[1000] bg-bg-dark/60 backdrop-blur-xl border-b border-white/5 transition-all duration-500 light-theme:bg-slate-50/80 light-theme:border-slate-300"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 flex justify-between items-center h-[72px]">
        {/* Left Side: Menu & Logo */}
        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors light-theme:text-slate-600 light-theme:hover:text-slate-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <a href="/" className="flex items-center gap-2 sm:gap-3 no-underline group">
            <img 
              src="/assets/logo/logogarudanexa.png" 
              alt="Logo" 
              className="h-9 sm:h-10 w-auto transition-all duration-300 brightness-0 invert light-theme:brightness-100 light-theme:invert-0" 
            />
            <div className="hidden sm:block font-semibold text-lg sm:text-xl text-white light-theme:text-slate-900 tracking-tight group-hover:text-[#FFD700] light-theme:group-hover:text-primary transition-colors duration-300">Garuda Nexa Bahtera</div>
          </a>
        </div>

        {/* Center: Desktop Navigation */}
        <ul className="hidden lg:flex gap-8 items-center">
          <li 
            className="relative"
            onMouseEnter={() => setActiveDropdown('products')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-all light-theme:text-slate-600 light-theme:hover:text-primary cursor-pointer py-6">
              {t('nav-products')}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {activeDropdown === 'products' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-0 pt-0 pointer-events-auto"
                >
                  <div className="bg-[#121214] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/5 light-theme:bg-white light-theme:border-slate-200 min-w-[640px]">
                    <div className="grid grid-cols-12">
                      <div className="col-span-12 p-6 grid grid-cols-2 gap-2">
                        <MenuItem icon={<Globe2 className="w-5 h-5" />} title="Web Development" desc="High-performance websites" />
                        <MenuItem icon={<ShoppingCart className="w-5 h-5" />} title="POS System" desc="Modern retail solutions" />
                        <MenuItem icon={<GraduationCap className="w-5 h-5" />} title="I-School" desc="Complete school management" />
                        <MenuItem icon={<Users2 className="w-5 h-5" />} title="Attendance" desc="Face-recog & GPS systems" />
                        <MenuItem icon={<Moon className="w-5 h-5" />} title="I-Santri" desc="Islamic boarding system" />
                        <MenuItem icon={<ShieldCheck className="w-5 h-5" />} title="Enterprise" desc="Custom business software" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>


          <li><a href="#portfolio" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors light-theme:text-slate-600 light-theme:hover:text-primary py-6 inline-block">{t('nav-portfolio')}</a></li>
          
          <li 
            className="relative"
            onMouseEnter={() => setActiveDropdown('company')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-all light-theme:text-slate-600 light-theme:hover:text-primary cursor-pointer py-6">
              Company
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'company' ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {activeDropdown === 'company' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full right-0 pt-0 pointer-events-auto"
                >
                  <div className="bg-[#121214] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/5 light-theme:bg-white light-theme:border-slate-200 min-w-[280px]">
                    <div className="p-4 grid grid-cols-1 gap-1">
                      <MenuItem icon={<Info className="w-4 h-4" />} title="About Us" desc="Our story & mission" />
                      <MenuItem icon={<Briefcase className="w-4 h-4" />} title="Careers" desc="Join our talent team" />
                      <MenuItem icon={<MessageSquare className="w-4 h-4" />} title="Contact" desc="Get in touch with us" />
                      <MenuItem icon={<HeartHandshake className="w-4 h-4" />} title="Partnership" desc="Let's grow together" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        </ul>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden lg:flex items-center border border-white/10 rounded-xl px-4 py-2 gap-3 transition-all duration-300 group bg-white/5 focus-within:bg-white/10 w-52 light-theme:bg-transparent light-theme:border-slate-500 light-theme:hover:border-slate-800 light-theme:focus-within:border-slate-800">
            <Search className="w-4 h-4 text-white/50 group-focus-within:text-white light-theme:text-slate-500 light-theme:group-focus-within:text-slate-900" />
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-white/40 light-theme:text-slate-900 light-theme:placeholder:text-slate-600"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <button 
            className="lg:hidden p-2 text-white/70 hover:text-white transition-all light-theme:text-slate-600 light-theme:hover:text-slate-900"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="w-5 h-5" />
          </button>

          <button 
            onClick={toggleLanguage}
            className="p-2 sm:p-2.5 rounded-xl bg-transparent sm:bg-white/5 border border-transparent sm:border-white/10 text-white/70 hover:text-white transition-all light-theme:bg-transparent light-theme:border-transparent sm:light-theme:border-slate-500 light-theme:hover:border-slate-800 light-theme:text-slate-700 light-theme:hover:text-slate-900 light-theme:hover:bg-transparent flex items-center gap-1"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <path
                  d="M12.913 17H20.087M12.913 17L11 21M12.913 17L15.7783 11.009C16.0092 10.5263 16.1246 10.2849 16.2826 10.2086C16.4199 10.1423 16.5801 10.1423 16.7174 10.2086C16.8754 10.2849 16.9908 10.5263 17.2217 11.009L20.087 17M20.087 17L22 21M2 5H8M8 5H11.5M8 5V3M11.5 5H14M11.5 5C11.0039 7.95729 9.85259 10.6362 8.16555 12.8844M10 14C9.38747 13.7248 8.76265 13.3421 8.16555 12.8844M8.16555 12.8844C6.81302 11.8478 5.60276 10.4266 5 9M8.16555 12.8844C6.56086 15.0229 4.47143 16.7718 2 18"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
              />
            </svg>
            <span className="text-[10px] font-bold uppercase">{language}</span>
          </button>

          <button 
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-xl bg-transparent sm:bg-white/5 border border-transparent sm:border-white/10 text-white/70 hover:text-white transition-all light-theme:bg-transparent light-theme:border-transparent sm:light-theme:border-slate-500 light-theme:hover:border-slate-800 light-theme:text-slate-700 light-theme:hover:text-slate-900 light-theme:hover:bg-transparent"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 sm:w-4.5 sm:h-4.5" /> : <Moon className="w-5 h-5 sm:w-4.5 sm:h-4.5" />}
          </button>

          <Link to="/auth?type=register" className="text-sm font-semibold text-white hover:text-[#FFD700] light-theme:hover:text-primary transition-colors light-theme:text-slate-900 whitespace-nowrap ml-2 sm:ml-4">Log in</Link>
          <button className="btn btn-primary hidden lg:inline-flex px-6 py-2.5 ml-2">{t('nav-consult')}</button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-bg-dark border-b border-white/5 overflow-hidden light-theme:bg-slate-50 light-theme:border-slate-300"
          >
            <ul className="flex flex-col p-6 gap-2">
              <li>
                <button 
                  onClick={() => setMobileSubmenu(mobileSubmenu === 'products' ? null : 'products')}
                  className="w-full flex items-center justify-between py-4 text-base font-semibold text-slate-400 hover:text-white light-theme:text-slate-600 light-theme:hover:text-slate-900 border-b border-white/5 light-theme:border-slate-100"
                >
                  {t('nav-products')}
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${mobileSubmenu === 'products' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {mobileSubmenu === 'products' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white/5 rounded-xl mt-2 light-theme:bg-slate-50"
                    >
                      <div className="p-2 grid grid-cols-1 gap-1">
                        <MobileMenuItem icon={<Globe2 className="w-4 h-4" />} title="Web Development" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<ShoppingCart className="w-4 h-4" />} title="POS System" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<GraduationCap className="w-4 h-4" />} title="I-School" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<Users2 className="w-4 h-4" />} title="Absensi Digital" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<Moon className="w-4 h-4" />} title="I-Santri" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<ShieldCheck className="w-4 h-4" />} title="Enterprise Software" onClick={() => setIsMenuOpen(false)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>


              <li><a href="#portfolio" onClick={() => setIsMenuOpen(false)} className="block py-4 text-base font-semibold text-slate-400 hover:text-white light-theme:text-slate-600 light-theme:hover:text-slate-900 border-b border-white/5 light-theme:border-slate-100">{t('nav-portfolio')}</a></li>
              
              <li>
                <button 
                  onClick={() => setMobileSubmenu(mobileSubmenu === 'company' ? null : 'company')}
                  className="w-full flex items-center justify-between py-4 text-base font-semibold text-slate-400 hover:text-white light-theme:text-slate-600 light-theme:hover:text-slate-900 border-b border-white/5 light-theme:border-slate-100"
                >
                  Company
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${mobileSubmenu === 'company' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {mobileSubmenu === 'company' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white/5 rounded-xl mt-2 light-theme:bg-slate-50"
                    >
                      <div className="p-2 grid grid-cols-1 gap-1">
                        <MobileMenuItem icon={<Info className="w-4 h-4" />} title="About Us" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<Briefcase className="w-4 h-4" />} title="Careers" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<MessageSquare className="w-4 h-4" />} title="Contact" onClick={() => setIsMenuOpen(false)} />
                        <MobileMenuItem icon={<HeartHandshake className="w-4 h-4" />} title="Partnership" onClick={() => setIsMenuOpen(false)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>

              <li className="mt-4 px-2">
                <button className="btn btn-primary w-full py-2.5 text-sm">{t('nav-consult')}</button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="lg:hidden absolute top-full left-0 w-full bg-bg-dark/95 backdrop-blur-md p-4 border-b border-white/10 z-[999] light-theme:bg-slate-50/95 light-theme:border-slate-300"
          >
            <div className="relative">
              <input 
                autoFocus
                type="text" 
                placeholder="Search products, solutions..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-12 text-white outline-none focus:border-primary transition-all light-theme:bg-slate-100 light-theme:border-slate-500 light-theme:text-slate-900 light-theme:focus:border-slate-800"
                value={searchQuery}
                onChange={handleSearch}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => {
  return (
    <a href="#products" className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-300 light-theme:hover:bg-slate-100 group/item">
      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 transition-all duration-300 light-theme:bg-slate-100 light-theme:text-slate-500 group-hover/item:text-[#FFD700] light-theme:group-hover/item:text-primary group-hover/item:bg-[#FFD700]/10 light-theme:group-hover/item:bg-primary/10`}>
        {icon}
      </div>
      <div className="pt-0.5">
        <div className="text-[13px] font-bold text-white group-hover/item:text-[#FFD700] transition-colors light-theme:text-slate-900 light-theme:group-hover/item:text-primary">{title}</div>
        <div className="text-[11px] text-slate-500 group-hover/item:text-slate-400 transition-colors leading-snug light-theme:text-slate-400">{desc}</div>
      </div>
    </a>
  );
};

const MobileMenuItem: React.FC<{ icon: React.ReactNode, title: string, onClick: () => void }> = ({ icon, title, onClick }) => (
  <a 
    href="#products" 
    onClick={onClick}
    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors light-theme:hover:bg-slate-200 group"
  >
    <div className="text-slate-500 group-hover:text-[#FFD700] light-theme:group-hover:text-primary transition-colors">
      {icon}
    </div>
    <span className="text-sm font-medium text-slate-400 group-hover:text-[#FFD700] light-theme:text-slate-600 light-theme:group-hover:text-primary transition-colors">{title}</span>
  </a>
);

export default Navbar;
