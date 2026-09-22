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
        id: 'logistics-rates',
        title: 'Rates',
        type: 'item',
        value: 'logistics-rates',
        label: 'Rates',
        selected: true,
        icon: 'ti ti-receipt-2',
        url: withBasePath('/master/rates'),
        activeUrls: [withBasePath('/master/rates'), withBasePath('/master/tariff')]
      },
      {
        id: 'logistics-lead-time',
        title: 'Lead Time',
        type: 'item',
        value: 'logistics-lead-time',
        label: 'Lead Time',
        selected: true,
        icon: 'ti ti-clock-hour-4',
        url: withBasePath('/master/lead-time')
      }
    ]
  }
];

export default logisticsMenu;
