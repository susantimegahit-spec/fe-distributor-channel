import { useCallback, useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DestinationServices from '../../../services/expedition/DestinationServices';
import { useAlert } from '../../../utils/alertContext';

const pageSize = 10;
const getPayload = (response) => response?.data?.data ?? response?.data ?? [];

const normalizeDestination = (item = {}) => ({
  ...item,
  id: item.id ?? item.shipto_id ?? item.ship_to_id,
  customerCode: item.customerCode ?? item.customer_code ?? item.code_customer ?? item.card_code ?? item.CardCode ?? '',
  customerName: item.customerName ?? item.customer_name ?? item.name ?? item.customer?.name ?? item.card_name ?? item.CardName ?? '',
  shipToCode: item.shipToCode ?? item.ship_to_code ?? item.address_code ?? item.AddressName ?? '',
  shipToName: item.shipToName ?? item.ship_to_name ?? item.address_name ?? item.AddressName2 ?? '',
  street: item.street ?? item.Street ?? item.address ?? '',
  city: item.city ?? item.City ?? '',
  province: item.province ?? item.state ?? item.State ?? '',
  postalCode: item.postalCode ?? item.postal_code ?? item.zip_code ?? item.ZipCode ?? '',
  status: String(item.status ?? item.active ?? 'ACTIVE').toUpperCase()
});

const getDestinationList = (response) => {
  const payload = getPayload(response);
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.shiptos ?? payload?.ship_tos ?? [];
  return Array.isArray(list) ? list.map(normalizeDestination) : [];
};

const isSuccessful = (response) => response?.status < 400 && response?.data?.success !== false;

export default function MasterDestination() {
  const { showAlert } = useAlert();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState(null);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await DestinationServices.getDestinations({
        search: keywords.trim() || undefined,
        status: status || undefined,
        per_page: 100
      });
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to fetch destination data');
      setDestinations(getDestinationList(response));
    } catch (error) {
      setDestinations([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch destination data', 'danger');
    } finally {
      setLoading(false);
    }
  }, [keywords, showAlert, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchDestinations, 300);
    return () => clearTimeout(timeout);
  }, [fetchDestinations]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await DestinationServices.syncDestinations();
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to sync destination data');
      showAlert(response?.data?.message || 'Destination data synced successfully', 'success');
      setCurrentPage(1);
      await fetchDestinations();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to sync destination data', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  const pageCount = Math.max(Math.ceil(destinations.length / pageSize), 1);
  const paginatedDestinations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return destinations.slice(start, start + pageSize);
  }, [currentPage, destinations]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  return (
    <>
      <MainCard
        bodyClassName="p-3 p-md-4"
        title={
          <Stack direction="horizontal" className="justify-content-between flex-wrap gap-3">
            <div>
              <h5 className="mb-1">Destination</h5>
              <span className="text-muted f-12">Manage customer ship-to destinations for expedition routes.</span>
            </div>
            <Button disabled={syncing} onClick={handleSync}>
              <i className={syncing ? 'ti ti-loader-2 me-1' : 'ti ti-refresh me-1'} />
              {syncing ? 'Syncing...' : 'Sync Destination'}
            </Button>
          </Stack>
        }
      >
        <div className="mb-4">
          <Row className="g-2">
            <Col md={8}>
              <Form.Control
                type="search"
                value={keywords}
                placeholder="Search customer, ship-to, or location..."
                onChange={(event) => {
                  setKeywords(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Form.Select>
            </Col>
          </Row>
        </div>

        <Table responsive hover className="mb-3 align-middle">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Destination</th>
              <th>Address</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <LoaderData />
                </td>
              </tr>
            ) : paginatedDestinations.length ? (
              paginatedDestinations.map((destination, index) => (
                <tr key={destination.id || `${destination.customerCode}-${destination.shipToCode}-${index}`}>
                  <td>
                    <div className="fw-semibold">{destination.customerCode || '-'}</div>
                    <div className="text-muted">{destination.customerName || '-'}</div>
                  </td>
                  <td>{destination.shipToName || [destination.city, destination.province].filter(Boolean).join(', ') || '-'}</td>
                  <td>
                    <div>{destination.street || '-'}</div>
                    <small className="text-muted">
                      {[destination.city, destination.province, destination.postalCode].filter(Boolean).join(', ')}
                    </small>
                  </td>
                  <td>
                    <Badge bg={['ACTIVE', '1', 'TRUE'].includes(destination.status) ? 'success' : 'secondary'}>
                      {['ACTIVE', '1', 'TRUE'].includes(destination.status) ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Button
                      className="rounded-circle p-0"
                      variant="outline-primary"
                      size="sm"
                      style={{ width: 32, height: 32 }}
                      title="View destination"
                      onClick={() => setSelectedDestination(destination)}
                    >
                      <i className="ti ti-eye" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No destination data found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={destinations.length}
          itemLabel="destination"
        />
      </MainCard>

      <Modal show={Boolean(selectedDestination)} onHide={() => setSelectedDestination(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Destination Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDestination ? (
            <Row className="g-3">
              <Col sm={6}>
                <small className="text-muted">Customer</small>
                <div className="fw-semibold">{selectedDestination.customerCode || '-'}</div>
                <div>{selectedDestination.customerName || '-'}</div>
              </Col>
              <Col sm={6}>
                <small className="text-muted">Destination</small>
                <div className="fw-semibold">
                  {selectedDestination.shipToName ||
                    [selectedDestination.city, selectedDestination.province].filter(Boolean).join(', ') ||
                    '-'}
                </div>
              </Col>
              <Col xs={12}>
                <small className="text-muted">Address</small>
                <div>{selectedDestination.street || '-'}</div>
                <div>
                  {[selectedDestination.city, selectedDestination.province, selectedDestination.postalCode].filter(Boolean).join(', ') ||
                    '-'}
                </div>
              </Col>
              <Col xs={12}>
                <small className="text-muted">Status</small>
                <div>
                  <Badge bg={['ACTIVE', '1', 'TRUE'].includes(selectedDestination.status) ? 'success' : 'secondary'}>
                    {['ACTIVE', '1', 'TRUE'].includes(selectedDestination.status) ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </Col>
            </Row>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedDestination(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
