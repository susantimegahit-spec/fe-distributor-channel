import { useCallback, useEffect, useRef, useState } from 'react';
import ReactSelect from 'react-select';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import OriginServices from 'services/logistics/OriginServices';
import DestinationServices from 'services/logistics/DestinationServices';
import LeadTimeServices from 'services/logistics/LeadTimeServices';
import { useAlert } from 'utils/alertContext';
import './master-lead-time.scss';

const pageSize = 10;
const selectStyles = { menuPortal: (base) => ({ ...base, zIndex: 1060 }) };
const createEmptyRow = (id) => ({ id, originId: '', destinationId: '', average: '' });
const getPayload = (response) => response?.data?.data ?? response?.data ?? {};
const getRows = (payload) => {
  const list = Array.isArray(payload) ? payload : (payload?.data ?? payload?.items ?? payload?.leadtimes ?? []);
  const rows = Array.isArray(list) ? list : (list?.data ?? list?.items ?? []);
  return Array.isArray(rows) ? rows : [];
};
const isSuccessful = (response) => response?.status >= 200 && response.status < 300 && response?.data?.success !== false;
const formatAverageDays = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : '-';
};

export default function MasterLeadTime() {
  const { showAlert } = useAlert();
  const [leadTimes, setLeadTimes] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [leadTimeToDelete, setLeadTimeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const nextRowId = useRef(1);
  const [formRows, setFormRows] = useState([createEmptyRow(0)]);
  const originOptions = origins.map((item) => ({
    value: String(item.id ?? item.origin_id),
    label: `${item.whs_code || item.whsCode || '-'} - ${item.whs_name_origin || item.whsNameOrigin || '-'}`
  }));
  const destinationOptions = destinations.map((item) => ({
    value: String(item.id ?? item.shipto_id ?? item.ship_to_id),
    label: item.alias || item.ship_to_name || item.name || String(item.id ?? '-')
  }));

  const fetchLeadTimes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await LeadTimeServices.getLeadTimes({ page, per_page: pageSize });
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to load lead times');
      const payload = getPayload(response);
      const rows = getRows(payload);
      const pagination = payload?.pagination ?? payload?.meta ?? payload?.leadtimes?.pagination ?? payload?.leadtimes ?? payload;
      const serverTotal = Number(pagination?.total);
      const hasServerPagination = Number.isFinite(serverTotal);
      setLeadTimes(hasServerPagination ? rows : rows.slice((page - 1) * pageSize, page * pageSize));
      setTotal(hasServerPagination ? serverTotal : rows.length);
      setPageCount(Math.max(Number(pagination?.last_page) || Math.ceil((hasServerPagination ? serverTotal : rows.length) / pageSize), 1));
    } catch (error) {
      setLeadTimes([]);
      setTotal(0);
      setPageCount(1);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load lead times', 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, showAlert]);

  useEffect(() => {
    fetchLeadTimes();
  }, [fetchLeadTimes]);

  useEffect(() => {
    const loadOptions = async () => {
      const [originResult, destinationResult] = await Promise.allSettled([
        OriginServices.getOrigins({ per_page: 100 }),
        DestinationServices.getDestinations({ per_page: 100 })
      ]);
      if (originResult.status === 'fulfilled') setOrigins(getRows(getPayload(originResult.value)));
      if (destinationResult.status === 'fulfilled') setDestinations(getRows(getPayload(destinationResult.value)));
    };
    loadOptions();
  }, []);

  const setField = (id, field, value) => setFormRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

  const buildPayload = (row) => {
    const origin = origins.find((item) => String(item.id ?? item.origin_id) === row.originId);
    const destination = destinations.find((item) => String(item.id ?? item.shipto_id ?? item.ship_to_id) === row.destinationId);
    if (!origin || !destination) throw new Error('Please select a valid origin and destination.');

    return {
      warehouse_origin_id: Number(row.originId),
      origin_warehouse_code: origin.whs_code ?? origin.whsCode ?? '',
      origin_warehouse_name: origin.whs_name_origin ?? origin.whsNameOrigin ?? '',
      origin_city: origin.city ?? '',
      destination_id: Number(row.destinationId),
      destination_regency_id: destination.regency_id ?? destination.destination_regency_id ?? undefined,
      destination_code: destination.ship_to_code ?? destination.shipToCode ?? destination.card_code ?? '',
      destination_name: destination.alias ?? destination.ship_to_name ?? destination.name ?? String(row.destinationId),
      destination_city: destination.city ?? '',
      destination_province: destination.province ?? '',
      avg_lead_time_days: Number(row.average)
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    let savedCount = 0;
    try {
      if (editingId !== null) {
        const response = await LeadTimeServices.putLeadTime(editingId, buildPayload(formRows[0]));
        if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to update lead time');
        showAlert('Lead time updated successfully', 'success');
        setShowForm(false);
        setEditingId(null);
        await fetchLeadTimes();
        return;
      }

      for (const row of formRows) {
        const response = await LeadTimeServices.postLeadTime(buildPayload(row));
        if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to save lead time');
        savedCount += 1;
      }
      showAlert(`${savedCount} lead time${savedCount === 1 ? '' : 's'} created successfully`, 'success');
      setShowForm(false);
      setFormRows([createEmptyRow(nextRowId.current++)]);
      if (page === 1) await fetchLeadTimes();
      else setPage(1);
    } catch (error) {
      if (savedCount) {
        setFormRows((current) => current.slice(savedCount));
        if (page === 1) await fetchLeadTimes();
        else setPage(1);
      }
      showAlert(
        `${savedCount ? `${savedCount} saved. ` : ''}${
          error?.response?.data?.message || error?.message || (editingId !== null ? 'Failed to update lead time' : 'Failed to save lead time')
        }`,
        'danger'
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (item) => {
    const id = item.id ?? item.leadtime_id ?? item.lead_time_id;
    if (id === null || id === undefined) {
      showAlert('Lead time ID is unavailable.', 'danger');
      return;
    }
    const averageDays = Number(item.avg_lead_time_days);
    setEditingId(id);
    setFormRows([
      {
        id: nextRowId.current++,
        originId: String(item.warehouse_origin_id ?? item.origin_id ?? ''),
        destinationId: String(item.destination_id ?? item.shipto_id ?? item.ship_to_id ?? ''),
        average: Number.isFinite(averageDays) ? String(Math.round(averageDays)) : ''
      }
    ]);
    setShowForm(true);
  };

  const deleteLeadTime = async () => {
    const id = leadTimeToDelete?.id ?? leadTimeToDelete?.leadtime_id ?? leadTimeToDelete?.lead_time_id;
    if (id === null || id === undefined) return;
    setDeleting(true);
    try {
      const response = await LeadTimeServices.deleteLeadTime(id);
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to delete lead time');
      showAlert('Lead time deleted successfully', 'success');
      setLeadTimeToDelete(null);
      if (leadTimes.length === 1 && page > 1) setPage((current) => current - 1);
      else await fetchLeadTimes();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to delete lead time', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainCard
      title={
        <Stack direction="horizontal" className="justify-content-between flex-wrap" gap={2}>
          <h5 className="mb-0">Master Lead Time</h5>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormRows([createEmptyRow(nextRowId.current++)]);
              setShowForm(true);
            }}
          >
            <i className="ti ti-plus me-1" /> Add Lead Time
          </Button>
        </Stack>
      }
    >
      <Table responsive hover className="mb-0 align-middle">
        <thead>
          <tr>
            <th>Origin</th>
            <th>Destination</th>
            <th>Mode</th>
            <th>Average</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center py-4">
                Loading lead times...
              </td>
            </tr>
          ) : leadTimes.length ? (
            leadTimes.map((item, index) => (
              <tr key={item.id ?? item.leadtime_id ?? item.lead_time_id ?? index}>
                <td>{item.origin_warehouse_name || item.origin_warehouse_code || '-'}</td>
                <td>{item.destination_name || '-'}</td>
                <td>{item.transport_mode || 'LAND'}</td>
                <td>
                  {formatAverageDays(item.avg_lead_time_days)} {item.lead_time_unit || 'DAYS'}
                </td>
                <td>
                  <Badge bg={item.status === 'INACTIVE' ? 'secondary' : 'success'}>{item.status || 'ACTIVE'}</Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    aria-label="Open lead time actions"
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
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                No lead times found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <TablePagination
        currentPage={page}
        onPageChange={setPage}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        itemLabel="lead times"
      />

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
          <div
            ref={ref}
            className="dropdown-menu show"
            data-popper-placement={placement}
            style={{ ...style, zIndex: 1080, minWidth: 160 }}
          >
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                const item = actionMenu?.item;
                setActionMenu(null);
                openEditForm(item);
              }}
            >
              <i className="ti ti-edit text-warning me-2" /> Edit
            </button>
            <button
              type="button"
              className="dropdown-item text-danger"
              onClick={() => {
                const item = actionMenu?.item;
                setActionMenu(null);
                setLeadTimeToDelete(item);
              }}
            >
              <i className="ti ti-trash me-2" /> Delete
            </button>
          </div>
        )}
      </Overlay>

      <Modal
        show={showForm}
        onHide={() => {
          if (!saving) {
            setShowForm(false);
            setEditingId(null);
          }
        }}
        size="lg"
        centered
      >
        <Form onSubmit={submit}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>{editingId !== null ? 'Edit Lead Time' : 'Add Lead Time'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editingId === null && (
              <div className="d-flex justify-content-end mb-3">
                <Button
                  variant="outline-primary"
                  onClick={() => setFormRows((current) => [...current, createEmptyRow(nextRowId.current++)])}
                  disabled={saving}
                >
                  <i className="ti ti-plus me-1" /> Add Row
                </Button>
              </div>
            )}
            <Table responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Origin</th>
                  <th style={{ width: '34%' }}>Destination</th>
                  <th style={{ width: '24%' }}>Average Lead Time (Days)</th>
                  <th style={{ width: '8%' }} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {formRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <ReactSelect
                        classNamePrefix="react-select"
                        aria-label={`Origin row ${index + 1}`}
                        options={originOptions}
                        value={originOptions.find((option) => option.value === row.originId) || null}
                        onChange={(option) => setField(row.id, 'originId', option?.value || '')}
                        placeholder="Select origin"
                        isSearchable
                        isClearable
                        isDisabled={saving}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={selectStyles}
                      />
                    </td>
                    <td>
                      <ReactSelect
                        classNamePrefix="react-select"
                        aria-label={`Destination row ${index + 1}`}
                        options={destinationOptions}
                        value={destinationOptions.find((option) => option.value === row.destinationId) || null}
                        onChange={(option) => setField(row.id, 'destinationId', option?.value || '')}
                        placeholder="Select destination"
                        isSearchable
                        isClearable
                        isDisabled={saving}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={selectStyles}
                      />
                    </td>
                    <td>
                      <Form.Control
                        required
                        aria-label={`Average lead time in days row ${index + 1}`}
                        className="lead-time-average-input"
                        type="number"
                        min="0"
                        step="1"
                        value={row.average}
                        onChange={(event) => setField(row.id, 'average', event.target.value)}
                        onWheel={(event) => event.currentTarget.blur()}
                      />
                    </td>
                    <td className="text-end">
                      {index > 0 && (
                        <Button
                          variant="outline-danger"
                          aria-label={`Remove lead time row ${index + 1}`}
                          title="Remove row"
                          onClick={() => setFormRows((current) => current.filter((item) => item.id !== row.id))}
                          disabled={saving}
                        >
                          <i className="ti ti-x" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="light-secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId !== null ? 'Update Lead Time' : 'Save Lead Time'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(leadTimeToDelete)} onHide={() => !deleting && setLeadTimeToDelete(null)} centered>
        <Modal.Header closeButton={!deleting}>
          <Modal.Title>Delete Lead Time</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the lead time from{' '}
          <strong>{leadTimeToDelete?.origin_warehouse_name || leadTimeToDelete?.origin_warehouse_code || '-'}</strong> to{' '}
          <strong>{leadTimeToDelete?.destination_name || '-'}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={deleting} onClick={() => setLeadTimeToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={deleting} onClick={deleteLeadTime}>
            {deleting ? 'Deleting...' : 'Delete Lead Time'}
          </Button>
        </Modal.Footer>
      </Modal>
    </MainCard>
  );
}
