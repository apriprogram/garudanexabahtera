// Footer Portline: pita navy selebar layar. Kiri (9 kolom): kolom tautan Company (menu), Group companies, Fleet, Media,
// Contact — diisi otomatis dari section yang tampil. Kanan: KOLOM MEREK sedikit lebih terang (--pl-deep-2) berisi logo,
// deskripsi, telepon, email, dan media sosial. Bawah: hak cipta otomatis dari nama perusahaan dan tagline. HP: kolom
// merek selebar layar di atas, kolom tautan 2 kolom.
import { Mail, Phone } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, list, mailHref, SECTION_ANCHOR, telHref, text, type LinkAction } from '../shared/utils';
import { Logo } from './Header';
import type { PortlineModel } from './model';
import { DISPLAY } from './styles';

const COL_TITLE = `${DISPLAY} text-[13px] font-bold uppercase tracking-[0.14em] text-(--pl-bright)`;
const COL_LINK = 'inline-flex min-h-9 items-center text-[14px] leading-snug text-white/75 transition-colors duration-300 hover:text-white';

interface Column {
  title: string;
  links: { label: string; action: LinkAction | null }[];
}

export function Footer({ m }: { m: PortlineModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || m.ui.rights(m.year, m.companyName);
  const tel = telHref(m.phone);
  const mail = mailHref(m.email);
  const to = (key: string) => m.sectionAction(key);

  const columns: Column[] = [
    { title: m.ui.footerCompany, links: m.nav.map((item) => ({ label: item.label, action: { kind: 'section', target: item.key } as LinkAction })) },
    {
      title: text(m.divisions, 'eyebrow') || m.ui.groupCompanies,
      links: list(m.hero, 'companies', 6)
        .map((item) => field(item, 'name'))
        .filter(Boolean)
        .map((label) => ({ label, action: to('divisions') })),
    },
    {
      title: text(m.fleet, 'eyebrow') || m.ui.nav.fleet,
      links: m.items('fleet').map((item) => ({ label: field(item, 'name'), action: to('fleet') })),
    },
    {
      title: m.ui.footerMedia,
      links: [
        { label: text(m.newsroom, 'title') || m.ui.nav.newsroom, action: to('newsroom') },
        { label: text(m.press, 'title'), action: to('press') },
        { label: text(m.leadership, 'title'), action: to('leadership') },
      ].filter((link) => link.label && link.action),
    },
    {
      title: m.ui.footerContact,
      links: list(contact, 'offices', 6)
        .map((item) => field(item, 'city'))
        .filter(Boolean)
        .map((label) => ({ label, action: to('contact') })),
    },
  ].filter((col) => col.links.length > 0);

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-(--pl-deep) text-white"
    >
      <div className={CONTAINER}>
        <div className="grid @5xl:grid-cols-12">
          {/* Kolom merek: di HP tampil pertama selebar layar, di layar lebar di kanan */}
          <div className="-mx-5 bg-(--pl-deep-2) px-5 py-12 @2xl:-mx-8 @2xl:px-8 @5xl:order-last @5xl:col-span-4 @5xl:mx-0 @5xl:px-9 @5xl:py-16 @7xl:col-span-3">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex" aria-label={`${m.companyName}, ${m.ui.toHome}`}>
              <Logo m={m} tone="light" />
            </ActionLink>
            {description && <p className="mt-5 max-w-[40ch] text-[14px] leading-relaxed text-white/80">{description}</p>}
            {(m.phone || m.email) && (
              <ul className="mt-6 grid gap-1 text-[14.5px]">
                {m.phone && (
                  <li>
                    {tel ? (
                      <ActionLink action={{ kind: 'external', href: tel }} className="inline-flex min-h-10 items-center gap-3 text-white hover:underline">
                        <Phone aria-hidden className="h-4 w-4 shrink-0" />
                        {m.phone}
                      </ActionLink>
                    ) : (
                      m.phone
                    )}
                  </li>
                )}
                {m.email && (
                  <li>
                    {mail ? (
                      <ActionLink action={{ kind: 'external', href: mail }} className="inline-flex min-h-10 items-center gap-3 text-white [overflow-wrap:anywhere] hover:underline">
                        <Mail aria-hidden className="h-4 w-4 shrink-0" />
                        {m.email}
                      </ActionLink>
                    ) : (
                      m.email
                    )}
                  </li>
                )}
              </ul>
            )}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-[4px] text-white ring-1 ring-inset ring-white/25 transition-colors duration-300 hover:bg-white hover:text-(--pl-deep)"
                      >
                        {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {columns.length > 0 && (
            <nav aria-label={m.ui.footerLinks} className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 @3xl:grid-cols-3 @5xl:col-span-8 @5xl:py-16 @5xl:pr-10 @7xl:col-span-9 @7xl:grid-cols-5">
              {columns.map((col) => (
                <div key={col.title} className="min-w-0">
                  <p className={COL_TITLE}>{col.title}</p>
                  <ul className="mt-4 grid gap-0.5">
                    {col.links.map((link, i) => (
                      <li key={`${link.label}-${i}`}>
                        {link.action ? (
                          <ActionLink action={link.action} className={COL_LINK}>
                            {link.label}
                          </ActionLink>
                        ) : (
                          <span className={COL_LINK}>{link.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[0.12] py-6 text-[13px] text-white/70 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
