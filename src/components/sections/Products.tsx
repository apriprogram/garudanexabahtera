import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Reveal } from '../ui/Reveal';

const Products: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCategoryChange = (id: string) => {
    setActiveCategory(id);
    setCurrentIndex(0);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredProducts.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length);
  };

  const defaultCategories = [
    { id: 'all', label: 'Semua' },
    { id: 'website', label: 'Website' },
    { id: 'santri', label: 'I-Santri' },
    { id: 'school', label: 'I-School' },
    { id: 'pos', label: 'POS' },
    { id: 'absensi', label: 'Absensi' },
    { id: 'invitation', label: 'Undangan Digital' },
  ];

  const defaultProducts = [
    {
      id: 'website',
      category: 'website',
      badge: 'Jasa Pembuatan Website',
      title: 'Profil Perusahaan & Web Kustom',
      description: 'Website sekolah/instansi, Landing Page Produk, dan Website Custom System.',
      image: '/assets/portofolio/portfolio1.png'
    },
    {
      id: 'santri',
      category: 'santri',
      logo: '/assets/logo/logoisantri.png',
      badge: 'Aplikasi I-Santri',
      title: 'Manajemen Pesantren Modern',
      description: 'Manajemen pesantren yang lebih terstruktur dan modern dengan sistem digital terintegrasi.',
      image: '/assets/product/isantri.png'
    },
    {
      id: 'school',
      category: 'school',
      logo: '/assets/logo/logoischool.png',
      badge: 'Aplikasi I-School',
      title: 'Digitalisasi Ekosistem Sekolah',
      description: 'Manajemen sekolah berbasis digital tingkat lanjut untuk efisiensi administrasi dan akademik.',
      image: '/assets/product/ischool.png'
    },
    {
      id: 'pos',
      category: 'pos',
      badge: 'Aplikasi Kasir',
      title: 'Sistem POS Cerdas untuk UMKM',
      description: 'Sistem Point of Sale (POS) yang memudahkan transaksi dan manajemen stok untuk UMKM & retail.',
      image: '/assets/product/pos.png'
    },
    {
      id: 'absensi',
      category: 'absensi',
      badge: 'Aplikasi Absensi',
      title: 'Kehadiran Digital Real-time',
      description: 'Sistem absensi digital berbasis web dan mobile dengan verifikasi yang akurat and aman.',
      image: '/assets/product/absensi.png'
    },
    {
      id: 'invitation',
      category: 'invitation',
      logo: '/assets/logo/logowedding.png',
      badge: 'Undangan Digital Premium',
      title: 'Undangan Digital Interaktif',
      description: 'Solusi undangan pernikahan dan acara spesial dalam bentuk website modern yang elegan dan mudah dibagikan.',
      image: '/assets/product/undangan_digital.png'
    }
  ];

  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [products, setProducts] = useState<any[]>(defaultProducts);

  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const apiUrl = '/api.php';
        const response = await fetch(`${apiUrl}?action=get_settings`);
        const data = await response.json();
        if (data.products_categories) {
          setCategories(JSON.parse(data.products_categories));
        }
        if (data.products_data) {
          setProducts(JSON.parse(data.products_data));
        }
      } catch (e) {
        console.error('Error fetching dynamic products:', e);
      }
    };
    fetchDynamicData();
  }, []);

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <section id="products" className="py-12 lg:py-32 bg-[#030329] relative overflow-hidden light-theme:bg-white transition-colors duration-500">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent light-theme:via-slate-200" />
      
      {/* Background Ellipse Glows */}
      <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-sky-500/20 blur-[100px] md:blur-[150px] rounded-full pointer-events-none light-theme:bg-sky-400/5" />
      <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-sky-500/20 blur-[100px] md:blur-[150px] rounded-full pointer-events-none light-theme:bg-sky-400/5" />

      <div className="max-w-[1280px] mx-auto px-6 relative z-10">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-4xl font-semibold text-white mb-2 light-theme:text-slate-900">Solusi Produk Kami</h2>
            <p className="text-xs md:text-lg text-slate-400 light-theme:text-slate-600">Solusi Digital untuk Bisnis & Institusi Modern</p>
          </div>
        </Reveal>

        {(() => {
          const tabContent = (
            <div className="flex justify-center gap-1.5 mb-6 md:mb-10 flex-wrap px-4 md:px-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`relative px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[11px] md:text-sm font-semibold transition-colors duration-300 border ${
                    activeCategory === cat.id 
                    ? 'text-black border-transparent light-theme:text-white' 
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10 light-theme:bg-slate-100 light-theme:text-slate-600 light-theme:border-slate-200 light-theme:hover:bg-slate-200 light-theme:hover:text-slate-900'
                  }`}
                >
                  {activeCategory === cat.id && (
                    <motion.div
                      layoutId="activeCategoryTab"
                      className="absolute -inset-px bg-white border border-white light-theme:bg-primary light-theme:border-primary rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              ))}
            </div>
          );
          
          return isMobile ? tabContent : <Reveal delay={0.3} overflowVisible>{tabContent}</Reveal>;
        })()}

        <div className="relative max-w-[1400px] mx-auto">
          {/* External Navigation Arrows - Positioned outside the overflow-hidden container */}
          {filteredProducts.length > 1 && (
            <>
              <button 
                onClick={prevSlide}
                className="absolute left-0 lg:-left-16 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-white/5 hover:bg-primary text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-30 hidden md:flex items-center justify-center active:scale-95 shadow-lg light-theme:bg-slate-100 light-theme:border-slate-200 light-theme:text-slate-600 light-theme:hover:bg-primary light-theme:hover:text-white"
                aria-label="Previous product"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button 
                onClick={nextSlide}
                className="absolute right-0 lg:-right-16 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-white/5 hover:bg-primary text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-30 hidden md:flex items-center justify-center active:scale-95 shadow-lg light-theme:bg-slate-100 light-theme:border-slate-200 light-theme:text-slate-600 light-theme:hover:bg-primary light-theme:hover:text-white"
                aria-label="Next product"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          <div className="relative overflow-hidden -mx-6 px-6 py-4">
            <div className="flex justify-center items-center overflow-visible">
              <motion.div 
                className="flex gap-4 md:gap-8 items-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -1000 || offset.x < -50) {
                    nextSlide();
                  } else if (swipe > 1000 || offset.x > 50) {
                    prevSlide();
                  }
                }}
                animate={{ 
                  x: `calc(${isMobile ? 7.5 : 10}% - ${currentIndex * (isMobile ? 85 : 80)}% - ${currentIndex * (isMobile ? 16 : 32)}px)` 
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                style={{ width: '100%', cursor: 'grab' }}
                whileTap={{ cursor: 'grabbing' }}
              >
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className="w-[85%] md:w-[80%] shrink-0 relative"
                    animate={{ 
                      scale: index === currentIndex ? 1 : 0.9,
                      opacity: index === currentIndex ? 1 : 0.4
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="relative aspect-[16/14] md:aspect-[16/10] rounded-2xl md:rounded-3xl overflow-hidden group/card border border-white/5 shadow-2xl">
                      {/* Image Background */}
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105" 
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

                      {/* Content Overlaid */}
                      <div className="absolute inset-0 p-5 md:p-12 flex flex-col justify-end items-start text-left pointer-events-none">
                        {product.logo && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-3 md:mb-4"
                          >
                            <img src={product.logo} alt={`${product.title} logo`} className="h-6 md:h-14 w-auto object-contain brightness-0 invert" />
                          </motion.div>
                        )}
                        <div className="inline-block text-[9px] md:text-xs font-bold text-white/90 uppercase px-2 py-1 md:px-3 md:py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-2 md:mb-3">
                          {product.badge}
                        </div>
                        <h3 className="text-lg md:text-5xl font-bold text-white mb-2 md:mb-3 max-w-[600px] leading-tight">
                          {product.title}
                        </h3>
                        <p className="text-[10px] md:text-lg text-slate-300 max-w-[500px] leading-relaxed mb-4 md:mb-6 line-clamp-2 md:line-clamp-none">
                          {product.description}
                        </p>
                        
                        <a 
                          href={product.buttonLink || `https://wa.me/6285188009152?text=Halo%20Admin%2C%20saya%20tertarik%20dengan%20produk%20${encodeURIComponent(product.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/btn pointer-events-auto bg-white hover:bg-slate-100 text-black px-4 py-2 md:px-6 md:py-3 rounded-full transition-all duration-300 flex items-center gap-1.5 md:gap-2 font-bold text-[10px] md:text-sm shadow-xl select-none"
                        >
                          {product.buttonText || 'Pesan Sekarang'}
                          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover/btn:translate-x-1" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Bottom Navigation (Mobile Arrows + Dots) */}
          {filteredProducts.length > 1 && (
            <div className="flex justify-center items-center gap-6 md:gap-3 mt-6 md:mt-10">
              {/* Mobile Prev Arrow */}
              <button 
                onClick={prevSlide}
                className="md:hidden p-3 bg-white/5 hover:bg-primary text-white rounded-full border border-white/10 transition-all active:scale-95 flex items-center justify-center shadow-lg light-theme:bg-slate-100 light-theme:border-slate-200 light-theme:text-slate-600 light-theme:hover:bg-primary light-theme:hover:text-white"
                aria-label="Previous product"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Dots */}
              <div className="flex justify-center gap-2.5">
                {filteredProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-1.5 transition-all duration-500 rounded-full ${index === currentIndex ? 'bg-primary w-8' : 'bg-white/20 hover:bg-white/40 w-4 light-theme:bg-slate-300 light-theme:hover:bg-slate-400'}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Mobile Next Arrow */}
              <button 
                onClick={nextSlide}
                className="md:hidden p-3 bg-white/5 hover:bg-primary text-white rounded-full border border-white/10 transition-all active:scale-95 flex items-center justify-center shadow-lg light-theme:bg-slate-100 light-theme:border-slate-200 light-theme:text-slate-600 light-theme:hover:bg-primary light-theme:hover:text-white"
                aria-label="Next product"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Products;
