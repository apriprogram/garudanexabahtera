// Footer Nusaline: pita MIDNIGHT selebar layar sampai dasar halaman. Atas: "→ RUTE MALAM" — daftar rute huruf mono
// seperti papan keberangkatan (kode kota, nama rute, jam berangkat paling awal), tiap baris tautan ke tabel jadwal yang
// sekaligus menyaring rute itu. Lalu empat kolom: logo + deskripsi + catatan (1-4), Menu, Kontak, Media sosial (hanya
// yang diisi). Bilah bawah: hak cipta otomatis + tagline.
import { ArrowUpRight } from 'lucide-react';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { applyScheduleFilter, cityCode, displayPhone, formatClock, same, type NusalineModel, type RouteChip } from './model';
import { C, LABEL, LABEL_SM, MONO, WRAP } from './styles';

const COL_TITLE = `${LABEL_SM} ${C.onNightMuted}`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-white underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-white/70 [overflow-wrap:anywhere]';

export function Footer({ m, onRoute }: { m: NusalineModel; onRoute: (chip: RouteChip) => void }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const codeOf = (city: string) => m.stops.find((s) => same(s.city, city))?.code || cityCode(city);
  const routes = m.shown('schedule') ? m.chips : [];

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+80px)] bg-[#0B1026] pb-8 pt-14 text-white @3xl:pt-20"
    >
      <div className={WRAP}>
        {routes.length > 0 && (
          <nav aria-label="Rute malam">
            <p className={`flex items-center gap-2.5 ${LABEL} ${C.onNightMuted}`}>
              <span aria-hidden className={C.neon}>
                →
              </span>
              Rute malam
            </p>
            {/* 2 kolom sampai 1279px (3 kolom di 1024px memotong semua nama rute), 3 kolom ≥ 1280px, 4 kolom ≥ 1536px */}
            <ul className="mt-5 grid grid-cols-1 gap-x-8 border-t border-white/10 @2xl:grid-cols-2 @7xl:grid-cols-3 @min-[96rem]:grid-cols-4">
              {routes.map((chip) => {
                const first = applyScheduleFilter(m.departures, { from: chip.from, to: chip.to, cls: '' })[0];
                return (
                  <li key={chip.label} className="border-b border-white/10">
                    <ActionLink
                      action={{ kind: 'section', target: 'schedule' }}
                      onNavigate={() => onRoute(chip)}
                      aria-label={`Jadwal ${chip.from} ke ${chip.to}`}
                      className="group flex min-h-11 items-center gap-4 py-3.5"
                    >
                      <span aria-hidden className={`w-[104px] shrink-0 ${MONO} text-[15px] font-semibold text-white`}>
                        {codeOf(chip.from)} <span className={C.neon}>→</span> {codeOf(chip.to)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] text-white/80 transition-colors group-hover:text-white">
                        {chip.from} – {chip.to}
                      </span>
                      {first && <span className={`${MONO} text-[14px] ${C.neon}`}>{formatClock(first.depart)}</span>}
                    </ActionLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Grid 12: 1024–1279px logo 1-3 · Menu 5-6 · Kontak 7-9 (telepon & email satu baris) · Sosial 10-12;
            ≥ 1280px logo 1-4 · Menu 6-7 · Kontak 8-9 · Sosial 10-12 */}
        <div className={`grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-12 ${routes.length > 0 ? 'mt-14 @3xl:mt-16' : ''}`}>
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-3 @7xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[44ch] text-[15px] leading-relaxed ${C.onNightMuted}`}>{description}</p>}
            {note && <p className={`mt-4 max-w-[44ch] text-[13px] leading-snug ${C.onNightMuted}`}>{note}</p>}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2 @5xl:col-start-5 @7xl:col-start-6">
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
            <div className="min-w-0 @5xl:col-span-3 @7xl:col-span-2">
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
            <div className="min-w-0 @5xl:col-span-3">
              <p className={COL_TITLE}>Media sosial</p>
              {/* HP: berderet; layar lebar: daftar tegak */}
              <ul className="mt-4 flex flex-wrap gap-x-6 @5xl:grid @5xl:gap-0.5">
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

        {/* Ujung kanan dikosongkan sampai ≥ 8px di kiri tombol WhatsApp melayang Shell (demo & < 640px: 48px @ 16px dari tepi
            → 72px; situs ≥ 640px: 56px @ 32px → 96px dari tepi layar): tagline di dasar halaman tidak tertutup tombol itu */}
        <div className={`mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 pr-13 text-[13px] @xl:pr-19 @2xl:pr-16 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:pr-[72px] ${C.onNightMuted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
