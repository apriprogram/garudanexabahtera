// Footer PayNow: pita MALAM INDIGO selebar layar dengan garis gradasi 2px di tepi atas. Atas: simbol + nama, deskripsi,
// tombol toko aplikasi kecil (kolom 1-5); MENU (kolom 7-9); MEDIA SOSIAL berupa tautan teks "Instagram ↗" (kolom 10-12,
// hanya yang diisi). Lalu KOTAK LEGAL bergaris ring (ikon info + teks legal dari CMS: nama badan usaha, izin, lembaga
// pengawas milik pemilik merek — demo menyatakan merek fiktif). Bawah: hak cipta otomatis + tagline.
import { ArrowUpRight, Download, Info } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SECTION_ANCHOR, text } from '../shared/utils';
import { Logo } from './Header';
import type { PaynowModel } from './model';
import { BTN } from './styles';

const COL_TITLE = 'text-[13px] font-semibold uppercase tracking-[0.12em] text-(--pn-glow)';
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-white/85 underline decoration-transparent underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60';

export function Footer({ m }: { m: PaynowModel }) {
  const { footer } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const legal = text(footer, 'legal');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="relative scroll-mt-[calc(var(--tpl-sticky-top,0px)+76px)] bg-(--pn-night) pb-8 pt-16 text-white @3xl:pt-20"
    >
      <div aria-hidden className="pn-grad absolute inset-x-0 top-0 h-0.5" />
      <div className={CONTAINER}>
        <div className="grid gap-x-8 gap-y-12 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center rounded-full" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-white/72">{description}</p>}
            {m.stores.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {m.stores.map((store) => (
                  <li key={store.key}>
                    <ActionLink action={{ kind: 'external', href: store.href }} className={`${BTN.ghost} ${BTN.md}`}>
                      <Download aria-hidden className="h-4 w-4 shrink-0" />
                      {store.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-3 @5xl:col-start-7">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={COL_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
                {m.contactAction && (
                  <li>
                    <ActionLink action={m.contactAction} className={COL_LINK}>
                      {m.headerLabel || 'Kontak'}
                    </ActionLink>
                  </li>
                )}
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

        {legal && (
          <p data-pn-legal="" className="mt-14 flex items-start gap-3 rounded-[20px] bg-white/[0.04] p-5 text-[14px] leading-relaxed text-white/80 ring-1 ring-inset ring-white/12 @3xl:mt-16">
            <Info aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-(--pn-glow)" />
            <span className="min-w-0">{legal}</span>
          </p>
        )}

        <div className={`${legal ? 'mt-8' : 'mt-14'} flex flex-col gap-2 border-t border-white/12 pt-6 text-[13px] text-white/65 @3xl:flex-row @3xl:items-center @3xl:justify-between`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
