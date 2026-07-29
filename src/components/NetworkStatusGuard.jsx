import { useEffect, useState } from 'react';

import { NETWORK_UNAVAILABLE_EVENT } from 'utils/networkEvents';
import ErrorPage from 'views/errors/ErrorPage';

export default function NetworkStatusGuard({ children }) {
  const [networkIssue, setNetworkIssue] = useState(() => !navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOffline = () => setNetworkIssue(true);
    const handleOnline = () => setNetworkIssue(false);
    const handleNetworkError = () => setNetworkIssue(true);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener(NETWORK_UNAVAILABLE_EVENT, handleNetworkError);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(NETWORK_UNAVAILABLE_EVENT, handleNetworkError);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);

    if (!navigator.onLine) {
      window.setTimeout(() => setIsRetrying(false), 700);
      return;
    }

    window.location.reload();
  };

  if (networkIssue) {
    return (
      <ErrorPage
        status="NETWORK"
        showPrimaryAction={false}
        showBackAction={false}
        showRetryAction
        onRetry={handleRetry}
        isRetrying={isRetrying}
        retryLabel="Coba lagi"
      />
    );
  }

  return children;
}
