#!/usr/bin/env pwsh
# deploy-api.ps1 - Auto deploy api.php ke XAMPP htdocs
# Jalankan: .\deploy-api.ps1

$src = "$PSScriptRoot\backend\api.php"
$dst = "C:\xampp\htdocs\api.php"

if (!(Test-Path $src)) {
    Write-Host "[ERROR] File tidak ditemukan: $src" -ForegroundColor Red
    exit 1
}

Copy-Item $src $dst -Force
Write-Host "[OK] api.php berhasil di-deploy ke XAMPP htdocs!" -ForegroundColor Green
Write-Host "     Dari: $src" -ForegroundColor Gray
Write-Host "     Ke:   $dst" -ForegroundColor Gray
