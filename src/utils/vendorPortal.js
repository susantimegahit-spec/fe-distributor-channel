import Cookies from 'js-cookie';

export const VENDOR_PORTAL_COOKIE = 'vendorPortalSession';
export const VENDOR_PORTAL_ACTIVITY_KEY = 'dc-vendor-portal-activity';

const getBaseName = () => (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');

export const getVendorPortalCookiePath = () => `${getBaseName()}/vendor-portal` || '/vendor-portal';

export const getVendorPortalSession = () => {
  const session = Cookies.get(VENDOR_PORTAL_COOKIE);
  if (!session) return null;

  try {
    return JSON.parse(session);
  } catch {
    return { token: session, vendorType: 'expedition' };
  }
};

export const setVendorPortalSession = (vendorType = 'expedition') => {
  Cookies.set(VENDOR_PORTAL_COOKIE, JSON.stringify({ token: 'preview-session', vendorType }), {
    expires: 1,
    sameSite: 'strict',
    secure: window.location.protocol === 'https:',
    path: getVendorPortalCookiePath()
  });
};

export const clearVendorPortalSession = () => {
  Cookies.remove(VENDOR_PORTAL_COOKIE, { path: getVendorPortalCookiePath() });
};

export const recordVendorPortalActivity = (action, detail) => {
  const activity = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    detail,
    createdAt: new Date().toISOString()
  };

  try {
    const current = JSON.parse(localStorage.getItem(VENDOR_PORTAL_ACTIVITY_KEY) || '[]');
    localStorage.setItem(VENDOR_PORTAL_ACTIVITY_KEY, JSON.stringify([activity, ...current].slice(0, 25)));
  } catch {
    localStorage.setItem(VENDOR_PORTAL_ACTIVITY_KEY, JSON.stringify([activity]));
  }

  window.dispatchEvent(new CustomEvent('vendor-portal:activity', { detail: activity }));
};
