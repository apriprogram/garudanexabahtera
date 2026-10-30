// Footer Lajur: di atas, PITA AMBER selebar layar "Rombongan siap berangkat?" + kalimat + tombol tinta (ke bilah
// penawaran di hero), dengan tiga bilah livery miring besar di tepi kanannya. Lalu bagian TINTA (#14161A,
// data-tpl-tone="inverse"): logo (simbol amber) + deskripsi + catatan, Menu, Kontak, Media sosial (ikon + nama), bilah
// hak cipta (tiga bilah livery di depannya) + tagline, dan garis warna tema 4px sebagai penutup halaman (sepasang dengan
// garis 4px di atas header). Semua tautan ≥ 44px.
import { ArrowUpRight } from 'lucide-react';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type LajurModel } from './model';
import { C, DISPLAY, LABEL_SM, WRAP } from './styles';
import { ButtonLink, LiveryBars } from './ui';

const COL_TITLE = `${LABEL_SM} text-white/60`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] text-white underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-(--lj-bright) [overflow-wrap:anywhere]';

export function Footer({ m }: { m: LajurModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const ctaTitle = text(footer, 'cta_title');
  const ctaText = text(footer, 'cta_text');
  const ctaAction = m.linkOr(text(footer, 'cta_url'), m.quoteAction);
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const icons = new Map(SOCIAL_FIELDS.map((s) => [s.key, s.Icon] as const));

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+80px)] bg-[#14161A] text-white"
    >
      {ctaTitle && (
        <div className="relative isolate overflow-hidden bg-(--tpl-accent) text-(--tpl-on-accent)">
          <svg aria-hidden focusable="false" viewBox="0 0 300 160" preserveAspectRatio="xMaxYMid slice" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-[42%] @3xl:block">
            <path d="M120 160 186 0h40l-66 160zM180 160 246 0h40l-66 160zM240 160 306 0h40l-66 160z" fill="#14161A" fillOpacity={0.12} />
          </svg>
          <div className={`${WRAP} flex flex-col gap-6 py-10 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-10 @3xl:py-12`}>
            <div className="min-w-0">
              <p className={`${DISPLAY} max-w-[22ch] text-balance text-[26px] font-bold leading-[1.1] tracking-[-0.02em] @3xl:text-[34px] @6xl:text-[40px]`}>{ctaTitle}</p>
              {ctaText && <p className="mt-3 max-w-[56ch] text-[15px] leading-snug opacity-80 @3xl:text-[16px]">{ctaText}</p>}
            </div>
            <ButtonLink action={ctaAction} label={text(footer, 'cta_label')} variant="ink" className="w-full shrink-0 @xl:w-auto" />
          </div>
        </div>
      )}

      <div className={`${WRAP} pt-14 @3xl:pt-16`}>
        <div className="grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            {/* max-w-full + min-w-0: nama usaha CMS yang panjang dipotong (…) di dalam kolom; dulu tautan inline-flex
                selebar namanya sehingga di HP 320–390px nama ±35 huruf melebarkan halaman (bisa digeser ke samping) */}
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 min-w-0 max-w-full items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[46ch] text-[15px] leading-relaxed ${C.onInkMuted}`}>{description}</p>}
            {note && <p className="mt-4 max-w-[46ch] text-[13px] leading-snug text-white/60">{note}</p>}
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
                    <ActionLink action={{ kind: 'external', href: tel }} className={`${COL_LINK} font-mono tabular-nums`}>
                      {displayPhone(phone)}
                    </ActionLink>
                  </li>
                )}
                {m.waAction && (
                  <li>
                    <ActionLink action={m.waAction} className={COL_LINK}>
                      WhatsApp admin
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
              <ul className="mt-4 flex flex-wrap gap-x-5 @5xl:grid @5xl:gap-0.5">
                {m.socials.map((s) => {
                  const Icon = icons.get(s.key);
                  return (
                    <li key={s.key}>
                      <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                        {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 text-(--lj-bright)" />}
                        {s.label}
                        <ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/50" />
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Ujung kanan dikosongkan sampai ≥ 8px di kiri tombol WhatsApp melayang Shell (demo & < 640px: 48px @ 16px dari tepi
            → 72px; situs ≥ 640px: 56px @ 32px → 96px dari tepi layar), jadi hak cipta & tagline di dasar halaman tidak
            tertutup tombol itu saat digulir sampai habis (@3xl dulu 56px: tagline tepat di tepi tombol di 768–1023px) */}
        <div className="mt-14 flex flex-col gap-2 border-t border-white/15 py-6 pr-13 text-[13px] text-white/60 @xl:pr-19 @2xl:pr-16 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p className="flex items-center gap-3">
            <LiveryBars className="h-3 w-[22px]" fill="fill-(--lj-bright)" />
            {copyright}
          </p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
      {/* Penutup halaman: garis warna tema 4px, pasangan garis 4px di atas header (bukan pita belang) */}
      <div aria-hidden className="h-1 bg-(--tpl-accent)" />
    </footer>
  );
}
