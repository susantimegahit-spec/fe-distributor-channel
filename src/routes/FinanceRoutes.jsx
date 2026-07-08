import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const RewardList = Loadable(lazy(() => import('views/customer-portal/reward/RewardList')));
const RewardAdd = Loadable(lazy(() => import('views/customer-portal/reward/RewardAdd')));

const FinanceRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'customer-portal/finance/reward',
      element: <RewardList />
    },
    {
      path: 'customer-portal/finance/reward/add',
      element: <RewardAdd />
    },
    {
      path: 'finance/reward',
      element: <Navigate to="/customer-portal/finance/reward" replace />
    },
    {
      path: 'finance/reward/add',
      element: <Navigate to="/customer-portal/finance/reward/add" replace />
    }
  ]
};

export default FinanceRoutes;
