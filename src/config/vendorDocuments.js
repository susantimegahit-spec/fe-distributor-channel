const distributorDocuments = [
  { key: 'akta', label: 'Deed of Incorporation (Akta Perusahaan)', icon: 'ti-file-description', required: true },
  { key: 'nib', label: 'Business Identification Number (NIB)', icon: 'ti-building-bank', required: true },
  { key: 'npwp', label: 'Company Tax ID (NPWP)', icon: 'ti-receipt-tax', required: true },
  { key: 'support', label: 'Supporting Document', icon: 'ti-files', required: true }
];

export const expeditionDocuments = [
  { key: 'akta', label: 'Akta pendirian perusahaan', icon: 'ti-file-description', required: true },
  { key: 'sk_akta_pendirian', label: 'SK pengesahan atas akta pendirian perusahaan', icon: 'ti-file-certificate', required: true },
  {
    key: 'akta_perubahan',
    label: 'Akta perubahan terakhir perusahaan (yang memuat susunan direksi yang sedang menjabat)',
    icon: 'ti-file-description',
    required: true
  },
  { key: 'sk_akta_perubahan', label: 'SK pengesahan atas akta perubahan terakhir perusahaan', icon: 'ti-file-certificate', required: true },
  { key: 'nib', label: 'NIB RBA OSS', icon: 'ti-building-bank', required: true },
  { key: 'npwp', label: 'NPWP 16 DIGIT', icon: 'ti-receipt-tax', required: true },
  { key: 'ktp_direktur', label: 'KTP Direktur', icon: 'ti-id', required: true },
  { key: 'sertifikat_halal', label: 'Sertifikat halal jasa pendistribusian', icon: 'ti-file-certificate', required: false },
  {
    key: 'pakta_integritas',
    label: 'Pakta Integritas',
    icon: 'ti-file-certificate',
    required: true,
    template: 'pakta-integritas'
  },
  {
    key: 'peraturan_kerjasama',
    label: 'Peraturan Kerjasama',
    icon: 'ti-file-description',
    required: true,
    template: 'peraturan-kerjasama'
  }
];

export const getVendorDocuments = (vendorType) => (vendorType === 'expedition' ? expeditionDocuments : distributorDocuments);
