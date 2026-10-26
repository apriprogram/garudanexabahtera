// Langkah kepemilikan (`how`), gaya CBRLP "Get behind the wheel": kiri label + judul + deskripsi, garis tipis, 2–4
// langkah dengan ikon di bulatan hitam (dipilih otomatis dari judul), tautan teks, lalu pil hitam + bulatan panah; kanan
// foto tegak membulat dengan kartu angka putih di sudut. Tanpa foto → satu kolom. HP: foto di bawah teks.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { howSteps, type VeloraModel } from './model';
import { VELORA_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_V } from './styles';
import { ArrowPill, AutoIcon, SectionHead, TextLink } from './ui';

export function Ownership({ m }: { m: VeloraModel }) {
  const s = m.how;
  const steps = howSteps(s);
  const image = text(s, 'image');
  const withPhoto = hasImage(image);
  const badgeValue = text(s, 'badge_value');
  const badgeLabel = text(s, 'badge_label');
  const buttonAction = m.linkOr(text(s, 'button_url'), m.driveAction);
  const cols = steps.length >= 3 ? '@xl:grid-cols-2 @6xl:grid-cols-3' : '@xl:grid-cols-2';

  return (
    <TemplateSection sectionKey="how" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid items-center gap-10 @5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16`}>
        <div className={`min-w-0 ${withPhoto ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}>
          <SectionHead layout="stack" eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} />
          {steps.length > 0 && (
            <ol className={`mt-9 grid gap-x-8 gap-y-8 border-t border-[#0D0E10]/[0.12] pt-8 @3xl:mt-11 ${cols}`}>
              {steps.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 90)} className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D0E10] text-white">
                      <AutoIcon title={field(item, 'title')} index={i} className="h-[18px] w-[18px]" />
                    </span>
                    <span aria-hidden className={`${DISPLAY} text-[13px] font-medium tabular-nums text-(--vl-ink)`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <h3 className={`mt-5 ${C.ink} ${TYPE_V.h3}`}>{field(item, 'title')}</h3>
                  {field(item, 'text') && <p className={`mt-2 ${TYPE_V.body} ${C.muted}`}>{field(item, 'text')}</p>}
                  <TextLink action={m.linkOr(field(item, 'url'), null)} label={field(item, 'link_label')} className="mt-3 self-start" />
                </Reveal>
              ))}
            </ol>
          )}
          {text(s, 'button_label') && buttonAction && (
            <Reveal delay={200} className="mt-10">
              <ArrowPill action={buttonAction} label={text(s, 'button_label')} variant="ink" className="w-full @xl:w-auto" />
            </Reveal>
          )}
        </div>
        {withPhoto && (
          <Reveal variant="scale" className="min-w-0 @5xl:col-span-5">
            <KitPhoto
              src={image}
              alt={VELORA_PHOTOS.alt(image, text(s, 'title') || m.companyName)}
              sizes="(min-width: 1280px) 520px, (min-width: 1024px) 40vw, 92vw"
              position="62% 50%"
              className="aspect-[4/5] rounded-[24px] @5xl:rounded-[28px]"
            >
              {(badgeValue || badgeLabel) && (
                <span className="absolute bottom-3 left-3 right-3 flex items-center gap-4 rounded-[18px] bg-white/90 p-4 backdrop-blur-md @xl:right-auto @xl:max-w-[300px]">
                  {badgeValue && (
                    <span className={`${DISPLAY} shrink-0 text-[26px] font-medium leading-none tracking-[-0.03em] ${C.ink}`}>
                      {badgeValue}
                      <span aria-hidden className="ml-0.5 inline-block h-[0.2em] w-[0.2em] rounded-full bg-(--vl-red) align-baseline" />
                    </span>
                  )}
                  {badgeLabel && <span className={`text-[13.5px] leading-snug ${C.muted}`}>{badgeLabel}</span>}
                </span>
              )}
            </KitPhoto>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
