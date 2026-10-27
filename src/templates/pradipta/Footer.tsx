// Footer Pradipta: TERANG. Atas pita selebar layar berisi ajakan (judul + teks) dan tombol (bawaan ke bagian SPMB),
// biru langit, atau putih bergaris tipis bila section terakhir di atasnya berpita langit; lalu footer putih 12 kolom: logo + deskripsi + media sosial bulat, "Jelajahi" (section yang tampil, urut
// halaman), dan "Kontak" (alamat, telepon, email, jam layanan). Bawah: garis tipis, hak cipta otomatis dan catatan
// kecil (mis. penafian demo). Di halaman /berita, /pengumuman, dan tulisan footer yang sama tampil, tetapi bukan section
// (tautan section di dalamnya menuju "/#anchor" di beranda).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useSubPage } from '../shared/posts/hooks';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import type { PradiptaModel } from './model';
import { C, DISPLAY } from './styles';
import { PillLink } from './ui';

const COL_TITLE = `${DISPLAY} text-[15px] font-semibold ${C.ink}`;
const COL_LINK = `inline-flex min-h-11 items-center text-[14.5px] transition-colors duration-200 hover:text-(--pd-ink) ${C.body}`;

export function Footer({ m }: { m: PradiptaModel }) {
  const { footer, contact } = m;
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}.`;
  const bandTitle = text(footer, 'band_title');
  const bandText = text(footer, 'band_text');
  const bandAction = m.linkOr(text(footer, 'band_url'), m.spmbAction);
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const { preview } = useTemplateRuntime();
  const sub = useSubPage();
  // Halaman /berita & tulisan: section beranda tidak tampil di atasnya → pita langit
  const bandTone = sub ? 'sky' : m.tone('footer');

  return (
    // Tujuan tautan "#footer" di beranda (data-tpl-section + id di situs live), tetap landmark <footer>. Halaman selain
    // beranda tidak punya section: "#footer" dari sana menuju "/#footer" di beranda.
    <footer
      data-tpl-section={sub ? undefined : 'footer'}
      id={preview || sub ? undefined : SECTION_ANCHOR.footer}
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-white"
    >
      {bandTitle && (
        // Nada pita = kebalikan section terakhir yang tampil (./model bandTones): tidak menyatu dengan pita langit di atasnya
        <div data-pd-band={bandTone} className={bandTone === 'sky' ? 'bg-(--pd-sky)' : 'border-t border-(--pd-ring) bg-white'}>
          <Reveal className={`${CONTAINER} flex flex-col gap-6 py-10 @3xl:py-12 @4xl:flex-row @4xl:items-center @4xl:justify-between @4xl:gap-10`}>
            <div className="min-w-0 max-w-[720px]">
              <p className={`${DISPLAY} text-balance text-[24px] font-semibold leading-tight tracking-[-0.02em] @3xl:text-[28px] ${C.ink}`}>{bandTitle}</p>
              {bandText && <p className={`mt-2 max-w-[60ch] text-pretty text-[15.5px] leading-relaxed ${C.body}`}>{bandText}</p>}
            </div>
            <PillLink action={bandAction} label={text(footer, 'band_label')} variant="primary" size="lg" className="w-full shrink-0 @xl:w-auto" />
          </Reveal>
        </div>
      )}

      <div className={CONTAINER}>
        <div className="grid gap-10 py-14 @2xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            {/* max-w-full: tautan inline-flex selebar nama sekolah; tanpa batas ini nama panjang tidak terpotong (truncate)
                dan halaman HP bergeser ke samping */}
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 max-w-full items-center rounded-[12px]" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[42ch] text-[14.5px] leading-relaxed ${C.body}`}>{description}</p>}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-(--pd-sky2) text-(--pd-ink) transition-colors duration-200 hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent)"
                      >
                        {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {m.footerLinks.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-3 @5xl:col-start-6">
              <p className={COL_TITLE}>Jelajahi</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6">
                {m.footerLinks.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={COL_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(address || phone || email || hours) && (
            <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @6xl:col-span-3 @6xl:col-start-10">
              <p className={COL_TITLE}>Kontak</p>
              <ul className={`mt-4 grid gap-1 text-[14.5px] leading-relaxed ${C.body}`}>
                {address && <li className="pb-2">{address}</li>}
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
                {hours && <li className="pt-1">{hours}</li>}
              </ul>
            </div>
          )}
        </div>

        <div className={`flex flex-col gap-2 border-t border-black/[0.07] py-6 text-[13px] @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-8 ${C.muted}`}>
          <p className="shrink-0">{copyright}</p>
          {note && <p className="max-w-[70ch] text-[12.5px] leading-relaxed @3xl:text-right">{note}</p>}
        </div>
      </div>
    </footer>
  );
}
