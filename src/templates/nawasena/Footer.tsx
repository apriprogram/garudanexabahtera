// Footer Nawasena: pita navy selebar layar (lanjutan warna hero) sampai dasar halaman; isi di dalam CONTAINER. Atas:
// ajakan (judul serif + teks) dengan tombol bergaris putih. Lalu nama sekolah sebagai wordmark serif besar (hiasan,
// aria-hidden: tautan logo sudah menyebut namanya), empat kolom (logo + deskripsi + media sosial · menu "Jelajahi" ·
// tautan cepat dari CMS · kontak singkat), dan baris bawah: hak cipta otomatis + catatan kecil. Di halaman /berita,
// /pengumuman, dan tulisan footer yang sama tampil, tetapi bukan section (tautan section menuju "/#anchor" di beranda).
// Tautan cepat layanan yang alamatnya belum diisi (mis. E-Learning, PPID di demo) bukan tautan mati: tombol yang membuka
// catatan dari CMS di bawah daftar (tanpa catatan → tautan itu disembunyikan).
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useSubPage } from '../shared/posts/hooks';
import { useTemplateRuntime } from '../shared/runtime';
import { ActionLink } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, list, mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { LogoChip } from './Header';
import type { NawasenaModel } from './model';
import { DISPLAY, TYPE_N } from './styles';
import { ButtonLink } from './ui';

const COL_TITLE = `${TYPE_N.mono} text-(--nw-bright)`;
const COL_LINK = 'inline-flex min-h-11 items-center text-[14.5px] text-white/[0.78] transition-colors duration-300 hover:text-white';

export function Footer({ m }: { m: NawasenaModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const sub = useSubPage();
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const note = text(footer, 'note');
  const ctaTitle = text(footer, 'cta_title');
  const ctaText = text(footer, 'cta_text');
  const ctaAction = m.linkOr(text(footer, 'cta_url'), m.spmbAction);
  const linksTitle = text(footer, 'links_title');
  const linksNote = text(footer, 'links_note');
  const links = list(footer, 'links', 8)
    .map((item) => ({ label: field(item, 'label'), action: m.linkOr(field(item, 'url'), null), pending: !field(item, 'url') }))
    .filter((link) => link.label && (link.action || (link.pending && linksNote)));
  // Tautan layanan tanpa alamat yang sedang dibuka catatannya (indeks), atau null
  const [pendingOpen, setPendingOpen] = useState<number | null>(null);
  const noteId = useId();
  const openLabel = pendingOpen === null ? '' : (links[pendingOpen]?.label ?? '');
  const contactAction = m.linkOr('#kontak', null);
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);

  return (
    // Tujuan tautan "#footer" di beranda (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer
      data-tpl-section={sub ? undefined : 'footer'}
      id={preview || sub ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-(--nw-navy) pb-8 pt-14 text-white @3xl:pt-20"
    >
      <div className={CONTAINER}>
        {ctaTitle && (
          <Reveal className="flex flex-col gap-6 border-b border-white/10 pb-12 @4xl:flex-row @4xl:items-end @4xl:justify-between @4xl:gap-10 @3xl:pb-14">
            <div className="max-w-[720px]">
              <p className={`text-balance text-[30px] leading-[1.1] text-white @3xl:text-[36px] ${DISPLAY} font-normal`}>{ctaTitle}</p>
              {ctaText && <p className="mt-3 max-w-[56ch] text-[15.5px] leading-relaxed text-white/[0.72]">{ctaText}</p>}
            </div>
            <ButtonLink action={ctaAction} label={text(footer, 'cta_label')} variant="outlineWhite" size="lg" className="shrink-0 self-start @4xl:self-auto" />
          </Reveal>
        )}

        <p aria-hidden className={`mt-12 text-balance text-[length:clamp(36px,7.2cqi,112px)] leading-[0.95] tracking-[-0.01em] text-white @3xl:mt-16 ${DISPLAY} font-normal`}>
          {m.companyName}
        </p>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 @3xl:mt-14 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="col-span-2 min-w-0 @5xl:col-span-4">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex items-center gap-3 rounded-[8px]" aria-label={`${m.companyName}, ke awal halaman`}>
              <LogoChip logo={m.logo} className="h-11 w-11" />
              {m.tagline && <span className="text-[14px] font-medium leading-snug text-white/[0.86]">{m.tagline}</span>}
            </ActionLink>
            {description && <p className="mt-5 max-w-[40ch] text-[14.5px] leading-relaxed text-white/[0.72]">{description}</p>}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-[6px] text-white ring-1 ring-inset ring-white/20 transition-colors duration-300 hover:bg-white hover:text-(--nw-navy)"
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
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>Jelajahi</p>
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

          {links.length > 0 && (
            <div className="min-w-0 @5xl:col-span-3">
              {linksTitle && <p className={COL_TITLE}>{linksTitle}</p>}
              <ul className={`grid ${linksTitle ? 'mt-3' : ''}`}>
                {links.map((link, i) => (
                  <li key={`${link.label}-${i}`}>
                    {link.action ? (
                      <ActionLink action={link.action} className={COL_LINK}>
                        {link.label}
                      </ActionLink>
                    ) : (
                      <button
                        type="button"
                        aria-expanded={pendingOpen === i}
                        aria-controls={noteId}
                        onClick={() => setPendingOpen((open) => (open === i ? null : i))}
                        className={`${COL_LINK} text-left`}
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {linksNote && links.some((link) => !link.action) && (
                <p
                  id={noteId}
                  hidden={pendingOpen === null}
                  className="mt-3 max-w-[36ch] rounded-[6px] p-3 text-[13.5px] leading-relaxed text-white/[0.78] ring-1 ring-inset ring-white/15"
                >
                  {openLabel && <span className="font-semibold text-white">{openLabel}: </span>}
                  {linksNote}
                  {contactAction && (
                    <>
                      {' '}
                      <ActionLink action={contactAction} className="whitespace-nowrap font-medium text-white underline underline-offset-4 hover:text-(--nw-bright)">
                        Lihat kontak
                      </ActionLink>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {(address || phone || email || hours) && (
            <div className="col-span-2 min-w-0 @5xl:col-span-3">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-3 grid gap-1 text-[14.5px] leading-relaxed text-white/[0.78]">
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

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 @4xl:flex-row @4xl:items-start @4xl:justify-between @4xl:gap-10">
          <p className="shrink-0 text-[13px] text-white/[0.72]">{copyright}</p>
          {note && <p className="max-w-[72ch] text-[12.5px] leading-relaxed text-white/[0.64] @4xl:text-right">{note}</p>}
        </div>
      </div>
    </footer>
  );
}
