# PRD: Monitoring Server Refactor (API & Website Realtime Metrics)

## Objective | Problem Statement | User Story
Halaman monitoring server saat ini belum memiliki kapabilitas pemantauan API (Status API, Response time, success/fail rate, usage history) dan visualisasi performa website secara time-series (grafik riwayat uptime/downtime dan kecepatan akses).
**User Story:** Sebagai admin, saya bisa melihat performa server, status website, dan monitoring API secara detail, lengkap dengan grafik real-time, agar masalah dapat dideteksi sebelum berdampak pada user.

## Scope (In/Out)
**In-Scope:**
- Pembuatan tabel `monitoring_api_logs` (histori response time & uptime).
- Pembuatan tab "API Monitoring" & "Website Performance".
- Visualisasi data dengan grafik `recharts` (BarChart untuk uptime, AreaChart untuk response time).
- Pembaruan tampilan menggunakan styling Garudanexa (Dark/Light mode).

**Out-of-Scope:**
- Sistem auto-repair atau alerting ke Telegram/WhatsApp (fokus UI & Metrics saja).

## Functional Requirements
1. Sistem harus menampilkan List API dengan metrik: Status, Response Time (ms), tingkat keberhasilan, kegagalan.
2. Sistem harus menampilkan riwayat penggunaan endpoint API.
3. Sistem harus menampilkan status Website (Online/Offline) secara real-time.
4. Terdapat visualisasi grafik (Uptime & Access Speed) pada Website.

## Database Schema Updates
1. Menambahkan table `monitoring_api_logs` dengan kolom:
   - `id`, `api_id`, `status`, `response_time_ms`, `checked_at`.

## Performance & Edge Cases
- Grafik menampilkan 24 data point terakhir untuk mencegah lag render (Token/DOM cost efficiency).
- Jika data API/Website gagal di-load, tampilkan UI error fallback.

## Testing Strategy
- **Unit Test**: Test render komponen grafik dan mock data fetch.
- **Integration Test**: API Fetch mengembalikan struktur yang diharapkan untuk API & Website logs.