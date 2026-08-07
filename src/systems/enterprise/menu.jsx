const withBasePath = (path) => `/enterprise${path}`;

const enterpriseMenu = [
  {
    id: 'enterprise-operations',
    title: 'Enterprise',
    type: 'group',
    value: 'enterprise-operations',
    label: 'Enterprise',
    selected: true,
    collapsible: false,
    children: [
      {
        id: 'enterprise-master-data',
        title: 'Master Data',
        type: 'collapse',
        value: 'enterprise-master-data',
        label: 'Master Data',
        selected: true,
        icon: 'ti ti-database',
        children: [
          {
            id: 'enterprise-master-data-department',
            title: 'Department',
            type: 'item',
            value: 'enterprise-master-data-department',
            label: 'Department',
            selected: true,
            icon: 'ti ti-building-community',
            url: withBasePath('/master-data/department')
          }
        ]
      },
      {
        id: 'enterprise-purchasing',
        title: 'Purchasing',
        type: 'collapse',
        value: 'enterprise-purchasing',
        label: 'Purchasing',
        selected: true,
        icon: 'ti ti-shopping-cart',
        children: [
          {
            id: 'enterprise-purchasing-request',
            title: 'Request',
            type: 'item',
            value: 'enterprise-purchasing-request',
            label: 'Request',
            selected: true,
            icon: 'ti ti-file-description',
            url: withBasePath('/purchasing/request')
          },
          {
            id: 'enterprise-purchasing-order',
            title: 'Order',
            type: 'item',
            value: 'enterprise-purchasing-order',
            label: 'Order',
            selected: true,
            icon: 'ti ti-file-invoice',
            url: withBasePath('/purchasing/order')
          }
        ]
      },
      {
        id: 'enterprise-budget',
        title: 'Budget',
        type: 'item',
        value: 'enterprise-budget',
        label: 'Budget',
        selected: true,
        icon: 'ti ti-calculator',
        url: withBasePath('/budget')
      },
      {
        id: 'support-help-desk',
        title: 'Help Desk',
        type: 'item',
        value: 'support-help-desk',
        label: 'Help Desk',
        selected: true,
        icon: 'ti ti-headset',
        url: withBasePath('/help-desk'),
        activeUrls: [withBasePath('/help-desk'), withBasePath('/help-desk/create'), withBasePath('/help-desk/:ticketId')]
      }
    ]
  }
];

export default enterpriseMenu;
