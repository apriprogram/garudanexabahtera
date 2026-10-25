// Strip berjalan (kunci `perks`): pita cokelat tua selebar layar berisi keunggulan toko berhuruf mono kapital,
// dipisah kilau kecil terakota. Bergerak pelan (berhenti saat disorot); diam & membungkus di pratinjau CMS dan bila
// pengunjung memilih prefers-reduced-motion (Marquee bersama).
import { Marquee } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { field, list } from '../shared/utils';
import { Spark } from './marks';
import type { GlowModel } from './model';
import { MONO } from './styles';

export function Perks({ m }: { m: GlowModel }) {
  const items = list(m.perks, 'items', 8)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="perks" aria-label="Keunggulan toko" className="bg-[#2B211C] py-4 text-[#F6F1EA] @3xl:py-5">
      <Marquee label="Keunggulan toko" duration={46} gap={36} staticClassName="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5">
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className={`flex items-center gap-9 whitespace-nowrap ${MONO} text-[12px]`}>
            <span>{label}</span>
            <Spark className="h-2.5 w-2.5 text-(--gs-accent-light)" />
          </span>
        ))}
      </Marquee>
    </TemplateSection>
  );
}
