// Header pil melayang & footer Startup Clean. Logo: unggahan pembeli, atau simbol BloomMark + nama perusahaan.
import { ArrowRight, Mail, Menu, Phone, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { CONTAINER, FONT_DISPLAY } from '../shared/layout';
import { WhatsAppIcon } from '../shared/icons';
import { BloomMark } from '../shared/marks';
import { BrandMark } from '../shared/media';
import type { CompanyProfileModel } from '../shared/model';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { isEnabled, mailHref, safeUrl, telHref, text } from '../shared/utils';
import { ACCENT_FILL, BTN_SHAPE, orderNav } from './styles';

const NAME = `${FONT_DISPLAY} text-[15px] font-bold tracking-[-0.02em] text-fg @3xl:text-[17px]`;

function Logo({ m, className = '' }: { m: CompanyProfileModel; className?: string }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<BloomMark className="h-8 w-8 text-(--tpl-accent)" />}
      nameClassName={NAME}
      className={className}
    />
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header({ m }: { m: CompanyProfileModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = () => setOpen(false);
  const nav = orderNav(m.nav);
  // Tombol "Hubungi Kami" sudah menuju Kontak, jadi menu desktop tidak mengulangnya
  const desktopNav = m.contactAction ? nav.filter((item) => item.key !== 'contact') : nav;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-[var(--tpl-sticky-top,0px)] z-30 pt-3 @3xl:pt-4">
      <div className={CONTAINER}>
        <div className="rounded-[28px] bg-white/80 ring-1 ring-black/[0.06] backdrop-blur-md @3xl:rounded-[32px]">
          <div className="flex h-14 items-center justify-between gap-3 pl-4 pr-2 @3xl:h-16 @3xl:pl-5 @3xl:pr-3">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 rounded-full" onNavigate={close}>
              <Logo m={m} />
            </ActionLink>

            {desktopNav.length > 0 && (
              <nav aria-label="Menu utama" className="hidden items-center gap-0.5 @4xl:flex">
                {desktopNav.map((item) => (
                  <ActionLink
                    key={item.key}
                    action={{ kind: 'section', target: item.key }}
                    className="rounded-full px-4 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-fg"
                  >
                    {item.label}
                  </ActionLink>
                ))}
              </nav>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              {m.contactAction && (
                <ActionLink action={m.contactAction} className={`${BTN_SHAPE} ${ACCENT_FILL} hidden h-10 px-5 text-[14px] @xl:inline-flex`}>
                  Hubungi Kami
                </ActionLink>
              )}
              {nav.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  aria-controls={menuId}
                  aria-label={open ? 'Tutup menu' : 'Buka menu'}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors after:absolute after:-inset-1 hover:bg-black/[0.04] @4xl:hidden"
                >
                  {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                </button>
              )}
            </div>
          </div>

          {open && (
            <nav id={menuId} aria-label="Menu utama" className="flex flex-col border-t border-black/[0.06] px-3 pb-3 pt-2 @4xl:hidden">
              {nav.map((item) => (
                <ActionLink
                  key={item.key}
                  action={{ kind: 'section', target: item.key }}
                  onNavigate={close}
                  className="flex h-12 items-center justify-between rounded-2xl px-3 text-[15px] font-medium text-fg hover:bg-black/[0.04]"
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
                </ActionLink>
              ))}
              {m.contactAction && (
                <ActionLink action={m.contactAction} onNavigate={close} className={`${BTN_SHAPE} ${ACCENT_FILL} mt-2 flex h-12 w-full text-[15px] @xl:hidden`}>
                  Hubungi Kami
                </ActionLink>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOT_LABEL = 'text-[13px] font-semibold text-fg';
const FOOT_LINK = 'inline-flex min-h-10 items-center gap-2 text-[14px] text-muted transition-colors hover:text-(--tpl-accent-ink)';

export function Footer({ m }: { m: CompanyProfileModel }) {
  const { footer, contact } = m;
  const nav = orderNav(m.nav);
  const socials = SOCIAL_FIELDS.map((s) => ({ ...s, href: safeUrl(text(footer, s.key)) })).filter((s) => s.href);
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const email = isEnabled(contact) ? text(contact, 'email') : '';
  const phone = isEnabled(contact) ? text(contact, 'phone') : '';
  const whatsapp = text(contact, 'whatsapp');
  const mail = mailHref(email);
  const tel = telHref(phone);
  const hasContact = !!((email && mail) || (phone && tel) || (m.waAction && whatsapp));

  return (
    <footer className="border-t border-black/[0.06] bg-white">
      <div className={`${CONTAINER} py-14 @3xl:py-16 @5xl:py-20`}>
        <div className="grid gap-10 @3xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="max-w-sm @3xl:col-span-2 @5xl:col-span-5">
            <Logo m={m} />
            {description && <p className="mt-5 text-[15px] leading-relaxed text-muted">{description}</p>}
            {socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {socials.map(({ key, label, Icon, href }) => (
                  <li key={key}>
                    <ActionLink
                      action={{ kind: 'external', href: href! }}
                      aria-label={label}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted ring-1 ring-inset ring-black/[0.1] transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-transparent"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {nav.length > 0 && (
            <nav aria-label="Navigasi footer" className="@5xl:col-span-3 @5xl:col-start-7">
              <p className={FOOT_LABEL}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 @3xl:grid-cols-1">
                {nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={FOOT_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {hasContact && (
            <div className="@5xl:col-span-3">
              <p className={FOOT_LABEL}>Kontak</p>
              <ul className="mt-3">
                {m.waAction && whatsapp && (
                  <li>
                    <ActionLink action={m.waAction} className={FOOT_LINK}>
                      <WhatsAppIcon className="h-4 w-4 shrink-0" />
                      <span className="sr-only">WhatsApp </span>
                      {whatsapp}
                    </ActionLink>
                  </li>
                )}
                {email && mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className={`${FOOT_LINK} [overflow-wrap:anywhere]`}>
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                      {email}
                    </ActionLink>
                  </li>
                )}
                {phone && tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className={FOOT_LINK}>
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      {phone}
                    </ActionLink>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-black/[0.08] pt-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p className="text-[13px] text-subtle">{copyright}</p>
          {text(footer, 'description') && m.tagline && <p className="text-[13px] text-subtle">{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
