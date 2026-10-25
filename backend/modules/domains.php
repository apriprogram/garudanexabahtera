<?php
// Domain berbayar (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §1–§2): daftar ekstensi & harga jual, normalisasi &
// validasi domain yang dipesan, dan cek ketersediaan. backend/modules/domains.js dan src/lib/domainPricing.ts memakai
// tabel dan pesan yang sama (tes: __tests__/backend/domain-renewal.test.ts). Dipakai templates.php.
//
// Sumber data:
// - DewaBiz (registrar, https://docs.dewabiz.co.id/developer/api) bila DEWABIZ_RESELLER_ID + DEWABIZ_API_KEY diisi:
//   ketersediaan dari GET /domains/availability, daftar ekstensi & harga beli dari GET /account/prices (cache 6 jam di
//   folder temp). Harga beli tidak pernah dikirim ke browser.
// - Tanpa DewaBiz (atau saat DewaBiz gagal): RDAP registri untuk ketersediaan, tabel DOMAIN_TLDS untuk harga.

// Harga jual per tahun (rupiah, sama untuk tahun pertama dan perpanjangan) bila DewaBiz tidak dipakai. .com/.id/
// .web.id/.my.id dari pemilik 2026-10-25, sisanya harga pasaran. Urutan = urutan tampilan & daftar saran domain.
const DOMAIN_TLDS = [
    ['tld' => 'com', 'price' => 250000, 'requirement' => null],
    ['tld' => 'id', 'price' => 250000, 'requirement' => null],
    ['tld' => 'co.id', 'price' => 350000, 'requirement' => 'Untuk badan usaha: butuh NIB atau akta perusahaan'],
    ['tld' => 'my.id', 'price' => 50000, 'requirement' => null],
    ['tld' => 'web.id', 'price' => 50000, 'requirement' => null],
    ['tld' => 'biz.id', 'price' => 100000, 'requirement' => null],
    ['tld' => 'net', 'price' => 250000, 'requirement' => null],
    ['tld' => 'org', 'price' => 250000, 'requirement' => null],
    ['tld' => 'or.id', 'price' => 100000, 'requirement' => 'Untuk organisasi: butuh akta atau SK organisasi'],
    ['tld' => 'sch.id', 'price' => 75000, 'requirement' => 'Untuk sekolah: butuh surat keterangan/NPSN sekolah'],
    ['tld' => 'ac.id', 'price' => 75000, 'requirement' => 'Untuk perguruan tinggi: butuh SK pendirian'],
];
// Harga tetap dari pemilik, juga saat harga diambil dari DewaBiz (tetapi tidak pernah di bawah harga beli)
const DOMAIN_FIXED_PRICES = ['com' => 250000, 'id' => 250000, 'my.id' => 50000, 'web.id' => 50000];
const DOMAIN_MARKUP_DEFAULT = 25;  // % di atas harga beli DewaBiz untuk ekstensi lain (setting domain_markup_percent)
const DOMAIN_MARKUP_MAX = 500;
const DOMAIN_FORMAT = '/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/D';
const DOMAIN_LABEL = '/^(?!-)[a-z0-9-]{1,63}(?<!-)$/D';
const DOMAIN_UNSUPPORTED_MESSAGE = 'Ekstensi domain belum tersedia. Pilih ekstensi dari daftar.';
const DOMAIN_RDAP_TIMEOUT = 6;
// RDAP per ekstensi (IANA bootstrap https://data.iana.org/rdap/dns.json); semua ekstensi .id ke PANDI
const DOMAIN_RDAP_BASE = [
    'com' => 'https://rdap.verisign.com/com/v1/',
    'net' => 'https://rdap.verisign.com/net/v1/',
    'org' => 'https://rdap.publicinterestregistry.org/rdap/',
    'id' => 'https://rdap.pandi.id/rdap/',
];
const DEWABIZ_DEFAULT_URL = 'https://api.dewabiz.co.id/v1';
const DEWABIZ_PRICE_TTL = 21600;      // detik cache daftar harga
const DEWABIZ_RETRY_AFTER = 600;      // detik jeda sebelum mencoba lagi setelah daftar harga gagal diambil
const DEWABIZ_TIMEOUT = 8;

