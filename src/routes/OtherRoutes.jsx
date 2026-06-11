import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

// render - other pages
const OrderCreate = Loadable(lazy(() => import('views/order/OrderCreate')));
// ==============================|| OTHER ROUTING ||============================== //

const OtherRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'order/order-create/:id',
      element: <OrderCreate />
    },
    {
      path: 'order/order-create',
      element: <OrderCreate />
    },
  ]
};

export default OtherRoutes;
