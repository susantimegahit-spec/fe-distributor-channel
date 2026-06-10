import { BrowserRouter as Router, Route, HashRouter, RouterProvider, useRouteError } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { lazy } from 'react';

"use client";

// project-imports
import router from 'routes';
import { getCookies } from './utils/cookies';
import { useEffect, useState } from 'react';
import AuthRoutes from './routes/AuthRoutes';
import { AlertProvider } from './utils/alertContext';
import { createBrowserRouter } from 'react-router-dom';
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import MenuRoutes from './routes/MenuRoutes';
import ErrorBoundary from './views/ErrorBoundary';
// import { ErrorBoundary, getErrorMessage } from 'react-error-boundary';
// import ErrorBoundary from './views/ErrorBoundary';
// import store from './redux/store';

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

const ProviderConfig = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [listMenu, setIsListMenu] = useState([]);
  const session = getCookies('isLoggedIn');

  return session ? <RouterProvider router={router} /> : <RouterProvider router={AuthRoutes} />;
  // const [authentication, setauthentication] = useState(null)
  // const [path, setPath] = useState(window.location.pathname);
};

function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <ProviderConfig />
      </AlertProvider>
    </ErrorBoundary>
  );
  // return (
  //   <Provider >
  //     {/* <ProviderConfig /> */}
  //     <RouterProvider router={router} />
  //   </Provider>
  // )
  // return <RouterProvider router={router} />;
}

export default App;
