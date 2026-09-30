import Cookies from 'js-cookie';

const getCookies = (key) => {
  const data = Cookies.get(key);

  try {
    const parsed = JSON.parse(data);
    if (key === 'actions' && parsed?.__action_cookie_chunks) {
      const chunks = Array.from({ length: parsed.__action_cookie_chunks }, (_, index) => Cookies.get(`actions_${index}`));
      return chunks.every((chunk) => typeof chunk === 'string') ? JSON.parse(chunks.join('')) : undefined;
    }
    return parsed;
  } catch (err) {
    return data;
  }
};

const removeActionsCookie = () => {
  const marker = getCookies('actions');
  const count = Cookies.get('actions_chunks') || (marker?.__action_cookie_chunks ?? 0);
  for (let index = 0; index < Number(count); index += 1) Cookies.remove(`actions_${index}`);
  Cookies.remove('actions_chunks');
  Cookies.remove('actions');
};

const setActionsCookie = (actions) => {
  removeActionsCookie();
  const serialized = JSON.stringify(actions ?? { menu: [], widget: [] });
  const chunkSize = 1500;
  if (serialized.length <= chunkSize) {
    Cookies.set('actions', serialized);
    return;
  }
  const chunks = serialized.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) || [];
  chunks.forEach((chunk, index) => Cookies.set(`actions_${index}`, chunk));
  Cookies.set('actions_chunks', String(chunks.length));
  Cookies.set('actions', JSON.stringify({ __action_cookie_chunks: chunks.length }));
};

const normalizeCustomerCode = (value) => {
  const normalizedValue = String(value ?? '').trim();

  return ['undefined', 'null'].includes(normalizedValue.toLowerCase()) ? '' : normalizedValue;
};

const getAssignedCustomerCodes = () => {
  const cookieValue = getCookies('customerCode');
  const values = Array.isArray(cookieValue) ? cookieValue : String(cookieValue ?? '').split(',');

  return [...new Set(values.map(normalizeCustomerCode).filter(Boolean))];
};

const getAssignedCustomerCode = () => getAssignedCustomerCodes().join(',');

const normalizeOrganizationAssignmentValues = (value) => {
  if (Array.isArray(value)) return [...new Set(value.flatMap(normalizeOrganizationAssignmentValues).filter(Boolean))];
  if (value === undefined || value === null || value === '') return [];
  if (typeof value === 'object') {
    const nestedValue =
      value.value ??
      value.id ??
      value.master_unit_id ??
      value.masterUnitId ??
      value.unit_code ??
      value.unitCode ??
      value.u_unit ??
      value.U_Unit ??
      value.code ??
      value.whs_code ??
      value.ocr_code ??
      value.code_customer;
    return normalizeOrganizationAssignmentValues(nestedValue);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getOrganizationAssignment = () => {
  const assignment = getCookies('organization_assignment') || {};

  return {
    units: normalizeOrganizationAssignmentValues(assignment.units ?? getCookies('units')),
    warehouses: normalizeOrganizationAssignmentValues(assignment.warehouses ?? getCookies('whs_code')),
    branches: normalizeOrganizationAssignmentValues(assignment.branches ?? getCookies('ocr_code')),
    business_units: normalizeOrganizationAssignmentValues(assignment.business_units ?? getCookies('ocr_code2')),
    departments: normalizeOrganizationAssignmentValues(assignment.departments ?? getCookies('ocr_code3')),
    expeditions: normalizeOrganizationAssignmentValues(assignment.expeditions ?? getCookies('expedition_code')),
    distributors: normalizeOrganizationAssignmentValues(assignment.distributors ?? getCookies('customerCode'))
  };
};

const getOrganizationAssignmentDefault = (key) => getOrganizationAssignment()[key]?.[0] || '';

const setCookies = (key, value) => {
  Cookies.set(key, value);
};

const removeCookies = (key) => {
  Cookies.remove(key);
};

export {
  getCookies,
  setActionsCookie,
  removeActionsCookie,
  setCookies,
  removeCookies,
  normalizeCustomerCode,
  getAssignedCustomerCode,
  getAssignedCustomerCodes,
  getOrganizationAssignment,
  getOrganizationAssignmentDefault
};
