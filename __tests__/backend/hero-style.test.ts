// @vitest-environment node
// Gaya hero (hero_style) & isian hero Prompt AI di update_settings: backend/modules/hero_media.js dan hero_media.php
// menormalkan hero_style, hero_prompt_garuda, hero_prompt_title / hero_prompt_placeholder, dan hero_prompt_chips dengan
// cara yang sama (fungsi murni dibandingkan satu per satu; PHP lewat CLI, dilewati tanpa `php`).
// Jalankan: node node_modules/vitest/vitest.mjs run __tests__/backend/hero-style.test.ts
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { fakeS3Sdk } = vi.hoisted(() => {
  // s3-client.js reads these when it is imported
  Object.assign(process.env, {
    AUTH_SECRET: 'h'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'm'),
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_URL: 'https://s3.test/bucket',
  });
  const fakeS3Sdk = () => {
    class Command {
      input: Record<string, unknown>;
      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    }
    return {
      S3Client: class {
        send = vi.fn();
      },
      PutObjectCommand: class PutObjectCommand extends Command {},
      GetObjectCommand: class GetObjectCommand extends Command {},
      DeleteObjectCommand: class DeleteObjectCommand extends Command {},
      HeadObjectCommand: class HeadObjectCommand extends Command {},
      ListObjectsV2Command: class ListObjectsV2Command extends Command {},
    };
  };
  return { fakeS3Sdk };
});

vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import * as hm from '../../backend/modules/hero_media.js';

const ROOT = resolve(__dirname, '..', '..');
const MODULE_PHP = join(ROOT, 'backend', 'modules', 'hero_media.php');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';

// Nilai yang sama dikirim ke kedua backend (harus bisa jadi JSON: tanpa undefined)
const STYLE_INPUTS = ['classic', 'prompt', '', 'PROMPT', ' prompt', 'Prompt', null, 1, true, ['prompt'], { a: 1 }];
const FLAG_INPUTS = ['1', '0', 0, false, '', 'false', 'off', null, 1, true, ' 0'];
const TEXT_INPUTS = ['  Mau   bikin\n\tapa?  ', 'x'.repeat(30), 'Garuda\r\nNexa', '', null, 7, ['a'], 'ééééé ÿ 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀'];
const HREF_INPUTS = ['/template', ' /pesan-custom ', '//evil.test/x', '/\\evil.test', '#kontak', '#Kontak-2', '#kontak lagi', 'https://wa.me/1', 'HTTP://x.test/a', 'https://', 'javascript:alert(1)', 'data:text/html,x', 'template', '', null, 3];
const CHIP_INPUTS: unknown[] = [
  '{"0":{"label":"a","href":"/a"},"1":{"label":"b","href":"/b"}}',
  '  [{"label":"Spasi di depan","href":"/x"}]',
  JSON.stringify([
    { label: ' Toko  online ', href: '/template/kategori/toko-online' },
    { label: 'Salah', href: 'javascript:1' },
    { label: '', href: '/x' },
    { label: 'Kontak', href: '#kontak' },
    7,
    ['a'],
    { label: 'Panjang '.repeat(10), href: 'https://x.test/' },
    ...Array.from({ length: 7 }, (_, i) => ({ label: `C${i}`, href: '/a' })),
  ]),
  [{ label: 'Langsung', href: '/template' }],
  '[]',
  '',
  '{rusak',
  '{"a":1}',
  '"x"',
  5,
  null,
  JSON.stringify([{ label: 'Unicode ✓ ééé', href: '/a?x=1&y=2' }]),
];

