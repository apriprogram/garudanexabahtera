# Project Documentation & Agreement Management (SPEC, binding)

Feature for **custom projects** (`project_client`: website / mobile_app / ui_ux / other). Every project carries its
own document set, from planning to maintenance, inside one workspace. This file is the contract between the PHP backend,
the Node backend, the document engine, the admin UI and the customer UI. When code and this file disagree, fix the code
or update this file in the same change.

Related contracts: `docs/platform/SPEC.md` (roles, auth, design tokens), `design.md` (UI rules), `backend/api.php` +
`backend/security.js` (default-deny auth lists).

---

## 0. Decisions (defaults, owner may change later)

| Topic | Decision |
|---|---|
| Who uses it | Admin = **Administrator** (`role=admin`), staff `role=user` shown as **Developer**, `role=customer` = **Klien** |
| Client login | A client record (`pd_clients`) may link to a customer account (`users.id`, role `customer`). Klien sees only projects of the client records linked to their account |
| E-signature | In-app electronic signature (draw on canvas or typed name), stored as PNG in private storage, with audit trail (user, name, role, time, IP, user agent, SHA-256 of the document snapshot). Shown in the document as "Ditandatangani secara elektronik". Not a certified signature (PSrE); PKS/BAST/SLA show an e-Meterai placeholder box when contract value ≥ Rp5.000.000 |
| Export | Client side. One canonical block model → React preview, **PDF** (`pdfmake`, vector) and **DOCX** (`docx`). Export libraries are lazy-loaded (`import()`), never in the main bundle |
| Logo | Every document has a kop (letterhead) with the **Garuda Nexa wings logo** (`WINGS_PATH` from `src/components/ui/LogoMark.tsx`, brand `#211FFE`) + company name + address/contact line. PDF uses the SVG; DOCX uses a PNG rendered from the same SVG at export time |
| Tax | Configurable. Default PPN **off** (company may not be PKP). When on: PPN 12% × DPP nilai lain 11/12 (effective 11%), both numbers editable. PPh 23 (2%, withheld by client) optional per invoice, informational |
| Payments | Recorded by admin (bank transfer / tunai / QRIS / lainnya) with optional proof file. Each payment issues a **Kuitansi** automatically |
| Notifications | In-app (bell in admin header and customer account). No email in this version |
| Language | All UI and documents in Bahasa Indonesia. Admin UI addresses the user as "kamu", customer UI as "Anda" (design.md) |

---

## 1. Document set

| `doc_type` | Name (UI) | Code | Required | Approval | Signatures | Stage |
|---|---|---|---|---|---|---|
| `brd` | BRD – Dokumen Kebutuhan Bisnis | BRD | yes | client | none | perencanaan |
| `mou` | MoU – Nota Kesepahaman | MOU | **optional** (project flag `use_mou`) | client | both parties | penawaran |
| `proposal` | Proposal & Penawaran Harga | PRP | yes | client | none | penawaran |
| `pks` | PKS + SOW – Perjanjian Kerja Sama & Ruang Lingkup | PKS | yes | client | both parties | kontrak |
| `timeline` | Jadwal & Tahapan Pengerjaan | TML | yes | client | none | pengerjaan |
| `uat` | UAT – Pengujian & Persetujuan Hasil | UAT | yes | client | both parties | uji |
| `bast` | BAST – Berita Acara Serah Terima | BAST | yes | client | both parties | serah_terima |
| `invoice` | Invoice / Tagihan | INV | yes (≥1) | none | none | pembayaran |
| `receipt` | Kuitansi / Bukti Pembayaran | KWT | auto | none | none | pembayaran |
| `sla` | SLA – Perjanjian Pemeliharaan & Dukungan | SLA | **optional** (project flag `has_maintenance`) | client | both parties | maintenance |

"Both parties" = Pihak Pertama (PT Garuda Nexa Bahtera, signed by an admin as the company signatory) and Pihak Kedua
(the client, signed by the linked customer account).

### 1.1 Status per document

`draft` → `menunggu_persetujuan` → `disetujui` → `selesai`

| Status | Label | Meaning |
|---|---|---|
| `draft` | Draft | Editable by staff. Never visible to the client |
| `menunggu_persetujuan` | Menunggu persetujuan | Sent to the client. Locked (no edits) |
| `disetujui` | Disetujui (invoice: **Terbit**) | Client approved (or invoice issued). Locked |
| `selesai` | Selesai | All required signatures present, or invoice fully paid, or receipt issued, or admin marked done |

Rules:
- Client **rejects** → status back to `draft`, `revision_requested = 1`, `review_note` = client note. UI label "Perlu revisi".
- Docs with signatures: after `disetujui`, each party signs; when every required party signed the **current version**,
  status becomes `selesai` automatically. The client signs inside the approve action (approve + sign in one step).
