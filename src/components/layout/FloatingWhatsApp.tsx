import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { NexaChat } from './nexa/NexaChat';

interface FloatingWhatsAppProps {
  href: string;
  /**
   * id elemen (mis. hero `beranda`) yang tidak boleh tertutup: di HP tombol disembunyikan selama elemen ini terlihat.
   */
  hideOverId?: string;
  /** Tombol "ke atas" kaca buram di atas maskot, tampil setelah menggulir (beranda, pemilik 2026-10-24). */
  backToTop?: boolean;
}

/** Jarak gulir (px) sebelum tombol "ke atas" tampil. */
const TOP_AFTER = 480;

/** Jarak gulir minimal (px) sebelum arah gulir dianggap berubah, agar tombol tidak berkedip karena getaran jari. */
const SCROLL_SLOP = 8;

/**
 * Tombol melayang kanan bawah: maskot Nexa (nexa/NexaChat; 48px HP, 56px desktop, aman dari notch/home bar). Tombol
 * WhatsApp melayang dihapus (pemilik 2026-10-24): jalur WhatsApp kini lewat jawaban Nexa, footer, dan halaman kontak;
 * `href`-nya tetap dipakai chat. Di HP (< 640px) tombol tidak boleh menutupi konten (mobile-responsive §8): disembunyikan
 * selama `hideOverId` terlihat dan saat menggulir ke bawah, lalu muncul lagi saat menggulir ke atas; tidak pernah selama
 * chat Nexa terbuka. Desktop: selalu tampil.
 */
export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ href, hideOverId, backToTop = false }) => {
  // Mulai tersembunyi bila ada elemen yang dijaga (hero di layar pertama), agar tombol tidak sempat berkedip di HP
  const [hidden, setHidden] = useState(Boolean(hideOverId));
  const [chatOpen, setChatOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  // Menutup chat mengembalikan fokus ke tombol Nexa: dok harus terlihat saat itu (di HP bisa saja sudah "tersembunyi"
  // karena menggulir selama chat terbuka); gulir berikutnya menghitung ulang.
  const changeChatOpen = useCallback((next: boolean) => {
    setChatOpen(next);
    if (!next) setHidden(false);
  }, []);

  useEffect(() => {
    let overVisible = false;
    let scrollingDown = false;
    let lastY = window.scrollY;
    const update = () => setHidden(overVisible || scrollingDown);

    const target = hideOverId ? document.getElementById(hideOverId) : null;
    const io =
      target && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            overVisible = Boolean(entry?.isIntersecting);
            update();
          })
        : null;
    // IntersectionObserver selalu memanggil callback sekali setelah observe, jadi status awal ikut terhitung
    if (io && target) io.observe(target);

    // Posisi awal (halaman dibuka sudah tergulir, mis. reload): dihitung di frame berikutnya, bukan saat render
    const raf = backToTop ? requestAnimationFrame(() => setShowTop(window.scrollY > TOP_AFTER)) : 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (backToTop) setShowTop(y > TOP_AFTER);
      if (Math.abs(y - lastY) < SCROLL_SLOP) return;
      scrollingDown = y > lastY;
      lastY = y;
      update();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [hideOverId, backToTop]);

  const scrollToTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div
      className={`fixed bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] z-40 flex flex-col items-center gap-3 transition-[translate,opacity,visibility] duration-300 ease-calm motion-reduce:transition-none sm:bottom-8 sm:right-8 ${
        hidden && !chatOpen ? 'max-sm:invisible max-sm:translate-y-24 max-sm:opacity-0' : ''
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
      <NexaChat whatsappHref={href} open={chatOpen} onOpenChange={changeChatOpen} />
    </div>
  );
};

export default FloatingWhatsApp;
