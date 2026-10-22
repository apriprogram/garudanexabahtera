// Footer Finova (brief §3.4 #10, §4.4): TERANG kaya multi-kolom di pita abu #F1F3F2 — kiri logo + deskripsi + tombol
// unduh (dari cta.*_store_url), lalu kolom tautan per `group` (footer.links), kolom "Media sosial" otomatis; baris
// bawah hak cipta + catatan kecil. HP: logo dulu, kolom tautan 2 kolom.
import { ArrowUpRight } from 'lucide-react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { list, text } from '../shared/utils';
import { StoreButtons } from './Closing';
import { Logo } from './Header';
import { linkGroups, type FinovaModel } from './model';
import { C } from './styles';

const COL_TITLE = 'text-[13px] font-semibold uppercase tracking-[0.12em] text-[#0B0F0E]';
const LINK = `inline-flex min-h-10 items-center gap-2 text-[15px] ${C.muted} transition-colors hover:text-[#0B0F0E]`;

export function Footer({ m }: { m: FinovaModel }) {
  const { footer } = m;
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const legal = text(footer, 'legal_note');
  const groups = linkGroups(list(footer, 'links', 16), m.contactAction);
  const socials = SOCIAL_FIELDS.flatMap((s) => {
    const link = m.socials.find((item) => item.key === s.key);
    return link ? [{ ...s, href: link.href }] : [];
  });
  const columns = groups.length + (socials.length > 0 ? 1 : 0);
  // Kolom tautan rata kanan di grid 12: lebar 2 (3–4 kolom) atau 3 (1–2 kolom), kolom pertama digeser ke awal yang pas
  const colSpan = columns >= 3 ? '@5xl:col-span-2' : '@5xl:col-span-3';
  const colStart = columns >= 4 ? '@5xl:col-start-5' : columns >= 2 ? '@5xl:col-start-7' : '@5xl:col-start-10';

  return (
    <footer className={`${C.surface} mt-10 @3xl:mt-16`}>
      <div className={`${CONTAINER} pb-10 pt-16 @3xl:pt-20`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 @3xl:grid-cols-4 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="col-span-2 @3xl:col-span-4 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex rounded-full">
              <Logo m={m} tone="light" />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[42ch] text-[15px] leading-relaxed ${C.muted}`}>{description}</p>}
            <div className="mt-7">
              <StoreButtons m={m} tone="light" />
            </div>
          </div>

          {groups.map((group, gi) => (
            <nav key={`${group.title}-${gi}`} aria-label={group.title} className={`${colSpan} ${gi === 0 ? colStart : ''}`}>
              <p className={COL_TITLE}>{group.title}</p>
              <ul className="mt-4">
                {group.links.map((link, li) => (
                  <li key={`${link.label}-${li}`}>
                    {link.action ? (
                      <ActionLink action={link.action} className={LINK}>
                        {link.label}
                      </ActionLink>
                    ) : (
                      <span className={LINK}>{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {socials.length > 0 && (
            <div className={`${colSpan} ${groups.length === 0 ? colStart : ''}`}>
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-4">
                {socials.map(({ key, label, Icon, href }) => (
                  <li key={key}>
                    <ActionLink action={{ kind: 'external', href }} className={`group ${LINK}`}>
                      <Icon className="h-4 w-4 shrink-0 text-(--tpl-accent-ink)" />
                      {label}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`mt-14 flex flex-col gap-2 border-t border-black/10 pt-6 text-[13px] ${C.muted} @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-8`}>
          <p>{copyright}</p>
          {legal && <p className="@3xl:max-w-[60ch] @3xl:text-right">{legal}</p>}
        </div>
      </div>
    </footer>
  );
}
