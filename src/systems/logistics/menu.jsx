const withBasePath = (path) => `/logistics${path}`;

const logisticsMenu = [
  {
    id: 'logistics-navigation',
    title: 'Logistics',
    type: 'group',
    value: 'logistics-navigation',
    label: 'Logistics',
    selected: true,
    collapsible: false,
    children: [
      {
        id: 'logistics-picklists',
        title: 'Picklist',
        type: 'item',
        value: 'logistics-picklists',
        label: 'Picklist',
        selected: true,
        icon: 'ti ti-clipboard-list',
        url: withBasePath('/picklists')
      },
      {
        id: 'logistics-rates',
        menu_key: 36,
        title: 'Rates',
        type: 'item',
        value: 'logistics-rates',
        label: 'Rates',
        selected: true,
        icon: 'ti ti-receipt-2',
        url: withBasePath('/master/rates')
      }
    ]
  }
];

export default logisticsMenu;
