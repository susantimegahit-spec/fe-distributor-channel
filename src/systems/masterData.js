export const masterDataModules = [
  {
    key: 'customer-portal',
    title: 'Customer Portal',
    icon: 'ti ti-building-store',
    items: [
      { id: 'master-distributor', title: 'Distributors', icon: 'ti ti-automatic-gearbox', url: '/customer-portal/master/distributor' },
      { id: 'master-product', title: 'Products', icon: 'ti ti-clipboard-list', url: '/customer-portal/master/product' }
    ]
  },
  {
    key: 'enterprise',
    title: 'Corporate',
    icon: 'ti ti-building-skyscraper',
    items: [
      { id: 'enterprise-master-data-department', title: 'Department', icon: 'ti ti-building-community', url: '/corporate/master-data/department' }
    ]
  },
  {
    key: 'logistics',
    title: 'Logistics',
    icon: 'ti ti-truck-delivery',
    items: [
      { id: 'logistics-origin', title: 'Origin', icon: 'ti ti-building-warehouse', url: '/logistics/master/origin' },
      { id: 'logistics-destination', title: 'Destination', icon: 'ti ti-map-pin', url: '/logistics/master/destination' },
      { id: 'logistics-rates', title: 'Rates', icon: 'ti ti-receipt-2', url: '/logistics/master/rates' },
      { id: 'logistics-lead-time', title: 'Lead Time', icon: 'ti ti-clock-hour-4', url: '/logistics/master/lead-time' }
    ]
  },
  {
    key: 'production',
    title: 'Production',
    icon: 'ti ti-building-factory-2',
    items: [
      { id: 'production-material', title: 'Material', icon: 'ti ti-box', url: '/production/master/material' },
      { id: 'production-resource', title: 'Resource', icon: 'ti ti-settings-automation', url: '/production/master/resource' },
      { id: 'production-warehouse', title: 'Warehouse', icon: 'ti ti-building-warehouse', url: '/production/master/warehouse' }
    ]
  },
  {
    key: 'vendor-management',
    title: 'Vendor Management',
    icon: 'ti ti-building-store',
    items: [
      { id: 'vendor-list', title: 'Vendor', icon: 'ti ti-building-store', url: '/vendor-management/vendor' }
    ]
  }
];

export const getMasterDataModule = (moduleKey) => masterDataModules.find((module) => module.key === moduleKey);
