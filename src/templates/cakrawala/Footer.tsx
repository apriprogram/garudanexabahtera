// Footer Cakrawala: panel biru tinta membulat (inset, referensi Negmar/CBRLP). Atas: ajakan PPDB besar + tombol putih.
// Lalu empat kolom: logo + deskripsi + media sosial, menu, program keahlian (kode + nama), kontak singkat. Bawah: hak
// cipta otomatis dari nama sekolah dan tagline.
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, list, mailHref, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import type { CakrawalaModel } from './model';
import { BTN, DISPLAY, PANEL, PANEL_OUTER } from './styles';
import { PillLink } from './ui';

const COL_TITLE = 'text-[12.5px] font-semibold uppercase tracking-[0.14em] text-(--ck-bright)';
const COL_LINK = 'inline-flex min-h-9 items-center text-[14.5px] text-white/75 transition-colors hover:text-white';

export function Footer({ m }: { m: CakrawalaModel }) {
  const { footer, contact } = m;
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const ctaTitle = text(footer, 'cta_title');
  const ctaText = text(footer, 'cta_text');
  const ctaAction = m.linkOr(text(footer, 'cta_url'), m.ppdbAction);
  const programs = m.shown('programs') ? list(m.programs, 'items', 9).filter((item) => field(item, 'name') || field(item, 'code')) : [];
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const tel = telHref(phone);
  const mail = mailHref(email);

  return (
    <footer className="pb-2 @2xl:pb-3 @min-[96rem]:pb-4">
      <div className={PANEL_OUTER}>
        <div data-tpl-tone="inverse" className={`${PANEL.deep} pb-8 pt-14 @3xl:pt-16`}>
          {ctaTitle && (
            <Reveal className="flex flex-col gap-6 border-b border-white/10 pb-12 @4xl:flex-row @4xl:items-end @4xl:justify-between @4xl:gap-10">
              <div className="max-w-[640px]">
                <p className={`${DISPLAY} text-balance text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-white @3xl:text-[40px] @6xl:text-[46px]`}>{ctaTitle}</p>
                {ctaText && <p className="mt-4 max-w-[54ch] text-[15.5px] leading-relaxed text-white/75">{ctaText}</p>}
              </div>
              <PillLink action={ctaAction} label={text(footer, 'cta_label')} dot="accent" className={`${BTN.white} ${BTN.lg} shrink-0 self-start @4xl:self-auto`} />
            </Reveal>
          )}

          <div className="grid gap-10 pt-12 @2xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
            <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
              <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-[12px]" aria-label={`${m.companyName}, ke awal halaman`}>
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
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/10 transition-colors hover:bg-white hover:text-[#0D1830]"
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
                <p className={COL_TITLE}>{text(m.programs, 'eyebrow') || 'Program keahlian'}</p>
                <ul className="mt-4 grid gap-0.5">
                  {programs.map((item, i) => (
                    <li key={`${field(item, 'code')}-${i}`}>
                      <ActionLink
                        action={{ kind: 'section', target: 'programs' }}
                        className="flex items-baseline gap-2 py-1.5 text-[14.5px] leading-snug text-white/75 transition-colors hover:text-white"
                      >
                        {field(item, 'code') && <span className="w-11 shrink-0 text-[12.5px] font-semibold text-(--ck-bright)">{field(item, 'code')}</span>}
                        <span className="min-w-0">{field(item, 'name') || field(item, 'code')}</span>
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

          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between">
            <p>{copyright}</p>
            {m.tagline && <p>{m.tagline}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
