// Footer HealthLink: kanvas abu dengan satu kartu putih besar (radius 28): logo + deskripsi + kotak ikon media sosial
// 44px di kiri, menu dua kolom di kanan; di bawah kartu catatan medis (bukan pengganti pemeriksaan langsung) dan hak
// cipta. Di HP ada ruang bawah tambahan agar bilah aksi melayang tidak menutupi teks terakhir.
import { CONTAINER } from '../shared/layout';
import { useTemplateRuntime } from '../shared/runtime';
import { SECTION_ANCHOR, text } from '../shared/utils';
import { SOCIAL_FIELDS } from '../shared/social';
import { Logo } from './Header';
import type { HealthLinkModel } from './model';
import { C, CARD } from './styles';
import { ActionLink } from '../shared/Shell';

const ICON_BY_KEY = new Map(SOCIAL_FIELDS.map((s) => [s.key, s.Icon] as const));

export function Footer({ m, dock }: { m: HealthLinkModel; dock: boolean }) {
  const { footer } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const disclaimer = text(footer, 'disclaimer');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      className={`scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] ${C.canvas} pt-6 ${dock ? 'pb-28 @3xl:pb-10' : 'pb-10'}`}
    >
      <div className={CONTAINER}>
        <div className={`grid gap-8 p-6 @3xl:p-8 @5xl:grid-cols-12 @5xl:gap-10 @5xl:p-10 ${CARD}`}>
          <div className="min-w-0 @5xl:col-span-6">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center rounded-xl" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className={`mt-4 max-w-[46ch] text-[15px] leading-relaxed ${C.muted}`}>{description}</p>}
            {m.socials.length > 0 && (
              <ul aria-label="Media sosial" className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = ICON_BY_KEY.get(s.key);
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F7FA] text-[#0E1B2B] ring-1 ring-inset ring-[#0E1B2B]/[0.06] transition-colors hover:bg-(--hl-tint) hover:text-(--hl-tint-ink)"
                      >
                        {Icon ? <Icon className="h-5 w-5" aria-hidden /> : s.label.slice(0, 2)}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-5 @5xl:col-start-8">
              <p className={`text-[13px] font-semibold ${C.muted}`}>Menu</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-6">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      className={`inline-flex min-h-11 items-center text-[15px] font-medium transition-colors hover:text-(--hl-solid) ${C.ink}`}
                    >
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        <div className={`mt-5 flex flex-col gap-2 px-1 text-[12.5px] leading-snug ${C.muted} @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-10`}>
          {disclaimer && <p className="max-w-[80ch]">{disclaimer}</p>}
          <p className="shrink-0">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
