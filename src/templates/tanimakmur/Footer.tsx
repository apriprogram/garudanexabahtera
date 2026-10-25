// Footer TaniMakmur: bidang hijau paling gelap dengan sudut atas membulat — kiri simbol tunas + nama, deskripsi, tombol
// media sosial bulat; kolom "Belanja" (kategori → Produk terlaris dengan filter), "Jelajahi" (menu halaman), dan
// "Hubungi kami" (alamat, jam, telepon, email); baris bawah hak cipta + tagline. HP: 1 kolom, kolom tautan berdampingan.
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, isEnabled, list, mailHref, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { useShopFilter } from './hooks';
import { matchCategory, productCategories, type TaniModel } from './model';

const COL_TITLE = 'text-[13px] font-semibold uppercase tracking-[0.12em] text-white';
const LINK = 'inline-flex min-h-10 items-center text-[15px] text-white/75 transition-colors hover:text-white';

export function Footer({ m }: { m: TaniModel }) {
  const { footer, contact } = m;
  const { setCategory } = useShopFilter();
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const socials = SOCIAL_FIELDS.flatMap((s) => {
    const link = m.socials.find((item) => item.key === s.key);
    return link ? [{ ...s, href: link.href }] : [];
  });
  const productCats = isEnabled(m.products) ? productCategories(list(m.products, 'items')) : [];
  const shop = isEnabled(m.categories)
    ? list(m.categories, 'items', 6)
        .map((item) => field(item, 'title'))
        .filter(Boolean)
    : [];
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const reach = isEnabled(contact)
    ? [
        { key: 'address', value: text(contact, 'address'), href: '' },
        { key: 'hours', value: text(contact, 'hours'), href: '' },
        { key: 'phone', value: phone, href: telHref(phone) },
        { key: 'email', value: email, href: mailHref(email) },
      ].filter((row) => row.value)
    : [];

  return (
    <footer data-tpl-tone="inverse" className="mt-8 rounded-t-[32px] bg-[#13260E] text-white @3xl:mt-12 @3xl:rounded-t-[48px]">
      <div className={`${CONTAINER} pb-10 pt-14 @3xl:pt-20`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-full">
              <Logo m={m} tone="light" />
            </ActionLink>
            {description && <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-white/75">{description}</p>}
            {socials.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2" aria-label="Media sosial">
                {socials.map(({ key, label, Icon, href }) => (
                  <li key={key}>
                    <ActionLink
                      action={{ kind: 'external', href }}
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent)"
                    >
                      <span aria-hidden>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {shop.length > 0 && (
            <nav aria-label="Kategori belanja" className="col-span-1 @5xl:col-span-2 @5xl:col-start-6">
              <p className={COL_TITLE}>Belanja</p>
              <ul className="mt-4">
                {shop.map((name) => {
                  const match = matchCategory(productCats, name);
                  return (
                    <li key={name}>
                      <ActionLink
                        action={{ kind: 'section', target: match ? 'products' : 'categories' }}
                        onNavigate={match ? () => setCategory(match) : undefined}
                        className={LINK}
                      >
                        {name}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="col-span-1 @5xl:col-span-2">
              <p className={COL_TITLE}>Jelajahi</p>
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
            <div className="col-span-2 min-w-0 @5xl:col-span-3 @5xl:col-start-10">
              <p className={COL_TITLE}>Hubungi kami</p>
              <ul className="mt-4 space-y-2">
                {reach.map((row) => (
                  <li key={row.key} className="text-[15px] leading-relaxed text-white/75 [overflow-wrap:anywhere]">
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

        <div className="mt-14 flex flex-col gap-2 border-t border-white/15 pt-6 text-[13px] text-white/70 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-8">
          {/* Ruang kanan untuk tombol WhatsApp melayang (pojok kanan bawah) agar tidak menutupi teks di ujung halaman */}
          <p className="pr-16 @3xl:pr-0">{copyright}</p>
          {m.tagline && <p className="pr-16 @3xl:pr-24 @3xl:text-right">{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
