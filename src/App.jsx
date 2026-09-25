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
import { applyThemePreference, getThemePreference, THEME_CHANGED_EVENT, THEME_STORAGE_KEY } from './utils/themePreference';

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
  useEffect(() => {
    const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
    const pathname =
      baseName && window.location.pathname.startsWith(baseName)
        ? window.location.pathname.slice(baseName.length) || '/'
        : window.location.pathname;
    const isVendorPortal = pathname === '/vendor-portal' || pathname.startsWith('/vendor-portal/');

    const syncTheme = (event) => {
      if (event.type === 'storage' && event.key && event.key !== THEME_STORAGE_KEY) return;
      applyThemePreference(isVendorPortal ? 'light' : event.detail?.theme || getThemePreference());
    };

    syncTheme({ type: 'initial' });
    window.addEventListener('storage', syncTheme);
    window.addEventListener(THEME_CHANGED_EVENT, syncTheme);
    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener(THEME_CHANGED_EVENT, syncTheme);
    };
  }, []);

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
