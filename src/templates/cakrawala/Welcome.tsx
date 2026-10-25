// Sambutan kepala sekolah (kunci `welcome`) + profil, visi & misi (kunci `about`).
// Sambutan: foto tegak membulat dengan kartu nama di bawahnya (kaca putih), lalu label, H2, kutipan besar berikon kutip,
// isi sambutan, tanda tangan nama + jabatan, tombol ke Profil. Profil: panel abu membulat (inset) berisi foto sekolah
// dengan kartu "Berdiri sejak", profil singkat + poin centang, lalu kartu Visi (tint tema) dan Misi bernomor (putih).
import { Check, Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { CakrawalaModel } from './model';
import { CAKRAWALA_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, PANEL, PANEL_OUTER, SECTION_PAD, TYPE_C } from './styles';
import { Eyebrow, PillLink, SectionHead } from './ui';

const EYEBROW_SMALL = 'text-[12.5px] font-semibold uppercase tracking-[0.14em]';

export function Welcome({ m }: { m: CakrawalaModel }) {
  const { welcome } = m;
  const eyebrow = text(welcome, 'eyebrow');
  const title = text(welcome, 'title');
  const quote = text(welcome, 'quote');
  const body = paragraphs(text(welcome, 'body'));
  const name = text(welcome, 'name');
  const role = text(welcome, 'role');
  const photo = text(welcome, 'photo');
  if (!title && !quote && body.length === 0) return null;
  const action = m.linkOr(text(welcome, 'button_url'), m.sectionAction('about'));

  return (
    <TemplateSection sectionKey="welcome" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid items-center gap-10 @4xl:grid-cols-12 @5xl:gap-14`}>
        {hasImage(photo) && (
          <Reveal variant="fade" className="relative mx-auto w-full max-w-[460px] @4xl:col-span-5 @4xl:max-w-none">
            <KitPhoto
              src={photo}
              alt={CAKRAWALA_PHOTOS.alt(photo, name ? `Potret ${name}` : `Kepala ${m.companyName}`)}
              sizes="(min-width: 1280px) 520px, (min-width: 896px) 40vw, 92vw"
              className="aspect-[4/5] rounded-[24px]"
            />
            {(name || role) && (
              <div className="absolute inset-x-3 bottom-3 rounded-[18px] bg-white/[0.92] px-4 py-3 ring-1 ring-inset ring-black/[0.06] backdrop-blur-md @3xl:inset-x-4 @3xl:bottom-4">
                {name && <p className={`${DISPLAY} text-[16px] font-semibold leading-snug ${C.ink}`}>{name}</p>}
                {role && <p className={`text-[13px] ${C.muted}`}>{role}</p>}
              </div>
            )}
          </Reveal>
        )}
        <div className={`min-w-0 ${hasImage(photo) ? '@4xl:col-span-7' : '@4xl:col-span-12 @4xl:max-w-[820px]'}`}>
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[22ch] text-balance ${C.ink} ${TYPE_C.h2}`}>
              {title}
            </Reveal>
          )}
          {quote && (
            <Reveal as="blockquote" delay={140} className="relative mt-8 border-l-2 border-(--tpl-accent) pl-5 @3xl:pl-7">
              <Quote aria-hidden className="mb-3 h-7 w-7 fill-(--ck-tint) text-(--ck-ink)" strokeWidth={1.4} />
              <p className={`${DISPLAY} text-pretty text-[19px] font-medium leading-snug tracking-[-0.015em] ${C.ink} @3xl:text-[23px]`}>{quote}</p>
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={200} className={`mt-6 max-w-[62ch] space-y-4 ${TYPE_C.body} ${C.muted}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {((name && !hasImage(photo)) || action) && (
            <Reveal delay={260} className="mt-8 flex flex-col gap-5 @xl:flex-row @xl:items-center @xl:justify-between">
              {name && !hasImage(photo) && (
                <p className="min-w-0">
                  <span className={`block ${DISPLAY} text-[17px] font-semibold ${C.ink}`}>{name}</span>
                  {role && <span className={`block text-[14px] ${C.muted}`}>{role}</span>}
                </p>
              )}
              <PillLink action={action} label={text(welcome, 'button_label')} dot="white" className={`${BTN.ink} ${BTN.md} self-start @xl:self-auto`} />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function About({ m }: { m: CakrawalaModel }) {
  const { about } = m;
  const title = text(about, 'title');
  const body = paragraphs(text(about, 'body'));
  const image = text(about, 'image');
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');
  const points = list(about, 'points', 6).filter((item) => field(item, 'text'));
  const vision = text(about, 'vision');
  const missions = list(about, 'missions', 6).filter((item) => field(item, 'text'));
  if (!title && body.length === 0 && !vision && missions.length === 0) return null;

  return (
    <TemplateSection sectionKey="about" className="py-2">
      <div className={PANEL_OUTER}>
        <div className={`${PANEL.soft} ${SECTION_PAD}`}>
          <div className="grid items-center gap-10 @4xl:grid-cols-12 @5xl:gap-14">
            {hasImage(image) && (
              <Reveal variant="fade" className="relative @4xl:col-span-6">
                <KitPhoto
                  src={image}
                  alt={CAKRAWALA_PHOTOS.alt(image, `Lingkungan ${m.companyName}`)}
                  sizes="(min-width: 1280px) 720px, (min-width: 896px) 48vw, 92vw"
                  className="aspect-[4/3] rounded-[24px]"
                />
                {(badgeValue || badgeLabel) && (
                  <div className="absolute -bottom-5 right-4 rounded-[18px] bg-white px-5 py-4 ring-1 ring-inset ring-black/[0.06] @3xl:right-6">
                    {badgeLabel && <p className={`text-[12.5px] font-medium ${C.muted}`}>{badgeLabel}</p>}
                    {badgeValue && <p className={`${DISPLAY} text-[28px] font-bold leading-none tracking-[-0.03em] text-(--ck-ink)`}>{badgeValue}</p>}
                  </div>
                )}
              </Reveal>
            )}
            <div className={`min-w-0 ${hasImage(image) ? '@4xl:col-span-6' : '@4xl:col-span-12'}`}>
              <SectionHead layout="stack" eyebrow={text(about, 'eyebrow')} title={title} />
              {body.length > 0 && (
                <Reveal delay={160} className={`mt-5 space-y-4 ${TYPE_C.body} ${C.muted}`}>
                  {body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </Reveal>
              )}
              {points.length > 0 && (
                <ul className="mt-7 grid gap-3 @xl:grid-cols-2">
                  {points.map((item, i) => (
                    <Reveal as="li" key={`${field(item, 'text')}-${i}`} delay={stagger(i, 60)} className={`flex items-start gap-3 text-[15px] font-medium leading-snug ${C.ink}`}>
                      <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {field(item, 'text')}
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {(vision || missions.length > 0) && (
            <div className="mt-14 grid gap-4 @3xl:mt-16 @4xl:grid-cols-12">
              {vision && (
                <Reveal className={`p-6 @3xl:p-8 @4xl:col-span-5 ${CARD.tint}`}>
                  <h3 className={`${EYEBROW_SMALL} text-(--ck-ink)`}>Visi</h3>
                  <p className={`mt-4 ${DISPLAY} text-pretty text-[20px] font-semibold leading-snug tracking-[-0.02em] ${C.ink} @3xl:text-[24px]`}>
                    {vision}
                  </p>
                </Reveal>
              )}
              {missions.length > 0 && (
                <Reveal delay={100} className={`p-6 @3xl:p-8 ${vision ? '@4xl:col-span-7' : '@4xl:col-span-12'} ${CARD.white}`}>
                  <h3 className={`${EYEBROW_SMALL} text-(--ck-ink)`}>Misi</h3>
                  <ol className="mt-4 divide-y divide-black/[0.07]">
                    {missions.map((item, i) => (
                      <li key={`${field(item, 'text')}-${i}`} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                        <span aria-hidden className={`${DISPLAY} w-7 shrink-0 text-[15px] font-bold tabular-nums text-(--ck-ink)`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className={`${TYPE_C.body} ${C.ink}`}>{field(item, 'text')}</span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              )}
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

