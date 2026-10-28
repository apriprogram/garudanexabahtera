// Footer MomKid: pita MINT selebar layar dengan tepi atas bergelombang (gelombang menempel di atas footer, di ruang
// bawah section sebelumnya). Atas: logo + deskripsi + media sosial berupa pil putih berikon (kolom 1-5), MENU (kolom
// 7-9), KONTAK (kolom 10-12: telepon, WhatsApp, email). Bawah: catatan kaki (mis. "contoh fiktif / bukan pengganti
// konsultasi dokter") dan hak cipta otomatis + tagline, dipisah garis putih. Tinta di atas mint ≥ 13:1.
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { SECTION_ANCHOR, mailHref, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { displayPhone, type MomkidModel } from './model';
import { C, DISPLAY } from './styles';
import { Wave } from './ui';

const COL_TITLE = `${DISPLAY} text-[15px] font-extrabold ${C.ink}`;
const COL_LINK = `inline-flex min-h-11 items-center gap-1.5 text-[15px] ${C.ink} underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#2E2228]/40`;

export function Footer({ m }: { m: MomkidModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const disclaimer = text(footer, 'disclaimer');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const contacts = [
    tel && { key: 'phone', label: displayPhone(phone), href: tel },
    m.waAction?.kind === 'external' && m.whatsapp && { key: 'wa', label: `WhatsApp ${displayPhone(m.whatsapp)}`, href: m.waAction.href },
    mail && { key: 'mail', label: email, href: mail },
  ].filter((c): c is { key: string; label: string; href: string } => !!c);

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      className="relative scroll-mt-[calc(var(--tpl-sticky-top,0px)+76px)] bg-[#DDF3EA] pb-8 pt-14 @3xl:pt-16"
    >
      <Wave tone="mint" position="top" />
      <div className={CONTAINER}>
        <div className="grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center rounded-full" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className={`mt-4 max-w-[44ch] text-[15px] leading-relaxed ${C.ink}`}>{description}</p>}
            {m.socials.length > 0 && (
              <ul aria-label="Media sosial" className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        className={`inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 ${DISPLAY} text-[14px] font-extrabold transition-colors hover:bg-[#FFF9F5] ${C.ink}`}
                      >
                        {Icon && (
                          <span aria-hidden className="flex">
                            <Icon className="h-4 w-4" />
                          </span>
                        )}
                        {s.label}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-3 @5xl:col-start-7">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6">
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

          {contacts.length > 0 && (
            <div className="min-w-0 @5xl:col-span-3 @5xl:col-start-10">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-3 grid">
                {contacts.map((c) => (
                  <li key={c.key}>
                    <ActionLink action={{ kind: 'external', href: c.href }} className={`${COL_LINK} [overflow-wrap:anywhere]`}>
                      {c.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`mt-12 grid gap-2 border-t-2 border-white pt-6 text-[13px] leading-snug ${C.ink} @3xl:mt-14`}>
          {disclaimer && <p className="max-w-[90ch]">{disclaimer}</p>}
          <div className="flex flex-col gap-1 @3xl:flex-row @3xl:items-center @3xl:justify-between">
            <p>{copyright}</p>
            {m.tagline && <p>{m.tagline}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
