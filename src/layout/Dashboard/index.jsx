import { Navigate, Outlet, useLocation } from 'react-router-dom';

// project-imports
import Drawer from './Drawer';
import Footer from './Footer';
import Header from './Header';
import Breadcrumbs from 'components/Breadcrumbs';
import FloatingFaq from 'components/FloatingFaq';
import NavigationScroll from 'components/NavigationScroll';
import { getSystemByPathname, normalizeAccessibleSystems } from '../../systems';
import { getCookies } from '../../utils/cookies';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const { pathname } = useLocation();
  const activeSystem = getSystemByPathname(pathname);
  const allowedSystemKeys = new Set(normalizeAccessibleSystems(getCookies('system')));
  const isSystemSelectorPath = pathname === '/systems';
  const isAccessDeniedPath = pathname === '/access-denied';
  const isSharedUtilityPath =
    isSystemSelectorPath ||
    isAccessDeniedPath ||
    pathname === '/notifications' ||
    pathname === '/setting' ||
    pathname.startsWith('/setting/') ||
    pathname.startsWith('/customer-portal/setting');
  const showSidebar = !isSharedUtilityPath;

  if (activeSystem && !allowedSystemKeys.has(activeSystem.key)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ requestedPath: pathname, requestedSystem: activeSystem.title }}
      />
    );
  }

  return (
    <>
      {showSidebar && <Drawer />}
      <Header showSidebar={showSidebar} />
      <div className={`pc-container ${!showSidebar ? 'pc-container-no-sidebar' : ''}`}>
        <div className="pc-content">
          {/* <Breadcrumbs /> */}
          <NavigationScroll>
            <Outlet />
          </NavigationScroll>
        </div>
      </div>
      <Footer showSidebar={showSidebar} />
      {showSidebar && <FloatingFaq />}
    </>
  );
}
