# Dashboard Builder — Backend Specification

Dokumen ini menjelaskan kebutuhan backend untuk fitur **Dashboard Builder** pada aplikasi Distributor Channel.

## 1. Tujuan

Dashboard Builder memungkinkan administrator mengatur dashboard berdasarkan role pengguna, meliputi:

- jumlah baris dashboard;
- jumlah kolom pada setiap baris (1–3 kolom);
- widget yang ditampilkan;
- urutan widget;
- posisi baris dan kolom widget;
- panjang widget dalam satuan kolom.

Konfigurasi harus disimpan di backend agar berlaku konsisten untuk seluruh pengguna dengan role yang sama dan tidak bergantung pada browser tertentu.

## 2. Kondisi frontend saat ini

Frontend sementara menyimpan layout pada `localStorage` menggunakan key:

```text
dc-dashboard-layout:role:{roleId}
```

Contoh data yang tersimpan:

```json
{
  "rows": [
    { "columns": 3 },
    { "columns": 2 }
  ],
  "widgets": [
    {
      "id": "customer-orders",
      "sort": 1,
      "row": 1,
      "column": 1,
      "span": 1
    },
    {
      "id": "order-ready",
      "sort": 2,
      "row": 2,
      "column": 1,
      "span": 2
    }
  ]
}
```

Setelah backend tersedia, `localStorage` hanya boleh digunakan sebagai fallback/cache dan bukan sumber data utama.

## 3. Daftar widget frontend

Backend cukup menyimpan ID widget. Definisi komponen, judul, ikon, dan fungsi pengambilan data tetap dikelola frontend.

ID widget yang tersedia saat dokumen ini dibuat:

| ID | Nama | Grup |
|---|---|---|
| `customer-orders` | Total Orders | Customer Portal |
| `customer-revenue` | Revenue | Customer Portal |
| `customer-items` | Total Items | Customer Portal |
| `corporate-requests` | Purchase Requests | Corporate |
| `corporate-pending` | Pending Requests | Corporate |
| `corporate-approved` | Approved Requests | Corporate |
| `logistics-orders` | Orders Ready | Logistics |
| `logistics-approved` | Approved Orders | Logistics |
| `logistics-pending` | Non Approved | Logistics |
| `order-ready` | Order Ready | Logistics |
| `production-orders` | Production Orders | Production |
| `production-progress` | In Progress | Production |
| `production-completed` | Completed | Production |
| `production-materials` | Materials | Production |
| `production-receipts` | Production Receipts | Production |
| `production-issues` | Production Issues | Production |
| `vendor-registrations` | Registrations | Vendor Management |
| `vendor-pending` | Pending Vendors | Vendor Management |
| `vendor-approved` | Approved Vendors | Vendor Management |

Backend sebaiknya tidak menolak widget ID baru secara hard-coded. Validasi ID dapat memakai master widget bila nantinya master tersebut dikelola backend.

## 4. Skema database yang disarankan

### Tabel `dashboard_layouts`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint / UUID | Primary key |
| `role_id` | bigint | Role pemilik layout; unique |
| `version` | integer | Versi konfigurasi untuk optimistic locking |
| `created_by` | bigint, nullable | User pembuat |
| `updated_by` | bigint, nullable | User terakhir yang mengubah |
| `created_at` | timestamp | Waktu dibuat |
| `updated_at` | timestamp | Waktu diperbarui |

### Tabel `dashboard_layout_rows`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint / UUID | Primary key |
| `dashboard_layout_id` | foreign key | Relasi ke layout |
| `row_number` | small integer | Nomor baris mulai dari 1 |
| `columns` | small integer | Jumlah kolom, minimal 1 dan maksimal 3 |

Unique constraint yang disarankan:

```text
(dashboard_layout_id, row_number)
```

### Tabel `dashboard_layout_widgets`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint / UUID | Primary key |
| `dashboard_layout_id` | foreign key | Relasi ke layout |
| `widget_key` | varchar(100) | ID widget frontend |
| `sort_order` | integer | Urutan widget mulai dari 1 |
| `row_number` | small integer | Row tempat widget berada |
| `column_number` | small integer | Kolom awal widget |
| `column_span` | small integer | Panjang widget dalam jumlah kolom |
| `properties` | JSON, nullable | Cadangan konfigurasi khusus widget di masa depan |

Unique constraint yang disarankan:

```text
(dashboard_layout_id, widget_key)
```

