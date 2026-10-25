// Footer GlowStory: pita cokelat tua (seperti katalog referensi) — kiri simbol + nama krem, deskripsi, tombol media
// sosial bulat; kolom "Belanja" (menu halaman) dan "Bantuan" (WhatsApp, email, jam layanan); baris bawah hak cipta +
// tagline. HP: 1 kolom, kolom tautan berdampingan.
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { mailHref, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import type { GlowModel } from './model';
import { MONO } from './styles';

const LINK = 'inline-flex min-h-10 items-center text-[15px] text-[#F6F1EA]/75 transition-colors hover:text-[#F6F1EA]';

export function Footer({ m }: { m: GlowModel }) {
  const { footer, contact } = m;
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const socials = SOCIAL_FIELDS.flatMap((s) => {
    const link = m.socials.find((item) => item.key === s.key);
    return link ? [{ ...s, href: link.href }] : [];
  });
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const reach = [
    { key: 'whatsapp', value: m.whatsapp ? `WhatsApp ${m.whatsapp}` : '', href: m.waAction?.kind === 'external' ? m.waAction.href : '' },
    { key: 'phone', value: phone, href: telHref(phone) },
    { key: 'email', value: email, href: mailHref(email) },
    { key: 'hours', value: text(contact, 'hours'), href: '' },
  ].filter((row) => row.value);

  return (
    <footer data-tpl-tone="inverse" className="bg-[#2B211C] text-[#F6F1EA]">
      <div className={`${CONTAINER} pb-10 pt-14 @3xl:pt-20`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-full">
              <Logo m={m} tone="cream" />
            </ActionLink>
            {description && <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-[#F6F1EA]/75">{description}</p>}
            {socials.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2" aria-label="Media sosial">
                {socials.map(({ key, label, Icon, href }) => (
                  <li key={key}>
                    <ActionLink
                      action={{ kind: 'external', href }}
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F1EA]/10 text-[#F6F1EA] transition-colors hover:bg-[#F6F1EA]/20"
                    >
                      {/* Ikon dekoratif: nama media sosial sudah di aria-label tautan */}
                      <span aria-hidden className="flex">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="col-span-1 @5xl:col-span-3 @5xl:col-start-7">
              <p className={`${MONO} text-[#F6F1EA]/60`}>Belanja</p>
              <ul className="mt-4">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {reach.length > 0 && (
            <div className={`col-span-1 min-w-0 @5xl:col-span-3 ${m.nav.length === 0 ? '@5xl:col-start-7' : ''}`}>
              <p className={`${MONO} text-[#F6F1EA]/60`}>Bantuan</p>
              <ul className="mt-4 space-y-2">
                {reach.map((row) => (
                  <li key={row.key} className="text-[15px] leading-relaxed text-[#F6F1EA]/75 [overflow-wrap:anywhere]">
                    {row.href ? (
                      <ActionLink action={{ kind: 'external', href: row.href }} className="transition-colors hover:text-[#F6F1EA]">
                        {row.value}
                      </ActionLink>
                    ) : (
                      row.value
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-[#F6F1EA]/15 pt-6 text-[13px] text-[#F6F1EA]/60 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-8">
          {/* Ruang kanan untuk tombol WhatsApp melayang (pojok kanan bawah) agar tidak menutupi teks di ujung halaman */}
          <p className="pr-16 @3xl:pr-0">{copyright}</p>
          {m.tagline && <p className="pr-16 @3xl:pr-24 @3xl:text-right">{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
