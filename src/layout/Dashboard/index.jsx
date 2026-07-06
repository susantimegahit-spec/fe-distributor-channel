import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// project-imports
import Drawer from './Drawer';
import Footer from './Footer';
import Header from './Header';
import Breadcrumbs from 'components/Breadcrumbs';
import NavigationScroll from 'components/NavigationScroll';
import { getSystemByPathname, normalizeAccessibleSystems } from '../../systems';
import { getCookies } from '../../utils/cookies';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const { pathname } = useLocation();
  const activeSystem = getSystemByPathname(pathname);
  const reduxSystemAccess = useSelector((state) => state.auth?.accessible_system || []);
  const systemAccess = reduxSystemAccess.length ? reduxSystemAccess : normalizeAccessibleSystems(getCookies('system'));
  const isSystemSelectorPath = pathname === '/systems';

  if (!isSystemSelectorPath && activeSystem && systemAccess.length && !systemAccess.includes(activeSystem.key)) {
    return <Navigate to="/systems" replace />;
  }

  return (
    <>
      <Drawer />
      <Header />
      <div className="pc-container">
        <div className="pc-content">
          {/* <Breadcrumbs /> */}
          <NavigationScroll>
            <Outlet />
          </NavigationScroll>
        </div>
      </div>
      <Footer />
    </>
  );
}
