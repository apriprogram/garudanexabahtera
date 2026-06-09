# Tech Spec: Monitoring Server Refactor

## Architecture Overview
- **Database:** MySQL dengan table existing `monitoring_api` dan `monitor_website_logs`. Menambah table `monitoring_api_logs`.
- **Backend:** Node.js Express `server.js` -> 2 endpoint baru: `get_monitoring_api` dan `get_monitoring_graphs`.
- **Frontend:** React SPA. Komponen `MonitoringServer` akan di-refactor menggunakan Pattern "Tab Layout". Menggunakan `recharts` untuk Line/Area Charts.

## API Contract

### `POST /api.php`
**Action:** `get_monitoring_api`
**Response:**
```json
[
  {
    "id": 1,
    "name": "Public API",
    "endpoint": "/api.php",
    "method": "GET",
    "status": "active",
    "response_time_ms": 45,
    "success_count": 15230,
    "fail_count": 23,
    "last_checked": "2026-06-07T17:05:13.000Z",
    "history": [40, 42, 45, 41, 60, 45] // last 6 response times
  }
]
```

**Action:** `get_monitoring_graphs`
**Response:**
```json
{
  "websites": [
    {
      "id": 1,
      "history": [
        {"time": "10:00", "response_time_ms": 120, "status": "online"},
        {"time": "10:10", "response_time_ms": 150, "status": "online"}
      ]
    }
  ]
}
```

## Implementation Steps (Issues)
- **[FEAT-MON-01]** DB Migration: Create `monitoring_api_logs` and seed data.
- **[FEAT-MON-02]** Backend API endpoints updates (`server.js`).
- **[FEAT-MON-03]** Frontend Refactor: Split UI to Tabs (Overview, API, Websites). Add `recharts`.
- **[FEAT-MON-04]** Version bump & documentation update.