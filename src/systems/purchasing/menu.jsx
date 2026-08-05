const withBasePath = (path) => `/purchasing${path}`;

const purchasingMenu = [
  {
    id: 'purchasing-dashboard-group',
    title: 'Dashboard',
    type: 'group',
    value: 'purchasing-dashboard-group',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'purchasing-dashboard',
        title: 'Dashboard',
        type: 'item',
        value: 'purchasing-dashboard',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-shopping-cart',
        url: withBasePath('/dashboard')
      }
    ]
  },
  {
    id: 'purchasing-transaction',
    title: 'Purchasing',
    type: 'group',
    value: 'purchasing-transaction',
    label: 'Purchasing',
    selected: true,
    children: [
      {
        id: 'purchasing-order',
        title: 'Purchase Orders',
        type: 'item',
        value: 'purchasing-order',
        label: 'Purchase Orders',
        selected: true,
        icon: 'ti ti-file-invoice',
        url: withBasePath('/orders')
      }
    ]
  },
  {
    id: 'purchasing-master',
    title: 'Master',
    type: 'group',
    value: 'purchasing-master',
    label: 'Master',
    selected: true,
    children: [
      {
        id: 'purchasing-supplier',
        title: 'Suppliers',
        type: 'item',
        value: 'purchasing-supplier',
        label: 'Suppliers',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: withBasePath('/master/suppliers')
      }
    ]
  }
];

export default purchasingMenu;
