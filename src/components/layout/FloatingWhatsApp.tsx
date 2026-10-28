import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { NexaChat } from './nexa/NexaChat';

interface FloatingWhatsAppProps {
  href: string;
  /** Tombol "ke atas" kaca buram di atas maskot, tampil setelah menggulir (beranda, pemilik 2026-10-24). */
  backToTop?: boolean;
  /** Chat Nexa (saklar admin nexa_enabled). Mati: hanya tombol "ke atas" yang tersisa (bila ada). */
  chat?: boolean;
  /**
   * Bar pesan bawah /template/:slug sedang tampil (HP/tablet, < lg; tinggi ±87–91px + home bar): dok naik 5.5rem
   * bersama bar agar maskot tidak menutupi tombol "Pesan", panel chat ikut naik.
   */
  aboveOrderBar?: boolean;
}

/** Jarak gulir (px) sebelum tombol "ke atas" tampil. */
const TOP_AFTER = 480;

/**
 * Tombol melayang kanan bawah: maskot Nexa (nexa/NexaChat; 48px HP, 56px desktop, aman dari notch/home bar). Tombol
 * WhatsApp melayang dihapus (pemilik 2026-10-24): jalur WhatsApp kini lewat jawaban Nexa, footer, dan halaman kontak;
 * `href`-nya tetap dipakai chat. Dok selalu tampil di semua ukuran layar (pemilik 2026-10-24; logika sembunyi di HP
 * saat hero terlihat / menggulir ke bawah dihapus).
 */
export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ href, backToTop = false, chat = true, aboveOrderBar = false }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const changeChatOpen = useCallback((next: boolean) => setChatOpen(next), []);

  useEffect(() => {
    if (!backToTop) return undefined;
    // Posisi awal (halaman dibuka sudah tergulir, mis. reload): dihitung di frame berikutnya, bukan saat render
    const raf = requestAnimationFrame(() => setShowTop(window.scrollY > TOP_AFTER));
    const onScroll = () => setShowTop(window.scrollY > TOP_AFTER);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [backToTop]);

  const scrollToTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div
      // Naik/turun seirama bar pesan (translate 300 ms, sama dengan bar di TemplateDetail)
      className={`fixed bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] z-40 flex flex-col items-center gap-3 transition-[translate] duration-300 ease-calm motion-reduce:transition-none sm:bottom-8 sm:right-8 ${
        aboveOrderBar ? 'max-lg:-translate-y-[5.5rem]' : ''
      }`}
    >
      {/* Ke atas: kaca cair (gradasi putih tembus + blur latar), tampil setelah menggulir; tidak saat chat terbuka */}
      {backToTop && showTop && !chatOpen && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Kembali ke atas"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-b from-white/80 to-white/45 text-fg shadow-float ring-1 ring-inset ring-white/60 backdrop-blur-xl transition-[opacity,translate,background-color] duration-300 ease-calm starting:translate-y-2 starting:opacity-0 hover:from-white/90 hover:to-white/60 motion-reduce:transition-none sm:h-12 sm:w-12"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      )}
      {chat && <NexaChat whatsappHref={href} open={chatOpen} onOpenChange={changeChatOpen} aboveOrderBar={aboveOrderBar} />}
    </div>
  );
};

export default FloatingWhatsApp;
