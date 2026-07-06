import customerPortalMenu from './customer-portal/menu';
import ekspedisiMenu from './ekspedisi/menu';

export const SYSTEM_KEYS = {
  CUSTOMER_PORTAL: 'customer-portal',
  EKSPEDISI: 'ekspedisi'
};

export const systems = [
  {
    key: SYSTEM_KEYS.CUSTOMER_PORTAL,
    title: 'Customer Portal',
    description: 'Order, master data, reward, dan pengaturan customer portal.',
    icon: 'ti ti-building-store',
    basePath: '/customer-portal',
    defaultPath: '/customer-portal/dashboard',
    menu: customerPortalMenu
  },
  {
    key: SYSTEM_KEYS.EKSPEDISI,
    title: 'Ekspedisi',
    description: 'Operasional pengiriman dan monitoring ekspedisi.',
    icon: 'ti ti-truck-delivery',
    basePath: '/ekspedisi',
    defaultPath: '/ekspedisi/dashboard',
    menu: ekspedisiMenu
  }
];

const adminRoleId = 5;
const systemAccessAliases = {
  distributor: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer-portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  customer_portal: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  customerportal: SYSTEM_KEYS.CUSTOMER_PORTAL,
  ekspedisi: SYSTEM_KEYS.EKSPEDISI,
  expedition: SYSTEM_KEYS.EKSPEDISI
};

const flattenMenuIds = (menuItems = []) =>
  menuItems.flatMap((item) => [item.id, ...(item.children?.length ? flattenMenuIds(item.children) : [])]).filter(Boolean);

export const normalizePermissionMenu = (menu = []) => {
  if (!Array.isArray(menu)) return [];

  return menu
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.id || item?.value || item?.menu_id || item?.menuId;
    })
    .filter(Boolean);
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== '');
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

const getSystemAccessValue = (item) => {
  if (typeof item === 'string') return item;

  return item?.key || item?.value || item?.system || item?.system_key || item?.systemKey || item?.name || item?.title || '';
};

export const normalizeAccessibleSystems = (value) => {
  let accessibleSystems = normalizeArray(value);

  if (typeof value === 'string') {
    try {
      const parsedValue = JSON.parse(value);

      accessibleSystems = Array.isArray(parsedValue) ? parsedValue : normalizeArray(parsedValue);
    } catch {
      accessibleSystems = value.split(',');
    }
  }

  const normalized = [
    ...new Set(
      accessibleSystems
        .map((item) => String(getSystemAccessValue(item)).trim().toLowerCase())
        .filter(Boolean)
        .flatMap((item) => (['all', '*'].includes(item) ? systems.map((system) => system.key) : [systemAccessAliases[item] || item]))
        .filter((item) => systems.some((system) => system.key === item))
    )
  ];

  return normalized;
};

export const isAdministratorRole = (roleId) => Number(roleId) === adminRoleId;

export const getSystemByKey = (key) => systems.find((system) => system.key === key) || systems[0];

export const getSystemByPathname = (pathname = '') => systems.find((system) => pathname.startsWith(system.basePath)) || null;

export const getActiveSystem = (pathname = '') => getSystemByPathname(pathname) || systems[0];

export const canAccessSystem = (system, permissionMenu = [], roleId) => {
  if (isAdministratorRole(roleId)) return true;

  const allowedMenu = normalizePermissionMenu(permissionMenu);
  const systemMenuIds = flattenMenuIds(system.menu);

  return allowedMenu.includes(system.key) || allowedMenu.includes(`${system.key}:access`) || systemMenuIds.some((menuId) => allowedMenu.includes(menuId));
};

export const getAvailableSystems = (permissionMenu = [], roleId) =>
  systems.filter((system) => canAccessSystem(system, permissionMenu, roleId));

export const getFirstAccessibleSystem = (permissionMenu = [], roleId) => getAvailableSystems(permissionMenu, roleId)[0] || systems[0];

export const getSystemMenu = (systemKey) => getSystemByKey(systemKey).menu;

export const getSystemLabel = (pathname = '') => getSystemByPathname(pathname)?.title || 'sm-connect';
