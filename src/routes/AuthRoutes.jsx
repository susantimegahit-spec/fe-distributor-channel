import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import { createBrowserRouter } from 'react-router-dom';

// render - login pages
const LoginPage = Loadable(lazy(() => import('views/auth/login/Login')));

const AuthRoutes = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />
  },
  {
    path: '*',
    element: <LoginPage />
  }
]);

export default AuthRoutes;
