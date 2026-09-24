import { useMemo } from 'react';
import PropTypes from 'prop-types';
import Dropdown from 'react-bootstrap/Dropdown';
import { Link, matchPath, useLocation } from 'react-router-dom';

import { canAccessMenuItem, canAccessSystem, isAdministratorRole, normalizeAccessibleSystems, systems } from '../../systems';
import { getCookies } from '../../utils/cookies';

const hasActivePath = (item, pathname) => {
  if (item.children?.length) return item.children.some((child) => hasActivePath(child, pathname));
  const paths = item.activeUrls || [item.link || item.url];
  return paths.some((path) => path && matchPath({ path, end: true }, pathname));
};

const getVisibleMenuTree = (items, permissionMenu, roleId) =>
  items.reduce((result, item) => {
    if (item.children?.length) {
      const children = getVisibleMenuTree(item.children, permissionMenu, roleId);
      if (children.length) result.push({ ...item, children });
      return result;
    }

    if (item.type === 'item' && item.url && !item.url.endsWith('/dashboard') && canAccessMenuItem(item, permissionMenu, roleId)) {
      result.push(item);
    }
    return result;
  }, []);

const MenuBranch = ({ item, pathname, system }) => {
  if (item.children?.length) {
    return (
      <section className="sm-top-nav-group">
        <div className="sm-top-nav-group-title">
          {item.icon ? <i className={item.icon} aria-hidden="true" /> : null}
          <span>{item.label || item.title}</span>
        </div>
        <div className="sm-top-nav-group-items">
          {item.children.map((child) => (
            <MenuBranch key={child.id || child.url} item={child} pathname={pathname} system={system} />
          ))}
        </div>
      </section>
    );
  }

  const active = hasActivePath(item, pathname);
  const openWorkspaceTab = () => {
    window.dispatchEvent(
      new CustomEvent('dc:open-workspace-tab', {
        detail: {
          path: item.url,
          title: item.title,
          systemKey: system.key,
          systemTitle: system.title
        }
      })
    );
  };

  return (
    <Dropdown.Item as={Link} to={item.url} className={`sm-top-nav-item ${active ? 'is-active' : ''}`} onClick={openWorkspaceTab}>
      <span className="sm-top-nav-item-icon">
        <i className={item.icon || 'ti ti-point'} aria-hidden="true" />
      </span>
      <span>{item.title}</span>
      {active ? <i className="ti ti-check sm-top-nav-item-check" aria-hidden="true" /> : null}
    </Dropdown.Item>
  );
};

MenuBranch.propTypes = {
  item: PropTypes.object.isRequired,
  pathname: PropTypes.string.isRequired,
  system: PropTypes.object.isRequired
};

export default function TopNavigation() {
  const { pathname } = useLocation();
  const roleId = getCookies('role');
  const permissionMenu = useMemo(() => getCookies('menu') || [], []);
  const isAdministrator = isAdministratorRole(roleId);
  const allowedSystemKeys = useMemo(() => new Set(normalizeAccessibleSystems(getCookies('system'))), []);
  const availableSystems = useMemo(
    () =>
      systems
        .filter((system) => isAdministrator || (allowedSystemKeys.has(system.key) && canAccessSystem(system, permissionMenu, roleId)))
        .map((system) => ({
          ...system,
          visibleMenu: getVisibleMenuTree(system.menu, permissionMenu, roleId)
        }))
        .filter((system) => system.visibleMenu.length),
    [allowedSystemKeys, isAdministrator, permissionMenu, roleId]
  );

  return (
    <nav className="sm-top-navigation" aria-label="Main modules">
      <Link
        to="/dashboard"
        className={`sm-global-dashboard-link ${pathname === '/dashboard' ? 'is-active' : ''}`}
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent('dc:open-workspace-tab', {
              detail: { path: '/dashboard', title: 'Dashboard', systemKey: 'global', systemTitle: 'SMESTA' }
            })
          )
        }
      >
        <i className="ti ti-layout-dashboard" aria-hidden="true" />
        <span>Dashboard</span>
      </Link>
      <div className="sm-top-navigation-modules">
        {availableSystems.map((system) => {
          const active = pathname.startsWith(system.basePath);
          return (
            <Dropdown className={`sm-top-module ${active ? 'is-active' : ''}`} key={system.key}>
              <Dropdown.Toggle variant="link" className="sm-top-module-toggle" id={`top-module-${system.key}`}>
                <i className={system.icon} aria-hidden="true" />
                <span>{system.title}</span>
                <i className="ti ti-chevron-down sm-top-module-chevron" aria-hidden="true" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="sm-top-module-menu">
                <div className="sm-top-module-heading">
                  <span className={`sm-top-module-heading-icon is-${system.key}`}>
                    <i className={system.icon} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{system.title}</strong>
                    <small>{system.description}</small>
                  </span>
                </div>
                <div className="sm-top-module-menu-content">
                  {system.visibleMenu.map((item) => (
                    <MenuBranch key={item.id} item={item} pathname={pathname} system={system} />
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          );
        })}
      </div>
    </nav>
  );
}
