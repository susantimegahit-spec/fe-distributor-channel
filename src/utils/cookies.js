
import Cookies from 'js-cookie';

const getCookies = key => {
    const data =  Cookies.get(key)

    try {
        return JSON.parse(data);
    } catch (err) {
        return data;
    }
};

const normalizeCustomerCode = value => {
    const normalizedValue = String(value ?? '').trim();

    return ['undefined', 'null'].includes(normalizedValue.toLowerCase()) ? '' : normalizedValue;
};

const getAssignedCustomerCodes = () => {
    const cookieValue = getCookies('customerCode');
    const values = Array.isArray(cookieValue) ? cookieValue : String(cookieValue ?? '').split(',');

    return [...new Set(values.map(normalizeCustomerCode).filter(Boolean))];
};

const getAssignedCustomerCode = () => getAssignedCustomerCodes().join(',');

const setCookies = (key, value) => {
    Cookies.set(key, value);
};

const removeCookies = key => {
    Cookies.remove(key);
};


export { getCookies, setCookies, removeCookies, normalizeCustomerCode, getAssignedCustomerCode, getAssignedCustomerCodes };
