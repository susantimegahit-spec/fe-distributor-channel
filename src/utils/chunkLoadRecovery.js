const CHUNK_RELOAD_KEY = 'distributor-channel:chunk-reload';
const RELOAD_COOLDOWN_MS = 10000;

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /failed to load module script/i,
  /loading chunk [\d]+ failed/i,
  /chunkloaderror/i
];

const getErrorMessage = (error) => error?.message || error?.reason?.message || String(error || '');

export const isChunkLoadError = (error) => CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(getErrorMessage(error)));

export const reloadForChunkError = (error) => {
  if (!isChunkLoadError(error) || typeof window === 'undefined') return false;

  const signature = getErrorMessage(error);
  const now = Date.now();

  try {
    const previousReload = JSON.parse(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 'null');

    if (previousReload?.signature === signature && now - previousReload.timestamp < RELOAD_COOLDOWN_MS) {
      return false;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ signature, timestamp: now }));
  } catch {
    // sessionStorage can be unavailable in restricted browser modes; reloading is still safe.
  }

  window.location.reload();
  return true;
};

export const registerChunkLoadRecovery = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadForChunkError(event.payload);
  });
};
