import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Form, InputGroup, Modal, Overlay, Spinner, Stack, Table } from 'react-bootstrap';
import MainCard from '../../../components/MainCard';
import TablePagination from '../../../components/TablePagination';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import { useAlert } from '../../../utils/alertContext';
import CreatePicklistModal from '../dashboard/CreatePicklistModal';
import './picklist.scss';

const getRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'picklists', 'rows', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const getPagination = (response, rowCount) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const meta = response?.data?.meta ?? payload?.meta ?? payload;
  const total = Number(meta?.total ?? meta?.total_items ?? response?.data?.total ?? rowCount) || 0;
  const currentPage = Number(meta?.current_page ?? meta?.currentPage ?? response?.data?.current_page ?? 1) || 1;
  const pageCount = Number(meta?.last_page ?? meta?.lastPage ?? meta?.total_pages ?? response?.data?.last_page ?? Math.ceil(total / 10)) || 1;
  return { total, currentPage, pageCount: Math.max(pageCount, 1) };
};

const valueOf = (item, keys, fallback = '-') => {
  const value = keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '');
  return value ?? fallback;
};

const formatStatus = (value) =>
  String(value || '-')
    .trim()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusVariant = (value) => {
  const status = String(value || '').toUpperCase();
  if (status.includes('CANCEL') || status.includes('REJECT')) return 'danger';
  if (status.includes('COMPLETE') || status.includes('APPROVE') || status.includes('POSTED')) return 'success';
  if (status.includes('PENDING') || status.includes('DRAFT')) return 'warning';
  return 'secondary';
};

const shippingTypeVariant = (value) => {
  const type = String(value || '').toLowerCase();
  if (type === 'internal') return 'primary';
  if (type === 'external') return 'success';
  if (type === 'pickup') return 'warning';
  return 'secondary';
};

const getExpeditionName = (item) => {
  const expedition = item?.expedition_data ?? item?.expedition;
  if (expedition && typeof expedition === 'object') {
    return valueOf(expedition, ['name', 'expedition_name', 'code', 'expedition_code']);
  }
  return valueOf(item, ['expedition_name', 'expedition_code'], expedition || '-');
};

const formatDate = (value) => {
  if (!value) return '-';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '-';
  const [, year, month, day] = match;
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  );
  return `${day} ${monthName} ${year}`;
};

const formatWholeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number).toLocaleString('en-US') : '0';
};

const getDetail = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  return payload?.picklist ?? payload?.data ?? payload;
};

