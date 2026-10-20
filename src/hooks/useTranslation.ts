import { useStore } from '../store/useStore';

export const translations = {
  "nav-process": { id: "Proses", en: "Process" },
  "nav-templates": { id: "Template", en: "Templates" },
  "nav-projects": { id: "Projects", en: "Projects" },
  "nav-faq": { id: "FAQ", en: "FAQ" },
  "nav-home": { id: "Beranda", en: "Home" },
  "nav-contact": { id: "Kontak", en: "Contact" },
  "nav-login": { id: "Masuk", en: "Log in" },
  "nav-account": { id: "Akun Saya", en: "My Account" },
  "nav-admin": { id: "Panel Admin", en: "Admin Panel" },
  "nav-consult": { id: "Konsultasi Gratis", en: "Free Consultation" },
  "nav-consult-short": { id: "Konsultasi", en: "Consult" },

  // Hero: toggle mode (label pendek dipakai di layar sempit)
  "home-hero-mode-template": { id: "Template siap pakai", en: "Ready-made templates" },
  "home-hero-mode-template-short": { id: "Template", en: "Templates" },
  "home-hero-mode-custom": { id: "Website & Aplikasi Custom", en: "Custom Website & App" },
  "home-hero-mode-custom-short": { id: "Custom", en: "Custom" },

  // Hero mode Template
  "home-hero-template-lead": { id: "Website profesional,", en: "A professional website," },
  "home-hero-template-accent": { id: "siap online tanpa ribet.", en: "live without the hassle." },
  "home-hero-template-point-1": { id: "Pilih desain siap pakai, lihat demonya dulu", en: "Pick a ready-made design, try the demo first" },
  "home-hero-template-point-2": { id: "Harga jelas, bayar aman lewat Midtrans", en: "Clear pricing, secure payment via Midtrans" },
  "home-hero-template-point-3": { id: "Domain kami urus, isi Anda kelola lewat CMS", en: "We set up the domain, you manage content in the CMS" },
  "home-hero-btn-templates": { id: "Pilih Template", en: "Choose a Template" },
  "home-hero-demo": { id: "Lihat demo", en: "See the demo" },

  // Hero mode Custom
  "home-hero-custom-lead": { id: "Website & aplikasi mobile,", en: "Websites & mobile apps," },
  "home-hero-custom-accent": { id: "dibuat khusus untuk Anda.", en: "built just for you." },
  "home-hero-custom-point-1": { id: "Website atau aplikasi Android/iOS sesuai alur bisnis Anda", en: "A website or Android/iOS app shaped around your business" },
  "home-hero-custom-point-2": { id: "Konsultasi gratis, penawaran jelas sebelum mulai", en: "Free consultation and a clear proposal before we start" },
  "home-hero-custom-point-3": { id: "Didampingi dari desain sampai rilis", en: "Guided from design all the way to launch" },
  "home-hero-btn-custom": { id: "Pesan Website / Aplikasi Mobile Custom", en: "Order a Custom Website / Mobile App" },
} as const;

export type TranslationKey = keyof typeof translations;

export const useTranslation = () => {
  const { language } = useStore();

  const t = (key: TranslationKey) => {
    return translations[key]?.[language] || key;
  };

  return { t, language };
};
