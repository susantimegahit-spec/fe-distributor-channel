const withBasePath = (path) => `/production${path}`;

const productionMenu = [
  {
    id: 'production-operations',
    title: 'Production',
    type: 'group',
    value: 'production-operations',
    label: 'Production',
    selected: true,
    collapsible: false,
    children: [
      {
        id: 'production-overview',
        menu_key: 44,
        title: 'Dashboard',
        type: 'item',
        value: 'production-overview',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-dashboard',
        url: withBasePath('/dashboard')
      },
      {
        id: 'production-material',
        menu_key: 46,
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
        menu_key: 47,
        title: 'Resource',
        type: 'item',
        value: 'production-resource',
        label: 'Resource',
        selected: true,
        icon: 'ti ti-settings-automation',
        url: withBasePath('/master/resource')
      },
      {
        id: 'production-warehouse',
        menu_key: 48,
        title: 'Warehouse',
        type: 'item',
        value: 'production-warehouse',
        label: 'Warehouse',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: withBasePath('/master/warehouse')
      }
    ]
  }
];

export default productionMenu;
