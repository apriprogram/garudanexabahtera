// Footer HomeNest: pita HIJAU TUA (--hn-deep) selebar layar sampai dasar halaman. Atas: nama merek Cormorant SANGAT
// besar (dekoratif, aria-hidden: nama juga tertulis di logo di bawahnya), garis rambut krem. Lalu empat kolom: logo +
// deskripsi + catatan kecil (1-5), Menu (7-8), Kontak (9-10), Media sosial (11-12, hanya yang diisi, tautan teks ↗).
// Bilah bawah: hak cipta otomatis + tagline.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, wordmarkOf, type HomeNestModel } from './model';
import { C, LABEL_SM, TYPE } from './styles';

const COL_TITLE = `${LABEL_SM} ${C.onDeepMuted}`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-[#F4EFE4] underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-[#F4EFE4]/70 [overflow-wrap:anywhere]';

export function Footer({ m }: { m: HomeNestModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const wordmark = wordmarkOf(text(footer, 'wordmark'), m.companyName);
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+80px)] bg-(--hn-deep) pb-8 pt-14 text-[#F4EFE4] @3xl:pt-20"
    >
      <div className={CONTAINER}>
        <p aria-hidden className={`truncate pb-2 text-[#F4EFE4] ${TYPE.wordmark}`}>
          {wordmark}
        </p>

        <div className="mt-10 grid gap-x-8 gap-y-10 border-t border-[#F4EFE4]/15 pt-10 @2xl:grid-cols-2 @3xl:gap-y-12 @3xl:pt-12 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[46ch] text-[15px] leading-relaxed ${C.onDeepMuted}`}>{description}</p>}
            {note && <p className={`mt-4 max-w-[46ch] text-[13px] leading-snug ${C.onDeepMuted}`}>{note}</p>}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2 @5xl:col-start-6">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 @5xl:grid-cols-1">
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

          {(tel || mail || m.waAction) && (
            <div className="min-w-0 @5xl:col-span-3">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-4 grid gap-0.5">
                {tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className={`${COL_LINK} tabular-nums`}>
                      {displayPhone(phone)}
                    </ActionLink>
                  </li>
                )}
                {m.waAction && (
                  <li>
                    <ActionLink action={m.waAction} className={COL_LINK}>
                      WhatsApp
                    </ActionLink>
                  </li>
                )}
                {mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className={COL_LINK}>
                      {email}
                    </ActionLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {m.socials.length > 0 && (
            <div className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>Media sosial</p>
              {/* HP: satu baris berderet; layar lebar: daftar tegak */}
              <ul className="mt-4 flex flex-wrap gap-x-6 @5xl:grid @5xl:gap-0.5">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-[#F4EFE4]/60" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`mt-14 flex flex-col gap-2 border-t border-[#F4EFE4]/15 pt-6 text-[13px] @3xl:flex-row @3xl:items-center @3xl:justify-between ${C.onDeepMuted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
