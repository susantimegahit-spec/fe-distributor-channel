const ekspedisiMenu = [
  {
    id: 'ekspedisi-dashboard',
    title: 'Expedition',
    type: 'group',
    value: 'ekspedisi',
    label: 'Expedition',
    selected: true,
    children: [
      {
        id: 'ekspedisi-overview',
        title: 'Expedition Dashboard',
        type: 'item',
        value: 'ekspedisi-overview',
        label: 'Expedition Dashboard',
        selected: true,
        icon: 'ti ti-truck-delivery',
        url: '/ekspedisi/dashboard'
      },
      {
        id: 'ekspedisi-master',
        title: 'Expedition Master',
        type: 'item',
        value: 'ekspedisi-master',
        label: 'Expedition Master',
        icon: 'ti ti-package-export',
        url: '/ekspedisi/master/ekspedisi'
      }
    ]
  }
];

export default ekspedisiMenu;
