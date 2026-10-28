// Footer Sparring Padel: pita biru-malam sampai dasar halaman. Atas: simbol + nama, deskripsi, ikon media sosial bulat
// (kolom 1-5); MENU (kolom 7-8); KONTAK (WhatsApp, telepon, email, alamat; kolom 9-12) dan tombol Book Now neon. Lalu
// GARIS LAPANGAN neon statis selebar wadah (garis belakang, garis servis, net di tengah — dekoratif), dan bilah bawah
// mono: hak cipta otomatis + catatan jujur dari CMS.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type SparringModel } from './model';
import { BTN, MONO_LABEL } from './styles';
import { ArrowDot } from './ui';

const COL_TITLE = `${MONO_LABEL} text-[11px] text-(--sp-neon)`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-white/85 underline decoration-transparent underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60';

/** Garis lapangan dari atas (statis, dekoratif): kotak lapangan, dua garis servis, garis tengah, net. */
function CourtDivider() {
  return (
    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="h-12 w-full @3xl:h-14" aria-hidden focusable="false">
      <g fill="none" stroke="var(--sp-neon)" strokeOpacity={0.55} strokeWidth={1.5} vectorEffect="non-scaling-stroke">
        <rect x="1" y="1" width="1198" height="58" rx="2" />
        <path d="M210 1 V59 M990 1 V59 M210 30 H990" />
      </g>
      <path d="M600 -4 V64" stroke="var(--sp-neon)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Footer({ m }: { m: SparringModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const icons = new Map(SOCIAL_FIELDS.map((f) => [f.key, f.Icon]));

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] border-t border-white/10 bg-(--sp-night) pb-8 pt-16 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        <div className="grid gap-x-10 gap-y-12 @2xl:grid-cols-2 @5xl:grid-cols-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center rounded-full" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-white/72">{description}</p>}
            {m.socials.length > 0 && (
              <ul aria-label="Media sosial" className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = icons.get(s.key);
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-(--tpl-accent)"
                      >
                        <span aria-hidden className="flex">{Icon ? <Icon className="h-[18px] w-[18px]" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-3 @5xl:col-start-7">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={COL_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-10">
            <p className={COL_TITLE}>Kontak</p>
            <ul className="mt-4 grid gap-0.5">
              {m.waAction && m.whatsapp && (
                <li>
                  <ActionLink action={m.waAction} className={COL_LINK}>
                    WhatsApp {displayPhone(m.whatsapp)}
                  </ActionLink>
                </li>
              )}
              {tel && phone !== m.whatsapp && (
                <li>
                  <ActionLink action={{ kind: 'external', href: tel }} className={COL_LINK}>
                    {displayPhone(phone)}
                  </ActionLink>
                </li>
              )}
              {mail && (
                <li>
                  <ActionLink action={{ kind: 'external', href: mail }} className={`${COL_LINK} [overflow-wrap:anywhere]`}>
                    {email}
                  </ActionLink>
                </li>
              )}
              {address && <li className="pt-2 text-[14px] leading-snug text-white/65">{address}</li>}
            </ul>
            {m.headerAction && m.headerLabel && (
              <ActionLink action={m.headerAction} className={`${BTN.neon} mt-6 h-12 gap-2 pl-5 pr-1.5 text-[15px]`}>
                <span className="truncate">{m.headerLabel}</span>
                <ArrowDot className="h-9 w-9" />
              </ActionLink>
            )}
          </div>
        </div>

        <div className="mt-14 @3xl:mt-16">
          <CourtDivider />
        </div>

        <div className="mt-8 flex flex-col gap-2 font-mono text-[12px] tracking-[0.02em] text-white/60 @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-10">
          <p className="shrink-0">{copyright}</p>
          {note && <p className="max-w-[72ch] @3xl:text-right">{note}</p>}
        </div>
      </div>
    </footer>
  );
}
