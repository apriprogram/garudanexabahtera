// Header SkyNusa: bilah lengket di kanvas abu — kiri simbol drone + nama, tengah tautan section (item aktif bergaris
// bawah aksen), kanan tombol Keranjang (jumlah barang) + tombol gelap "Konsultasi". Setelah digulir bilah menjadi tembus +
// blur dengan garis bawah tipis. Panel keranjang & menu HP menumpang di bawah bilah (tidak menggeser halaman), tertutup
// dengan Esc, tombol tutup, atau klik di luar header. Keranjang hanya demo: pesanan dikirim lewat WhatsApp.
import { ArrowRight, Menu, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { SkyNusaMark } from './marks';
import { cartCount, cartMessage, cartTotal, formatRupiah, MAX_QTY, type SkyNusaModel } from './model';
import { useShop } from './shop';
import { BTN, C, MONO } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m, tone }: { m: SkyNusaModel; tone: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<SkyNusaMark className={`h-8 w-8 ${dark ? 'text-white' : 'text-[#0E1A1C]'}`} />}
      nameClassName={`font-[family-name:var(--tpl-font-display)] text-[19px] font-medium tracking-[-0.03em] @3xl:text-[20px] ${dark ? 'text-white' : 'text-[#0E1A1C]'}`}
    />
  );
}

const STEP = 'flex h-9 w-9 items-center justify-center rounded-[8px] text-[#0E1A1C] transition-colors hover:bg-black/[0.05] disabled:opacity-35 disabled:hover:bg-transparent';

