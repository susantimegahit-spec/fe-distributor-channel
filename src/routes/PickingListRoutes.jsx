import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const PickingListDashboard = Loadable(lazy(() => import('views/picking-list/dashboard/PickingListDashboard')));
const MasterPickingList = Loadable(lazy(() => import('views/picking-list/master/MasterPickingList')));

const PickingListRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'picking-list/dashboard',
      element: <PickingListDashboard />
    },
    {
      path: 'picking-list/master/picking-list',
      element: <MasterPickingList />
    }
  ]
};

export default PickingListRoutes;
