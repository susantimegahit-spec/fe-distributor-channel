import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { canUseAction, detectElementAction } from '../utils/actionPermissions';
import { getMenuItemByPathname, getSystemByPathname, isAdministratorRole } from '../systems';
import { getCookies } from '../utils/cookies';
import './action-permission-guard.scss';

const ACTION_ELEMENT_SELECTOR = 'button, a[href], [role="button"], .dropdown-item';
const HIDDEN_CLASS = 'action-permission-hidden';

export default function ActionPermissionGuard() {
  const { pathname } = useLocation();

  useEffect(() => {
    const system = getSystemByPathname(pathname);
    const menuItem = system ? getMenuItemByPathname(system, pathname) : null;
    const roleId = getCookies('role');
    const actionsCookie = getCookies('actions');
    const isAdministratorSetting =
      isAdministratorRole(roleId) &&
      (pathname === '/setting' || pathname.startsWith('/setting/') || pathname.startsWith('/customer-portal/setting'));

    const applyPermissions = (root = document) => {
      const elements = [];
      if (root instanceof Element && root.matches(ACTION_ELEMENT_SELECTOR)) elements.push(root);
      elements.push(...root.querySelectorAll(ACTION_ELEMENT_SELECTOR));

      elements.forEach((element) => {
        if (!element.closest('.pc-content, .sm-workspace-embedded-content, .modal, .offcanvas, .dropdown-menu')) return;
        const action = detectElementAction(element);
        if (!action) {
          element.classList.remove(HIDDEN_CLASS);
          element.removeAttribute('aria-hidden');
          return;
        }

        const allowed = isAdministratorSetting || canUseAction({ action, system, menuItem, pathname, roleId, actionsCookie });
        element.classList.toggle(HIDDEN_CLASS, !allowed);
        element.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      });
    };

    applyPermissions();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => node instanceof Element && applyPermissions(node)));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((element) => element.classList.remove(HIDDEN_CLASS));
    };
  }, [pathname]);

  return null;
}
