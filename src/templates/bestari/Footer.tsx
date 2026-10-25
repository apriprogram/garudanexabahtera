// Footer Bestari: pita cokelat malam selebar layar dari tepi kiri ke kanan sampai dasar halaman; isinya tetap di dalam
// CONTAINER. Atas: ajakan besar (judul + teks) dengan tombol pil putih + bulatan panah. Lalu empat kolom: logo +
// deskripsi + media sosial, menu, program unggulan, kontak singkat. Bawah: hak cipta otomatis dari nama sekolah dan
// tagline.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import type { BestariModel } from './model';
import { DISPLAY, EYEBROW } from './styles';
import { PillLink } from './ui';

const COL_TITLE = `${EYEBROW} text-(--bs-bright)`;
const COL_LINK = 'inline-flex min-h-9 items-center text-[14.5px] text-white/75 transition-colors duration-300 hover:text-white';

export function Footer({ m }: { m: BestariModel }) {
  const { footer, contact } = m;
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const ctaTitle = text(footer, 'cta_title');
  const ctaText = text(footer, 'cta_text');
  const ctaAction = m.linkOr(text(footer, 'cta_url'), m.ppdbAction);
  const programs = m.items('programs');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const { preview } = useTemplateRuntime();

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="bs-deep scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] pb-8 pt-14 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        {ctaTitle && (
          <Reveal className="flex flex-col gap-7 border-b border-white/[0.12] pb-12 @4xl:flex-row @4xl:items-end @4xl:justify-between @4xl:gap-10 @3xl:pb-16">
            <div className="max-w-[760px]">
              <p className={`${DISPLAY} text-balance text-[32px] font-medium leading-[1.05] tracking-[-0.035em] text-white @3xl:text-[48px] @6xl:text-[60px]`}>{ctaTitle}</p>
              {ctaText && <p className="mt-5 max-w-[54ch] text-[15.5px] leading-relaxed text-white/75">{ctaText}</p>}
            </div>
            <PillLink action={ctaAction} label={text(footer, 'cta_label')} variant="white" size="lg" className="shrink-0 self-start @4xl:self-auto" />
          </Reveal>
        )}

        <div className="grid gap-10 pt-12 @2xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-full" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="light" />
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
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.12] transition-colors duration-300 hover:bg-white hover:text-[#1C1917]"
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
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>Jelajahi</p>
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

          {programs.length > 0 && (
            <div className="min-w-0 @5xl:col-span-3">
              <p className={COL_TITLE}>{text(m.programs, 'eyebrow') || 'Program'}</p>
              <ul className="mt-4 grid gap-0.5">
                {programs.map((item, i) => (
                  <li key={`${field(item, 'name')}-${i}`}>
                    <ActionLink action={{ kind: 'section', target: 'programs' }} className={COL_LINK}>
                      {field(item, 'name')}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(address || phone || email) && (
            <div className="min-w-0 @5xl:col-span-3">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-4 grid gap-1 text-[14.5px] leading-relaxed text-white/75">
                {address && <li className="pb-1.5">{address}</li>}
                {phone && (
                  <li>
                    {tel ? (
                      <ActionLink action={{ kind: 'external', href: tel }} className={COL_LINK}>
                        {phone}
                      </ActionLink>
                    ) : (
                      phone
                    )}
                  </li>
                )}
                {email && (
                  <li>
                    {mail ? (
                      <ActionLink action={{ kind: 'external', href: mail }} className={`${COL_LINK} [overflow-wrap:anywhere]`}>
                        {email}
                      </ActionLink>
                    ) : (
                      email
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.12] pt-6 text-[13px] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
