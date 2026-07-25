// react-bootstrap
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';

export default function Rates() {
  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Rates</h5>
          <span className="text-muted f-12">Kelola tarif pengiriman untuk setiap ekspedisi dan rute.</span>
        </Stack>
      }
    >
      <Card className="border mb-0">
        <Card.Body className="py-5 text-center">
          <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
            <i className="ti ti-receipt-2 f-32" />
          </span>
          <h5 className="mb-2">Belum ada data tarif</h5>
          <p className="text-muted mb-0">Data tarif ekspedisi akan ditampilkan pada halaman ini.</p>
        </Card.Body>
      </Card>
    </MainCard>
  );
}
