// @vitest-environment node
// Menu admin Generate di kedua backend (backend/modules/admin_generate.php = admin_generate.js): validasi form invoice
// & proposal (hasil + pesan per kolom), hitungan total, perapian jawaban AI, pengambilan JSON dari jawaban AI, nomor
// berikutnya, dan instruksi AI. Fungsi murninya dijalankan di PHP CLI dan Node dengan masukan yang sama; hasilnya harus
// identik. Bagian PHP dilewati bila `php` tidak ada. Juga: daftar aksi sama di api.php, security.js, dan modulnya.
// Jalankan: npx vitest run __tests__/backend/admin-generate.test.ts
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// security.js (createLimiter) memuat bcryptjs dari backend/node_modules; tidak dipakai fungsi yang diuji di sini
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

const gen = await import('../../backend/modules/admin_generate.js');

const ROOT = resolve(__dirname, '..', '..');
const GEN_PHP = resolve(ROOT, 'backend', 'modules', 'admin_generate.php');
const NEXA_PHP = resolve(ROOT, 'backend', 'modules', 'nexa.php');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

const invoice = {
  date: '2026-11-01',
  due_date: '2026-11-15',
  client_name: '  Budi   Santoso ',
  client_company: 'PT Maju Jaya',
  client_email: 'budi@majujaya.co.id',
  client_phone: '+62 812-3456-7890',
  client_address: 'Jl. Merdeka 10\r\nBandung   \r\n\r\n\r\nJawa Barat',
  items: [
    { description: 'Pembuatan website company profile', qty: 1, unit: 'paket', price: 5000000 },
    { description: '', qty: 1, unit: '', price: '' },
    { description: 'Hosting', qty: '1,5', unit: 'tahun', price: '333333' },
  ],
  discount_type: 'percent',
  discount_value: 12.5,
  tax_enabled: true,
  tax_rate: '11',
  notes: 'Terima kasih.',
  payment_info: 'BCA 123 a.n. PT Garuda Nexa Bahtera',
  status: 'terkirim',
};

const INVOICE_CASES: { name: string; input: Record<string, unknown> }[] = [
  { name: 'lengkap & dirapikan', input: invoice },
  { name: 'kosong', input: {} },
  { name: 'tipe salah', input: { ...invoice, date: 20261101, client_name: ['x'], items: 'a', tax_rate: true, status: 1, notes: { a: 1 } } },
  { name: 'email & telepon tidak sah', input: { ...invoice, client_email: 'budi@', client_phone: 'abc' } },
  { name: 'jatuh tempo sebelum tanggal', input: { ...invoice, due_date: '2026-10-01' } },
  { name: 'tanggal tidak ada di kalender', input: { ...invoice, date: '2026-02-30', due_date: '2026-13-01' } },
  { name: 'diskon rupiah melebihi subtotal', input: { ...invoice, discount_type: 'amount', discount_value: 999999999 } },
  { name: 'diskon persen > 100 & jenis tidak dikenal', input: { ...invoice, discount_value: 150 } },
  { name: 'jenis diskon tidak dikenal', input: { ...invoice, discount_type: 'gratis' } },
  {
    name: 'item tidak sah',
    input: {
      ...invoice,
      items: [
        { description: 'A', qty: 0, price: -5 },
        { description: '', qty: 2, price: 1000 },
        { description: 'B', qty: '1.234', price: '1.500.000' },
        { description: 'C', qty: 1, unit: 'x'.repeat(31), price: 100000000001 },
        'teks',
        ['daftar'],
        {},
      ],
    },
  },
  { name: 'items objek berkunci', input: { ...invoice, items: { a: { description: 'X', price: 1 } } } },
  { name: 'items objek berindeks', input: { ...invoice, items: { 0: { description: 'X', qty: 2, price: 1500 } } } },
  { name: 'tanpa item', input: { ...invoice, items: [{ description: ' ', price: 0 }] } },
  { name: 'PPN 12,5 & tidak dipakai', input: { ...invoice, tax_enabled: 'false', tax_rate: '12,5' } },
  { name: 'PPN di atas 100', input: { ...invoice, tax_rate: 101 } },
  { name: 'status tidak dikenal', input: { ...invoice, status: 'batal' } },
  { name: 'teks terlalu panjang dengan emoji', input: { ...invoice, client_name: `${'é'.repeat(149)}😀`, client_company: 'a'.repeat(151) } },
  { name: 'pembulatan setengah', input: { ...invoice, discount_type: 'amount', discount_value: 0.5, items: [{ description: 'X', qty: 0.5, price: 3 }], tax_rate: 50 } },
];

