import { normalizeLogisticsPermission, normalizeLogisticsPath } from './logisticsMigration';
import { getMenuNumber } from '../systems';
import { getCookies } from './cookies';
import actionRegistry from '../data-action.json';

const actionMenuKeys = new Map(actionRegistry.menus.map((menu) => [menu.menu_id, menu.menu_key]));
const getRegisteredMenuKey = (menuId) => actionMenuKeys.get(menuId);

export const ACTION_ALIASES = {
  add: 'create',
  create: 'create',
  upload: 'create',
  edit: 'update',
  update: 'update',
  delete: 'delete',
  remove: 'delete',
  view: 'read',
  read: 'read',
  detail: 'read',
  approve: 'approve',
  reject: 'approve',
  download: 'export',
  export: 'export',
  sync: 'sync',
  synchronize: 'sync',
  'shipping-schedule': 'shipping-schedule'
};

const normalizeKey = (value) =>
  normalizeLogisticsPermission(
    normalizeLogisticsPath(
      String(value ?? '')
        .trim()
        .toLowerCase()
    )
  )
    .replaceAll('_', '-')
    .replace(/[^a-z0-9-]/g, '');

const normalizeEntries = (rawActions) => {
  if (typeof rawActions === 'string') {
    try {
      return normalizeEntries(JSON.parse(rawActions));
    } catch {
      return [];
    }
  }
  if (Array.isArray(rawActions)) return rawActions;
  if (!rawActions || typeof rawActions !== 'object') return [];
  if (
    rawActions.menu_key !== undefined ||
    rawActions.menuKey !== undefined ||
    rawActions.menu_id !== undefined ||
    rawActions.menuId !== undefined
  ) {
    return [rawActions];
  }

  const nestedEntries = [
    rawActions.actions,
    rawActions.action_assignments,
    rawActions.actionAssignments,
    rawActions.action_permissions,
    rawActions.actionPermissions,
    rawActions.menu_actions,
    rawActions.menuActions,
    rawActions.permissions_list,
    rawActions.permissionsList,
    rawActions.permissions,
    rawActions.data
  ]
    .filter((value) => value && value !== rawActions)
    .flatMap(normalizeEntries);
  if (nestedEntries.length) return nestedEntries;

  return Object.entries(rawActions).map(([menuKey, actions]) => ({ menu_key: menuKey, actions }));
};

const getEntryKey = (entry) =>
  entry?.menu_key ??
  entry?.menuKey ??
  entry?.menu_id ??
  entry?.menuId ??
  entry?.menu?.menu_key ??
  entry?.menu?.menuKey ??
  entry?.menu?.id ??
  entry?.id ??
  entry?.value ??
  entry?.key;

const getEntryActions = (entry) => entry?.actions ?? entry?.action ?? entry?.permissions ?? entry;

const normalizeWidgetEntries = (rawActions) => {
  if (typeof rawActions === 'string') {
    try {
      return normalizeWidgetEntries(JSON.parse(rawActions));
    } catch {
      return [];
    }
  }
  if (Array.isArray(rawActions)) return rawActions;
  if (!rawActions || typeof rawActions !== 'object') return [];
  const source = rawActions.widget ?? rawActions.widgets ?? rawActions.widget_actions ?? rawActions.widgetActions ?? rawActions;
  if (source !== rawActions) return normalizeWidgetEntries(source);
  if (source.widget_key !== undefined || source.widgetKey !== undefined) return [source];
  return Object.entries(source).map(([widgetKey, actions]) => ({ widget_key: widgetKey, actions }));
};

const getWidgetEntryKey = (entry) =>
  entry?.widget_key ??
  entry?.widgetKey ??
  entry?.widget_id ??
  entry?.widgetId ??
  entry?.menu_key ??
  entry?.menuKey ??
  entry?.id ??
  entry?.key;

const ACTION_KEYS = {
  create: ['create', 'add', 'upload'],
  read: ['read', 'view', 'detail'],
  update: ['update', 'edit'],
  delete: ['delete', 'remove'],
  approve: ['approve'],
  export: ['export', 'download'],
  sync: ['sync', 'synchronize']
};

const ACTION_BITS = {
  create: 1,
  read: 2,
  update: 4,
  delete: 8,
  approve: 16,
  export: 32,
  sync: 64,
  'shipping-schedule': 128,
  add: 256,
  upload: 512
};

const ROW_ACTION_KEYS = ['read', 'view', 'detail', 'update', 'edit', 'delete', 'remove', 'approve', 'export', 'download'];

const isAllowedValue = (value) => {
  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true') return true;
  if (!value || typeof value !== 'object') return false;

  return [value.allowed, value.enabled, value.active, value.granted, value.value].some(
    (item) => item === true || item === 1 || item === '1' || String(item).toLowerCase() === 'true'
  );
};

