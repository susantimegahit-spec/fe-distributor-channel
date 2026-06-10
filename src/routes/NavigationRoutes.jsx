import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import NotFound from '../views/ErrorBoundary';

// render - dashboard pages
const Dashboard = Loadable(lazy(() => import('views/dashboard/Dashboard')));

// ==============================|| NAVIGATION ROUTING ||============================== //

const NavigationRoutes = {
  path: '/',
  ErrorBoundary: NotFound,
  children: [
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <Dashboard />
        },
        {
          path: 'dashboard',
          element: <Dashboard />
        }
      ]
    }
  ]
};

export default NavigationRoutes;
