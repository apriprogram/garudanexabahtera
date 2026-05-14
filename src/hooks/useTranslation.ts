import { useStore } from '../store/useStore';

export const translations = {
  "nav-products": { id: "Produk", en: "Products" },
  "nav-portfolio": { id: "Portofolio", en: "Portfolio" },
  "nav-process": { id: "Proses", en: "Process" },
  "nav-pricing": { id: "Harga", en: "Pricing" },
  "nav-login": { id: "Masuk", en: "Log in" },
  "nav-consult": { id: "Konsultasi Gratis", en: "Free Consultation" },
  "hero-badge": { id: "JASA PEMBUATAN WEBSITE & APLIKASI", en: "WEBSITE & APP DEVELOPMENT SERVICES" },
  "hero-title": { id: "Memimpin dengan visi, bergerak dengan tujuan.", en: "Leading With Vision, Moving With Purpose" },
  "hero-subtitle": { id: "Kami tidak hanya membuat aplikasi dan website. Kami membangun sistem digital yang membantu bisnis dan institusi Anda berkembang lebih cepat, lebih efisien, dan lebih profesional.", en: "We don't just build apps and websites. We build digital systems that help your business and institution grow faster, more efficiently, and more professionally." },
  "hero-btn-products": { id: "Lihat Produk Kami", en: "View Our Products" },
  "hero-btn-contact": { id: "Hubungi Kami", en: "Contact Us" },
  // ... adding more as I build components
} as const;

export type TranslationKey = keyof typeof translations;

export const useTranslation = () => {
  const { language } = useStore();
  
  const t = (key: TranslationKey) => {
    return translations[key]?.[language] || key;
  };
  
  return { t, language };
};
