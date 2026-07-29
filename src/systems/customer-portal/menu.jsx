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
        icon: 'ti ti-building-store',
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
        title: 'Distributors',
        type: 'item',
        value: 'master-distributor',
        label: 'Distributors',
        selected: true,
        icon: 'ti ti-automatic-gearbox',
        url: withBasePath('/master/distributor')
      },
      {
        id: 'master-product',
        title: 'Products',
        type: 'item',
        value: 'master-product',
        label: 'Products',
        selected: true,
        icon: 'ti ti-clipboard-list',
        url: withBasePath('/master/product')
      },
      {
        id: 'master-price',
        title: 'Price List',
        type: 'item',
        value: 'master-price',
        label: 'Price List',
        selected: true,
        icon: 'ti ti-currency-dollar',
        url: withBasePath('/master/price'),
        activeUrls: [withBasePath('/master/price'), withBasePath('/master/buying-price')]
      },
      {
        id: 'master-employee',
        title: 'Sales Employees',
        type: 'item',
        value: 'master-employee',
        label: 'Sales Employees',
        selected: true,
        icon: 'ti ti-users',
        url: withBasePath('/master/employee')
      },
      {
        id: 'master-warehouse',
        title: 'Warehouses',
        type: 'item',
        value: 'master-warehouse',
        label: 'Warehouses',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: withBasePath('/master/warehouse')
      },
      {
        id: 'master-promo',
        title: 'Promo Program',
        type: 'item',
        value: 'master-promo',
        label: 'Promo Program',
        selected: true,
        icon: 'ti ti-discount-2',
        url: withBasePath('/master/promo')
      },
      {
        id: 'master-target',
        title: 'Master Target',
        type: 'item',
        value: 'master-target',
        label: 'Master Target',
        selected: true,
        icon: 'ti ti-target-arrow',
        url: withBasePath('/master/target')
      }
    ]
  },
  {
    id: 'order',
    title: 'Orders',
    value: 'order',
    label: 'Orders',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'order-cmo',
        title: 'CMO',
        value: 'order-cmo',
        label: 'CMO',
        type: 'item',
        selected: true,
        icon: 'ti ti-calendar-stats',
        url: withBasePath('/order/cmo'),
        activeUrls: [withBasePath('/order/cmo'), withBasePath('/order/cmo-create'), withBasePath('/order/cmo-create/:id')]
      },
      {
        id: 'order-list',
        title: 'Orders',
        value: 'order-list',
        label: 'Orders',
        type: 'item',
        selected: true,
        icon: 'ph ph-list-bullets',
        url: withBasePath('/order/order-list'),
        activeUrls: [withBasePath('/order/order-list'), withBasePath('/order/order-create'), withBasePath('/order/order-create/:id')]
      },
      {
        id: 'order-retur',
        title: 'Retur',
        value: 'order-retur',
        label: 'Retur',
        type: 'item',
        selected: true,
        icon: 'ti ti-package-export',
        url: withBasePath('/order/retur'),
        activeUrls: [withBasePath('/order/retur')]
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
        url: withBasePath('/finance/reward'),
        activeUrls: [withBasePath('/finance/reward'), withBasePath('/finance/reward/add')]
      }
    ]
  }
];

export default customerPortalMenu;
