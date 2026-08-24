import customerPortalMenu from './customer-portal/menu';
import enterpriseMenu from './corporate/menu';
import expeditionMenu from './expedition/menu';
import pickingListMenu from './picking-list/menu';
import productionMenu from './production/menu';
import { matchPath } from 'react-router-dom';

export const SYSTEM_KEYS = {
  CUSTOMER_PORTAL: 'customer-portal',
  ENTERPRISE: 'enterprise',
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
    key: SYSTEM_KEYS.ENTERPRISE,
    title: 'Corporate',
    description: 'Integrated purchasing, procurement, and corporate budgeting workflows.',
    icon: 'ti ti-building-skyscraper',
    basePath: '/corporate',
    defaultPath: '/corporate/purchasing/request',
    menu: enterpriseMenu
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

const menuNumberByKey = (() => {
  const numbers = new Map();
  let number = 1;

  const registerMenus = (menuItems, systemKey) => {
    menuItems.forEach((item) => {
      const menuKey = number++;
      numbers.set(`${systemKey}:${item.id || item.value}`, menuKey);
      item.menu_key = menuKey;
      item.menuKey = menuKey;
      if (item.children?.length) registerMenus(item.children, systemKey);
    });
  };

  systems.forEach((system) => {
    const menuKey = number++;
    numbers.set(system.key, menuKey);
    system.menu_key = menuKey;
    system.menuKey = menuKey;
    registerMenus(system.menu, system.key);
  });

  return numbers;
})();

export const getMenuNumber = (systemKey, menuId) => menuNumberByKey.get(menuId ? `${systemKey}:${menuId}` : systemKey);

const adminRoleId = 5;
const systemAccessAliases = {
  distributor: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer-portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  customer_portal: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  customerportal: SYSTEM_KEYS.CUSTOMER_PORTAL,
  enterprise: SYSTEM_KEYS.ENTERPRISE,
  entrerprise: SYSTEM_KEYS.ENTERPRISE,
  erp: SYSTEM_KEYS.ENTERPRISE,
  purchasing: SYSTEM_KEYS.ENTERPRISE,
  procurement: SYSTEM_KEYS.ENTERPRISE,
  pembelian: SYSTEM_KEYS.ENTERPRISE,
  ekspedisi: SYSTEM_KEYS.EXPEDITION,
  expedition: SYSTEM_KEYS.EXPEDITION,
  pickinglist: SYSTEM_KEYS.PICKING_LIST,
  picking_list: SYSTEM_KEYS.PICKING_LIST,
  'picking-list': SYSTEM_KEYS.PICKING_LIST,
  'picking list': SYSTEM_KEYS.PICKING_LIST,
  production: SYSTEM_KEYS.PRODUCTION,
  produksi: SYSTEM_KEYS.PRODUCTION,
  manufacturing: SYSTEM_KEYS.PRODUCTION,
  support: SYSTEM_KEYS.ENTERPRISE,
  helpdesk: SYSTEM_KEYS.ENTERPRISE,
  'help-desk': SYSTEM_KEYS.ENTERPRISE,
  'support center': SYSTEM_KEYS.ENTERPRISE
};

const flattenMenuIds = (menuItems = []) =>
  menuItems.flatMap((item) => [item.id, ...(item.children?.length ? flattenMenuIds(item.children) : [])]).filter(Boolean);

const flattenMenuItems = (menuItems = []) =>
  menuItems.flatMap((item) => [item, ...(item.children?.length ? flattenMenuItems(item.children) : [])]);

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

export const getMenuItemByPathname = (system, pathname = '') => {
  if (!system?.menu) return null;

  return (
    flattenMenuItems(system.menu).find((item) => {
      if (item.type !== 'item') return false;

      const paths = item.activeUrls || [item.link || item.url];
      return paths.some((path) => path && matchPath({ path, end: true }, pathname));
    }) || null
  );
};

export const canAccessMenuItem = (menuItem, permissionMenu = [], roleId) => {
  if (isAdministratorRole(roleId)) return true;
  if (!menuItem?.id) return false;

  return normalizePermissionMenu(permissionMenu).includes(menuItem.id);
};

export const getAccessibleMenuItems = (system, permissionMenu = [], roleId) => {
  if (!system?.menu) return [];

  return flattenMenuItems(system.menu).filter(
    (item) => item.type === 'item' && item.url && canAccessMenuItem(item, permissionMenu, roleId)
  );
};

export const getFirstAccessibleMenuPath = (system, permissionMenu = [], roleId) =>
  getAccessibleMenuItems(system, permissionMenu, roleId)[0]?.url || null;

export const canAccessSystem = (system, permissionMenu = [], roleId) => {
  if (isAdministratorRole(roleId)) return true;

  const allowedMenu = normalizePermissionMenu(permissionMenu);
  const systemMenuIds = flattenMenuIds(system.menu);

  return (
    allowedMenu.includes(system.key) ||
    allowedMenu.includes(`${system.key}:access`) ||
    systemMenuIds.some((menuId) => allowedMenu.includes(menuId))
  );
};

export const getAvailableSystems = (permissionMenu = [], roleId) =>
  systems.filter((system) => canAccessSystem(system, permissionMenu, roleId));

export const getFirstAccessibleSystem = (permissionMenu = [], roleId) => getAvailableSystems(permissionMenu, roleId)[0] || systems[0];

export const getSystemMenu = (systemKey) => getSystemByKey(systemKey).menu;

export const getSystemLabel = (pathname = '') => getSystemByPathname(pathname)?.title || 'sm-connect';
