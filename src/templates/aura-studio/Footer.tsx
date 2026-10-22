// Footer Aura Studio: putih bergaris rambut — monogram + nama + deskripsi + ikon sosial bergaris, menu kapital kecil,
// kontak, lalu nama usaha raksasa tipis (dekoratif) dan baris hak cipta.
import { Facebook, Instagram, Linkedin, Mail, Phone, Youtube } from 'lucide-react';
import type { CSSProperties } from 'react';
import { TikTokIcon, WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { isEnabled, mailHref, telHref, text } from '../shared/utils';
import type { AuraModel } from './model';
import { HAIR, INK, MUTED } from './styles';
import { Brand, Label } from './ui';

const ICONS = { instagram: Instagram, tiktok: TikTokIcon, facebook: Facebook, youtube: Youtube, linkedin: Linkedin } as const;

const FOOT_LINK = `inline-flex min-h-10 items-center gap-2 text-[14px] ${MUTED} transition-colors hover:text-[#1C1C1C]`;

export function Footer({ m }: { m: AuraModel }) {
  const { footer, contact } = m;
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const contactOn = isEnabled(contact);
  const email = contactOn ? text(contact, 'email') : '';
  const phone = contactOn ? text(contact, 'phone') : '';
  const whatsapp = text(contact, 'whatsapp');
  const mail = mailHref(email);
  const tel = telHref(phone);
  const hasContact = !!((email && mail) || (phone && tel) || (m.waAction && whatsapp));
  // Nama raksasa: ukuran huruf mengikuti panjang nama agar selalu satu baris selebar wadah
  const wordmarkStyle = { fontSize: `min(15cqw, ${(175 / Math.max(6, m.companyName.length)).toFixed(2)}cqw)` } as CSSProperties;

  return (
    <footer className={`border-t ${HAIR} bg-white`}>
      <div className={`${CONTAINER} pt-14 @3xl:pt-16 @5xl:pt-20`}>
        <div className="grid gap-10 @3xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="@3xl:col-span-2 @5xl:col-span-5">
            <Brand name={m.companyName} logo={m.logo} nameClassName="max-w-[22ch]" />
            {description && <p className={`mt-5 max-w-[40ch] text-[14px] leading-relaxed ${MUTED}`}>{description}</p>}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = ICONS[s.key as keyof typeof ICONS];
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${INK} ring-1 ring-inset ring-black/15 transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-transparent`}
                      >
                        <Icon className="h-[17px] w-[17px]" />
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Navigasi footer" className="@5xl:col-span-3 @5xl:col-start-7">
              <Label>Menu</Label>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 @3xl:grid-cols-1">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      className={`inline-flex min-h-10 items-center text-[12px] font-medium uppercase tracking-[0.14em] ${INK} transition-opacity hover:opacity-60`}
                    >
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {hasContact && (
            <div className="@5xl:col-span-3">
              <Label>Kontak</Label>
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
                {phone && tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className={FOOT_LINK}>
                      <Phone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      {phone}
                    </ActionLink>
                  </li>
                )}
                {email && mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className={`${FOOT_LINK} [overflow-wrap:anywhere]`}>
                      <Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      {email}
                    </ActionLink>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <p aria-hidden className="mt-14 select-none overflow-hidden whitespace-nowrap font-[family-name:var(--tpl-font-display)] font-light uppercase leading-[0.9] tracking-[-0.01em] text-[#E9E9E6] @3xl:mt-20" style={wordmarkStyle}>
          {m.companyName}
        </p>

        <div className={`mt-6 flex flex-col gap-2 border-t ${HAIR} py-6 @3xl:flex-row @3xl:items-center @3xl:justify-between`}>
          <p className="text-[13px] text-[#6B6B6B]">{copyright}</p>
          {text(footer, 'description') && m.tagline && <p className="text-[13px] text-[#6B6B6B]">{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
