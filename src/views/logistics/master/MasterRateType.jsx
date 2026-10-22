import { useCallback, useEffect, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import RateTypeServices from 'services/logistics/RateTypeServices';
import { useAlert } from 'utils/alertContext';

const initialForm = {
  code: '',
  name: '',
  description: '',
  isActive: true,
  startTime: '',
  endTime: ''
};
const getPayload = (response) => response?.data?.data ?? response?.data ?? {};
const getRows = (response) => {
  const payload = getPayload(response);
  const rows = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.items ?? payload?.loading_rate_types ?? payload?.loadingRateTypes ?? [];
  return Array.isArray(rows) ? rows : [];
};
const isSuccessful = (response) => response?.status < 400 && response?.data?.success !== false;
const getId = (item) => item?.id ?? item?.loading_rate_type_id ?? item?.rate_type_id;
const isInactive = (value) => [false, 0, '0', 'false'].includes(value);
const formatTimeInput = (value) => (value ? String(value).slice(0, 8) : '');

export default function MasterRateType() {
  const { showAlert } = useAlert();
  const [rateTypes, setRateTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rateTypeToDelete, setRateTypeToDelete] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [form, setForm] = useState(initialForm);

  const fetchRateTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await RateTypeServices.getLoadingRateType({ per_page: 100 });
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to load loading rate types');
      setRateTypes(getRows(response));
    } catch (error) {
      setRateTypes([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load loading rate types', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchRateTypes();
  }, [fetchRateTypes]);

  const openForm = () => {
    setSelected(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setSelected(item);
    setForm({
      code: item.code ?? '',
      name: item.name ?? item.rate_type ?? item.type ?? '',
      description: item.description ?? '',
      isActive: !isInactive(item.is_active),
      startTime: formatTimeInput(item.start_time),
      endTime: formatTimeInput(item.end_time)
    });
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      return showAlert('Code and loading rate type name are required', 'danger');
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        is_active: form.isActive,
        start_time: form.startTime || null,
        end_time: form.endTime || null
      };
      const id = getId(selected);
      const response = id
        ? await RateTypeServices.putLoadingRateType(id, payload)
        : await RateTypeServices.postLoadingRateType(payload);
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to save loading rate type');
      showAlert(response?.data?.message || 'Loading rate type saved successfully', 'success');
      setShowForm(false);
      setSelected(null);
      setForm(initialForm);
      await fetchRateTypes();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save loading rate type', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const id = getId(rateTypeToDelete);
    if (!id) return;
    setDeleting(true);
    try {
      const response = await RateTypeServices.deleteLoadingRateType(id);
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to delete loading rate type');
      showAlert(response?.data?.message || 'Loading rate type deleted successfully', 'success');
      setRateTypeToDelete(null);
      await fetchRateTypes();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to delete loading rate type', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <MainCard
        headerClassName="role-permission-header"
        title={
          <Stack direction="horizontal" className="justify-content-between flex-wrap gap-3">
            <div>
              <h5 className="mb-1">Loading Rate Type</h5>
              <span className="text-muted f-12">Manage loading rate type master data for logistics.</span>
            </div>
            <Button onClick={openForm}><i className="ti ti-plus me-1" /> Add Loading Rate Type</Button>
          </Stack>
        }
      >
        <Table responsive hover className="mb-0 align-middle">
          <thead><tr><th>Code</th><th>Loading Rate Type</th><th>Description</th><th>Start Time</th><th>End Time</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><LoaderData /></td></tr>
            ) : rateTypes.length ? rateTypes.map((item, index) => (
              <tr key={item.id ?? item.rate_type_id ?? index}>
                <td className="fw-semibold">{item.code || '-'}</td>
                <td className="fw-semibold">{item.name ?? item.rate_type ?? item.type ?? '-'}</td>
                <td>{item.description || '-'}</td>
                <td>{item.start_time || '-'}</td>
                <td>{item.end_time || '-'}</td>
                <td>
                  <Badge bg={isInactive(item.is_active) ? 'secondary' : 'success'}>
                    {isInactive(item.is_active) ? 'INACTIVE' : 'ACTIVE'}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    aria-label="Open loading rate type actions"
                    aria-expanded={actionMenu?.item === item}
                    onClick={(event) =>
                      setActionMenu((current) => (current?.item === item ? null : { item, target: event.currentTarget }))
                    }
                  >
                    <i className="ti ti-dots-vertical me-1" /> Actions
                    <i className="ti ti-chevron-down ms-1" />
                  </Button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="text-center text-muted py-4">No loading rate types found.</td></tr>
            )}
          </tbody>
        </Table>
      </MainCard>

      <Overlay
        show={Boolean(actionMenu)}
        target={actionMenu?.target}
        placement="bottom-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setActionMenu(null)}
      >
        {({ ref, style, placement }) => (
          <div ref={ref} className="dropdown-menu show" data-popper-placement={placement} style={{ ...style, zIndex: 1080, minWidth: 160 }}>
            <button type="button" className="dropdown-item" onClick={() => {
              const item = actionMenu?.item;
              setActionMenu(null);
              openEditForm(item);
            }}>
              <i className="ti ti-edit text-warning me-2" /> Edit
            </button>
            <button type="button" className="dropdown-item text-danger" onClick={() => {
              const item = actionMenu?.item;
              setActionMenu(null);
              setRateTypeToDelete(item);
            }}>
              <i className="ti ti-trash me-2" /> Delete
            </button>
          </div>
        )}
      </Overlay>

      <Modal show={showForm} onHide={() => !saving && setShowForm(false)} centered>
        <Form onSubmit={submit}>
          <Modal.Header closeButton><Modal.Title>{selected ? 'Edit' : 'Add'} Loading Rate Type</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Code</Form.Label>
              <Form.Control required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Loading Rate Type</Form.Label>
              <Form.Control required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </Form.Group>
            <Stack direction="horizontal" gap={3} className="mb-3">
              <Form.Group className="flex-fill">
                <Form.Label>Start Time</Form.Label>
                <Form.Control type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
              </Form.Group>
              <Form.Group className="flex-fill">
                <Form.Label>End Time</Form.Label>
                <Form.Control type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
              </Form.Group>
            </Stack>
            <Form.Check
              type="switch"
              id="rate-type-is-active"
              label="Active"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" disabled={saving} onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(rateTypeToDelete)} onHide={() => !deleting && setRateTypeToDelete(null)} centered>
        <Modal.Header closeButton={!deleting}><Modal.Title>Delete Loading Rate Type</Modal.Title></Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{rateTypeToDelete?.name || rateTypeToDelete?.code || 'this loading rate type'}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" disabled={deleting} onClick={() => setRateTypeToDelete(null)}>Cancel</Button>
          <Button variant="danger" disabled={deleting} onClick={remove}>
            <i className={deleting ? 'ti ti-loader-2 me-1' : 'ti ti-trash me-1'} />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
