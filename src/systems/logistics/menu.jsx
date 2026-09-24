const withBasePath = (path) => `/logistics${path}`;

const logisticsMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'logistics-overview',
        title: 'Dashboard',
        type: 'item',
        value: 'logistics-overview',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-truck-delivery',
        url: withBasePath('/dashboard')
      },
      {
        id: 'logistics-picklists',
        title: 'Picklist',
        type: 'item',
        value: 'logistics-picklists',
        label: 'Picklist',
        selected: true,
        icon: 'ti ti-clipboard-list',
        url: withBasePath('/picklists')
      }
    ]
  }
];

export default logisticsMenu;
