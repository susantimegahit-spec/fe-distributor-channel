import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Col, Form, OverlayTrigger, Row, Spinner, Stack, Table, Tooltip } from 'react-bootstrap';
import MainCard from '../../../components/MainCard';
import TablePagination from '../../../components/TablePagination';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import RateTypeServices from '../../../services/logistics/RateTypeServices';
import { useAlert } from '../../../utils/alertContext';
import './worker-management.scss';

const toDateInputValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getInitialFilters = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  return {
    status: '',
    shipping_type: '',
    rate_type: '',
    search: '',
    date_from: toDateInputValue(new Date(year, month, 1)),
    date_to: toDateInputValue(new Date(year, month + 1, 0))
  };
};

const pageSize = 15;

const getPayload = (response) => {
  const root = response?.data ?? {};
  return root?.data && !Array.isArray(root.data) ? root.data : root;
};

const getRows = (response) => {
  const payload = getPayload(response);
  const collection = payload?.picklists ?? payload?.worker_management ?? payload?.workerManagement ?? payload;
  if (Array.isArray(collection)) return collection;
  for (const source of [collection, payload]) {
    for (const key of ['data', 'items', 'picklists', 'rows', 'results']) {
      if (Array.isArray(source?.[key])) return source[key];
    }
  }
  return [];
};

const getRateTypeRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.data ?? payload?.items ?? payload?.loading_rate_types ?? payload?.loadingRateTypes ?? []);
  return Array.isArray(rows) ? rows : [];
};

const getPagination = (response, rowCount, requestedPage) => {
  const root = response?.data ?? {};
  const payload = getPayload(response);
  const collection = payload?.picklists ?? payload?.worker_management ?? payload?.workerManagement ?? payload;
  const meta =
    collection?.pagination ?? payload?.pagination ?? root?.pagination ?? collection?.meta ?? payload?.meta ?? root?.meta ?? collection;
  const parsedTotal = Number(meta?.total ?? meta?.total_items ?? payload?.total ?? root?.total);
  const total = Number.isFinite(parsedTotal) ? parsedTotal : rowCount;
  const currentPage = Number(meta?.current_page ?? meta?.currentPage ?? meta?.page ?? requestedPage) || requestedPage;
  const perPage = Number(meta?.per_page ?? meta?.perPage) || pageSize;
  const pageCount = Number(meta?.last_page ?? meta?.lastPage ?? meta?.total_pages ?? payload?.last_page) || Math.ceil(total / perPage) || 1;
  return { total, currentPage, pageCount: Math.max(pageCount, 1) };
};

const valueOf = (item, keys, fallback = '-') => {
  const value = keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '');
  return value ?? fallback;
};

const formatLabel = (value) =>
  String(value || '-')
    .trim()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('id-ID') : '-';
};

const formatCurrency = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number)
    : '-';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const formatTime = (value) => {
  if (!value) return '-';
  const stringValue = String(value);
  const match = stringValue.match(/(?:T|\s)?(\d{2}:\d{2})(?::\d{2})?/);
  return match?.[1] || stringValue;
};

const getWorkerTime = (worker, picklist, keys) => valueOf(worker, keys, '') || valueOf(picklist, keys, '');

const normalizeRateType = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const rateTypeVariant = (value) => {
  const rateType = normalizeRateType(value);
  if (rateType === 'OVERTIME') return 'danger';
  if (rateType === 'REGULAR') return 'success';
  return 'secondary';
};

const findRateTypeMaster = (rateTypes, value) => {
  const expected = normalizeRateType(value);
  return rateTypes.find((rateType) => ['code', 'name', 'rate_type', 'type'].some((key) => normalizeRateType(rateType?.[key]) === expected));
};

const statusVariant = (value) => {
  const status = String(value || '').toUpperCase();
  if (status.includes('COMPLETE')) return 'success';
  if (status.includes('WEIGH')) return 'primary';
  if (status.includes('CANCEL') || status.includes('REJECT')) return 'danger';
  return 'secondary';
};

const getWorkers = (item) => {
  if (Array.isArray(item?.workers)) return item.workers;
  if (Array.isArray(item?.worker_details)) return item.worker_details;
  return [];
};

const numericValue = (item, keys) => {
  const number = Number(valueOf(item, keys, 0));
  return Number.isFinite(number) ? number : 0;
};

