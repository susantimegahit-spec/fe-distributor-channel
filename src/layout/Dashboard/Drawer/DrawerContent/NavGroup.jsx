import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// project-imports
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import { getCookies } from '../../../../utils/cookies';
import { isAdministratorRole, normalizePermissionMenu } from '../../../../systems';

// ==============================|| NAVIGATION - GROUP ||============================== //

export default function NavGroup(props) {
  const { item, lastItem, remItems, lastItemId, setSelectedID, setSelectedItems, selectedItems, setSelectedLevel, selectedLevel } = props;
  const masterMenu = normalizePermissionMenu(getCookies('menu') || []);
  const isAdministrator = isAdministratorRole(getCookies('role'));
  const { pathname } = useLocation();
  const [currentItem, setCurrentItem] = useState(item);

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

  //  Memoized children render
  const navCollapse = useMemo(() => {
    if (!currentItem.children) return null;

    return currentItem.children.map((menuItem, index) => {
      const key = menuItem.id || `${menuItem.type}-${index}`;
      const findMenu = isAdministrator || masterMenu.includes(menuItem.id);

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
  }, [currentItem, isAdministrator, masterMenu, selectedItems, selectedLevel, setSelectedItems, setSelectedLevel]);

  const hasAllowedChild = (item) => {
    if (isAdministrator) return true;
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

  return (
    <Fragment>
      {groupLabel && (
        <li className="pc-item pc-caption" key={item.id}>
          <label>{groupLabel}</label>
        </li>
      )}
      {navCollapse}
    </Fragment>
  );
}
