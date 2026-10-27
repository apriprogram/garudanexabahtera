// Footer NusaNiaga: putih dengan garis aksen 4px di tepi atas, banyak kolom di grid 12: simbol + nama, deskripsi, dan
// media sosial (lingkaran bergaris tipis) · Menu · Produk (5 produk pertama → bagian Produk) · Kontak singkat. Bawah:
// hak cipta otomatis dari nama perusahaan dan tagline, dipisah garis rambut. HP: satu kolom, Menu + Produk berdampingan.
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import type { NusaNiagaModel } from './model';
import { C, LINE } from './styles';

const COL_TITLE = `text-[13px] font-semibold ${C.ink}`;
const COL_LINK = 'inline-flex min-h-10 items-center text-[14.5px] text-[#4D5562] transition-colors duration-200 hover:text-[#141821]';

export function Footer({ m }: { m: NusaNiagaModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const products = m.shown('products') ? m.items('products').slice(0, 5) : [];
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const showContact = !!(address || phone || email);

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] border-t-4 border-(--tpl-accent) bg-white pb-8 pt-14 @3xl:pt-16"
    >
      <div className={CONTAINER}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 @5xl:grid-cols-12 @5xl:gap-x-8 @7xl:gap-x-12">
          <div className="col-span-2 min-w-0 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex max-w-full rounded-md" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[44ch] text-[14.5px] leading-relaxed ${C.muted}`}>{description}</p>}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ring-[#141821]/[0.12] transition-colors duration-200 hover:text-(--nn-ink) hover:ring-(--tpl-accent) ${C.ink}`}
                      >
                        {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-[6/8]">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid">
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

          {products.length > 0 && (
            <div className="min-w-0 @5xl:col-[8/10]">
              <p className={COL_TITLE}>{text(m.products, 'eyebrow') || 'Produk'}</p>
              <ul className="mt-3 grid">
                {products.map((item, i) => (
                  <li key={`${field(item, 'name')}-${i}`}>
                    <ActionLink action={{ kind: 'section', target: 'products' }} className={`${COL_LINK} py-1.5 leading-snug`}>
                      {field(item, 'name')}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showContact && (
            <div className="col-span-2 min-w-0 @5xl:col-[10/13]">
              <p className={COL_TITLE}>Kontak</p>
              <ul className={`mt-3 grid gap-1 text-[14.5px] leading-relaxed ${C.muted}`}>
                {address && <li className="pb-2 pt-1">{address}</li>}
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
              </ul>
            </div>
          )}
        </div>

        <div className={`mt-12 flex flex-col gap-2 border-t pt-6 text-[13px] @3xl:flex-row @3xl:items-center @3xl:justify-between @5xl:mt-14 ${LINE} ${C.subtle}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