const proposal = {
  date: '2026-11-01',
  valid_until: '2026-12-01',
  client_name: 'Ibu Sari',
  client_company: 'SMA Harapan Bangsa',
  title: '  Website Sekolah\n& PPDB Online ',
  summary: 'Sekolah butuh website.\n\n\n\nUntuk informasi dan pendaftaran.  ',
  scope: ['Profil sekolah', '  ', 'Berita\tdan pengumuman', 'Galeri'],
  timeline: [
    { phase: 'Analisis', duration: '1 minggu', description: 'Wawancara kebutuhan' },
    { phase: '', duration: '', description: '' },
    { phase: 'Desain', duration: '2 minggu' },
  ],
  items: [
    { description: 'Desain UI', qty: 1, unit: 'paket', price: 2000000 },
    { description: 'Pengembangan', qty: 1, unit: 'paket', price: 8000000 },
  ],
  tax_enabled: true,
  tax_rate: 11,
  terms: 'Pembayaran 50% di muka.\nRevisi minor gratis.',
  status: 'draft',
};

const PROPOSAL_CASES: { name: string; input: Record<string, unknown> }[] = [
  { name: 'lengkap & dirapikan', input: proposal },
  { name: 'kosong', input: {} },
  { name: 'judul kosong, masa berlaku tidak sah', input: { ...proposal, title: '   ', valid_until: 'besok' } },
  { name: 'ruang lingkup & tahapan tidak sah', input: { ...proposal, scope: [1, 'a'.repeat(501)], timeline: [{ phase: '', duration: '2 minggu' }, 'x', { phase: 5 }] } },
  { name: 'ruang lingkup bukan daftar', input: { ...proposal, scope: 'satu', timeline: { a: 1 } } },
  { name: 'status proposal', input: { ...proposal, status: 'disetujui' } },
  { name: 'status invoice ditolak di proposal', input: { ...proposal, status: 'lunas' } },
];

const AI_CASES: { kind: 'invoice' | 'proposal'; raw: Record<string, unknown> }[] = [
  {
    kind: 'invoice',
    raw: {
      client_name: ' Budi\nSantoso ',
      client_company: 'PT Maju Jaya',
      client_email: 'Budi @Gmail.com ',
      client_phone: '0812-3456 7890',
      client_address: 'Jl. Merdeka 10',
      date: '2026-11-01',
      due_date: '2026-11-31',
      items: [
        { description: 'Website', qty: 1, unit: 'paket', price: 1500000 },
        { description: 'Hosting', qty: '1.5', price: '750000.4' },
        { description: '', price: 5 },
        { description: 'Domain', qty: -1, price: 'mahal' },
        'teks',
      ],
      discount_type: 'percent',
      discount_value: 10.555,
      tax_enabled: true,
      tax_rate: '11',
      notes: 'Terima kasih',
      payment_info: 'BCA 123',
      status: 'lunas',
      title: 'tidak dipakai di invoice',
      unknown: 'dibuang',
    },
  },
  { kind: 'invoice', raw: { client_email: 'bukan email', client_phone: '12', discount_value: 500000, tax_enabled: 'ya', status: 'batal', items: { a: 1 } } },
  {
    kind: 'proposal',
    raw: {
      client_name: 'Ibu Sari',
      title: 'Website\nSekolah',
      summary: 'Paragraf satu.\r\n\r\n\r\nParagraf dua.',
      scope: ['Profil', '', 7, 'Berita'],
      timeline: [{ phase: 'Desain', duration: '2 minggu', description: 'UI' }, { phase: '' }, ['x']],
      items: [{ description: 'Desain', price: 2000000 }],
      terms: 'Satu.\nDua.',
      valid_until: '2026-12-01',
      notes: 'tidak dipakai di proposal',
      discount_value: 5,
    },
  },
  { kind: 'proposal', raw: {} },
];

