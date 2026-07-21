import { useEffect, useState } from 'react';

import SaltyImage from 'assets/images/salty2.png';
import { NETWORK_UNAVAILABLE_EVENT } from 'utils/networkEvents';

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

  return (
    <>
      {children}
      {networkIssue && (
        <div className="sm-network-status" role="alert" aria-live="assertive">
          <div className="sm-network-status-card">
            <div className="sm-network-status-visual" aria-hidden="true">
              <span className="sm-network-status-signal signal-one" />
              <span className="sm-network-status-signal signal-two" />
              <span className="sm-network-status-signal signal-three" />
              <img src={SaltyImage} alt="" />
            </div>
            <span className="sm-network-status-label">Koneksi terputus</span>
            <h1>Ups, jaringan sedang bermasalah</h1>
            <p>Periksa koneksi internet Anda, lalu tekan tombol di bawah untuk mencoba memuat halaman kembali.</p>
            <button type="button" onClick={handleRetry} disabled={isRetrying}>
              <i className={`ti ${isRetrying ? 'ti-loader-2 sm-network-status-spin' : 'ti-refresh'}`} />
              {isRetrying ? 'Memeriksa koneksi...' : 'Coba lagi'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