// Huruf kecil, tanpa skema, www., path/port/query, dan titik di akhir (sama dengan normalizeDomainInput di frontend)
function domain_normalize(string $value): string {
    $d = strtolower(trim($value));
    $d = preg_replace('#^[a-z][a-z0-9+.-]*://#', '', $d);
    $d = preg_replace('/^www\./', '', $d);
    $d = preg_replace('/[\/?#:].*$/s', '', $d);
    return rtrim($d, '.');
}

// Ekstensi yang dijual (akhiran terpanjang) dari daftar $tlds (bawaan: DOMAIN_TLDS), atau null
function domain_tld(string $domain, ?array $tlds = null): ?array {
    $best = null;
    foreach ($tlds ?? DOMAIN_TLDS as $t) {
        $suffix = '.' . $t['tld'];
        if (substr($domain, -strlen($suffix)) === $suffix && (!$best || strlen($t['tld']) > strlen($best['tld']))) $best = $t;
    }
    return $best;
}

// Masalah domain yang akan dipesan (sudah dinormalisasi, tidak kosong): satu label + ekstensi yang dijual. null = valid.
function domain_problem(string $domain, ?array $tlds = null): ?string {
    if (strpos($domain, '.') === false) return 'Tambahkan ekstensi domain, mis. .com atau .id.';
    if (strlen($domain) > 253 || !preg_match(DOMAIN_FORMAT, $domain)) return 'Format domain tidak valid, contoh: namabisnis.com';
    $tld = domain_tld($domain, $tlds);
    $name = $tld ? substr($domain, 0, -(strlen($tld['tld']) + 1)) : '';
    if (!$tld) return DOMAIN_UNSUPPORTED_MESSAGE;
    if (!preg_match(DOMAIN_LABEL, $name)) return 'Format domain tidak valid, contoh: namabisnis.com'; // subdomain, '-' di ujung
    return null;
}

// Harga jual domain per tahun dari daftar $tlds, atau null bila ekstensinya tidak dijual (mis. domain pesanan lama).
// $domain = domain yang sudah divalidasi/tersimpan (tanpa normalisasi lagi: "www.my.id" tetap ekstensi my.id)
function domain_price(string $domain, ?array $tlds = null): ?int {
    $tld = domain_tld(strtolower(trim($domain)), $tlds);
    return $tld ? (int)$tld['price'] : null;
}

// Daftar ekstensi yang dijual + harga jual per tahun: ['source' => 'dewabiz'|'default', 'tlds' => [[tld, price,
// requirement], ...]]. Dengan DewaBiz: semua ekstensi aktif di DewaBiz, ekstensi populer (urutan DOMAIN_TLDS) lebih dulu,
// sisanya urut abjad; harga = DOMAIN_FIXED_PRICES atau harga beli + markup, dibulatkan ke atas ke Rp1.000, minimal
// harga beli. Satu kali per request.
function domain_catalog(mysqli $conn): array {
    static $memo = null;
    if ($memo !== null) return $memo;
    $costs = dewabiz_costs();
    if ($costs === null) return $memo = ['source' => 'default', 'tlds' => DOMAIN_TLDS];
    $markup = domain_markup_percent($conn);
    $requirements = array_column(DOMAIN_TLDS, 'requirement', 'tld');
    $rank = array_flip(array_column(DOMAIN_TLDS, 'tld'));
    $tlds = array_map('strval', array_keys($costs));
    usort($tlds, function ($a, $b) use ($rank) {
        if (isset($rank[$a]) || isset($rank[$b])) return ($rank[$a] ?? PHP_INT_MAX) <=> ($rank[$b] ?? PHP_INT_MAX);
        return strcmp($a, $b);
    });
    $list = [];
    foreach ($tlds as $tld) {
        $cost = (int)$costs[$tld];
        $price = DOMAIN_FIXED_PRICES[$tld] ?? domain_round_up($cost * (100 + $markup), 100);
        $list[] = ['tld' => $tld, 'price' => max($price, domain_round_up($cost, 1)), 'requirement' => $requirements[$tld] ?? null];
    }
    return $memo = ['source' => 'dewabiz', 'tlds' => $list];
}

