const PAGE_TITLES = {
  '/': 'Login',
  '/systems': 'Systems',
  '/access-denied': 'Access Denied',
  '/notifications': 'Notifications',
  '/setting': 'Settings',
  '/customer-portal/setting': 'Settings',
  '/maintenance': 'Maintenance'
};

const toTitleCase = (value = '') => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export const getModuleTitle = ({ pathname = '/', menuTitle, systemTitle } = {}) => {
  if (menuTitle) return menuTitle;
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/setting/') || pathname.startsWith('/customer-portal/setting/')) return 'Settings';
  if (/^\/(400|401|403|404|408|429|500|502|503|504)$/.test(pathname)) return 'Error';
  if (systemTitle) return systemTitle;

  const lastSegment = pathname.split('/').filter(Boolean).at(-1);
  return lastSegment ? toTitleCase(lastSegment) : 'Login';
};

export const setDocumentTitle = (options) => {
  const moduleTitle = getModuleTitle(options);
  document.title = `Smesta | ${moduleTitle}`;
};
