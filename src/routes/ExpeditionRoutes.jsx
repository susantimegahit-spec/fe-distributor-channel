import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const ExpeditionDashboard = Loadable(lazy(() => import('views/expedition/dashboard/ExpeditionDashboard')));
const MasterOrigin = Loadable(lazy(() => import('views/expedition/master/MasterOrigin')));
const MasterExpedition = Loadable(lazy(() => import('views/expedition/master/MasterExpedition')));
const Rates = Loadable(lazy(() => import('views/expedition/master/Rates')));

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
      path: 'expedition/master/origin',
      element: <MasterOrigin />
    },
    {
      path: 'expedition/master/expedition',
      element: <MasterExpedition />
    },
    {
      path: 'expedition/master/rates',
      element: <Rates />
    },
    {
      path: 'expedition/master/tariff',
      element: <Navigate to="/expedition/master/rates" replace />
    },
    {
      path: 'ekspedisi/dashboard',
      element: <Navigate to="/expedition/dashboard" replace />
    },
    {
      path: 'ekspedisi/master/origin',
      element: <Navigate to="/expedition/master/origin" replace />
    },
    {
      path: 'ekspedisi/master/ekspedisi',
      element: <Navigate to="/expedition/master/expedition" replace />
    },
    {
      path: 'ekspedisi/master/tarif',
      element: <Navigate to="/expedition/master/rates" replace />
    }
  ]
};

export default ExpeditionRoutes;
