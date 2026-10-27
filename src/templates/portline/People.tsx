// Karier & pimpinan. Karier: banner foto kru bersudut kecil di dalam CONTAINER dengan lapisan navy dari kanan; isi di
// kanan (label, judul KAPITAL, paragraf, poin bidang karier bercentang, tombol ke formulir/lowongan, email rekrutmen).
// HP: foto 16:10 di atas, isi di bawah pada panel navy. Pimpinan: pita es, kartu foto 4:5 dengan nama, jabatan
// kapital, profil singkat, dan ikon LinkedIn (bila diisi).
import { Check, Linkedin, Mail } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, list, mailHref, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useEnquiry } from './context';
import { matchType, type PortlineModel } from './model';
import { PORTLINE_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_P } from './styles';
import { Button, SectionHead, SectionLabel } from './ui';

export function Careers({ m }: { m: PortlineModel }) {
  const { careers } = m;
  const { setPrefill } = useEnquiry();
  const image = text(careers, 'image');
  const points = list(careers, 'points', 6)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  const buttonUrl = text(careers, 'button_url');
  const action = m.linkOr(buttonUrl, m.startAction);
  const email = text(careers, 'email');
  const mail = mailHref(email);
  const photo = hasImage(image);
  return (
    <TemplateSection sectionKey="careers" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <Reveal variant="fade">
          <div data-tpl-tone="inverse" className="relative isolate overflow-hidden rounded-[8px] bg-(--pl-deep) text-white">
            {photo && (
              <>
                <KitPhoto
                  src={image}
                  alt={PORTLINE_PHOTOS.alt(image, text(careers, 'title') || m.companyName)}
                  sizes="(min-width: 1280px) 1500px, 100vw"
                  position="30% 40%"
                  className="relative aspect-[16/10] @5xl:absolute @5xl:inset-0 @5xl:-z-20 @5xl:aspect-auto"
                />
                <div aria-hidden className="absolute inset-0 -z-10 hidden bg-linear-to-l from-(--pl-deep) from-[30%] via-(--pl-deep)/80 via-[48%] to-(--pl-deep)/0 to-[78%] @5xl:block" />
              </>
            )}
            <div className={`relative p-6 @3xl:p-10 ${photo ? '@5xl:ml-auto @5xl:w-[54%] @5xl:py-16 @5xl:pl-0 @5xl:pr-14 @7xl:w-[48%] @7xl:pr-16' : '@5xl:p-14'}`}>
              {text(careers, 'eyebrow') && <SectionLabel tone="band">{text(careers, 'eyebrow')}</SectionLabel>}
              {text(careers, 'title') && <h2 className={`mt-4 max-w-[18ch] text-balance ${TYPE_P.h2}`}>{text(careers, 'title')}</h2>}
              {text(careers, 'text') && <p className={`mt-5 max-w-[52ch] text-pretty text-white/85 ${TYPE_P.lead}`}>{text(careers, 'text')}</p>}
              {points.length > 0 && (
                <ul className="mt-7 grid gap-x-6 gap-y-3 @xl:grid-cols-2">
                  {points.map((point, i) => (
                    <li key={`${point}-${i}`} className="flex items-start gap-3 text-[15px] leading-snug">
                      <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-(--tpl-accent) text-(--tpl-on-accent)">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
              {(text(careers, 'button_label') || mail) && (
                <div className="mt-8 flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:gap-6">
                  <Button
                    action={action}
                    label={text(careers, 'button_label')}
                    variant="primary"
                    onNavigate={() => {
                      if (!buttonUrl && action?.kind === 'section' && action.target === 'contact') setPrefill({ type: matchType(m.types, /career|karier|karir|job|recruit/i) });
                    }}
                  />
                  {mail && (
                    <ActionLink action={{ kind: 'external', href: mail }} className="group inline-flex min-h-11 items-center gap-2 text-[14.5px] font-medium text-white [overflow-wrap:anywhere]">
                      <Mail aria-hidden className="h-4 w-4 shrink-0" />
                      <span className="underline decoration-white/40 underline-offset-4 group-hover:decoration-white">{email}</span>
                    </ActionLink>
                  )}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

export function Leadership({ m }: { m: PortlineModel }) {
  const { leadership } = m;
  const items = m.items('leadership');
  return (
    <TemplateSection sectionKey="leadership" className={`bg-(--pl-ice) ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(leadership, 'eyebrow')} title={text(leadership, 'title')} subtitle={text(leadership, 'subtitle')} />
        <ul className={`mt-10 grid gap-x-5 gap-y-8 @xl:grid-cols-2 @3xl:mt-14 ${items.length >= 4 ? '@5xl:grid-cols-4' : '@5xl:grid-cols-3'}`}>
          {items.map((item, i) => {
            const name = field(item, 'name');
            const photo = field(item, 'photo');
            const linkedin = m.linkOr(field(item, 'linkedin'), null);
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="min-w-0">
                <article className="group">
                  {hasImage(photo) ? (
                    <KitPhoto
                      src={photo}
                      alt={PORTLINE_PHOTOS.alt(photo, name)}
                      fallback="none"
                      sizes="(min-width: 1024px) 24vw, (min-width: 576px) 46vw, 92vw"
                      position="50% 30%"
                      className="aspect-square rounded-[6px] @xl:aspect-[4/5]"
                      imgClassName="grayscale-[25%] transition-[filter,scale] duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
                    />
                  ) : (
                    <div aria-hidden className={`flex aspect-square items-center @xl:aspect-[4/5] justify-center rounded-[6px] bg-(--pl-ice-2) ${DISPLAY} text-[44px] font-bold text-(--pl-ink)`}>
                      {initials(name, 'P')}
                    </div>
                  )}
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={`${TYPE_P.h3} ${C.ink}`}>{name}</h3>
                      {field(item, 'role') && <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-(--pl-ink)">{field(item, 'role')}</p>}
                    </div>
                    {linkedin && (
                      <ActionLink
                        action={linkedin}
                        aria-label={m.ui.linkedin(name)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-white text-(--pl-deep) ring-1 ring-inset ring-(--pl-deep)/15 transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent)"
                      >
                        <Linkedin aria-hidden className="h-4 w-4" />
                      </ActionLink>
                    )}
                  </div>
                  {field(item, 'bio') && <p className={`mt-2.5 ${TYPE_P.small} ${C.body}`}>{field(item, 'bio')}</p>}
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
