// STUB fondasi (2026-10-22) — GANTI dengan komponen Arena Club sendiri (docs/platform/TEMPLATE-BRIEFS-2026-10.md §1).
// Sementara merender komponen Startup Clean dengan konten Arena Club, agar /demo/arena-club, /template/arena-club,
// /pesan/arena-club, katalog, CMS, dan uji registry langsung jalan. Kontrak uji yang wajib dipenuhi komponen
// pengganti: lihat §0.4 brief. Tata letak MENGIKAT (nav pil terang, hero banner foto terpusat, data-hero-layout="banner"):
// §4.1; komponen pengganti TIDAK boleh mengimpor template lain (uji __tests__/new-templates.test.tsx aktif saat
// penanda stub ini hilang).
import StartupClean from '../startup-clean/StartupClean';
import type { TemplateRenderProps } from '../types';

export default function ArenaClub(props: TemplateRenderProps) {
  return <StartupClean {...props} />;
}
