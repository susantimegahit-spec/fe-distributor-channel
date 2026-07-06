import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const MasterProduct = Loadable(lazy(() => import('views/master/MasterProduct')));
const MasterBuyingPrice = Loadable(lazy(() => import('views/master/MasterBuyingPrice')));
const MasterDistributor = Loadable(lazy(() => import('views/master/MasterDistributor')));
const SettingPage = Loadable(lazy(() => import('views/setting/SettingPage')));
const OrderList = Loadable(lazy(() => import('views/order/OrderList')));
const RewardList = Loadable(lazy(() => import('views/reward/RewardList')));
const RewardAdd = Loadable(lazy(() => import('views/reward/RewardAdd')));

const MenuRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'customer-portal/master/product',
      element: <MasterProduct />
    },
    {
      path: 'customer-portal/master/buying-price',
      element: <MasterBuyingPrice />
    },
    {
      path: 'customer-portal/master/distributor',
      element: <MasterDistributor />
    },
    {
      path: 'customer-portal/setting/role-permission',
      element: <SettingPage defaultTab="permissions" />
    },
    {
      path: 'customer-portal/setting/user-list',
      element: <SettingPage defaultTab="users" />
    },
    {
      path: 'customer-portal/setting',
      element: <SettingPage />
    },
    {
      path: 'customer-portal/setting/:activeTab',
      element: <SettingPage />
    },
    {
      path: 'customer-portal/order/order-list',
      element: <OrderList />
    },
    {
      path: 'customer-portal/finance/reward',
      element: <RewardList />
    },
    {
      path: 'customer-portal/finance/reward/add',
      element: <RewardAdd />
    }
  ]
};

export default MenuRoutes;
