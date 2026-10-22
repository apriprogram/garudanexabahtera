// Header & footer Arena Club (brief §4.1). Header: bilah PUTIH lengket (bukan pil melayang), logo kiri, tautan dalam
// SATU grup pil terang di tengah (item section yang sedang dibaca = pil putih ber-ring), tombol pil navy ↗ kanan.
// Garis bawah tipis muncul setelah halaman digulir. Footer: navy dengan teks putih/70.
import { ArrowUpRight, Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { isEnabled, mailHref, telHref, text } from '../shared/utils';
import { ArenaMark } from './marks';
import type { ArenaModel } from './model';
import { BTN, C, DISPLAY } from './styles';
import { PillLink } from './ui';

function Logo({ m, tone = 'light' }: { m: ArenaModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<ArenaMark className={`h-8 w-8 ${dark ? 'text-(--tpl-accent)' : 'text-[#0E1B2E]'}`} />}
      nameClassName={`${DISPLAY} text-[16px] font-semibold tracking-[-0.01em] @3xl:text-[18px] ${dark ? 'text-white' : C.ink}`}
    />
  );
}

/** Section yang sedang dibaca (untuk menyorot item menu). Tanpa IntersectionObserver → null. */
function useActiveSection(anchor: RefObject<HTMLElement | null>, keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = keys.join(',');
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (!root || typeof IntersectionObserver !== 'function') return;
    const targets = signature
      .split(',')
      .map((key) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`))
      .filter((el): el is HTMLElement => !!el);
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.getAttribute('data-tpl-section') ?? '', entry.isIntersecting);
        const current = targets.map((el) => el.getAttribute('data-tpl-section') ?? '').find((key) => visible.get(key));
        setActive(current ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [anchor, signature]);
  return active;
}

export function Header({ m }: { m: ArenaModel }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  const active = useActiveSection(sentinel, m.desktopNav.map((item) => item.key));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Garis bawah setelah digulir: penanda 1px di atas header keluar layar
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cta = <PillLink action={m.headerAction} label={m.headerLabel} className={`${BTN.navy} ${BTN.md}`} />;

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <header
        className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 -mt-px border-b bg-white/90 backdrop-blur-md transition-colors duration-300 ${
          scrolled || open ? 'border-[#0B1220]/[0.08]' : 'border-transparent'
        }`}
      >
        <div className={`${CONTAINER} flex h-16 items-center justify-between gap-4 @3xl:h-[76px]`}>
          <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 rounded-full" onNavigate={close}>
            <Logo m={m} />
          </ActionLink>

          {m.desktopNav.length > 0 && (
            <nav aria-label="Menu utama" className="hidden @6xl:block">
              <ul className={`flex items-center gap-0.5 rounded-full p-1 ring-1 ring-inset ring-black/[0.06] ${C.surface}`}>
                {m.desktopNav.map((item) => {
                  const current = active === item.key;
                  return (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        aria-current={current ? 'true' : undefined}
                        className={`flex h-9 items-center rounded-full px-4 text-[14px] transition-colors ${
                          current ? `bg-white font-medium ring-1 ring-inset ring-black/[0.08] ${C.ink}` : `${C.muted} hover:bg-white/70 hover:text-[#0B1220]`
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

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden @xl:inline-flex">{cta}</span>
            {m.nav.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.08] transition-colors hover:bg-black/[0.04] @6xl:hidden ${C.ink} ${C.surface}`}
              >
                {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
            )}
          </div>
        </div>

        {open && (
          <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
            <ul className={`rounded-[24px] p-2 ${C.surface}`}>
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    className={`flex h-12 items-center justify-between rounded-2xl px-4 text-[16px] font-medium transition-colors hover:bg-white ${C.ink}`}
                  >
                    {item.label}
                    <ArrowUpRight className="h-4 w-4 text-[#5B6472]" aria-hidden />
                  </ActionLink>
                </li>
              ))}
            </ul>
            {m.headerAction && m.headerLabel && (
              <PillLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className={`${BTN.navy} ${BTN.lg} mt-3 flex w-full @xl:hidden`} />
            )}
          </nav>
        )}
      </header>
    </>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOT_LABEL = 'text-[12px] font-medium uppercase tracking-[0.14em] text-white/60';
const FOOT_LINK = 'inline-flex min-h-10 items-center gap-2 text-[15px] text-white/80 transition-colors hover:text-white';

export function Footer({ m }: { m: ArenaModel }) {
  const { footer, contact } = m;
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const contactOn = isEnabled(contact);
  const email = contactOn ? text(contact, 'email') : '';
  const phone = contactOn ? text(contact, 'phone') : '';
  const address = contactOn ? text(contact, 'address') : '';
  const mail = mailHref(email);
  const tel = telHref(phone);
  const socials = SOCIAL_FIELDS.flatMap((s) => {
    const link = m.socials.find((item) => item.key === s.key);
    return link ? [{ ...s, href: link.href }] : [];
  });

  return (
    <footer data-tpl-tone="inverse" className={`${C.navyBg} text-white`}>
      <div className={`${CONTAINER} pb-10 pt-16 @3xl:pt-20`}>
        <div className="grid gap-12 @3xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="@3xl:col-span-2 @5xl:col-span-5">
            <Logo m={m} tone="dark" />
            {description && <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-white/70">{description}</p>}
            {socials.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2">
                {socials.map(({ key, label, Icon, href }) => (
                  <li key={key}>
                    <ActionLink
                      action={{ kind: 'external', href }}
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 ring-1 ring-inset ring-white/20 transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-transparent"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Navigasi footer" className="@5xl:col-span-3 @5xl:col-start-7">
              <p className={FOOT_LABEL}>Menu</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={FOOT_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(m.waAction || (email && mail) || (phone && tel) || address) && (
            <div className="@5xl:col-span-3">
              <p className={FOOT_LABEL}>Hubungi</p>
              <ul className="mt-4">
                {m.waAction && m.whatsapp && (
                  <li>
                    <ActionLink action={m.waAction} className={FOOT_LINK}>
                      <WhatsAppIcon className="h-4 w-4 shrink-0 text-(--tpl-accent)" />
                      <span className="sr-only">WhatsApp </span>
                      {m.whatsapp}
                    </ActionLink>
                  </li>
                )}
                {phone && tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className={FOOT_LINK}>
                      <Phone className="h-4 w-4 shrink-0 text-(--tpl-accent)" aria-hidden />
                      {phone}
                    </ActionLink>
                  </li>
                )}
                {email && mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className={`${FOOT_LINK} [overflow-wrap:anywhere]`}>
                      <Mail className="h-4 w-4 shrink-0 text-(--tpl-accent)" aria-hidden />
                      {email}
                    </ActionLink>
                  </li>
                )}
                {address && (
                  <li className="mt-2 flex gap-2 text-[14px] leading-relaxed text-white/70">
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-(--tpl-accent)" aria-hidden />
                    <span>{address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          {/* Ruang kanan untuk tombol WhatsApp melayang (pojok kanan bawah) agar tidak menutupi teks di ujung halaman */}
          <p className="pr-16 @3xl:pr-0">{copyright}</p>
          {text(footer, 'description') && m.tagline && <p className="pr-16 @3xl:pr-24">{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
