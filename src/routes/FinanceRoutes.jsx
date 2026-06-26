import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const RewardList = Loadable(lazy(() => import('views/reward/RewardList')));
const RewardAdd = Loadable(lazy(() => import('views/reward/RewardAdd')));

const FinanceRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'finance/reward',
      element: <RewardList />
    },
    {
      path: 'finance/reward/add',
      element: <RewardAdd />
    }
  ]
};

export default FinanceRoutes;
