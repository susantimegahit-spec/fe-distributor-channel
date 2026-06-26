import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const SettingPage = Loadable(lazy(() => import('views/setting/SettingPage')));

function LegacySettingRedirect() {
  const { activeTab } = useParams();

  return <Navigate to={activeTab ? `/customer-portal/setting/${activeTab}` : '/customer-portal/setting'} replace />;
}

const SettingRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'customer-portal/setting',
      element: <SettingPage />
    },
    {
      path: 'customer-portal/setting/:activeTab',
      element: <SettingPage />
    },
    {
      path: 'customer-portal/setting/role-permission',
      element: <SettingPage defaultTab="permissions" />
    },
    {
      path: 'customer-portal/setting/user-list',
      element: <SettingPage defaultTab="users" />
    },
    {
      path: 'setting',
      element: <Navigate to="/customer-portal/setting" replace />
    },
    {
      path: 'setting/:activeTab',
      element: <LegacySettingRedirect />
    },
    {
      path: 'setting/role-permission',
      element: <Navigate to="/customer-portal/setting/role-permission" replace />
    },
    {
      path: 'setting/user-list',
      element: <Navigate to="/customer-portal/setting/user-list" replace />
    }
  ]
};

export default SettingRoutes;