- Docs with approval `none`: invoice `draft` → (issue) `disetujui` → `selesai` when paid in full; receipt is created `selesai`.
- `brd`, `proposal`, `timeline`: client approval → `disetujui`; they become `selesai` when the admin marks them or when the
  project reaches stage `selesai`.
- **Change management**: a locked document (`menunggu_persetujuan`, `disetujui`, `selesai`) can be reopened only through
  "Ajukan perubahan" (`pd_document_change`, reason required). It creates a new version in `draft`; approvals and signatures
  of older versions stay in history but no longer count. Invoices with payments cannot be reopened (cancel + reissue instead).
- `menunggu_persetujuan` can be withdrawn by staff (`pd_document_withdraw`) → `draft`.

### 1.2 Revisions

Every successful save of content creates a row in `pd_document_revisions` (`version` = previous + 1, full `content` JSON,
`change_note`, `changed_by`). `pd_documents.version` = latest version. Restoring an old revision = saving its content
as a new version (only while `draft`). When a document leaves `draft` (submit/issue), the merged data used for rendering
is frozen into `pd_documents.snapshot` (JSON, see §4.3) so later edits to the project, client or company profile never
change a sent/approved/signed document. `content_hash` = SHA-256 of the canonical JSON `{content, snapshot}` of that version.

### 1.3 Numbering

Format (Indonesian letter style): `{SEQ:3}/{CODE}/{PREFIX}/{ROMAN_MONTH}/{YEAR}` → `007/PKS/GNB/X/2026`.
- `PREFIX` from settings (`numbering_prefix`, default `GNB`). `SEQ` restarts every year per `CODE`.
- Assigned **once, at creation**, atomically through `pd_counters` (`INSERT … ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)`), so two
  parallel creations never get the same number. `pd_documents.number` is UNIQUE.
- Project code: `PRJ-{YEAR}-{SEQ:3}` (counter key `PRJ`), assigned when a project first gets a workspace.
- Roman months: I II III IV V VI VII VIII IX X XI XII. Dates in Asia/Jakarta.

---

## 2. Project stages & dashboard rules

Stages (`stage`), in order: `perencanaan` → `penawaran` → `kontrak` → `pengerjaan` → `uji` → `serah_terima` →
`pelunasan` → `maintenance` → `selesai`.

Derived stage (computed by the backend on every read; `stage_override` wins when set by an admin):

1. no BRD `disetujui|selesai` → `perencanaan`
2. no Proposal `disetujui|selesai` (or MoU pending when `use_mou`) → `penawaran`
3. PKS not `selesai` → `kontrak`
4. not all milestones `selesai` and UAT not submitted → `pengerjaan`
5. UAT not `selesai` → `uji`
6. BAST not `selesai` → `serah_terima`
7. any non-cancelled invoice not `lunas` → `pelunasan`
8. `has_maintenance` and SLA `selesai` and maintenance end date in the future → `maintenance`
9. otherwise `selesai`

`progress` (0–100) = Σ(weight × milestone progress) / Σ weight over milestones (0 when none).

**Missing documents** for a project = required types (§1, plus `mou`/`sla` when their flags are on) whose stage index is
≤ the current stage index and which are missing or still `draft`.

---

## 3. Database (migration `database/migrations/2026-10-21_006_project_documents.sql`)

MySQL 8 / MariaDB 10.4+ compatible, `utf8mb4_unicode_ci`, InnoDB, idempotent (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`s
like migration 004). Also add the tables to `database/schema.sql` and a row to `schema_migrations`.

```sql
pd_clients (
  id INT PK AI,
  type ENUM('perusahaan','perorangan') NOT NULL DEFAULT 'perusahaan',
  name VARCHAR(255) NOT NULL,               -- company or person name
  pic_name VARCHAR(255) NULL, pic_title VARCHAR(255) NULL,
  email VARCHAR(255) NULL, phone VARCHAR(50) NULL,
  address TEXT NULL, city VARCHAR(120) NULL, npwp VARCHAR(32) NULL,
  user_id INT NULL,                          -- users.id with role customer (login for the client)
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id)
)

-- project_client: new columns (ALTER, guarded)
client_id INT NULL, code VARCHAR(32) NULL UNIQUE,
stage_override VARCHAR(20) NULL,
use_mou TINYINT(1) NOT NULL DEFAULT 0,
has_maintenance TINYINT(1) NOT NULL DEFAULT 0,
maintenance_fee DECIMAL(15,2) NULL, maintenance_period ENUM('bulanan','tahunan') NULL,
maintenance_start DATE NULL, maintenance_end DATE NULL,
scope_summary TEXT NULL,
payment_terms LONGTEXT NULL,               -- JSON PaymentTerm[] (§4.2)
updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
-- contract value = existing column project_client.price

