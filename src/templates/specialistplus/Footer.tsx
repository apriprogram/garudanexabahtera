// Footer SpecialistPlus: pita NAVY (--spx-navy) selebar layar, data-tpl-tone="inverse". Atas: simbol + nama,
// deskripsi, telepon & email mono (kolom 1-4); MENU (kolom 6-7); KLINIK (nama tab spesialis → membuka tab itu di
// bagian Spesialis; kolom 8-9); MEDIA SOSIAL tautan teks "Instagram ↗" (kolom 10-12, hanya yang diisi). Bawah: garis
// rambut, catatan medis (CMS), lalu bilah mono hak cipta otomatis + tagline.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { useTemplateRuntime } from '../shared/runtime';
import { ActionLink } from '../shared/Shell';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type SpxModel } from './model';
import { MONO_LABEL } from './styles';

const COL_TITLE = `${MONO_LABEL} text-(--spx-bright)`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-white/85 underline decoration-transparent underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60';

export function Footer({ m, onSelect }: { m: SpxModel; onSelect: (index: number) => void }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const disclaimer = text(footer, 'disclaimer');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const clinics = m.shown('specialists') ? m.specialties : [];

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+68px)] bg-(--spx-navy) pb-8 pt-16 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        <div className="grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-10">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center rounded-[6px]" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-white/72">{description}</p>}
            {(tel || mail) && (
              <ul className="mt-5 grid gap-0.5 font-mono text-[13.5px] text-white/80">
                {tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className="inline-flex min-h-11 items-center transition-colors hover:text-white">
                      {displayPhone(phone)}
                    </ActionLink>
                  </li>
                )}
                {mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className="inline-flex min-h-11 items-center transition-colors hover:text-white [overflow-wrap:anywhere]">
                      {email}
                    </ActionLink>
                  </li>
                )}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2 @5xl:col-start-6">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 @2xl:grid-cols-1">
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

          {clinics.length > 0 && (
            <div className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>Klinik</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 @2xl:grid-cols-1">
                {clinics.map((s) => (
                  <li key={s.index}>
                    <ActionLink action={{ kind: 'section', target: 'specialists' }} onNavigate={() => onSelect(s.index)} className={COL_LINK}>
                      {s.tab}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {m.socials.length > 0 && (
            <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-10">
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-3 grid gap-0.5">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-white/60" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {disclaimer && (
          <div className="mt-12 border-t border-white/15 pt-6 @3xl:mt-16">
            <p className="max-w-[90ch] text-pretty text-[13.5px] leading-relaxed text-white/72">{disclaimer}</p>
          </div>
        )}

        <div
          className={`flex flex-col gap-2 border-t border-white/15 pt-6 font-mono text-[12px] tracking-[0.02em] text-white/64 @3xl:flex-row @3xl:items-center @3xl:justify-between ${
            disclaimer ? 'mt-6' : 'mt-12 @3xl:mt-16'
          }`}
        >
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
