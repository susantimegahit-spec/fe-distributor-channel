import PropTypes from 'prop-types';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

// react-bootstrap
import Collapse from 'react-bootstrap/Collapse';
import ListGroup from 'react-bootstrap/ListGroup';

// project imports
import NavItem from './NavItem';
import NavGroup from './NavGroup';
import { canAccessMenuItem, canAccessSystem, isAdministratorRole, normalizeAccessibleSystems, systems } from '../../../../systems';
import { getCookies } from '../../../../utils/cookies';

// ==============================|| DRAWER CONTENT ||============================== //

export default function Navigation({ selectedItems, setSelectedItems, setSelectTab }) {
  const [selectedID, setSelectedID] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { pathname } = useLocation();
  const roleId = getCookies('role');
  const permissionMenu = getCookies('menu') || [];
  const isAdministrator = isAdministratorRole(roleId);
  const allowedSystemKeys = new Set(normalizeAccessibleSystems(getCookies('system')));
  const availableSystems = systems.filter(
    (system) => isAdministrator || (allowedSystemKeys.has(system.key) && canAccessSystem(system, permissionMenu, roleId))
  );

  const getVisibleItem = (item) => {
    if (item.children?.length) {
      const children = item.children.map(getVisibleItem).filter(Boolean);
      return children.length ? { ...item, children } : null;
    }

    return canAccessMenuItem(item, permissionMenu, roleId) ? item : null;
  };

  const getUnifiedSystemMenu = (system) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filterBySearch = (item) => {
      if (!normalizedQuery) return item;
      if (`${item.title || ''} ${item.label || ''}`.toLowerCase().includes(normalizedQuery)) return item;
      if (!item.children?.length) return null;

      const children = item.children.map(filterBySearch).filter(Boolean);
      return children.length ? { ...item, children } : null;
    };
    const showWholeSystem = system.title.toLowerCase().includes(normalizedQuery);
    const visibleGroups = system.menu
      .map(getVisibleItem)
      .filter(Boolean)
      .map((item) => (showWholeSystem ? item : filterBySearch(item)))
      .filter(Boolean);
    const children = visibleGroups.flatMap((group) => {
      if (group.collapsible === false) return group.children || [];

      const isDashboardGroup = group.id === 'dashboard' || group.id?.endsWith('-dashboard');
      if (isDashboardGroup && group.children?.length === 1) return group.children;

      return [
        {
          ...group,
          type: 'collapse',
          icon: group.icon || 'ti ti-category-2'
        }
      ];
    });

    return {
      id: `${system.key}-unified-menu`,
      type: 'group',
      label: system.title,
      collapsible: false,
      children
    };
  };
  const displayedSystems = availableSystems
    .map((system) => ({ system, menu: getUnifiedSystemMenu(system) }))
    .filter(({ menu }) => menu.children.length);
  const [openSystems, setOpenSystems] = useState(() => {
    const activeSystem = systems.find((system) => pathname.startsWith(system.basePath));
    return activeSystem ? { [activeSystem.key]: true } : {};
  });

  const toggleSystem = (systemKey) => {
    setOpenSystems((current) => ({ ...current, [systemKey]: !current[systemKey] }));
  };

  const renderGroup = (system, item) => {
    if (item.type !== 'group') return null;

    if (item.url) {
      return (
        <ListGroup.Item key={`${system.key}:${item.id}`}>
          <NavItem item={item} level={1} isParents />
        </ListGroup.Item>
      );
    }

    return (
      <NavGroup
        key={`${system.key}:${item.id}`}
        setSelectedID={setSelectedID}
        setSelectedItems={setSelectedItems}
        setSelectedLevel={setSelectedLevel}
        selectedLevel={selectedLevel}
        selectedID={selectedID}
        selectedItems={selectedItems}
        lastItem={null}
        remItems={[]}
        item={item}
        expandChildren={Boolean(searchQuery.trim())}
        setSelectTab={setSelectTab ?? (() => {})}
      />
    );
  };

  return (
    <ul className="pc-navbar sm-unified-sidebar">
      <li className="sm-sidebar-menu-search">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search menu..."
          aria-label="Search menu"
        />
      </li>
      {!searchQuery.trim() || 'dashboard'.includes(searchQuery.trim().toLowerCase()) ? (
        <NavItem
          item={{ id: 'global-dashboard', title: 'Dashboard', type: 'item', url: '/dashboard', icon: 'ti ti-layout-dashboard' }}
          level={1}
        />
      ) : null}
      {displayedSystems.map(({ system, menu }) => {
        const isOpen = Boolean(searchQuery.trim()) || Boolean(openSystems[system.key]);
        return (
        <li className={`sm-unified-sidebar-system ${isOpen ? 'is-open' : ''}`} key={system.key}>
          <button
            type="button"
            className="sm-unified-sidebar-system-title"
            onClick={() => toggleSystem(system.key)}
            aria-expanded={isOpen}
            aria-controls={`sidebar-system-${system.key}`}
          >
            <i className={system.icon} aria-hidden="true" />
            <span>{system.title}</span>
            <i className="ti ti-chevron-down sm-unified-sidebar-system-arrow" aria-hidden="true" />
          </button>
          <Collapse in={isOpen}>
            <ul id={`sidebar-system-${system.key}`}>{renderGroup(system, menu)}</ul>
          </Collapse>
        </li>
        );
      })}
    </ul>
  );
}

Navigation.propTypes = {
  selectedItems: PropTypes.any,
  setSelectedItems: PropTypes.oneOfType([PropTypes.func, PropTypes.any]),
  setSelectTab: PropTypes.oneOfType([PropTypes.func, PropTypes.any])
};
