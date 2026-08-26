import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import NotFound from '../views/ErrorBoundary';

// render - dashboard pages
const Dashboard = Loadable(lazy(() => import('views/customer-portal/dashboard/Dashboard')));
const SystemSelector = Loadable(lazy(() => import('views/system/SystemSelector')));
const AccessDenied = Loadable(lazy(() => import('views/system/AccessDenied')));
const VendorPortalMonitoring = Loadable(lazy(() => import('views/vendor-portal/VendorPortalMonitoring')));

// ==============================|| NAVIGATION ROUTING ||============================== //

const NavigationRoutes = {
  path: '/',
  ErrorBoundary: NotFound,
  children: [
    {
      path: 'access-denied',
      element: <AccessDenied />
    },
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <Navigate to="/systems" replace />
        },
        {
          path: 'systems',
          element: <SystemSelector />
        },
        {
          path: 'customer-portal/dashboard',
          element: <Dashboard />
        },
        {
          path: 'dashboard',
          element: <Navigate to="/customer-portal/dashboard" replace />
        },
        {
          path: 'vendor-portal-monitoring',
          element: <VendorPortalMonitoring />
        }
      ]
    }
  ]
};

export default NavigationRoutes;
