import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const ExpeditionDashboard = Loadable(lazy(() => import('views/expedition/dashboard/ExpeditionDashboard')));
const MasterExpedition = Loadable(lazy(() => import('views/expedition/master/MasterExpedition')));

const ExpeditionRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'expedition/dashboard',
      element: <ExpeditionDashboard />
    },
    {
      path: 'expedition/master/expedition',
      element: <MasterExpedition />
    },
    {
      path: 'ekspedisi/dashboard',
      element: <Navigate to="/expedition/dashboard" replace />
    },
    {
      path: 'ekspedisi/master/ekspedisi',
      element: <Navigate to="/expedition/master/expedition" replace />
    }
  ]
};

export default ExpeditionRoutes;
