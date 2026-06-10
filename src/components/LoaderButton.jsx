import { Col, Row, Spinner } from 'react-bootstrap';

// ==============================|| BASIC - TABS & PILLS ||============================== //

export default function LoaderButton() {
  return (
    <>
      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
      <span> Loading...</span>
    </>
  );
}
