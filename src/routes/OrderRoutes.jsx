import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

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
      path: 'customer-portal/order/order-list',
      element: <OrderList />
    },
    {
      path: 'order/order-list',
      element: <Navigate to="/customer-portal/order/order-list" replace />
    }
  ]
};

export default OrderRoutes;
