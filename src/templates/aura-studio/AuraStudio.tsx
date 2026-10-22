// STUB fondasi (2026-10-22) — GANTI dengan komponen Aura Studio sendiri (docs/platform/TEMPLATE-BRIEFS-2026-10.md §2).
// Sementara merender komponen Startup Clean dengan konten Aura Studio, agar /demo/aura-studio, /template/aura-studio,
// /pesan/aura-studio, katalog, CMS, dan uji registry langsung jalan. Kontrak uji yang wajib dipenuhi komponen
// pengganti: lihat §0.4 brief. Tata letak MENGIKAT (monogram bulat + dropdown Layanan, hero belah 45/55 editorial,
// data-hero-layout="split"): §4.2; komponen pengganti TIDAK boleh mengimpor template lain (uji
// __tests__/new-templates.test.tsx aktif saat penanda stub ini hilang).
import StartupClean from '../startup-clean/StartupClean';
import type { TemplateRenderProps } from '../types';

export default function AuraStudio(props: TemplateRenderProps) {
  return <StartupClean {...props} />;
}
