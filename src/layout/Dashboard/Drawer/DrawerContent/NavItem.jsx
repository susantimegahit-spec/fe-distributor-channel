import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useLocation, matchPath, Link } from 'react-router-dom';

// project-imports
import { handlerDrawerOpen } from 'api/menu';

// ==============================|| NAVIGATION - ITEM ||============================== //

export default function NavItem({ item }) {
  const { pathname } = useLocation();
  const [workspaceCleared, setWorkspaceCleared] = useState(false);

  const itemPath = item?.link || item?.url;
  const activePaths = item?.activeUrls || [itemPath];
  const itemTarget = item?.target ? '_blank' : '_self';
  const isSelected = !workspaceCleared && activePaths.some((path) => path && matchPath({ path, end: true }, pathname));
  const isMobile = window.innerWidth <= 1024;

  useEffect(() => {
    const handleWorkspaceCleared = () => setWorkspaceCleared(true);
    window.addEventListener('dc:workspace-tabs-cleared', handleWorkspaceCleared);
    return () => window.removeEventListener('dc:workspace-tabs-cleared', handleWorkspaceCleared);
  }, []);

  useEffect(() => {
    setWorkspaceCleared(false);
  }, [pathname]);

  const handleClick = () => {
    setWorkspaceCleared(false);

    if (itemTarget === '_self' && itemPath && itemPath !== '#') {
      window.dispatchEvent(
        new CustomEvent('dc:open-workspace-tab', {
          detail: {
            path: itemPath,
            title: item.title
          }
        })
      );
    }

    // close drawer on mobile
    if (isMobile) handlerDrawerOpen(false);
  };

  const renderIcon = () =>
    item?.icon && (
      <span className="pc-micon">
        <i className={item.icon} />
      </span>
    );

  return (
    <li
      id={item?.menu_key !== undefined ? String(item.menu_key) : undefined}
      data-menu-key={item?.menu_key}
      className={`pc-item ${isSelected ? 'active' : ''}`}
    >
      <Link className="pc-link" to={item?.url || '#'} target={itemTarget} onClick={handleClick}>
        {renderIcon()}
        {item.title}
      </Link>
    </li>
  );
}

NavItem.propTypes = { item: PropTypes.any };
