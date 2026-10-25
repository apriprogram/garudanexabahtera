// Keranjang & lapisan melayang GlowStory. Keranjang hidup di memori halaman (tanpa server): barang ditambah dari kartu
// produk atau hasil kuis, lalu "Pesan lewat WhatsApp" mengirim daftar + subtotal ke nomor toko. Lapisan melayang
// (panel keranjang, foto ulasan, notifikasi "masuk keranjang") memakai wadah STICKY di atas root template, bukan
// `position: fixed`, agar tetap di dalam bingkai HP demo dan panel CMS (yang memakai CSS zoom).
import { ArrowRight, Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { useDialog } from './hooks';
import { cartAdd, cartCount, cartMessage, cartSetQty, cartTotal, formatRupiah, type CartLine, type GlowModel } from './model';
import { StoreContext, useStore, type Overlay, type Store } from './storeContext';
import { BTN, C, MONO, SERIF } from './styles';

const NOTICE_MS = 3200;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);

  const say = useCallback((text: string) => setNotice((prev) => ({ id: (prev?.id ?? 0) + 1, text })), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const store = useMemo<Store>(() => {
    const add = (name: string, price: string) => {
      const next = cartAdd(lines, name, price);
      if (next === lines) return false;
      setLines(next);
      say(`${name.trim()} masuk keranjang`);
      return true;
    };
    const addMany = (items: { name: string; price: string }[], label: string) => {
      let next = lines;
      let added = 0;
      for (const item of items) {
        const updated = cartAdd(next, item.name, item.price);
        if (updated !== next) added += 1;
        next = updated;
      }
      if (added > 0) {
        setLines(next);
        say(`${added} produk ${label} masuk keranjang`);
      }
      return added;
    };
    return {
      lines,
      count: cartCount(lines),
      total: cartTotal(lines),
      add,
      addMany,
      setQty: (name, qty) => setLines((prev) => cartSetQty(prev, name, qty)),
      notice,
      overlay,
      openCart: () => setOverlay({ kind: 'cart' }),
      openPhotos: (photos, index) => setOverlay({ kind: 'photos', photos, index }),
      setPhotoIndex: (index) => setOverlay((prev) => (prev?.kind === 'photos' ? { ...prev, index: (index + prev.photos.length) % prev.photos.length } : prev)),
      closeOverlay: () => setOverlay(null),
    };
  }, [lines, notice, overlay, say]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

// ─── Panel keranjang ──────────────────────────────────────────────────────────

function CartPanel({ m }: { m: GlowModel }) {
  const store = useStore();
  const panel = useDialog(true, store.closeOverlay);
  const empty = store.lines.length === 0;
  const checkout = empty ? null : m.waWith(cartMessage(m.companyName, store.lines));
  const isWa = checkout?.kind === 'external' && /wa\.me/.test(checkout.href);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gs-cart-title"
      className={`absolute right-3 top-3 flex max-h-[min(76svh,720px)] w-[min(420px,calc(100%-24px))] flex-col overflow-hidden rounded-[24px] ${C.ivory} ${C.ink} ring-1 ring-[#2B211C]/10 @2xl:right-6`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#2B211C]/10 px-5 py-4">
        <h2 id="gs-cart-title" className={`${SERIF} text-[26px] leading-none`}>
          Keranjang <span className={`${MONO} align-middle ${C.muted}`}>({store.count})</span>
        </h2>
        <button type="button" onClick={store.closeOverlay} aria-label="Tutup keranjang" className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#2B211C]/[0.06]">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {empty ? (
        <div className="px-5 py-10 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-(--gs-accent-text)" aria-hidden />
          <p className={`mt-4 ${SERIF} text-[24px]`}>Keranjang masih kosong</p>
          <p className={`mt-1 text-[14px] ${C.muted}`}>Tambahkan produk dari daftar terlaris atau hasil kuis kulitmu.</p>
          {m.productsAction && (
            <ActionLink action={m.productsAction} onNavigate={store.closeOverlay} className={`${BTN.dark} ${BTN.md} mt-6`}>
              Lihat produk terlaris
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ActionLink>
          )}
        </div>
      ) : (
        <>
          <ul aria-label="Isi keranjang" className="min-h-0 flex-1 divide-y divide-[#2B211C]/10 overflow-y-auto px-5">
            {store.lines.map((line) => (
              <li key={line.name} className="flex items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-snug">{line.name}</p>
                  <p className={`mt-0.5 text-[13px] ${C.muted}`}>
                    {formatRupiah(line.price)} × {line.qty}
                  </p>
                </div>
                <div className="flex items-center rounded-full ring-1 ring-inset ring-[#2B211C]/15">
                  <button
                    type="button"
                    onClick={() => store.setQty(line.name, line.qty - 1)}
                    aria-label={line.qty === 1 ? `Hapus ${line.name}` : `Kurangi ${line.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#2B211C]/[0.06]"
                  >
                    {line.qty === 1 ? <X className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                  </button>
                  <span className="w-6 text-center text-[14px] font-medium tabular-nums" aria-label={`Jumlah ${line.qty}`}>
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => store.setQty(line.name, line.qty + 1)}
                    aria-label={`Tambah ${line.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#2B211C]/[0.06]"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#2B211C]/10 px-5 pb-5 pt-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className={`${MONO} ${C.muted}`}>Subtotal</span>
              <span className={`${SERIF} text-[28px] leading-none tabular-nums`}>{formatRupiah(store.total)}</span>
            </div>
            <p className={`mt-2 text-[13px] ${C.muted}`}>Ongkir dan pembayaran dikonfirmasi lewat chat.</p>
            {checkout && (
              <ActionLink action={checkout} className={`${BTN.accent} ${BTN.lg} mt-4 flex w-full`}>
                {isWa && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
                {isWa ? 'Pesan lewat WhatsApp' : 'Hubungi kami untuk memesan'}
              </ActionLink>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Foto ulasan ──────────────────────────────────────────────────────────────

function PhotoPanel() {
  const store = useStore();
  const panel = useDialog(true, store.closeOverlay);
  const overlay = store.overlay;
  useEffect(() => {
    if (overlay?.kind !== 'photos' || overlay.photos.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') store.setPhotoIndex(overlay.index + 1);
      if (e.key === 'ArrowLeft') store.setPhotoIndex(overlay.index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, store]);
  if (overlay?.kind !== 'photos') return null;
  const photo = overlay.photos[overlay.index];
  const many = overlay.photos.length > 1;
  const round = 'flex h-11 w-11 items-center justify-center rounded-full transition-colors';

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ulasan ${photo.title}`}
      className={`absolute inset-x-3 top-3 mx-auto flex max-h-[min(80svh,760px)] max-w-[880px] flex-col overflow-hidden rounded-[24px] ${C.ivory} ${C.ink} @3xl:flex-row`}
    >
      <div className="relative min-h-0 flex-1 bg-[#EDE5D9] @3xl:flex-[1.15]">
        <img src={photo.src} alt={photo.alt} className="h-full max-h-[52svh] w-full object-cover @3xl:max-h-none" />
      </div>
      <div className="flex flex-col gap-4 p-5 @3xl:w-[300px] @3xl:p-7">
        <div className="flex items-center justify-between gap-2">
          <span className={`${MONO} ${C.muted}`}>{many ? `Foto ${overlay.index + 1} / ${overlay.photos.length}` : 'Foto pembeli'}</span>
          <button type="button" onClick={store.closeOverlay} aria-label="Tutup foto" className={`${round} hover:bg-[#2B211C]/[0.06]`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className={`${SERIF} text-[26px] leading-tight`}>{photo.title}</p>
        {photo.detail && <p className={`text-[15px] leading-relaxed ${C.muted}`}>{photo.detail}</p>}
        {many && (
          <div className="mt-auto flex gap-2">
            <button type="button" onClick={() => store.setPhotoIndex(overlay.index - 1)} aria-label="Foto sebelumnya" className={`${round} ring-1 ring-inset ring-[#2B211C]/15 hover:bg-[#2B211C]/[0.06]`}>
              <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
            </button>
            <button type="button" onClick={() => store.setPhotoIndex(overlay.index + 1)} aria-label="Foto berikutnya" className={`${round} ring-1 ring-inset ring-[#2B211C]/15 hover:bg-[#2B211C]/[0.06]`}>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wadah lapisan ────────────────────────────────────────────────────────────

/** Lapisan melayang: menempel di tepi atas area yang terlihat (di bawah bar demo bila ada). */
export function OverlayHost({ m }: { m: GlowModel }) {
  const store = useStore();
  const { overlay, notice } = store;
  return (
    <div className="pointer-events-none sticky top-[var(--tpl-sticky-top,0px)] z-50 h-0">
      {overlay && (
        <div className="pointer-events-auto absolute inset-x-0 top-0 h-[calc(100svh-var(--tpl-sticky-top,0px))]">
          <div aria-hidden onClick={store.closeOverlay} className="gs-fade absolute inset-0 bg-[#2B211C]/45" />
          {overlay.kind === 'cart' ? <CartPanel m={m} /> : <PhotoPanel />}
        </div>
      )}
      {!overlay && notice && (
        <div key={notice.id} className="gs-pop pointer-events-auto absolute right-3 top-[80px] flex max-w-[calc(100%-24px)] items-center gap-3 rounded-full bg-[#2B211C] py-1.5 pl-4 pr-1.5 text-[14px] text-[#F6F1EA] @2xl:right-6 @3xl:top-[92px]">
          <Check className="h-4 w-4 shrink-0 text-(--gs-accent-light)" aria-hidden />
          <span className="min-w-0 truncate">{notice.text}</span>
          <button type="button" onClick={store.openCart} className={`${BTN.cream} h-9 shrink-0 px-4 text-[13px]`}>
            Lihat keranjang
          </button>
        </div>
      )}
      {/* role="status" sudah polite; tanpa aria-live eksplisit agar region status Shell tetap yang pertama */}
      <p className="sr-only" role="status">
        {notice?.text ?? ''}
      </p>
    </div>
  );
}
