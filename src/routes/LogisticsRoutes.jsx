import { normalizeLogisticsPath } from '../utils/logisticsMigration';
import { lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const LogisticsDashboard = Loadable(lazy(() => import('views/logistics/dashboard/LogisticsDashboard')));
const MasterOrigin = Loadable(lazy(() => import('views/logistics/master/MasterOrigin')));
const MasterDestination = Loadable(lazy(() => import('views/logistics/master/MasterDestination')));
const MasterExpedition = Loadable(lazy(() => import('views/logistics/master/MasterExpedition')));
const Rates = Loadable(lazy(() => import('views/logistics/master/Rates')));

export function LegacyExpeditionRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${normalizeLogisticsPath(pathname)}${search}${hash}`} replace />;
}

const LogisticsRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'logistics/dashboard',
      element: <LogisticsDashboard />
    },
    {
      path: 'logistics/master/origin',
      element: <MasterOrigin />
    },
    {
      path: 'logistics/master/destination',
      element: <MasterDestination />
    },
    {
      path: 'logistics/master/expedition',
      element: <MasterExpedition />
    },
    {
      path: 'logistics/master/rates',
      element: <Rates />
    },
    {
      path: 'logistics/master/tariff',
      element: <Navigate to="/logistics/master/rates" replace />
    },
    {
      path: 'ekspedisi/dashboard',
      element: <Navigate to="/logistics/dashboard" replace />
    },
    {
      path: 'ekspedisi/master/origin',
      element: <Navigate to="/logistics/master/origin" replace />
    },
    {
      path: 'ekspedisi/master/destination',
      element: <Navigate to="/logistics/master/destination" replace />
    },
    {
      path: 'ekspedisi/master/ekspedisi',
      element: <Navigate to="/logistics/master/expedition" replace />
    },
    {
      path: 'ekspedisi/master/tarif',
      element: <Navigate to="/logistics/master/rates" replace />
    }
  ]
};

export default LogisticsRoutes;
