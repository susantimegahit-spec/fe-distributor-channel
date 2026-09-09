import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const VendorManagementDashboard = Loadable(lazy(() => import('views/vendor-management/VendorManagementDashboard')));
const VendorRegistrations = Loadable(lazy(() => import('views/vendor-management/VendorRegistrations')));

const VendorManagementRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'vendor-management',
      element: <Navigate to="/vendor-management/dashboard" replace />
    },
    {
      path: 'vendor-management/dashboard',
      element: <VendorManagementDashboard />
    },
    {
      path: 'vendor-management/registrations',
      element: <Navigate to="/vendor-management/dashboard" replace />
    },
    {
      path: 'vendor-management/vendor',
      element: <VendorRegistrations title="Vendors" subheader="Browse vendor registration records." />
    }
  ]
};

export default VendorManagementRoutes;
