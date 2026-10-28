// Footer MediCare General: pita biru tua (--mc-deep, warna tema digelapkan sampai putih ≥ 7:1) selebar layar. Atas: simbol
// + nama, deskripsi, dan catatan legal (kolom 1-5); MENU (kolom 6-8); KONTAK dengan lencana merah "IGD 24 jam" + nomor
// IGD, telepon informasi, email (kolom 9-10); MEDIA SOSIAL berupa tautan teks (kolom 11-12). Bilah bawah: hak cipta
// otomatis + tagline. HP: bertumpuk, menu dua kolom, media sosial sebaris.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { useTemplateRuntime } from '../shared/runtime';
import { ActionLink } from '../shared/Shell';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type MedicareModel } from './model';
import { T } from './styles';

const COL_TITLE = `${T.label} text-(--mc-bright)`;
const COL_LINK = `inline-flex min-h-12 items-center gap-1.5 text-white underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors hover:decoration-white/70 ${T.body}`;

export function Footer({ m }: { m: MedicareModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const hasContact = !!(m.igdAction || tel || mail);

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-(--mc-deep) pb-8 pt-16 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        <div className="grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @3xl:gap-y-12 @5xl:grid-cols-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-12 items-center rounded-[10px]" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[46ch] text-white/90 ${T.body}`}>{description}</p>}
            {note && <p className={`mt-4 max-w-[52ch] border-l-2 border-white/30 pl-4 text-white/80 ${T.small}`}>{note}</p>}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2 @5xl:col-start-6">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 @5xl:grid-cols-1">
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

          {hasContact && (
            <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-8">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-3 grid gap-1">
                {m.igdAction && (
                  <li className="flex flex-col items-start pb-1 pt-2">
                    <span className="inline-flex rounded-[6px] bg-[#B71C1C] px-2.5 py-1 text-[14px] font-bold text-white">{m.igdLabel}</span>
                    <ActionLink action={m.igdAction} className={`${COL_LINK} font-bold tabular-nums`}>
                      {displayPhone(m.igdPhone)}
                    </ActionLink>
                  </li>
                )}
                {tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} aria-label={`Telepon informasi ${displayPhone(phone)}`} className={`${COL_LINK} tabular-nums`}>
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
              </ul>
            </div>
          )}

          {m.socials.length > 0 && (
            <div className="min-w-0 @5xl:col-span-2 @5xl:col-start-11">
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 @5xl:grid @5xl:gap-0.5">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-white/70" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`mt-14 flex flex-col gap-2 border-t border-white/20 pt-6 text-white/80 @3xl:flex-row @3xl:items-center @3xl:justify-between ${T.small}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
