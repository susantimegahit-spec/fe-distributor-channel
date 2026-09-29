# Spesifikasi Kebutuhan Teknis Frontend: In-House Task Management System (ClickUp Replacement Terintegrasi HRIS)
**PT Susanti Megah Perkasa**  
**Dokumen Panduan & Kebutuhan Implementasi Tim Frontend (FE)**

---

## 1. Pendahuluan & Latar Belakang

Sistem Task Management ini dibangun sebagai pengganti in-house untuk platform eksternal ClickUp. Modul ini berjalan di dalam platform portal PT Susanti Megah Perkasa dan terhubung langsung secara native dengan sistem HRIS perusahaan.

### Tujuan Utama
* **Manajemen Tugas Multi-Departemen:** Mendukung ruang kerja untuk seluruh departemen perusahaan (IT, HRD, Finance, SCM, Marketing, Quality Assurance, Production, dan lainnya).
* **Integrasi Native HRIS:** Penugasan pelaksana (*Assignee*), penanggung jawab, dan garis koordinasi menggunakan data master karyawan HRIS yang aktif.
* **Struktur Hirarki Fleksibel:** Mengikuti pola organisasi ClickUp: Workspace ➔ Space (Departemen) ➔ Folder (Proyek/Sprint) ➔ List ➔ Task ➔ Checklist & Subtask.
* **Audit Trail & Akuntabilitas:** Setiap perubahan status, deadline, checklist, dan komentar tercatat lengkap, serta dilengkapi pencatatan jam kerja nyata (*Live Time Tracker Stopwatch* dan *Manual Timesheet*).

---

## 2. Struktur Hirarki & Konsep Kerja

Antarmuka frontend harus merefleksikan hierarki data sebagai berikut:

* **Workspace:** Level tertinggi entitas korporat (default: PT Susanti Megah Perkasa).
* **Space:** Ruang kerja per departemen atau divisi besar (misalnya: Departemen IT, Departemen HRD, Departemen Finance). Setiap Space memiliki warna identitas dan ikon.
* **Folder:** Pengelompokan proyek, sprint, atau inisiatif spesifik di dalam Space (misalnya: Proyek Revamp ERP, Sprint Q3, Maintenance Server).
* **List:** Daftar tugas spesifik di dalam Space atau Folder (misalnya: Backlog, To Do List, Bug Tracker).
* **Task:** Unit tugas utama yang memiliki kode identitas unik (format: TSK-[DEPT]-[YYYY]-[NOMOR]), judul, deskripsi, prioritas SLA, deadline, serta daftar pelaksana dari karyawan HRIS.
* **Checklist & To-Do:** Butir-butir pekerjaan detail di dalam Task yang dapat dicentang satu per satu dan di-assign ke karyawan tertentu.
* **Time Tracking:** Sesi pencatatan durasi kerja per tugas oleh karyawan.

---

## 3. Spesifikasi Kebutuhan Halaman & Komponen Antarmuka (UI/UX)

Modul ini memerlukan beberapa komponen utama yang terpadu:

### 3.1. Navigasi Hirarki Ruang Kerja (Sidebar / Tree Navigator)
Terletak pada sisi kiri halaman kerja untuk berpindah ruang lingkup secara cepat:
* **Workspace Selector:** Memilih workspace aktif.
* **Daftar Space Departemen:** Menampilkan daftar Space dengan indikator warna dan ikon departemen.
* **Expandable Tree Navigation:** Struktur pohon yang dapat dibuka/tutup untuk melihat Folder dan List di bawah Space yang sedang dipilih.
* **Tombol Aksi Tambah Hirarki:** Tombol cepat untuk membuat Space baru, Folder baru, atau List baru.
* **Indikator Aktif:** Menandai Space, Folder, atau List mana yang sedang dibuka di area konten utama.

### 3.2. Panel Metrik & Ringkasan KPI (Top Metric Cards)
Terletak di bagian atas area konten utama, menampilkan kartu ringkasan berbasis Space/List yang dipilih:
* **Total Tugas:** Jumlah seluruh tugas.
* **To Do:** Jumlah tugas yang belum dikerjakan.
* **In Progress:** Jumlah tugas yang sedang dalam pengerjaan.
* **Under Review:** Jumlah tugas yang menunggu verifikasi/peninjauan atasan.
* **Done / Completed:** Jumlah tugas yang telah rampung.
* **Overdue:** Jumlah tugas yang telah melewati batas tanggal deadline namun belum selesai (disorot dengan warna merah/peringatan).
* **Tingkat Penyelesaian (Completion Rate %):** Rasio persentase tugas selesai terhadap total tugas.

