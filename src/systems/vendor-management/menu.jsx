const withBasePath = (path) => `/vendor-management${path}`;

const vendorManagementMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'vendor-management-dashboard',
        title: 'Dashboard',
        type: 'item',
        value: 'vendor-management-dashboard',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-layout-dashboard',
        url: withBasePath('/dashboard')
      },
      {
        id: 'vendor-list',
        title: 'Vendor',
        type: 'item',
        value: 'vendor-list',
        label: 'Vendor',
        selected: true,
        icon: 'ti ti-building-store',
        url: withBasePath('/vendor')
      }
    ]
  }
];

export default vendorManagementMenu;
