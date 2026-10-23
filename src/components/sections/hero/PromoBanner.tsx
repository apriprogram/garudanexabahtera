import React, { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HUB_PATHS } from '../../../seo/paths';

/** Persen diskon pembelian pertama (= PF_FIRST_ORDER_DISCOUNT_PERCENT di backend/modules/templates.php). */
export const FIRST_ORDER_DISCOUNT_PERCENT = 20;
const DISMISS_KEY = 'gn-promo-first-order-closed';

const DISMISS_EVENT = 'gn-promo-dismiss';

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};
const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
};
// Server & hidrasi: belum pernah ditutup (banner tampil), lalu snapshot browser dibaca
const serverSnapshot = () => false;

/**
 * Banner promo di puncak hero (gaya Dribbble, permintaan pemilik 2026-10-23): diskon otomatis pembelian template
 * pertama, tanpa kode. Bisa ditutup (diingat di browser). Di HTML prerender selalu tampil; status "ditutup" dibaca lewat
 * useSyncExternalStore (snapshot server = tampil), jadi hidrasi cocok dengan HTML server. Datar: tanpa bayangan.
 */
export const PromoBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const closed = useSyncExternalStore(subscribe, readDismissed, serverSnapshot);
  const [closedNow, setClosedNow] = React.useState(false);

  if (closed || closedNow) return null;

  const close = () => {
    setClosedNow(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
      window.dispatchEvent(new Event(DISMISS_EVENT));
    } catch {
      // penyimpanan diblokir: banner tetap tertutup sampai halaman dimuat ulang
    }
  };

  return (
    <div
      role="region"
      aria-label="Promo pembelian pertama"
      className={`relative flex items-center justify-center gap-2 rounded-2xl bg-brand-50 px-11 py-2.5 text-center text-[13px] leading-snug text-fg ring-1 ring-inset ring-brand-100 sm:gap-3 sm:py-3 sm:text-[15px] ${className}`}
    >
      <span aria-hidden>🎁</span>
      <p className="min-w-0">
        Diskon <strong className="font-semibold">{FIRST_ORDER_DISCOUNT_PERCENT}%</strong> untuk pembelian template pertama Anda, otomatis
        tanpa kode <span aria-hidden>🎉</span>
      </p>
      <Link
        to={HUB_PATHS.catalog}
        className="hidden h-9 shrink-0 items-center rounded-full bg-surface px-4 text-[13px] font-semibold text-fg ring-1 ring-inset ring-line transition-colors hover:bg-alt sm:inline-flex sm:text-sm"
      >
        Pilih Template
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label="Tutup promo"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg sm:right-3"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
};
