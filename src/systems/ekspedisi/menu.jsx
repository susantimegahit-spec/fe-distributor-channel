const ekspedisiMenu = [
  {
    id: 'ekspedisi-dashboard',
    title: 'Ekspedisi',
    type: 'group',
    value: 'ekspedisi',
    label: 'Ekspedisi',
    selected: true,
    children: [
      {
        id: 'ekspedisi-overview',
        title: 'Dashboard Ekspedisi',
        type: 'item',
        value: 'ekspedisi-overview',
        label: 'Dashboard Ekspedisi',
        selected: true,
        icon: 'ti ti-truck-delivery',
        url: '/ekspedisi/dashboard'
      }
    ]
  }
];

export default ekspedisiMenu;
