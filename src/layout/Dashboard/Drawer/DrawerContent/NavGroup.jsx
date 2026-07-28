import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import Collapse from 'react-bootstrap/Collapse';

// project-imports
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import { getCookies } from '../../../../utils/cookies';
import { normalizePermissionMenu } from '../../../../systems';

const hasActivePath = (menuItem, pathname) => {
  if (menuItem.children?.length) return menuItem.children.some((child) => hasActivePath(child, pathname));

  const paths = menuItem.activeUrls || [menuItem.link || menuItem.url];
  return paths.some((path) => path && matchPath({ path, end: true }, pathname));
};

// ==============================|| NAVIGATION - GROUP ||============================== //

export default function NavGroup(props) {
  const { item, lastItem, remItems, lastItemId, setSelectedID, setSelectedItems, selectedItems, setSelectedLevel, selectedLevel } = props;
  const masterMenu = normalizePermissionMenu(getCookies('menu') || []);
  const { pathname } = useLocation();
  const [currentItem, setCurrentItem] = useState(item);
  const [groupOpen, setGroupOpen] = useState(() => hasActivePath(item, pathname));

  //  Combine items if this is the last grouped item
  useEffect(() => {
    if (lastItem && item.id === lastItemId) {
      const children = remItems.flatMap((ele) => ele.children ?? []);
      setCurrentItem({ ...item, children });
    } else {
      setCurrentItem(item);
    }
  }, [item, lastItem, lastItemId, remItems]);

  //  Helper: Recursively check if route matches
  const findMatchingChild = useCallback(
    (children, parentId) => {
      children.forEach((child) => {
        if (child.children?.length) findMatchingChild(child.children, parentId);
        const paths = child.activeUrls || [child.link || child.url];
        if (paths.some((path) => path && matchPath({ path, end: true }, pathname))) {
          setSelectedID(parentId);
        }
      });
    },
    [pathname, setSelectedID]
  );

  //  On-load selection
  useEffect(() => {
    const children = currentItem.children ?? [];
    children.forEach((child) => {
      if (child.children?.length) findMatchingChild(child.children, currentItem.id);
      const paths = child.activeUrls || [child.link || child.url];
      if (paths.some((path) => path && matchPath({ path, end: true }, pathname))) {
        setSelectedID(currentItem.id);
      }
    });
  }, [pathname, currentItem, findMatchingChild, setSelectedID]);

  useEffect(() => {
    if (hasActivePath(currentItem, pathname)) setGroupOpen(true);
  }, [currentItem, pathname]);

  //  Memoized children render
  const navCollapse = useMemo(() => {
    if (!currentItem.children) return null;

    return currentItem.children.map((menuItem, index) => {
      const key = menuItem.id || `${menuItem.type}-${index}`;
      const findMenu = masterMenu.includes(menuItem.id);

      switch (menuItem.type) {
        case 'collapse':
          return (
            <NavCollapse
              key={key}
              menu={menuItem}
              setSelectedItems={setSelectedItems}
              setSelectedLevel={setSelectedLevel}
              selectedLevel={selectedLevel}
              selectedItems={selectedItems}
              level={1}
              parentId={currentItem.id}
            />
          );
        case 'item':
          if (findMenu && menuItem.id) {
            return <NavItem key={key} item={menuItem} level={1} />;
          } else {
            return null;
          }
        default:
          return (
            <h6 key={`fix-${index}`} className="align-center text-danger">
              Fix - Group Collapse or Items
            </h6>
          );
      }
    });
  }, [currentItem, masterMenu, selectedItems, selectedLevel, setSelectedItems, setSelectedLevel]);

  const hasAllowedChild = (item) => {
    if (!item.children?.length) return masterMenu.includes(item.id);

    return item.children.some((child) => hasAllowedChild(child));
  };

  const findGroupLabel = (item) => {
    const findMenu = hasAllowedChild(item);
    if (findMenu) {
      return item.label;
    } else {
      return null;
    }
  };

  const groupLabel = findGroupLabel(item);
  const isDashboardGroup = item.id === 'dashboard' || item.id?.endsWith('-dashboard');

  return (
    <Fragment>
      {groupLabel && !isDashboardGroup && (
        <li className={`pc-item pc-caption sm-sidebar-group-toggle ${groupOpen ? 'is-open' : ''}`} key={item.id}>
          <button
            type="button"
            onClick={() => setGroupOpen((open) => !open)}
            aria-expanded={groupOpen}
            aria-controls={`sidebar-group-${item.id}`}
          >
            <span className="sm-sidebar-group-arrow" aria-hidden="true" />
            <span>{groupLabel}</span>
          </button>
        </li>
      )}
      <Collapse in={Boolean(groupLabel && (isDashboardGroup || groupOpen))}>
        <div className={`sm-sidebar-group-items ${isDashboardGroup ? '' : 'is-indented'}`} id={`sidebar-group-${item.id}`}>
          {navCollapse}
        </div>
      </Collapse>
    </Fragment>
  );
}
