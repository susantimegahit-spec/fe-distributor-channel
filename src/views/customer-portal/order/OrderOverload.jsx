import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Spinner, Stack, Table } from 'react-bootstrap';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LogisticsServices from 'services/logistics/LogisticsServices';
import { useAlert } from 'utils/alertContext';

const DEFAULT_PAGE_SIZE = 15;
const STATUSES = ['PENDING_ADJUSTMENT', 'UNLOADED', 'RESOLVED', 'CANCELLED'];
const EMPTY_FILTERS = { search: '', status: '', picklist_no: '', date_from: '', date_to: '' };

const valueOf = (item, keys, fallback = '-') => {
  for (const key of keys) {
    const value = key.split('.').reduce((source, path) => source?.[path], item);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
};

const getPayload = (response) => response?.data?.data ?? response?.data ?? response ?? {};

const getDetail = (response) => {
  const payload = getPayload(response);
  return payload?.overload ?? payload?.record ?? payload?.data ?? payload;
};

const getRows = (response) => {
  const payload = getPayload(response);
  if (Array.isArray(payload)) return payload;
  for (const source of [payload?.overloads, payload?.records, payload]) {
    if (Array.isArray(source)) return source;
    for (const key of ['data', 'items', 'rows', 'results', 'overloads']) {
      if (Array.isArray(source?.[key])) return source[key];
    }
  }
  return [];
};

const getPagination = (response, rowCount, requestedPage, requestedPageSize) => {
  const payload = getPayload(response);
  const collection = payload?.overloads ?? payload?.records ?? payload;
  const meta = collection?.meta ?? collection?.pagination ?? payload?.meta ?? payload?.pagination ?? collection;
  const parsedTotal = Number(meta?.total ?? meta?.total_items ?? payload?.total);
  const total = Number.isFinite(parsedTotal) ? parsedTotal : rowCount;
  const currentPage = Number(meta?.current_page ?? meta?.currentPage ?? meta?.page ?? requestedPage) || requestedPage;
  const perPage = Number(meta?.per_page ?? meta?.perPage ?? requestedPageSize);
  const parsedPageCount = Number(meta?.last_page ?? meta?.lastPage ?? meta?.total_pages);
  const pageCount = requestedPageSize <= 0 ? 1 : parsedPageCount || Math.ceil(total / (perPage > 0 ? perPage : requestedPageSize)) || 1;
  return { total, currentPage, pageCount: Math.max(pageCount, 1) };
};

const formatStatus = (value) =>
  String(value || '-')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const statusVariant = (value) =>
  ({ RESOLVED: 'success', CANCELLED: 'secondary', UNLOADED: 'info', PENDING_ADJUSTMENT: 'warning' })[String(value || '').toUpperCase()] ||
  'warning';

const formatWeight = (value) => {
  const weight = Number(value);
  return Number.isFinite(weight) ? `${weight.toLocaleString('id-ID')} KG` : '-';
};

const formatNumber = (value, maximumFractionDigits = 2) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('id-ID', { maximumFractionDigits }) : '-';
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
};

