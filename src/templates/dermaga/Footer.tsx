// Footer Dermaga: pita teal-hitam (--dm-deep) selebar layar sampai dasar halaman; isi di dalam CONTAINER. Atas: simbol +
// nama, deskripsi, dan baris kontak mono (kolom 1-5); MENU (kolom 7-9); MEDIA SOSIAL berupa tautan teks "Instagram ↗"
// (kolom 10-12, hanya yang diisi). Lalu nama perusahaan SANGAT besar (dekoratif, aria-hidden: nama sudah tertulis di
// atas) dan bilah bawah mono: hak cipta otomatis + tagline.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { wordmarkOf, type DermagaModel } from './model';
import { MONO_LABEL, TYPE_D } from './styles';

const COL_TITLE = `${MONO_LABEL} text-(--dm-bright)`;
const COL_LINK =
  'inline-flex min-h-10 items-center gap-1.5 text-[15px] text-white underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-white/70';

export function Footer({ m }: { m: DermagaModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
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
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-(--dm-deep) pb-8 pt-16 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        <div className="grid gap-x-8 gap-y-12 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-[2px]" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-white/70">{description}</p>}
            {(tel || mail) && (
              <ul className="mt-6 grid gap-0.5 font-mono text-[13.5px] text-white/70">
                {tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className="inline-flex min-h-9 items-center transition-colors hover:text-white">
                      {phone}
                    </ActionLink>
                  </li>
                )}
                {mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className="inline-flex min-h-9 items-center transition-colors hover:text-white [overflow-wrap:anywhere]">
                      {email}
                    </ActionLink>
                  </li>
                )}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-3 @5xl:col-start-7">
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

          {m.socials.length > 0 && (
            <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-10">
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-4 grid gap-0.5">
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

        <p aria-hidden className={`mt-14 border-t border-white/15 pt-8 text-(--dm-bright) @3xl:mt-20 @3xl:pt-10 ${TYPE_D.wordmark}`}>
          {wordmark}
        </p>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 font-mono text-[12px] tracking-[0.02em] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
