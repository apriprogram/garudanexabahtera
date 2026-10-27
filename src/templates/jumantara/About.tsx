// Sambutan kepala sekolah (kunci `welcome`) + profil, visi & misi (kunci `about`, anchor #tentang).
// Sambutan: label + H2 + kutipan Onest dengan garis tema 2px di kiri, isi sambutan, tanda tangan (nama + jabatan), dan
// tautan teks; potret 4:5 di 4 kolom kanan (HP: potret di antara judul dan kutipan). Tanpa foto → teks selebar 10 kolom.
// Profil: foto 4:5 di kiri (HP 4:3), lalu label, H2, profil singkat, fakta singkat (dl dua kolom bergaris rambut), dan
// kartu putih bertab (Visi / Misi / Profil lulusan): paragraf + butir; butir pendek tampil sebagai chip, butir panjang
// sebagai daftar bernomor 01–0n.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { allShort, keepName, linesOf, paragraphsOf, type JumantaraModel } from './model';
import { JUMANTARA_PHOTOS } from './photos';
import { C, CARD, DISPLAY, DIVIDE, LINE, SECTION_PAD, TYPE_J } from './styles';
import { SectionHead, SectionRule, TabSet, TextLink, type TabDef } from './ui';

export function Welcome({ m }: { m: JumantaraModel }) {
  const { welcome } = m;
  const photo = text(welcome, 'photo');
  const withPhoto = hasImage(photo);
  const quote = text(welcome, 'quote');
  const body = paragraphsOf(text(welcome, 'body'));
  const name = text(welcome, 'name');
  const role = text(welcome, 'role');
  const action = m.linkOr(text(welcome, 'button_url'), m.sectionAction('about'));
  const span = withPhoto ? '@5xl:col-span-7' : '@5xl:col-span-10';

  return (
    <TemplateSection sectionKey="welcome" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('welcome')} />
      <div className={`${CONTAINER} grid gap-8 @5xl:grid-cols-12 @5xl:items-start @5xl:gap-x-10 @5xl:gap-y-8`}>
        <div className={`min-w-0 @5xl:row-start-1 ${span}`}>
          <SectionHead layout="stack" eyebrow={text(welcome, 'eyebrow')} title={keepName(text(welcome, 'title'), m.companyName)} fallback="Sambutan kepala sekolah" />
        </div>
        {withPhoto && (
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @5xl:row-[1/3]">
            <KitPhoto
              src={photo}
              alt={JUMANTARA_PHOTOS.alt(photo, name ? `Foto ${name}, kepala sekolah` : `Kepala ${m.companyName}`)}
              sizes="(min-width: 1024px) 420px, (min-width: 640px) 60vw, 100vw"
              className="aspect-[4/5] max-w-[340px] rounded-[12px] @5xl:max-w-none"
            />
          </Reveal>
        )}
        <div className={`min-w-0 @5xl:row-start-2 ${span}`}>
          {quote && (
            <Reveal as="blockquote" delay={80} className="border-l-2 border-(--tpl-accent) pl-5 @3xl:pl-6">
              <p className={`max-w-[34ch] text-balance ${C.ink} ${TYPE_J.quote}`}>{quote}</p>
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={140} className={`${quote ? 'mt-7' : ''} max-w-[64ch] space-y-4 ${TYPE_J.body} ${C.muted}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {(name || role || action) && (
            <Reveal delay={200} className={`mt-8 flex flex-col gap-5 border-t pt-6 @3xl:flex-row @3xl:items-center @3xl:justify-between ${LINE}`}>
              {(name || role) && (
                <div className="min-w-0">
                  {name && <p className={`${DISPLAY} text-[17px] font-semibold leading-snug tracking-[-0.01em] ${C.ink}`}>{name}</p>}
                  {role && <p className={`mt-0.5 ${TYPE_J.small} ${C.muted}`}>{role}</p>}
                </div>
              )}
              <TextLink action={action} label={text(welcome, 'button_label')} />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

/** Isi panel tab: paragraf + butir (chip bila semuanya pendek, selain itu daftar bernomor). */
function TabPanel({ body, points }: { body: string; points: string[] }) {
  return (
    <div>
      {body && <p className={`max-w-[62ch] ${TYPE_J.body} ${C.ink}`}>{body}</p>}
      {points.length > 0 &&
        (allShort(points) ? (
          <ul className={`flex flex-wrap gap-2 ${body ? 'mt-5' : ''}`}>
            {points.map((point, i) => (
              <li key={`${point}-${i}`} className="inline-flex h-8 items-center rounded-[6px] bg-(--jm-tint) px-3 text-[13px] font-semibold text-(--jm-ink)">
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <ol className={`divide-y ${DIVIDE} ${body ? 'mt-4' : '-mt-3'}`}>
            {points.map((point, i) => (
              <li key={`${point}-${i}`} className="flex gap-4 py-3">
                <span aria-hidden className={`${DISPLAY} w-6 shrink-0 pt-px text-[14px] font-semibold tabular-nums text-(--jm-ink)`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`min-w-0 ${TYPE_J.body} ${C.ink}`}>{point}</span>
              </li>
            ))}
          </ol>
        ))}
    </div>
  );
}

export function About({ m }: { m: JumantaraModel }) {
  const { about } = m;
  const image = text(about, 'image');
  const withImage = hasImage(image);
  const body = text(about, 'body');
  const facts = list(about, 'facts', 4).filter((item) => field(item, 'value'));
  const tabs: TabDef[] = list(about, 'tabs', 4)
    .filter((item) => field(item, 'title') && (field(item, 'text') || field(item, 'points')))
    .map((item, i) => ({
      id: `t${i}`,
      label: field(item, 'title'),
      panel: <TabPanel body={field(item, 'text')} points={linesOf(field(item, 'points'))} />,
    }));
  const action = m.linkOr(text(about, 'button_url'), m.sectionAction('facilities'));

  return (
    <TemplateSection sectionKey="about" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('about')} />
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-x-10`}>
        {withImage && (
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-5 @5xl:self-start">
            <KitPhoto
              src={image}
              alt={JUMANTARA_PHOTOS.alt(image, `Lingkungan ${m.companyName}`)}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/3] rounded-[12px] @5xl:aspect-[4/5]"
              imgClassName="transition-[scale] duration-700 ease-out hover:scale-[1.03]"
            />
          </Reveal>
        )}
        <div className={`min-w-0 ${withImage ? '@5xl:col-span-6 @5xl:col-start-7' : '@5xl:col-span-10'}`}>
          <SectionHead layout="stack" eyebrow={text(about, 'eyebrow')} title={text(about, 'title')} fallback="Profil sekolah" />
          {body && (
            <Reveal as="p" delay={140} className={`mt-5 max-w-[62ch] ${TYPE_J.body} ${C.muted}`}>
              {body}
            </Reveal>
          )}
          {facts.length > 0 && (
            <dl className={`mt-8 grid grid-cols-1 gap-x-8 @xl:grid-cols-2`}>
              {facts.map((item, i) => (
                <Reveal key={`${field(item, 'label')}-${i}`} delay={stagger(i, 60)} className={`flex min-w-0 flex-col border-t py-3.5 ${LINE}`}>
                  <dt className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>{field(item, 'label')}</dt>
                  <dd className={`mt-1 text-[15.5px] font-medium leading-snug ${C.ink}`}>{field(item, 'value')}</dd>
                </Reveal>
              ))}
            </dl>
          )}
          {tabs.length > 0 && (
            <Reveal delay={120} className="mt-8">
              <div className={`p-5 @3xl:p-7 ${CARD.white}`}>
                <TabSet tabs={tabs} label={text(about, 'eyebrow') || 'Profil sekolah'} />
              </div>
            </Reveal>
          )}
          <TextLink action={action} label={text(about, 'button_label')} className="mt-6" />
        </div>
      </div>
    </TemplateSection>
  );
}
