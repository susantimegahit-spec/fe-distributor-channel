import { useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LoaderData from '../../../components/LoaderData';
import WarehouseServices from '../../../services/customer-portal/WarehouseServices';
import { useAlert } from '../../../utils/alertContext';

export default function MasterWarehouse() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);

    if (keywords) {
      const delayTimer = setTimeout(() => {
        fetchData();
      }, 700);

      return () => clearTimeout(delayTimer);
    }

    fetchData();
  }, [keywords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await WarehouseServices.getAllWarehouse(keywords);
    if (response.data.success) {
      setDataSource(response.data.data);
      setLoadingData(false);
    } else {
      setLoadingData(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const syncData = async () => {
    setLoadingData(true);
    const response = await WarehouseServices.syncWarehouse();
    if (response.data.success) {
      showAlert('Warehouse data synced successfully', 'success');
      fetchData();
    } else {
      showAlert(response.data.message, 'danger');
      fetchData();
    }
  };

  const filteredData = useMemo(() => {
    if (!selectedStatus) return dataSource;

    return dataSource.filter((item) => String(item.status) === selectedStatus);
  }, [dataSource, selectedStatus]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.status === 1).length,
      inactive: dataSource.filter((item) => item.status !== 1).length
    }),
    [dataSource]
  );

  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const hasActiveFilter = Boolean(keywords || selectedStatus);

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Warehouse Data</h5>
              <span className="text-muted f-12">Manage warehouse lists and sync warehouse data from the central system.</span>
            </Stack>
          }
          secondary={
            <Button data-permission-action="sync" onClick={syncData} variant="primary" disabled={loadingData}>
              <i className="ti ti-refresh me-1" />
              Synchronize
            </Button>
          }
        >
          <Row className="g-3">
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Warehouse</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-building-warehouse" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            {/* <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
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
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
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
            </Col> */}
          </Row>
        </MainCard>

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={5} md={6}>
              <Form.Label className="f-12 text-muted">Search Warehouse</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  type="text"
                  placeholder="Code or warehouse name"
                />
              </InputGroup>
            </Col>
            {/* <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">All Statuses</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Form.Select>
            </Col> */}
            <Col lg={2} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh me-1" />
                Reset
              </Button>
            </Col>
            <Col lg={5} md={6} className="text-lg-end">
              <span className="text-muted f-12">Showing</span>
              <div className="fw-semibold">
                {filteredData.length} of {dataSource.length}
              </div>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive hover>
            {loadingData ? (
              <tbody>
                <tr>
                  <td colSpan={3}>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Code Warehouse</th>
                    <th style={{ minWidth: 260 }}>Warehouse Name</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    paginatedData.map((item, index) => (
                      <tr key={item.id || item.whs_code || index}>
                        <td>
                          {item.whs_code ? (
                            <Button
                              className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold f-12"
                              variant="light-primary"
                              size="sm"
                              onClick={() => setSelectedWarehouse(item)}
                              title={`View warehouse ${item.whs_code}`}
                            >
                              {item.whs_code}
                              <i className="ti ti-chevron-right f-12" aria-hidden="true" />
                            </Button>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.whs_name || '-'}</td>
                        <td>{item.status === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-building-warehouse f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'Warehouse not found' : 'No warehouse data yet'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter
                              ? 'Change the keyword or status to view other data.'
                              : 'Use synchronize to fetch the latest warehouse data.'}
                          </p>
                          {hasActiveFilter ? (
                            <Button variant="light-primary" onClick={resetFilters}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button data-permission-action="sync" variant="primary" onClick={syncData}>
                              <i className="ti ti-refresh me-1" />
                              Synchronize
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </Table>

          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredData.length}
            itemLabel="warehouse"
          />
        </MainCard>
      </Stack>

      <Modal show={Boolean(selectedWarehouse)} onHide={() => setSelectedWarehouse(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Warehouse Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedWarehouse && (
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Code Warehouse</Form.Label>
                <div className="fw-semibold">{selectedWarehouse.whs_code || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Status</Form.Label>
                <div>{selectedWarehouse.status === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</div>
              </Col>
              <Col md={12}>
                <Form.Label className="f-12 text-muted">Warehouse Name</Form.Label>
                <div>{selectedWarehouse.whs_name || '-'}</div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedWarehouse(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