### 3.3. Tampilan Daftar Tugas Utama (Dual-View: List & Kanban Board)
Sediakan tombol toggle untuk beralih antara dua mode tampilan utama:

#### Mode 1: List View (Tampilan Tabel Dinamis)
* Pengelompokan tugas berdasarkan Status atau berdasarkan List.
* Kolom yang ditampilkan:
  * **Kode Tugas:** Tautan unik tugas (contoh: TSK-IT-2026-00001).
  * **Judul Tugas:** Nama tugas dengan tooltip deskripsi singkat.
  * **Prioritas:** Badge prioritas dengan warna representatif sesuai SLA (Urgent, High, Normal, Low).
  * **Assignees:** Tumpukan avatar/foto profil karyawan HRIS yang ditugaskan.
  * **Tenggat Waktu (Due Date):** Tanggal batas akhir pengerjaan. Tampilkan penanda visual warna merah jika tugas telah melewati batas waktu (overdue).
  * **Progress Checklist:** Indikator perbandingan checklist selesai (contoh: 3/5 atau progress bar mini).
  * **Total Durasi Kerja:** Akumulasi jam kerja yang telah tercatat pada tugas tersebut.
* Fitur Pencarian & Filter Cepat:
  * Input pencarian berdasarkan kata kunci judul atau kode tugas.
  * Filter berdasarkan Status.
  * Filter berdasarkan Prioritas.
  * Filter berdasarkan Karyawan (Assignee).

#### Mode 2: Kanban Board View (Tampilan Papan Kolom)
* Kolom tersusun berdasarkan kategori status alur kerja (To Do ➔ In Progress ➔ Review ➔ Done).
* Kartu tugas (Task Card) menampilkan:
  * Kode tugas dan judul tugas.
  * Tag prioritas ber-SLA.
  * Avatar karyawan pelaksana.
  * Progress checklist dan badge deadline.
* Interaksi perubahan status: Pemindahan kartu antar kolom atau dropdown status pada kartu yang langsung memicu pembaruan status ke sistem.

### 3.4. Panel Detail Tugas (Drawer / Modal Task Detail)
Terbuka ketika pengguna memilih atau mengklik baris/kartu tugas:
* **Bagian Header:**
  * Menampilkan kode tugas resmi.
  * Judul tugas yang dapat diedit langsung.
  * Dropdown pemilihan status tugas terkini.
  * Tombol aksi hapus tugas (dengan dialog konfirmasi).
* **Panel Atribut Tugas (Metadata):**
  * **Pilihan Prioritas:** Urgent (SLA 4 Jam), High (SLA 24 Jam), Normal (SLA 72 Jam), Low (SLA 168 Jam).
  * **Pilihan Tipe Tugas:** Task, Bug, Feature, Improvement, Milestone.
  * **Pelaksana (Assignees):** Komponen multi-select karyawan HRIS lengkap dengan nama, NIK, dan departemen.
  * **Jadwal Waktu:** Tanggal mulai kerja (Start Date) dan tanggal batas akhir (Due Date).
  * **Estimasi Waktu:** Input target estimasi jam kerja.
* **Area Deskripsi:** Editor teks untuk instruksi tugas dan catatan kerja.
* **Bagian Checklist (Daftar Sub-Pekerjaan):**
  * Pengelompokan checklist dengan judul grup.
  * Progress bar penyelesaian checklist (contoh: 4 dari 6 selesai - 67%).
  * Item checklist dengan checkbox interaktif (langsung toggle selesai/belum tanpa reload halaman).
  * Opsi menentukan tenggat waktu dan penugasan karyawan pada butir checklist spesifik.
  * Form input cepat untuk menambahkan butir checklist baru.
* **Panel Pencatatan Waktu (Time Tracking):**
  * Indikator running timer (Stopwatch aktif) bagi pengguna yang sedang mengerjakan tugas.
  * Tombol Start Timer untuk mulai bekerja dan tombol Stop Timer untuk menghentikan serta menyimpan durasi kerja.
  * Tombol entri manual jam kerja (untuk pencatatan kerja di luar sistem dengan input menit dan catatan).
  * Daftar riwayat pencatatan jam kerja beserta nama karyawan dan catatan kerja.
* **Tab Kolaboratif (Diskusi & Audit Trail):**
  * **Tab Komentar:** Kolom diskusi interaktif antar karyawan, mendukung balasan komentar bertingkat (threaded reply) dan opsi komentar internal.
  * **Tab Aktivitas (Audit Trail):** Rekam jejak kronologis otomatis mengenai siapa yang membuat tugas, siapa yang mengubah status, perubahan tanggal deadline, dan penambahan assignee.

