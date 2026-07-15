import { useMemo } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';

const productionOrders = [
  { id: 'WO-260715-001', product: 'Garam Cap Kapal 500 gr', line: 'Line A', target: 2400, actual: 1920, status: 'In Progress' },
  { id: 'WO-260715-002', product: 'Garam Cap Tangan 250 gr', line: 'Line B', target: 3200, actual: 3200, status: 'Completed' },
  { id: 'WO-260715-003', product: 'Garam Jempol 500 gr', line: 'Line C', target: 1800, actual: 630, status: 'In Progress' },
  { id: 'WO-260715-004', product: 'Garamku 1 kg', line: 'Line A', target: 1200, actual: 0, status: 'Planned' }
];

const statusVariant = {
  Planned: 'secondary',
  'In Progress': 'warning',
  Completed: 'success'
};

const summaryCards = [
  { key: 'orders', label: 'Work Orders', icon: 'ti ti-clipboard-list', color: 'primary' },
  { key: 'inProgress', label: 'In Progress', icon: 'ti ti-settings-cog', color: 'warning' },
  { key: 'completed', label: 'Completed', icon: 'ti ti-circle-check', color: 'success' },
  { key: 'achievement', label: 'Target Achievement', icon: 'ti ti-chart-bar', color: 'info', suffix: '%' }
];

export default function ProductionDashboard() {
  const summary = useMemo(() => {
    const target = productionOrders.reduce((total, order) => total + order.target, 0);
    const actual = productionOrders.reduce((total, order) => total + order.actual, 0);

    return {
      orders: productionOrders.length,
      inProgress: productionOrders.filter((order) => order.status === 'In Progress').length,
      completed: productionOrders.filter((order) => order.status === 'Completed').length,
      achievement: target ? Math.round((actual / target) * 100) : 0
    };
  }, []);

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Production Dashboard</h5>
            <span className="text-muted f-12">Monitor today&apos;s production plan, output, and work-order progress.</span>
          </Stack>
        }
        secondary={<Badge bg="light-success" text="success">Live Production</Badge>}
      >
        <Row className="g-3">
          {summaryCards.map((item) => (
            <Col sm={6} xl={3} key={item.key}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Stack direction="horizontal" className="justify-content-between" gap={3}>
                    <div>
                      <div className="text-muted f-12">{item.label}</div>
                      <h4 className="mb-0">{summary[item.key]}{item.suffix}</h4>
                    </div>
                    <span className={`avtar avtar-s bg-light-${item.color} text-${item.color}`}>
                      <i className={item.icon} />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </MainCard>

      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Today&apos;s Work Orders</h5>
            <span className="text-muted f-12">Current production output compared with each planned target.</span>
          </Stack>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>Work Order</th>
              <th>Product</th>
              <th>Production Line</th>
              <th className="text-end">Target</th>
              <th className="text-end">Actual</th>
              <th style={{ minWidth: 180 }}>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {productionOrders.map((order) => {
              const progress = Math.min(Math.round((order.actual / order.target) * 100), 100);

              return (
                <tr key={order.id}>
                  <td className="fw-semibold">{order.id}</td>
                  <td>{order.product}</td>
                  <td>{order.line}</td>
                  <td className="text-end">{order.target.toLocaleString('id-ID')}</td>
                  <td className="text-end">{order.actual.toLocaleString('id-ID')}</td>
                  <td>
                    <Stack direction="horizontal" gap={2}>
                      <ProgressBar className="flex-grow-1" now={progress} variant={progress === 100 ? 'success' : 'primary'} />
                      <span className="text-muted f-12" style={{ minWidth: 34 }}>{progress}%</span>
                    </Stack>
                  </td>
                  <td><Badge bg={statusVariant[order.status]}>{order.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </MainCard>
    </Stack>
  );
}