// ceil($numerator / $denominator) ke kelipatan Rp1.000 atas, dengan bilangan bulat (sama persis di PHP dan Node)
function domain_round_up(int $numerator, int $denominator): int {
    return intdiv($numerator + $denominator * 1000 - 1, $denominator * 1000) * 1000;
}

// Markup harga DewaBiz (%), setting domain_markup_percent (admin > Pengaturan website > Harga); kosong/tidak valid = bawaan
function domain_markup_percent(mysqli $conn): int {
    $row = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = 'domain_markup_percent' LIMIT 1");
    $raw = trim((string)($row['setting_value'] ?? ''));
    if (!preg_match('/^\d{1,3}$/D', $raw) || (int)$raw > DOMAIN_MARKUP_MAX) return DOMAIN_MARKUP_DEFAULT;
    return (int)$raw;
}

// Domain yang dicek + nama yang sama di ekstensi populer lain yang dijual (urutan DOMAIN_TLDS), untuk daftar pilihan
function domain_alternatives(string $domain, ?array $tlds = null): array {
    $tld = domain_tld($domain, $tlds);
    if (!$tld) return [$domain];
    $name = substr($domain, 0, -(strlen($tld['tld']) + 1));
    $sold = array_column($tlds ?? DOMAIN_TLDS, 'tld');
    $list = [$domain];
    foreach (DOMAIN_TLDS as $t) {
        if ($t['tld'] !== $tld['tld'] && in_array($t['tld'], $sold, true)) $list[] = $name . '.' . $t['tld'];
    }
    return $list;
}

// 'available' | 'taken' | 'unknown' untuk satu domain
function domain_availability(string $domain): string {
    return domain_availability_many([$domain])[$domain];
}

// Ketersediaan beberapa domain sekaligus (urutan masukan), semua request paralel (curl_multi):
// 1. DewaBiz GET /domains/availability (available 1 = tersedia; 0 atau nama premium = tidak tersedia), bila dikonfigurasi;
// 2. yang belum pasti: RDAP registri (200 = terdaftar, 404 = tersedia). Env DOMAIN_RDAP_URL: 'off' = lewati RDAP, atau
//    templat URL dengan {domain} untuk tes (http boleh, tanpa langkah 3);
// 3. yang masih belum pasti: domain dengan name server (DNS NS) pasti sudah terdaftar.
function domain_availability_many(array $domains): array {
    $result = array_fill_keys($domains, 'unknown');
    $cfg = dewabiz_config();
    if ($cfg) {
        $handles = [];
        foreach (array_keys($result) as $domain) {
            $handles[$domain] = dewabiz_handle($cfg, '/domains/availability', ['domain' => (string)$domain]);
        }
        foreach (domain_curl_all($handles) as $domain => [$code, $raw]) {
            if ($code === 200) $result[$domain] = dewabiz_availability((string)$domain, json_decode((string)$raw, true)) ?? 'unknown';
        }
    }

    $override = env_value('DOMAIN_RDAP_URL');
    if ($override === 'off') return $result;
    $protocols = $override !== '' ? (CURLPROTO_HTTP | CURLPROTO_HTTPS) : CURLPROTO_HTTPS;
    $handles = [];
    foreach ($result as $domain => $status) {
        $url = $status === 'unknown' ? domain_rdap_url((string)$domain, $override) : null;
        if ($url === null) continue;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Accept: application/rdap+json, application/json'],
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => DOMAIN_RDAP_TIMEOUT,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_PROTOCOLS => $protocols,
            CURLOPT_REDIR_PROTOCOLS => $protocols,
        ]);
        $handles[$domain] = $ch;
    }
    foreach (domain_curl_all($handles) as $domain => [$code]) {
        if ($code === 200) $result[$domain] = 'taken';
        elseif ($code === 404) $result[$domain] = 'available';
    }
    if ($override !== '') return $result;
    foreach ($result as $domain => $status) {
        if ($status === 'unknown' && @checkdnsrr($domain . '.', 'NS')) $result[$domain] = 'taken';
    }
    return $result;
}

