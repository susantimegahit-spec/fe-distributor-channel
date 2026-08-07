import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// react-bootstrap
import Dropdown from 'react-bootstrap/Dropdown';
import Image from 'react-bootstrap/Image';
import SaltechLogo from 'assets/images/saltech_blue.png';
import {
  getFirstAccessibleMenuPath,
  getSystemByPathname,
  normalizeAccessibleSystems,
  systems
} from '../../../../systems';
import { getCookies } from '../../../../utils/cookies';

export const DrawerHeader = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const roleId = getCookies('role');
  const permissionMenu = getCookies('menu') || [];
  const accessibleSystemKeys = normalizeAccessibleSystems(getCookies('system'));
  const availableSystems = systems.filter((system) => accessibleSystemKeys.includes(system.key));
  const activeSystem = getSystemByPathname(pathname);
  const [showSystemSwitcher, setShowSystemSwitcher] = useState(false);

  const handleSystemSelect = (system) => {
    setShowSystemSwitcher(false);
    if (!system || system.key === activeSystem?.key) return;

    const entryPath = getFirstAccessibleMenuPath(system, permissionMenu, roleId) || system.defaultPath;
    navigate(entryPath);
  };

  useEffect(() => {
    setShowSystemSwitcher(false);
  }, [pathname]);

  useEffect(() => {
    if (!showSystemSwitcher) return undefined;

    const closeFromWorkspace = (event) => {
      if (event.origin === window.location.origin && event.data?.type === 'dc:workspace-pointerdown') {
        setShowSystemSwitcher(false);
      }
    };
    const closeOnIframeFocus = () => {
      window.setTimeout(() => {
        if (document.activeElement?.tagName === 'IFRAME') setShowSystemSwitcher(false);
      }, 0);
    };

    window.addEventListener('message', closeFromWorkspace);
    window.addEventListener('blur', closeOnIframeFocus);
    return () => {
      window.removeEventListener('message', closeFromWorkspace);
      window.removeEventListener('blur', closeOnIframeFocus);
    };
  }, [showSystemSwitcher]);

  if (!activeSystem) return null;

  return (
    <div className="m-header">
      <Dropdown
        className="sm-system-switcher sm-sidebar-system-switcher"
        show={showSystemSwitcher}
        onToggle={setShowSystemSwitcher}
        autoClose
      >
        <Dropdown.Toggle
          variant="link"
          className="b-brand sm-sidebar-brand sm-sidebar-system-toggle"
          id="sidebar-system-switcher"
          aria-label={`Current system: ${activeSystem.title}. Click to change system.`}
        >
          <Image src={SaltechLogo} alt="Saltech" className="sm-sidebar-logo" />
          <span className="sm-sidebar-brand-text">
            <small>{activeSystem.title}</small>
            <i className="ti ti-chevron-down sm-system-switcher-chevron" aria-hidden="true" />
          </span>
        </Dropdown.Toggle>

        <Dropdown.Menu className="sm-system-switcher-menu">
          <Dropdown.Header className="sm-system-switcher-header">
            <strong>Select System</strong>
            <small>Switch to another workspace</small>
          </Dropdown.Header>

          <div className="sm-system-switcher-list">
            {availableSystems.map((system) => {
              const isActive = system.key === activeSystem.key;

              return (
                <Dropdown.Item
                  as="button"
                  key={system.key}
                  className={`sm-system-switcher-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleSystemSelect(system)}
                >
                  <span className={`sm-system-switcher-item-icon is-${system.key}`}>
                    <i className={system.icon} />
                  </span>
                  <span className="sm-system-switcher-item-copy">
                    <span className="sm-system-switcher-item-title">
                      <strong>{system.title}</strong>
                      {isActive && <span>Active</span>}
                    </span>
                    <small>{system.description}</small>
                  </span>
                  <i className="ti ti-chevron-right sm-system-switcher-item-arrow" />
                </Dropdown.Item>
              );
            })}
          </div>

          {Number(roleId) === 5 && (
            <Dropdown.Item as={Link} to="/setting/permissions" className="sm-system-switcher-manage">
              <i className="ti ti-shield-lock me-1" />
              Manage system access
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};
