import axios from 'axios';
import { getCookies } from '../utils/cookies';
import QueryString from 'qs';
import Cookies from 'js-cookie';
import { useAlert } from '../utils/alertContext';
import store from '../redux/store';
import { destroyAuthState } from '../redux/authReducer';
import { notifyNetworkUnavailable } from '../utils/networkEvents';

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
  (response) => response,
  (error) => {
    /**
     * Do something in case the response returns an error code [3**, 4**, 5**] etc
     * For example, on token expiration retrieve a new access token, retry a failed request etc
     */
    const { response } = error;
    const originalRequest = error.config;
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
        Cookies.remove('isLoggedIn');
        Cookies.remove('accessToken');
        Cookies.remove('id');
        Cookies.remove('name');
        Cookies.remove('email');
        Cookies.remove('role');
        Cookies.remove('menu');
        Cookies.remove('systems');
        Cookies.remove('system');
        store.dispatch(destroyAuthState());
        window.location.replace('/');
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
