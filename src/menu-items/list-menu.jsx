// ==============================|| MENU ITEMS - FORM ||============================== //

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
        title: 'Daftar Distributor',
        type: 'item',
        value: 'master-distributor',
        label: 'Daftar Distributor',
        selected: true,
        icon: 'ti ti-automatic-gearbox',
        url: '/master/distributor'
      },
      {
        id: 'master-product',
        title: 'Daftar Item',
        type: 'item',
        value: 'master-product',
        label: 'Daftar Item',
        selected: true,
        icon: 'ti ti-clipboard-list',
        url: '/master/product'
      },
      {
        id: 'master-price',
        title: 'Daftar Harga',
        type: 'item',
        value: 'master-price',
        label: 'Daftar Harga',
        selected: true,
        icon: 'ti ti-currency-dollar',
        url: '/master/price'
      },
      {
        id: 'master-employee',
        title: 'Daftar Sales',
        type: 'item',
        value: 'master-employee',
        label: 'Daftar Sales',
        selected: true,
        icon: 'ti ti-users',
        url: '/master/employee'
      },
      {
        id: 'master-warehouse',
        title: 'Daftar Warehouse',
        type: 'item',
        value: 'master-warehouse',
        label: 'Daftar warehouse',
        selected: true,
        icon: 'ti ti-building-warehouse',
        url: '/master/warehouse'
      },
      // {
      //   id: 'master-buying-price',
      //   title: 'Daftar Harga Beli',
      //   value: 'master-buying-price',
      //   label: 'Daftar Harga Beli',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-brand-shopee',
      //   url: '/master/buying-price'
      // },
      // {
      //   id: 'master-selling-price',
      //   title: 'Daftar Harga Jual',
      //   value: 'master-selling-price',
      //   label: 'Daftar Harga Jual',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-brand-shopee',
      //   url: '/master/selling-price'
      // },
      // {
      //   id: 'master-area',
      //   title: 'Daftar Area',
      //   value: 'master-area',
      //   label: 'Daftar Area',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-chart-area',
      //   url: '/master/selling-price'
      // },
      // {
      //   id: 'master-program',
      //   title: 'Daftar Program Diskon',
      //   value: 'master-program',
      //   label: 'Daftar Program Diskon',
      //   type: 'item',
      //   selected: true,
      //   icon: 'ti ti-discount',
      //   url: '/master/program'
      // },
    ]
  },
  {
    id: 'order',
    title: 'Pesanan',
    value: 'order',
    label: 'Pesanan',
    type: 'group',
    selected: true,
    children: [
      {
        id: 'order-list',
        title: 'Daftar Pesanan',
        value: 'order-list',
        label: 'Daftar Pesanan',
        type: 'item',
        selected: true,
        icon: 'ph ph-list-bullets',
        url: '/order/order-list',
        activeUrls: ['/order/order-list', '/order/order-create', '/order/order-create/:id']
      },
      // {
      //   id: 'order-retur',
      //   title: 'Daftar Retur',
      //   value: 'order-retur',
      //   label: 'Daftar Retur',
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
        title: 'Reward',
        value: 'finance-reward',
        label: 'Reward',
        type: 'item',
        selected: true,
        icon: 'ti ti-tag',
        url: '/finance/reward'
      }
    ]
  }
];

export default listMenu;