export default function OrderOverload() {
  const { showAlert } = useAlert();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOverload, setSelectedOverload] = useState(null);
  const [overloadDetail, setOverloadDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const fetchOverloads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await LogisticsServices.getOverload({
        ...appliedFilters,
        per_page: DEFAULT_PAGE_SIZE,
        page: currentPage
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load overload data.');
      }
      const nextRows = getRows(response);
      const pagination = getPagination(response, nextRows.length, currentPage, DEFAULT_PAGE_SIZE);
      setRows(nextRows);
      setTotal(pagination.total);
      setPageCount(pagination.pageCount);
      if (pagination.currentPage !== currentPage) setCurrentPage(pagination.currentPage);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setPageCount(1);
      showAlert(error?.response?.data?.message || error.message || 'Failed to load overload data.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage, showAlert]);

  useEffect(() => {
    fetchOverloads();
  }, [fetchOverloads]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = (event) => {
    event.preventDefault();
    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      showAlert('Date From cannot be later than Date To.', 'warning');
      return;
    }
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  };
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const openOverloadDetail = async (item) => {
    const picklistId = valueOf(item, ['picklist_id', 'picklist.id', 'id'], '');
    if (!picklistId) {
      showAlert('Picklist ID is unavailable.', 'warning');
      return;
    }

    setSelectedOverload(item);
    setOverloadDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await LogisticsServices.getOverloadDetail(picklistId);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load overload detail.');
      }
      setOverloadDetail(getDetail(response));
    } catch (error) {
      setDetailError(error?.response?.data?.message || error.message || 'Failed to load overload detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeOverloadDetail = () => {
    if (detailLoading) return;
    setSelectedOverload(null);
    setOverloadDetail(null);
    setDetailError('');
  };

  const detail = overloadDetail || selectedOverload || {};
  const latestOverload = detail?.latest_overload ?? detail?.latestOverload ?? detail;
  const overloadItems = Array.isArray(detail?.items)
    ? detail.items
    : Array.isArray(latestOverload?.items_snapshot)
      ? latestOverload.items_snapshot
      : [];
  const overloadHistory = Array.isArray(detail?.history) ? detail.history : [];

  return (
    <Stack gap={3}>
      <div>
        <h4 className="mb-1">Overload</h4>
        <span className="text-muted f-12">Monitor and review rejected weigh-out loads.</span>
      </div>
      <MainCard>
        <Form onSubmit={applyFilters} className="mb-4">
          <Row className="g-3">
            <Col xl={3} md={6}>
              <Form.Label>Search</Form.Label>
              <Form.Control
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Picklist, ticket, operator, reason, or vehicle"
              />
            </Col>
            <Col xl={2} md={4}>
              <Form.Label>Status</Form.Label>
              <Form.Select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xl={3} md={6}>
              <Form.Label>Picklist Number</Form.Label>
              <Form.Control
                value={filters.picklist_no}
                onChange={(event) => updateFilter('picklist_no', event.target.value)}
                placeholder="Picklist number"
              />
            </Col>
            <Col xl={2} md={6}>
              <Form.Label>Date From</Form.Label>
              <Form.Control type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
            </Col>
            <Col xl={2} md={6}>
              <Form.Label>Date To</Form.Label>
              <Form.Control type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
            </Col>
            <Col xs={12} className="d-flex flex-wrap align-items-end gap-2">
              <Button type="button" variant="outline-secondary" onClick={resetFilters} disabled={loading}>
                Reset
              </Button>
              <Button type="submit" disabled={loading}>
                <i className="ti ti-filter me-1" /> Apply Filter
              </Button>
              <Button type="button" variant="outline-primary" onClick={fetchOverloads} disabled={loading}>
                <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
              </Button>
            </Col>
          </Row>
        </Form>

        <Table responsive hover bordered className="align-middle mb-0">
          <thead>
            <tr>
              <th>Picklist</th>
              <th>Vehicle</th>
              <th>Operator</th>
              <th className="text-end">Gross Weight</th>
              <th>Rejection Reason</th>
              <th>Notes</th>
              <th>Weighed At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <Spinner size="sm" className="me-2" /> Loading overload data...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((item, index) => (
                <tr key={valueOf(item, ['id', 'overload_id'], index)}>
                  <td>
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      className="d-inline-flex align-items-center gap-2 rounded-pill px-3 fw-semibold text-nowrap"
                      onClick={() => openOverloadDetail(item)}
                      data-permission-action="utility"
                      aria-label={`Open overload information for ${valueOf(item, ['picklist_no', 'picklist_number', 'picklist.picklist_no'])}`}
                    >
                      <i className="ti ti-eye" />
                      {valueOf(item, ['picklist_no', 'picklist_number', 'picklist.picklist_no', 'picklist.document_number'])}
                    </Button>
                  </td>
                  <td>
                    <div>{valueOf(item, ['vehicle_no', 'picklist.vehicle_no', 'picklist.license_plate'])}</div>
                    <small className="text-muted">
                      {valueOf(item, ['driver_name', 'picklist.driver_name'])} / {valueOf(item, ['checker_name', 'picklist.checker_name'])}
                    </small>
                  </td>
                  <td>{valueOf(item, ['operator_name', 'operatorName'])}</td>
                  <td className="text-end fw-semibold">{formatWeight(valueOf(item, ['weight', 'gross_weight'], null))}</td>
                  <td style={{ minWidth: 220 }}>{valueOf(item, ['rejection_reason', 'rejectionReason'])}</td>
                  <td style={{ minWidth: 180 }}>{valueOf(item, ['notes'])}</td>
                  <td className="text-nowrap">{formatDateTime(valueOf(item, ['weighed_at', 'weighedAt'], ''))}</td>
                  <td>
                    <Badge bg={statusVariant(valueOf(item, ['status'], ''))}>{formatStatus(valueOf(item, ['status']))}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-muted py-5">
                  No overload data found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={DEFAULT_PAGE_SIZE}
          total={total}
          itemLabel="overloads"
        />
      </MainCard>

      <Modal show={Boolean(selectedOverload)} onHide={closeOverloadDetail} centered size="xl" scrollable>
        <Modal.Header closeButton={!detailLoading}>
          <Modal.Title>Overload Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner className="me-2" size="sm" /> Loading overload detail...
            </div>
          ) : detailError ? (
            <div className="text-center py-4">
              <i className="ti ti-alert-circle text-danger f-32" />
              <p className="text-danger mt-2 mb-3">{detailError}</p>
              <Button variant="outline-primary" onClick={() => openOverloadDetail(selectedOverload)}>
                Retry
              </Button>
            </div>
          ) : (
            <Stack gap={4}>
              <div className="border rounded p-3 bg-light bg-opacity-10 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <small className="text-muted text-uppercase fw-semibold">Picklist</small>
                  <h4 className="mb-1">{valueOf(detail, ['picklist_no'])}</h4>
                </div>
                <Stack direction="horizontal" gap={2}>
                  <Badge bg={statusVariant(valueOf(latestOverload, ['status'], ''))} className="px-3 py-2">
                    {formatStatus(valueOf(latestOverload, ['status']))}
                  </Badge>
                  <Badge bg="danger" className="px-3 py-2">
                    {formatStatus(valueOf(detail, ['weight_check_status', 'status']))}
                  </Badge>
                </Stack>
              </div>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-scale me-2 text-primary" />
                  Weight Summary
                </h6>
                <Row className="g-3">
                  {[
                    [
                      'Weight Limit',
                      valueOf(detail, ['total_weight_limit'], valueOf(latestOverload, ['weight_limit'], null)),
                      'text-primary'
                    ],
                    ['Tare / Weigh In', valueOf(detail, ['weigh_in_weight'], valueOf(latestOverload, ['tare_weight'], null)), 'text-info'],
                    [
                      'Gross / Weigh Out',
                      valueOf(detail, ['weigh_out_weight'], valueOf(latestOverload, ['gross_weight'], null)),
                      'text-warning'
                    ],
                    [
                      'Net Weight',
                      valueOf(detail, ['weigh_out_net_weight'], valueOf(latestOverload, ['net_weight'], null)),
                      'text-success'
                    ],
                    ['Overload Weight', valueOf(latestOverload, ['overload_weight'], null), 'text-danger']
                  ].map(([label, value, color]) => (
                    <Col xl md={4} sm={6} key={label}>
                      <div className="border rounded p-3 h-100 text-center">
                        <small className="text-muted text-uppercase fw-semibold">{label}</small>
                        <div className={`fs-4 fw-bold mt-2 ${color}`}>{formatWeight(value)}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </section>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-clipboard-data me-2 text-primary" />
                  Weigh-Out Information
                </h6>
                <Row className="g-3">
                  {[
                    ['Ticket Number', valueOf(latestOverload, ['ticket_no'])],
                    ['Operator', valueOf(latestOverload, ['operator_name'])],
                    ['Weighed At', formatDateTime(valueOf(latestOverload, ['weighed_at'], ''))],
                    ['Action Taken', valueOf(latestOverload, ['action_taken'])],
                    ['Resolved By', valueOf(latestOverload, ['resolved_by'])],
                    ['Resolved At', formatDateTime(valueOf(latestOverload, ['resolved_at'], ''))]
                  ].map(([label, value]) => (
                    <Col lg={4} md={6} key={label}>
                      <div className="border rounded p-3 h-100">
                        <small className="text-muted text-uppercase fw-semibold">{label}</small>
                        <div className="fw-semibold mt-1">{value}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
                <div className="border border-danger border-opacity-50 rounded p-3 mt-3">
                  <small className="text-danger text-uppercase fw-semibold">Rejection Reason</small>
                  <div className="fw-semibold mt-1">{valueOf(latestOverload, ['rejection_reason'])}</div>
                </div>
              </section>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-packages me-2 text-primary" />
                  Picklist Items ({overloadItems.length})
                </h6>
                <Table responsive bordered hover size="sm" className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Sales Order / Customer</th>
                      <th>Warehouse / Bin</th>
                      <th className="text-end">Ordered</th>
                      <th className="text-end">Picked</th>
                      <th className="text-end">Unit Weight</th>
                      <th className="text-end">Total Weight</th>
                      <th>Checker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overloadItems.length ? (
                      overloadItems.map((item, index) => (
                        <tr key={valueOf(item, ['id'], index)}>
                          <td>
                            <div className="fw-semibold">{valueOf(item, ['item_code'])}</div>
                            <small className="text-muted">{valueOf(item, ['item_name'])}</small>
                          </td>
                          <td>
                            <div>{valueOf(item, ['sales_order.order_no', 'order_no', 'so_number'])}</div>
                            <small className="text-muted">{valueOf(item, ['sales_order.customer_name'])}</small>
                          </td>
                          <td>
                            <div>{valueOf(item, ['whs_code'])}</div>
                            <small className="text-muted">{valueOf(item, ['bin_allocations.0.code'])}</small>
                          </td>
                          <td className="text-end">{formatNumber(valueOf(item, ['ordered_qty'], null))}</td>
                          <td className="text-end">
                            {formatNumber(valueOf(item, ['pick_qty'], null))} {valueOf(item, ['unit_msr', 'uom'], '')}
                          </td>
                          <td className="text-end">{formatWeight(valueOf(item, ['unit_weight'], null))}</td>
                          <td className="text-end fw-semibold">{formatWeight(valueOf(item, ['total_weight'], null))}</td>
                          <td>
                            <div>{valueOf(item, ['checked_by_checker'])}</div>
                            <small className="text-muted">{formatDateTime(valueOf(item, ['checked_at'], ''))}</small>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No picklist items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </section>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-history me-2 text-primary" />
                  Overload History ({overloadHistory.length})
                </h6>
                <Table responsive bordered size="sm" className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Weighed At</th>
                      <th>Status</th>
                      <th>Operator</th>
                      <th className="text-end">Gross</th>
                      <th className="text-end">Tare</th>
                      <th className="text-end">Net</th>
                      <th className="text-end">Overload</th>
                      <th>Reason / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overloadHistory.length ? (
                      overloadHistory.map((history, index) => (
                        <tr key={valueOf(history, ['id'], index)}>
                          <td className="text-nowrap">{formatDateTime(valueOf(history, ['weighed_at'], ''))}</td>
                          <td>
                            <Badge bg={statusVariant(valueOf(history, ['status'], ''))}>{formatStatus(valueOf(history, ['status']))}</Badge>
                          </td>
                          <td>{valueOf(history, ['operator_name'])}</td>
                          <td className="text-end">{formatWeight(valueOf(history, ['gross_weight'], null))}</td>
                          <td className="text-end">{formatWeight(valueOf(history, ['tare_weight'], null))}</td>
                          <td className="text-end">{formatWeight(valueOf(history, ['net_weight'], null))}</td>
                          <td className="text-end text-danger fw-semibold">{formatWeight(valueOf(history, ['overload_weight'], null))}</td>
                          <td>
                            <div>{valueOf(history, ['rejection_reason'])}</div>
                            <small className="text-muted">{valueOf(history, ['action_taken'])}</small>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No overload history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </section>
            </Stack>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeOverloadDetail} disabled={detailLoading}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
