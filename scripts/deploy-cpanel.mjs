#!/usr/bin/env node
// Build the site and publish it to the `cpanel-deploy` branch, which cPanel "Git Version Control" pulls
// and deploys into public_html with .cpanel.yml. See deploy/cpanel/README.md.
//
//   node scripts/deploy-cpanel.mjs              build + prerender + commit to cpanel-deploy (no push)
//   node scripts/deploy-cpanel.mjs --push       ...and push it to origin
//   node scripts/deploy-cpanel.mjs --build-only build + prerender into DEPLOY_DIR/build, then stop (no git at all).
//                                               WP3/WP4 builders that are still missing are skipped with a warning.
//                                               --skip-typecheck (only with --build-only) skips `tsc -b`.
//
// The branch holds only the built site + the PHP API; source code stays on main.
// Prerender (scripts/prerender.mjs) reads its data from PRERENDER_API (default https://garudanexa.com) and aborts the
// deploy when that fails or fewer than MIN_TEMPLATES (default 5) templates are published.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { build } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
// Di luar folder proyek: server dev Vite mengawasi seluruh proyek dan mengunci file di Windows
const DEPLOY_DIR = process.env.DEPLOY_DIR || join(ROOT, '..', '.garudanexa-deploy');
const OUT = join(DEPLOY_DIR, 'build');
const WORKTREE = join(DEPLOY_DIR, 'cpanel-branch');
const BRANCH = 'cpanel-deploy';
const CPANEL_HOME = process.env.CPANEL_HOME || '/home/garudanexa';
const push = process.argv.includes('--push');
const buildOnly = process.argv.includes('--build-only');
const skipTypecheck = process.argv.includes('--skip-typecheck');
if (buildOnly && push) throw new Error('--build-only dan --push tidak bisa dipakai bersamaan');
if (skipTypecheck && !buildOnly) throw new Error('--skip-typecheck hanya untuk --build-only');

// Upload folders that hold user content: never published from git (they live only on the server).
// assets/dokumen-client = client documents and project logos uploaded from the admin; the deploy branch is public.
// assets/projects = images and videos of the home page projects (backend/modules/portfolio_media.php).
const EXCLUDE = ['assets/sites', 'assets/documents', 'assets/list-products', 'assets/dokumen-client', 'assets/projects', 'assets/avatars'];
// File upload di folder yang juga berisi file ter-commit: video & poster latar hero (backend/modules/hero_media.php)
// di assets/bg, di samping gambar slider bawaan. Dikecualikan per nama file (path relatif terhadap public/, pakai /).
const EXCLUDE_FILES = ['assets/bg/hero_video_*', 'assets/bg/hero_poster_*', 'assets/bg/.hero_video_*'];
// Gambar latar hero yang diunggah dari admin (hero_<12 hex>.<ext>, sama dengan .gitignore): juga hanya di server.
// Gambar bawaan hero_6a07…_N.jpg punya nama lain, jadi tetap ikut.
EXCLUDE_FILES.push('assets/bg/hero_????????????.*');
// File public/ yang dibuat ulang saat build, jadi versi lama di repo tidak ikut tersalin (tetap di-commit ke branch
// deploy, tidak seperti EXCLUDE_FILES): sitemap.xml dibuat dari database oleh prerender (WP4).
const GENERATED_FILES = ['sitemap.xml'];
// Glob → regex: * = nol atau lebih karakter, ? = tepat satu karakter (tidak melewati /), seperti .gitignore
const globRegExp = (glob) =>
  new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
const excludedFile = (rel) => GENERATED_FILES.includes(rel) || EXCLUDE_FILES.some((glob) => globRegExp(glob).test(rel));

const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd, cwd = ROOT) => execSync(cmd, { cwd, encoding: 'utf8' }).trim();
// Git di drive tanpa info kepemilikan (exFAT) butuh safe.directory per worktree
const SAFE = `-c "safe.directory=${WORKTREE.split('\\').join('/')}"`;
const gitw = (args) => run(`git ${SAFE} ${args}`, WORKTREE);
const gitwOut = (args) => out(`git ${SAFE} ${args}`, WORKTREE);

// 1. Build the frontend. public/ is copied by hand so user-upload folders never enter the build.
rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
mkdirSync(DEPLOY_DIR, { recursive: true });
if (!skipTypecheck) run('npx tsc -b');
// manifest: true → prerender tahu chunk tiap rute (manifest dipindah keluar dari OUT oleh prerender.mjs)
await build({ root: ROOT, publicDir: false, logLevel: 'warn', build: { outDir: OUT, emptyOutDir: true, manifest: true } });
const excluded = new Set(EXCLUDE.map((rel) => join(ROOT, 'public', rel)));
const publicRel = (src) => relative(join(ROOT, 'public'), src).split(sep).join('/');
cpSync(join(ROOT, 'public'), OUT, { recursive: true, filter: (src) => !excluded.has(src) && !excludedFile(publicRel(src)) });
const leakedFiles = existsSync(join(OUT, 'assets', 'bg'))
  ? readdirSync(join(OUT, 'assets', 'bg')).map((name) => `assets/bg/${name}`).filter(excludedFile)
  : [];
