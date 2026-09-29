import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { canUseAction, canUseWidgetAction, detectElementAction, detectWidgetElementAction } from '../utils/actionPermissions';
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
    const widgetActionsCookie = getCookies('widget_actions');
    const hasWidgetActionAssignments =
      widgetActionsCookie && typeof widgetActionsCookie === 'object'
        ? Object.keys(widgetActionsCookie).length > 0
        : widgetActionsCookie !== undefined && widgetActionsCookie !== null && widgetActionsCookie !== '';
    const isAdministratorSetting =
      isAdministratorRole(roleId) &&
      (pathname === '/setting' ||
        pathname.startsWith('/setting/') ||
        pathname === '/system-setting' ||
        pathname.startsWith('/system-setting/') ||
        pathname.startsWith('/customer-portal/setting') ||
        pathname === '/dashboard-builder');

    const applyPermissions = (root = document) => {
      const elements = [];
      if (root instanceof Element && root.matches(ACTION_ELEMENT_SELECTOR)) elements.push(root);
      elements.push(...root.querySelectorAll(ACTION_ELEMENT_SELECTOR));

      elements.forEach((element) => {
        if (!element.closest('.pc-content, .sm-workspace-embedded-content, .modal, .offcanvas, .dropdown-menu')) return;
        const widgetRoot = element.closest('[data-widget-key]');
        const widgetKey = widgetRoot?.dataset.widgetKey;
        const action = widgetKey ? detectWidgetElementAction(element) : detectElementAction(element);
        if (!action) {
          element.classList.remove(HIDDEN_CLASS);
          element.removeAttribute('aria-hidden');
          return;
        }

        const allowed =
          isAdministratorSetting ||
          (widgetKey
            ? !hasWidgetActionAssignments || canUseWidgetAction(widgetKey, action, widgetActionsCookie)
            : canUseAction({
                action,
                system,
                menuItem,
                menuKey: element.dataset.permissionMenuKey,
                pathname,
                roleId,
                actionsCookie
              }));
        element.classList.toggle(HIDDEN_CLASS, !allowed);
        element.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      });
    };

    applyPermissions();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          applyPermissions(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => node instanceof Element && applyPermissions(node));
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-permission-action', 'data-permission-menu-key', 'data-widget-action', 'data-widget-key']
    });

    return () => {
      observer.disconnect();
      document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((element) => element.classList.remove(HIDDEN_CLASS));
    };
  }, [pathname]);

  return null;
}
