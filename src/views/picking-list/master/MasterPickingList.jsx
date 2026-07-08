import { useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';

const initialRules = [
  {
    id: 1,
    code: 'PICK-FIFO',
    name: 'FIFO Picking',
    warehouse: 'All Warehouses',
    priority: 'High',
    status: 'active'
  },
  {
    id: 2,
    code: 'PICK-ZONE',
    name: 'Zone Picking',
    warehouse: 'SBY-01',
    priority: 'Medium',
    status: 'active'
  },
  {
    id: 3,
    code: 'PICK-BULK',
    name: 'Bulk Picking',
    warehouse: 'JKT-02',
    priority: 'Low',
    status: 'inactive'
  }
];

export default function MasterPickingList() {
  const [keywords, setKeywords] = useState('');
  const [status, setStatus] = useState('');
  const [rules] = useState(initialRules);

  const filteredRules = useMemo(() => {
    const keyword = keywords.trim().toLowerCase();

    return rules.filter((item) => {
      const matchKeyword =
        !keyword ||
        [item.code, item.name, item.warehouse, item.priority].some((value) => String(value || '').toLowerCase().includes(keyword));
      const matchStatus = !status || item.status === status;

      return matchKeyword && matchStatus;
    });
  }, [keywords, rules, status]);

  const summary = useMemo(
    () => ({
      total: rules.length,
      active: rules.filter((item) => item.status === 'active').length,
      inactive: rules.filter((item) => item.status !== 'active').length
    }),
    [rules]
  );

  const resetFilters = () => {
    setKeywords('');
    setStatus('');
  };

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">PickingList Master</h5>
            <span className="text-muted f-12">Manage picking rules, warehouse scopes, and fulfillment priorities.</span>
          </Stack>
        }
        secondary={
          <Button variant="primary">
            <i className="ti ti-plus me-1" />
            Add Rule
          </Button>
        }
      >
        <Row className="g-3">
          <Col md={4}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Total Rules</div>
                    <h4 className="mb-0">{summary.total}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-primary text-primary">
                    <i className="ti ti-list-details" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Active</div>
                    <h4 className="mb-0">{summary.active}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-success text-success">
                    <i className="ti ti-circle-check" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Inactive</div>
                    <h4 className="mb-0">{summary.inactive}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-secondary text-secondary">
                    <i className="ti ti-circle-x" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </MainCard>

      <MainCard>
        <Row className="g-2 align-items-end mb-3">
          <Col lg={5} md={6}>
            <Form.Label className="f-12 text-muted">Search Picking Rule</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <i className="ti ti-search" />
              </InputGroup.Text>
              <Form.Control value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Code, name, or warehouse" />
            </InputGroup>
          </Col>
          <Col lg={3} md={6}>
            <Form.Label className="f-12 text-muted">Status</Form.Label>
            <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </Col>
          <Col lg={2} md={6}>
            <Button className="w-100" variant="light-secondary" disabled={!keywords && !status} onClick={resetFilters}>
              <i className="ti ti-refresh me-1" />
              Reset
            </Button>
          </Col>
          <Col lg={2} md={6} className="text-lg-end">
            <span className="text-muted f-12">Showing</span>
            <div className="fw-semibold">
              {filteredRules.length} of {rules.length}
            </div>
          </Col>
        </Row>

        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Code</th>
              <th style={{ minWidth: 220 }}>Rule Name</th>
              <th style={{ minWidth: 180 }}>Warehouse Scope</th>
              <th style={{ minWidth: 140 }}>Priority</th>
              <th style={{ minWidth: 120 }}>Status</th>
              <th className="text-center" style={{ width: 80 }}>
                #
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.length ? (
              filteredRules.map((item) => (
                <tr key={item.id}>
                  <td className="fw-semibold">{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.warehouse}</td>
                  <td>{item.priority}</td>
                  <td>{item.status === 'active' ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                  <td className="text-center">
                    <Button className="rounded-circle" variant="outline-primary" size="sm">
                      <i className="ti ti-pencil" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  No picking rules found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>
    </Stack>
  );
}
