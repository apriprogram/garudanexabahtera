// Syarat proyek boleh tampil di #projects beranda (keputusan pemilik 2026-10-21). Dipakai juga oleh form proyek admin
// agar admin tahu kenapa proyek yang dicentang "Tampilkan di website" belum muncul.
import type { PublicProject } from '../../../types/platform';

/** Panjang deskripsi minimal agar kartu proyek tidak tampak kosong / berisi teks uji. */
export const MIN_PROJECT_DESCRIPTION = 40;

/** Jumlah proyek layak minimal; kurang dari ini → portofolio cadangan (`portfolio_data`). */
export const MIN_PRESENTABLE_PROJECTS = 2;

// Teks uji: "Lorem ipsum…", "Coba text", "Test…" / "[TEST verif-ui] …" (awal judul atau deskripsi)
const TEST_TEXT = /lorem ipsum|^\W*coba\b|^\W*test/i;

type ProjectLike = Pick<PublicProject, 'name' | 'image' | 'description'>;

/** Alasan proyek belum layak tampil (kosong = layak). Pesan dalam bahasa panel admin. */
export const projectIssues = (project: ProjectLike): string[] => {
  const name = (project.name || '').trim();
  const description = (project.description || '').trim();
  const issues: string[] = [];
  if (!(project.image || '').trim()) issues.push('belum ada gambar');
  if (description.length < MIN_PROJECT_DESCRIPTION) issues.push(`deskripsi kurang dari ${MIN_PROJECT_DESCRIPTION} karakter`);
  if (TEST_TEXT.test(name) || TEST_TEXT.test(description)) issues.push('judul atau deskripsi masih berisi teks uji');
  return issues;
};

/** Proyek layak tampil di beranda: ada gambar, deskripsi ≥ 40 karakter, bukan teks uji. */
export const isPresentableProject = (project: ProjectLike): boolean => projectIssues(project).length === 0;

/**
 * Proyek yang benar-benar tampil di #projects: yang layak, atau [] bila kurang dari MIN_PRESENTABLE_PROJECTS (beranda
 * lalu memakai portofolio cadangan). Dipakai Projects.tsx dan gn-preload prerender, supaya HTML mentah tidak memuat
 * proyek yang tidak terlihat pengunjung.
 */
export const presentableProjects = <T extends ProjectLike>(projects: readonly T[]): T[] => {
  const presentable = projects.filter(isPresentableProject);
  return presentable.length >= MIN_PRESENTABLE_PROJECTS ? presentable : [];
};
