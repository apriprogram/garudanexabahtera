// Header Velora (brief §3): menu DI DALAM kartu hero — kiri simbol + nama putih, tengah tautan di dalam SATU pil putih,
// kanan pil putih "Find a dealer" (aksi CMS) + tombol bulat menu. Header berupa lapisan lengket setinggi 0 yang menumpang
// di atas kartu hero (gutter + INSET = tepi CONTAINER, jadi sejajar dengan isi kartu); begitu halaman digulir menjadi
// bilah gelap #0D0E10/85 + blur dengan susunan yang sama. Tanpa hero → selalu bilah gelap. Tombol bulat membuka panel
// menu (semua section + tombol) di semua ukuran: kartu gelap di kanan pada layar lebar, selebar layar di HP. Esc atau
// klik di luar menutup panel; fokus kembali ke tombol menu. Pil menu diukur (usePillNavFits): bila label menu dari CMS
// terlalu panjang untuk muat di antara logo dan aksi kanan, pil disembunyikan dan menu lewat tombol bulat saja.
// `wrap` pada Logo: nama perusahaan boleh membungkus (footer), bukan terpotong.
import { ArrowUpRight, MapPin, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { mailHref, telHref, text } from '../shared/utils';
import { useActiveSection, usePillNavFits, useScrolledPast } from './hooks';
import { VeloraMark } from './marks';
import type { VeloraModel } from './model';
import { DISPLAY } from './styles';
import { ArrowPill } from './ui';

export function Logo({ m, tone = 'dark', wrap = false }: { m: VeloraModel; tone?: 'dark' | 'light'; wrap?: boolean }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<VeloraMark className={`h-8 w-8 ${dark ? 'text-white' : 'text-[#0D0E10]'}`} />}
      nameClassName={`${DISPLAY} text-[17px] font-medium tracking-[-0.02em] @3xl:text-[19px] ${dark ? 'text-white' : 'text-[#0D0E10]'} ${
        wrap ? 'whitespace-normal! leading-tight [overflow-wrap:anywhere]' : ''
      }`}
    />
  );
}

export function Header({ m, overlay }: { m: VeloraModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const pillFits = usePillNavFits(row, `${m.nav.pill.map((item) => item.label).join('|')}|${m.headerLabel}|${m.companyName}|${m.logo}`);
  const solid = !overlay || scrolled || open;
  const active = useActiveSection(
    sentinel,
    m.nav.all.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const phone = text(m.contact, 'phone');
  const email = text(m.contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButton.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const hasMenu = m.nav.all.length > 0 || !!m.headerAction;

  return (
    <>
      {/* Penanda gulir: 16px di bawah tepi atas halaman (begitu digulir sedikit, header jadi bilah gelap) */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-4 h-px w-px" />
      <header ref={headerRef} data-tpl-tone="inverse" className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          className={`border-b transition-[background-color,border-color,padding] duration-300 ${
            solid ? 'border-white/10 bg-[#0D0E10]/85 backdrop-blur-md' : 'border-transparent pt-2 @2xl:pt-3 @5xl:pt-4'
          }`}
        >
          <div className={CONTAINER}>
            <div
              ref={row}
              className={`flex h-[68px] items-center justify-between gap-3 @5xl:h-[80px] ${pillFits ? '@6xl:grid @6xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : ''}`}
            >
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-w-0 max-w-full items-center justify-self-start rounded-full"
                aria-label={`${m.companyName}, back to top`}
              >
                <Logo m={m} />
              </ActionLink>

              {m.nav.pill.length > 0 && (
                // Tidak muat → tetap dirender tak terlihat (visibility hidden: tidak bisa difokus, tidak dibacakan; kotak 0×0
                // terpotong agar tidak melebarkan halaman) supaya lebar alaminya tetap bisa diukur
                <nav data-vl-pill aria-label="Menu utama" className={pillFits ? 'hidden @6xl:block' : 'pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden'}>
                  <ul className="flex w-max items-center gap-0.5 rounded-full bg-white p-1">
                    {m.nav.pill.map((item) => {
                      const current = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={current ? 'true' : undefined}
                            className={`flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-300 ${
                              current ? 'bg-[#0D0E10] text-white' : 'text-[#3A3C41] hover:bg-[#ECECEA] hover:text-[#0D0E10]'
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

              <div className="flex min-w-0 shrink-0 items-center justify-self-end gap-2">
                {m.headerAction && m.headerLabel && (
                  <ActionLink
                    action={m.headerAction}
                    className="hidden h-11 min-w-0 items-center gap-2 rounded-full bg-white pl-4 pr-5 text-[14px] font-medium text-[#0D0E10] transition-colors duration-300 hover:bg-[#ECECEA] @xl:inline-flex"
                  >
                    <MapPin aria-hidden className="h-4 w-4 shrink-0 text-(--vl-ink)" strokeWidth={2} />
                    <span className="truncate">{m.headerLabel}</span>
                  </ActionLink>
                )}
                {hasMenu && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0D0E10] transition-colors duration-300 hover:bg-[#ECECEA]"
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <div className={`${CONTAINER} pb-4 @5xl:pb-5`}>
              <nav
                id={panelId}
                aria-label="Menu utama"
                className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-96px)] overflow-y-auto rounded-[24px] bg-[#1B1D21] p-2 ring-1 ring-inset ring-white/10 @5xl:ml-auto @5xl:max-w-[420px]"
              >
                <ul>
                  {m.nav.all.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className="flex h-12 items-center justify-between gap-3 rounded-2xl px-4 text-[16px] font-medium text-white transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="flex items-center gap-3">
                          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${active === item.key ? 'bg-(--vl-red)' : 'bg-white/25'}`} />
                          {item.label}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-white/60" aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                {(m.headerAction || tel || mail) && (
                  <div className="mt-2 border-t border-white/10 px-2 pb-2 pt-4">
                    <ArrowPill action={m.headerAction} label={m.headerLabel} variant="white" onNavigate={close} className="flex w-full" />
                    {(tel || mail) && (
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-2 text-[13.5px] text-white/70">
                        {tel && (
                          <ActionLink action={{ kind: 'external', href: tel }} className="inline-flex min-h-9 items-center hover:text-white">
                            {phone}
                          </ActionLink>
                        )}
                        {mail && (
                          <ActionLink action={{ kind: 'external', href: mail }} className="inline-flex min-h-9 items-center [overflow-wrap:anywhere] hover:text-white">
                            {email}
                          </ActionLink>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
