<?php
// Private files of the pd_* actions (see ../project_docs.php): signature PNGs and payment proofs in
// dirname(public_dir())/storage/project-docs/ (outside public_html on cPanel; <repo>/storage/project-docs locally,
// gitignored). Names are random hex + extension, never chosen by the client; pd_file serves them after an access check.
//
// Signatures (spec §0): method draw = the pad's PNG data URL (validated chunk by chunk and decoded, ≤ 300 KB);
// method type = the typed name rendered here as a PNG with a small built-in stroke font, so no image extension (GD)
// is needed on the server.

const PD_SIGNATURE_MAX_BYTES = 307200;  // 300 KB
const PD_PROOF_MAX_BYTES = 5242880;     // 5 MB
const PD_STORED_NAME = '/^[0-9a-f]{32}\.(png|jpg|pdf)$/';
const PD_FILE_TYPES = ['png' => 'image/png', 'jpg' => 'image/jpeg', 'pdf' => 'application/pdf'];

// ════════════════════════════════════════════════════════════════════════════
// Storage
// ════════════════════════════════════════════════════════════════════════════

function pd_storage_dir(): string {
    $dir = dirname(public_dir()) . '/storage/project-docs';
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException("Cannot create storage folder $dir");
    // Second line of defence in case the folder ever ends up under a web root
    if (!is_file("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Require all denied\n");
    return $dir;
}

// Saves bytes under a new random name and returns the name
function pd_store_file(string $bytes, string $ext): string {
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    if (file_put_contents(pd_storage_dir() . '/' . $name, $bytes, LOCK_EX) === false) throw new RuntimeException("Cannot write private file $name");
    return $name;
}

// Full path of a stored file, or null when the name is not one of ours or the file is gone
function pd_stored_path($name): ?string {
    if (!is_string($name) || !preg_match(PD_STORED_NAME, $name)) return null;
    $file = dirname(public_dir()) . '/storage/project-docs/' . $name;
    return is_file($file) ? $file : null;
}

function pd_delete_stored($name): void {
    $file = pd_stored_path($name);
    if ($file !== null) @unlink($file);
}

// ════════════════════════════════════════════════════════════════════════════
// Signatures
// ════════════════════════════════════════════════════════════════════════════

// SignatureInput → [method, PNG bytes]; null when invalid (message in $errors['signature'])
function pd_signature_input($raw, array &$errors): ?array {
    $method = is_array($raw) ? ($raw['method'] ?? null) : null;
    if ($method === 'draw') {
        $png = pd_png_from_data_url($raw['data_url'] ?? null);
        if ($png !== null) return ['draw', $png];
        $errors['signature'] = 'Tanda tangan harus gambar PNG yang valid (maks. 300 KB).';
        return null;
    }
    if ($method === 'type') {
        $name = is_string($raw['typed_name'] ?? null) ? trim($raw['typed_name']) : '';
        if ($name === '' || mb_strlen($name) > 80) {
            $errors['signature'] = 'Nama untuk tanda tangan ketik wajib diisi (maks. 80 karakter).';
            return null;
        }
        $png = pd_render_typed_signature($name);
        if ($png !== null) return ['type', $png];
        $errors['signature'] = 'Nama untuk tanda tangan ketik harus memakai huruf latin.';
        return null;
    }
    $errors['signature'] = is_array($raw) ? 'Metode tanda tangan tidak valid.' : 'Tanda tangan wajib diisi.';
    return null;
}

// Bytes of a `data:image/png;base64,` URL that holds a well-formed PNG ≤ 300 KB, or null
function pd_png_from_data_url($value): ?string {
    $prefix = 'data:image/png;base64,';
    if (!is_string($value) || strncmp($value, $prefix, strlen($prefix)) !== 0) return null;
    $payload = substr($value, strlen($prefix));
    if (strlen($payload) > (int)ceil(PD_SIGNATURE_MAX_BYTES * 4 / 3) + 4) return null;
    $bytes = base64_decode($payload, true);
    if ($bytes === false || strlen($bytes) > PD_SIGNATURE_MAX_BYTES || !pd_png_valid($bytes)) return null;
    return $bytes;
}

// Signature, chunk lengths and CRCs, IHDR first and IEND last, nothing after IEND, and image data that inflates to
// exactly the size the header announces (non-interlaced). Dimensions are capped, so inflating stays small.
function pd_png_valid(string $bin): bool {
    $len = strlen($bin);
    if ($len < 45 || substr($bin, 0, 8) !== "\x89PNG\r\n\x1a\n") return false;
    $pos = 8;
    $header = null;
    $palette = false;
    $idat = '';
    while ($pos + 12 <= $len) {
        $size = unpack('N', substr($bin, $pos, 4))[1];
        if ($size > $len - $pos - 12) return false;
        $type = substr($bin, $pos + 4, 4);
        $data = (string)substr($bin, $pos + 8, $size);
        if ((crc32($type . $data) & 0xffffffff) !== unpack('N', substr($bin, $pos + 8 + $size, 4))[1]) return false;
        $pos += 12 + $size;
        if ($header === null) {
            if ($type !== 'IHDR' || $size !== 13) return false;
            $header = unpack('Nwidth/Nheight/Cdepth/Ccolor/Ccompression/Cfilter/Cinterlace', $data);
        } elseif ($type === 'PLTE') {
            $palette = true;
        } elseif ($type === 'IDAT') {
            $idat .= $data;
        } elseif ($type === 'IEND') {
            return $pos === $len && pd_png_pixels_valid($header, $idat, $palette);
        }
    }
    return false;
}

function pd_png_pixels_valid(array $h, string $idat, bool $palette): bool {
    $channels = [0 => 1, 2 => 3, 3 => 1, 4 => 2, 6 => 4][$h['color']] ?? 0;
    $depths = [0 => [1, 2, 4, 8, 16], 2 => [8, 16], 3 => [1, 2, 4, 8], 4 => [8, 16], 6 => [8, 16]][$h['color']] ?? [];
    if (!$channels || !in_array($h['depth'], $depths, true) || $h['compression'] !== 0 || $h['filter'] !== 0 || $h['interlace'] > 1) return false;
    if ($h['width'] < 1 || $h['height'] < 1 || $h['width'] > 4000 || $h['height'] > 2000 || $idat === '') return false;
    if ($h['color'] === 3 && !$palette) return false;
    $expected = $h['height'] * (intdiv($h['width'] * $channels * $h['depth'] + 7, 8) + 1);
    // Adam7 (interlaced) adds filter bytes per pass: at most 7 extra bytes per row
    $raw = @gzuncompress($idat, $h['interlace'] ? $expected + 7 * $h['height'] : $expected);
    if ($raw === false) return false;
    return $h['interlace'] ? strlen($raw) <= $expected + 7 * $h['height'] : strlen($raw) === $expected;
}

// Stroke font for typed signatures: 5 columns × up to 9 rows ('#' = on); rows 0–6 sit on the baseline, 7–8 are
// descenders. Neighbouring cells are joined into pen strokes, so the result reads like an italic handwritten line.
const PD_SIGNATURE_FONT = [
    ' ' => '',
    'A' => '.###.|#...#|#...#|#####|#...#|#...#|#...#', 'B' => '####.|#...#|#...#|####.|#...#|#...#|####.',
    'C' => '.###.|#...#|#....|#....|#....|#...#|.###.', 'D' => '####.|#...#|#...#|#...#|#...#|#...#|####.',
    'E' => '#####|#....|#....|####.|#....|#....|#####', 'F' => '#####|#....|#....|####.|#....|#....|#....',
    'G' => '.###.|#...#|#....|#.###|#...#|#...#|.####', 'H' => '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    'I' => '.###.|..#..|..#..|..#..|..#..|..#..|.###.', 'J' => '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
    'K' => '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', 'L' => '#....|#....|#....|#....|#....|#....|#####',
    'M' => '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', 'N' => '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
    'O' => '.###.|#...#|#...#|#...#|#...#|#...#|.###.', 'P' => '####.|#...#|#...#|####.|#....|#....|#....',
    'Q' => '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', 'R' => '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    'S' => '.####|#....|#....|.###.|....#|....#|####.', 'T' => '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    'U' => '#...#|#...#|#...#|#...#|#...#|#...#|.###.', 'V' => '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    'W' => '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', 'X' => '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    'Y' => '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', 'Z' => '#####|....#|...#.|..#..|.#...|#....|#####',
    'a' => '.....|.....|.###.|....#|.####|#...#|.####', 'b' => '#....|#....|#.##.|##..#|#...#|#...#|####.',
    'c' => '.....|.....|.###.|#....|#....|#...#|.###.', 'd' => '....#|....#|.##.#|#..##|#...#|#...#|.####',
    'e' => '.....|.....|.###.|#...#|#####|#....|.###.', 'f' => '..##.|.#..#|.#...|###..|.#...|.#...|.#...',
    'g' => '.....|.....|.####|#...#|#...#|.####|....#|#...#|.###.', 'h' => '#....|#....|#.##.|##..#|#...#|#...#|#...#',
    'i' => '..#..|.....|.##..|..#..|..#..|..#..|.###.', 'j' => '...#.|.....|..##.|...#.|...#.|...#.|...#.|#..#.|.##..',
    'k' => '#....|#....|#..#.|#.#..|##...|#.#..|#..#.', 'l' => '.##..|..#..|..#..|..#..|..#..|..#..|.###.',
    'm' => '.....|.....|##.#.|#.#.#|#.#.#|#...#|#...#', 'n' => '.....|.....|#.##.|##..#|#...#|#...#|#...#',
    'o' => '.....|.....|.###.|#...#|#...#|#...#|.###.', 'p' => '.....|.....|####.|#...#|#...#|####.|#....|#....|#....',
    'q' => '.....|.....|.####|#...#|#...#|.####|....#|....#|....#', 'r' => '.....|.....|#.##.|##..#|#....|#....|#....',
    's' => '.....|.....|.###.|#....|.###.|....#|####.', 't' => '.#...|.#...|###..|.#...|.#...|.#..#|..##.',
    'u' => '.....|.....|#...#|#...#|#...#|#..##|.##.#', 'v' => '.....|.....|#...#|#...#|#...#|.#.#.|..#..',
    'w' => '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.', 'x' => '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
    'y' => '.....|.....|#...#|#...#|#...#|.####|....#|#...#|.###.', 'z' => '.....|.....|#####|...#.|..#..|.#...|#####',
    '0' => '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', '1' => '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    '2' => '.###.|#...#|....#|...#.|..#..|.#...|#####', '3' => '#####|...#.|..#..|...#.|....#|#...#|.###.',
    '4' => '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', '5' => '#####|#....|####.|....#|....#|#...#|.###.',
    '6' => '..##.|.#...|#....|####.|#...#|#...#|.###.', '7' => '#####|....#|...#.|..#..|.#...|.#...|.#...',
    '8' => '.###.|#...#|#...#|.###.|#...#|#...#|.###.', '9' => '.###.|#...#|#...#|.####|....#|...#.|.##..',
    '.' => '.....|.....|.....|.....|.....|.....|..#..', ',' => '.....|.....|.....|.....|.....|.....|..#..|.#...',
    '\'' => '..#..|..#..', '-' => '.....|.....|.....|.###.',
];

// Latin letters with accents → the plain letters of the font
const PD_SIGNATURE_ASCII = [
    'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A', 'Ç' => 'C', 'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E',
    'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I', 'Ñ' => 'N', 'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O', 'Ø' => 'O',
    'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U', 'Ý' => 'Y', 'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a',
    'ç' => 'c', 'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'ñ' => 'n', 'ò' => 'o',
    'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ø' => 'o', 'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'ý' => 'y', 'ÿ' => 'y',
    '’' => '\'', '‘' => '\'', '–' => '-', '—' => '-',
];

// The typed name as a transparent PNG in dark ink, or null when no character of it can be drawn
function pd_render_typed_signature(string $name): ?string {
    $text = '';
    foreach (preg_split('//u', strtr($name, PD_SIGNATURE_ASCII), -1, PREG_SPLIT_NO_EMPTY) as $ch) {
        if (isset(PD_SIGNATURE_FONT[$ch])) $text .= $ch;
    }
    $text = trim(preg_replace('/ {2,}/', ' ', $text));
    if ($text === '') return null;

    $cell = 6;          // px per font cell
    $pen = 1.4;         // stroke radius in px
    $slant = 0.22;      // italic shear
    $pad = 12;
    $advance = 6 * $cell;
    $width = (int)ceil(strlen($text) * $advance + 7 * $cell * $slant + 2 * $pad);
    $height = 9 * $cell + 2 * $pad;
    $baseline = $pad + 7 * $cell;
    $alpha = array_fill(0, $width * $height, 0.0);

    foreach (str_split($text) as $index => $ch) {
        $on = [];
        foreach (explode('|', PD_SIGNATURE_FONT[$ch]) as $y => $row) {
            for ($x = 0; $x < strlen($row); $x++) {
                if ($row[$x] === '#') $on[$y][$x] = true;
            }
        }
        $point = function (int $x, int $y) use ($index, $advance, $cell, $pad, $baseline, $slant) {
            $py = $pad + ($y + 0.5) * $cell;
            return [$pad + $index * $advance + ($x + 0.5) * $cell + ($baseline - $py) * $slant, $py];
        };
        $isOn = function (int $x, int $y) use ($on) {
            return isset($on[$y][$x]);
        };
        foreach ($on as $y => $cols) {
            foreach (array_keys($cols) as $x) {
                $from = $point($x, $y);
                $targets = [[$x, $y]];  // a dot, so single cells show too
                if ($isOn($x + 1, $y)) $targets[] = [$x + 1, $y];
                if ($isOn($x, $y + 1)) $targets[] = [$x, $y + 1];
                // Diagonals only where no straight path joins the cells already
                if ($isOn($x + 1, $y + 1) && !$isOn($x + 1, $y) && !$isOn($x, $y + 1)) $targets[] = [$x + 1, $y + 1];
                if ($isOn($x - 1, $y + 1) && !$isOn($x - 1, $y) && !$isOn($x, $y + 1)) $targets[] = [$x - 1, $y + 1];
                foreach ($targets as [$tx, $ty]) {
                    $to = $point($tx, $ty);
                    pd_draw_stroke($alpha, $width, $height, $from[0], $from[1], $to[0], $to[1], $pen);
                }
            }
        }
    }
    return pd_png_encode($width, $height, $alpha, [30, 42, 120]);
}

// Anti-aliased round-capped line (coverage from the distance to the segment), kept as the max alpha per pixel
function pd_draw_stroke(array &$alpha, int $w, int $h, float $x1, float $y1, float $x2, float $y2, float $r): void {
    $minX = max(0, (int)floor(min($x1, $x2) - $r - 1));
    $maxX = min($w - 1, (int)ceil(max($x1, $x2) + $r + 1));
    $minY = max(0, (int)floor(min($y1, $y2) - $r - 1));
    $maxY = min($h - 1, (int)ceil(max($y1, $y2) + $r + 1));
    $dx = $x2 - $x1;
    $dy = $y2 - $y1;
    $len2 = $dx * $dx + $dy * $dy;
    for ($py = $minY; $py <= $maxY; $py++) {
        $cy = $py + 0.5;
        for ($px = $minX; $px <= $maxX; $px++) {
            $cx = $px + 0.5;
            $t = $len2 > 0 ? max(0.0, min(1.0, (($cx - $x1) * $dx + ($cy - $y1) * $dy) / $len2)) : 0.0;
            $ex = $cx - ($x1 + $t * $dx);
            $ey = $cy - ($y1 + $t * $dy);
            $coverage = $r + 0.5 - sqrt($ex * $ex + $ey * $ey);
            if ($coverage <= 0) continue;
            $i = $py * $w + $px;
            $a = $coverage >= 1 ? 1.0 : $coverage;
            if ($a > $alpha[$i]) $alpha[$i] = $a;
        }
    }
}

// 8-bit RGBA PNG: one ink colour, the coverage as alpha
function pd_png_encode(int $w, int $h, array $alpha, array $rgb): string {
    $ink = chr($rgb[0]) . chr($rgb[1]) . chr($rgb[2]);
    $rows = [];
    for ($y = 0; $y < $h; $y++) {
        $row = "\0";  // filter type None
        for ($x = 0; $x < $w; $x++) $row .= $ink . chr((int)round($alpha[$y * $w + $x] * 255));
        $rows[] = $row;
    }
    $chunk = function (string $type, string $data) {
        return pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data));
    };
    return "\x89PNG\r\n\x1a\n" . $chunk('IHDR', pack('NNCCCCC', $w, $h, 8, 6, 0, 0, 0))
        . $chunk('IDAT', gzcompress(implode('', $rows), 9)) . $chunk('IEND', '');
}

