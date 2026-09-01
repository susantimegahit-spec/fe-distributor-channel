import { RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';

// project-imports
import router from 'routes';
import { getCookies } from './utils/cookies';
import AuthRoutes from './routes/AuthRoutes';
import { AlertProvider } from './utils/alertContext';
import { ConfirmProvider } from './utils/confirmContext';
import SapConnectionRetryDialog from './components/SapConnectionRetryDialog';
import ErrorBoundary from './views/ErrorBoundary';
import { AUTH_STATE_CHANGED_EVENT } from './utils/authEvents';
import NetworkStatusGuard from './components/NetworkStatusGuard';
import VendorPortalRoutes from './routes/VendorPortalRoutes';

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

const ProviderConfig = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getCookies('isLoggedIn')));
  const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
  const appPathname =
    baseName && window.location.pathname.startsWith(baseName)
      ? window.location.pathname.slice(baseName.length) || '/'
      : window.location.pathname;
  const isVendorPortal = appPathname === '/vendor-portal' || appPathname.startsWith('/vendor-portal/');

  useEffect(() => {
    const syncAuthentication = () => {
      setIsLoggedIn(Boolean(getCookies('isLoggedIn')));
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthentication);

    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthentication);
  }, []);

  if (isVendorPortal) return <RouterProvider router={VendorPortalRoutes} />;

  return isLoggedIn ? <RouterProvider router={router} /> : <RouterProvider router={AuthRoutes} />;
};

function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <ConfirmProvider>
          <SapConnectionRetryDialog />
          <NetworkStatusGuard>
            <ProviderConfig />
          </NetworkStatusGuard>
        </ConfirmProvider>
      </AlertProvider>
    </ErrorBoundary>
  );
}

export default App;
