const withBasePath = (path) => `/vendor-management${path}`;

const vendorManagementMenu = [
  {
    id: 'vendor-management-navigation',
    title: 'Vendor Management',
    type: 'group',
    value: 'vendor-management-navigation',
    label: 'Vendor Management',
    selected: true,
    collapsible: false,
    children: [
      {
        id: 'vendor-list',
        menu_key: 59,
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
