const withBasePath = (path) => `/customer-portal${path}`;

const customerPortalMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard',
        type: 'item',
        value: 'dashboard-overview',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-dashboard',
        url: withBasePath('/dashboard')
      }
    ]
  },
  {
    id: 'master',
    title: 'Master Data',
    type: 'group',
    value: 'masterData',
    label: 'Master Data',
    selected: true,
    children: [
      {
        id: 'master-distributor',
        title: 'Daftar Distributor',
        type: 'item',
        value: 'master-distributor',
        label: 'Daftar Distributor',
        selected: true,
        icon: 'ti ti-automatic-gearbox',
        url: withBasePath('/master/distributor')
      },
      {
        id: 'master-product',
        title: 'Daftar Item',
        type: 'item',
        value: 'master-product',
        label: 'Daftar Item',
        selected: true,
        icon: 'ti ti-clipboard-list',
        url: withBasePath('/master/product')
      },
      {
        id: 'master-price',
        title: 'Daftar Harga',
        type: 'item',
        value: 'master-price',
        label: 'Daftar Harga',
        selected: true,
        icon: 'ti ti-currency-dollar',
        url: withBasePath('/master/price')
      },
      {
        id: 'master-employee',
        title: 'Daftar Sales',
        type: 'item',
        value: 'master-employee',
        label: 'Daftar Sales',
        selected: true,
        icon: 'ti ti-users',
        url: withBasePath('/master/employee')
      },
      {
        id: 'master-warehouse',
        title: 'Daftar Warehouse',
        type: 'item',
        value: 'master-warehouse',
        label: 'Daftar warehouse',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: withBasePath('/master/warehouse')
      },
      {
        id: 'master-promo',
        title: 'Program Promo',
        type: 'item',
        value: 'master-promo',
        label: 'Program Promo',
        selected: true,
        icon: 'ti ti-discount-2',
        url: withBasePath('/master/promo')
      }
    ]
  },
  {
    id: 'order',
    title: 'Pesanan',
    value: 'order',
    label: 'Pesanan',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'order-list',
        title: 'Daftar Pesanan',
        value: 'order-list',
        label: 'Daftar Pesanan',
        type: 'item',
        selected: true,
        icon: 'ph ph-list-bullets',
        url: withBasePath('/order/order-list'),
        activeUrls: [withBasePath('/order/order-list'), withBasePath('/order/order-create'), withBasePath('/order/order-create/:id')]
      }
    ]
  },
  {
    id: 'finance',
    title: 'Finance',
    value: 'finance',
    label: 'Finance',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'finance-reward',
        title: 'Reward & Claim',
        value: 'finance-reward',
        label: 'Reward & Claim',
        type: 'item',
        selected: true,
        icon: 'ti ti-tag',
        url: withBasePath('/finance/reward')
      }
    ]
  }
];

export default customerPortalMenu;