const PHP_HARNESS = String.raw`<?php
require getenv('HM_MODULE');
$req = json_decode(stream_get_contents(STDIN), true);
$out = ['style' => [], 'flag' => [], 'text' => [], 'href' => [], 'chips' => [], 'save' => []];
foreach ($req['style'] as $v) $out['style'][] = hm_style($v);
foreach ($req['flag'] as $v) $out['flag'][] = hm_prompt_flag($v);
foreach ($req['text'] as $v) $out['text'][] = hm_prompt_text($v, 20);
foreach ($req['href'] as $v) $out['href'][] = hm_chip_href($v);
foreach ($req['chips'] as $v) $out['chips'][] = hm_prompt_chips($v);
foreach ($req['save'] as $settings) {
    hero_media_prepare_settings(mysqli_init(), $settings, null);
    $out['save'][] = $settings;
}
// Nilai yang tidak bisa dikirim lewat JSON: float 0.0 (JSON mengirim 0) dan deretan trim 1 MB (waktu)
$out['flag_float'] = [hm_prompt_flag(0.0), hm_prompt_flag(-0.0), hm_prompt_flag(0.5), hm_prompt_flag(NAN)];
$run = str_repeat("\x0B", 1000000);
$t = microtime(true);
$out['long'] = [hm_prompt_text("a{$run}b", 3), hm_chip_href(" {$run}/a{$run} ")];
$out['long_ms'] = (int)((microtime(true) - $t) * 1000);
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;

const SAVE_INPUTS = [
  { hero_style: 'prompt', hero_prompt_garuda: 0, hero_prompt_title: '  Halo  ', hero_prompt_chips: '[{"label":"A","href":"/a"},{"label":"B","href":"//b"}]', hero_title: 'Lama' },
  { hero_style: 'x', hero_prompt_placeholder: ['a'], hero_prompt_chips: '{rusak' },
  { hero_title: 'Tanpa kunci prompt' },
];

const pool = { query: async () => [[]] };

describe('Node: hero_style & isian prompt', () => {
  it('heroStyle: persis "classic" | "prompt", selain itu "classic"', () => {
    expect(STYLE_INPUTS.map((v) => hm.heroStyle(v))).toEqual(['classic', 'prompt', 'classic', 'classic', 'classic', 'classic', 'classic', 'classic', 'classic', 'classic', 'classic']);
  });

  it('promptFlag: hanya "0" / 0 / false yang mematikan', () => {
    expect(FLAG_INPUTS.map((v) => hm.promptFlag(v))).toEqual(['1', '0', '0', '0', '1', '1', '1', '1', '1', '1', '1']);
  });

  it('promptText: satu baris, dipangkas, dipotong per code point; bukan string → ""', () => {
    expect(hm.promptText('  Mau   bikin\n\tapa?  ', 20)).toBe('Mau bikin apa?');
    expect(hm.promptText('x'.repeat(30), 20)).toBe('x'.repeat(20));
    expect(hm.promptText('😀'.repeat(25), 20)).toBe('😀'.repeat(20));
    expect(hm.promptText(7, 20)).toBe('');
    expect(hm.phpTrim('\0\x0B \t\n\rtengah \0')).toBe('tengah');
  });

  it('nilai 1 MB berisi deretan karakter trim selesai seketika (pemangkasan linear, bukan regex berjangkar)', () => {
    const run = '\x0B'.repeat(1_000_000);
    const started = performance.now();
    expect(hm.promptText(`a${run}b`, 20)).toBe(`a${'\x0B'.repeat(19)}`);
    expect(hm.chipHref(`/${' '.repeat(1_000_000)}x`)).toBe(`/${' '.repeat(1_000_000)}x`);
    expect(hm.promptText(`${run}a`, 20)).toBe('a');
    expect(hm.chipHref(`${run}/a${run}`)).toBe('/a');
    expect(performance.now() - started).toBeLessThan(1500);
  });

  it('chipHref: #anchor, path situs, http(s) absolut; selain itu null', () => {
    expect(HREF_INPUTS.map((v) => hm.chipHref(v))).toEqual([
      '/template', '/pesan-custom', null, null, '#kontak', '#Kontak-2', null, 'https://wa.me/1', 'HTTP://x.test/a', null, null, null, null, null, null, null,
    ]);
  });

  it('promptChips: chip valid saja (maks. 6), bukan daftar → null', () => {
    const chips = JSON.parse(hm.promptChips(CHIP_INPUTS[2]) as string);
    expect(chips.map((chip: { label: string }) => chip.label)).toEqual(['Toko online', 'Kontak', 'Panjang Panjang Panjang Panjang Panjang ', 'C0', 'C1', 'C2']);
    expect(chips[2].label.length).toBe(hm.PROMPT_LABEL_MAX);
    expect(hm.promptChips([{ label: 'Langsung', href: '/template' }])).toBe('[{"label":"Langsung","href":"/template"}]');
    expect(hm.promptChips('[]')).toBe('[]');
    expect(hm.promptChips(CHIP_INPUTS[1])).toBe('[{"label":"Spasi di depan","href":"/x"}]');
    // Objek JSON berkunci angka bukan daftar (PHP json_decode akan mengubah kuncinya jadi int)
    for (const raw of ['', '{rusak', '{"a":1}', '"x"', 5, null, CHIP_INPUTS[0]]) expect(hm.promptChips(raw), String(raw)).toBeNull();
  });

  it('prepareHeroMediaSettings menormalkan kunci yang dikirim saja; nilai bukan daftar disimpan apa adanya', async () => {
    const settings: Record<string, unknown> = { ...SAVE_INPUTS[0] };
    await hm.prepareHeroMediaSettings(settings, pool, undefined);
    expect(settings).toEqual({
      hero_style: 'prompt',
      hero_prompt_garuda: '0',
      hero_prompt_title: 'Halo',
      hero_prompt_chips: '[{"label":"A","href":"/a"}]',
      hero_title: 'Lama',
    });
    const odd: Record<string, unknown> = { ...SAVE_INPUTS[1] };
    await hm.prepareHeroMediaSettings(odd, pool, undefined);
    expect(odd).toEqual({ hero_style: 'classic', hero_prompt_placeholder: '', hero_prompt_chips: '{rusak' });
    const untouched: Record<string, unknown> = { ...SAVE_INPUTS[2] };
    await hm.prepareHeroMediaSettings(untouched, pool, undefined);
    expect(untouched).toEqual(SAVE_INPUTS[2]);
  });
});

describe.skipIf(!PHP_AVAILABLE)('PHP menjawab sama dengan Node', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gn-hero-style-php-'));
    writeFileSync(join(dir, 'cli.php'), PHP_HARNESS);
  });
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('hm_style / hm_prompt_flag / hm_prompt_text / hm_chip_href / hm_prompt_chips / hero_media_prepare_settings', async () => {
    const result = spawnSync('php', [join(dir, 'cli.php')], {
      encoding: 'utf8',
      env: { ...process.env, HM_MODULE: MODULE_PHP },
      input: JSON.stringify({ style: STYLE_INPUTS, flag: FLAG_INPUTS, text: TEXT_INPUTS, href: HREF_INPUTS, chips: CHIP_INPUTS, save: SAVE_INPUTS }),
    });
    if (result.status !== 0 || !result.stdout) throw new Error(`php failed: ${result.stderr || result.stdout}`);
    const php = JSON.parse(result.stdout);
    expect(php.style).toEqual(STYLE_INPUTS.map((v) => hm.heroStyle(v)));
    expect(php.flag).toEqual(FLAG_INPUTS.map((v) => hm.promptFlag(v)));
    expect(php.text).toEqual(TEXT_INPUTS.map((v) => hm.promptText(v, 20)));
    expect(php.href).toEqual(HREF_INPUTS.map((v) => hm.chipHref(v)));
    expect(php.chips).toEqual(CHIP_INPUTS.map((v) => hm.promptChips(v)));
    const node = [];
    for (const input of SAVE_INPUTS) {
      const settings: Record<string, unknown> = { ...input };
      await hm.prepareHeroMediaSettings(settings, pool, undefined);
      node.push(settings);
    }
    expect(php.save).toEqual(node);
    expect(php.flag_float).toEqual(['0', '0', '1', '1']);
    expect(php.long).toEqual(['a\x0B\x0B', '/a']);
    expect(php.long_ms).toBeLessThan(1500);
  });
});
