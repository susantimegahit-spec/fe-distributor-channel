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
  }
];

export default productionMenu;
