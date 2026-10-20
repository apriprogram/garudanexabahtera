import { useCachedJson } from './useCachedJson';

/** Baris tabel navbar_menus dari /api.php?action=get_navbar_menus (dikelola di admin "Navbar Manager"). */
export interface NavbarMenuRow {
  id: number;
  parent_id: number | null;
  label_id: string;
  label_en: string;
  url: string;
  icon: string;
  description_id: string | null;
  description_en: string | null;
  sort_order: number;
}

const ENDPOINT = '/api.php?action=get_navbar_menus';
const EMPTY: NavbarMenuRow[] = [];

// API mengembalikan array datar (hanya yang aktif); respons lain (mis. {error}) dianggap kosong
const normalizeMenus = (data: unknown): NavbarMenuRow[] =>
  Array.isArray(data)
    ? data.filter((row): row is NavbarMenuRow => Boolean(row) && typeof row.id === 'number' && typeof row.label_id === 'string')
    : EMPTY;

/** Menu navbar dari admin. `menus` kosong = belum ada data / gagal → navbar memakai menu bawaan. */
export const useNavbarMenus = () => {
  const { data, loaded } = useCachedJson(ENDPOINT, normalizeMenus, EMPTY);
  return { menus: data, loaded };
};
