// Footer Saudagar: kertas krem dengan garis rambut di atas (bukan pita gelap). Nama perusahaan serif sangat besar di
// ATAS (sebuah <p>, bukan judul; logo unggahan tampil di atasnya), lalu kolom dipisah garis rambut tegak: simbol +
// deskripsi, menu, kontak, dan media sosial sebagai tautan teks berpanah (kolom kosong tidak dirender). Bawah: hak cipta
// otomatis + tagline. Menu dua kolom (footer tidak memanjang). HP: nama 44px, kolom bertumpuk dengan garis rambut
// mendatar.
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { mailHref, safeImage, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { SaudagarMark } from './marks';
import { keepRanges, type SaudagarModel } from './model';
import { C, SERIF } from './styles';

const COL_TITLE = `${SERIF} text-[18px] italic font-normal leading-snug ${C.ink}`;
const COL_LINK = `inline-flex min-h-10 items-center text-[14.5px] transition-colors duration-300 hover:text-[#221A13] ${C.muted}`;
const COL = 'min-w-0 py-8 @6xl:px-8 @6xl:first:pl-0 @6xl:last:pr-0';
/** Jumlah kolom layar lebar (@6xl; laptop kecil & tablet 2×2 agar alamat/email tidak terlipat) → kelas literal */
const GRID_COLS: Record<number, string> = { 1: '@6xl:grid-cols-1', 2: '@6xl:grid-cols-2', 3: '@6xl:grid-cols-3', 4: '@6xl:grid-cols-4' };

export function Footer({ m }: { m: SaudagarModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const logo = safeImage(m.logo);

  const columns: [string, ReactNode][] = [
    [
      'brand',
      <div key="brand" className={COL}>
        <SaudagarMark className="h-8 w-8 text-(--tpl-accent)" />
        {description && <p className={`mt-4 max-w-[36ch] text-[14.5px] leading-relaxed ${C.muted}`}>{description}</p>}
      </div>,
    ],
    [
      'menu',
      <nav key="menu" aria-label="Tautan footer" className={COL}>
        <p className={COL_TITLE}>Menu</p>
        <ul className="mt-3 columns-2 gap-x-6 [&>li]:break-inside-avoid">
          <li>
            <ActionLink action={{ kind: 'section', target: 'hero' }} className={COL_LINK}>
              Beranda
            </ActionLink>
          </li>
          {m.nav.map((item) => (
            <li key={item.key}>
              <ActionLink action={{ kind: 'section', target: item.key }} className={COL_LINK}>
                {item.label}
              </ActionLink>
            </li>
          ))}
        </ul>
      </nav>,
    ],
  ];
  if (address || phone || email || hours) {
    columns.push([
      'contact',
      <div key="contact" className={COL}>
        <p className={COL_TITLE}>Kontak</p>
        <ul className={`mt-3 grid gap-1 text-pretty text-[14.5px] leading-relaxed ${C.muted}`}>
          {address && <li className="pb-1">{address}</li>}
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
          {hours && <li className="pt-1">{keepRanges(hours)}</li>}
        </ul>
      </div>,
    ]);
  }
  if (m.socials.length > 0) {
    columns.push([
      'social',
      <div key="social" className={COL}>
        <p className={COL_TITLE}>Ikuti kami</p>
        <ul className="mt-3 grid">
          {m.socials.map((s) => (
            <li key={s.key}>
              <ActionLink action={{ kind: 'external', href: s.href }} className={`group gap-1.5 ${COL_LINK}`}>
                {s.label}
                <ArrowUpRight aria-hidden className="h-4 w-4 text-(--sg-ink) transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </ActionLink>
            </li>
          ))}
        </ul>
      </div>,
    ]);
  }

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      className={`scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] border-t bg-[#F7F2E8] pb-10 pt-16 @3xl:pt-20 ${C.line}`}
    >
      <div className={CONTAINER}>
        {logo && <img src={logo} alt="" className="mb-6 h-14 w-auto max-w-[220px] object-contain" />}
        <p className={`${SERIF} text-balance break-words text-[44px] font-normal leading-[0.95] tracking-[-0.03em] @3xl:text-[72px] @5xl:text-[104px] @min-[96rem]:text-[128px] ${C.ink}`}>
          {m.companyName}
        </p>

        <div
          className={`mt-12 grid divide-y border-y [&>*]:border-[#221A13]/[0.12] @3xl:grid-cols-2 @3xl:gap-x-8 @3xl:divide-y-0 @3xl:[&>*:nth-child(n+3)]:border-t @6xl:gap-x-0 @6xl:divide-x @6xl:[&>*:nth-child(n+3)]:border-t-0 ${GRID_COLS[columns.length]} ${C.line} ${C.divide}`}
        >
          {columns.map(([, node]) => node)}
        </div>

        <div className={`flex flex-col gap-2 pt-6 text-[13px] @3xl:flex-row @3xl:items-center @3xl:justify-between ${C.muted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