// Runs curl handles in parallel; returns [key => [http code, body]] and closes the handles
function domain_curl_all(array $handles): array {
    if (!$handles) return [];
    $multi = curl_multi_init();
    foreach ($handles as $ch) curl_multi_add_handle($multi, $ch);
    do {
        $status = curl_multi_exec($multi, $running);
        if ($running) curl_multi_select($multi, 1.0);
    } while ($running && $status === CURLM_OK);
    $out = [];
    foreach ($handles as $key => $ch) {
        $out[$key] = [(int)curl_getinfo($ch, CURLINFO_HTTP_CODE), curl_multi_getcontent($ch)];
        curl_multi_remove_handle($multi, $ch);
        curl_close($ch);
    }
    curl_multi_close($multi);
    return $out;
}

// URL RDAP untuk domain dengan ekstensi .com/.net/.org/.id-an, atau null
function domain_rdap_url(string $domain, string $override): ?string {
    if (!preg_match('/\.([a-z0-9-]+)$/D', $domain, $m)) return null;
    if ($override !== '') return str_replace('{domain}', rawurlencode($domain), $override);
    $base = DOMAIN_RDAP_BASE[$m[1]] ?? null;
    return $base === null ? null : $base . 'domain/' . rawurlencode($domain);
}

// ── DewaBiz ──

// ['url', 'auth'] bila reseller ID dan API key diisi di .env, selain itu null
function dewabiz_config(): ?array {
    $id = trim(env_value('DEWABIZ_RESELLER_ID'));
    $key = trim(env_value('DEWABIZ_API_KEY'));
    if ($id === '' || $key === '') return null;
    $url = rtrim(trim(env_value('DEWABIZ_API_URL', DEWABIZ_DEFAULT_URL)), '/');
    return ['url' => $url !== '' ? $url : DEWABIZ_DEFAULT_URL, 'auth' => $id . ':' . $key];
}

// curl handle for a DewaBiz GET with Basic auth (reseller ID : API key); https only, except an explicit http:// test URL
function dewabiz_handle(array $cfg, string $path, array $query) {
    $url = $cfg['url'] . $path . ($query ? '?' . http_build_query($query) : '');
    $protocols = strncmp($cfg['url'], 'http://', 7) === 0 ? (CURLPROTO_HTTP | CURLPROTO_HTTPS) : CURLPROTO_HTTPS;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => $cfg['auth'],
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => DEWABIZ_TIMEOUT,
        CURLOPT_PROTOCOLS => $protocols,
    ]);
    return $ch;
}

// Status from a /domains/availability answer ({success, data: {name, available, is_premium_name}} or data as a list),
// null when the answer is not usable. Premium names are never sold at the list price: 'taken'.
function dewabiz_availability(string $domain, $body): ?string {
    if (!is_array($body) || empty($body['success']) || !is_array($body['data'] ?? null)) return null;
    $data = $body['data'];
    if ($data && array_keys($data) === range(0, count($data) - 1)) {
        $match = null;
        foreach ($data as $item) {
            if (is_array($item) && strtolower((string)($item['name'] ?? '')) === $domain) $match = $item;
        }
        $data = $match ?? (is_array($data[0]) ? $data[0] : []);
    }
    if (!array_key_exists('available', $data) || !is_numeric($data['available'])) return null;
    if (!empty($data['is_premium_name'])) return 'taken';
    return (int)$data['available'] === 1 ? 'available' : 'taken';
}