function CartPanel({ m, id, onClose }: { m: SkyNusaModel; id: string; onClose: () => void }) {
  const { cart, setQty, clear } = useShop();
  const count = cartCount(cart);
  const { total, complete } = cartTotal(cart);
  const wa = cart.length > 0 ? m.waWith(cartMessage(m.companyName, cart)) : null;
  const order = wa ?? (cart.length > 0 ? m.contactAction : null);
  const productsAction = m.shown('products') ? ({ kind: 'section', target: 'products' } as const) : null;

  return (
    <section id={id} aria-label="Keranjang belanja" className="w-full rounded-[16px] bg-white p-5 ring-1 ring-inset ring-black/[0.08] @2xl:w-[420px] @2xl:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[17px] font-medium tracking-[-0.01em] text-[#0E1A1C]">
          Keranjang <span className={`${C.muted} tabular-nums`}>({count})</span>
        </p>
        <button type="button" onClick={onClose} aria-label="Tutup keranjang" className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#0E1A1C] hover:bg-black/[0.05]">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {cart.length === 0 ? (
        <div className={`mt-4 text-[14.5px] leading-relaxed ${C.muted}`}>
          <p>Keranjang masih kosong. Pilih drone atau paket, lalu kirim pesanan lewat WhatsApp.</p>
          {productsAction && (
            <ActionLink action={productsAction} onNavigate={onClose} className="mt-2 inline-flex min-h-10 items-center gap-1.5 font-medium text-(--tpl-accent-ink)">
              Lihat drone
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ActionLink>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-4 max-h-[min(46vh,360px)] divide-y divide-black/[0.07] overflow-y-auto border-y border-black/[0.07]" aria-label="Isi keranjang">
            {cart.map((line) => (
              <li key={line.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[#0E1A1C]">{line.name}</p>
                  <p className={`mt-0.5 truncate text-[12.5px] ${C.muted}`}>
                    {line.kind}
                    {line.priceLabel ? ` · ${line.priceLabel}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded-[10px] ring-1 ring-inset ring-black/[0.1]">
                  <button type="button" className={STEP} onClick={() => setQty(line.id, line.qty - 1)} aria-label={`Kurangi ${line.name}`}>
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="w-6 text-center text-[14px] font-medium tabular-nums text-[#0E1A1C]" aria-label={`Jumlah ${line.name}`}>
                    {line.qty}
                  </span>
                  <button type="button" className={STEP} onClick={() => setQty(line.id, line.qty + 1)} disabled={line.qty >= MAX_QTY} aria-label={`Tambah ${line.name}`}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <button type="button" onClick={() => setQty(line.id, 0)} aria-label={`Hapus ${line.name}`} className={`${STEP} ${C.muted}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {total > 0 && (
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className={`${MONO} ${C.muted}`}>Perkiraan total</p>
              <p className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0E1A1C]">
                {complete ? '' : 'mulai '}
                {formatRupiah(total)}
              </p>
            </div>
          )}
          <p className={`mt-2 text-[13px] leading-snug ${C.muted}`}>Belum ada pembayaran di sini. Stok, ongkir, dan cara bayar kami konfirmasi lewat WhatsApp.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonLink
              action={order}
              label={wa ? 'Kirim Pesanan via WhatsApp' : 'Hubungi Kami'}
              variant="ink"
              icon={wa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
              className={`${BTN.ink} ${BTN.md} max-w-full flex-1`}
            />
            <button type="button" onClick={clear} className={`min-h-10 px-2 text-[14px] font-medium underline-offset-4 hover:underline ${C.muted}`}>
              Kosongkan
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function Header({ m }: { m: SkyNusaModel }) {
  const shop = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const cartId = useId();
  const header = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const cartButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const { cartOpen, setCartOpen } = shop;
  const count = cartCount(shop.cart);
  const solid = scrolled || menuOpen || cartOpen;
  const close = () => {
    setMenuOpen(false);
    setCartOpen(false);
  };

  useEffect(() => {
    if (!menuOpen && !cartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (cartOpen) cartButton.current?.focus();
      setMenuOpen(false);
      setCartOpen(false);
    };
    // Klik di luar header menutup panel (panel menumpang di atas halaman)
    const onPointer = (e: PointerEvent) => {
      if (header.current && !header.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCartOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen, cartOpen, setCartOpen]);

  return (
    <>
      {/* Penanda gulir: 24px di bawah tepi atas halaman */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header ref={header} className="sticky top-[var(--tpl-sticky-top,0px)] z-30">
        <div className={`border-b transition-[background-color,border-color] duration-300 ${solid ? 'border-black/[0.07] bg-[#E9EEEF]/90 backdrop-blur-md' : 'border-transparent bg-[#E9EEEF]'}`}>
          <div className={CONTAINER}>
            <div className="flex h-[68px] items-center justify-between gap-3 @3xl:h-[76px] @6xl:grid @6xl:grid-cols-[1fr_auto_1fr]">
              <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 justify-self-start rounded-[10px]" onNavigate={close}>
                <Logo m={m} tone="light" />
              </ActionLink>

              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul className="flex items-center gap-1 rounded-[12px] bg-white/70 p-1 ring-1 ring-inset ring-black/[0.05]">
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`flex h-9 items-center rounded-[9px] px-3.5 text-[14px] transition-colors @7xl:px-4 ${
                              isCurrent ? 'bg-[#0E1A1C] font-medium text-white' : 'text-[#0E1A1C]/75 hover:bg-white hover:text-[#0E1A1C]'
                            }`}
                          >
                            {item.label}
                          </ActionLink>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}

              <div className="flex shrink-0 items-center justify-self-end gap-2">
                <button
                  ref={cartButton}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setCartOpen(!cartOpen);
                  }}
                  aria-expanded={cartOpen}
                  aria-controls={cartId}
                  aria-label={`Keranjang, ${count} barang`}
                  className="flex h-10 items-center gap-2 rounded-[10px] bg-white px-3 text-[14px] font-medium text-[#0E1A1C] ring-1 ring-inset ring-black/[0.08] transition-colors hover:bg-[#F2F5F5]"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
                  <span className="hidden @3xl:inline" aria-hidden>
                    Keranjang
                  </span>
                  <span
                    key={count}
                    aria-hidden
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${count > 0 ? 'sn-pop bg-[#0E1A1C] text-white' : 'bg-black/[0.06] text-[#0E1A1C]'}`}
                  >
                    {count}
                  </span>
                </button>
                <span className="hidden @xl:inline-flex">
                  <ButtonLink action={m.headerAction} label={m.headerLabel} variant="ink" className={`${BTN.ink} h-10 pl-4 pr-1 text-[14px]`} />
                </span>
                {m.nav.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      setMenuOpen((v) => !v);
                    }}
                    aria-expanded={menuOpen}
                    aria-controls={menuId}
                    aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#0E1A1C] text-white transition-colors hover:bg-[#1F3034] @6xl:hidden"
                  >
                    {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {cartOpen && (
          <div className="absolute inset-x-0 top-full pt-2">
            <div className={`${CONTAINER} flex justify-end`}>
              <CartPanel m={m} id={cartId} onClose={() => setCartOpen(false)} />
            </div>
          </div>
        )}

        {menuOpen && (
          <nav id={menuId} aria-label="Menu utama" className="absolute inset-x-0 top-full pt-2 @6xl:hidden">
            <div className={CONTAINER}>
              <div className="rounded-[16px] bg-white p-2 ring-1 ring-inset ring-black/[0.08]">
                <ul>
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className="flex h-12 items-center justify-between rounded-[12px] px-4 text-[16px] font-medium text-[#0E1A1C] transition-colors hover:bg-[#F2F5F5]"
                      >
                        {item.label}
                        <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <div className="p-2 @xl:hidden">
                  <ButtonLink action={m.headerAction} label={m.headerLabel} variant="ink" onNavigate={close} className={`${BTN.ink} ${BTN.lg} flex w-full justify-between`} />
                </div>
              </div>
            </div>
          </nav>
        )}
      </header>
      {/* Pengumuman pembaca layar saat barang masuk keranjang (tanpa role="status": region status pratinjau milik Shell) */}
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-sn-announce="">
        {shop.lastAdded ? `${shop.lastAdded.name} ditambahkan ke keranjang. Isi keranjang: ${count} barang.` : ''}
      </p>
    </>
  );
}
