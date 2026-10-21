import React, { useEffect, useState } from 'react';

interface FloatingWhatsAppProps {
  href: string;
  /**
   * id elemen (mis. hero `beranda`) yang tidak boleh tertutup: di HP tombol disembunyikan selama elemen ini terlihat.
   */
  hideOverId?: string;
}

/** Jarak gulir minimal (px) sebelum arah gulir dianggap berubah, agar tombol tidak berkedip karena getaran jari. */
const SCROLL_SLOP = 8;

/**
 * Tombol WhatsApp melayang (48px HP, 56px desktop, aman dari notch/home bar). Lapisan melayang → shadow-float.
 * Di HP (< 640px) tombol tidak boleh menutupi konten (mobile-responsive §8): disembunyikan selama `hideOverId`
 * terlihat dan saat menggulir ke bawah, lalu muncul lagi saat menggulir ke atas. Desktop: selalu tampil.
 */
export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ href, hideOverId }) => {
  // Mulai tersembunyi bila ada elemen yang dijaga (hero di layar pertama), agar tombol tidak sempat berkedip di HP
  const [hidden, setHidden] = useState(Boolean(hideOverId));

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

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < SCROLL_SLOP) return;
      scrollingDown = y > lastY;
      lastY = y;
      update();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [hideOverId]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp"
      className={`group fixed bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-[background-color,translate,opacity,visibility] duration-300 ease-calm hover:bg-whatsapp-hover motion-reduce:transition-colors sm:bottom-8 sm:right-8 sm:h-14 sm:w-14 ${
        hidden ? 'max-sm:invisible max-sm:translate-y-24 max-sm:opacity-0' : ''
      }`}
    >
      <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold text-fg opacity-0 shadow-float ring-1 ring-inset ring-line transition-opacity group-hover:opacity-100 sm:block">
        Chat sekarang
      </span>
      <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.123.554 4.197 1.604 6.013l-1.706 6.233 6.376-1.673a11.77 11.77 0 005.772 1.515h.005c6.634 0 12.032-5.396 12.035-12.032a11.75 11.75 0 00-3.486-8.508" />
      </svg>
    </a>
  );
};

export default FloatingWhatsApp;
