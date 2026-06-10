import { Col, Row, Spinner } from 'react-bootstrap';

// ==============================|| BASIC - TABS & PILLS ||============================== //

export default function LoaderData() {
  return (
    // <Row>
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100px', minWidth: '100%' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    // </Row>
  );
}
