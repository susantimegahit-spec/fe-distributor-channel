import { useEffect, useState } from 'react';
import { Button, Modal, Stack } from 'react-bootstrap';

import { SAP_CONNECTION_ERROR_MESSAGE, SAP_CONNECTION_RETRY_EVENT } from 'utils/sapConnectionEvents';

export default function SapConnectionRetryDialog() {
  const [requests, setRequests] = useState([]);
  const request = requests[0] || null;

  useEffect(() => {
    const handleRetryRequest = (event) => setRequests((current) => [...current, event.detail]);
    window.addEventListener(SAP_CONNECTION_RETRY_EVENT, handleRetryRequest);
    return () => window.removeEventListener(SAP_CONNECTION_RETRY_EVENT, handleRetryRequest);
  }, []);

  const handleCancel = () => {
    const currentRequest = request;
    setRequests((current) => current.slice(1));
    currentRequest?.cancel?.();
  };

  const handleRetry = () => {
    if (!request) return;
    const currentRequest = request;
    setRequests((current) => current.slice(1));
    currentRequest.retry?.();
  };

  return (
    <Modal show={Boolean(request)} onHide={handleCancel} centered backdrop="static">
      <Modal.Body className="p-4 text-center">
        <div className="avtar avtar-xl bg-light-danger text-danger mx-auto mb-3">
          <i className="ti ti-plug-connected-x f-28" />
        </div>
        <h4 className="mb-2">SAP Connection Issue</h4>
        <p className="text-muted mb-0">{SAP_CONNECTION_ERROR_MESSAGE}</p>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 px-4 pb-4">
        <Stack direction="horizontal" gap={2} className="w-100">
          <Button className="w-100" variant="light-secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="w-100" variant="primary" onClick={handleRetry}>
            <i className="ti ti-refresh me-2" />
            Retry Request
          </Button>
        </Stack>
      </Modal.Footer>
    </Modal>
  );
}
