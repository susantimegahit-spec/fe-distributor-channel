import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// ==============================|| MAIN LAYOUT - FOOTER ||============================== //
export default function Footer() {
  return (
    <footer className="pc-footer">
      <div className="footer-wrapper container-fluid">
        <Row className="justify-content-center justify-content-md-between">
          {/* Footer Text */}
          <Col xs="auto" className="my-1">
          </Col>

          {/* Footer Links */}
          <Col xs="auto" className="my-1">
            <Stack direction="horizontal" gap={3} className="justify-content-center">
              <p className="m-0">sm-connect By PT. Susanti Megah</p>
            </Stack>
          </Col>
        </Row>
      </div>
    </footer>
  );
}
