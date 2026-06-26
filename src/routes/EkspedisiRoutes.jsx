import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const EkspedisiDashboard = Loadable(lazy(() => import('views/ekspedisi/EkspedisiDashboard')));

const EkspedisiRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'ekspedisi/dashboard',
      element: <EkspedisiDashboard />
    }
  ]
};

export default EkspedisiRoutes;