// ════════════════════════════════════════════════════════════════════════════
// Payment proofs
// ════════════════════════════════════════════════════════════════════════════

// Proof data URL → [bytes, ext]; the type is sniffed from the content (JPG, PNG or PDF), the declared MIME is ignored
function pd_proof_input($value, array &$errors): ?array {
    if (!is_string($value) || !preg_match('/^data:[a-z0-9.+\/-]*;base64,/i', $value, $m)) {
        $errors['proof'] = 'Bukti pembayaran harus file JPG, PNG, atau PDF.';
        return null;
    }
    $payload = substr($value, strlen($m[0]));
    $bytes = strlen($payload) <= (int)ceil(PD_PROOF_MAX_BYTES * 4 / 3) + 4 ? base64_decode($payload, true) : false;
    if ($bytes === false || $bytes === '' || strlen($bytes) > PD_PROOF_MAX_BYTES) {
        $errors['proof'] = 'Bukti pembayaran kosong, rusak, atau lebih dari 5 MB.';
        return null;
    }
    if (strncmp($bytes, "\x89PNG\r\n\x1a\n", 8) === 0) return [$bytes, 'png'];
    if (strncmp($bytes, "\xFF\xD8\xFF", 3) === 0) return [$bytes, 'jpg'];
    if (strncmp($bytes, '%PDF-', 5) === 0) return [$bytes, 'pdf'];
    $errors['proof'] = 'Bukti pembayaran harus file JPG, PNG, atau PDF.';
    return null;
}