pd_milestones (
  id INT PK AI, project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL, description TEXT NULL,
  start_date DATE NULL, due_date DATE NULL,
  weight INT NOT NULL DEFAULT 1,             -- relative weight
  progress TINYINT NOT NULL DEFAULT 0,       -- 0..100
  status ENUM('belum_mulai','berjalan','selesai','tertunda') NOT NULL DEFAULT 'belum_mulai',
  sort_order INT NOT NULL DEFAULT 0, completed_at DATETIME NULL,
  KEY idx_project (project_id)
)

pd_documents (
  id INT PK AI, project_id INT NOT NULL,
  doc_type ENUM('brd','mou','proposal','pks','timeline','uat','bast','invoice','receipt','sla') NOT NULL,
  number VARCHAR(64) NOT NULL UNIQUE, title VARCHAR(255) NOT NULL,
  status ENUM('draft','menunggu_persetujuan','disetujui','selesai') NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  content LONGTEXT NOT NULL,                 -- JSON DocContent (§4.1) of the current version
  snapshot LONGTEXT NULL,                    -- JSON MergeData frozen at submit/issue (§4.3)
  content_hash CHAR(64) NULL,
  revision_requested TINYINT(1) NOT NULL DEFAULT 0, review_note TEXT NULL,
  doc_date DATE NOT NULL,                    -- tanggal dokumen
  submitted_at DATETIME NULL, approved_at DATETIME NULL, completed_at DATETIME NULL,
  created_by INT NULL, updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_project_type (project_id, doc_type)
)

pd_document_revisions (
  id INT PK AI, document_id INT NOT NULL, version INT NOT NULL,
  content LONGTEXT NOT NULL, change_note VARCHAR(500) NULL,
  changed_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_version (document_id, version)
)

pd_approvals (
  id INT PK AI, document_id INT NOT NULL, version INT NOT NULL,
  user_id INT NOT NULL, decision ENUM('approved','rejected') NOT NULL, note TEXT NULL,
  ip VARCHAR(64) NULL, user_agent VARCHAR(255) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_doc (document_id)
)

pd_signatures (
  id INT PK AI, document_id INT NOT NULL, version INT NOT NULL,
  party ENUM('pihak_pertama','pihak_kedua') NOT NULL,
  user_id INT NOT NULL, signer_name VARCHAR(255) NOT NULL, signer_title VARCHAR(255) NULL,
  method ENUM('draw','type') NOT NULL, image_file VARCHAR(255) NOT NULL,   -- file name in private storage
  content_hash CHAR(64) NOT NULL, ip VARCHAR(64) NULL, user_agent VARCHAR(255) NULL,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_version_party (document_id, version, party)
)

pd_invoices (
  id INT PK AI, project_id INT NOT NULL, document_id INT NOT NULL UNIQUE,
  term_key VARCHAR(40) NULL,                 -- PaymentTerm.key or NULL for manual
  kind ENUM('dp','termin','pelunasan','maintenance','lainnya') NOT NULL,
  issue_date DATE NOT NULL, due_date DATE NOT NULL,
  items LONGTEXT NOT NULL,                   -- JSON InvoiceItem[]
  subtotal DECIMAL(15,2) NOT NULL, discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  dpp DECIMAL(15,2) NOT NULL, ppn_rate DECIMAL(5,2) NOT NULL DEFAULT 0, ppn_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  pph23_rate DECIMAL(5,2) NOT NULL DEFAULT 0, pph23_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL, amount_due DECIMAL(15,2) NOT NULL, amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_status ENUM('belum_dibayar','sebagian','lunas','dibatalkan') NOT NULL DEFAULT 'belum_dibayar',
  notes TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_project (project_id)
)

pd_payments (
  id INT PK AI, invoice_id INT NOT NULL, amount DECIMAL(15,2) NOT NULL, paid_at DATE NOT NULL,
  method ENUM('transfer','tunai','qris','lainnya') NOT NULL DEFAULT 'transfer',
  reference VARCHAR(120) NULL, proof_file VARCHAR(255) NULL, note TEXT NULL,
  receipt_document_id INT NULL, recorded_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_invoice (invoice_id)
)

pd_notifications (
  id INT PK AI, user_id INT NULL,            -- one user, or NULL = every user of `role`
  role ENUM('admin','user','customer') NULL,
  type VARCHAR(40) NOT NULL, title VARCHAR(255) NOT NULL, body VARCHAR(500) NULL, link VARCHAR(255) NULL,
  project_id INT NULL, dedupe_key VARCHAR(120) NULL UNIQUE,
  read_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id), KEY idx_role (role)
)
-- Role broadcasts track reads per user:
pd_notification_reads (notification_id INT NOT NULL, user_id INT NOT NULL, read_at DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id))