### 3.5. Modal Pembuatan Tugas Baru (+ New Task Modal)
Formulir cepat yang dapat diakses dari tombol global di header atau di setiap daftar tugas:
* Field wajib: Pilihan Space, Pilihan List, Judul Tugas.
* Field opsional: Folder, Parent Task (jika membuat subtask), Deskripsi, Prioritas, Tipe Tugas, Assignee Karyawan HRIS, Tanggal Mulai, Tanggal Deadline, dan Estimasi Jam Kerja.

---

## 4. Katalog Endpoint Backend & Spesifikasi Komunikasi Data

Semua request dikirimkan ke backend melalui jalur API yang terotentikasi. Token autentikasi pengguna otomatis disertakan pada header otorisasi.

Prefix URL modul: `/task-management`

### 4.1. Manajemen Tugas (Tasks)

| No | Kategori | HTTP Method | Endpoint URL | Parameter Input / Request Body | Keterangan & Respon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Daftar Tugas | `GET` | `/task-management/tasks` | **Query Params:** `space_id`, `folder_id`, `list_id`, `parent_task_id`, `include_subtasks`, `status_id`, `status_category`, `priority_id`, `task_type_id`, `assignee_id`, `due_date_from`, `due_date_to`, `search`, `per_page`, `page` | Mengembalikan daftar tugas berhalaman (paginasi) beserta data status, prioritas, assignees, subtasks count, dan checklist count. |
| 2 | Buat Tugas | `POST` | `/task-management/tasks` | **Body (JSON):** `space_id` (wajib), `list_id` (wajib), `title` (wajib), `folder_id`, `parent_task_id`, `description`, `status_id`, `priority_id`, `task_type_id`, `start_date`, `due_date`, `estimated_hours`, `assignee_ids` (array ID karyawan HRIS) | Membuat tugas baru, mengenerate kode tugas otomatis, dan mencatat pembuat pada audit log. |
| 3 | Detail Tugas | `GET` | `/task-management/tasks/{id}` | **URL Param:** ID Tugas | Mengembalikan data lengkap tugas beserta assignees, checklists & items, time trackings, tags, subtasks, dan activity logs. |
| 4 | Ubah Tugas | `PUT` | `/task-management/tasks/{id}` | **URL Param:** ID Tugas<br>**Body (JSON):** Bidang yang ingin diubah (`title`, `description`, `folder_id`, `list_id`, `status_id`, `priority_id`, `task_type_id`, `start_date`, `due_date`, `estimated_hours`, `progress_percentage`, `assignee_ids`) | Memperbarui data tugas dan mencatat perubahannya ke riwayat audit trail. |
| 5 | Hapus Tugas | `DELETE` | `/task-management/tasks/{id}` | **URL Param:** ID Tugas | Melakukan soft delete terhadap tugas terkait. |
| 6 | Transisi Status | `POST` | `/task-management/tasks/{id}/status` | **URL Param:** ID Tugas<br>**Body (JSON):** `status_id` (wajib) | Mengubah status tugas secara cepat, mencatat riwayat perubahan status, dan mengupdate persentase selesai otomatis jika status berpindah ke kategori selesai. |
| 7 | Metrik Ringkasan | `GET` | `/task-management/tasks/metrics` | **Query Params:** `space_id` (opsional) | Mengembalikan agregasi jumlah tugas per kategori (Total, To Do, In Progress, Review, Done, Overdue, dan Completion Rate %). |

### 4.2. Hirarki Ruang Kerja (Hierarchy)

