#!/usr/bin/env node
// Build the site and publish it to the `cpanel-deploy` branch, which cPanel "Git Version Control" pulls
// and deploys into public_html with .cpanel.yml. See deploy/cpanel/README.md.
//
//   node scripts/deploy-cpanel.mjs            build + commit to cpanel-deploy (no push)
//   node scripts/deploy-cpanel.mjs --push     ...and push it to origin
//
// The branch holds only the built site + the PHP API; source code stays on main.

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

// Upload folders that hold user content: never published from git (they live only on the server).
// assets/dokumen-client = client documents and project logos uploaded from the admin; the deploy branch is public.
const EXCLUDE = ['assets/sites', 'assets/documents', 'assets/list-products', 'assets/dokumen-client'];
// File upload di folder yang juga berisi file ter-commit: video & poster latar hero (backend/modules/hero_media.php)
// di assets/bg, di samping gambar slider bawaan. Dikecualikan per nama file (path relatif terhadap public/, pakai /).
const EXCLUDE_FILES = ['assets/bg/hero_video_*', 'assets/bg/hero_poster_*', 'assets/bg/.hero_video_*'];
const excludedFile = (rel) =>
  EXCLUDE_FILES.some((glob) => new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`).test(rel));

const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd, cwd = ROOT) => execSync(cmd, { cwd, encoding: 'utf8' }).trim();
// Git di drive tanpa info kepemilikan (exFAT) butuh safe.directory per worktree
const SAFE = `-c "safe.directory=${WORKTREE.split('\\').join('/')}"`;
const gitw = (args) => run(`git ${SAFE} ${args}`, WORKTREE);
const gitwOut = (args) => out(`git ${SAFE} ${args}`, WORKTREE);

// 1. Build the frontend. public/ is copied by hand so user-upload folders never enter the build.
rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
run('npx tsc -b');
await build({ root: ROOT, publicDir: false, logLevel: 'warn', build: { outDir: OUT, emptyOutDir: true } });
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
  gitw(`commit -m "deploy: build dari main ${sourceSha}${dirty}"`);
} else {
  console.log('Tidak ada perubahan build; branch tidak diubah.');
}
if (push) gitw(`push -u origin ${BRANCH}`);
console.log(push ? `\nSelesai: ${BRANCH} sudah di-push. Di cPanel: Git Version Control → Manage → Pull or Deploy.` : `\nBuild ada di branch ${BRANCH} (lokal). Jalankan lagi dengan --push untuk mengirim.`);
