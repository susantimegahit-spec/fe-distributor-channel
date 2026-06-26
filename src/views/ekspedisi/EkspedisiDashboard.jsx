// react-bootstrap
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';

export default function EkspedisiDashboard() {
  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Dashboard Ekspedisi</h5>
            <span className="text-muted f-12">Fondasi sistem ekspedisi untuk pengembangan modul pengiriman berikutnya.</span>
          </Stack>
        }
      >
        <Row className="g-3">
          <Col md={4}>
            <div className="border rounded p-3 h-100">
              <span className="text-muted f-12">Pengiriman Aktif</span>
              <h4 className="mb-0 mt-2">0</h4>
            </div>
          </Col>
          <Col md={4}>
            <div className="border rounded p-3 h-100">
              <span className="text-muted f-12">Menunggu Pickup</span>
              <h4 className="mb-0 mt-2">0</h4>
            </div>
          </Col>
          <Col md={4}>
            <div className="border rounded p-3 h-100">
              <span className="text-muted f-12">Selesai Hari Ini</span>
              <h4 className="mb-0 mt-2">0</h4>
            </div>
          </Col>
        </Row>
      </MainCard>
    </Stack>
  );
}
