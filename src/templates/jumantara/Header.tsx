// Header Jumantara, dua lapis. (1) Bilah utilitas kobalt-hitam setinggi 40px (layar ≥ @3xl): telepon, email, dan jam
// layanan dari bagian Kontak di kiri, tautan cepat (mis. PPID, E-Learning, Pengaduan) di kanan; ikut tergulir, tidak
// menempel. (2) Bilah utama yang menempel: logo + nama sekolah + tagline, menu teks dengan garis bawah saat disorot,
// tombol persegi "Info SPMB". Di atas foto hero (belum digulir) latarnya transparan dan teksnya putih; setelah digulir
// (atau menu HP terbuka, tanpa hero, halaman /berita) putih polos dengan garis rambut 1px di bawahnya — tanpa bayangan.
// HP: logo + tombol menu; panel menu putih di bawah bilah (menu, tombol SPMB, tautan cepat, telepon & email); Esc menutup
// dan mengembalikan fokus ke tombol menu.
import { ArrowRight, Clock, Mail, Menu, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { useActiveSection, useScrolledPast } from './hooks';
import type { JumantaraModel } from './model';
import { BTN, C, DIVIDE, LINE } from './styles';
import { Brand } from './ui';

interface ContactBits {
  phone: string;
  email: string;
  hours: string;
  tel: string;
  mail: string;
}

const contactBits = (m: JumantaraModel): ContactBits => {
  const phone = text(m.contact, 'phone');
  const email = text(m.contact, 'email');
  return { phone, email, hours: text(m.contact, 'hours'), tel: telHref(phone), mail: mailHref(email) };
};

/** Bilah utilitas di atas header (layar ≥ @3xl). Tanpa kontak dan tautan → tidak dirender. */
function UtilityBar({ m }: { m: JumantaraModel }) {
  const { phone, email, hours, tel, mail } = contactBits(m);
  const links = m.topbarLinks;
  if (!tel && !mail && !hours && links.length === 0) return null;
  const item = 'inline-flex min-h-10 min-w-0 items-center gap-2 text-white/80 transition-colors duration-200 hover:text-white';
  return (
    <div data-jm-utility="" data-tpl-tone="inverse" className="hidden bg-(--jm-night) text-[13px] @3xl:block">
      <div className={`${CONTAINER} flex h-10 items-center justify-between gap-6`}>
        <ul className="flex min-w-0 items-center gap-4">
          {tel && (
            <li className="flex min-w-0">
              <ActionLink action={{ kind: 'external', href: tel }} className={item}>
                <Phone aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--jm-bright)" strokeWidth={2} />
                <span className="truncate tabular-nums">{phone}</span>
              </ActionLink>
            </li>
          )}
          {mail && (
            <li className={`flex min-w-0 ${tel ? 'border-l border-white/15 pl-4' : ''}`}>
              <ActionLink action={{ kind: 'external', href: mail }} className={item}>
                <Mail aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--jm-bright)" strokeWidth={2} />
                <span className="truncate">{email}</span>
              </ActionLink>
            </li>
          )}
          {hours && (
            <li className={`hidden min-w-0 items-center gap-2 text-white/80 @5xl:flex ${tel || mail ? 'border-l border-white/15 pl-4' : ''}`}>
              <Clock aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--jm-bright)" strokeWidth={2} />
              <span className="truncate">{hours}</span>
            </li>
          )}
        </ul>
        {links.length > 0 && (
          <ul className="flex shrink-0 items-center">
            {links.map((link, i) => (
              <li key={`${link.label}-${i}`} className={i > 0 ? 'border-l border-white/15 pl-4 ml-4' : ''}>
                <ActionLink action={link.action} className="inline-flex min-h-10 items-center font-medium text-white/80 transition-colors duration-200 hover:text-white">
                  {link.label}
                </ActionLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NavLink({ action, label, current, solid }: { action: LinkAction; label: string; current: boolean; solid: boolean }) {
  return (
    <ActionLink
      action={action}
      aria-current={current ? 'true' : undefined}
      className={`flex h-11 items-center text-[14.5px] font-medium underline-offset-[10px] decoration-2 transition-colors duration-200 hover:underline ${
        solid ? `decoration-(--tpl-accent) ${current ? `${C.ink} underline` : 'text-[#4A5368] hover:text-[#0E1525]'}` : `decoration-(--jm-bright) ${current ? 'text-white underline' : 'text-white/90 hover:text-white'}`
      }`}
    >
      {label}
    </ActionLink>
  );
}

export function Header({ m, overlay }: { m: JumantaraModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  // Latar putih: sudah digulir, tanpa hero, atau menu HP terbuka. Paling atas di atas foto → transparan, teks putih.
  const solid = scrolled || !overlay || open;
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const { phone, email, tel, mail } = contactBits(m);

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

  // Menu HP terbuka lalu bingkai melebar melewati @6xl: tombol & panel menu jadi display:none → tutup menu
  useEffect(() => {
    const root = sentinel.current?.closest<HTMLElement>('[data-tpl-root]');
    if (!open || !root || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      const button = menuButton.current;
      if (button && getComputedStyle(button).display === 'none') setOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [open]);

  const cta = m.headerAction && m.headerLabel;

  return (
    <>
      <UtilityBar m={m} />
      {/* Penanda gulir: 8px di bawah tepi atas hero (begitu digulir sedikit, header jadi putih) */}
      <div aria-hidden className="pointer-events-none relative h-0">
        <span ref={sentinel} className="absolute left-0 top-2 h-px w-px" />
      </div>
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone={solid ? undefined : 'inverse'}
          className={`border-b transition-colors duration-[250ms] ${solid ? `bg-white ${LINE}` : 'border-transparent bg-transparent'}`}
        >
          <div className={CONTAINER}>
            <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[72px]">
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-h-11 min-w-0 items-center rounded-[10px]"
                aria-label={`${m.companyName}, ke awal halaman`}
              >
                <Brand m={m} tone={solid ? 'light' : 'dark'} />
              </ActionLink>

              <div className="flex shrink-0 items-center gap-8">
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-7">
                      {m.nav.map((item) => (
                        <li key={item.key}>
                          <NavLink action={{ kind: 'section', target: item.key }} label={item.label} current={active === item.key} solid={solid} />
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <div className="flex items-center gap-2">
                  {cta && (
                    <span className="hidden @xl:flex">
                      <ActionLink action={m.headerAction} className={`${BTN.primary} ${BTN.md}`}>
                        {m.headerLabel}
                      </ActionLink>
                    </span>
                  )}
                  {m.nav.length > 0 && (
                    <button
                      ref={menuButton}
                      type="button"
                      onClick={() => setOpen((v) => !v)}
                      aria-expanded={open}
                      aria-controls={menuId}
                      aria-label={open ? 'Tutup menu' : 'Buka menu'}
                      className={`flex h-11 w-11 items-center justify-center rounded-[10px] border transition-colors duration-200 @6xl:hidden ${
                        solid ? `${LINE} bg-white ${C.ink} hover:border-(--jm-line)` : 'border-white/30 bg-white/[0.06] text-white backdrop-blur-md hover:bg-white/15'
                      }`}
                    >
                      {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {open && (
            <nav
              id={menuId}
              aria-label="Menu utama"
              className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t bg-white @6xl:hidden ${LINE}`}
            >
              <div className={`${CONTAINER} pb-6 pt-2`}>
                <ul className={`divide-y ${DIVIDE}`}>
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex h-12 items-center justify-between text-[16px] font-medium transition-colors hover:text-(--jm-ink) ${C.ink}`}
                      >
                        {item.label}
                        <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                {cta && (
                  <div className="mt-4 @xl:hidden">
                    <ActionLink action={m.headerAction} onNavigate={close} className={`${BTN.primary} ${BTN.lg} w-full`}>
                      {m.headerLabel}
                    </ActionLink>
                  </div>
                )}
                {(m.topbarLinks.length > 0 || tel || mail) && (
                  <div className={`mt-5 grid gap-1 border-t pt-4 text-[14px] ${LINE}`}>
                    {m.topbarLinks.length > 0 && (
                      <ul className="flex flex-wrap gap-x-5">
                        {m.topbarLinks.map((link, i) => (
                          <li key={`${link.label}-${i}`}>
                            <ActionLink action={link.action} onNavigate={close} className="inline-flex min-h-11 items-center font-semibold text-(--jm-ink)">
                              {link.label}
                            </ActionLink>
                          </li>
                        ))}
                      </ul>
                    )}
                    {tel && (
                      <ActionLink action={{ kind: 'external', href: tel }} className={`inline-flex min-h-11 items-center gap-2.5 ${C.muted}`}>
                        <Phone aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        {phone}
                      </ActionLink>
                    )}
                    {mail && (
                      <ActionLink action={{ kind: 'external', href: mail }} className={`inline-flex min-h-11 min-w-0 items-center gap-2.5 ${C.muted}`}>
                        <Mail aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span className="truncate">{email}</span>
                      </ActionLink>
                    )}
                  </div>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
