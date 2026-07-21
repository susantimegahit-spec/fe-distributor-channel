export const NETWORK_UNAVAILABLE_EVENT = 'sm:network-unavailable';

export const notifyNetworkUnavailable = (detail = {}) => {
  window.dispatchEvent(new CustomEvent(NETWORK_UNAVAILABLE_EVENT, { detail }));
};
