const withBasePath = (path) => `/vendor-management${path}`;

const vendorManagementMenu = [
  {
    id: 'vendor-management',
    title: 'Vendor Management',
    type: 'group',
    value: 'vendorManagement',
    label: 'Vendor Management',
    selected: true,
    children: [
      {
        id: 'vendor-registrations',
        title: 'Vendor Registrations',
        type: 'item',
        value: 'vendor-registrations',
        label: 'Vendor Registrations',
        selected: true,
        icon: 'ti ti-building-store',
        url: withBasePath('/registrations')
      }
    ]
  }
];

export default vendorManagementMenu;