// Harga beli per ekstensi dari DewaBiz ([tld => rupiah per tahun], maksimum registrasi/perpanjangan 1 tahun), cache
// DEWABIZ_PRICE_TTL di folder temp; cache lama dipakai bila DewaBiz gagal. null = tidak dikonfigurasi / belum ada data.
// Setelah gagal, DewaBiz tidak ditanya lagi selama DEWABIZ_RETRY_AFTER; hanya satu request yang memperbarui (flock),
// request lain memakai data lama (atau tabel bawaan) tanpa menunggu.
function dewabiz_costs(): ?array {
    static $memo = false;
    if ($memo !== false) return $memo;
    $cfg = dewabiz_config();
    if (!$cfg) return $memo = null;
    $file = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'garudanexa-dewabiz-' . substr(hash('sha256', $cfg['url'] . '|' . $cfg['auth']), 0, 16) . '.json';
    $cached = is_file($file) ? json_decode((string)@file_get_contents($file), true) : null;
    $cachedCosts = is_array($cached) && is_array($cached['costs'] ?? null) && $cached['costs'] ? $cached['costs'] : null;
    $fresh = $cachedCosts !== null && (int)($cached['at'] ?? 0) > time() - DEWABIZ_PRICE_TTL;
    $backoff = is_array($cached) && (int)($cached['tried'] ?? 0) > time() - DEWABIZ_RETRY_AFTER;
    if ($fresh || $backoff) return $memo = $cachedCosts;
    $lock = @fopen($file . '.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
        if ($lock) fclose($lock);
        return $memo = $cachedCosts;
    }
    try {
        $costs = dewabiz_fetch_costs($cfg);
        if ($costs !== null) {
            @file_put_contents($file, json_encode(['at' => time(), 'costs' => $costs]), LOCK_EX);
            return $memo = $costs;
        }
        @file_put_contents($file, json_encode(['at' => (int)($cached['at'] ?? 0), 'costs' => $cachedCosts, 'tried' => time()]), LOCK_EX);
        if ($cachedCosts === null) error_log('[dewabiz] price list unavailable, using the default domain prices');
        return $memo = $cachedCosts;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

// GET /account/prices (all pages, max 20): active extensions only
function dewabiz_fetch_costs(array $cfg): ?array {
    $costs = [];
    for ($page = 1, $last = 1; $page <= $last && $page <= 20; $page++) {
        $ch = dewabiz_handle($cfg, '/account/prices', ['page' => $page, 'limit' => 100]);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $body = is_string($raw) ? json_decode($raw, true) : null;
        if ($code !== 200 || !is_array($body) || !is_array($body['data'] ?? null)) {
            error_log('[dewabiz] GET /account/prices page ' . $page . ': HTTP ' . $code);
            return null;
        }
        foreach ($body['data'] as $item) {
            $ext = is_array($item) ? ($item['domain_extension'] ?? null) : null;
            if (!is_array($ext) || (int)($ext['status'] ?? 0) !== 1) continue;
            $tld = ltrim(strtolower(trim((string)($ext['extension'] ?? ''))), '.');
            if (!preg_match('/^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*$/D', $tld)) continue;
            $cost = max(dewabiz_first_year($item['registration'] ?? null), dewabiz_first_year($item['renewal'] ?? null));
            if ($cost > 0) $costs[$tld] = max($costs[$tld] ?? 0, $cost);
        }
        $last = (int)($body['meta']['last_page'] ?? 1);
    }
    return $costs ?: null;
}

// Harga 1 tahun dari {"1": 100000, "2": ...} (nilai angka atau teks), atau elemen pertama bila berupa daftar
function dewabiz_first_year($prices): int {
    if (!is_array($prices) || !$prices) return 0;
    $value = array_keys($prices) === range(0, count($prices) - 1) ? $prices[0] : ($prices[1] ?? null);
    return is_numeric($value) && (float)$value > 0 ? (int)ceil((float)$value) : 0;
}
