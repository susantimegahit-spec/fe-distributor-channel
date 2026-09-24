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
      }
    ]
  }
];

export default vendorManagementMenu;
