import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LogisticsServices from 'services/logistics/LogisticsServices';
import RescheduleOrderActions from '../../customer-portal/dashboard/RescheduleOrderActions';
import RescheduleLogModal from '../../customer-portal/dashboard/RescheduleLogModal';

const PAGE_SIZE = 10;
const LOGISTIC_STATUS_COLORS = {
  PENDING: '#92400e',
  RESCHEDULE_REQUESTED: '#7c3aed',
  RESCHEDULE_APPROVED: '#0e7490',
  RESCHEDULE_REJECTED: '#be123c',
  APPROVED: '#1d4ed8'
};

const formatDate = (value) => {
  if (!value) return '-';
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getOrderLines = (order) => order.details || order.lines || order.document_lines || [];
const getOrderWeight = (order) =>
  getOrderLines(order).reduce((total, line) => {
    const productName = line.item_name || line.item?.item_name || line.description || '';
    const match = [...String(productName).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)].at(-1);
    const unitWeight = match ? Number(match[1].replace(',', '.')) / (/^(g|gr|gram)$/i.test(match[2]) ? 1000 : 1) : 0;
    return total + unitWeight * (Number(line.quantity ?? line.qty ?? 0) || 0);
  }, 0);

const getOrderPage = (response, requestedPage) => {
  const root = response?.data ?? {};
  const payload = root?.data && !Array.isArray(root.data) ? root.data : root;
  const page = payload?.orders || payload?.data || payload;
  const rows = Array.isArray(page) ? page : page?.data || page?.items || [];
  const meta = payload?.pagination || payload?.meta || page?.pagination || page?.meta || page;
  const total = Number(meta?.total ?? payload?.total ?? rows.length) || 0;

  return {
    rows: Array.isArray(rows) ? rows : [],
    total,
    currentPage: Number(meta?.current_page ?? meta?.page ?? payload?.current_page ?? requestedPage) || requestedPage,
    pageCount:
      Number(meta?.last_page ?? meta?.lastPage ?? payload?.last_page ?? 0) ||
      Math.max(Math.ceil(total / (Number(meta?.per_page) || PAGE_SIZE)), 1)
  };
};

const normalizeOrder = (order) => {
  const salesOrder = { ...order, ...(order.sales_order || order.order || {}) };
  const firstLine = getOrderLines(salesOrder)[0] || {};
  const orderId = salesOrder.id ?? salesOrder.sales_order_id ?? salesOrder.order_id ?? salesOrder.DocEntry ?? salesOrder.doc_entry;

  return {
    ...salesOrder,
    id: orderId,
    orderNumber: salesOrder.order_number,
    customer: salesOrder.customer_name || salesOrder.distributor?.name || '-',
    depo: salesOrder.depo || '-',
    originCode: salesOrder.origin_code || firstLine.whs_code || '-',
    origin: salesOrder.origin_name || firstLine.whs_name || firstLine.warehouse?.whs_name || firstLine.whs_code || '-',
    weight: Number(salesOrder.total_weight_kg ?? salesOrder.total_kg ?? salesOrder.weight ?? getOrderWeight(salesOrder)) || 0,
    loadingDate: formatDate(salesOrder.doc_due_date),
    etaDate: formatDate(salesOrder.eta_date),
    proposedEtaDate: formatDate(salesOrder.proposed_eta_date ?? salesOrder.proposedEtaDate),
    status: String(salesOrder.status || '')
      .trim()
      .toUpperCase(),
    logisticStatus: String(salesOrder.logistic_status || salesOrder.logisticStatus || '')
      .trim()
      .toUpperCase()
  };
};

export default function OrderReadyWidget() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const requestIdRef = useRef(0);

  const fetchOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await LogisticsServices.getLogisticOrders({ search: debouncedSearch, per_page: PAGE_SIZE, page });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load orders ready for packing');
      }
      if (requestId !== requestIdRef.current) return;

      const result = getOrderPage(response, page);
      setOrders(result.rows.map(normalizeOrder));
      setTotal(result.total);
      setPageCount(result.pageCount);
      if (result.currentPage !== page) setPage(result.currentPage);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      setOrders([]);
      setTotal(0);
      setPageCount(1);
      setError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load orders ready for packing');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <>
      <MainCard className="h-100 sm-order-ready-widget">
        <Stack direction="horizontal" className="justify-content-between mb-4 flex-wrap" gap={3}>
          <div>
            <h5 className="mb-1">Orders Ready for Packing</h5>
            <span className="text-muted f-12">Orders awaiting packing by the Logistics team.</span>
          </div>
          <Stack direction="horizontal" gap={2} className="flex-wrap">
            <Form.Control
              type="search"
              aria-label="Search packing orders"
              placeholder="Search orders..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              style={{ width: 220 }}
            />
            <Button size="sm" variant="light-primary" onClick={fetchOrders} disabled={loading}>
              <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
            </Button>
          </Stack>
        </Stack>

        <Table responsive hover className="sm-order-ready-table mb-0 align-middle">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer / Depo</th>
              <th>Origin</th>
              <th className="text-end">Weight</th>
              <th>Loading Date</th>
              <th>ETA Date</th>
              <th>Proposed ETA</th>
              <th>Status</th>
              <th>Logistic Status</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-4">
                  Loading Sales Orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={10} className="text-center text-danger py-4">
                  {error}
                </td>
              </tr>
            ) : orders.length ? (
              orders.map((order) => (
                <tr key={order.id || order.orderNumber}>
                  <td>
                    <button
                      type="button"
                      className="sm-logistics-order-number"
                      data-permission-action="utility"
                      disabled={!order.id}
                      aria-label={`View negotiation history for order ${order.orderNumber}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      {order.orderNumber}
                    </button>
                  </td>
                  <td>
                    <div className="fw-semibold">{order.customer}</div>
                    <small className="text-muted d-block">{order.depo}</small>
                  </td>
                  <td>
                    <div>{order.origin}</div>
                    <small className="text-muted">{order.originCode}</small>
                  </td>
                  <td className="text-end fw-semibold">{order.weight.toLocaleString('id-ID')} kg</td>
                  <td>{order.loadingDate}</td>
                  <td>{order.etaDate}</td>
                  <td>{order.proposedEtaDate}</td>
                  <td>
                    <Badge
                      bg={order.status === 'ORDER_APPROVED' ? 'success' : 'warning'}
                      text={order.status === 'ORDER_APPROVED' ? 'light' : 'dark'}
                    >
                      {order.status ? order.status.replaceAll('_', ' ') : '-'}
                    </Badge>
                  </td>
                  <td>
                    {order.logisticStatus ? (
                      <Badge bg="" style={{ backgroundColor: LOGISTIC_STATUS_COLORS[order.logisticStatus] || '#6b7280', color: '#ffffff' }}>
                        {order.logisticStatus.replaceAll('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-end">
                    {order.status === 'ORDER_APPROVED' && !['APPROVED', 'RESCHEDULE_APPROVED'].includes(order.logisticStatus) ? (
                      <RescheduleOrderActions order={order} onSuccess={fetchOrders} />
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="text-center text-muted py-4">
                  No logistics orders found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          total={total}
          itemLabel="orders"
        />
      </MainCard>
      {selectedOrder && <RescheduleLogModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onSuccess={fetchOrders} />}
    </>
  );
}
