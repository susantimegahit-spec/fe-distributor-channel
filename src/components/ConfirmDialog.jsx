import { useEffect, useState } from 'react';

import { Button, Modal, Stack } from 'react-bootstrap';

// ==============================|| BASIC - TABS & PILLS ||============================== //

export default function ConfirmDialog({ show, title, subTitle, onSubmit, onCancel, loading = false }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!show) {
      setCountdown(5);
      return undefined;
    }

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prevState) => {
        if (prevState <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prevState - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show]);

  const isSubmitDisabled = countdown > 0 || loading;

  return (
    <Modal show={show} onHide={onCancel} centered contentClassName="border-0 shadow-lg" backdrop="static">
      <Modal.Body className="p-4">
        <div className="text-center">
          <div className="avtar avtar-xl bg-light-danger text-danger mx-auto mb-3">
            <i className="ti ti-alert-triangle f-28" />
          </div>
          <h4 className="mb-2">{title}</h4>
          <p className="text-muted mb-0">{subTitle}</p>
        </div>

        {/* <div className="alert alert-warning d-flex align-items-start gap-2 mt-4 mb-0">
          <i className="ti ti-clock f-18 mt-1" />
          <div>
            <div className="fw-semibold">Konfirmasi tindakan</div>
            <small>Tombol submit aktif setelah {countdown > 0 ? `${countdown} detik` : 'waktu tunggu selesai'}.</small>
          </div>
        </div> */}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0 px-4 pb-4">
        <Stack direction="horizontal" gap={2} className="w-100">
          <Button className="w-100" variant="light-secondary" onClick={onCancel} disabled={loading}>
            Tidak
          </Button>
          <Button className="w-100" variant="danger" onClick={onSubmit} disabled={isSubmitDisabled}>
            {loading ? 'Memproses...' : countdown > 0 ? `Ya (${countdown})` : 'Ya'}
          </Button>
        </Stack>
      </Modal.Footer>
    </Modal>
  );
}
