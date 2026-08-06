import PropTypes from 'prop-types';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';

export default function EnterpriseWorkspace({ title, description, icon, actionLabel, metrics, columns, emptyMessage }) {
  return (
    <MainCard
      className="claim-transaction-card"
      title={
        <Stack direction="horizontal" gap={3} className="flex-wrap justify-content-between w-100">
          <Stack gap={1}>
            <Stack direction="horizontal" gap={2}>
              <span className="avtar avtar-s bg-light-primary text-primary">
                <i className={icon} />
              </span>
              <h5 className="mb-0 align-self-center">{title}</h5>
            </Stack>
            <span className="text-muted f-12">{description}</span>
          </Stack>
          <Button variant="primary" size="sm">
            <i className="ti ti-plus me-1" />
            {actionLabel}
          </Button>
        </Stack>
      }
    >
      <Row className="g-3 mb-4">
        {metrics.map((metric) => (
          <Col xl={3} md={6} key={metric.label}>
            <Card className="border h-100 mb-0">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12 mb-1">{metric.label}</div>
                    <h4 className="mb-0">{metric.value}</h4>
                  </div>
                  <Badge bg={`light-${metric.variant}`} text={metric.variant} className="p-2">
                    <i className={metric.icon} />
                  </Badge>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border mb-0">
        <Card.Header className="bg-transparent">
          <Stack direction="horizontal" className="justify-content-between">
            <h6 className="mb-0">Recent Activity</h6>
            <Button variant="light-secondary" size="sm">
              <i className="ti ti-filter me-1" />
              Filter
            </Button>
          </Stack>
        </Card.Header>
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} className="text-center py-5">
                  <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className={`${icon} f-24`} />
                  </span>
                  <h6 className="mb-1">No data available</h6>
                  <p className="text-muted mb-0">{emptyMessage}</p>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Card>
    </MainCard>
  );
}

EnterpriseWorkspace.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  actionLabel: PropTypes.string.isRequired,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      variant: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired
    })
  ).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  emptyMessage: PropTypes.string.isRequired
};
