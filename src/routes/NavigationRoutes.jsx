import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import NotFound from '../views/ErrorBoundary';

// render - dashboard pages
const Dashboard = Loadable(lazy(() => import('views/dashboard/Dashboard')));
const SystemSelector = Loadable(lazy(() => import('views/system/SystemSelector')));

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
        }
      ]
    }
  ]
};

export default NavigationRoutes;
