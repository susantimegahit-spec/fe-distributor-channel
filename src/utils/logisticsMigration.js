// Keep saved permissions and workspace URLs compatible with the former module name.
export const normalizeLogisticsPermission = (value) =>
  typeof value === 'string' ? value.replace(/(^|:)expedition(?=$|[-:])/g, '$1logistics') : value;

export const normalizeLogisticsPath = (path = '') => path.replace(/^\/expedition(?=\/|$)/, '/logistics');
