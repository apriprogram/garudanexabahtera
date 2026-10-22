// Private files of the pd_* actions (see ../project_docs.js): signature PNGs and payment proofs in PD_STORAGE_DIR
// (default <repo>/storage/project-docs, gitignored; the same folder PHP uses outside public_html). Names are random
// hex + extension, never chosen by the client; pd_file serves them after an access check. Port of files.php.
//
// Signatures (spec §0): method draw = the pad's PNG data URL (validated chunk by chunk and decoded, ≤ 300 KB);
// method type = the typed name rendered here as a PNG with the same small stroke font as PHP.
import crypto from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { crc32, mbLen, own, phpBase64Decode, phpRound, phpTrim } from './php.js';

const SIGNATURE_MAX_BYTES = 307200; // 300 KB
const PROOF_MAX_BYTES = 5242880; // 5 MB
const STORED_NAME = /^[0-9a-f]{32}\.(png|jpg|pdf)$/;
export const PD_FILE_TYPES = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf' });
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// ════════════════════════════════════════════════════════════════════════════
// Storage
// ════════════════════════════════════════════════════════════════════════════

const pdStorageDir = () => process.env.PD_STORAGE_DIR || join(REPO_ROOT, 'storage', 'project-docs');

async function ensureStorageDir() {
  const dir = pdStorageDir();
  await mkdir(dir, { recursive: true, mode: 0o750 });
  // Second line of defence in case the folder ever ends up under a web root (Apache)
  await writeFile(join(dir, '.htaccess'), 'Require all denied\n', { flag: 'wx' }).catch(() => {});
  return dir;
}

// Saves bytes under a new random name and returns the name
async function pdStoreFile(bytes, ext) {
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(join(await ensureStorageDir(), name), bytes);
  return name;
}

