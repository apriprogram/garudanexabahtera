// Footer Lawatan: pita HIJAU TUA (--lw-deep, inverse) selebar layar, garis airmail 6px di tepi atas. Atas: logo (krem) +
// deskripsi + catatan kecil (1-7) dan PERANGKO BESAR bergigi berisi rute + pin simbol Lawatan (tanpa bingkai perangkonya
// sendiri, jadi bukan perangko di dalam perangko) + cap pos (kanan, dekoratif). Garis
// rambut krem, lalu kolom Menu · Kontak · Media sosial (hanya yang diisi, tautan teks ↗). Bilah bawah: hak cipta
// otomatis + tagline.
import { ArrowUpRight } from 'lucide-react';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { LawatanMark } from './marks';
import { displayPhone, type LawatanModel } from './model';
import { Postmark } from './scenes';
import { C, LABEL_SM, WRAP } from './styles';

const COL_TITLE = `${LABEL_SM} ${C.onDarkMuted}`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-[#FBF6EE] underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-[#FBF6EE]/70 [overflow-wrap:anywhere]';

export function Footer({ m }: { m: LawatanModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
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
      className={`scroll-mt-[calc(var(--tpl-sticky-top,0px)+80px)] ${C.deep} ${C.onDark}`}
    >
      <div aria-hidden className="lw-airmail h-1.5" />
      <div className={`${WRAP} pb-8 pt-14 @3xl:pt-20`}>
        <div className="grid items-center gap-10 @3xl:grid-cols-12 @3xl:gap-8">
          <div className="min-w-0 @3xl:col-span-7">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[52ch] text-[16px] leading-relaxed ${C.onDarkMuted}`}>{description}</p>}
            {note && <p className={`mt-3 max-w-[52ch] text-[13px] leading-snug ${C.onDarkMuted}`}>{note}</p>}
          </div>
          {/* Perangko besar (dekoratif) */}
          <div aria-hidden className="relative hidden justify-self-end @3xl:col-span-5 @3xl:block">
            <span className="lw-perf lw-perf-lg block w-[168px] rotate-[-5deg] bg-[#FBF6EE] @5xl:w-[196px]">
              <span className="flex aspect-[5/6] flex-col items-center justify-center gap-3 rounded-[3px] bg-(--tpl-accent) text-(--tpl-on-accent)">
                <LawatanMark framed={false} className="h-20 w-20 @5xl:h-24 @5xl:w-24" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">{m.stampWord}</span>
              </span>
            </span>
            <Postmark className="absolute -bottom-5 -left-24 w-[170px] text-[#FBF6EE]/45" />
          </div>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-10 border-t border-[#FBF6EE]/15 pt-10 @2xl:grid-cols-2 @3xl:pt-12 @5xl:grid-cols-12 @7xl:gap-x-12">
          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-4">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6">
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
            <div className="min-w-0 @5xl:col-span-4">
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
            <div className="min-w-0 @5xl:col-span-4">
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-4 flex flex-wrap gap-x-6">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-[#FBF6EE]/60" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Ujung kanan dikosongkan sampai ≥ 8px di kiri tombol WhatsApp melayang Shell (demo & < 640px: 48px @ 16px dari tepi
            → 72px; situs ≥ 640px: 56px @ 32px → 96px dari tepi layar): tagline di dasar halaman tidak tertutup tombol itu */}
        <div className={`mt-14 flex flex-col gap-2 border-t border-[#FBF6EE]/15 pt-6 pr-13 text-[13px] @xl:pr-19 @2xl:pr-16 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:pr-[72px] ${C.onDarkMuted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
