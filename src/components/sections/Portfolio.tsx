import React from 'react';
import { Reveal } from '../ui/Reveal';
import { motion } from 'framer-motion';

const Portfolio: React.FC = () => {
  const portfolioItems = [
    {
      title: "Web App Dashboard",
      desc: "SAAS / FINANCE",
      image: "/assets/portfolio/portfolio1.png",
      span: "md:col-span-4"
    },
    {
      title: "Mobile POS App",
      desc: "RETAIL / ANDROID",
      image: "/assets/portfolio/portfolio2.png",
      span: "md:col-span-4"
    },
    {
      title: "E-Commerce System",
      desc: "SHOPPING / WEB",
      image: "/assets/products/ischool.png",
      span: "md:col-span-4"
    },
    {
      title: "Corporate Website",
      desc: "BRANDING / MODERN",
      image: "/assets/products/isantri.png",
      span: "md:col-span-7"
    },
    {
      title: "Sistem Informasi Desa",
      desc: "GOVERNMENT / WEB",
      image: "/assets/products/pos.png",
      span: "md:col-span-5"
    }
  ];

  return (
    <section id="portfolio" className="py-12 lg:py-32 bg-[#0a0a0b] light-theme:bg-white relative overflow-hidden transition-colors duration-500">
      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <Reveal>
          <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-6">
            <div className="text-left">
              <h2 className="text-xl md:text-3xl font-semibold text-white mb-2 light-theme:text-slate-900">Portofolio</h2>
              <p className="text-sm md:text-base text-slate-400 light-theme:text-slate-600">Karya Terbaik Kami untuk Kesuksesan Digital Anda</p>
            </div>
            <button className="group btn btn-secondary px-4 py-2 sm:px-6 sm:py-2 text-xs sm:text-sm light-theme:bg-slate-900 light-theme:text-white flex items-center gap-2">
              Lihat semua karya
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-1">
                <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {portfolioItems.map((item, index) => (
            <div key={index} className={`${item.span}`}>
              <Reveal delay={0.2 + (index * 0.1)} height="100%">
                <motion.div 
                  whileHover={{ scale: 0.98 }}
                  transition={{ duration: 0.5 }}
                  className="group relative h-[300px] rounded-[20px] overflow-hidden cursor-pointer bg-white/5 border border-white/10 light-theme:border-slate-200"
                >
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="text-xl font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-slate-400 text-xs font-medium tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-50 light-theme:opacity-0" />
    </section>
  );
};

export default Portfolio;