const getActionValue = (actions, action) => {
  if (typeof actions === 'number') {
    if (action === 'actions')
      return Boolean(actions & (ACTION_BITS.read | ACTION_BITS.update | ACTION_BITS.delete | ACTION_BITS.approve | ACTION_BITS.export));
    return Boolean(actions & (ACTION_BITS[action] || 0));
  }

  if (typeof actions === 'string') {
    try {
      return getActionValue(JSON.parse(actions), action);
    } catch {
      return (ACTION_KEYS[action] || [action]).includes(normalizeKey(actions));
    }
  }

  if (action === 'actions') {
    if (Array.isArray(actions))
      return actions.some((value) =>
        typeof value === 'object'
          ? ROW_ACTION_KEYS.includes(normalizeKey(value.action || value.name || value.key)) &&
            isAllowedValue(value.allowed ?? value.enabled ?? true)
          : ROW_ACTION_KEYS.includes(normalizeKey(value))
      );
    if (!actions || typeof actions !== 'object') return false;
    return ROW_ACTION_KEYS.some((key) => {
      const value = actions[key];
      return isAllowedValue(value);
    });
  }

  const acceptedKeys = ACTION_KEYS[action] || [action];
  if (Array.isArray(actions))
    return actions.some((value) => {
      if (typeof value !== 'object') return acceptedKeys.includes(normalizeKey(value));
      const actionName = value.action || value.action_name || value.actionName || value.name || value.key;
      return acceptedKeys.includes(normalizeKey(actionName)) && isAllowedValue(value.allowed ?? value.enabled ?? value.active ?? true);
    });
  if (!actions || typeof actions !== 'object') return false;

  return acceptedKeys.some((key) => {
    const value = actions[key];
    return isAllowedValue(value);
  });
};

export const compactActionsForCookie = (rawActions) =>
  normalizeEntries(rawActions).reduce((result, entry) => {
    const menuKey = getEntryKey(entry);
    if (menuKey === undefined || menuKey === null || menuKey === '') return result;

    const actions = getEntryActions(entry);
    const mask = Object.entries(ACTION_BITS).reduce((value, [action, bit]) => (getActionValue(actions, action) ? value | bit : value), 0);
    result[String(menuKey)] = mask;
    return result;
  }, {});

export const compactWidgetActionsForCookie = (rawActions) =>
  normalizeWidgetEntries(rawActions).reduce((result, entry) => {
    const widgetKey = getWidgetEntryKey(entry);
    if (widgetKey === undefined || widgetKey === null || widgetKey === '') return result;
    const actions = getEntryActions(entry);
    result[String(widgetKey)] = Object.keys(ACTION_KEYS).filter((action) => getActionValue(actions, action));
    return result;
  }, {});

const getMenuCandidates = (system, menuItem, pathname = '') => {
  const pathParts = pathname.split('/').filter(Boolean);
  const registeredMenuKey = getRegisteredMenuKey(menuItem?.id);
  const candidates = [
    menuItem?.id,
    menuItem?.value,
    menuItem?.url,
    registeredMenuKey ?? menuItem?.menu_key,
    registeredMenuKey ?? menuItem?.menuKey,
    !registeredMenuKey && system?.key && menuItem?.id ? getMenuNumber(system.key, menuItem.id) : null,
    ...pathParts,
    pathParts.slice(-2).join('-'),
    pathParts.slice(-3).join('-')
  ];

  return new Set(candidates.filter((value) => value !== undefined && value !== null && value !== '').map(normalizeKey));
};

export const canUseAction = ({ action, system, menuItem, menuKey, pathname = '', actionsCookie } = {}) => {
  const requestedAction = normalizeKey(action);
  const normalizedAction = ['add', 'upload'].includes(requestedAction) ? requestedAction : ACTION_ALIASES[requestedAction] || requestedAction;
  if (!normalizedAction) return false;

  const candidates = getMenuCandidates(system, menuItem, pathname);
  const entries = normalizeEntries(actionsCookie ?? getCookies('actions'));
  const suppliedMenuKeys = (Array.isArray(menuKey) ? menuKey : String(menuKey ?? '').split(','))
    .map((value) => String(value).trim())
    .filter(Boolean);
  const resolvedMenuKeys = suppliedMenuKeys.flatMap((value) => [
    value,
    getRegisteredMenuKey(value) ?? (system?.key ? getMenuNumber(system.key, value) : null)
  ]);
  const registeredMenuKey = getRegisteredMenuKey(menuItem?.id);
  const exactMenuKeys = [...resolvedMenuKeys, registeredMenuKey ?? menuItem?.menu_key, registeredMenuKey ?? menuItem?.menuKey]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(normalizeKey);
  const exactEntries = entries.filter((entry) => exactMenuKeys.includes(normalizeKey(getEntryKey(entry))));
  if (exactEntries.length) {
    return exactEntries.some((entry) => {
      const actions = getEntryActions(entry);
      if (['add', 'upload'].includes(normalizedAction) && typeof actions === 'number' && !(actions & (ACTION_BITS.add | ACTION_BITS.upload))) {
        return getActionValue(actions, 'create');
      }
      return getActionValue(actions, normalizedAction);
    });
  }

  const matchedEntry = entries.find((entry) => candidates.has(normalizeKey(getEntryKey(entry))));
  if (!matchedEntry) return false;
  const actions = getEntryActions(matchedEntry);
  if (['add', 'upload'].includes(normalizedAction) && typeof actions === 'number' && !(actions & (ACTION_BITS.add | ACTION_BITS.upload))) {
    return getActionValue(actions, 'create');
  }
  return getActionValue(actions, normalizedAction);
};

