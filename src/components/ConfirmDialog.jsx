import { Button, Col, Modal, Row, Spinner } from 'react-bootstrap';

// ==============================|| BASIC - TABS & PILLS ||============================== //

export default function ConfirmDialog({ show, title, subTitle, onSubmit, onCancel }) {
  return (
    <>
      <Modal show={show} size="sm" centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {subTitle}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onCancel}>
            Tidak
          </Button>
          <Button variant="primary" onClick={onSubmit}>
            Ya
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
