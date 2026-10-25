// Versi isi (hash) gambar publik yang URL-nya tetap: kartu Open Graph (/og/*.jpg) dan pratinjau/galeri template
// (/assets/templates/*, hanya tingkat atas). Cloudflare & .htaccess menyimpan gambar 30 hari per URL, jadi gambar yang
// diganti dengan nama sama tetap tampil versi lama. Dengan ?v=<hash> URL ikut berubah saat isinya berubah.
//
// Peta dihitung dari isi berkas setiap kali Vite membangun/menjalankan modul `virtual:gn-asset-versions` (build klien,
// bundel SSR prerender, dev server, Vitest), jadi tidak ada langkah manual yang bisa terlupa. Dipakai
// src/seo/assetVersion.ts. Subfolder (photos/, logos/) tidak ikut: helper foto template sudah membuang query-nya.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

export const ASSET_VERSIONS_ID = 'virtual:gn-asset-versions';
const RESOLVED_ID = `\0${ASSET_VERSIONS_ID}`;

/** Folder (relatif public/) dan berkas yang diberi versi. */
const SOURCES = [
  { dir: 'og', pattern: /^[a-z0-9-]+\.jpg$/ },
  { dir: 'assets/templates', pattern: /^[A-Za-z0-9._-]+\.(webp|png|jpe?g|svg)$/ },
];

/** Panjang hash (heksadesimal) di ?v=. */
export const ASSET_VERSION_LENGTH = 8;

/**
 * { '/og/catalog.jpg': '1a2b3c4d', '/assets/templates/madani-preview.webp': '…' }: 8 hex awal sha256 isi berkas,
 * kunci terurut. SVG dibaca dengan akhir baris LF agar hash tidak bergantung pada core.autocrlf mesin yang membangun.
 */
export function computeAssetVersions(publicDir) {
  const versions = {};
  for (const { dir, pattern } of SOURCES) {
    const folder = join(publicDir, ...dir.split('/'));
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).sort()) {
      if (!pattern.test(name)) continue;
      const file = join(folder, name);
      if (!statSync(file).isFile()) continue;
      let bytes = readFileSync(file);
      if (name.endsWith('.svg')) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
      versions[`/${dir}/${name}`] = createHash('sha256').update(bytes).digest('hex').slice(0, ASSET_VERSION_LENGTH);
    }
  }
  return versions;
}

/**
 * Plugin Vite untuk `import versions from 'virtual:gn-asset-versions'`. `publicDir` wajib path eksplisit: build deploy
 * dan prerender memanggil Vite dengan `publicDir: false`, jadi config.publicDir tidak bisa dipakai.
 */
export function assetVersionsPlugin({ publicDir }) {
  const folders = SOURCES.map(({ dir }) => resolve(publicDir, ...dir.split('/')).toLowerCase());
  /** Hanya berkas yang bisa masuk peta: anak langsung folder SOURCES dengan nama yang cocok (photos/, logos/ tidak). */
  const inMap = (file) => {
    const path = resolve(file);
    const folder = dirname(path).toLowerCase();
    return SOURCES.some(({ pattern }, i) => folders[i] === folder && pattern.test(basename(path)));
  };
  return {
    name: 'gn-asset-versions',
    resolveId(id) {
      return id === ASSET_VERSIONS_ID ? RESOLVED_ID : null;
    },
    load(id) {
      return id === RESOLVED_ID ? `export default ${JSON.stringify(computeAssetVersions(publicDir))};\n` : null;
    },
    // Dev: gambar di peta berubah → modul virtual dihitung ulang saat halaman dimuat berikutnya. Tanpa reload paksa:
    // simpan template di admin lokal dan og-images.mjs menulis banyak berkas sekaligus (tab lain bisa kehilangan isian).
    configureServer(server) {
      const invalidate = (file) => {
        if (!inMap(file)) return;
        const graphs = [server.moduleGraph, ...Object.values(server.environments ?? {}).map((env) => env.moduleGraph)];
        for (const graph of graphs) {
          const mod = graph?.getModuleById?.(RESOLVED_ID);
          if (mod) graph.invalidateModule(mod);
        }
      };
      server.watcher.on('add', invalidate);
      server.watcher.on('change', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}
