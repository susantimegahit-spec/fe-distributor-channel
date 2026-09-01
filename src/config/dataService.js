import axios from 'axios';
import { getCookies } from '../utils/cookies';
import QueryString from 'qs';
import Cookies from 'js-cookie';
import { useAlert } from '../utils/alertContext';
import store from '../redux/store';
import { destroyAuthState } from '../redux/authReducer';
import { notifyNetworkUnavailable } from '../utils/networkEvents';
import {
  requestSapConnectionRetry,
  SAP_CONNECTION_ERROR_MESSAGE
} from '../utils/sapConnectionEvents';

const API_ENDPOINT = import.meta.env.VITE_APP_API_ENDPOINT_DEVELOPMENT;

const authHeader = () => ({
  Authorization: `Bearer ${getCookies('session-token')}`
});
const client = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    Authorization: `Bearer ${getCookies('session-token')}`,
    'Content-Type': 'application/json'
  }
});

const isFormData = (data) => typeof FormData !== 'undefined' && data instanceof FormData;

const isSapConnectionTimeout = (error) => {
  const responseData = error?.response?.data;
  let serializedResponse = '';
  try {
    serializedResponse = JSON.stringify(responseData);
  } catch {
    serializedResponse = String(responseData || '');
  }
  const messages = [
    responseData?.message,
    responseData?.error,
    responseData?.data?.message,
    responseData?.data?.error,
    error?.message,
    typeof responseData === 'string' ? responseData : '',
    serializedResponse
  ];

  return messages.some((message) => String(message || '').toLowerCase().includes('curl error 28'));
};

const setSapConnectionErrorMessage = (error) => {
  error.message = SAP_CONNECTION_ERROR_MESSAGE;
  if (error.response) {
    const responseData = error.response.data;
    error.response.data =
      responseData && typeof responseData === 'object'
        ? { ...responseData, message: SAP_CONNECTION_ERROR_MESSAGE }
        : { message: SAP_CONNECTION_ERROR_MESSAGE };
  }
  return error;
};

const retrySapConnectionRequest = (error, originalRequest) => {
  const sapConnectionError = setSapConnectionErrorMessage(error);

  return new Promise((resolve, reject) => {
    requestSapConnectionRetry({
      retry: async () => {
        try {
          resolve(await client(originalRequest));
        } catch (retryError) {
          reject(retryError);
        }
      },
      cancel: () => {
        if (sapConnectionError.response) {
          resolve(sapConnectionError.response);
          return;
        }
        reject(sapConnectionError);
      }
    });
  });
};

const buildHeaders = (data, optionalHeader = {}) => {
  const headers = { ...authHeader(), ...optionalHeader };

  if (isFormData(data)) {
    delete headers['Content-Type'];
  }

  return headers;
};

class DataService {
  static get(path = '', params = undefined) {
    return client({
      method: 'GET',
      url: path,
      params,
      headers: { ...authHeader() }
    });
  }

  static getBlob(path = '') {
    return client({
      method: 'GET',
      url: path,
      headers: { ...authHeader() },
      responseType: 'blob'
    });
  }

  static post(path = '', data = {}, optionalHeader = {}) {
    return client({
      method: 'POST',
      url: path,
      data,
      headers: buildHeaders(data, optionalHeader)
    });
  }

  static patch(path = '', data = {}, optionalHeader = { 'Access-Control-Allow-Origin': '*' }) {
    return client({
      method: 'PATCH',
      url: path,
      data: JSON.stringify(data),
      headers: { ...authHeader(), ...optionalHeader }
    });
  }

  static delete(path = '', data = {}, optionalHeader = {}) {
    return client({
      method: 'DELETE',
      url: path,
      data: QueryString.stringify(data),
      headers: { ...authHeader(), ...optionalHeader }
    });
  }

  static put(path = '', data = {}, optionalHeader = {}) {
    return client({
      method: 'PUT',
      url: path,
      data: isFormData(data) ? data : JSON.stringify(data),
      headers: buildHeaders(data, optionalHeader)
    });
  }
}

/**
 * axios interceptors runs before and after a request, letting the developer modify req,req more
 * For more details on axios interceptor see https://github.com/axios/axios#interceptors
 */
client.interceptors.request.use((config) => {
  // do something before executing the request
  // For example tag along the bearer access token to request header or set a cookie
  const requestConfig = config;
  const { headers } = config;
  requestConfig.headers = { ...headers, Authorization: `Bearer ${getCookies('accessToken')}` };

  if (isFormData(config.data)) {
    delete requestConfig.headers['Content-Type'];
    delete requestConfig.headers['content-type'];
  }

  return requestConfig;
});

client.interceptors.response.use(
  (response) => {
    if (isSapConnectionTimeout({ response }) && response.config) {
      const error = new Error(SAP_CONNECTION_ERROR_MESSAGE);
      error.response = response;
      error.config = response.config;
      return retrySapConnectionRequest(error, response.config);
    }

    return response;
  },
  (error) => {
    /**
     * Do something in case the response returns an error code [3**, 4**, 5**] etc
     * For example, on token expiration retrieve a new access token, retry a failed request etc
     */
    const { response } = error;
    const originalRequest = error.config;
    if (isSapConnectionTimeout(error) && originalRequest) {
      return retrySapConnectionRequest(error, originalRequest);
    }
    if (!response || [502, 503, 504].includes(response.status)) {
      notifyNetworkUnavailable({ status: response?.status, code: error.code });
    }
    if (response) {
      // console.log('response error => ', response);
      if (response.status === 500) {
        // do something here
      } else if (response.status === 429) {
        return response;
      } else if (response.status === 422) {
        return response;
      } else if (response.status === 403) {
        return response;
      } else if (response.status === 401) {
        const isLoginRequest = String(originalRequest?.url || '').includes('/auth/login');
        const hadActiveSession = Boolean(Cookies.get('isLoggedIn') || Cookies.get('accessToken'));

        if (isLoginRequest && !hadActiveSession) {
          return Promise.reject(error);
        }

        Cookies.remove('isLoggedIn');
        Cookies.remove('accessToken');
        Cookies.remove('session-token');
        Cookies.remove('id');
        Cookies.remove('name');
        Cookies.remove('email');
        Cookies.remove('role');
        Cookies.remove('menu');
        Cookies.remove('actions');
        Cookies.remove('systems');
        Cookies.remove('system');
        Cookies.remove('expedition_code');
        Cookies.remove('whs_code');
        Cookies.remove('ocr_code');
        Cookies.remove('ocr_code2');
        Cookies.remove('ocr_code3');
        Cookies.remove('units');
        Cookies.remove('organization_assignment');
        Cookies.remove('customerCode');
        Cookies.remove('distributorName');
        Cookies.remove('distributorId');
        store.dispatch(destroyAuthState());
        sessionStorage.removeItem('dc-browser-workspace-v1');

        if (!sessionStorage.getItem('dc-session-expired-redirecting')) {
          sessionStorage.setItem('dc-session-expired-redirecting', '1');
          const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
          window.top.location.replace(`${baseName}/?reason=session-expired`);
        }

        return Promise.reject(error);
      } else if (response.status === 400) {
        return response;
      } else {
        return originalRequest;
      }
    }
    return Promise.reject(error);
  }
);
export { DataService };
