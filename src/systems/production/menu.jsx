const withBasePath = (path) => `/production${path}`;

const productionMenu = [
  {
    id: 'production-dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'production-dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'production-overview',
        title: 'Dashboard',
        type: 'item',
        value: 'production-overview',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-building-factory-2',
        url: withBasePath('/dashboard')
      }
    ]
  },
  {
    id: 'production-master',
    title: 'Master',
    type: 'group',
    value: 'production-master',
    label: 'Master',
    selected: true,
    children: [
      {
        id: 'production-material',
        title: 'Material',
        type: 'item',
        value: 'production-material',
        label: 'Material',
        selected: true,
        icon: 'ti ti-box',
        url: withBasePath('/master/material')
      },
      {
        id: 'production-resource',
        title: 'Resource',
        type: 'item',
        value: 'production-resource',
        label: 'Resource',
        selected: true,
        icon: 'ti ti-settings-automation',
        url: withBasePath('/master/resource')
      }
    ]
  },
  {
    id: 'production-transaction',
    title: 'Production',
    type: 'group',
    value: 'production-transaction',
    label: 'Production',
    selected: true,
    children: [
      {
        id: 'production-bill-of-material',
        title: 'Bill of Material',
        type: 'item',
        value: 'production-bill-of-material',
        label: 'Bill of Material',
        selected: true,
        icon: 'ti ti-list-tree',
        url: withBasePath('/bill-of-material')
      },
      {
        id: 'production-order',
        title: 'Production Order',
        type: 'item',
        value: 'production-order',
        label: 'Production Order',
        selected: true,
        icon: 'ti ti-clipboard-text',
        url: withBasePath('/order')
      },
      {
        id: 'production-inventory-transfer',
        title: 'Inventory Transfer',
        type: 'item',
        value: 'production-inventory-transfer',
        label: 'Inventory Transfer',
        selected: true,
        icon: 'ti ti-transfer',
        url: withBasePath('/inventory-transfer')
      }
    ]
  }
];

export default productionMenu;