Alternatif implementasi sederhana adalah menyimpan seluruh konfigurasi dalam satu kolom JSON `layout`, tetapi tabel terpisah lebih mudah divalidasi, diaudit, dan dikembangkan.

## 5. Endpoint API

Base path yang disarankan:

```text
/api/dashboard-layouts
```

Semua endpoint menggunakan autentikasi Bearer token aplikasi.

### 5.1 Mengambil layout role pengguna aktif

```http
GET /api/dashboard-layouts/me
```

Endpoint ini digunakan ketika halaman dashboard dibuka.

Response berhasil:

```json
{
  "success": true,
  "message": "Dashboard layout retrieved successfully",
  "data": {
    "role_id": 5,
    "version": 3,
    "rows": [
      { "row": 1, "columns": 3 },
      { "row": 2, "columns": 2 }
    ],
    "widgets": [
      {
        "id": "customer-orders",
        "sort": 1,
        "row": 1,
        "column": 1,
        "span": 1,
        "properties": null
      },
      {
        "id": "order-ready",
        "sort": 2,
        "row": 2,
        "column": 1,
        "span": 2,
        "properties": null
      }
    ],
    "updated_at": "2026-09-25T10:30:00+07:00"
  }
}
```

Jika role belum memiliki layout, backend mengembalikan konfigurasi kosong, bukan `404`:

```json
{
  "success": true,
  "message": "Dashboard layout has not been configured",
  "data": {
    "role_id": 7,
    "version": 0,
    "rows": [{ "row": 1, "columns": 3 }],
    "widgets": [],
    "updated_at": null
  }
}
```

### 5.2 Mengambil layout berdasarkan role

```http
GET /api/dashboard-layouts/roles/{roleId}
```

Digunakan oleh administrator ketika mengganti pilihan role pada Dashboard Builder.

Hak akses: administrator.

### 5.3 Menyimpan layout berdasarkan role

Gunakan operasi upsert agar frontend tidak perlu membedakan create dan update.

```http
PUT /api/dashboard-layouts/roles/{roleId}
Content-Type: application/json
```

Request:

```json
{
  "version": 3,
  "rows": [
    { "row": 1, "columns": 3 },
    { "row": 2, "columns": 2 }
  ],
  "widgets": [
    {
      "id": "customer-orders",
      "sort": 1,
      "row": 1,
      "column": 1,
      "span": 1
    },
    {
      "id": "order-ready",
      "sort": 2,
      "row": 2,
      "column": 1,
      "span": 2
    }
  ]
}
```

Response berhasil:

```json
{
  "success": true,
  "message": "Dashboard layout saved successfully",
  "data": {
    "role_id": 5,
    "version": 4,
    "rows": [
      { "row": 1, "columns": 3 },
      { "row": 2, "columns": 2 }
    ],
    "widgets": [
      {
        "id": "customer-orders",
        "sort": 1,
        "row": 1,
        "column": 1,
        "span": 1,
        "properties": null
      },
      {
        "id": "order-ready",
        "sort": 2,
        "row": 2,
        "column": 1,
        "span": 2,
        "properties": null
      }
    ],
    "updated_at": "2026-09-25T10:35:00+07:00"
  }
}
```

Hak akses: administrator.

### 5.4 Menghapus/reset layout role

```http
DELETE /api/dashboard-layouts/roles/{roleId}
```

Hak akses: administrator.

Response:

```json
{
  "success": true,
  "message": "Dashboard layout reset successfully",
  "data": null
}
```

## 6. Aturan validasi

Backend wajib memvalidasi keseluruhan layout secara transaksional.

### Rows

- `rows` wajib berupa array.
- Minimal satu row.
- Maksimal 10 row sesuai batas frontend saat ini.
- `row` harus berurutan mulai dari 1 tanpa nomor yang terlewat.
- `columns` harus integer antara 1 dan 3.

### Widgets

- `widgets` wajib berupa array, boleh kosong.
- `id` wajib string dengan panjang maksimal 100 karakter.
- Satu widget ID hanya boleh muncul sekali dalam satu layout.
- `sort` harus integer positif dan unik.
- Nilai `sort` harus dinormalisasi berurutan mulai dari 1.
- `row` harus menunjuk ke row yang tersedia.
- `column` minimal 1 dan tidak boleh melebihi jumlah kolom row.
- `span` minimal 1 dan tidak boleh melebihi jumlah kolom row.
- `column + span - 1` tidak boleh melebihi jumlah kolom row.

Contoh error validasi:

