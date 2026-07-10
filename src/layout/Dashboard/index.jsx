import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// project-imports
import Drawer from './Drawer';
import Footer from './Footer';
import Header from './Header';
import Breadcrumbs from 'components/Breadcrumbs';
import FloatingFaq from 'components/FloatingFaq';
import NavigationScroll from 'components/NavigationScroll';
import { getAvailableSystems, getSystemByPathname, isAdministratorRole, normalizeAccessibleSystems } from '../../systems';
import { getCookies } from '../../utils/cookies';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const { pathname } = useLocation();
  const activeSystem = getSystemByPathname(pathname);
  const roleId = getCookies('role');
  const menuPermission = getCookies('menu');
  const systemPermission = getCookies('systems');
  const reduxSystemAccess = useSelector((state) => state.auth?.accessible_system || []);
  const systemAccess = reduxSystemAccess.length ? reduxSystemAccess : normalizeAccessibleSystems(getCookies('system'));
  const permissionMenu = [
    ...(Array.isArray(menuPermission) ? menuPermission : []),
    ...(Array.isArray(systemPermission) ? systemPermission : [])
  ];
  const permissionSystems = getAvailableSystems(permissionMenu, roleId);
  const allowedSystemKeys = new Set([...systemAccess, ...permissionSystems.map((system) => system.key)]);
  const isAdministrator = isAdministratorRole(roleId);
  const isSystemSelectorPath = pathname === '/systems';
  const isSharedUtilityPath =
    isSystemSelectorPath ||
    pathname === '/notifications' ||
    pathname === '/setting' ||
    pathname.startsWith('/setting/') ||
    pathname.startsWith('/customer-portal/setting');
  const showSidebar = !isSharedUtilityPath;

  if (!isAdministrator && !isSystemSelectorPath && activeSystem && allowedSystemKeys.size && !allowedSystemKeys.has(activeSystem.key)) {
    return <Navigate to="/systems" replace />;
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
