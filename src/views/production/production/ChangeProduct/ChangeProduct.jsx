import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

import MainCard from 'components/MainCard';

export default function ChangeProduct() {
  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Change Product</h5>
          <span className="text-muted f-12">Manage product changes in the production process.</span>
        </Stack>
      }
    >
      <Card className="border mb-0">
        <Card.Body className="text-center py-5">
          <span className="avtar avtar-xl bg-light-success text-success mb-3">
            <i className="ti ti-replace f-32" />
          </span>
          <h5 className="mb-2">No change product data available</h5>
        </Card.Body>
      </Card>
    </MainCard>
  );
}