export const canUseMenuAction = (menuKey, action, actionsCookie = getCookies('actions')) =>
  (Array.isArray(menuKey) ? menuKey : [menuKey]).some((key) => canUseAction({ menuKey: key, action, actionsCookie }));

export const canUseWidgetAction = (widgetKey, action, actionsCookie = getCookies('widget_actions')) => {
  const normalizedAction = ACTION_ALIASES[normalizeKey(action)] || normalizeKey(action);
  const entry = normalizeWidgetEntries(actionsCookie).find((item) => normalizeKey(getWidgetEntryKey(item)) === normalizeKey(widgetKey));
  return entry ? getActionValue(getEntryActions(entry), normalizedAction) : false;
};

export const getUrlAction = (pathname = '') => {
  const parts = pathname.toLowerCase().split('/').filter(Boolean);

  if (parts.some((part) => ['edit', 'update'].includes(part))) return 'update';
  if (parts.some((part) => ['add', 'create', 'new', 'upload'].includes(part))) return 'create';
  if (parts.some((part) => ['download', 'export'].includes(part))) return 'export';
  if (parts.some((part) => ['view', 'detail'].includes(part))) return 'read';

  return null;
};

export const detectElementAction = (element) => {
  const explicitAction = element.dataset.permissionAction || element.dataset.action;
  if (['none', 'ignore', 'utility'].includes(normalizeKey(explicitAction))) return null;
  if (['add', 'upload'].includes(normalizeKey(explicitAction))) return normalizeKey(explicitAction);
  if (explicitAction && ACTION_ALIASES[normalizeKey(explicitAction)]) return ACTION_ALIASES[normalizeKey(explicitAction)];

  const href = element.getAttribute('href') || '';
  const iconClasses = [...element.querySelectorAll('i, svg')].map((icon) => icon.getAttribute('class') || '').join(' ');
  const description = [element.textContent, element.getAttribute('aria-label'), element.getAttribute('title'), href, iconClasses]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(delete|remove|hapus)\b|ti-trash/.test(description)) return 'delete';
  if (/\b(shipping schedule)\b/.test(description)) return 'shipping-schedule';
  if (/\b(sync|synchronize|refresh)\b|ti-refresh/.test(description)) return 'sync';
  if (/\b(download|export|unduh)\b|ti-download|ti-file-export/.test(description)) return 'export';
  if (/\b(upload|unggah|import)\b|ti-upload|ti-file-import/.test(description)) return 'upload';
  if (/\b(edit|update|ubah)\b|ti-edit|ti-pencil/.test(description)) return 'update';
  if (/\b(view|detail|preview|lihat)\b|ti-eye/.test(description)) return 'read';
  if (/\b(add|create|new|tambah)\b|ti-plus/.test(description)) return 'add';
  if (/\bactions?\b|ti-dots-vertical/.test(description)) return 'actions';

  return null;
};

export const detectWidgetElementAction = (element) => {
  const permissionAction = normalizeKey(element.dataset.permissionAction || element.dataset.action);
  if (['none', 'ignore', 'utility'].includes(permissionAction)) return null;
  const explicitAction = element.dataset.widgetAction;
  if (explicitAction) return ACTION_ALIASES[normalizeKey(explicitAction)] || normalizeKey(explicitAction);
  if (permissionAction) return ACTION_ALIASES[permissionAction] || permissionAction;

  const iconClasses = [...element.querySelectorAll('i, svg')].map((icon) => icon.getAttribute('class') || '').join(' ');
  const description = [element.textContent, element.getAttribute('aria-label'), element.getAttribute('title'), iconClasses, element.className]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(refresh|sync|synchronize)\b|ti-refresh/.test(description)) return 'sync';
  if (/\b(approve|reject|reschedule|verify|revision)\b|ti-checks?|ti-circle-check/.test(description)) return 'approve';
  if (/\b(view|detail|preview|expand|negotiation)\b|vendor-company-link|ti-eye/.test(description)) return 'read';
  return detectElementAction(element);
};
