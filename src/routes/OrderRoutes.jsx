import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const OrderList = Loadable(lazy(() => import('views/customer-portal/order/OrderList')));
const OrderRetur = Loadable(lazy(() => import('views/customer-portal/order/OrderRetur')));

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
      path: 'customer-portal/order/cmo',
      element: <OrderList showOnlyCommitment />
    },
    {
      path: 'customer-portal/order/retur',
      element: <OrderRetur />
    },
    {
      path: 'order/cmo',
      element: <Navigate to="/customer-portal/order/cmo" replace />
    },
    {
      path: 'order/order-list',
      element: <Navigate to="/customer-portal/order/order-list" replace />
    },
    {
      path: 'order/retur',
      element: <Navigate to="/customer-portal/order/retur" replace />
    }
  ]
};

export default OrderRoutes;
