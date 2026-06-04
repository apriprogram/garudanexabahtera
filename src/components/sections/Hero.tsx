import React, { useState, useEffect } from 'react';
import { } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { Reveal } from '../ui/Reveal';

const Hero: React.FC = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [settings, setSettings] = useState<any>({});
  const [slides, setSlides] = useState<string[]>([
    '/assets/bg/hero.png',
    '/assets/bg/hero1.png',
    '/assets/bg/hero2.png',
  ]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const apiUrl = '/api.php';
        const response = await fetch(`${apiUrl}?action=get_settings`);
        const data = await response.json();
        setSettings(data);
        if (data.hero_images) {
          const parsedImages = JSON.parse(data.hero_images);
          if (parsedImages.length > 0) {
            setSlides(parsedImages);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides]);
  
  return (
    <section className="relative min-h-[70vh] lg:min-h-screen flex items-center pt-32 pb-20 lg:py-0 lg:pt-20 overflow-hidden bg-[#050510]">
      {/* Background Layer - Always Dark for Premium Look */}
      <div className="absolute inset-0 overflow-hidden">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out scale-110 animate-hero-zoom ${index === currentSlide ? 'opacity-60' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${slide})` }}
          />
        ))}
        
        {/* Dark Gradient Overlay - Applied in both modes for consistent Hero premium feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050510]/80 to-[#050510] z-[1]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-[2]" 
             style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-[1280px] mx-auto px-8 w-full relative z-10">
        <div className="max-w-4xl">
          <Reveal>
            <img 
              src="/assets/logo/logogarudanexa.png" 
              alt="Garuda Nexa" 
              className="h-12 w-auto md:hidden brightness-0 invert light-theme:brightness-100 light-theme:invert-0 mb-6" 
            />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFD700] animate-pulse shadow-[0_0_10px_#FFD700]" />
              <span className="text-[8px] sm:text-xs font-semibold text-white uppercase tracking-[2px] pt-[1px]">
                {settings.hero_badge || t('hero-badge')}
              </span>
            </div>
          </Reveal>
          
          <Reveal delay={0.3}>
            <h1 className="text-2xl sm:text-3xl lg:text-7xl font-semibold leading-[1.05] tracking-tight text-white mb-6">
              {settings.hero_title || t('hero-title')}
            </h1>
          </Reveal>
 
          <Reveal delay={0.4}>
            <p className="text-sm sm:text-base text-slate-300 mb-8 sm:mb-10 leading-relaxed max-w-2xl">
              {settings.hero_subtitle || t('hero-subtitle')}
            </p>
          </Reveal>
          
          <Reveal delay={0.7}>
            <div className="flex gap-3 sm:gap-4">
              <button className="btn btn-primary px-4 py-2.5 sm:px-6 sm:py-4 text-xs sm:text-base font-semibold">
                {settings.hero_primary_btn || t('hero-btn-products')}
              </button>
              <button className="btn btn-secondary px-4 py-2.5 sm:px-6 sm:py-4 text-xs sm:text-base font-semibold glass-btn flex items-center group">
                {settings.hero_secondary_btn || t('hero-btn-contact')}
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2 transition-transform group-hover:translate-x-1">
                  <path
                      d="M4 12H20M20 12L14 6M20 12L14 18"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Floating Glows */}
      <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full animate-floating-glow z-[2] pointer-events-none opacity-50" />
    </section>
  );
};

export default Hero;
