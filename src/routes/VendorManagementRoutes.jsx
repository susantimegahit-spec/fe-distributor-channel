import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const VendorRegistrations = Loadable(lazy(() => import('views/vendor-management/VendorRegistrations')));

const VendorManagementRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'vendor-management',
      element: <Navigate to="/vendor-management/registrations" replace />
    },
    {
      path: 'vendor-management/registrations',
      element: <VendorRegistrations />
    }
  ]
};

export default VendorManagementRoutes;
