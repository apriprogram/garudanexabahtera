import type { TemplateDefinition } from '../types';
import ArenaClub from './ArenaClub';
import { arenaClubContent } from './defaultContent';
import { arenaClubSections } from './schema';

/** Arena Club — klub & tempat olahraga (brief: docs/platform/TEMPLATE-BRIEFS-2026-10.md §1). */
export const arenaClub: TemplateDefinition = {
  code: 'arena-club',
  name: 'Arena Club',
  sections: arenaClubSections,
  defaultContent: arenaClubContent,
  Component: ArenaClub,
};
