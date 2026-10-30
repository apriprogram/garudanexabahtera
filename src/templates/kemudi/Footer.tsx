// Footer Kemudi: pita GRAFIT selebar layar sampai dasar halaman. Atas: baris ajakan besar "Butuh mobil hari ini?"
// (Hanken 700) + nomor telepon mono besar (tel:) + tombol putih "Chat WhatsApp"; garis rambut putih 10%. Lalu kolom:
// logo + deskripsi + catatan kecil (1-4), Menu (5-6), Kontak (8-10), Media sosial (11-12, hanya yang diisi) — kolom
// tautan mulai di 5, 8, 11 (jarak sama). Bilah bawah: hak cipta otomatis + tagline (tidak tertutup tombol WhatsApp
// melayang). Semua tautan ≥ 44px.
import { ArrowUpRight, MessageCircle, Phone } from 'lucide-react';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type KemudiModel } from './model';
import { BTN, C, DISPLAY, MONO, MONO_LABEL, WRAP } from './styles';

const COL_TITLE = `${MONO_LABEL} text-white/55`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-white/90 underline decoration-transparent underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/60 [overflow-wrap:anywhere]';

export function Footer({ m }: { m: KemudiModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const ctaTitle = text(footer, 'cta_title');
  const ctaLabel = text(footer, 'cta_label') || 'Chat admin';
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-[#161B22] pb-8 text-white"
    >
      {ctaTitle && (tel || m.waAction) && (
        <div className="border-b border-white/10">
          <div className={`${WRAP} flex flex-col gap-6 py-12 @3xl:py-16 @6xl:flex-row @6xl:items-center @6xl:justify-between`}>
            <p className={`${DISPLAY} max-w-[16ch] text-balance text-[36px] font-bold leading-[1.02] tracking-[-0.035em] @3xl:text-[52px] @6xl:text-[60px]`}>{ctaTitle}</p>
            <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:gap-4">
              {tel && (
                <ActionLink action={{ kind: 'external', href: tel }} className={`inline-flex min-h-14 items-center gap-3 rounded-2xl px-1 text-[24px] text-white transition-colors hover:text-(--km-bright) @3xl:text-[30px] ${MONO}`}>
                  <Phone aria-hidden className="h-6 w-6 shrink-0 text-(--km-bright)" strokeWidth={1.8} />
                  {displayPhone(phone)}
                </ActionLink>
              )}
              {m.waAction && (
                <ActionLink action={m.waAction} className={`${BTN.light} ${BTN.xl} w-full @xl:w-auto`}>
                  <MessageCircle aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  {ctaLabel}
                </ActionLink>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={WRAP}>
        <div className="grid gap-x-8 gap-y-10 pt-12 @2xl:grid-cols-2 @3xl:pt-14 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className={`mt-4 max-w-[46ch] text-[15px] leading-relaxed ${C.onDarkMuted}`}>{description}</p>}
            {note && <p className={`mt-3 max-w-[46ch] text-[13px] leading-snug ${C.onDarkMuted}`}>{note}</p>}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2 @5xl:col-start-5">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 @5xl:grid-cols-1">
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
            <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-8">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-3 grid">
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
            <div className="min-w-0 @5xl:col-span-2 @5xl:col-start-11">
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 @5xl:grid @5xl:gap-0">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-white/50" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tagline (rata kanan @3xl; di HP baris kedua) berhenti ≥ 8px di kiri tombol WhatsApp melayang di pojok kanan bawah:
            HP 72px dari tepi (tombol 48px @ 16px), 576–767px 96px (situs ≥ 640px: 56px @ 32px), @3xl 72px + tepi 32px */}
        <div className={`mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 pr-13 text-[13px] @xl:pr-19 @2xl:pr-16 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:pr-[72px] ${C.onDarkMuted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
