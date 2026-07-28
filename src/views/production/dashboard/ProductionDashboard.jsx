// react-bootstrap
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';

export default function ProductionDashboard() {
  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Production Dashboard</h5>
          <span className="text-muted f-12">Production dashboard overview.</span>
        </Stack>
      }
    >
      <Card className="border border-dashed mb-0">
        <Card.Body className="text-center py-5">
          <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
            <i className="ti ti-layout-dashboard f-32" />
          </span>
          <h5 className="mb-2">Dashboard Placeholder</h5>
          <p className="text-muted mb-0">Production dashboard content will be available soon.</p>
        </Card.Body>
      </Card>
    </MainCard>
  );
}
