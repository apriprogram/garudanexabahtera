// Kode template berfitur berita & pengumuman (TemplateDefinition.features.posts), tanpa memuat registri TEMPLATES.
// Untuk halaman ringan seperti daftar "Situs saya" yang tidak perlu kode semua template. Dijaga sama dengan registri
// (src/templates/__tests__/postTemplates.test.ts) dan dengan backend (SP_POST_TEMPLATE_CODES / POST_TEMPLATE_CODES).
export const POST_TEMPLATE_CODES: readonly string[] = ['madani', 'cakrawala'];

export const templateHasPosts = (templateCode: string | null | undefined): boolean =>
  !!templateCode && POST_TEMPLATE_CODES.includes(templateCode);
