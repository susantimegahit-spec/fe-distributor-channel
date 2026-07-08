import customerPortalMenu from '../systems/customer-portal/menu';

const listMenu = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    value: 'dashboard',
    label: 'Dashboard',
    selected: true,
    children: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard',
        type: 'item',
        value: 'dashboard-overview',
        label: 'Dashboard',
        selected: true,
        icon: 'ti ti-dashboard',
        url: '/dashboard'
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
        id: 'master-distributor',
        title: 'Distributor List',
        type: 'item',
        value: 'master-distributor',
        label: 'Distributor List',
        selected: true,
        icon: 'ti ti-automatic-gearbox',
        url: '/master/distributor'
      },
      {
        id: 'master-product',
        title: 'Item List',
        type: 'item',
        value: 'master-product',
        label: 'Item List',
        selected: true,
        icon: 'ti ti-clipboard-list',
        url: '/master/product'
      },
      {
        id: 'master-price',
        title: 'Price List',
        type: 'item',
        value: 'master-price',
        label: 'Price List',
        selected: true,
        icon: 'ti ti-currency-dollar',
        url: '/master/price'
      },
      {
        id: 'master-employee',
        title: 'Sales List',
        type: 'item',
        value: 'master-employee',
        label: 'Sales List',
        selected: true,
        icon: 'ti ti-users',
        url: '/master/employee'
      },
      {
        id: 'master-warehouse',
        title: 'Warehouse List',
        type: 'item',
        value: 'master-warehouse',
        label: 'Warehouse List',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: '/master/warehouse'
      },
      {
        id: 'master-promo',
        title: 'Promo Program',
        type: 'item',
        value: 'master-promo',
        label: 'Promo Program',
        selected: true,
        icon: 'ti ti-discount-2',
        url: '/master/promo'
      },
      // {
      //   id: 'master-buying-price',
      //   title: 'Buying Price List',
      //   value: 'master-buying-price',
      //   label: 'Buying Price List',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-brand-shopee',
      //   url: '/master/buying-price'
      // },
      // {
      //   id: 'master-selling-price',
      //   title: 'Selling Price List',
      //   value: 'master-selling-price',
      //   label: 'Selling Price List',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-brand-shopee',
      //   url: '/master/selling-price'
      // },
      // {
      //   id: 'master-area',
      //   title: 'Area List',
      //   value: 'master-area',
      //   label: 'Area List',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-chart-area',
      //   url: '/master/selling-price'
      // },
      // {
      //   id: 'master-program',
      //   title: 'Discount Program List',
      //   value: 'master-program',
      //   label: 'Discount Program List',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-discount',
      //   url: '/master/program'
      // },
    ]
  },
  {
    id: 'order',
    title: 'Orders',
    value: 'order',
    label: 'Orders',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'order-list',
        title: 'Order List',
        value: 'order-list',
        label: 'Order List',
        type: 'item',
        selected: true,
        icon: 'ph ph-list-bullets',
        url: '/order/order-list',
        activeUrls: ['/order/order-list', '/order/order-create', '/order/order-create/:id']
      }
      // {
      //   id: 'order-retur',
      //   title: 'Return List',
      //   value: 'order-retur',
      //   label: 'Return List',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ph ph-list-bullets',
      //   url: '/order/list-retur'
      // }
    ]
  },
  {
    id: 'finance',
    title: 'Finance',
    value: 'finance',
    label: 'Finance',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'finance-reward',
        title: 'Reward & Claim',
        value: 'finance-reward',
        label: 'Reward & Claim',
        type: 'item',
        selected: true,
        icon: 'ti ti-tag',
        url: '/finance/reward'
      }
    ]
  }
];

export default listMenu;