| No | Kategori | HTTP Method | Endpoint URL | Parameter Input / Request Body | Keterangan & Respon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Daftar Workspace | `GET` | `/task-management/workspaces` | - | Mengambil daftar seluruh workspace yang tersedia. |
| 2 | Detail Workspace | `GET` | `/task-management/workspaces/{id}` | **URL Param:** ID Workspace | Mengambil detail workspace beserta daftar spaces di bawahnya. |
| 3 | Buat Workspace | `POST` | `/task-management/workspaces` | **Body (JSON):** `workspace_code` (wajib), `name` (wajib), `description`, `logo_url` | Mendaftarkan workspace baru. |
| 4 | Daftar Space | `GET` | `/task-management/spaces` | **Query Params:** `workspace_id` (default: 1) | Mengambil daftar ruang kerja departemen/space yang aktif. |
| 5 | Detail Space | `GET` | `/task-management/spaces/{id}` | **URL Param:** ID Space | Mengambil detail space beserta folder dan list di dalamnya. |
| 6 | Buat Space | `POST` | `/task-management/spaces` | **Body (JSON):** `workspace_id` (wajib), `space_name` (wajib), `department_id`, `color_hex`, `icon_name`, `description`, `is_private` | Membuat space departemen baru. |
| 7 | Daftar Folder | `GET` | `/task-management/folders` | **Query Params:** `space_id` (wajib) | Mengambil seluruh folder proyek di dalam space tertentu. |
| 8 | Buat Folder | `POST` | `/task-management/folders` | **Body (JSON):** `space_id` (wajib), `folder_name` (wajib), `description`, `color_hex` | Membuat folder pengelompokan baru. |
| 9 | Daftar List | `GET` | `/task-management/lists` | **Query Params:** `space_id` (wajib), `folder_id` (opsional) | Mengambil daftar list tugas di dalam space atau folder tertentu. |
| 10 | Buat List | `POST` | `/task-management/lists` | **Body (JSON):** `space_id` (wajib), `folder_id` (opsional), `list_name` (wajib), `description`, `color_hex`, `default_view` (pilihan: LIST, BOARD, CALENDAR, GANTT) | Membuat daftar tugas baru. |

### 4.3. Checklists & Sub-Item

| No | Kategori | HTTP Method | Endpoint URL | Parameter Input / Request Body | Keterangan & Respon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Buat Grup Checklist | `POST` | `/task-management/checklists` | **Body (JSON):** `task_id` (wajib), `checklist_title` (wajib) | Membuat grup checklist baru di dalam suatu tugas. |
| 2 | Hapus Grup Checklist | `DELETE` | `/task-management/checklists/{id}` | **URL Param:** ID Checklist | Menghapus grup checklist beserta seluruh butir item di dalamnya. |
| 3 | Tambah Butir Item | `POST` | `/task-management/checklists/{id}/items` | **URL Param:** ID Checklist<br>**Body (JSON):** `item_text` (wajib), `assignee_employee_id`, `due_date`, `sort_order` | Menambahkan butir to-do baru ke dalam grup checklist. |
| 4 | Toggle Status Item | `POST` | `/task-management/checklist-items/{id}/toggle` | **URL Param:** ID Checklist Item | Mengubah status checklist antara selesai (tercentang) dan belum selesai secara instan. |
| 5 | Hapus Butir Item | `DELETE` | `/task-management/checklist-items/{id}` | **URL Param:** ID Checklist Item | Menghapus satu butir item checklist. |

### 4.4. Time Tracking (Pencatatan Jam Kerja)

| No | Kategori | HTTP Method | Endpoint URL | Parameter Input / Request Body | Keterangan & Respon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Timer Berjalan Aktif | `GET` | `/task-management/time-tracking/active` | - | Memeriksa apakah ada timer yang sedang aktif berjalan untuk pengguna yang sedang login. |
| 2 | Mulai Timer (Start) | `POST` | `/task-management/time-tracking/start` | **Body (JSON):** `task_id` (wajib), `note` (opsional) | Memulai stopwatch pencatatan waktu pengerjaan tugas. |
| 3 | Hentikan Timer (Stop) | `POST` | `/task-management/time-tracking/{id}/stop` | **URL Param:** ID Time Tracking Entry | Menghentikan timer yang berjalan, menghitung total menit kerja nyata, dan mengakumulasikan durasi ke tugas. |
| 4 | Entri Waktu Manual | `POST` | `/task-management/time-tracking/manual` | **Body (JSON):** `task_id` (wajib), `duration_minutes` (wajib, minimal 1), `note`, `start_time` | Menambahkan catatan durasi kerja secara manual tanpa stopwatch. |

### 4.5. Komentar & Diskusi Kolaboratif

| No | Kategori | HTTP Method | Endpoint URL | Parameter Input / Request Body | Keterangan & Respon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Daftar Diskusi | `GET` | `/task-management/tasks/{taskId}/comments` | **URL Param:** ID Tugas | Mengambil seluruh pesan diskusi pada tugas terkait dalam bentuk hirarki/balasan komentar. |
| 2 | Kirim Komentar | `POST` | `/task-management/tasks/{taskId}/comments` | **URL Param:** ID Tugas<br>**Body (JSON):** `comment_text` (wajib), `parent_comment_id` (opsional jika membalas pesan), `is_internal_only` (boolean) | Menambahkan pesan komentar baru ke dalam tugas. |

