export const helpDeskTickets = [
  {
    id: 'HD-260731-014',
    subject: 'Harga produk tidak sesuai saat membuat PO',
    category: 'Master Data',
    subcategory: 'Price List',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    requester: 'Budi Santoso',
    distributor: 'PT Sumber Makmur',
    assignee: 'Sari Andini',
    createdAt: '31 Jul 2026, 09:14',
    updatedAt: '12 menit lalu',
    dueAt: '31 Jul 2026, 13:14',
    reference: 'SO-20260731-1028',
    description: 'Harga Garam Cap Kapal pada order berbeda dengan price list aktif. Harga pada order masih menampilkan data lama.',
    messages: [
      {
        id: 1,
        sender: 'Budi Santoso',
        role: 'Distributor',
        initials: 'BS',
        time: '09:14',
        body: 'Harga Garam Cap Kapal pada order berbeda dengan price list aktif. Saya lampirkan tangkapan layar.',
        attachment: 'screenshot-order.png'
      },
      {
        id: 2,
        sender: 'Sari Andini',
        role: 'Support',
        initials: 'SA',
        time: '09:32',
        agent: true,
        body: 'Terima kasih, kami sedang mengecek mapping price list untuk distributor Anda.'
      },
      {
        id: 3,
        sender: 'Budi Santoso',
        role: 'Distributor',
        initials: 'BS',
        time: '09:41',
        body: 'Nomor order draft yang terdampak adalah SO-20260731-1028.'
      }
    ]
  },
  {
    id: 'HD-260730-009',
    subject: 'Upload claim gagal tervalidasi',
    category: 'Finance',
    subcategory: 'Reward & Claim',
    status: 'WAITING_CUSTOMER',
    priority: 'MEDIUM',
    requester: 'Dewi Kartika',
    distributor: 'CV Berkah Abadi',
    assignee: 'Rizky Pratama',
    createdAt: '30 Jul 2026, 13:05',
    updatedAt: '2 jam lalu',
    dueAt: '31 Jul 2026, 16:00',
    reference: 'CLM-260730-22',
    description: 'File claim selalu gagal pada proses validasi meskipun sudah menggunakan template terbaru.',
    messages: []
  },
  {
    id: 'HD-260729-002',
    subject: 'Permintaan akses menu warehouse',
    category: 'Akun & Akses',
    subcategory: 'Permission',
    status: 'RESOLVED',
    priority: 'LOW',
    requester: 'Andi Wijaya',
    distributor: 'PT Mitra Niaga',
    assignee: 'Sari Andini',
    createdAt: '29 Jul 2026, 10:30',
    updatedAt: 'Kemarin',
    dueAt: 'Selesai',
    reference: '-',
    description: 'User warehouse baru belum dapat melihat menu master gudang.',
    messages: []
  },
  {
    id: 'HD-260728-018',
    subject: 'Order berhenti pada proses approval ASM',
    category: 'Order',
    subcategory: 'Approval',
    status: 'OPEN',
    priority: 'CRITICAL',
    requester: 'Nina Amelia',
    distributor: 'PT Sejahtera Bersama',
    assignee: 'Belum ditugaskan',
    createdAt: '31 Jul 2026, 10:02',
    updatedAt: '4 menit lalu',
    dueAt: '31 Jul 2026, 14:02',
    reference: 'SO-20260731-1042',
    description: 'Order tidak berpindah status setelah ASM melakukan approval.',
    messages: []
  },
  {
    id: 'HD-260727-011',
    subject: 'Data produk baru belum muncul',
    category: 'Master Data',
    subcategory: 'Product',
    status: 'CLOSED',
    priority: 'LOW',
    requester: 'Fajar Nugroho',
    distributor: 'UD Makmur Jaya',
    assignee: 'Rizky Pratama',
    createdAt: '27 Jul 2026, 08:44',
    updatedAt: '3 hari lalu',
    dueAt: 'Selesai',
    reference: '-',
    description: 'Produk yang baru ditambahkan SAP belum tampil pada daftar produk distributor.',
    messages: []
  }
];

export const helpDeskCategories = [
  { value: 'Order', label: 'Order', icon: 'ti ti-shopping-cart', color: 'primary' },
  { value: 'Finance', label: 'Finance', icon: 'ti ti-wallet', color: 'success' },
  { value: 'Master Data', label: 'Master Data', icon: 'ti ti-database', color: 'info' },
  { value: 'Akun & Akses', label: 'Akun & Akses', icon: 'ti ti-lock', color: 'warning' },
  { value: 'Teknis', label: 'Masalah Teknis', icon: 'ti ti-bug', color: 'danger' },
  { value: 'Lainnya', label: 'Lainnya', icon: 'ti ti-help-circle', color: 'secondary' }
];

export const statusMeta = {
  OPEN: { label: 'Baru', bg: 'primary', icon: 'ti ti-sparkles' },
  IN_PROGRESS: { label: 'Diproses', bg: 'warning', icon: 'ti ti-progress' },
  WAITING_CUSTOMER: { label: 'Menunggu Anda', bg: 'orange', icon: 'ti ti-user-question' },
  RESOLVED: { label: 'Selesai', bg: 'success', icon: 'ti ti-circle-check' },
  CLOSED: { label: 'Ditutup', bg: 'secondary', icon: 'ti ti-circle-x' }
};

export const priorityMeta = {
  CRITICAL: { label: 'Kritis', color: 'danger' },
  HIGH: { label: 'Tinggi', color: 'danger' },
  MEDIUM: { label: 'Sedang', color: 'warning' },
  LOW: { label: 'Rendah', color: 'success' }
};
