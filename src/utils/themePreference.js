export const THEME_STORAGE_KEY = 'dc-color-mode';
export const THEME_CHANGED_EVENT = 'dc:theme-changed';

export const getThemePreference = () => (localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light');

export const applyThemePreference = (theme) => {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.pcTheme = normalizedTheme;
  document.documentElement.dataset.bsTheme = normalizedTheme;
  document.documentElement.style.colorScheme = normalizedTheme;
  return normalizedTheme;
};

export const saveThemePreference = (theme) => {
  const normalizedTheme = applyThemePreference(theme);
  localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: { theme: normalizedTheme } }));
  return normalizedTheme;
};