const formatWorkerName = (worker) => {
  const value = [worker?.worker_name, worker?.name].find((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '');
  const normalizedValue = String(value ?? '').trim();
  return !normalizedValue || ['null', 'undefined'].includes(normalizedValue.toLowerCase()) ? '-' : normalizedValue;
};

export default function WorkerManagement() {
  const { showAlert } = useAlert();
  const [filters, setFilters] = useState(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(getInitialFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [rateTypes, setRateTypes] = useState([]);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await LogisticsServices.getWorkerManagement({
        ...appliedFilters,
        per_page: pageSize,
        page: currentPage
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load worker management data.');
      }
      const nextRows = getRows(response);
      const pagination = getPagination(response, nextRows.length, currentPage);
      setRows(nextRows);
      setTotal(pagination.total);
      setPageCount(pagination.pageCount);
      if (pagination.currentPage !== currentPage) setCurrentPage(pagination.currentPage);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setPageCount(1);
      showAlert(error?.response?.data?.message || error.message || 'Failed to load worker management data.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage, showAlert]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    let active = true;
    RateTypeServices.getLoadingRateType({ per_page: 100 })
      .then((response) => {
        if (active) setRateTypes(getRateTypeRows(response));
      })
      .catch(() => {
        if (active) setRateTypes([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters(filters);
  };
  const resetFilters = () => {
    const initialFilters = getInitialFilters();
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setCurrentPage(1);
  };
  const pageTotals = rows.reduce(
    (totals, item) => {
      const workers = getWorkers(item);
      const displayWorkers = workers.length ? workers : [item];
      displayWorkers.forEach((worker) => {
        totals.qty += numericValue(worker, ['qty', 'quantity']);
        totals.fee += numericValue(worker, ['overtime_fee', 'fee', 'total_fee']);
      });
      return totals;
    },
    { qty: 0, fee: 0 }
  );

  return (
    <Stack gap={3}>
      <div>
        <h4 className="mb-1">Workers</h4>
        <span className="text-muted f-12">Monitor loading workers, quantities, and overtime rates by picklist.</span>
      </div>

      <MainCard>
        <Form onSubmit={applyFilters} className="mb-4">
          <Row className="g-3">
            <Col xl={6} md={12}>
              <Form.Label>Search</Form.Label>
              <Form.Control
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Picklist, DO, vehicle, driver, checker, or worker"
              />
            </Col>
            <Col xl={2} md={4}>
              <Form.Label>Status</Form.Label>
              <Form.Select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All statuses</option>
                <option value="weigh_out">Weigh Out</option>
                <option value="complete">Complete</option>
              </Form.Select>
            </Col>
            <Col xl={2} md={4}>
              <Form.Label>Shipping Type</Form.Label>
              <Form.Select value={filters.shipping_type} onChange={(event) => updateFilter('shipping_type', event.target.value)}>
                <option value="">All types</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="pickup">Pickup</option>
              </Form.Select>
            </Col>
            <Col xl={2} md={4}>
              <Form.Label>Rate Type</Form.Label>
              <Form.Select value={filters.rate_type} onChange={(event) => updateFilter('rate_type', event.target.value)}>
                <option value="">All rates</option>
                <option value="REGULAR">Regular</option>
                <option value="OVERTIME">Overtime</option>
              </Form.Select>
            </Col>
            <Col xl={3} md={6}>
              <Form.Label>Date From</Form.Label>
              <Form.Control type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
            </Col>
            <Col xl={3} md={6}>
              <Form.Label>Date To</Form.Label>
              <Form.Control type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
            </Col>
            <Col xl={6} md={12} className="d-flex flex-wrap align-items-end justify-content-xl-end gap-2">
              <Button type="button" variant="outline-secondary" onClick={resetFilters} disabled={loading}>
                Reset
              </Button>
              <Button type="submit" disabled={loading}>
                <i className="ti ti-filter me-1" /> Apply Filter
              </Button>
              <Button type="button" variant="outline-primary" onClick={fetchWorkers} disabled={loading}>
                <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
              </Button>
            </Col>
          </Row>
        </Form>

        <Table responsive hover bordered className="align-middle mb-0">
          <thead>
            <tr>
              <th>Picklist / DO</th>
              <th>Date</th>
              <th>Shipping</th>
              <th>Vehicle / Driver</th>
              <th>Worker</th>
              <th>Item</th>
              <th className="text-end">Qty</th>
              <th className="text-center">Rate Type</th>
              <th className="text-end">Total Fee / Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-5">
                  <Spinner size="sm" className="me-2" /> Loading workers...
                </td>
              </tr>
            ) : rows.length ? (
              rows.flatMap((item, itemIndex) => {
                const workers = getWorkers(item);
                const displayWorkers = workers.length ? workers : [item];
                return displayWorkers.map((worker, workerIndex) => (
                  <tr key={`${valueOf(item, ['id', 'picklist_id'], itemIndex)}-${valueOf(worker, ['id'], workerIndex)}`}>
                    <td>
                      <div className="fw-semibold">{valueOf(item, ['picklist_number', 'picklist_no', 'document_number', 'id'])}</div>
                      <small className="text-muted">DO: {valueOf(item, ['delivery_order_number', 'do_number', 'doc_num'])}</small>
                    </td>
                    <td>{formatDate(valueOf(item, ['posting_date', 'date', 'created_at'], ''))}</td>
                    <td className="text-capitalize">{valueOf(item, ['shipping_type'])}</td>
                    <td>
                      <div>{valueOf(item, ['license_plate', 'no_pol'])}</div>
                      <small className="text-muted">{valueOf(item, ['driver_name', 'driver'])}</small>
                    </td>
                    <td>{formatWorkerName(worker)}</td>
                    <td>
                      <div className="fw-semibold">{valueOf(worker, ['item_code', 'item'])}</div>
                      <small className="text-muted">
                        {valueOf(worker, ['item_name', 'item_description', 'description', 'product_name'])}
                      </small>
                    </td>
                    <td className="text-end fw-semibold">{formatNumber(valueOf(worker, ['qty', 'quantity'], 0))}</td>
                    <td className="text-center">
                      {(() => {
                        const rateType = valueOf(worker, ['rate_type'], '');
                        const rateTypeMaster = findRateTypeMaster(rateTypes, rateType);
                        const masterStartTime = formatTime(valueOf(rateTypeMaster, ['start_time', 'startTime'], ''));
                        const masterEndTime = formatTime(valueOf(rateTypeMaster, ['end_time', 'endTime'], ''));
                        const workerStartTime = formatTime(getWorkerTime(worker, item, ['start_time', 'startTime']));
                        const workerEndTime = formatTime(getWorkerTime(worker, item, ['end_time', 'endTime']));
                        return (
                          <Stack gap={1} className="align-items-center">
                            <OverlayTrigger
                              trigger="click"
                              rootClose
                              placement="top"
                              overlay={
                                <Tooltip>
                                  <div className="fw-semibold">{formatLabel(rateType)}</div>
                                  <div>
                                    Master hours: {masterStartTime} - {masterEndTime}
                                  </div>
                                </Tooltip>
                              }
                            >
                              <Badge
                                as="button"
                                type="button"
                                bg={rateTypeVariant(rateType)}
                                className="border-0 d-inline-flex align-items-center gap-1"
                                data-permission-action="utility"
                              >
                                {formatLabel(rateType)} <i className="ti ti-info-circle" />
                              </Badge>
                            </OverlayTrigger>
                            <small className="worker-rate-time text-muted text-nowrap">
                              {workerStartTime} - {workerEndTime}
                            </small>
                          </Stack>
                        );
                      })()}
                    </td>
                    <td className="text-end">
                      <div className="fs-5 fw-bold text-success">
                        {formatCurrency(valueOf(worker, ['overtime_fee', 'fee', 'total_fee'], 0))}
                      </div>
                      <small className="text-muted">Rate: {formatCurrency(valueOf(worker, ['rate'], 0))}</small>
                    </td>
                    <td>
                      <Badge bg={statusVariant(valueOf(item, ['status', 'picklist_status'], ''))}>
                        {formatLabel(valueOf(item, ['status', 'picklist_status']))}
                      </Badge>
                    </td>
                  </tr>
                ));
              })
            ) : (
              <tr>
                <td colSpan={10} className="text-center text-muted py-5">
                  No worker management data found.
                </td>
              </tr>
            )}
          </tbody>
          {!loading && rows.length ? (
            <tfoot>
              <tr className="worker-management-total fw-bold">
                <td colSpan={6} className="text-end">
                  Total (this page)
                </td>
                <td className="text-end">{formatNumber(pageTotals.qty)}</td>
                <td />
                <td className="worker-management-total-fee text-end fs-5">{formatCurrency(pageTotals.fee)}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </Table>
        {!loading && (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={total}
            itemLabel="picklists"
          />
        )}
      </MainCard>
    </Stack>
  );
}
