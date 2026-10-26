// Header Bestari: navbar biasa selebar layar yang menempel di atas. Di atas foto hero (belum digulir) latarnya
// transparan: bilah info tipis (email & telepon dari Kontak di kiri, pengumuman PPDB di kanan; referensi Eduker), lalu
// logo kiri, menu di tengah, tombol pil warna tema di kanan, semuanya putih. Setelah digulir bilah info dilipat dan
// navbar berlatar putih polos dengan teks gelap (tanpa garis tepi dan bayangan); kembali ke paling atas → latar
// menghilang lagi. Tanpa hero → selalu putih tanpa bilah info. HP: logo + tombol menu; panel menu terbuka di bawah
// navbar (navbar ikut putih), Esc menutup dan mengembalikan fokus ke tombol menu.
import { ArrowRight, Mail, Megaphone, Menu, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { mailHref, telHref, text } from '../shared/utils';
import { useActiveSection, useScrolledPast } from './hooks';
import { BestariMark } from './marks';
import type { BestariModel } from './model';
import { C, DISPLAY } from './styles';
import { PillLink } from './ui';

export function Logo({ m, tone }: { m: BestariModel; tone: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            light ? 'bg-white/[0.1] text-(--bs-bright) ring-1 ring-inset ring-white/20' : 'bg-(--tpl-accent) text-(--tpl-on-accent)'
          }`}
        >
          <BestariMark className="h-5 w-5" />
        </span>
      }
      nameClassName={`${DISPLAY} text-[16px] font-semibold leading-[1.2] tracking-[-0.02em] @3xl:text-[17px] ${light ? 'text-white' : C.ink}`}
    />
  );
}

/** Bilah info di atas menu: kontak singkat + pengumuman. Kosong semua → tidak dirender. */
function InfoBar({ m, hidden }: { m: BestariModel; hidden: boolean }) {
  const message = text(m.hero, 'topbar_text');
  const label = text(m.hero, 'topbar_label');
  const email = text(m.contact, 'email');
  const phone = text(m.contact, 'phone');
  const mail = mailHref(email);
  const tel = telHref(phone);
  if (!message && !mail && !tel) return null;
  const link = 'inline-flex min-h-9 items-center gap-2 text-white transition-colors hover:text-white/80';
  return (
    <div
      data-bs-infobar
      data-tpl-tone="inverse"
      aria-hidden={hidden || undefined}
      inert={hidden}
      className={`overflow-hidden transition-[max-height,opacity] duration-300 ${hidden ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'} ${message ? '' : 'hidden @3xl:block'}`}
    >
      <div className={`${CONTAINER} flex min-h-11 items-center justify-between gap-6 border-b border-white/15 py-1 text-[13px]`}>
        <div className="hidden min-w-0 items-center gap-5 @3xl:flex">
          {mail && (
            <ActionLink action={{ kind: 'external', href: mail }} className={link}>
              <Mail aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">{email}</span>
            </ActionLink>
          )}
          {tel && (
            <ActionLink action={{ kind: 'external', href: tel }} className={link}>
              <Phone aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              {phone}
            </ActionLink>
          )}
        </div>
        {/* Teks utuh boleh turun baris (maks. 80 huruf → 2–3 baris di HP); jarak atas hero memberi ruang untuk itu */}
        {message && (
          <p className="flex min-w-0 flex-1 items-center justify-center gap-3 leading-snug text-white @3xl:justify-end">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Megaphone aria-hidden className="hidden h-4 w-4 shrink-0 text-(--bs-bright) @xl:block" strokeWidth={1.8} />
              <span className="min-w-0">{message}</span>
            </span>
            {label && m.topbarAction && (
              <ActionLink action={m.topbarAction} className="group inline-flex min-h-8 shrink-0 items-center gap-1 font-semibold text-white">
                <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{label}</span>
                <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </ActionLink>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function Header({ m, overlay }: { m: BestariModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  // Latar putih: sudah digulir, tanpa hero, atau menu HP terbuka. Paling atas di atas foto → transparan, teks putih.
  const solid = scrolled || !overlay || open;
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Penanda gulir: 16px di bawah tepi atas halaman (begitu digulir sedikit, navbar jadi putih) */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-4 h-px w-px" />
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone={solid ? undefined : 'inverse'}
          className={`transition-[background-color] duration-300 ${solid ? 'bg-white' : 'bg-transparent'}`}
        >
          {overlay && <InfoBar m={m} hidden={scrolled || open} />}
          <div className={CONTAINER}>
            <div className="flex h-[68px] items-center justify-between gap-4 @5xl:h-[76px] @6xl:grid @6xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              {/* flex (bukan inline): logo & nama tidak duduk di garis dasar teks, jadi tepat di tengah tinggi navbar di semua zoom */}
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-w-0 items-center self-center justify-self-start rounded-full"
                aria-label={`${m.companyName}, ke awal halaman`}
              >
                <Logo m={m} tone={solid ? 'dark' : 'light'} />
              </ActionLink>

              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul className="flex items-center gap-1">
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      const tone = solid
                        ? isCurrent
                          ? `bg-[#F5F2ED] ${C.ink}`
                          : 'text-[#57534E] hover:bg-[#F5F2ED] hover:text-[#1C1917]'
                        : isCurrent
                          ? 'bg-white/[0.16] text-white'
                          : 'text-white/[0.86] hover:bg-white/[0.12] hover:text-white';
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`flex h-10 items-center rounded-full px-4 text-[14.5px] font-medium transition-colors duration-300 ${tone}`}
                          >
                            {item.label}
                          </ActionLink>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}

              <div className="flex shrink-0 items-center self-center justify-self-end gap-2">
                <span className="hidden items-center @xl:flex">
                  <PillLink action={m.headerAction} label={m.headerLabel} variant="primary" />
                </span>
                {m.nav.length > 0 && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 @6xl:hidden ${
                      solid ? `bg-[#F5F2ED] hover:bg-[#ECE7DF] ${C.ink}` : 'bg-white/[0.14] text-white backdrop-blur-md hover:bg-white/[0.24]'
                    }`}
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <nav id={menuId} aria-label="Menu utama" className="max-h-[calc(100svh-68px)] overflow-y-auto border-t border-[#1C1917]/[0.08] @6xl:hidden">
              <div className={`${CONTAINER} pb-4 pt-2`}>
                <ul>
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`-mx-3 flex h-12 items-center justify-between rounded-[16px] px-3 text-[16px] font-medium transition-colors hover:bg-[#F5F2ED] ${C.ink}`}
                      >
                        {item.label}
                        <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 @xl:hidden">
                  <PillLink action={m.headerAction} label={m.headerLabel} variant="primary" size="lg" onNavigate={close} className="flex w-full" />
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
