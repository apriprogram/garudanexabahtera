// Footer Velora: bidang hampir hitam selebar layar. Atas: kalimat besar; kartu newsletter grafit (isian email → tombol
// yang MENYUSUN email berlangganan ke alamat perusahaan lewat aplikasi email pengunjung; tidak ada backend, tidak ada data
// yang disimpan). Lalu kolom: logo + deskripsi + media sosial, model, perusahaan (menu), kontak. Bawah: hak cipta
// otomatis dari nama perusahaan + tagline. Semua teks newsletter & judul kolom dari CMS (m.newsletter, *_title).
import { Check, CircleAlert, Mail } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, mailHref, SECTION_ANCHOR, telHref, text } from '../shared/utils';
import { Logo } from './Header';
import { veloraContent } from './defaultContent';
import { fillTokens, newsletterHref, validEmail, type VeloraModel } from './model';
import { DISPLAY } from './styles';
import { ArrowPill } from './ui';

const COL_TITLE = 'text-[13px] font-semibold text-white/60';
const COL_LINK = 'inline-flex min-h-9 items-center text-[14.5px] text-white/80 transition-colors duration-300 hover:text-white';

function Newsletter({ m }: { m: VeloraModel }) {
  const copy = m.newsletter;
  const baseId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState<string | null>(null);
  const { title, intro } = copy;
  if (!title || !mailHref(m.newsletterEmail)) return null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validEmail(value)) {
      setError(copy.error);
      return;
    }
    setError('');
    setReady(newsletterHref(m.newsletterEmail, m.companyName, value, copy));
  };

  return (
    <Reveal className="grid gap-6 rounded-[24px] bg-[#1B1D21] p-6 ring-1 ring-inset ring-white/[0.06] @3xl:p-8 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-10 @5xl:p-10">
      <div className="min-w-0 @5xl:col-span-6">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0D0E10]">
          <Mail className="h-5 w-5" />
        </span>
        <h2 id={`${baseId}-title`} className={`mt-5 ${DISPLAY} text-[26px] font-medium leading-tight tracking-[-0.025em] text-white @3xl:text-[32px]`}>
          {title}
        </h2>
        {intro && <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-white/70">{intro}</p>}
      </div>
      <div className="min-w-0 @5xl:col-span-6">
        {ready ? (
          <div role="status" className="rounded-[18px] bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10">
            <p className="flex items-center gap-2 text-[15px] font-medium text-white">
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-(--vl-red) text-(--vl-on-red)">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {copy.readyTitle}
            </p>
            {copy.readyText && (
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/70 [overflow-wrap:anywhere]">{fillTokens(copy.readyText, { company: m.companyName, email: value.trim() })}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ArrowPill action={{ kind: 'external', href: ready }} label={copy.open} variant="white" size="sm" />
              <button type="button" onClick={() => setReady(null)} className="inline-flex min-h-10 items-center text-[14px] font-medium text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white">
                {copy.change}
              </button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} aria-labelledby={`${baseId}-title`}>
            <label htmlFor={`${baseId}-email`} className="mb-2 block text-[13.5px] font-medium text-white/80">
              {copy.label}
            </label>
            <div className="flex flex-col gap-2.5 @xl:flex-row">
              <input
                id={`${baseId}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={120}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError('');
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${baseId}-error` : copy.note ? `${baseId}-note` : undefined}
                className={`h-12 w-full min-w-0 rounded-full bg-white/[0.06] px-5 text-[16px] text-white ring-1 ring-inset focus:outline-none @xl:w-auto @xl:flex-1 focus-visible:outline-none focus:ring-2 focus:ring-white @3xl:text-[15px] ${
                  error ? 'ring-[#F97066]' : 'ring-white/20'
                }`}
              />
              <button type="submit" className="h-12 shrink-0 rounded-full bg-white px-6 text-[15px] font-medium text-[#0D0E10] transition-colors duration-300 hover:bg-[#ECECEA]">
                {copy.button}
              </button>
            </div>
            {error ? (
              <p id={`${baseId}-error`} className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-[#FDA29B]">
                <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : (
              copy.note && (
                <p id={`${baseId}-note`} className="mt-2 text-[12.5px] leading-snug text-white/65">
                  {copy.note}
                </p>
              )
            )}
          </form>
        )}
      </div>
    </Reveal>
  );
}

export function Footer({ m }: { m: VeloraModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const statement = text(footer, 'statement');
  const description = text(footer, 'description');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. All rights reserved.`;
  const models = m.items('lineup');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const tel = telHref(phone);
  const mail = mailHref(email);
  // Judul kolom dari CMS; dikosongkan → judul demo agar kolom tetap punya nama
  const colTitle = (key: string) => text(footer, key) || String(veloraContent.footer[key] ?? '');

  return (
    <footer
      data-tpl-section="footer"
      id={preview ? undefined : SECTION_ANCHOR.footer}
      data-tpl-tone="inverse"
      className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-[#0D0E10] pb-8 pt-16 text-white @3xl:pt-24"
    >
      <div className={CONTAINER}>
        {statement && (
          <Reveal as="p" className={`mb-10 max-w-[18ch] text-balance ${DISPLAY} text-[38px] font-medium leading-[1.02] tracking-[-0.04em] text-white @3xl:mb-14 @3xl:text-[60px] @6xl:text-[80px]`}>
            {/* Titik aksen menggantikan titik terakhir kalimat */}
            {statement.replace(/[.。]\s*$/, '')}
            <span aria-hidden className="ml-[0.06em] inline-block h-[0.16em] w-[0.16em] rounded-full bg-(--vl-red) align-baseline" />
          </Reveal>
        )}
        <Newsletter m={m} />

        <div className="grid gap-10 pt-14 @2xl:grid-cols-2 @5xl:grid-cols-12 @5xl:gap-8">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-4">
            {/* Selebar kolom paling lebar (max-w-full + min-w-0): nama perusahaan panjang ("PT …") membungkus, tidak melebarkan halaman */}
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="flex w-fit min-w-0 max-w-full items-center rounded-full" aria-label={`${m.companyName}, back to top`}>
              <Logo m={m} wrap />
            </ActionLink>
            {description && <p className="mt-5 max-w-[40ch] text-[14.5px] leading-relaxed text-white/70">{description}</p>}
            {m.socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.12] transition-colors duration-300 hover:bg-white hover:text-[#0D0E10]"
                      >
                        {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {models.length > 0 && (
            <div className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>{colTitle('models_title')}</p>
              <ul className="mt-4 grid gap-0.5">
                {models.map((item, i) => (
                  <li key={`${field(item, 'name')}-${i}`}>
                    <ActionLink action={{ kind: 'section', target: 'lineup' }} className={COL_LINK}>
                      {field(item, 'name')}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {m.nav.all.length > 0 && (
            <nav aria-label="Footer links" className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>{colTitle('links_title')}</p>
              <ul className="mt-4 grid gap-0.5">
                {m.nav.all.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={COL_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(address || phone || email) && (
            <div className="min-w-0 @5xl:col-span-4">
              <p className={COL_TITLE}>{colTitle('contact_title')}</p>
              <ul className="mt-4 grid gap-1 text-[14.5px] leading-relaxed text-white/80">
                {address && <li className="max-w-[34ch] pb-1.5">{address}</li>}
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
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-white/60 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
