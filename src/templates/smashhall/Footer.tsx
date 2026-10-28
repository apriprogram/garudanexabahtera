// Footer SmashHall: PUTIH dengan garis warna tema 4px di atasnya (bukan pita gelap). Atas: simbol + nama, deskripsi, dan
// tombol media sosial rounded-xl bergaris (kolom 1-5); MENU dua kolom (kolom 7-9); KONTAK & jam buka (kolom 10-12).
// Bilah bawah: hak cipta otomatis + tagline. Tanpa motif dekoratif: tidak ada garis yang melintasi teks kecil.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { useTemplateRuntime } from '../shared/runtime';
import { ActionLink } from '../shared/Shell';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type SmashModel } from './model';
import { C } from './styles';

const COL_TITLE = 'text-[12px] font-semibold uppercase tracking-[0.14em] text-[#5A564F]';
const COL_LINK = `inline-flex min-h-11 items-center gap-1.5 text-[15px] ${C.ink} underline decoration-transparent underline-offset-[6px] transition-colors hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)`;

export function Footer({ m }: { m: SmashModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const contactRows = [
    m.waAction && m.whatsapp ? { key: 'wa', label: `WhatsApp ${displayPhone(m.whatsapp)}`, href: '', action: m.waAction } : null,
    tel ? { key: 'tel', label: displayPhone(phone), href: tel, action: null } : null,
    mail ? { key: 'mail', label: email, href: mail, action: null } : null,
  ].filter((row): row is NonNullable<typeof row> => !!row);

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      className="relative scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] border-t-4 border-(--tpl-accent) bg-white pb-8 pt-14 @3xl:pt-16"
    >
      <div className={`${CONTAINER} relative`}>
        <div className="grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center rounded-xl" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[44ch] text-[15px] leading-relaxed ${C.muted}`}>{description}</p>}
            {m.socials.length > 0 && (
              <ul aria-label="Media sosial" className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink
                      action={{ kind: 'external', href: s.href }}
                      className={`inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[14px] font-medium ring-1 ring-inset ring-[#171512]/15 transition-colors hover:ring-(--tpl-accent) ${C.ink}`}
                    >
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-[#5A564F]" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-3 @5xl:col-start-7">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6">
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

          {(contactRows.length > 0 || hours) && (
            <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-10">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-3 grid">
                {contactRows.map((row) => (
                  <li key={row.key}>
                    <ActionLink action={row.action ?? { kind: 'external', href: row.href }} className={`${COL_LINK} [overflow-wrap:anywhere]`}>
                      {row.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
              {hours && <p className={`mt-3 text-[14.5px] leading-snug ${C.muted}`}>{hours}</p>}
            </div>
          )}
        </div>

        <div className={`mt-12 flex flex-col gap-2 border-t border-[#171512]/10 pt-6 text-[13px] @3xl:flex-row @3xl:items-center @3xl:justify-between ${C.muted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
