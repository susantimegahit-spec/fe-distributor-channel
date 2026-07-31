const withBasePath = (path) => `/support${path}`;

const supportMenu = [
  {
    id: 'support-center',
    title: 'Support Center',
    value: 'support-center',
    label: 'Support Center',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'support-help-desk',
        title: 'Help Desk',
        value: 'support-help-desk',
        label: 'Help Desk',
        type: 'item',
        selected: true,
        icon: 'ti ti-headset',
        url: withBasePath('/help-desk'),
        activeUrls: [withBasePath('/help-desk'), withBasePath('/help-desk/create'), withBasePath('/help-desk/:ticketId')]
      }
    ]
  }
];

export default supportMenu;
