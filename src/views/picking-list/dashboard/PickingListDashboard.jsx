import { useMemo } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';

const pickingTasks = [
  {
    id: 'PKL-0001',
    warehouse: 'SBY-01',
    picker: 'Andi Wijaya',
    orderNo: 'SO-2407001',
    items: 12,
    status: 'Ready'
  },
  {
    id: 'PKL-0002',
    warehouse: 'SBY-01',
    picker: 'Maya Sari',
    orderNo: 'SO-2407002',
    items: 8,
    status: 'Picking'
  },
  {
    id: 'PKL-0003',
    warehouse: 'JKT-02',
    picker: 'Rafi Pratama',
    orderNo: 'SO-2407003',
    items: 15,
    status: 'Packed'
  },
  {
    id: 'PKL-0004',
    warehouse: 'BDG-01',
    picker: 'Nina Kartika',
    orderNo: 'SO-2407004',
    items: 6,
    status: 'Ready'
  }
];

const statusVariant = {
  Ready: 'primary',
  Picking: 'warning',
  Packed: 'success'
};

export default function PickingListDashboard() {
  const summary = useMemo(
    () => ({
      total: pickingTasks.length,
      ready: pickingTasks.filter((item) => item.status === 'Ready').length,
      picking: pickingTasks.filter((item) => item.status === 'Picking').length,
      packed: pickingTasks.filter((item) => item.status === 'Packed').length
    }),
    []
  );

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">PickingList Dashboard</h5>
            <span className="text-muted f-12">Monitor warehouse picking tasks and fulfillment progress.</span>
          </Stack>
        }
      >
        <Row className="g-3">
          <Col sm={6} xl={3}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Total Tasks</div>
                    <h4 className="mb-0">{summary.total}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-primary text-primary">
                    <i className="ti ti-clipboard-list" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={3}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Ready</div>
                    <h4 className="mb-0">{summary.ready}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-info text-info">
                    <i className="ti ti-list-check" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={3}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Picking</div>
                    <h4 className="mb-0">{summary.picking}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-warning text-warning">
                    <i className="ti ti-package" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={3}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Packed</div>
                    <h4 className="mb-0">{summary.packed}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-success text-success">
                    <i className="ti ti-package-export" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </MainCard>

      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Recent Picking Tasks</h5>
            <span className="text-muted f-12">Latest picking activities grouped by warehouse and order.</span>
          </Stack>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>Picking No.</th>
              <th>Warehouse</th>
              <th>Order No.</th>
              <th>Picker</th>
              <th className="text-end">Items</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pickingTasks.map((item) => (
              <tr key={item.id}>
                <td className="fw-semibold">{item.id}</td>
                <td>{item.warehouse}</td>
                <td>{item.orderNo}</td>
                <td>{item.picker}</td>
                <td className="text-end">{item.items}</td>
                <td>
                  <Badge bg={statusVariant[item.status] || 'secondary'}>{item.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </MainCard>
    </Stack>
  );
}
