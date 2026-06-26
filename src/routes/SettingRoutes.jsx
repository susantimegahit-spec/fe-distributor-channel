import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const SettingPage = Loadable(lazy(() => import('views/setting/SettingPage')));

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
    }
  ]
};

export default SettingRoutes;
