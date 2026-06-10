import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import AuthLayout from 'layout/Auth';
import { createBrowserRouter } from 'react-router-dom';
import { getCookies } from '../utils/cookies';
import DashboardLayout from 'layout/Dashboard';

const PermissionList = Loadable(lazy(() => import('views/setting/permission/PermissionList')));
const UserList = Loadable(lazy(() => import('views/setting/users/UserList')));

const SettingRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'setting/role-permission',
      element: <PermissionList />
    },
    {
      path: 'setting/user-list',
      element: <UserList />
    },
  ]
};

export default SettingRoutes;
