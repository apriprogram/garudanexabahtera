import React from 'react';
import { Phone, Globe, Instagram, MessageCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

const Footer: React.FC = () => {
  const { language, setLanguage } = useStore();

  const toggleLanguage = () => {
    const newLang = language === 'id' ? 'en' : 'id';
    setLanguage(newLang);
    
    // Google Translate cookie-based logic
    const gtValue = `/id/${newLang}`;
    document.cookie = `googtrans=${gtValue}; path=/`;
    document.cookie = `googtrans=${gtValue}; path=/; domain=${window.location.hostname}`;
    
    // Reload to apply translation
    window.location.reload();
  };

  return (
    <footer className="bg-bg-dark border-t border-white/5 pt-12 lg:pt-20 pb-10 light-theme:bg-slate-50 light-theme:border-slate-200 transition-colors duration-500">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* CTA Section */}
        <div className="text-center mb-20 sm:mb-32 px-4">
          <h2 className="text-lg sm:text-5xl lg:text-6xl font-bold text-[#FFD700] leading-[1.1] mb-6 sm:mb-12 tracking-tight transition-all duration-500 hover:drop-shadow-[0_0_20px_rgba(255,215,0,0.6)] cursor-default">
            Siap Membangun Sistem Digital?<br />Konsultasikan Sekarang Juga!
          </h2>
          <div className="flex flex-col items-center gap-6">
            <a 
              href="https://wa.me/6285188009152?text=Halo%20Admin%2C%20saya%20tertarik%20untuk%20membeli%20produk%20atau%20memesan%20jasa%20digital%20Anda." 
              target="_blank" 
              className="btn btn-primary px-5 py-2.5 sm:px-10 sm:py-4 text-sm sm:text-lg flex items-center gap-3 shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] transition-all duration-300 active:scale-95"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
              Hubungi WhatsApp
            </a>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-slate-400 text-xs sm:text-sm px-6 py-3 rounded-2xl bg-white/5 border border-white/5 light-theme:bg-slate-100 light-theme:border-slate-200">
              <div className="flex items-center gap-2 text-white/80 light-theme:text-slate-700">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-bold tracking-wider">085188009152</span>
              </div>
              <span className="hidden sm:inline text-white/20">—</span>
              <span className="text-center font-medium">Konsultasi <span className="text-[#FFD700] light-theme:text-primary font-bold">GRATIS</span></span>
            </div>
          </div>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/assets/logo/logogarudanexa.png" alt="Logo" className="h-10 w-auto brightness-0 invert light-theme:brightness-100 light-theme:invert-0" />
              <div className="font-semibold text-xl text-white light-theme:text-slate-900 leading-tight">PT. Garuda Nexa Bahtera</div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 light-theme:text-slate-600">
              Mitra terpercaya untuk inovasi digital bisnis Anda. Membantu dari ide hingga menjadi produk siap rilis.
            </p>
            <button 
              onClick={toggleLanguage}
              className="btn btn-secondary px-4 py-2 text-xs flex items-center gap-2"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'id' ? 'English' : 'Bahasa Indonesia'}
            </button>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 light-theme:text-slate-900">Produk</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Jasa Pembuatan Website</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Aplikasi I-Santri</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Aplikasi I-School</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Aplikasi Kasir (POS)</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Aplikasi Absensi</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 light-theme:text-slate-900">Mulai</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Konsultasi Gratis</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Portofolio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricelist</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Proses Kerja</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 light-theme:text-slate-900">Perusahaan</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tim Kami</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 light-theme:text-slate-900">Hubungi Kami</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="flex items-center gap-2 hover:text-white transition-colors"><Instagram className="w-4 h-4" /> Instagram</a></li>
              <li><a href="#" className="flex items-center gap-2 hover:text-white transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 text-center text-slate-500 text-xs">
          &copy; 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
