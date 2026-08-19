import { getMenuNumber } from '../systems';
import { getCookies } from './cookies';

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
  download: 'export',
  export: 'export'
};

const normalizeKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .replace(/[^a-z0-9-]/g, '');

const normalizeEntries = (rawActions) => {
  if (Array.isArray(rawActions)) return rawActions;
  if (!rawActions || typeof rawActions !== 'object') return [];

  return Object.entries(rawActions).map(([menuKey, actions]) => ({ menu_key: menuKey, actions }));
};

const getEntryKey = (entry) =>
  entry?.menu_key ?? entry?.menuKey ?? entry?.menu_id ?? entry?.menuId ?? entry?.id ?? entry?.value ?? entry?.key;

const getEntryActions = (entry) => entry?.actions ?? entry?.action ?? entry?.permissions ?? entry;

const ACTION_KEYS = {
  create: ['create', 'add', 'upload'],
  read: ['read', 'view', 'detail'],
  update: ['update', 'edit'],
  delete: ['delete', 'remove'],
  approve: ['approve'],
  export: ['export', 'download']
};

const ROW_ACTION_KEYS = ['read', 'view', 'detail', 'update', 'edit', 'delete', 'remove', 'approve', 'export', 'download'];

const getActionValue = (actions, action) => {
  if (action === 'actions') {
    if (Array.isArray(actions)) return actions.map(normalizeKey).some((value) => ROW_ACTION_KEYS.includes(value));
    if (!actions || typeof actions !== 'object') return false;
    return ROW_ACTION_KEYS.some((key) => {
      const value = actions[key];
      return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
    });
  }

  const acceptedKeys = ACTION_KEYS[action] || [action];
  if (Array.isArray(actions)) return actions.map(normalizeKey).some((value) => acceptedKeys.includes(value));
  if (!actions || typeof actions !== 'object') return false;

  return acceptedKeys.some((key) => {
    const value = actions[key];
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  });
};

const getMenuCandidates = (system, menuItem, pathname = '') => {
  const pathParts = pathname.split('/').filter(Boolean);
  const candidates = [
    menuItem?.id,
    menuItem?.value,
    menuItem?.url,
    menuItem?.menu_key,
    menuItem?.menuKey,
    system?.key && menuItem?.id ? getMenuNumber(system.key, menuItem.id) : null,
    ...pathParts,
    pathParts.slice(-2).join('-'),
    pathParts.slice(-3).join('-')
  ];

  return new Set(candidates.filter((value) => value !== undefined && value !== null && value !== '').map(normalizeKey));
};

export const canUseAction = ({ action, system, menuItem, pathname = '', actionsCookie } = {}) => {
  const normalizedAction = ACTION_ALIASES[normalizeKey(action)] || normalizeKey(action);
  if (!normalizedAction) return false;

  const candidates = getMenuCandidates(system, menuItem, pathname);
  const entries = normalizeEntries(actionsCookie ?? getCookies('actions'));
  const matchedEntry = entries.find((entry) => candidates.has(normalizeKey(getEntryKey(entry))));

  return matchedEntry ? getActionValue(getEntryActions(matchedEntry), normalizedAction) : false;
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
  if (explicitAction && ACTION_ALIASES[normalizeKey(explicitAction)]) return ACTION_ALIASES[normalizeKey(explicitAction)];

  const href = element.getAttribute('href') || '';
  const iconClasses = [...element.querySelectorAll('i, svg')].map((icon) => icon.getAttribute('class') || '').join(' ');
  const description = [element.textContent, element.getAttribute('aria-label'), element.getAttribute('title'), href, iconClasses]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(delete|remove|hapus)\b|ti-trash/.test(description)) return 'delete';
  if (/\b(download|export|unduh)\b|ti-download|ti-file-export/.test(description)) return 'export';
  if (/\b(upload|unggah|import)\b|ti-upload|ti-file-import/.test(description)) return 'create';
  if (/\b(edit|update|ubah)\b|ti-edit|ti-pencil/.test(description)) return 'update';
  if (/\b(view|detail|preview|lihat)\b|ti-eye/.test(description)) return 'read';
  if (/\b(add|create|new|tambah)\b|ti-plus/.test(description)) return 'create';
  if (/\bactions?\b|ti-dots-vertical/.test(description)) return 'actions';

  return null;
};
