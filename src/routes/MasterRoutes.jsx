import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const MasterProduct = Loadable(lazy(() => import('views/master/MasterProduct')));
const MasterPrice = Loadable(lazy(() => import('views/master/MasterPrice')));
const MasterBuyingPrice = Loadable(lazy(() => import('views/master/MasterBuyingPrice')));
const MasterDistributor = Loadable(lazy(() => import('views/master/MasterDistributor')));
const MasterEmployee = Loadable(lazy(() => import('views/master/MasterEmployee')));
const MasterWarehouse = Loadable(lazy(() => import('views/master/MasterWarehouse')));
const MasterPromo = Loadable(lazy(() => import('views/master/MasterPromo')));
const MasterSignature = Loadable(lazy(() => import('views/setting/MasterSignature')));

const MasterRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'customer-portal/master/product',
      element: <MasterProduct />
    },
    {
      path: 'customer-portal/master/price',
      element: <MasterPrice />
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
      path: 'customer-portal/master/employee',
      element: <MasterEmployee />
    },
    {
      path: 'customer-portal/master/warehouse',
      element: <MasterWarehouse />
    },
    {
      path: 'customer-portal/master/promo',
      element: <MasterPromo />
    },
    {
      path: 'customer-portal/master/signature',
      element: <MasterSignature />
    },
    {
      path: 'master/product',
      element: <Navigate to="/customer-portal/master/product" replace />
    },
    {
      path: 'master/price',
      element: <Navigate to="/customer-portal/master/price" replace />
    },
    {
      path: 'master/buying-price',
      element: <Navigate to="/customer-portal/master/buying-price" replace />
    },
    {
      path: 'master/distributor',
      element: <Navigate to="/customer-portal/master/distributor" replace />
    },
    {
      path: 'master/employee',
      element: <Navigate to="/customer-portal/master/employee" replace />
    },
    {
      path: 'master/warehouse',
      element: <Navigate to="/customer-portal/master/warehouse" replace />
    },
    {
      path: 'master/promo',
      element: <Navigate to="/customer-portal/master/promo" replace />
    },
    {
      path: 'master/signature',
      element: <Navigate to="/customer-portal/master/signature" replace />
    }
  ]
};

export default MasterRoutes;
