import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

// render - other pages
const OrderCreate = Loadable(lazy(() => import('views/customer-portal/order/OrderCreate')));
const NotificationList = Loadable(lazy(() => import('views/notification/NotificationList')));

function LegacyOrderCreateRedirect() {
  const { id } = useParams();

  return <Navigate to={id ? `/customer-portal/order/order-create/${id}` : '/customer-portal/order/order-create'} replace />;
}

// ==============================|| OTHER ROUTING ||============================== //

const OtherRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'customer-portal/order/order-create/:id',
      element: <OrderCreate />
    },
    {
      path: 'customer-portal/order/order-create',
      element: <OrderCreate />
    },
    {
      path: 'customer-portal/order/cmo-create/:id',
      element: <OrderCreate cmoMode />
    },
    {
      path: 'customer-portal/order/cmo-create',
      element: <OrderCreate cmoMode />
    },
    {
      path: 'order/order-create/:id',
      element: <LegacyOrderCreateRedirect />
    },
    {
      path: 'order/order-create',
      element: <Navigate to="/customer-portal/order/order-create" replace />
    },
    {
      path: 'notifications',
      element: <NotificationList />
    },
    {
      path: 'cv-screening',
      element: <Navigate to="/enterprise/hrd/cv" replace />
    }
  ]
};

export default OtherRoutes;
