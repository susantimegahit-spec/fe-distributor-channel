export const getNotificationResponsePayload = (response) => response?.data?.data ?? response?.data ?? {};

export const getNotificationItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const isUnreadNotification = (notification) => {
  if (typeof notification?.is_read === 'boolean') return !notification.is_read;
  if (typeof notification?.read === 'boolean') return !notification.read;
  return !notification?.read_at;
};

export const formatNotificationTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getNotificationSectionDate = (value) => {
  if (!value) return 'Latest';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Latest';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const normalizeNotification = (notification) => {
  const data = notification?.data || {};
  const createdAt = notification?.created_at || notification?.createdAt || notification?.time || data.created_at;

  return {
    id: notification?.id,
    title: notification?.title || data.title || data.subject || 'Notifications',
    description: notification?.message || notification?.description || data.message || data.description || '-',
    url: notification?.url || data.url || data.link || '#',
    createdAt,
    time: formatNotificationTime(createdAt),
    date: getNotificationSectionDate(createdAt),
    unread: isUnreadNotification(notification)
  };
};

export const getUnreadNotificationCount = (payload, items) => {
  const count = payload?.unread_count ?? payload?.unreadCount ?? payload?.unread;

  if (count !== undefined && count !== null && !Number.isNaN(Number(count))) {
    return Number(count);
  }

  return items.filter((notification) => notification.unread).length;
};

export const getNotificationKey = (notification) => notification?.id || `${notification?.title}-${notification?.createdAt}`;