pd_counters (counter_key VARCHAR(16) NOT NULL, year SMALLINT NOT NULL, last_seq INT NOT NULL DEFAULT 0,
  PRIMARY KEY (counter_key, year))

pd_activity (id INT PK AI, project_id INT NOT NULL, document_id INT NULL, user_id INT NULL,
  action VARCHAR(40) NOT NULL, detail VARCHAR(500) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_project (project_id))
```

Settings (existing key/value table `hero_settings`, keys below, JSON values). Seed defaults in the migration with
`INSERT IGNORE`; never invent real legal data: empty strings for NPWP/bank accounts.

| Key | JSON shape |
|---|---|
| `pd_company` | `{name:"PT Garuda Nexa Bahtera", address:"", city:"", phone:"", email:"", website:"https://garudanexa.com", npwp:"", signatory_name:"", signatory_title:"Direktur", bank_accounts:[{bank:"", number:"", holder:""}]}` |
| `pd_numbering` | `{prefix:"GNB"}` |
| `pd_tax` | `{ppn_enabled:false, ppn_rate:12, dpp_numerator:11, dpp_denominator:12, pph23_rate:2}` |
| `pd_payment_terms` | default PaymentTerm[] `[{key:"dp",label:"Uang muka (DP)",percent:50,trigger:"kontrak",due_days:7},{key:"termin2",label:"Termin 2",percent:30,trigger:"uji",due_days:7},{key:"pelunasan",label:"Pelunasan",percent:20,trigger:"serah_terima",due_days:7}]` |
| `pd_sla_defaults` | `{support_hours:"Senin–Jumat 09.00–17.00 WIB", uptime:"99,5%", priorities:[{level:"P1 – Kritis",response:"2 jam",resolution:"1 hari kerja"},{level:"P2 – Tinggi",response:"4 jam",resolution:"2 hari kerja"},{level:"P3 – Normal",response:"1 hari kerja",resolution:"5 hari kerja"}]}` |

Private storage (signatures, payment proofs): PHP `dirname(public_dir()) . '/storage/project-docs/'` (outside
`public_html` on cPanel; locally `<repo>/storage/project-docs/`, gitignored); Node: same folder via env `PD_STORAGE_DIR`
(default `<repo>/storage/project-docs`). File names are random hex + extension; never user-controlled.

---

## 4. Shared data shapes (TypeScript in `src/features/project-docs/types.ts`; backends emit the same JSON)

### 4.1 Document content

```ts
type DocType = 'brd'|'mou'|'proposal'|'pks'|'timeline'|'uat'|'bast'|'invoice'|'receipt'|'sla';
type DocStatus = 'draft'|'menunggu_persetujuan'|'disetujui'|'selesai';
interface DocTable { columns: string[]; rows: string[][] }
interface DocSection { id: string; title: string; body?: string; table?: DocTable; hidden?: boolean }
interface DocContent { title?: string; sections: DocSection[]; fields?: Record<string, string | number | boolean> }
```
`body` is plain text with a tiny markup: blank line = paragraph, lines starting `- ` = bullet, `1. ` = numbered,
`**bold**`. Merge fields `{{path}}` (e.g. `{{client.name}}`, `{{project.value_rupiah}}`, `{{project.value_terbilang}}`,
`{{company.signatory_name}}`, `{{document.date_long}}`, `{{document.day}}`) are resolved at render time from MergeData
(§4.3). Unknown fields render as `[…]` and are listed as warnings in the editor. Max content size 256 KB.

### 4.2 Money & terms

```ts
interface PaymentTerm { key: string; label: string; percent: number; trigger: 'kontrak'|'pengerjaan'|'uji'|'serah_terima'|'manual'; due_days: number }
interface InvoiceItem { description: string; qty: number; unit_price: number }
interface InvoiceTotals { subtotal: number; discount: number; base: number; dpp: number; ppn_rate: number; ppn_amount: number;
  total: number; pph23_rate: number; pph23_amount: number; amount_due: number }
