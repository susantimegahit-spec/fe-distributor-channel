import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import AuthLayout from 'layout/Auth';
import { createBrowserRouter } from 'react-router-dom';
import { getCookies } from '../utils/cookies';
import DashboardLayout from 'layout/Dashboard';

const MasterProduct = Loadable(lazy(() => import('views/master/MasterProduct')));
const MasterPrice = Loadable(lazy(() => import('views/master/MasterPrice')));
const MasterBuyingPrice = Loadable(lazy(() => import('views/master/MasterBuyingPrice')));
const MasterDistributor = Loadable(lazy(() => import('views/master/MasterDistributor')));
const MasterEmployee = Loadable(lazy(() => import('views/master/MasterEmployee')));
const MasterWarehouse = Loadable(lazy(() => import('views/master/MasterWarehouse')));
const MasterPromo = Loadable(lazy(() => import('views/master/MasterPromo')));

const MasterRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'master/product',
      element: <MasterProduct />
    },
    {
      path: 'master/price',
      element: <MasterPrice />
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
      path: 'master/employee',
      element: <MasterEmployee />
    },
    {
      path: 'master/warehouse',
      element: <MasterWarehouse />
    },
    {
      path: 'master/promo',
      element: <MasterPromo />
    }
  ]
};

export default MasterRoutes;
