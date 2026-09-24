const withBasePath = (path) => `/corporate${path}`;

const enterpriseMenu = [
  {
    id: 'enterprise-operations',
    title: 'Corporate',
    type: 'group',
    value: 'enterprise-operations',
    label: 'Corporate',
    selected: true,
    collapsible: false,
    children: [
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
        id: 'enterprise-hrd',
        title: 'HRD',
        type: 'collapse',
        value: 'enterprise-hrd',
        label: 'HRD',
        selected: true,
        icon: 'ti ti-users-group',
        children: [
          {
            id: 'enterprise-hrd-cv',
            title: 'CV',
            type: 'item',
            value: 'enterprise-hrd-cv',
            label: 'CV',
            selected: true,
            icon: 'ti ti-file-cv',
            url: withBasePath('/hrd/cv')
          },
          {
            id: 'enterprise-hrd-task-management',
            title: 'Task Management',
            type: 'item',
            value: 'enterprise-hrd-task-management',
            label: 'Task Management',
            selected: true,
            icon: 'ti ti-list-check',
            url: withBasePath('/hrd/task-management')
          }
        ]
      },
      {
        id: 'production-transaction',
        title: 'Production',
        type: 'collapse',
        value: 'production-transaction',
        label: 'Production',
        selected: true,
        icon: 'ti ti-building-factory-2',
        children: [
          {
            id: 'production-bill-of-material',
            title: 'Bill of Material',
            type: 'item',
            value: 'production-bill-of-material',
            label: 'Bill of Material',
            selected: true,
            icon: 'ti ti-list-tree',
            url: withBasePath('/production/bill-of-material')
          },
          {
            id: 'production-order',
            title: 'Production Order',
            type: 'item',
            value: 'production-order',
            label: 'Production Order',
            selected: true,
            icon: 'ti ti-clipboard-text',
            url: withBasePath('/production/order')
          },
          {
            id: 'production-issue',
            title: 'Issue Production',
            type: 'item',
            value: 'production-issue',
            label: 'Issue Production',
            selected: true,
            icon: 'ti ti-package-export',
            url: withBasePath('/production/issue')
          },
          {
            id: 'production-receipt',
            title: 'Receipt Production',
            type: 'item',
            value: 'production-receipt',
            label: 'Receipt Production',
            selected: true,
            icon: 'ti ti-package-import',
            url: withBasePath('/production/receipt')
          },
          {
            id: 'production-inventory-transfer',
            title: 'Inventory Transfer',
            type: 'item',
            value: 'production-inventory-transfer',
            label: 'Inventory Transfer',
            selected: true,
            icon: 'ti ti-transfer',
            url: withBasePath('/production/inventory-transfer')
          },
          {
            id: 'production-change-product',
            title: 'Change Product',
            type: 'item',
            value: 'production-change-product',
            label: 'Change Product',
            selected: true,
            icon: 'ti ti-replace',
            url: withBasePath('/production/change-product')
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
