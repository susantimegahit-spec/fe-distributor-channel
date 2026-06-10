import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import AuthLayout from 'layout/Auth';
import { createBrowserRouter } from 'react-router-dom';
import { getCookies } from '../utils/cookies';
import DashboardLayout from 'layout/Dashboard';

const ApexChart = Loadable(lazy(() => import('views/charts/ApexChart')));
const GoogleMaps = Loadable(lazy(() => import('views/maps/GoogleMap')));
const MasterProduct = Loadable(lazy(() => import('views/master/MasterProduct')));
const MasterBuyingPrice = Loadable(lazy(() => import('views/master/MasterBuyingPrice')));
const MasterDistributor = Loadable(lazy(() => import('views/master/MasterDistributor')));
const PermissionList = Loadable(lazy(() => import('views/setting/permission/PermissionList')));
const UserList = Loadable(lazy(() => import('views/setting/users/UserList')));
const OrderList = Loadable(lazy(() => import('views/order/OrderList')));
const OrderRetur = Loadable(lazy(() => import('views/order/OrderRetur')));
const RewardList = Loadable(lazy(() => import('views/reward/RewardList')));
const RewardAdd = Loadable(lazy(() => import('views/reward/RewardAdd')));

const MenuRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'master/product',
      element: <MasterProduct />
    },
    {
      path: 'master/buying-price',
      element: <MasterBuyingPrice />
    },
    {
      path: 'master/distributor',
      element: <MasterDistributor />
    },
    {
      path: 'setting/role-permission',
      element: <PermissionList />
    },
    {
      path: 'setting/user-list',
      element: <UserList />
    },
    {
      path: 'order/order-list',
      element: <OrderList />
    },
    {
      path: 'finance/reward',
      element: <RewardList />
    },
    {
      path: 'finance/reward/add',
      element: <RewardAdd />
    },
  ]
};

export default MenuRoutes;
