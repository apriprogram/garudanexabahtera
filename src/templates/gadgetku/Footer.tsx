// Footer GadgetKu: panel hitam membulat di dalam gutter (senada dengan hero) — kiri simbol + nama, deskripsi, tombol
// media sosial bulat; kolom "Belanja" (kategori → produk tersaring), "Bantuan" (menu halaman), dan "Hubungi kami";
// baris bawah metode pembayaran (chip), hak cipta, dan tagline. HP: 1 kolom, kolom tautan berdampingan.
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, list, mailHref, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { paymentMethods, productCategories, type GadgetkuModel, type Shop } from './model';

const COL_TITLE = 'text-[13px] font-semibold uppercase tracking-[0.12em] text-white';
const LINK = 'inline-flex min-h-10 items-center text-[15px] text-white/70 transition-colors hover:text-white';

export function Footer({ m, shop }: { m: GadgetkuModel; shop: Shop }) {
  const { footer, contact } = m;
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const socials = SOCIAL_FIELDS.flatMap((s) => {
    const link = m.socials.find((item) => item.key === s.key);
    return link ? [{ ...s, href: link.href }] : [];
  });
  const cardNames = list(m.categories, 'items', 6)
    .map((item) => field(item, 'title'))
    .filter(Boolean);
  const shopLinks = m.productsAction ? (cardNames.length > 0 ? cardNames : productCategories(m.productItems)).slice(0, 6) : [];
  const help = m.nav;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const reach = [
    { key: 'address', value: text(contact, 'address'), href: '' },
    { key: 'hours', value: text(contact, 'hours'), href: '' },
    { key: 'phone', value: phone, href: telHref(phone) },
    { key: 'email', value: email, href: mailHref(email) },
  ].filter((row) => row.value);
  const payments = paymentMethods(text(footer, 'payments'));

  return (
    <footer className="px-0 pb-3 @3xl:pb-5">
      <div className={CONTAINER}>
        <div data-tpl-tone="inverse" className="rounded-[28px] bg-[#0B0C0E] px-6 pb-8 pt-12 text-white @3xl:rounded-[36px] @3xl:px-10 @3xl:pt-16 @6xl:px-14">
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 @5xl:grid-cols-12 @5xl:gap-8">
            <div className="col-span-2 @5xl:col-span-4">
              <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-full">
                <Logo m={m} tone="light" />
              </ActionLink>
              {description && <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-white/70">{description}</p>}
              {socials.length > 0 && (
                <ul className="mt-7 flex flex-wrap gap-2" aria-label="Media sosial">
                  {socials.map(({ key, label, Icon, href }) => (
                    <li key={key}>
                      <ActionLink
                        action={{ kind: 'external', href }}
                        aria-label={label}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white transition-colors hover:bg-white/15"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {shopLinks.length > 0 && (
              <nav aria-label="Belanja per kategori" className="col-span-1 @5xl:col-span-2 @5xl:col-start-6">
                <p className={COL_TITLE}>Belanja</p>
                <ul className="mt-4">
                  {shopLinks.map((name) => (
                    <li key={name}>
                      <ActionLink action={{ kind: 'section', target: 'products' }} onNavigate={() => shop.pickCategory(name)} className={LINK}>
                        {name}
                      </ActionLink>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {help.length > 0 && (
              <nav aria-label="Tautan footer" className="col-span-1 @5xl:col-span-2">
                <p className={COL_TITLE}>Bantuan</p>
                <ul className="mt-4">
                  {help.map((item) => (
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
              <div className="col-span-2 min-w-0 @5xl:col-span-3">
                <p className={COL_TITLE}>Hubungi kami</p>
                <ul className="mt-4 space-y-2">
                  {reach.map((row) => (
                    <li key={row.key} className="text-[15px] leading-relaxed text-white/70 [overflow-wrap:anywhere]">
                      {row.href ? (
                        <ActionLink action={{ kind: 'external', href: row.href }} className="transition-colors hover:text-white">
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

          {payments.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center gap-2">
              <p className="mr-2 text-[13px] text-white/60">Pembayaran</p>
              <ul className="flex flex-wrap gap-2" aria-label="Metode pembayaran">
                {payments.map((method) => (
                  <li key={method} className="rounded-full px-3 py-1 text-[12.5px] font-medium text-white/85 ring-1 ring-inset ring-white/15">
                    {method}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-8">
            {/* Ruang kanan untuk tombol WhatsApp melayang (pojok kanan bawah) agar tidak menutupi teks di ujung halaman */}
            <p className="pr-16 @3xl:pr-0">{copyright}</p>
            {m.tagline && <p className="pr-16 @3xl:pr-24 @3xl:text-right">{m.tagline}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
