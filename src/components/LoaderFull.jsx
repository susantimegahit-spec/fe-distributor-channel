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
        if (prev >= 90) return 90;

        return prev + 5;
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
      style={{ zIndex: 9999 }}
    >
      <div className="w-50 rounded bg-white p-4 text-center shadow" style={{ maxWidth: '420px', minWidth: '240px' }}>
        <Spinner animation="border" variant="primary" className="mb-3" />
        <h6 className="mb-3">Processing data...</h6>
        <ProgressBar animated striped now={progress} label={`${progress}%`} aria-label="Submit progress" />
      </div>
    </div>
  );
}
