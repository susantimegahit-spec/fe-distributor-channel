import { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
// react-bootstrap
import ProgressBar from 'react-bootstrap/ProgressBar';

// ==============================|| LOADER ||============================== //

export default function LoaderFull() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
      style={{ zIndex: 9999, }}
    >
      <div className="w-50" style={{ maxWidth: '420px', minWidth: '240px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    </div>
  );
}
