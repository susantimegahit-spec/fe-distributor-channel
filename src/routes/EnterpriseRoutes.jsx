import { lazy } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const PurchaseRequest = Loadable(lazy(() => import('views/enterprise/purchasing/request/PurchaseRequest')));
const PurchaseOrder = Loadable(lazy(() => import('views/enterprise/purchasing/order/PurchaseOrder')));
const Budget = Loadable(lazy(() => import('views/enterprise/budget/Budget')));
const DepartmentList = Loadable(lazy(() => import('views/setting/department/DepartmentList')));
const CvScreening = Loadable(lazy(() => import('views/customer-portal/cv-screening/CvScreening')));

const LegacyEnterpriseRedirect = () => {
  const location = useLocation();
  return <Navigate to={`${location.pathname.replace(/^\/enterprise/, '/coporate')}${location.search}`} replace />;
};

const EnterpriseRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'coporate/master-data/department',
      element: <DepartmentList />
    },
    {
      path: 'coporate/purchasing/request',
      element: <PurchaseRequest />
    },
    {
      path: 'coporate/purchasing/order',
      element: <PurchaseOrder />
    },
    {
      path: 'coporate/budget',
      element: <Budget />
    },
    {
      path: 'coporate/hrd/cv',
      element: <CvScreening />
    },
    {
      path: 'enterprise/*',
      element: <LegacyEnterpriseRedirect />
    }
  ]
};

export default EnterpriseRoutes;
