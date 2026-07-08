const withBasePath = (path) => `/picking-list${path}`;

const pickingListMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'picking-list-overview',
        title: 'Dashboard',
        type: 'item',
        value: 'picking-list-overview',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-clipboard-list',
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
        id: 'picking-list-master',
        title: 'Picking Rules',
        type: 'item',
        value: 'picking-list-master',
        label: 'Picking Rules',
        selected: true,
        icon: 'ti ti-list-details',
        url: withBasePath('/master/picking-list')
      }
    ]
  }
];

export default pickingListMenu;
