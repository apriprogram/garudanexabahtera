// STUB fondasi (2026-10-22) — GANTI dengan komponen Finova sendiri (docs/platform/TEMPLATE-BRIEFS-2026-10.md §3).
// Sementara merender komponen Startup Clean dengan konten Finova, agar /demo/finova, /template/finova, /pesan/finova,
// katalog, CMS, dan uji registry langsung jalan. Kontrak uji yang wajib dipenuhi komponen pengganti: lihat §0.4 brief.
// Tata letak MENGIKAT (menu di dalam panel hero gelap, foto + kartu UI melayang, data-hero-layout="panel"): §4.3;
// komponen pengganti TIDAK boleh mengimpor template lain (uji __tests__/new-templates.test.tsx aktif saat penanda
// stub ini hilang).
import StartupClean from '../startup-clean/StartupClean';
import type { TemplateRenderProps } from '../types';

export default function Finova(props: TemplateRenderProps) {
  return <StartupClean {...props} />;
}