### 4.6. Master Data Referensi (Dropdown & Filter Data)

| No | Kategori | HTTP Method | Endpoint URL | Parameter Input | Keterangan & Respon |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Master Status | `GET` | `/task-management/master/statuses` | **Query Params:** `space_id` (opsional) | Daftar status tugas (To Do, In Progress, Review, Done, Cancelled) beserta warna dan kategori statusnya. |
| 2 | Master Prioritas | `GET` | `/task-management/master/priorities` | - | Daftar prioritas ber-SLA: Urgent (4h), High (24h), Normal (72h), Low (168h). |
| 3 | Master Tipe Tugas | `GET` | `/task-management/master/task-types` | - | Daftar tipe tugas: Task, Bug, Feature, Improvement, Milestone. |
| 4 | Master Tags | `GET` | `/task-management/master/tags` | **Query Params:** `space_id` (opsional) | Label atau tag pengelompokan bebas. |
| 5 | Master Departemen | `GET` | `/task-management/master/departments` | - | Daftar departemen HRIS aktif beserta divisi di dalamnya. |
| 6 | Master Karyawan HRIS | `GET` | `/task-management/master/employees` | **Query Params:** `department_id` (opsional), `search` (opsional) | Sumber data pelaksana tugas (Assignee) lengkap dengan nama, NIK, email kantor, departemen, dan jabatan. |

---

## 5. Aturan Logika Bisnis & Pengalaman Pengguna (UX Rules)

1. **Responsiveness & Smooth Navigation:**
   * Antarmuka harus nyaman dibuka pada layar laptop/desktop standar hingga layar monitor besar.
   * Drawer detail tugas sebaiknya dapat dibuka di sisi kanan layar tanpa menghilangkan konteks daftar tugas utama yang sedang dibuka.
2. **Indikator Visual Tenggat Waktu (Overdue Detection):**
   * Jika tanggal sekarang telah melampaui `due_date` dan tugas belum berkategori `DONE`, tandai tanggal dengan warna merah terang atau icon peringatan.
3. **Penyelarasan SLA Prioritas:**
   * Tampilkan label jam SLA di samping badge prioritas (contoh: *Urgent - SLA 4 Jam*, *High - SLA 24 Jam*) untuk mengingatkan pelaksana target waktu penyelesaian.
4. **Optimistic UI pada Checklist & Timer:**
   * Saat butir checklist dicentang, antarmuka harus langsung mencerminkan perubahan centang dan memperbarui progress bar secara instan tanpa menunggu reload data tabel utama.
   * Stopwatch pencatatan jam kerja harus memiliki ticker detik/menit yang berjalan di antarmuka selama sesi aktif.
5. **Konfirmasi Tindakan Destruktif:**
   * Penghapusan tugas, penghapusan checklist, atau pembatalan timer harus selalu menyertakan modal dialog konfirmasi sebelum eksekusi dilakukan.
6. **Penanganan Status Muat & Kosong (Loading & Empty States):**
   * Sediakan skeleton placeholder saat data sedang dimuat dari server.
   * Tampilkan ilustrasi atau pesan ramah ketika suatu List/Folder belum memiliki tugas sama sekali (disertai tombol pemicu "+ Buat Tugas Pertama").

---

## 6. Kriteria Keberhasilan Implementasi (Acceptance Criteria)

* [ ] Pengguna dapat menavigasi hirarki Workspace, Space Departemen, Folder, dan List dengan lancar melalui sidebar.
* [ ] Pengguna dapat melihat daftar tugas baik dalam mode List View maupun Kanban Board View.
* [ ] Pengguna dapat membuat tugas baru dengan menetapkan pelaksana dari daftar karyawan HRIS asli.
* [ ] Pengguna dapat memperbarui status tugas melalui drag & drop di Kanban atau dropdown di List View dan Drawer.
* [ ] Panel ringkasan metrik menampilkan jumlah To Do, In Progress, Review, Done, Overdue, dan persentase penyelesaian secara akurat.
* [ ] Pengguna dapat menambahkan checklist pada tugas dan mencentang butir tugas dengan progress otomatis.
* [ ] Fitur start dan stop timer berjalan dengan benar dan durasi tercatat pada akumulasi jam tugas.
* [ ] Kolom diskusi komentar dan log audit riwayat aktivitas dapat dibuka dan dibaca dengan jelas di panel detail tugas.
* [ ] Setiap notifikasi proses berhasil atau gagal ditampilkan melalui toast notification yang informatif.
