import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// project-imports
import Drawer from './Drawer';
import Footer from './Footer';
import Header from './Header';
import Breadcrumbs from 'components/Breadcrumbs';
import FloatingFaq from 'components/FloatingFaq';
import NavigationScroll from 'components/NavigationScroll';
import Workspace from './Workspace';
import {
  canAccessMenuItem,
  getFirstAccessibleMenuPath,
  getMenuItemByPathname,
  getSystemByPathname,
  isAdministratorRole,
  normalizeAccessibleSystems
} from '../../systems';
import { getCookies } from '../../utils/cookies';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const { pathname, search } = useLocation();
  const isWorkspaceWindow =
    new URLSearchParams(search).get('workspaceWindow') === '1' || window.self !== window.top;
  const activeSystem = getSystemByPathname(pathname);
  const roleId = getCookies('role');
  const permissionMenu = getCookies('menu') || [];
  const isAdministrator = isAdministratorRole(roleId);
  const allowedSystemKeys = new Set(normalizeAccessibleSystems(getCookies('system')));
  const isSystemSelectorPath = pathname === '/systems';
  const isAccessDeniedPath = pathname === '/access-denied';
  const isSharedUtilityPath =
    isSystemSelectorPath ||
    isAccessDeniedPath ||
    pathname === '/notifications' ||
    pathname === '/setting' ||
    pathname.startsWith('/setting/') ||
    pathname.startsWith('/customer-portal/setting') ||
    pathname === '/customer-portal/master/signature';
  const showSidebar = !isSharedUtilityPath;
  const requestedMenu = activeSystem && !isSharedUtilityPath ? getMenuItemByPathname(activeSystem, pathname) : null;
  const firstAccessibleMenuPath = activeSystem
    ? getFirstAccessibleMenuPath(activeSystem, permissionMenu, roleId)
    : null;

  useEffect(() => {
    if (activeSystem?.key) {
      document.documentElement.dataset.systemTheme = activeSystem.key;
    } else {
      delete document.documentElement.dataset.systemTheme;
    }

    return () => {
      delete document.documentElement.dataset.systemTheme;
    };
  }, [activeSystem?.key]);

  useEffect(() => {
    if (!isWorkspaceWindow || !isSystemSelectorPath) return;

    sessionStorage.removeItem('dc-browser-workspace-v1');
    const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
    window.top.location.replace(`${baseName}/systems`);
  }, [isSystemSelectorPath, isWorkspaceWindow]);

  useEffect(() => {
    if (!isWorkspaceWindow) return undefined;

    const notifyParentOfPointerDown = () => {
      window.parent.postMessage({ type: 'dc:workspace-pointerdown' }, window.location.origin);
    };

    document.addEventListener('pointerdown', notifyParentOfPointerDown, true);
    return () => document.removeEventListener('pointerdown', notifyParentOfPointerDown, true);
  }, [isWorkspaceWindow]);

  if (activeSystem && !isAdministrator && !allowedSystemKeys.has(activeSystem.key)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ requestedPath: pathname, requestedSystem: activeSystem.title }}
      />
    );
  }

  if (activeSystem && !isSharedUtilityPath && !canAccessMenuItem(requestedMenu, permissionMenu, roleId)) {
    const isDashboardPath = pathname === activeSystem.defaultPath;

    if (isDashboardPath && firstAccessibleMenuPath && firstAccessibleMenuPath !== pathname) {
      return <Navigate to={firstAccessibleMenuPath} replace />;
    }

    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          requestedPath: pathname,
          requestedSystem: activeSystem.title,
          requestedMenu: requestedMenu?.title || 'Requested menu'
        }}
      />
    );
  }

  if (isWorkspaceWindow) {
    if (isSystemSelectorPath) {
      return null;
    }

    return (
      <NavigationScroll>
        <div className="sm-workspace-embedded-content">
          <Outlet />
        </div>
      </NavigationScroll>
    );
  }

  return (
    <>
      {showSidebar && <Drawer />}
      <Header showSidebar={showSidebar} />
      <div
        className={`pc-container ${!showSidebar ? 'pc-container-no-sidebar' : 'pc-container-workspace'}`}
      >
        <div className="pc-content">
          {/* <Breadcrumbs /> */}
          <NavigationScroll>
            {showSidebar ? (
              <Workspace
                activePath={pathname}
                menuTitle={requestedMenu?.title || activeSystem?.title || 'Workspace'}
                systemTitle={activeSystem?.title || 'Distributor Channel'}
                systemKey={activeSystem?.key || 'customer-portal'}
              />
            ) : (
              <Outlet />
            )}
          </NavigationScroll>
        </div>
      </div>
      {!showSidebar && <Footer showSidebar={showSidebar} />}
      {showSidebar && <FloatingFaq />}
    </>
  );
}
