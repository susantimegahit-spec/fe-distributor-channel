const withBasePath = (path) => `/expedition${path}`;

const expeditionMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'expedition-overview',
        title: 'Dashboard',
        type: 'item',
        value: 'expedition-overview',
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
        id: 'expedition-origin',
        title: 'Origin',
        type: 'item',
        value: 'expedition-origin',
        label: 'Origin',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: withBasePath('/master/origin')
      },
      {
        id: 'expedition-master',
        title: 'Expeditions',
        type: 'item',
        value: 'expedition-master',
        label: 'Expeditions',
        selected: true,
        icon: 'ti ti-package-export',
        url: withBasePath('/master/expedition')
      },
      {
        id: 'expedition-rates',
        title: 'Rates',
        type: 'item',
        value: 'expedition-rates',
        label: 'Rates',
        selected: true,
        icon: 'ti ti-receipt-2',
        url: withBasePath('/master/rates')
      }
    ]
  }
];

export default expeditionMenu;