const EXTRACT_CASES = [
  '```json\n{"client_name": "Budi", "items": []}\n```',
  'Berikut datanya: {"title": "Website"} semoga membantu',
  'tanpa json',
  '{rusak',
  '{}',
  '[{"a": 1}]',
];

const NUMBER_CASES: [string, string[]][] = [
  ['INV-202611', []],
  ['INV-202611', ['INV-202611-001', 'INV-202611-009', 'INV-202611-abc', 'INV-202610-050']],
  ['PRP-202612', ['PRP-202612-1000', 'PRP-202612-999']],
];

const PHP_HARNESS = String.raw`
class ApiError extends Exception {
    public $status; public $errorCode; public $fieldErrors;
    public function __construct($message, $status = 400, $errorCode = null, $fieldErrors = null) { parent::__construct($message); $this->status = $status; $this->errorCode = $errorCode; $this->fieldErrors = $fieldErrors; }
}
require getenv('NEXA_PHP');
require getenv('GEN_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$out = [
    'invoices' => array_map('gen_validate_invoice', $in['invoices']),
    'proposals' => array_map('gen_validate_proposal', $in['proposals']),
    'ai' => array_map(function ($c) { return gen_clean_ai($c['kind'], $c['raw']); }, $in['ai']),
    'extract' => array_map('gen_extract_json', $in['extract']),
    'numbers' => array_map(function ($c) { return gen_number_after($c[0], $c[1]); }, $in['numbers']),
    'stems' => [gen_number_stem('INV', '2026-11-01'), gen_number_stem('PRP', '2027-01-31')],
    'system' => [gen_ai_system('invoice'), gen_ai_system('proposal')],
    'message' => gen_ai_user_message('halo', '2026-11-01'),
    'limits' => GEN_LIMITS,
    'handlers' => (function () { $src = file_get_contents(getenv('GEN_PHP')); preg_match_all("/'(gen_[a-z_]+)' => 'gen_/", $src, $m); return $m[1]; })(),
];
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const node = {
  invoices: INVOICE_CASES.map((c) => gen.validateInvoice(c.input)),
  proposals: PROPOSAL_CASES.map((c) => gen.validateProposal(c.input)),
  ai: AI_CASES.map((c) => gen.cleanAi(c.kind, c.raw)),
  extract: EXTRACT_CASES.map(gen.extractJson),
  numbers: NUMBER_CASES.map(([stem, numbers]) => gen.numberAfter(stem, numbers)),
  stems: [gen.numberStem('INV', '2026-11-01'), gen.numberStem('PRP', '2027-01-31')],
  system: [gen.aiSystem('invoice'), gen.aiSystem('proposal')],
  message: gen.aiUserMessage('halo', '2026-11-01'),
};

describe('admin_generate.js', () => {
  it('invoice lengkap: teks dirapikan, baris kosong dibuang, total dihitung server', () => {
    const [data, errors] = node.invoices[0];
    expect(errors).toEqual({});
    expect(data).toMatchObject({
      client_name: 'Budi Santoso',
      client_address: 'Jl. Merdeka 10\nBandung\n\nJawa Barat',
      items: [
        { description: 'Pembuatan website company profile', qty: 1, unit: 'paket', price: 5000000, subtotal: 5000000 },
        { description: 'Hosting', qty: 1.5, unit: 'tahun', price: 333333, subtotal: 500000 },
      ],
      discount_value: 12.5,
      // 5.500.000 − 12,5% (687.500) = 4.812.500; PPN 11% = 529.375
      subtotal: 5500000,
      discount_amount: 687500,
      tax_amount: 529375,
      total: 5341875,
      tax_rate: 11,
      status: 'terkirim',
    });
  });

  it('galat per kolom: wajib, format, item, batas', () => {
    expect(node.invoices[1][1]).toEqual({ date: 'Tanggal wajib diisi (format YYYY-MM-DD).', client_name: 'Nama klien wajib diisi.', items: 'Tambahkan minimal satu item.' });
    expect(node.invoices[4][1]).toEqual({ due_date: 'Jatuh tempo tidak boleh sebelum tanggal dokumen.' });
    expect(node.invoices[9][1]).toMatchObject({
      'items.0.qty': 'Qty harus lebih dari 0 (maksimal 2 angka desimal).',
      'items.0.price': 'Harga harus angka 0 sampai 100.000.000.000.',
      'items.1.description': 'Deskripsi item wajib diisi.',
      'items.2.qty': 'Qty harus lebih dari 0 (maksimal 2 angka desimal).',
      'items.3.unit': 'Satuan maksimal 30 karakter.',
      'items.4.description': 'Item tidak valid.',
      'items.5.description': 'Item tidak valid.',
    });
    // "1.500.000" bukan angka biasa untuk server (form mengirim angka); {} = baris kosong
    expect(node.invoices[9][1]['items.2.price']).toBe('Harga harus angka 0 sampai 100.000.000.000.');
    expect(node.invoices[16][1]).toEqual({ client_company: 'Perusahaan maksimal 150 karakter.' });
  });

  it('diskon tidak melebihi subtotal; pembulatan setengah ke atas', () => {
    expect(node.invoices[6][0]).toMatchObject({ discount_amount: 5500000, tax_amount: 0, total: 0 });
    // 0,5 × 3 = 1,5 → 2; diskon 0,5 → 1; PPN 50% dari 1 = 0,5 → 1
    expect(node.invoices[17][0]).toMatchObject({ subtotal: 2, discount_amount: 1, tax_amount: 1, total: 2 });
  });

  it('proposal: judul, ruang lingkup, tahapan, biaya + PPN', () => {
    const [data, errors] = node.proposals[0];
    expect(errors).toEqual({});
    expect(data).toMatchObject({
      title: 'Website Sekolah & PPDB Online',
      summary: 'Sekolah butuh website.\n\nUntuk informasi dan pendaftaran.',
      scope: ['Profil sekolah', 'Berita dan pengumuman', 'Galeri'],
      timeline: [
        { phase: 'Analisis', duration: '1 minggu', description: 'Wawancara kebutuhan' },
        { phase: 'Desain', duration: '2 minggu', description: '' },
      ],
      subtotal: 10000000,
      tax_amount: 1100000,
      total: 11100000,
    });
    expect(data).not.toHaveProperty('discount_amount');
    expect(node.proposals[1][1]).toEqual({
      date: 'Tanggal wajib diisi (format YYYY-MM-DD).',
      client_name: 'Nama klien wajib diisi.',
      title: 'Judul proyek wajib diisi.',
      items: 'Tambahkan minimal satu item.',
    });
  });

  it('jawaban AI dirapikan: kunci asing, nilai tidak sah, dan kunci jenis lain dibuang', () => {
    expect(node.ai[0]).toEqual({
      client_name: 'Budi Santoso',
      client_company: 'PT Maju Jaya',
      client_address: 'Jl. Merdeka 10',
      notes: 'Terima kasih',
      payment_info: 'BCA 123',
      client_email: 'budi@gmail.com',
      client_phone: '081234567890',
      date: '2026-11-01',
      items: [
        { description: 'Website', qty: 1, unit: 'paket', price: 1500000 },
        { description: 'Hosting', qty: 1.5, unit: '', price: 750000 },
        { description: 'Domain', qty: 1, unit: '', price: 0 },
      ],
      tax_enabled: true,
      tax_rate: 11,
      discount_type: 'percent',
      discount_value: 10.56,
      status: 'lunas',
    });
    expect(node.ai[1]).toEqual({ discount_value: 500000 });
    expect(node.ai[3]).toEqual({});
  });

  it('JSON dari jawaban AI, nomor berikutnya', () => {
    expect(node.extract).toEqual([{ client_name: 'Budi', items: [] }, { title: 'Website' }, null, null, {}, { a: 1 }]);
    expect(node.numbers).toEqual(['INV-202611-001', 'INV-202611-010', 'PRP-202612-1001']);
    expect(node.stems).toEqual(['INV-202611', 'PRP-202701']);
  });

  it('semua aksi gen_* hanya admin di kedua backend dan dikenal modulnya', () => {
    const apiPhp = readFileSync(resolve(ROOT, 'backend', 'api.php'), 'utf8');
    const securityJs = readFileSync(resolve(ROOT, 'backend', 'security.js'), 'utf8');
    const adminList = (src: string) => {
      const block = src.match(/ADMIN_ACTIONS\s*=\s*(?:new Set\()?\[([\s\S]*?)\]/);
      return [...(block?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    };
    for (const src of [apiPhp, securityJs]) expect(adminList(src).filter((a) => a.startsWith('gen_'))).toEqual(gen.GENERATE_ACTIONS);
    expect(apiPhp).toContain("require_once __DIR__ . '/modules/admin_generate.php';");
    expect(apiPhp.indexOf('handle_generate_action($conn')).toBeGreaterThan(apiPhp.indexOf('$authUser = authorize_request('));
    expect(readFileSync(resolve(ROOT, 'backend', 'server.js'), 'utf8')).toContain("import { handleGenerateAction } from './modules/admin_generate.js';");
  });
});

describe.skipIf(!PHP_AVAILABLE)('admin_generate.php sama dengan admin_generate.js', () => {
  const result = PHP_AVAILABLE
    ? spawnSync('php', ['-d', 'display_errors=stderr', '-r', PHP_HARNESS], {
        input: JSON.stringify({
          invoices: INVOICE_CASES.map((c) => c.input),
          proposals: PROPOSAL_CASES.map((c) => c.input),
          ai: AI_CASES,
          extract: EXTRACT_CASES,
          numbers: NUMBER_CASES,
        }),
        encoding: 'utf8',
        env: { ...process.env, GEN_PHP, NEXA_PHP },
      })
    : null;
  const php = result && result.status === 0 ? JSON.parse(result.stdout) : null;
  // PHP mengirim objek kosong sebagai [] di JSON
  const obj = (value: unknown) => (Array.isArray(value) && value.length === 0 ? {} : value);

  it('PHP berjalan', () => {
    expect(result?.stderr ?? '').toBe('');
    expect(php).not.toBeNull();
  });

  it('validasi invoice & proposal: hasil, pesan per kolom, dan urutannya', () => {
    for (const [cases, key] of [[INVOICE_CASES, 'invoices'], [PROPOSAL_CASES, 'proposals']] as const) {
      cases.forEach((c, i) => {
        const [phpData, phpErrors] = php[key][i];
        const [nodeData, nodeErrors] = node[key][i];
        expect(phpData, c.name).toEqual(nodeData);
        expect(obj(phpErrors), c.name).toEqual(nodeErrors);
        expect(Object.keys(obj(phpErrors) as object), `${c.name}: urutan pesan`).toEqual(Object.keys(nodeErrors));
      });
    }
  });

  it('perapian AI, JSON dari jawaban, nomor, instruksi, batas, dan daftar aksi', () => {
    expect(php.ai.map(obj)).toEqual(node.ai);
    expect(php.extract.map(obj)).toEqual(node.extract);
    expect(php.numbers).toEqual(node.numbers);
    expect(php.stems).toEqual(node.stems);
    expect(php.system).toEqual(node.system);
    expect(php.message).toEqual(node.message);
    expect(php.limits).toEqual(gen.GEN_LIMITS);
    expect(php.handlers).toEqual(gen.GENERATE_ACTIONS);
  });
});
