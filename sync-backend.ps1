# ============================================================
# SYNC BACKEND KE XAMPP HTDOCS
# Jalankan script ini setiap kali ada perubahan di backend/api.php
# ============================================================

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendFile = Join-Path $projectDir "backend\api.php"
$htdocsFile = "C:\xampp\htdocs\api.php"
$migrateFile = Join-Path $projectDir "backend\migrate_paths.php"
$htdocsMigrate = "C:\xampp\htdocs\migrate_paths.php"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   SYNC BACKEND -> XAMPP HTDOCS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Cek apakah XAMPP htdocs ada
if (-not (Test-Path "C:\xampp\htdocs")) {
    Write-Host "[ERROR] XAMPP htdocs tidak ditemukan di C:\xampp\htdocs" -ForegroundColor Red
    Write-Host "Pastikan XAMPP sudah terinstall." -ForegroundColor Yellow
    exit 1
}

# Copy api.php
Write-Host "[1/2] Menyalin api.php ke htdocs..." -ForegroundColor Yellow
Copy-Item -Path $backendFile -Destination $htdocsFile -Force
Write-Host "      OK: api.php disalin" -ForegroundColor Green

# Copy migrate_paths.php jika ada
if (Test-Path $migrateFile) {
    Copy-Item -Path $migrateFile -Destination $htdocsMigrate -Force
    Write-Host "[2/2] OK: migrate_paths.php disalin" -ForegroundColor Green
} else {
    Write-Host "[2/2] Skipped: migrate_paths.php tidak ada" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   SYNC SELESAI!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sekarang jalankan: npm run dev" -ForegroundColor Cyan
Write-Host ""