// Full path of a stored file, or null when the name is not one of ours or the file is gone
export async function pdStoredPath(name) {
  if (typeof name !== 'string' || !STORED_NAME.test(name)) return null;
  const file = join(pdStorageDir(), name);
  try {
    return (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

export async function pdDeleteStored(name) {
  const file = await pdStoredPath(name);
  if (file !== null) await unlink(file).catch(() => {});
}

// Runs fn (a transaction) with a freshly stored private file ([bytes, ext] or null); the file is removed again
// when fn fails
export async function pdWithStoredFile(bytesAndExt, fn) {
  const file = bytesAndExt ? await pdStoreFile(bytesAndExt[0], bytesAndExt[1]) : null;
  try {
    return await fn(file);
  } catch (err) {
    await pdDeleteStored(file);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Signatures
// ════════════════════════════════════════════════════════════════════════════

// SignatureInput → [method, PNG bytes]; null when invalid (message in errors.signature)
export function pdSignatureInput(raw, errors) {
  const method = own(raw, 'method');
  if (method === 'draw') {
    const png = pdPngFromDataUrl(own(raw, 'data_url'));
    if (png !== null) return ['draw', png];
    errors.signature = 'Tanda tangan harus gambar PNG yang valid (maks. 300 KB).';
    return null;
  }
  if (method === 'type') {
    const typed = own(raw, 'typed_name');
    const name = typeof typed === 'string' ? phpTrim(typed) : '';
    if (name === '' || mbLen(name) > 80) {
      errors.signature = 'Nama untuk tanda tangan ketik wajib diisi (maks. 80 karakter).';
      return null;
    }
    const png = pdRenderTypedSignature(name);
    if (png !== null) return ['type', png];
    errors.signature = 'Nama untuk tanda tangan ketik harus memakai huruf latin.';
    return null;
  }
  errors.signature = raw !== null && typeof raw === 'object' ? 'Metode tanda tangan tidak valid.' : 'Tanda tangan wajib diisi.';
  return null;
}

// Bytes of a `data:image/png;base64,` URL that holds a well-formed PNG ≤ 300 KB, or null
function pdPngFromDataUrl(value) {
  const prefix = 'data:image/png;base64,';
  if (typeof value !== 'string' || !value.startsWith(prefix)) return null;
  const payload = value.slice(prefix.length);
  if (Buffer.byteLength(payload) > Math.ceil((SIGNATURE_MAX_BYTES * 4) / 3) + 4) return null;
  const bytes = phpBase64Decode(payload);
  if (bytes === null || bytes.length > SIGNATURE_MAX_BYTES || !pdPngValid(bytes)) return null;
  return bytes;
}

// Signature, chunk lengths and CRCs, IHDR first and IEND last, nothing after IEND, and image data that inflates to
// exactly the size the header announces (non-interlaced). Dimensions are capped, so inflating stays small.
export function pdPngValid(bin) {
  const len = bin.length;
  if (len < 45 || !bin.subarray(0, 8).equals(PNG_SIGNATURE)) return false;
  let pos = 8;
  let header = null;
  let palette = false;
  const idat = [];
  while (pos + 12 <= len) {
    const size = bin.readUInt32BE(pos);
    if (size > len - pos - 12) return false;
    const type = bin.toString('latin1', pos + 4, pos + 8);
    const data = bin.subarray(pos + 8, pos + 8 + size);
    if (crc32(bin.subarray(pos + 4, pos + 8 + size)) !== bin.readUInt32BE(pos + 8 + size)) return false;
    pos += 12 + size;
    if (header === null) {
      if (type !== 'IHDR' || size !== 13) return false;
      header = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9],
        compression: data[10], filter: data[11], interlace: data[12],
      };
    } else if (type === 'PLTE') {
      palette = true;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      return pos === len && pdPngPixelsValid(header, Buffer.concat(idat), palette);
    }
  }
  return false;
}

const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const PNG_DEPTHS = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };

function pdPngPixelsValid(h, idat, palette) {
  const channels = PNG_CHANNELS[h.color] ?? 0;
  const depths = PNG_DEPTHS[h.color] ?? [];
  if (!channels || !depths.includes(h.depth) || h.compression !== 0 || h.filter !== 0 || h.interlace > 1) return false;
  if (h.width < 1 || h.height < 1 || h.width > 4000 || h.height > 2000 || idat.length === 0) return false;
  if (h.color === 3 && !palette) return false;
  const expected = h.height * (Math.floor((h.width * channels * h.depth + 7) / 8) + 1);
  // Adam7 (interlaced) adds filter bytes per pass: at most 7 extra bytes per row
  const limit = h.interlace ? expected + 7 * h.height : expected;
  let raw;
  try {
    // One byte over the limit is enough to tell "too long" (PHP's gzuncompress fails or returns more there too)
    raw = zlib.inflateSync(idat, { maxOutputLength: limit + 1 });
  } catch {
    return false;
  }
  return h.interlace ? raw.length <= limit : raw.length === expected;
}

// Stroke font for typed signatures: 5 columns × up to 9 rows ('#' = on); rows 0–6 sit on the baseline, 7–8 are
// descenders. Neighbouring cells are joined into pen strokes, so the result reads like an italic handwritten line.
const SIGNATURE_FONT = {
  ' ': '',
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.', J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  a: '.....|.....|.###.|....#|.####|#...#|.####', b: '#....|#....|#.##.|##..#|#...#|#...#|####.',
  c: '.....|.....|.###.|#....|#....|#...#|.###.', d: '....#|....#|.##.#|#..##|#...#|#...#|.####',
  e: '.....|.....|.###.|#...#|#####|#....|.###.', f: '..##.|.#..#|.#...|###..|.#...|.#...|.#...',
  g: '.....|.....|.####|#...#|#...#|.####|....#|#...#|.###.', h: '#....|#....|#.##.|##..#|#...#|#...#|#...#',
  i: '..#..|.....|.##..|..#..|..#..|..#..|.###.', j: '...#.|.....|..##.|...#.|...#.|...#.|...#.|#..#.|.##..',
  k: '#....|#....|#..#.|#.#..|##...|#.#..|#..#.', l: '.##..|..#..|..#..|..#..|..#..|..#..|.###.',
  m: '.....|.....|##.#.|#.#.#|#.#.#|#...#|#...#', n: '.....|.....|#.##.|##..#|#...#|#...#|#...#',
  o: '.....|.....|.###.|#...#|#...#|#...#|.###.', p: '.....|.....|####.|#...#|#...#|####.|#....|#....|#....',
  q: '.....|.....|.####|#...#|#...#|.####|....#|....#|....#', r: '.....|.....|#.##.|##..#|#....|#....|#....',
  s: '.....|.....|.###.|#....|.###.|....#|####.', t: '.#...|.#...|###..|.#...|.#...|.#..#|..##.',
  u: '.....|.....|#...#|#...#|#...#|#..##|.##.#', v: '.....|.....|#...#|#...#|#...#|.#.#.|..#..',
  w: '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.', x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  y: '.....|.....|#...#|#...#|#...#|.####|....#|#...#|.###.', z: '.....|.....|#####|...#.|..#..|.#...|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '#####|...#.|..#..|...#.|....#|#...#|.###.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.....|.....|.....|.....|.....|.....|..#..', ',': '.....|.....|.....|.....|.....|.....|..#..|.#...',
  "'": '..#..|..#..', '-': '.....|.....|.....|.###.',
};

// Latin letters with accents → the plain letters of the font
const SIGNATURE_ASCII = {
  À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A', Ç: 'C', È: 'E', É: 'E', Ê: 'E', Ë: 'E',
  Ì: 'I', Í: 'I', Î: 'I', Ï: 'I', Ñ: 'N', Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O', Ø: 'O',
  Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U', Ý: 'Y', à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i', ñ: 'n', ò: 'o',
  ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y',
  '’': "'", '‘': "'", '–': '-', '—': '-',
};

// The typed name as a transparent PNG in dark ink, or null when no character of it can be drawn
export function pdRenderTypedSignature(name) {
  let drawable = '';
  for (const raw of name) {
    const ch = Object.hasOwn(SIGNATURE_ASCII, raw) ? SIGNATURE_ASCII[raw] : raw;
    if (Object.hasOwn(SIGNATURE_FONT, ch)) drawable += ch;
  }
  const text = phpTrim(drawable.replace(/ {2,}/g, ' '));
  if (text === '') return null;

  const cell = 6; // px per font cell
  const pen = 1.4; // stroke radius in px
  const slant = 0.22; // italic shear
  const pad = 12;
  const advance = 6 * cell;
  const width = Math.ceil(text.length * advance + 7 * cell * slant + 2 * pad);
  const height = 9 * cell + 2 * pad;
  const baseline = pad + 7 * cell;
  const alpha = new Float64Array(width * height);

  [...text].forEach((ch, index) => {
    const on = SIGNATURE_FONT[ch].split('|').map((row) => [...row].map((c) => c === '#'));
    const isOn = (x, y) => Boolean(on[y]?.[x]);
    const point = (x, y) => {
      const py = pad + (y + 0.5) * cell;
      return [pad + index * advance + (x + 0.5) * cell + (baseline - py) * slant, py];
    };
    on.forEach((row, y) => {
      row.forEach((filled, x) => {
        if (!filled) return;
        const from = point(x, y);
        const targets = [[x, y]]; // a dot, so single cells show too
        if (isOn(x + 1, y)) targets.push([x + 1, y]);
        if (isOn(x, y + 1)) targets.push([x, y + 1]);
        // Diagonals only where no straight path joins the cells already
        if (isOn(x + 1, y + 1) && !isOn(x + 1, y) && !isOn(x, y + 1)) targets.push([x + 1, y + 1]);
        if (isOn(x - 1, y + 1) && !isOn(x - 1, y) && !isOn(x, y + 1)) targets.push([x - 1, y + 1]);
        for (const [tx, ty] of targets) {
          const to = point(tx, ty);
          drawStroke(alpha, width, height, from[0], from[1], to[0], to[1], pen);
        }
      });
    });
  });
  return pngEncode(width, height, alpha, [30, 42, 120]);
}

// Anti-aliased round-capped line (coverage from the distance to the segment), kept as the max alpha per pixel
function drawStroke(alpha, w, h, x1, y1, x2, y2, r) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - r - 1));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(x1, x2) + r + 1));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - r - 1));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(y1, y2) + r + 1));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  for (let py = minY; py <= maxY; py++) {
    const cy = py + 0.5;
    for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2)) : 0;
      const ex = cx - (x1 + t * dx);
      const ey = cy - (y1 + t * dy);
      const coverage = r + 0.5 - Math.sqrt(ex * ex + ey * ey);
      if (coverage <= 0) continue;
      const i = py * w + px;
      const a = coverage >= 1 ? 1 : coverage;
      if (a > alpha[i]) alpha[i] = a;
    }
  }
}

function pngChunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

// 8-bit RGBA PNG: one ink colour, the coverage as alpha
function pngEncode(w, h, alpha, rgb) {
  const raw = Buffer.alloc(h * (1 + 4 * w)); // filter byte 0 (None) per row
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * (1 + 4 * w) + 1 + 4 * x;
      raw[o] = rgb[0];
      raw[o + 1] = rgb[1];
      raw[o + 2] = rgb[2];
      raw[o + 3] = phpRound(alpha[y * w + x] * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

// ════════════════════════════════════════════════════════════════════════════
// Payment proofs
// ════════════════════════════════════════════════════════════════════════════

// Proof data URL → [bytes, ext]; the type is sniffed from the content (JPG, PNG or PDF), the declared MIME is ignored
export function pdProofInput(value, errors) {
  const m = typeof value === 'string' ? /^data:[a-z0-9.+/-]*;base64,/i.exec(value) : null;
  if (!m) {
    errors.proof = 'Bukti pembayaran harus file JPG, PNG, atau PDF.';
    return null;
  }
  const payload = value.slice(m[0].length);
  const bytes = Buffer.byteLength(payload) <= Math.ceil((PROOF_MAX_BYTES * 4) / 3) + 4 ? phpBase64Decode(payload) : null;
  if (bytes === null || bytes.length === 0 || bytes.length > PROOF_MAX_BYTES) {
    errors.proof = 'Bukti pembayaran kosong, rusak, atau lebih dari 5 MB.';
    return null;
  }
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return [bytes, 'png'];
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return [bytes, 'jpg'];
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return [bytes, 'pdf'];
  errors.proof = 'Bukti pembayaran harus file JPG, PNG, atau PDF.';
  return null;
}
