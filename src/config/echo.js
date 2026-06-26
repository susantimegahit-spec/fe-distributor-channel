import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getCookies } from '../utils/cookies';

const API_ENDPOINT = import.meta.env.VITE_APP_API_ENDPOINT_DEVELOPMENT || '';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const isEchoEnabled = () => String(import.meta.env.VITE_ECHO_ENABLED || 'false').toLowerCase() === 'true';

const getBroadcastAuthEndpoint = () => {
  const configuredEndpoint = import.meta.env.VITE_ECHO_AUTH_ENDPOINT;

  if (configuredEndpoint) return configuredEndpoint;

  const apiEndpoint = trimTrailingSlash(API_ENDPOINT);
  return apiEndpoint ? `${apiEndpoint}/broadcasting/auth` : '/broadcasting/auth';
};

export const getNotificationChannelName = (userId) => {
  const prefix = import.meta.env.VITE_ECHO_NOTIFICATION_CHANNEL_PREFIX || 'App.Models.User';
  return `${prefix}.${userId}`;
};

export const createEchoClient = () => {
  if (!isEchoEnabled()) return null;

  const key = import.meta.env.VITE_PUSHER_APP_KEY || import.meta.env.VITE_REVERB_APP_KEY;

  if (!key) return null;

  window.Pusher = Pusher;

  const broadcaster = import.meta.env.VITE_ECHO_BROADCASTER || (import.meta.env.VITE_REVERB_APP_KEY ? 'reverb' : 'pusher');

  return new Echo({
    broadcaster,
    key,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    wsHost: import.meta.env.VITE_PUSHER_HOST || import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_PUSHER_PORT || import.meta.env.VITE_REVERB_PORT || 80),
    wssPort: Number(import.meta.env.VITE_PUSHER_PORT || import.meta.env.VITE_REVERB_PORT || 443),
    forceTLS: String(import.meta.env.VITE_PUSHER_SCHEME || import.meta.env.VITE_REVERB_SCHEME || 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: getBroadcastAuthEndpoint(),
    auth: {
      headers: {
        Authorization: `Bearer ${getCookies('accessToken')}`,
        Accept: 'application/json'
      }
    }
  });
};
