// Footer Jumantara: pita kobalt-hitam selebar layar (data-tpl-tone="inverse"). Baris 1: logo + nama + tagline,
// deskripsi, media sosial (kotak 44px bergaris tipis); kolom tautan cepat (menu), layanan (ubin Layanan), dan kontak
// (alamat, telepon, email, jam layanan) — judul kolom dari CMS. Baris 2: nama sekolah besar selebar wadah (ukuran
// dihitung dari panjang nama, dekoratif). Baris 3: hak cipta (otomatis dari nama sekolah bila kosong) dan catatan kecil
// (mis. keterangan situs demo). Di halaman /berita, /pengumuman, dan tulisan footer yang sama tampil, tetapi bukan
// section (tautan section di dalamnya menuju "/#anchor" di beranda).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useSubPage } from '../shared/posts/hooks';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import type { JumantaraModel } from './model';
import { DISPLAY, LABEL } from './styles';
import { Brand } from './ui';

const COL_TITLE = `${LABEL} text-(--jm-bright)`;
const COL_LINK = 'inline-flex min-h-11 items-center text-[14.5px] text-white/72 transition-colors duration-200 hover:text-white';

export function Footer({ m }: { m: JumantaraModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const sub = useSubPage();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const note = text(footer, 'note');
  const services = m
    .items('services')
    .map((item) => ({ label: field(item, 'label'), action: m.linkOr(field(item, 'url'), m.sectionAction('services')) }))
    .filter((item) => item.label && item.action);
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const hasContact = [address, phone, email, hours].some(Boolean);
  // Nama besar: ukuran huruf dari panjang nama (± 0,49em rata-rata per huruf Onest 700, dihitung 0,52 agar nama berhuruf
  // lebar tetap muat) supaya selalu satu baris yang hampir memenuhi lebar wadah
  const chars = Math.max(8, m.companyName.length);
  const wordmark = { fontSize: `min(128px, ${(100 / (chars * 0.52)).toFixed(2)}cqi)` };

  return (
    // Tujuan tautan "#footer" di beranda (data-tpl-section + id di situs live), tetap landmark <footer>.
    <footer
      data-tpl-section={sub ? undefined : 'footer'}
      id={preview || sub ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-(--jm-night) pt-16 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        <div className="grid gap-10 @2xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 max-w-full items-center rounded-[10px]" aria-label={`${m.companyName}, ke awal halaman`}>
              <Brand m={m} tone="dark" markClassName="text-(--jm-bright)" />
            </ActionLink>
            {description && <p className="mt-5 max-w-[42ch] text-[14.5px] leading-relaxed text-white/72">{description}</p>}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-white/15 text-white transition-colors duration-200 hover:border-white/40 hover:bg-white/[0.06]"
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
            <nav aria-label={text(footer, 'links_title') || 'Tautan footer'} className="min-w-0 @5xl:col-span-2 @5xl:col-start-6">
              {text(footer, 'links_title') && <p className={COL_TITLE}>{text(footer, 'links_title')}</p>}
              <ul className="mt-4 grid grid-cols-2 gap-x-6 @2xl:grid-cols-1">
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

          {services.length > 0 && (
            <div className="min-w-0 @5xl:col-span-2">
              {text(footer, 'services_title') && <p className={COL_TITLE}>{text(footer, 'services_title')}</p>}
              <ul className="mt-4 grid grid-cols-2 gap-x-6 @2xl:grid-cols-1">
                {services.map((item, i) => (
                  <li key={`${item.label}-${i}`}>
                    <ActionLink action={item.action} className={COL_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasContact && (
            <div className="min-w-0 @5xl:col-span-3">
              {text(footer, 'contact_title') && <p className={COL_TITLE}>{text(footer, 'contact_title')}</p>}
              <ul className="mt-4 grid gap-1 text-[14.5px] leading-relaxed text-white/72">
                {address && <li className="pb-2">{address}</li>}
                {phone && <li>{tel ? <ActionLink action={{ kind: 'external', href: tel }} className={COL_LINK}>{phone}</ActionLink> : phone}</li>}
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

        <Reveal variant="fade" aria-hidden className="@container mt-14 border-t border-white/10 pt-8 @3xl:mt-16">
          <p className={`${DISPLAY} overflow-x-clip whitespace-nowrap pb-[0.08em] font-bold leading-[1.1] tracking-[-0.035em] text-white/90`} style={wordmark}>
            {m.companyName}
          </p>
        </Reveal>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 py-6 text-[13px] text-white/64 @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-10">
          <p className="shrink-0">{copyright}</p>
          {note && <p className="max-w-[72ch] text-[12.5px] leading-relaxed @3xl:text-right">{note}</p>}
        </div>
      </div>
    </footer>
  );
}
