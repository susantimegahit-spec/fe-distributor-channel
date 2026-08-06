export const helpDeskTickets = [
  {
    id: 'HD-260731-014',
    subject: 'Product price does not match when creating a PO',
    category: 'Master Data',
    subcategory: 'Price List',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    requester: 'Budi Santoso',
    distributor: 'PT Sumber Makmur',
    assignee: 'Sari Andini',
    createdAt: '31 Jul 2026, 09:14',
    updatedAt: '12 minutes ago',
    dueAt: '31 Jul 2026, 13:14',
    reference: 'SO-20260731-1028',
    description: 'The Garam Cap Kapal price in the order differs from the active price list. The order still displays the previous price.',
    messages: [
      {
        id: 1,
        sender: 'Budi Santoso',
        role: 'Distributor',
        initials: 'BS',
        time: '09:14',
        body: 'The Garam Cap Kapal price differs from the active price list. I have attached a screenshot.',
        attachment: 'screenshot-order.png'
      },
      {
        id: 2,
        sender: 'Sari Andini',
        role: 'Support',
        initials: 'SA',
        time: '09:32',
        agent: true,
        body: 'Thank you. We are checking the price-list mapping for your distributor account.'
      },
      {
        id: 3,
        sender: 'Budi Santoso',
        role: 'Distributor',
        initials: 'BS',
        time: '09:41',
        body: 'The affected draft order number is SO-20260731-1028.'
      }
    ]
  },
  {
    id: 'HD-260730-009',
    subject: 'Claim upload fails validation',
    category: 'Finance',
    subcategory: 'Reward & Claim',
    status: 'WAITING_CUSTOMER',
    priority: 'MEDIUM',
    requester: 'Dewi Kartika',
    distributor: 'CV Berkah Abadi',
    assignee: 'Rizky Pratama',
    createdAt: '30 Jul 2026, 13:05',
    updatedAt: '2 hours ago',
    dueAt: '31 Jul 2026, 16:00',
    reference: 'CLM-260730-22',
    description: 'The claim file consistently fails validation even when using the latest template.',
    messages: []
  },
  {
    id: 'HD-260729-002',
    subject: 'Warehouse menu access request',
    category: 'Account & Access',
    subcategory: 'Permission',
    status: 'RESOLVED',
    priority: 'LOW',
    requester: 'Andi Wijaya',
    distributor: 'PT Mitra Niaga',
    assignee: 'Sari Andini',
    createdAt: '29 Jul 2026, 10:30',
    updatedAt: 'Yesterday',
    dueAt: 'Completed',
    reference: '-',
    description: 'The new warehouse user cannot access the warehouse master menu.',
    messages: []
  },
  {
    id: 'HD-260728-018',
    subject: 'Order is stuck in the ASM approval process',
    category: 'Order',
    subcategory: 'Approval',
    status: 'OPEN',
    priority: 'CRITICAL',
    requester: 'Nina Amelia',
    distributor: 'PT Sejahtera Bersama',
    assignee: 'Unassigned',
    createdAt: '31 Jul 2026, 10:02',
    updatedAt: '4 minutes ago',
    dueAt: '31 Jul 2026, 14:02',
    reference: 'SO-20260731-1042',
    description: 'The order status does not change after ASM approval.',
    messages: []
  },
  {
    id: 'HD-260727-011',
    subject: 'New product data is not available',
    category: 'Master Data',
    subcategory: 'Product',
    status: 'CLOSED',
    priority: 'LOW',
    requester: 'Fajar Nugroho',
    distributor: 'UD Makmur Jaya',
    assignee: 'Rizky Pratama',
    createdAt: '27 Jul 2026, 08:44',
    updatedAt: '3 days ago',
    dueAt: 'Completed',
    reference: '-',
    description: 'Products recently added in SAP are not yet available in the distributor product list.',
    messages: []
  }
];

export const helpDeskCategories = [
  { value: 'Order', label: 'Order', icon: 'ti ti-shopping-cart', color: 'primary' },
  { value: 'Finance', label: 'Finance', icon: 'ti ti-wallet', color: 'success' },
  { value: 'Master Data', label: 'Master Data', icon: 'ti ti-database', color: 'info' },
  { value: 'Account & Access', label: 'Account & Access', icon: 'ti ti-lock', color: 'warning' },
  { value: 'Technical', label: 'Technical Issue', icon: 'ti ti-bug', color: 'danger' },
  { value: 'Other', label: 'Other', icon: 'ti ti-help-circle', color: 'secondary' }
];

export const statusMeta = {
  OPEN: { label: 'New', bg: 'primary', icon: 'ti ti-sparkles' },
  IN_PROGRESS: { label: 'In Progress', bg: 'warning', icon: 'ti ti-progress' },
  WAITING_CUSTOMER: { label: 'Waiting for You', bg: 'orange', icon: 'ti ti-user-question' },
  RESOLVED: { label: 'Resolved', bg: 'success', icon: 'ti ti-circle-check' },
  CLOSED: { label: 'Closed', bg: 'secondary', icon: 'ti ti-circle-x' }
};

export const priorityMeta = {
  CRITICAL: { label: 'Critical', color: 'danger' },
  HIGH: { label: 'High', color: 'danger' },
  MEDIUM: { label: 'Medium', color: 'warning' },
  LOW: { label: 'Low', color: 'success' }
};