const leaked = [...EXCLUDE.filter((rel) => existsSync(join(OUT, rel))), ...leakedFiles];
if (leaked.length) throw new Error(`Folder upload ikut ter-build (harus dikecualikan): ${leaked.join(', ')}`);

// 2. PHP API next to index.html (api.php finds its .env one level up, outside public_html)
cpSync(join(ROOT, 'backend', 'api.php'), join(OUT, 'api.php'));
// PHP modules including their subfolders (modules/project_docs/*.php); the Node .js files stay out.
// modules/.htaccess below closes the whole tree, subfolders included, to direct web access.
mkdirSync(join(OUT, 'modules'), { recursive: true });
cpSync(join(ROOT, 'backend', 'modules'), join(OUT, 'modules'), {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || src.endsWith('.php'),
});
writeFileSync(join(OUT, 'modules', '.htaccess'), 'Require all denied\n');
cpSync(join(ROOT, 'deploy', 'cpanel', 'htaccess'), join(OUT, '.htaccess'));

// 2b. Prerender halaman publik host utama: OUT/_pre/*.html, app.html, 404.html, seo.php, sitemap.xml, llms*.txt, dan
//     daftar rute di blok gn-prerender .htaccess (docs/platform/SEO-PLAN.md §5.2). Gagal = deploy dibatalkan.
const { prerender } = await import('./prerender.mjs');
const prerendered = await prerender({ root: ROOT, outDir: OUT, deployDir: DEPLOY_DIR, strict: !buildOnly });

// 3. cPanel: repo ini di-clone langsung ke public_html dan branch cpanel-deploy yang di-checkout,
//    jadi "Update from Remote" sudah cukup. Deploy task hanya mencatat waktu (tidak menyalin apa pun).
writeFileSync(
  join(OUT, '.cpanel.yml'),
  `---
deployment:
  tasks:
    - /bin/date > ${CPANEL_HOME}/.garudanexa_last_deploy
`,
);
writeFileSync(
  join(OUT, 'README.md'),
  `Branch ini dibuat otomatis oleh scripts/deploy-cpanel.mjs dari branch main.\nJangan diedit manual. Panduan: deploy/cpanel/README.md di branch main.\n`,
);
// public_html adalah checkout branch ini: upload di folder EXCLUDE tetap file untracked di server.
// Di-ignore agar working tree cPanel tetap bersih dan `git clean -fd` tidak menghapusnya.
writeFileSync(join(OUT, '.gitignore'), [...EXCLUDE.map((rel) => `/${rel}/`), ...EXCLUDE_FILES.map((rel) => `/${rel}`)].join('\n') + '\n');

if (buildOnly) {
  console.log(`\nBuild selesai di ${OUT} (--build-only: tanpa git, worktree, maupun commit).`);
  process.exit(0);
}

// 4. Commit the build to the deploy branch through a separate worktree
const sourceSha = out('git rev-parse --short HEAD');
const dirty = out('git status --porcelain') ? ' (+ perubahan lokal belum di-commit)' : '';
if (!existsSync(WORKTREE)) {
  const remoteHasBranch = out(`git ls-remote --heads origin ${BRANCH}`) !== '';
  const localHasBranch = out(`git branch --list ${BRANCH}`) !== '';
  if (localHasBranch) run(`git worktree add "${WORKTREE}" ${BRANCH}`);
  else if (remoteHasBranch) run(`git worktree add -b ${BRANCH} "${WORKTREE}" origin/${BRANCH}`);
  else {
    run(`git worktree add --detach "${WORKTREE}"`);
    gitw(`checkout --orphan ${BRANCH}`);
  }
}
for (const entry of readdirSync(WORKTREE)) {
  if (entry !== '.git') rmSync(join(WORKTREE, entry), { recursive: true, force: true });
}
cpSync(OUT, WORKTREE, { recursive: true });
gitw('add -A');
if (gitwOut('status --porcelain')) {
  // Sumber & waktu data prerender ikut dicatat: build dari data lokal mudah dikenali di riwayat branch deploy
  gitw(`commit -m "deploy: build dari main ${sourceSha}${dirty} (data ${prerendered.dataOrigin} ${prerendered.builtAt})"`);
} else {
  console.log('Tidak ada perubahan build; branch tidak diubah.');
}
if (push) gitw(`push -u origin ${BRANCH}`);
console.log(push ? `\nSelesai: ${BRANCH} sudah di-push. Di cPanel: Git Version Control → Manage → Pull or Deploy.` : `\nBuild ada di branch ${BRANCH} (lokal). Jalankan lagi dengan --push untuk mengirim.`);
