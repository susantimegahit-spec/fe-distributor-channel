import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const PurchaseRequest = Loadable(lazy(() => import('views/enterprise/purchasing/request/PurchaseRequest')));
const PurchaseOrder = Loadable(lazy(() => import('views/enterprise/purchasing/order/PurchaseOrder')));
const Budget = Loadable(lazy(() => import('views/enterprise/budget/Budget')));
const DepartmentList = Loadable(lazy(() => import('views/setting/department/DepartmentList')));

const EnterpriseRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'enterprise/master-data/department',
      element: <DepartmentList />
    },
    {
      path: 'enterprise/purchasing/request',
      element: <PurchaseRequest />
    },
    {
      path: 'enterprise/purchasing/order',
      element: <PurchaseOrder />
    },
    {
      path: 'enterprise/budget',
      element: <Budget />
    }
  ]
};

export default EnterpriseRoutes;
