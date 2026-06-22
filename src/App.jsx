import { RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';

// project-imports
import router from 'routes';
import { getCookies } from './utils/cookies';
import AuthRoutes from './routes/AuthRoutes';
import { AlertProvider } from './utils/alertContext';
import ErrorBoundary from './views/ErrorBoundary';
import { AUTH_STATE_CHANGED_EVENT } from './utils/authEvents';

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

const ProviderConfig = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getCookies('isLoggedIn')));

  useEffect(() => {
    const syncAuthentication = () => {
      setIsLoggedIn(Boolean(getCookies('isLoggedIn')));
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthentication);

    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthentication);
  }, []);

  return isLoggedIn ? <RouterProvider router={router} /> : <RouterProvider router={AuthRoutes} />;
};

function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <ProviderConfig />
      </AlertProvider>
    </ErrorBoundary>
  );
}

export default App;