export default function Picklist() {
  const { showAlert } = useAlert();
  const [picklists, setPicklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actionMenu, setActionMenu] = useState(null);

  const fetchPicklists = useCallback(async () => {
    setLoading(true);
    try {
      const response = await LogisticsServices.getPicklist({ search: query.trim(), per_page: 10, page: currentPage });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load picklists.');
      }
      const rows = getRows(response);
      const pagination = getPagination(response, rows.length);
      setPicklists(rows);
      setTotal(pagination.total);
      setPageCount(pagination.pageCount);
      if (pagination.currentPage !== currentPage) setCurrentPage(pagination.currentPage);
    } catch (error) {
      setPicklists([]);
      setTotal(0);
      setPageCount(1);
      showAlert(error?.response?.data?.message || error.message || 'Failed to load picklists.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [currentPage, query, showAlert]);

  useEffect(() => {
    const timeout = setTimeout(fetchPicklists, 300);
    return () => clearTimeout(timeout);
  }, [fetchPicklists]);

  const openDetail = async (item, mode) => {
    const id = valueOf(item, ['id', 'picklist_id', 'doc_entry'], '');
    if (id === '') return;
    setDetail(item);
    setDetailMode(mode);
    setDetailError('');
    setLoadingDetail(true);
    try {
      const response = await LogisticsServices.getDetailPicklist(id);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load picklist detail.');
      }
      setDetail(getDetail(response));
    } catch (error) {
      setDetailError(error?.response?.data?.message || error.message || 'Failed to load picklist detail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    if (loadingDetail) return;
    setDetail(null);
    setDetailError('');
  };

  return (
    <Stack gap={3}>
      <Stack direction="horizontal" className="justify-content-between flex-wrap" gap={3}>
        <div>
          <h4 className="mb-1">Picklist</h4>
          <span className="text-muted f-12">Manage logistics picklists and warehouse allocations.</span>
        </div>
        <Button data-permission-action="add" onClick={() => setShowCreate(true)}>
          <i className="ti ti-plus me-1" /> Create Picklist
        </Button>
      </Stack>

      <MainCard>
        <Stack direction="horizontal" className="justify-content-between flex-wrap mb-3" gap={3}>
          <InputGroup style={{ maxWidth: 420 }}>
            <InputGroup.Text><i className="ti ti-search" /></InputGroup.Text>
            <Form.Control
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search picklist, vehicle, or driver..."
            />
          </InputGroup>
          <Button variant="outline-secondary" disabled={loading} onClick={fetchPicklists}>
            <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
          </Button>
        </Stack>

        <Table responsive hover bordered className="align-middle mb-0">
          <thead>
            <tr>
              <th>Picklist / Shipping Type</th>
              <th>Expedition</th>
              <th>Posting Date</th>
              <th>Vehicle / Driver</th>
              <th>Checker</th>
              <th className="text-end">Items</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-5"><Spinner size="sm" className="me-2" />Loading picklists...</td>
              </tr>
            ) : picklists.length ? (
              picklists.map((item, index) => {
                const id = valueOf(item, ['id', 'picklist_id', 'doc_entry'], index);
                const status = valueOf(item, ['status', 'picklist_status'], '-');
                const shippingType = valueOf(item, ['shipping_type'], '');
                const items = Array.isArray(item.items) ? item.items.length : Number(item.total_items ?? item.item_count ?? 0);
                return (
                  <tr key={id}>
                    <td>
                      <div className="fw-semibold mb-1">
                        {valueOf(item, ['picklist_number', 'picklist_no', 'document_number', 'doc_num', 'code', 'id'])}
                      </div>
                      <Badge bg={shippingTypeVariant(shippingType)} className="text-capitalize">
                        {shippingType || '-'}
                      </Badge>
                    </td>
                    <td>{String(shippingType).toLowerCase() === 'internal' ? '' : getExpeditionName(item)}</td>
                    <td>{formatDate(valueOf(item, ['posting_date'], ''))}</td>
                    <td>
                      <Badge bg="info" text="dark" className="fs-6 px-2 py-1 mb-1">
                        {valueOf(item, ['license_plate'])}
                      </Badge>
                      <small className="text-muted d-block">{valueOf(item, ['driver_name'])}</small>
                    </td>
                    <td>{valueOf(item, ['checker_name'])}</td>
                    <td className="text-end fw-semibold">{items}</td>
                    <td><Badge bg={statusVariant(status)}>{formatStatus(status)}</Badge></td>
                    <td className="text-center">
                      <Button
                        variant={actionMenu?.item === item ? 'primary' : 'outline-primary'}
                        size="sm"
                        aria-label={`Open actions for picklist ${id}`}
                        aria-expanded={actionMenu?.item === item}
                        onClick={(event) =>
                          setActionMenu((current) =>
                            current?.item === item ? null : { item, target: event.currentTarget }
                          )
                        }
                      >
                        <i className="ti ti-dots-vertical me-1" /> Actions
                        <i className="ti ti-chevron-down ms-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={8} className="text-center text-muted py-5">No picklists found.</td></tr>
            )}
          </tbody>
        </Table>
        {!loading && (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={10}
            total={total}
            itemLabel="picklists"
          />
        )}
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
          <div
            ref={ref}
            className="dropdown-menu show"
            data-popper-placement={placement}
            style={{ ...style, zIndex: 1080, minWidth: 170 }}
          >
            <button
              type="button"
              className="dropdown-item"
              data-permission-action="view"
              onClick={() => {
                const item = actionMenu?.item;
                setActionMenu(null);
                openDetail(item, 'view');
              }}
            >
              <i className="ti ti-eye text-primary me-2" /> View
            </button>
            <button
              type="button"
              className="dropdown-item"
              data-permission-action="edit"
              onClick={() => {
                const item = actionMenu?.item;
                setActionMenu(null);
                openDetail(item, 'load');
              }}
            >
              <i className="ti ti-truck-loading text-success me-2" /> Load
            </button>
          </div>
        )}
      </Overlay>

      {showCreate && (
        <CreatePicklistModal
          onClose={() => setShowCreate(false)}
          onSuccess={fetchPicklists}
        />
      )}

      <Modal
        show={Boolean(detail)}
        onHide={closeDetail}
        dialogClassName="picklist-detail-modal"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingDetail}>
          <Modal.Title>{detailMode === 'load' ? 'Load Picklist' : 'Picklist Detail'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetail ? (
            <div className="text-center py-5"><Spinner className="me-2" />Loading picklist detail...</div>
          ) : detailError ? (
            <div className="alert alert-danger mb-0">{detailError}</div>
          ) : detail ? (
            <>
              <div className="bg-light border rounded p-3 mb-4">
                <div className="row g-3">
                  <div className="col-md-3">
                    <small className="text-muted d-block">Picklist</small>
                    <strong>{valueOf(detail, ['picklist_number', 'picklist_no', 'document_number', 'doc_num', 'code', 'id'])}</strong>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">Shipping Type</small>
                    <strong className="text-capitalize">{valueOf(detail, ['shipping_type'])}</strong>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">Posting Date</small>
                    <strong>{formatDate(valueOf(detail, ['posting_date'], ''))}</strong>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">Status</small>
                    <Badge bg={statusVariant(valueOf(detail, ['status', 'picklist_status'], ''))}>
                      {formatStatus(valueOf(detail, ['status', 'picklist_status']))}
                    </Badge>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Vehicle</small>
                    <strong>{valueOf(detail, ['license_plate'])}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Driver</small>
                    <strong>{valueOf(detail, ['driver_name'])}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Checker</small>
                    <strong>{valueOf(detail, ['checker_name'])}</strong>
                  </div>
                  <div className="col-12">
                    <small className="text-muted d-block">Comments</small>
                    <div className="text-break">{valueOf(detail, ['comments', 'Comments', 'comment', 'remarks', 'Remarks'])}</div>
                  </div>
                </div>
              </div>
              <Table responsive bordered className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Warehouse</th>
                    <th className="text-end">Ordered Qty</th>
                    <th className="text-end">Pick Qty</th>
                    <th>Bin Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(detail.items) ? detail.items : detail.details || []).map((item, index) => {
                    const allocations = item.bin_allocations || item.binAllocations || [];
                    return (
                      <tr key={item.id ?? item.sales_order_detail_id ?? index}>
                        <td>
                          <div className="fw-semibold">{valueOf(item, ['item_code', 'itemCode'])}</div>
                          <small className="text-muted">{valueOf(item, ['item_name', 'itemName', 'description'])}</small>
                        </td>
                        <td>
                          <div className="fw-semibold">{valueOf(item.sales_order, ['customer_name'])}</div>
                          <small className="text-muted d-block">{valueOf(item, ['depo'])}</small>
                        </td>
                        <td>{valueOf(item, ['whs_code', 'warehouse_code', 'warehouse'])}</td>
                        <td className="text-end">{formatWholeNumber(valueOf(item, ['ordered_qty', 'orderedQuantity'], 0))}</td>
                        <td className="text-end fw-semibold">{formatWholeNumber(valueOf(item, ['pick_qty', 'pickQuantity'], 0))}</td>
                        <td>
                          {allocations.length
                            ? allocations
                                .map(
                                  (bin) =>
                                    `${valueOf(bin, ['code', 'bin_code'])}: ${formatWholeNumber(valueOf(bin, ['Quantity', 'quantity'], 0))}`
                                )
                                .join(', ')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {!(Array.isArray(detail.items) ? detail.items : detail.details || []).length && (
                    <tr><td colSpan={6} className="text-center text-muted py-4">No item details found.</td></tr>
                  )}
                </tbody>
              </Table>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={closeDetail} disabled={loadingDetail}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
