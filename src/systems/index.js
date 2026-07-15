import customerPortalMenu from './customer-portal/menu';
import expeditionMenu from './expedition/menu';
import pickingListMenu from './picking-list/menu';
import productionMenu from './production/menu';

export const SYSTEM_KEYS = {
  CUSTOMER_PORTAL: 'customer-portal',
  EXPEDITION: 'expedition',
  PICKING_LIST: 'picking-list',
  PRODUCTION: 'production'
};

export const systems = [
  {
    key: SYSTEM_KEYS.CUSTOMER_PORTAL,
    title: 'Customer Portal',
    description: 'Orders, master data, rewards, and customer portal settings.',
    icon: 'ti ti-building-store',
    basePath: '/customer-portal',
    defaultPath: '/customer-portal/dashboard',
    menu: customerPortalMenu
  },
  {
    key: SYSTEM_KEYS.EXPEDITION,
    title: 'Expedition',
    description: 'Shipping operations and expedition monitoring.',
    icon: 'ti ti-truck-delivery',
    basePath: '/expedition',
    defaultPath: '/expedition/dashboard',
    menu: expeditionMenu
  },
  {
    key: SYSTEM_KEYS.PICKING_LIST,
    title: 'Picking List',
    description: 'Warehouse picking tasks, rules, and fulfillment monitoring.',
    icon: 'ti ti-clipboard-list',
    basePath: '/picking-list',
    defaultPath: '/picking-list/dashboard',
    menu: pickingListMenu
  },
  {
    key: SYSTEM_KEYS.PRODUCTION,
    title: 'Production',
    description: 'Production planning, work orders, and output monitoring.',
    icon: 'ti ti-building-factory-2',
    basePath: '/production',
    defaultPath: '/production/dashboard',
    menu: productionMenu
  }
];

const adminRoleId = 5;
const systemAccessAliases = {
  distributor: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer-portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  customer_portal: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  customerportal: SYSTEM_KEYS.CUSTOMER_PORTAL,
  ekspedisi: SYSTEM_KEYS.EXPEDITION,
  expedition: SYSTEM_KEYS.EXPEDITION,
  pickinglist: SYSTEM_KEYS.PICKING_LIST,
  picking_list: SYSTEM_KEYS.PICKING_LIST,
  'picking-list': SYSTEM_KEYS.PICKING_LIST,
  'picking list': SYSTEM_KEYS.PICKING_LIST,
  production: SYSTEM_KEYS.PRODUCTION,
  produksi: SYSTEM_KEYS.PRODUCTION,
  manufacturing: SYSTEM_KEYS.PRODUCTION
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
