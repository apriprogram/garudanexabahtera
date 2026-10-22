// Header lengket dan footer Corporate Nexa: logo perusahaan (unggahan pembeli, atau simbol bawaan template + nama),
// selebar CONTAINER seperti situs utama, datar dengan garis tipis.
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { StructureMark } from '../shared/marks';
import { BrandMark } from '../shared/media';
import type { CompanyProfileModel } from '../shared/model';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { mailHref, safeUrl, telHref, text } from '../shared/utils';
import { BTN_HEADER, BTN_PRIMARY, LINE } from './styles';

const Mark = () => <StructureMark className="h-8 w-8 text-(--tpl-accent)" />;

export function Header({ m }: { m: CompanyProfileModel }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const desktopNav = m.contactAction ? m.nav.filter((item) => item.key !== 'contact') : m.nav;
  const close = () => setOpen(false);

  return (
    <header className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-6 @5xl:h-[76px]`}>
        <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 rounded-lg" onNavigate={close}>
          <BrandMark name={m.companyName} logo={m.logo} mark={<Mark />} nameClassName="text-[15px] tracking-[-0.02em] text-fg @3xl:text-[17px]" />
        </ActionLink>

        {desktopNav.length > 0 && (
          <nav aria-label="Menu utama" className="hidden items-center gap-1 @5xl:flex">
            {desktopNav.map((item) => (
              <ActionLink
                key={item.key}
                action={{ kind: 'section', target: item.key }}
                className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-muted transition-colors hover:text-fg"
              >
                {item.label}
              </ActionLink>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {m.contactAction && (
            <ActionLink action={m.contactAction} className={`${BTN_HEADER} hidden @xl:inline-flex`}>
              Hubungi Kami
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </ActionLink>
          )}
          {m.nav.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-fg ring-1 ring-inset ring-black/[0.1] transition-colors hover:bg-alt @5xl:hidden"
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-black/[0.06] bg-white @5xl:hidden">
          <nav aria-label="Menu utama" className={`${CONTAINER} flex flex-col pb-5 pt-2`}>
            {m.nav.map((item, i) => (
              <ActionLink
                key={item.key}
                action={{ kind: 'section', target: item.key }}
                onNavigate={close}
                className={`flex h-14 items-center justify-between text-[17px] font-medium tracking-[-0.01em] text-fg ${
                  i < m.nav.length - 1 ? `border-b ${LINE}` : ''
                }`}
              >
                {item.label}
                <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
              </ActionLink>
            ))}
            {m.contactAction && (
              <ActionLink action={m.contactAction} onNavigate={close} className={`${BTN_PRIMARY} mt-4 w-full @xl:hidden`}>
                Hubungi Kami
              </ActionLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

const FOOTER_HEADING = 'text-[12px] font-semibold uppercase tracking-[0.16em] text-fg';
const FOOTER_LINK = 'inline-flex min-h-10 items-center text-[15px] text-muted transition-colors hover:text-(--tpl-accent-ink)';

export function Footer({ m }: { m: CompanyProfileModel }) {
  const { footer, contact } = m;
  const socials = SOCIAL_FIELDS.map((s) => ({ ...s, href: safeUrl(text(footer, s.key)) })).filter((s) => s.href);
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const hasContact = !!(address || phone || email);

  return (
    <footer className="border-t border-black/[0.06] bg-white">
      <div className={`${CONTAINER} grid gap-12 py-14 @3xl:grid-cols-12 @3xl:gap-8 @3xl:py-20`}>
        <div className="min-w-0 @3xl:col-span-12 @5xl:col-span-5">
          <BrandMark name={m.companyName} logo={m.logo} mark={<Mark />} nameClassName="text-[17px] tracking-[-0.02em] text-fg" />
          {description && <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-muted">{description}</p>}
          {socials.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2">
              {socials.map(({ key, label, Icon, href }) => (
                <li key={key}>
                  <ActionLink
                    action={{ kind: 'external', href: href! }}
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted ring-1 ring-inset ring-black/[0.1] transition-colors hover:text-(--tpl-accent-ink) hover:ring-(--tpl-accent-200)"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </ActionLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        {m.nav.length > 0 && (
          <nav aria-label="Navigasi footer" className="@3xl:col-span-6 @5xl:col-span-3 @5xl:col-start-7">
            <h3 className={FOOTER_HEADING}>Navigasi</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 @5xl:grid-cols-1">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink action={{ kind: 'section', target: item.key }} className={FOOTER_LINK}>
                    {item.label}
                  </ActionLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {hasContact && (
          <div className="min-w-0 @3xl:col-span-6 @5xl:col-span-3">
            <h3 className={FOOTER_HEADING}>Kontak</h3>
            <ul className="mt-4 space-y-1 text-[15px] leading-relaxed text-muted [overflow-wrap:anywhere]">
              {address && <li className="whitespace-pre-line py-2">{address}</li>}
              {phone && (
                <li>
                  {tel ? (
                    <ActionLink action={{ kind: 'external', href: tel }} className={FOOTER_LINK}>
                      {phone}
                    </ActionLink>
                  ) : (
                    <span className="inline-flex min-h-10 items-center">{phone}</span>
                  )}
                </li>
              )}
              {email && (
                <li>
                  {mail ? (
                    <ActionLink action={{ kind: 'external', href: mail }} className={FOOTER_LINK}>
                      {email}
                    </ActionLink>
                  ) : (
                    <span className="inline-flex min-h-10 items-center">{email}</span>
                  )}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-black/[0.06]">
        <div className={`${CONTAINER} flex flex-col gap-1.5 py-6 text-[13px] text-subtle @3xl:flex-row @3xl:items-center @3xl:justify-between`}>
          {/* Ruang kanan untuk tombol WhatsApp melayang (pojok kanan bawah) agar tidak menutupi teks di ujung halaman */}
          <p className="pr-16 @3xl:pr-0">{copyright}</p>
          {m.tagline && <p className="pr-16 @3xl:pr-24">{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
