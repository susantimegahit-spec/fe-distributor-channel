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
      }
    ]
  },
  {
    id: 'master',
    title: 'Master Data',
    type: 'group',
    value: 'masterData',
    label: 'Master Data',
    selected: true,
    children: [
      {
        id: 'logistics-origin',
        title: 'Origin',
        type: 'item',
        value: 'logistics-origin',
        label: 'Origin',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: withBasePath('/master/origin')
      },
      {
        id: 'logistics-destination',
        title: 'Destination',
        type: 'item',
        value: 'logistics-destination',
        label: 'Destination',
        selected: true,
        icon: 'ti ti-map-pin',
        url: withBasePath('/master/destination')
      },
      {
        id: 'logistics-master',
        title: 'Expeditions',
        type: 'item',
        value: 'logistics-master',
        label: 'Expeditions',
        selected: true,
        icon: 'ti ti-package-export',
        url: withBasePath('/master/expedition')
      },
      {
        id: 'logistics-rates',
        title: 'Rates',
        type: 'item',
        value: 'logistics-rates',
        label: 'Rates',
        selected: true,
        icon: 'ti ti-receipt-2',
        url: withBasePath('/master/rates'),
        activeUrls: [withBasePath('/master/rates'), withBasePath('/master/tariff')]
      }
    ]
  }
];

export default logisticsMenu;
