import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const ProductionDashboard = Loadable(lazy(() => import('views/production/dashboard/ProductionDashboard')));
const Material = Loadable(lazy(() => import('views/production/master/material/Material')));
const Resource = Loadable(lazy(() => import('views/production/master/resource/Resource')));
const BillOfMaterial = Loadable(lazy(() => import('views/production/production/BillOfMaterial/BillOfMaterial')));
const ProductionOrder = Loadable(lazy(() => import('views/production/production/ProductionOrder/ProductionOrder')));

const ProductionRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'production/dashboard',
      element: <ProductionDashboard />
    },
    {
      path: 'production/master/material',
      element: <Material />
    },
    {
      path: 'production/master/resource',
      element: <Resource />
    },
    {
      path: 'production/bill-of-material',
      element: <BillOfMaterial />
    },
    {
      path: 'production/order',
      element: <ProductionOrder />
    }
  ]
};

export default ProductionRoutes;
