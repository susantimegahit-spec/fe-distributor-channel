import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const SettingPage = Loadable(lazy(() => import('views/setting/SettingPage')));

function LegacySettingRedirect() {
  const { activeTab } = useParams();

  return <Navigate to={activeTab ? `/setting/${activeTab}` : '/setting'} replace />;
}

const SettingRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'setting',
      element: <SettingPage />
    },
    {
      path: 'setting/:activeTab',
      element: <SettingPage />
    },
    {
      path: 'setting/role-permission',
      element: <SettingPage defaultTab="permissions" />
    },
    {
      path: 'setting/user-list',
      element: <SettingPage defaultTab="users" />
    },
    {
      path: 'customer-portal/setting',
      element: <Navigate to="/setting" replace />
    },
    {
      path: 'customer-portal/setting/:activeTab',
      element: <LegacySettingRedirect />
    },
    {
      path: 'customer-portal/setting/role-permission',
      element: <Navigate to="/setting/role-permission" replace />
    },
    {
      path: 'customer-portal/setting/user-list',
      element: <Navigate to="/setting/user-list" replace />
    }
  ]
};

export default SettingRoutes;