```
Invoice math (integers, rupiah, round half up at each step; identical in PHP, Node and the engine):
`subtotal = Σ round(qty × unit_price)`; `base = subtotal − discount` (≥ 0);
PPN on: `dpp = round(base × dpp_numerator / dpp_denominator)`, `ppn_amount = round(dpp × ppn_rate / 100)`; off: `dpp = base`, `ppn = 0`;
`total = base + ppn_amount`; PPh 23 on (per invoice): `pph23_amount = round(base × pph23_rate / 100)`, else 0;
`amount_due = total − pph23_amount`. Payment status: `lunas` when `amount_paid ≥ amount_due`, `sebagian` when > 0, else
`belum_dibayar`. **Jatuh tempo** (overdue) is derived: `due_date < today` and not `lunas`/`dibatalkan`.

### 4.3 MergeData (what documents render from)

```ts
interface MergeData {
  company: { name; address; city; phone; email; website; npwp; signatory_name; signatory_title; bank_accounts: {bank;number;holder}[] };
  client: { type; name; pic_name; pic_title; email; phone; address; city; npwp };
  project: { id; code; name; service_type; service_label; description; scope_summary; value; value_rupiah; value_terbilang;
             start_date; end_date; duration_days; payment_terms: PaymentTerm[]; has_maintenance; maintenance_fee; maintenance_period;
             maintenance_start; maintenance_end };
  milestones: { title; description; start_date; due_date; weight; progress; status }[];
  document: { number; type; title; date; date_long; day; version; status };
  invoice?: InvoiceTotals & { kind; issue_date; due_date; items: InvoiceItem[]; amount_paid; payment_status; notes };
  payment?: { amount; amount_terbilang; paid_at; method; reference; invoice_number };
  signatures: { party; signer_name; signer_title; signed_at; image_url? }[];
}
```
The backend builds MergeData for `pd_document_get` / `pd_my_document` (live while `draft`, frozen `snapshot` otherwise;
`signatures` always live from `pd_signatures` of the current version, `image_url` is a `pd_file` reference string
`pdfile:sig:<id>` that the frontend downloads with the token).

---

## 5. API (both backends, identical JSON, all `POST` JSON or `GET` query, through `api.php` / `server.js`)

Auth lists: add every `pd_*` staff action to the staff set (default for non-public, non-customer actions), admin-only ones
to `ADMIN_ACTIONS`, customer ones (`pd_my_*`, `pd_notifications_*` are shared — see below) to `CUSTOMER_ACTIONS`.
`pd_notifications_list`, `pd_notifications_read`, `pd_file` are allowed for **all logged-in roles** (add a small
`ANY_ROLE_ACTIONS` list in both backends, checked before the customer/staff split).

Errors: `{error, code?}` with HTTP 400 validation, 401, 403, 404 (`NOT_FOUND`), 409 conflict (`LOCKED`, `DUPLICATE`, `STATE`).
Success: `{success:true, ...}`.

| Action | Who | Input | Output |
|---|---|---|---|
| `pd_dashboard` | staff | – | `{stats:{projects_active, docs_missing, approvals_pending, invoices_unpaid_count, invoices_unpaid_amount, invoices_overdue_count, invoices_overdue_amount}, stages:{[stage]:count}, projects:[ProjectSummary], pending_approvals:[DocSummary], due_invoices:[InvoiceSummary], activity:[Activity(20)]}` |
| `pd_clients_list` | staff | `q?` | `{clients:[Client & {project_count, user_email?}]}` |
| `pd_client_save` | admin | Client fields, `id?`, `user_id?` (must be role customer) | `{success, id}` |
| `pd_client_delete` | admin | `id` | 409 when projects reference it |
| `pd_customers_list` | admin | `q?` | `{customers:[{id,name,email}]}` (role customer, to link a client) |
| `pd_projects_list` | staff | `stage?`, `q?` | `{projects:[ProjectSummary]}` |
| `pd_project_get` | staff | `id` | `{project:ProjectDetail}` (project + client + milestones + documents[DocSummary] + invoices[InvoiceSummary] + checklist[] + activity[]) |
| `pd_project_save` | admin | `id` (existing project_client), `client_id`, `scope_summary`, `use_mou`, `has_maintenance`, `maintenance_*`, `payment_terms`, `price?`, `stage_override?` (null clears) | `{success}`; assigns `code` when missing |
| `pd_milestone_save` | staff | `project_id`, `id?`, title, description, start_date, due_date, weight, progress, status, sort_order | `{success, id}` |
| `pd_milestone_delete` | admin | `id` | `{success}` |
| `pd_document_create` | staff* | `project_id`, `doc_type`, `content` (from the engine's default template), `title`, `doc_date?` | `{success, id, number}`; 409 `DUPLICATE` when a non-invoice/receipt type already exists for the project |
| `pd_document_get` | staff | `id` | `{document: DocDetail}` (+ revisions[], approvals[], signatures[], merge: MergeData, invoice?, payments?) |
| `pd_document_save` | staff* | `id`, `content`, `title?`, `doc_date?`, `change_note?` | `{success, version}`; 409 `LOCKED` unless `draft` |
| `pd_document_restore` | staff* | `id`, `version` | `{success, version}` (draft only) |
| `pd_document_submit` | staff* | `id` | → `menunggu_persetujuan` (approval=client) or `disetujui` (invoice "issue"); freezes snapshot; notifies client |
| `pd_document_withdraw` | staff* | `id` | `menunggu_persetujuan` → `draft` |
| `pd_document_change` | admin | `id`, `reason` (≥10 chars) | locked → new `draft` version; 409 for invoices with payments |
| `pd_document_sign` | admin | `id`, `signature:{method, data_url?, typed_name?}`, `signer_name`, `signer_title` | signs as `pihak_pertama` (must be `disetujui` or `menunggu_persetujuan`); may complete the doc |
| `pd_document_complete` | admin | `id` | → `selesai` (brd/proposal/timeline only, from `disetujui`) |
| `pd_document_delete` | admin | `id` | only `draft` and never submitted |
| `pd_invoice_create` | admin | `project_id`, `term_key?` or manual `kind`, `items`, `discount`, `ppn_enabled`, `pph23_enabled`, `issue_date`, `due_date`, `notes`, `content` | creates `pd_documents` (invoice) + `pd_invoices`; server recomputes all totals (never trusts client totals) |
| `pd_invoice_update` | admin | `id` (invoice id) + same fields | draft only |
| `pd_invoice_cancel` | admin | `id`, `reason` | `dibatalkan` (no payments only) |
| `pd_payment_record` | admin | `invoice_id`, `amount` (> 0, ≤ remaining), `paid_at`, `method`, `reference?`, `proof?` (data URL jpg/png/pdf ≤ 5 MB), `note?`, `receipt_content` | creates payment + receipt document (`selesai`) atomically; updates invoice; notifies client |
| `pd_payment_delete` | admin | `id` | reverses amounts; receipt gets `review_note` "Dibatalkan" and stays in history |
| `pd_settings_get` | staff | – | `{company, numbering, tax, payment_terms, sla_defaults}` |
| `pd_settings_save` | admin | any of those objects | validated per field |
| `pd_my_projects` | customer | – | `{projects:[ProjectSummary]}` own only |
| `pd_my_project` | customer | `id` | ProjectDetail without drafts, activity limited to client-visible events |
| `pd_my_document` | customer | `id` | DocDetail (non-draft, own project) |
| `pd_my_document_decide` | customer | `id`, `decision` (`approved`/`rejected`), `note` (required when rejected), `signature?` (required when the type needs both parties), `signer_name`, `signer_title?` | approves/rejects the **current version** in `menunggu_persetujuan` |
| `pd_notifications_list` | any role | `unread_only?` | `{notifications:[…], unread}`; also lazily creates due-soon (H-3) and overdue notices with `dedupe_key` |
| `pd_notifications_read` | any role | `id?` or `all:true` | `{success}` |
| `pd_file` | any role | `ref` (`sig:<id>` / `proof:<id>`) | binary with correct `Content-Type`, `Content-Disposition`, `Cache-Control: private, no-store`; access checked (staff: any; customer: own project only) |

`staff*` = admin or Developer. **Developer limits**: may create/save/submit/withdraw only `brd`, `timeline`, `uat`;
may save milestones; may read everything. Everything financial (proposal, PKS, invoices, payments, settings, clients)
and signing as the company are admin-only. Enforce in the handler (not only in the UI).

Validation essentials: ids positive ints; enums checked; dates `YYYY-MM-DD` and real; money `0 ≤ x ≤ 1e12`;
percentages 0–100 and payment terms sum to 100 (± 0.01); text limits (title 255, notes 2000, reason 500); signature
data URL must be `data:image/png;base64`, decodes, ≤ 300 KB; proof ≤ 5 MB and MIME sniffed (jpg/png/pdf). All SQL uses
bound parameters. Every state change writes `pd_activity` and, where relevant, notifications (`pd_notifications`).

Notifications created by the backend:
| Event | To | Type |
|---|---|---|
| Document submitted/issued | client user | `doc_review` / `invoice_issued` |
| Client approved / rejected / signed | role admin | `doc_approved` / `doc_rejected` |
| Payment recorded | client user | `payment_received` |
| Invoice due in ≤ 3 days / overdue | client user + role admin | `invoice_due` / `invoice_overdue` (dedupe per invoice per day) |

---

## 6. Document engine (frontend, `src/features/project-docs/engine/`)

Public API (other code imports **only** from `src/features/project-docs/engine/index.ts`):

```ts
export const DOC_TYPES: Record<DocType, { label: string; short: string; code: string; required: boolean | 'mou' | 'sla';
  approval: 'client' | 'none'; parties: ('pihak_pertama' | 'pihak_kedua')[]; stage: Stage }>;
