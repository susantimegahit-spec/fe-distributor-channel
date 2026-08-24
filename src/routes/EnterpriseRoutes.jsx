import { lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const PurchaseRequest = Loadable(lazy(() => import('views/corporate/purchasing/request/PurchaseRequest')));
const PurchaseOrder = Loadable(lazy(() => import('views/corporate/purchasing/order/PurchaseOrder')));
const Budget = Loadable(lazy(() => import('views/corporate/budget/Budget')));
const DepartmentList = Loadable(lazy(() => import('views/setting/department/DepartmentList')));
const CvScreening = Loadable(lazy(() => import('views/customer-portal/cv-screening/CvScreening')));
const TaskManagement = Loadable(lazy(() => import('views/corporate/hrd/TaskManagement')));

const LegacyEnterpriseRedirect = () => {
  const location = useLocation();
  return <Navigate to={`${location.pathname.replace(/^\/(enterprise|coporate)/, '/corporate')}${location.search}`} replace />;
};

const EnterpriseRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'corporate/master-data/department',
      element: <DepartmentList />
    },
    {
      path: 'corporate/purchasing/request',
      element: <PurchaseRequest />
    },
    {
      path: 'corporate/purchasing/order',
      element: <PurchaseOrder />
    },
    {
      path: 'corporate/budget',
      element: <Budget />
    },
    {
      path: 'corporate/hrd/cv',
      element: <CvScreening />
    },
    {
      path: 'corporate/hrd/task-management',
      element: <TaskManagement />
    },
    {
      path: 'coporate/*',
      element: <LegacyEnterpriseRedirect />
    },
    {
      path: 'enterprise/*',
      element: <LegacyEnterpriseRedirect />
    }
  ]
};

export default EnterpriseRoutes;
