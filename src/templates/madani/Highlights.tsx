// Strip info singkat tepat di bawah hero (kunci `highlights`): hingga 4 keunggulan berikon dengan garis pemisah tipis.
// HP: 2×2; layar lebar: satu baris. Ikon dipilih otomatis dari judul (./icons).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list } from '../shared/utils';
import type { MadaniModel } from './model';
import { C } from './styles';
import { IconBadge } from './ui';

export function Highlights({ m }: { m: MadaniModel }) {
  const items = list(m.highlights, 'items', 4).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="highlights" className="pt-6 @3xl:pt-8">
      <div className={CONTAINER}>
        <h2 className="sr-only">Keunggulan {m.companyName}</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 border-b border-black/[0.08] pb-6 @3xl:pb-8 @5xl:grid-cols-4 @5xl:gap-0">
          {items.map((item, i) => (
            <Reveal
              as="li"
              key={`${field(item, 'title')}-${i}`}
              delay={stagger(i, 70)}
              className="flex min-w-0 flex-col gap-3 @2xl:flex-row @2xl:items-center @5xl:border-l @5xl:border-black/[0.08] @5xl:px-6 @5xl:first:border-l-0 @5xl:first:pl-0"
            >
              <IconBadge title={field(item, 'title')} index={i} />
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold leading-snug text-(--md-deep)">{field(item, 'title')}</span>
                {field(item, 'text') && <span className={`mt-0.5 block text-[13px] leading-snug ${C.muted}`}>{field(item, 'text')}</span>}
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
