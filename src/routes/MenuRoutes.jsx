import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const MasterProduct = Loadable(lazy(() => import('views/customer-portal/master/MasterProduct')));
const MasterBuyingPrice = Loadable(lazy(() => import('views/customer-portal/master/MasterBuyingPrice')));
const MasterDistributor = Loadable(lazy(() => import('views/customer-portal/master/MasterDistributor')));
const SettingPage = Loadable(lazy(() => import('views/setting/SettingPage')));
const OrderList = Loadable(lazy(() => import('views/customer-portal/order/OrderList')));
const RewardList = Loadable(lazy(() => import('views/customer-portal/reward/RewardList')));
const RewardAdd = Loadable(lazy(() => import('views/customer-portal/reward/RewardAdd')));

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
      path: 'setting/role-permission',
      element: <SettingPage defaultTab="permissions" />
    },
    {
      path: 'setting/user-list',
      element: <SettingPage defaultTab="users" />
    },
    {
      path: 'setting',
      element: <SettingPage />
    },
    {
      path: 'setting/:activeTab',
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
