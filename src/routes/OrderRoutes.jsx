import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const OrderList = Loadable(lazy(() => import('views/order/OrderList')));
// const OrderRetur = Loadable(lazy(() => import('views/order/OrderRetur')));

const OrderRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'order/order-list',
      element: <OrderList />
    }
  ]
};

export default OrderRoutes;
