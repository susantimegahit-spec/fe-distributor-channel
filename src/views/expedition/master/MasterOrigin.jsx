import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

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
import WarehouseServices from '../../../services/customer-portal/WarehouseServices';
import OriginServices from '../../../services/expedition/OriginServices';
import { useAlert } from '../../../utils/alertContext';

const pageSize = 10;
const initialForm = {
  whsNameOrigin: '',
  whsCode: '',
  street: '',
  status: 'ACTIVE'
};

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const normalizeOrigin = (item = {}) => ({
  ...item,
  id: item.id ?? item.origin_id,
  whsNameOrigin: item.whsNameOrigin ?? item.whs_name_origin ?? '',
  whsCode: item.whsCode ?? item.whs_code ?? '',
  street: item.street ?? '',
  status: String(item.status || 'ACTIVE').toUpperCase()
});

const getOriginList = (response) => {
  const payload = getPayload(response);
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.origins ?? [];
  return Array.isArray(list) ? list.map(normalizeOrigin) : [];
};

const isSuccessful = (response) => response?.status < 400 && response?.data?.success !== false;

export default function MasterOrigin() {
  const { showAlert } = useAlert();
  const [origins, setOrigins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [originToDelete, setOriginToDelete] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const response = await WarehouseServices.getAllWarehouse('');
        const warehouses = response?.data?.data;
        setWarehouseOptions(
          (Array.isArray(warehouses) ? warehouses : []).map((warehouse) => ({
            value: String(warehouse.whs_code ?? ''),
            label: [warehouse.whs_code, warehouse.whs_name].filter(Boolean).join(' - ') || '-'
          }))
        );
      } catch (error) {
        setWarehouseOptions([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch warehouse data', 'danger');
      } finally {
        setLoadingWarehouses(false);
      }
    };

    fetchWarehouses();
  }, [showAlert]);

  const fetchOrigins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await OriginServices.getOrigins({
        search: keywords.trim() || undefined,
        status: status || undefined,
        per_page: 100
      });

      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to fetch origin data');
      setOrigins(getOriginList(response));
    } catch (error) {
      setOrigins([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch origin data', 'danger');
    } finally {
      setLoading(false);
    }
  }, [keywords, showAlert, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchOrigins, 300);
    return () => clearTimeout(timeout);
  }, [fetchOrigins]);

  const pageCount = Math.max(Math.ceil(origins.length / pageSize), 1);
  const paginatedOrigins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return origins.slice(start, start + pageSize);
  }, [currentPage, origins]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const openCreateForm = () => {
    setSelectedOrigin(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEditForm = async (origin) => {
    setSelectedOrigin(origin);
    setForm({ ...initialForm, ...normalizeOrigin(origin) });
    setShowForm(true);

    try {
      const response = await OriginServices.getOriginById(origin.id);
      if (!isSuccessful(response)) return;
      const detail = normalizeOrigin(getPayload(response));
      setSelectedOrigin(detail);
      setForm({ ...initialForm, ...detail });
    } catch {
      // Keep list data available when the detail endpoint cannot be reached.
    }
  };

  const closeForm = () => {
    if (submitting) return;
    setShowForm(false);
    setSelectedOrigin(null);
    setForm(initialForm);
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const buildPayload = () => ({
    whs_name_origin: form.whsNameOrigin.trim(),
    whs_code: form.whsCode,
    street: form.street.trim(),
    status: form.status
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.whsNameOrigin.trim()) {
      showAlert('Origin name is required', 'danger');
      return;
    }
    if (!form.whsCode) {
      showAlert('Warehouse is required', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const response = selectedOrigin?.id
        ? await OriginServices.putOrigin(selectedOrigin.id, buildPayload())
        : await OriginServices.postOrigin(buildPayload());

      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to save origin');
      showAlert(response?.data?.message || 'Origin saved successfully', 'success');
      setShowForm(false);
      setSelectedOrigin(null);
      setForm(initialForm);
      await fetchOrigins();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save origin', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!originToDelete?.id) return;
    setDeletingId(originToDelete.id);
    try {
      const response = await OriginServices.deleteOrigin(originToDelete.id);
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to delete origin');
      showAlert(response?.data?.message || 'Origin deleted successfully', 'success');
      setOriginToDelete(null);
      await fetchOrigins();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to delete origin', 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <MainCard
        content={false}
        title={
          <Stack direction="horizontal" className="justify-content-between flex-wrap gap-3">
            <div>
              <h5 className="mb-1">Origin</h5>
              <span className="text-muted f-12">Manage warehouse origins for expedition routes.</span>
            </div>
            <Stack direction="horizontal" gap={2}>
              <Button onClick={openCreateForm}>
                <i className="ti ti-plus me-1" />
                Add Origin
              </Button>
            </Stack>
          </Stack>
        }
      >
        <div className="p-3 border-bottom">
          <Row className="g-2">
            <Col md={8}>
              <Form.Control
                type="search"
                value={keywords}
                placeholder="Search origin, warehouse, or street..."
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

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Origin Name</th>
              <th>Warehouse Code</th>
              <th>Street</th>
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
            ) : paginatedOrigins.length ? (
              paginatedOrigins.map((origin) => (
                <tr key={origin.id || `${origin.whsCode}-${origin.whsNameOrigin}`}>
                  <td className="fw-semibold">{origin.whsNameOrigin || '-'}</td>
                  <td>{origin.whsCode || '-'}</td>
                  <td>{origin.street || '-'}</td>
                  <td>
                    <Badge bg={origin.status === 'ACTIVE' ? 'success' : 'secondary'}>{origin.status}</Badge>
                  </td>
                  <td className="text-center">
                    <Stack direction="horizontal" gap={2} className="justify-content-center">
                      <Button
                        className="rounded-circle p-0"
                        variant="outline-primary"
                        size="sm"
                        style={{ width: 32, height: 32 }}
                        onClick={() => openEditForm(origin)}
                        title="Edit origin"
                      >
                        <i className="ti ti-pencil" />
                      </Button>
                      <Button
                        className="rounded-circle p-0"
                        variant="outline-danger"
                        size="sm"
                        style={{ width: 32, height: 32 }}
                        onClick={() => setOriginToDelete(origin)}
                        title="Delete origin"
                      >
                        <i className="ti ti-trash" />
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No origin data found.
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
          total={origins.length}
          itemLabel="origin"
        />
      </MainCard>

      <Modal show={showForm} onHide={closeForm} centered size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton={!submitting}>
            <Modal.Title>{selectedOrigin?.id ? 'Edit Origin' : 'Add Origin'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Origin Name</Form.Label>
                  <Form.Control
                    required
                    value={form.whsNameOrigin}
                    onChange={handleChange('whsNameOrigin')}
                    placeholder="Gudang Asal Jakarta"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Warehouse</Form.Label>
                  <Select
                    isClearable
                    isLoading={loadingWarehouses}
                    options={warehouseOptions}
                    value={warehouseOptions.find((option) => option.value === form.whsCode) || null}
                    onChange={(option) => setForm((current) => ({ ...current, whsCode: option?.value || '' }))}
                    placeholder="Select warehouse"
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 1060 }) }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={form.status} onChange={handleChange('status')}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Street</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.street}
                    onChange={handleChange('street')}
                    placeholder="Jl. Sudirman No. 100"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" disabled={submitting} onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <i className={submitting ? 'ti ti-loader-2 me-1' : 'ti ti-device-floppy me-1'} />
              {submitting ? 'Saving...' : 'Save Origin'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(originToDelete)} onHide={() => !deletingId && setOriginToDelete(null)} centered>
        <Modal.Header closeButton={!deletingId}>
          <Modal.Title>Delete Origin</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{originToDelete?.whsNameOrigin || 'this origin'}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" disabled={Boolean(deletingId)} onClick={() => setOriginToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={Boolean(deletingId)} onClick={handleDelete}>
            <i className={deletingId ? 'ti ti-loader-2 me-1' : 'ti ti-trash me-1'} />
            {deletingId ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
