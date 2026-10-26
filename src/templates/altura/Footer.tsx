// Footer Altura: panel zaitun gelap membulat di dalam gutter (sama dengan pita angka & proyek). Atas: logo + deskripsi +
// media sosial (lingkaran bergaris), lalu kolom tautan: menu, proyek unggulan, kantor, kontak. Bawah: hak cipta otomatis
// dari nama perusahaan + tagline, dan nama perusahaan raksasa yang samar (dekoratif, aria-hidden) terpotong di tepi bawah.
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import type { AlturaModel } from './model';
import { DISPLAY, OUTER } from './styles';

const COL_TITLE = 'text-[12px] font-semibold uppercase tracking-[0.16em] text-(--al-bright)';
const COL_LINK = 'inline-flex min-h-9 items-center text-[14.5px] text-white/75 transition-colors duration-300 hover:text-white';

/** Kata untuk wordmark raksasa: kata pertama nama bila ≥ 4 huruf (mis. "Altura"), selain itu nama lengkap. */
const wordmarkOf = (name: string): string => {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.replace(/[^\p{L}\p{N}]/gu, '').length >= 4 ? first : name.trim();
};

export function Footer({ m }: { m: AlturaModel }) {
  const { footer } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. All rights reserved.`;
  const developments = m.items('developments');
  const tel = telHref(m.phone);
  const mail = mailHref(m.email);
  const hours = text(m.contact, 'hours');
  const wordmark = wordmarkOf(m.companyName);
  // Ukuran wordmark: selebar isi footer (≈ 0,62em per huruf), paling besar 17% lebar template
  const fit = { fontSize: `min(17cqw, calc((100cqw - 40px) / ${(Math.max(4, wordmark.length) * 0.62).toFixed(2)}))` } as CSSProperties;

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] pb-2.5 pt-1.5 @2xl:pb-3 @5xl:pb-4 @5xl:pt-2"
    >
      <div className={OUTER}>
        <div className="relative isolate overflow-hidden rounded-[24px] bg-(--al-deep) text-white @3xl:rounded-[28px]">
          <div className={`${CONTAINER} pt-14 @3xl:pt-20`}>
            <div className="grid gap-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
              <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-3">
                <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-full" aria-label={`${m.companyName}, back to top`}>
                  <Logo m={m} tone="dark" />
                </ActionLink>
                {description && <p className="mt-5 max-w-[40ch] text-[14.5px] leading-relaxed text-white/70">{description}</p>}
                {m.socials.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {m.socials.map((s) => {
                      const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                      return (
                        <li key={s.key}>
                          <ActionLink
                            action={{ kind: 'external', href: s.href }}
                            aria-label={s.label}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/20 transition-colors duration-300 hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-transparent"
                          >
                            {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
                          </ActionLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {m.nav.length > 0 && (
                <nav aria-label="Footer" className="min-w-0 @5xl:col-span-2">
                  <p className={COL_TITLE}>Company</p>
                  <ul className="mt-4 grid gap-0.5">
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

              {developments.length > 0 && (
                <div className="min-w-0 @5xl:col-span-2">
                  <p className={COL_TITLE}>{text(m.developments, 'eyebrow') || 'Developments'}</p>
                  <ul className="mt-4 grid gap-0.5">
                    {developments.map((item, i) => (
                      <li key={`${field(item, 'name')}-${i}`}>
                        <ActionLink action={{ kind: 'section', target: 'developments' }} className={COL_LINK}>
                          {field(item, 'name')}
                        </ActionLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.offices.length > 0 && (
                <div className="min-w-0 @5xl:col-span-2">
                  <p className={COL_TITLE}>Offices</p>
                  <ul className="mt-4 grid gap-2 text-[14.5px] text-white/75">
                    {m.offices.map((office, i) => (
                      <li key={`${office.city}-${i}`} className="leading-snug">
                        <span className="block font-semibold text-white">{office.city}</span>
                        {office.label && <span className="block text-[13px] text-white/60">{office.label}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(tel || mail || hours) && (
                <div className="min-w-0 @5xl:col-span-3">
                  <p className={COL_TITLE}>Contact</p>
                  <ul className="mt-4 grid gap-0.5 text-[14.5px] text-white/75">
                    {tel && (
                      <li>
                        <ActionLink action={{ kind: 'external', href: tel }} className={COL_LINK}>
                          {m.phone}
                        </ActionLink>
                      </li>
                    )}
                    {mail && (
                      <li>
                        <ActionLink action={{ kind: 'external', href: mail }} className={`${COL_LINK} [overflow-wrap:anywhere]`}>
                          {m.email}
                        </ActionLink>
                      </li>
                    )}
                    {hours && <li className="pt-1.5 text-[13.5px] leading-snug text-white/60">{hours}</li>}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-14 flex flex-col gap-2 border-t border-white/[0.12] pt-6 text-[13px] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between">
              <p>{copyright}</p>
              {m.tagline && <p>{m.tagline}</p>}
            </div>
          </div>
          {/* Nama raksasa samar: dekoratif, terpotong di tepi bawah panel */}
          <Reveal variant="fade" aria-hidden className="pointer-events-none mt-6 select-none overflow-hidden">
            <p
              style={fit}
              className={`${DISPLAY} -mb-[0.22em] whitespace-nowrap text-center font-bold leading-[0.9] tracking-[-0.06em] text-white/[0.07]`}
            >
              {wordmark}
            </p>
          </Reveal>
        </div>
      </div>
    </footer>
  );
}
