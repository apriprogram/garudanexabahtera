// Strip layanan (kunci `perks`, referensi "Bose · Straight from us, with everything included"): panel hitam membulat;
// kiri judul + deskripsi + tombol mint (chat admin), kanan hingga 4 kartu gelap tembus dengan ikon otomatis dari judul
// (garansi, kirim, COD, tukar, …). HP: judul di atas, kartu 1 kolom (2 kolom mulai @xl).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import { PERK_ICONS, perkIconKey } from './icons';
import type { GadgetkuModel } from './model';
import { BTN, TYPE_G } from './styles';
import { PillLink } from './ui';

export function Perks({ m }: { m: GadgetkuModel }) {
  const { perks } = m;
  const items = list(perks, 'items', 4).filter((item) => field(item, 'title') || field(item, 'text'));
  const title = text(perks, 'title');
  if (items.length === 0 && !title) return null;
  const subtitle = text(perks, 'subtitle');
  const action = resolveAction(text(perks, 'button_url'), m.startAction);

  return (
    <TemplateSection sectionKey="perks" className="py-4 @3xl:py-6">
      <div className={CONTAINER}>
        <Reveal
          variant="fade"
          data-tpl-tone="inverse"
          className="grid gap-8 rounded-[28px] bg-[#0B0C0E] p-6 text-white @3xl:rounded-[36px] @3xl:p-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-10 @6xl:p-12"
        >
          {(title || subtitle) && (
            <div className="min-w-0 @5xl:col-span-4">
              {title && <h2 className={`max-w-[16ch] text-balance text-white ${TYPE_G.h2sm}`}>{title}</h2>}
              {subtitle && <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-white/70">{subtitle}</p>}
              <PillLink action={action} label={text(perks, 'button_label')} className={`${BTN.glow} ${BTN.md} mt-6`} />
            </div>
          )}
          {items.length > 0 && (
            <ul className={`grid gap-3 @xl:grid-cols-2 ${title || subtitle ? '@5xl:col-span-8' : '@5xl:col-span-12'} ${items.length >= 4 ? '@7xl:grid-cols-4' : ''}`}>
              {items.map((item, i) => {
                const Icon = PERK_ICONS[perkIconKey(field(item, 'title'), i)];
                return (
                  <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className="rounded-[20px] bg-white/[0.06] p-5 ring-1 ring-inset ring-white/10">
                    <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-(--gk-on-dark)">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    {field(item, 'title') && <h3 className="mt-5 text-[16px] font-semibold leading-snug text-white">{field(item, 'title')}</h3>}
                    {field(item, 'text') && <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{field(item, 'text')}</p>}
                  </Reveal>
                );
              })}
            </ul>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