```json
{
  "success": false,
  "message": "Dashboard layout validation failed",
  "errors": {
    "widgets.1.span": [
      "Widget span exceeds the number of columns available in row 2."
    ]
  }
}
```

HTTP status: `422 Unprocessable Entity`.

## 7. Konflik posisi widget

Versi frontend saat ini mengizinkan beberapa widget berada pada row dan kolom awal yang sama. CSS Grid akan menempatkannya pada jalur berikutnya secara otomatis.

Backend tidak perlu menolak posisi yang sama, tetapi wajib memastikan rentang kolom widget tidak keluar dari row. Jika nantinya frontend menerapkan posisi sel yang absolut, validasi collision dapat ditambahkan sebagai aturan baru.

## 8. Versioning dan concurrent update

Field `version` disarankan untuk mencegah administrator saling menimpa konfigurasi.

Aturan:

1. Backend mengembalikan `version` pada GET.
2. Frontend mengirim `version` terakhir pada PUT.
3. Jika versi request berbeda dari versi database, backend mengembalikan `409 Conflict`.

Contoh:

```json
{
  "success": false,
  "message": "Dashboard layout has been updated by another user",
  "data": {
    "current_version": 5
  }
}
```

## 9. Otorisasi

- GET `/me`: semua pengguna terautentikasi.
- GET berdasarkan role: administrator.
- PUT berdasarkan role: administrator.
- DELETE berdasarkan role: administrator.
- Backend tidak boleh hanya mengandalkan pengecekan role dari frontend.
- Setiap perubahan disarankan mencatat `created_by` dan `updated_by`.

Administrator aplikasi saat ini dikenali frontend melalui role ID `5`. Backend sebaiknya menggunakan policy/permission resmi, bukan angka role yang di-hard-code di controller.

## 10. Transaction dan proses penyimpanan

PUT layout harus dilakukan dalam satu database transaction:

1. validasi role target;
2. validasi payload;
3. lock record layout bila sudah ada;
4. periksa `version`;
5. upsert `dashboard_layouts`;
6. ganti/update rows;
7. ganti/update widgets;
8. increment `version`;
9. commit;
10. kembalikan layout terbaru.

Jika salah satu proses gagal, seluruh perubahan harus di-rollback.

## 11. Integrasi frontend yang direncanakan

Alur pembacaan dashboard:

1. Frontend memanggil `GET /api/dashboard-layouts/me`.
2. Jika berhasil, response backend menjadi sumber data utama.
3. Jika request gagal karena gangguan jaringan, frontend dapat memakai cache `localStorage` terakhir.
4. Widget yang ID-nya tidak lagi dikenal frontend diabaikan tanpa menggagalkan seluruh dashboard.

Alur Dashboard Builder:

1. Administrator membuka halaman `/dashboard-builder`.
2. Frontend mengambil daftar role dari endpoint role yang sudah tersedia.
3. Ketika role dipilih, frontend memanggil `GET /api/dashboard-layouts/roles/{roleId}`.
4. Ketika tombol Simpan ditekan, frontend mengirim `PUT /api/dashboard-layouts/roles/{roleId}`.
5. Response tersimpan ditulis ke cache lokal.
6. Dashboard pada tab lain melakukan refresh layout.

## 12. Migrasi localStorage

Strategi migrasi yang disarankan:

1. Saat GET backend mengembalikan layout kosong, frontend memeriksa key lokal untuk role tersebut.
2. Jika ada layout lokal dan user adalah administrator, frontend menawarkan atau menjalankan migrasi satu kali melalui PUT.
3. Setelah PUT berhasil, data backend menjadi sumber utama.
4. Key lokal dapat dipertahankan sebagai cache dengan menyimpan `version` backend.
5. Jangan menghapus data lokal sebelum server mengonfirmasi penyimpanan berhasil.

## 13. Acceptance criteria backend

- Layout dapat disimpan dan dibaca berdasarkan role.
- User biasa menerima layout untuk role-nya melalui endpoint `/me`.
- User biasa tidak dapat membaca atau mengubah layout role lain.
- Setiap row hanya menerima 1–3 kolom.
- Posisi dan span widget selalu berada di dalam batas row.
- Widget tidak terduplikasi dalam satu layout.
- Penyimpanan bersifat transaksional.
- Update bersamaan ditangani menggunakan version conflict atau mekanisme setara.
- Response mengikuti format `success`, `message`, dan `data` yang konsisten dengan API Distributor Channel.

