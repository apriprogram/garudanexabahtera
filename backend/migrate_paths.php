<?php
// Script migrasi: Update path gambar lama ke path baru di database
header("Content-Type: text/html; charset=utf-8");

$host = "localhost";
$user = "root";
$pass = "";
$db   = "db_garudanexabahtera";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("<b>Koneksi gagal:</b> " . $conn->connect_error);
}

$updated = [];
$errors  = [];

// Daftar setting_key yang berisi path gambar JSON
$keys = ['products_data', 'portfolio_data'];

foreach ($keys as $key) {
    $result = $conn->query("SELECT setting_value FROM hero_settings WHERE setting_key = '$key'");
    if (!$result || $result->num_rows === 0) {
        $errors[] = "Key '$key' tidak ditemukan di database.";
        continue;
    }

    $row   = $result->fetch_assoc();
    $value = $row['setting_value'];

    // Replace path lama ke path baru
    $newValue = str_replace('/assets/products/', '/assets/product/', $value);
    $newValue = str_replace('/assets/portfolio/', '/assets/portofolio/', $newValue);

    if ($newValue !== $value) {
        $escaped = $conn->real_escape_string($newValue);
        $conn->query("UPDATE hero_settings SET setting_value = '$escaped' WHERE setting_key = '$key'");
        $updated[] = $key;
    } else {
        $updated[] = "$key (tidak ada perubahan, path sudah benar)";
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Migrasi Path Gambar</title>
<style>
  body { font-family: sans-serif; background: #0d0d0d; color: #fff; padding: 40px; }
  h1 { color: #4ade80; }
  .success { background: #052e16; border: 1px solid #4ade80; padding: 12px 16px; border-radius: 8px; margin: 8px 0; }
  .error { background: #2d0a0a; border: 1px solid #f87171; padding: 12px 16px; border-radius: 8px; margin: 8px 0; }
  .note { color: #94a3b8; margin-top: 24px; font-size: 14px; }
</style>
</head>
<body>
<h1>✅ Migrasi Path Gambar Selesai</h1>

<?php foreach ($updated as $msg): ?>
  <div class="success">✔ Diupdate: <b><?= htmlspecialchars($msg) ?></b></div>
<?php endforeach; ?>

<?php foreach ($errors as $msg): ?>
  <div class="error">✘ Error: <b><?= htmlspecialchars($msg) ?></b></div>
<?php endforeach; ?>

<p class="note">
  Path lama <code>/assets/products/</code> → <code>/assets/product/</code><br>
  Path lama <code>/assets/portfolio/</code> → <code>/assets/portofolio/</code><br><br>
  ⚠️ Hapus file ini setelah migrasi selesai untuk keamanan.
</p>
</body>
</html>
