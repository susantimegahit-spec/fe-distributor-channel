const CACHE_NAME = 'distributor-channel-v10';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './customer-portal-favicon.png',
  './customer-portal-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const putCache = async (request, response) => {
  if (!response || response.status !== 200 || response.type !== 'basic') return;

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
};

const networkFirst = async (request, fallbackRequest = request) => {
  try {
    const response = await fetch(request);
    await putCache(fallbackRequest, response);

    return response;
  } catch (error) {
    const cachedResponse = await caches.match(fallbackRequest);
    if (cachedResponse) return cachedResponse;

    throw error;
  }
};

const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  await putCache(request, response);

  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, './').catch(() => caches.match(request).then((cachedResponse) => cachedResponse || caches.match('./')))
    );
    return;
  }

  if (['script', 'style', 'worker', 'document'].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