export const STAGES: { key: Stage; label: string }[];
export function defaultContent(type: DocType, data: MergeData): DocContent;     // professional Indonesian template
export function resolveMerge(text: string, data: MergeData): { text: string; missing: string[] };
export function buildModel(type: DocType, content: DocContent, data: MergeData): DocModel; // blocks incl. kop + signatures
export function calcInvoice(items: InvoiceItem[], o: { discount: number; ppn_enabled: boolean; ppn_rate: number;
  dpp_numerator: number; dpp_denominator: number; pph23_enabled: boolean; pph23_rate: number }): InvoiceTotals;
export function terbilang(n: number): string;         // "satu juta dua ratus lima puluh ribu rupiah"
export function formatRupiahDoc(n: number): string;   // "Rp1.250.000"
export function tanggalPanjang(iso: string): string;  // "21 Oktober 2026"; hari(iso) → "Rabu"
export function romawi(month: number): string;
export const DocumentPreview: React.FC<{ model: DocModel; className?: string }>; // A4 page look, screen + print CSS
export function exportPdf(model: DocModel, fileName: string): Promise<void>;   // lazy pdfmake, triggers download
export function exportDocx(model: DocModel, fileName: string): Promise<void>;  // lazy docx, triggers download
export const SECTION_HINTS: Record<DocType, Record<string, string>>;          // editor help per section id
```

`DocModel` = `{ meta:{number,title,type,date}, kop:{company}, blocks: Block[], signatures: SignatureSlot[], footer }`
with `Block` = heading | paragraph (runs: text/bold) | list | table | keyValue | spacer | pageBreak | meteraiBox.
The same model drives preview, PDF and DOCX so the three look alike.

Templates (Indonesian, formal, ready for real use; every section editable):
- **BRD**: Informasi dokumen, Latar belakang, Tujuan bisnis, Ruang lingkup, Pemangku kepentingan (tabel), Kebutuhan
  fungsional (tabel: Kode · Kebutuhan · Prioritas MoSCoW), Kebutuhan non-fungsional, Asumsi & batasan, Kriteria keberhasilan, Persetujuan.
- **MoU**: judul + nomor, para pihak (identitas lengkap), maksud & tujuan, ruang lingkup kerja sama, jangka waktu,
  pembiayaan (tidak mengikat), kerahasiaan, lain-lain, penutup, tanda tangan.
- **Proposal & Penawaran**: ringkasan, pemahaman kebutuhan, solusi yang ditawarkan, ruang lingkup & deliverable,
  jadwal ringkas (dari milestones), rincian biaya (tabel), termin pembayaran (dari payment_terms), masa berlaku penawaran
  (30 hari), syarat & ketentuan, penutup.
- **PKS + SOW**: "PERJANJIAN KERJA SAMA PEMBUATAN {service}" + nomor; "Pada hari ini {hari}, tanggal {tanggal panjang}…";
  PIHAK PERTAMA (perusahaan, diwakili penandatangan) & PIHAK KEDUA (klien); Pasal 1 Definisi, 2 Ruang Lingkup Pekerjaan,
  3 Jangka Waktu, 4 Nilai Kontrak (angka + terbilang), 5 Cara Pembayaran (termin), 6 Hak & Kewajiban Para Pihak,
  7 Serah Terima, 8 Garansi & Pemeliharaan, 9 Hak Kekayaan Intelektual, 10 Kerahasiaan, 11 Keadaan Memaksa,
  12 Pemutusan Perjanjian, 13 Penyelesaian Perselisihan (musyawarah, lalu Pengadilan Negeri domisili PIHAK PERTAMA),
  14 Penutup; tanda tangan + kotak e-Meterai; **Lampiran SOW**: deliverable, fitur, di luar ruang lingkup, asumsi,
  kriteria penerimaan, jadwal milestone (tabel).
- **Timeline**: tabel milestone (No · Tahapan · Mulai · Selesai · Durasi · Bobot · Status) + catatan + persetujuan.
- **UAT**: informasi pengujian, tabel skenario (ID · Fitur · Langkah · Hasil diharapkan · Hasil aktual · Lulus/Gagal ·
  Catatan), ringkasan hasil, keputusan penerimaan, tanda tangan.
- **BAST**: "BERITA ACARA SERAH TERIMA PEKERJAAN" + nomor; "Pada hari ini…"; para pihak; tabel yang diserahkan
  (domain, hosting/server, kode sumber, akun administrator, dokumentasi, pelatihan); pernyataan diterima dengan baik;
  masa garansi; tanda tangan + e-Meterai.
- **Invoice**: kop, nomor, tanggal, jatuh tempo, "Ditagihkan kepada", tabel item, subtotal/diskon/DPP/PPN/total/PPh 23/
  jumlah yang harus dibayar, terbilang, rekening pembayaran (settings), keterangan termin, status pembayaran.
- **Kuitansi**: "KUITANSI" + nomor; Telah terima dari; Uang sejumlah (terbilang, italic); Untuk pembayaran (invoice +
  termin + proyek); kotak nominal; kota & tanggal; tanda tangan penerima (perusahaan).
- **SLA**: para pihak, layanan yang dicakup, jam layanan, tabel prioritas (respons/penyelesaian), target uptime,
  pengecualian, biaya & periode (maintenance_fee/period), pelaporan & eskalasi, kompensasi, jangka waktu, tanda tangan.

Kop on every page: wings logo (brand blue) left, company name bold, address · phone · email · website below, thin brand
line under it. Footer: `{number}` left, `Halaman x dari y` right. Fonts: Inter-like sans in preview; pdfmake default
Roboto. A4 portrait, margins 2 cm (left 2.5 cm for contracts).

---

## 7. UI

Admin (`src/pages/admin/project-docs/`, admin primitives from `src/components/admin/ui`, tokens `adm-*`, "kamu"):
- Nav group **Custom**: `Dashboard proyek` `/admin/proyek`, `Project Clients` (existing), `Klien` `/admin/klien`,
  `Pengaturan dokumen` `/admin/proyek/pengaturan` (admin only).
- `/admin/proyek` dashboard: StatTiles (proyek aktif, dokumen belum lengkap, menunggu persetujuan, invoice belum dibayar
  (Rp), jatuh tempo), stage pipeline (9 stages with counts, clickable filter), projects table/cards (code, name, client,
  stage pill, progress bar, missing docs chips, next due), panels "Menunggu persetujuan" and "Invoice jatuh tempo",
  recent activity.
- `/admin/proyek/:id` workspace: header (code, name, client, value, stage stepper), tabs **Ringkasan** (project setup
  form: client, scope, termin, MoU/maintenance flags), **Dokumen** (checklist of the set with status, number, version,
  actions: buat / buka / ekspor), **Jadwal** (milestones CRUD + progress), **Invoice & pembayaran** (invoices from termin,
  record payment, receipts), **Aktivitas**.
- `/admin/proyek/:id/dokumen/:docId` editor: sections editor (title, body textarea with markup help, table editor,
  hide/show, reorder), live A4 preview (`DocumentPreview`), toolbar: Simpan draft (Ctrl+S), Pratinjau, Ajukan persetujuan /
  Terbitkan, Tarik kembali, Tandatangani (pihak pertama: draw/type pad), Ajukan perubahan, Ekspor PDF / DOCX, Riwayat
  revisi (drawer with restore), approvals & signatures panel, unresolved merge-field warnings, unsaved-changes guard.
- `/admin/klien`: clients CRUD, link to customer account, project count.
- `/admin/proyek/pengaturan`: company identity & signatory, bank accounts, numbering prefix, tax, default termin, SLA defaults.
- Existing Project Clients page: add "Buka workspace" action per project → `/admin/proyek/:id`.
- Bell (`NotificationBell`) in the admin header.

Customer (`src/pages/account/projects/`, public/account tokens, "Anda"):
- Account nav: add `Proyek saya` → `/akun/proyek` (show only when the user has projects, or always with empty state).
- `/akun/proyek`: cards (code, name, stage, progress, "Perlu tindakan" badge count).
- `/akun/proyek/:id`: stage stepper, progress, "Perlu persetujuan Anda" list, documents list (non-draft), invoices
  (status, due, amount, download PDF), receipts.
- `/akun/proyek/:id/dokumen/:docId`: A4 preview, download PDF/DOCX, approve / request revision (note), signature pad
  (draw with mouse/touch or type name; clear; preview) with consent checkbox "Saya menyetujui isi dokumen ini dan
  menandatanganinya secara elektronik".
- Bell (`NotificationBell`) in the account header.

Both: loading, empty, error states; responsive (360/390/1366); keyboard accessible; no raw hex outside tokens.

---

## 8. File ownership (parallel build)

| Owner | Files |
|---|---|
| Foundation | `database/migrations/2026-10-21_006_project_documents.sql`, `database/schema.sql` (append), `.gitignore` (`storage/`), `src/features/project-docs/types.ts`, `src/features/project-docs/api.ts` (typed wrappers), action lists + hooks in `backend/api.php` & `backend/security.js` & `backend/server.js`, empty module stubs, route stubs in `src/pages/admin/routes.tsx` + `src/App.tsx` (account), nav entries (`src/components/admin/nav.ts`, account layout), bell slots in `src/components/admin/Header.tsx` and `src/pages/account/AccountLayout.tsx`, `package.json` deps |
| PHP backend | `backend/modules/project_docs.php` (+ `backend/modules/project_docs/*.php`) |
| Node backend | `backend/modules/project_docs.js` (+ `backend/modules/project_docs/*.js`) |
| Engine | `src/features/project-docs/engine/**`, `src/features/project-docs/__tests__/engine*.test.ts` |
| Admin UI | `src/pages/admin/project-docs/**`, the "Buka workspace" action in `src/pages/admin/project-clients/*` |
| Customer UI | `src/pages/account/projects/**`, `src/features/project-docs/notifications/**`, `src/features/project-docs/signature/**` |
| Integration | `__tests__/backend/project-docs*.test.ts`, fixes anywhere after the build |
