import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import LogoTicker from './components/sections/LogoTicker';
import Products from './components/sections/Products';
import Portfolio from './components/sections/Portfolio';
import Pricing from './components/sections/Pricing';
import Process from './components/sections/Process';
import FAQ from './components/sections/FAQ';
import { useStore } from './store/useStore';
import { ArrowUp, Search, X } from 'lucide-react';

import { Routes, Route, useLocation } from 'react-router-dom';
import Auth from './pages/Auth';
import AdminLayout from './pages/admin/Layout';
import Dashboard from './pages/admin/Dashboard';
import HeroSettings from './pages/admin/HeroSettings';
import ServicesManager from './pages/admin/ServicesManager';
import ProductManager from './pages/admin/ProductManager';
import UserManager from './pages/admin/UserManager';
import SiteSettings from './pages/admin/SiteSettings';
import ProfileSettings from './pages/admin/ProfileSettings';
import HelpCenter from './pages/admin/HelpCenter';
import Documents from './pages/admin/Documents';
import Changelog from './pages/admin/Changelog';
import ProductsIndex from './pages/admin/products';

function App() {
  const { theme, isSearchActive, toggleSearch } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    // Only track visit once per session
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (!hasVisited) {
      sessionStorage.setItem('hasVisited', 'true'); // Set immediately to prevent double fetch in StrictMode
      const apiUrl = '/api.php';
      fetch(`${apiUrl}?action=track_visit`)
        .catch(err => {
          console.error('Error tracking visit:', err);
        });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [whatsapp, setWhatsapp] = useState('6285188009152');

  useEffect(() => {
    const fetchWhatsApp = async () => {
      try {
        const apiUrl = '/api.php';
        const response = await fetch(`${apiUrl}?action=get_settings`);
        const data = await response.json();
        if (data.footer_whatsapp) {
          setWhatsapp(data.footer_whatsapp.replace(/\D/g, ''));
        }
      } catch (e) {
        console.error('Error fetching dynamic WhatsApp widget number:', e);
      }
    };
    fetchWhatsApp();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-bg-dark text-white' : 'bg-white text-slate-900'}`}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <>
            <Navbar />
            {/* Mobile Search Bar - pushes content down */} 
            <AnimatePresence>
              {isSearchActive && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden fixed top-[72px] left-0 w-full z-[999] bg-bg-dark/60 backdrop-blur-xl border-b border-white/5 light-theme:bg-slate-50/80 light-theme:border-slate-300 overflow-hidden"
                >
                  <div className="px-4 py-3 flex items-center gap-3">
                    <Search className="w-4 h-4 text-white/50 shrink-0 light-theme:text-slate-500" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search products, solutions..." 
                      className="flex-1 bg-transparent border-none text-white text-sm outline-none placeholder:text-white/40 light-theme:text-slate-900 light-theme:placeholder:text-slate-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        toggleSearch(false);
                        setSearchQuery('');
                      }}
                      className="p-1 shrink-0 text-white/50 hover:text-white light-theme:text-slate-500 light-theme:hover:text-slate-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <main>
              <header className="relative">
                <Hero />
                <LogoTicker />
              </header>
              <Products />
              <Portfolio />
              <Pricing />
              <Process />
              <FAQ />
            </main>
            <Footer />
          </>
        } />
        
        <Route path="/login" element={<Auth />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="hero" element={<HeroSettings settings={{}} heroImages={[]} setHeroImages={() => {}} heroLogos={[]} setHeroLogos={() => {}} />} />
          <Route path="services" element={<ServicesManager />} />
          <Route path="products" element={<ProductsIndex />} />
          <Route path="products/:productId" element={<ProductsIndex />} />
          <Route path="product-manager" element={<ProductManager />} />
          <Route path="documents" element={<Documents />} />
          <Route path="changelog" element={<Changelog />} />
          <Route path="users" element={<UserManager />} />
          <Route path="settings" element={<SiteSettings />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="help" element={<HelpCenter />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Auth />} />
      </Routes>
      
      {/* Floating Widgets */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[100] flex items-center gap-3">
        {/* Scroll To Top */}
        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="bg-white/10 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-300 group light-theme:bg-slate-200 light-theme:border-slate-300 light-theme:text-slate-900"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Floating WhatsApp Widget */}
        {!location.pathname.startsWith('/admin') && (
          <a 
            href={`https://wa.me/${whatsapp}?text=Halo%20Admin%2C%20saya%20tertarik%20untuk%20membeli%20produk%20atau%20memesan%20jasa%20digital%20Anda.`}
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#25D366] p-3 sm:p-4 rounded-full shadow-lg hover:scale-110 transition-transform group flex items-center justify-center"
          >
            <div className="absolute bottom-full mb-4 right-0 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none">
              Chat Sekarang
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.123.554 4.197 1.604 6.013l-1.706 6.233 6.376-1.673a11.77 11.77 0 005.772 1.515h.005c6.634 0 12.032-5.396 12.035-12.032a11.75 11.75 0 00-3.486-8.508" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
