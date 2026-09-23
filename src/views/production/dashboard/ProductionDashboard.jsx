import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import SalesOrderDetailModal from '../../logistics/dashboard/SalesOrderDetailModal';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import MaterialServices from '../../../services/production/MaterialServices';
import ProductionServices from '../../../services/production/ProductionServices';
import { useAlert } from '../../../utils/alertContext';

const getStatusVariant = (status) => {
  const normalizedStatus = String(status || '')
    .trim()
    .toLowerCase();

  return (
    {
      planned: 'warning',
      release: 'success',
      released: 'success',
      'in progress': 'info',
      in_progress: 'info',
      completed: 'success',
      close: 'secondary',
      closed: 'secondary',
      cancel: 'danger',
      cancelled: 'danger',
      canceled: 'danger'
    }[normalizedStatus] || 'secondary'
  );
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;

  for (const key of [
    'data',
    'items',
    'rows',
    'orders',
    'production_orders',
    'receipts',
    'production_receipts',
    'issues',
    'production_issues',
    'documents',
    'results'
  ]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;

const normalizeOrder = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'doc_entry', 'id', 'production_order_id'], index),
  number: getValue(item, ['DocNum', 'doc_num', 'prod_order_no', 'production_order_no', 'number'], '-'),
  product: getValue(item, ['ProdName', 'ItemName', 'item_name', 'product_name', 'name'], '-'),
  warehouse: getValue(item, ['Warehouse', 'WhsCode', 'whs_code', 'warehouse_code'], '-'),
  plannedQty: Number(getValue(item, ['PlannedQty', 'PlannedQuantity', 'planned_qty', 'planned_quantity', 'quantity'], 0)),
  completedQty: Number(getValue(item, ['CmpltQty', 'CompletedQty', 'completed_qty', 'completed_quantity', 'cmplt_qty'], 0)),
  dueDate: getValue(item, ['DueDate', 'due_date', 'end_date']),
  status: getValue(item, ['ProductionOrderStatus', 'Status', 'status', 'order_status'], '-')
});

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentWeek = () => {
  const currentDate = new Date();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() + (currentDate.getDay() === 0 ? -6 : 1 - currentDate.getDay()));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: formatInputDate(monday), to: formatInputDate(sunday) };
};

const formatDate = (value) => {
  if (!value) return '-';
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getProgress = (completedQty, plannedQty) => (plannedQty > 0 ? Math.min(Math.round((completedQty / plannedQty) * 100), 100) : 0);

const readyOrderPageSize = 10;
const getOrderLines = (order) => order.details || order.lines || order.document_lines || [];
const getOrderWeight = (order) =>
  getOrderLines(order).reduce((total, line) => {
    const productName = line.item_name || line.item?.item_name || line.description || '';
    const match = [...String(productName).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)].at(-1);
    const unitWeight = match ? Number(match[1].replace(',', '.')) / (/^(g|gr|gram)$/i.test(match[2]) ? 1000 : 1) : 0;
    return total + unitWeight * (Number(line.quantity ?? line.qty ?? 0) || 0);
  }, 0);
const getReadyOrderPage = (response, requestedPage) => {
  const root = response?.data ?? {};
  const payload = root?.data && !Array.isArray(root.data) ? root.data : root;
  const page = payload?.orders || payload?.data || payload;
  const rows = Array.isArray(page) ? page : page?.data || page?.items || [];
  const meta = payload?.pagination || payload?.meta || page?.pagination || page?.meta || page;
  const total = Number(meta?.total ?? payload?.total ?? rows.length) || 0;
  const currentPage = Number(meta?.current_page ?? meta?.page ?? payload?.current_page ?? requestedPage) || requestedPage;
  const lastPage = Number(meta?.last_page ?? meta?.lastPage ?? payload?.last_page ?? 0) || 0;
  return {
    rows: Array.isArray(rows) ? rows : [],
    total,
    currentPage,
    pageCount: lastPage || Math.max(Math.ceil(total / (Number(meta?.per_page) || readyOrderPageSize)), 1)
  };
};
const normalizeReadyOrder = (order) => {
  const salesOrder = { ...order, ...(order.sales_order || order.order || {}) };
  const firstLine = getOrderLines(salesOrder)[0] || {};
  return {
    ...salesOrder,
    id: salesOrder.id,
    orderNumber: salesOrder.sap_doc_num || salesOrder.order_no || salesOrder.id || '-',
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
      .toUpperCase()
  };
};

export default function ProductionDashboard() {
  const { showAlert } = useAlert();
  const [productionOrders, setProductionOrders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readyOrders, setReadyOrders] = useState([]);
  const [readyOrderSearch, setReadyOrderSearch] = useState('');
  const [debouncedReadyOrderSearch, setDebouncedReadyOrderSearch] = useState('');
  const [readyOrderPage, setReadyOrderPage] = useState(1);
  const [readyOrderPageCount, setReadyOrderPageCount] = useState(1);
  const [readyOrderTotal, setReadyOrderTotal] = useState(0);
  const [loadingReadyOrders, setLoadingReadyOrders] = useState(true);
  const [readyOrdersError, setReadyOrdersError] = useState('');
  const [selectedSalesOrder, setSelectedSalesOrder] = useState(null);
  const readyOrdersRequestIdRef = useRef(0);

  const fetchReadyOrders = useCallback(async () => {
    const requestId = ++readyOrdersRequestIdRef.current;
    setLoadingReadyOrders(true);
    setReadyOrdersError('');
    try {
      const response = await LogisticsServices.getLogisticOrders({
        search: debouncedReadyOrderSearch,
        per_page: readyOrderPageSize,
        page: readyOrderPage
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load orders ready for packing');
      }
      if (requestId !== readyOrdersRequestIdRef.current) return;
      const result = getReadyOrderPage(response, readyOrderPage);
      setReadyOrders(result.rows.map(normalizeReadyOrder));
      setReadyOrderTotal(result.total);
      setReadyOrderPageCount(result.pageCount);
      if (result.currentPage !== readyOrderPage) setReadyOrderPage(result.currentPage);
    } catch (error) {
      if (requestId !== readyOrdersRequestIdRef.current) return;
      setReadyOrders([]);
      setReadyOrderTotal(0);
      setReadyOrderPageCount(1);
      setReadyOrdersError(error?.response?.data?.message || error?.message || 'Failed to load orders ready for packing');
    } finally {
      if (requestId === readyOrdersRequestIdRef.current) setLoadingReadyOrders(false);
    }
  }, [debouncedReadyOrderSearch, readyOrderPage]);

  const fetchDashboard = useCallback(async () => {
    const filters = getCurrentWeek();
    setLoading(true);

    const requests = await Promise.allSettled([
      ProductionServices.getListOrderSap({ ...filters, whs_code: '', to_whs_code: '', status: '' }),
      ProductionServices.getReceipt({ ...filters, whs_code: '', to_whs_code: '' }),
      ProductionServices.getIssueProduction({ ...filters, whs_code: '', to_whs_code: '' }),
      MaterialServices.getMaterial('')
    ]);
    const [orderResult, receiptResult, issueResult, materialResult] = requests;

    setProductionOrders(orderResult.status === 'fulfilled' ? getResponseList(orderResult.value).map(normalizeOrder) : []);
    setReceipts(receiptResult.status === 'fulfilled' ? getResponseList(receiptResult.value) : []);
    setIssues(issueResult.status === 'fulfilled' ? getResponseList(issueResult.value) : []);
    setMaterials(materialResult.status === 'fulfilled' ? getResponseList(materialResult.value) : []);
    setLoading(false);

    if (requests.some((result) => result.status === 'rejected')) {
      showAlert('Some production dashboard data could not be loaded', 'warning');
    }
  }, [showAlert]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedReadyOrderSearch(readyOrderSearch.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [readyOrderSearch]);

  useEffect(() => {
    fetchReadyOrders();
  }, [fetchReadyOrders]);

  const summaryCards = useMemo(() => {
    const isCompleted = (status) => ['completed', 'complete', 'closed', 'close'].includes(String(status).trim().toLowerCase());
    const completed = productionOrders.filter((order) => isCompleted(order.status)).length;

    return [
      {
        label: 'Production Orders',
        value: productionOrders.length,
        detail: 'Current week',
        icon: 'ti-clipboard-text',
        color: 'primary'
      },
      {
        label: 'In Progress',
        value: productionOrders.length - completed,
        detail: 'Active orders',
        icon: 'ti-settings-automation',
        color: 'warning'
      },
      { label: 'Completed', value: completed, detail: 'Current week', icon: 'ti-circle-check', color: 'success' },
      { label: 'Materials', value: materials.length, detail: 'Master items', icon: 'ti-box', color: 'info' }
    ];
  }, [materials.length, productionOrders]);

  const activityItems = [
    { label: 'Production Receipts', value: receipts.length, icon: 'ti-package-import', color: 'success' },
    { label: 'Production Issues', value: issues.length, icon: 'ti-package-export', color: 'warning' },
    { label: 'Master Materials', value: materials.length, icon: 'ti-box', color: 'info' }
  ];

  if (loading) {
    return (
      <MainCard title="Production Dashboard">
        <LoaderData />
      </MainCard>
    );
  }

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Production Dashboard</h5>
            <span className="text-muted f-12">Monitor production orders, output progress, and material readiness.</span>
          </Stack>
        }
      >
        <Row className="g-3">
          {summaryCards.map((item) => (
            <Col sm={6} xl={3} key={item.label}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
                    <div>
                      <span className="text-muted f-12 d-block mb-1">{item.label}</span>
                      <h3 className="mb-1">{item.value}</h3>
                      <span className="text-muted f-12">{item.detail}</span>
                    </div>
                    <span className={`avtar avtar-s bg-light-${item.color} text-${item.color}`}>
                      <i className={`ti ${item.icon}`} />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </MainCard>

      <MainCard>
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
              value={readyOrderSearch}
              onChange={(event) => {
                setReadyOrderSearch(event.target.value);
                setReadyOrderPage(1);
              }}
              style={{ width: 220 }}
            />
            <Button size="sm" variant="light-primary" onClick={fetchReadyOrders} disabled={loadingReadyOrders}>
              <i className={`ti ${loadingReadyOrders ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
            </Button>
          </Stack>
        </Stack>
        <Table responsive hover className="mb-0 align-middle">
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
            </tr>
          </thead>
          <tbody>
            {loadingReadyOrders ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  Loading Sales Orders...
                </td>
              </tr>
            ) : readyOrdersError ? (
              <tr>
                <td colSpan={8} className="text-center text-danger py-4">
                  {readyOrdersError}
                </td>
              </tr>
            ) : readyOrders.length ? (
              readyOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0 fw-semibold text-start"
                      style={{ color: '#315fb4' }}
                      disabled={!order.id}
                      aria-label={`View Sales Order ${order.orderNumber} detail`}
                      onClick={() => setSelectedSalesOrder({ id: order.id, number: order.orderNumber })}
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No logistics orders found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        <TablePagination
          currentPage={readyOrderPage}
          onPageChange={setReadyOrderPage}
          pageCount={readyOrderPageCount}
          pageSize={readyOrderPageSize}
          total={readyOrderTotal}
          itemLabel="orders"
        />
      </MainCard>

      <Row className="g-3">
        <Col xl={8}>
          <MainCard
            className="h-100"
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Production Order Progress</h5>
                <span className="text-muted f-12">Latest production orders and completion progress.</span>
              </Stack>
            }
          >
            <Table className="mb-0 align-middle" responsive hover>
              <thead>
                <tr>
                  <th>Production Order</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th style={{ minWidth: 170 }}>Progress</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {productionOrders.slice(0, 10).map((order) => {
                  const progress = getProgress(order.completedQty, order.plannedQty);

                  return (
                    <tr key={order.id}>
                      <td className="fw-semibold">{order.number}</td>
                      <td>{order.product}</td>
                      <td>{order.warehouse}</td>
                      <td>
                        <Stack gap={1}>
                          <Stack direction="horizontal" className="justify-content-between f-12">
                            <span>
                              {order.completedQty.toLocaleString('id-ID')} / {order.plannedQty.toLocaleString('id-ID')}
                            </span>
                            <span className="fw-semibold">{progress}%</span>
                          </Stack>
                          <ProgressBar now={progress} variant={progress === 100 ? 'success' : 'primary'} style={{ height: 6 }} />
                        </Stack>
                      </td>
                      <td>{formatDate(order.dueDate)}</td>
                      <td>
                        <Badge bg={getStatusVariant(order.status)}>{order.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {!productionOrders.length ? (
                  <tr>
                    <td className="text-center text-muted py-4" colSpan={6}>
                      No production orders found for the current week.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </MainCard>
        </Col>

        <Col xl={4}>
          <MainCard
            className="h-100"
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Production Activity</h5>
                <span className="text-muted f-12">Current-week documents loaded from production services.</span>
              </Stack>
            }
          >
            <Stack gap={3}>
              {activityItems.map((item) => (
                <Card className="border mb-0" key={item.label}>
                  <Card.Body className="p-3">
                    <Stack direction="horizontal" className="justify-content-between align-items-center" gap={3}>
                      <div>
                        <span className="text-muted f-12 d-block mb-1">{item.label}</span>
                        <h4 className="mb-0">{item.value}</h4>
                      </div>
                      <span className={`avtar avtar-s bg-light-${item.color} text-${item.color}`}>
                        <i className={`ti ${item.icon}`} />
                      </span>
                    </Stack>
                  </Card.Body>
                </Card>
              ))}
            </Stack>
          </MainCard>
        </Col>
      </Row>
      {selectedSalesOrder && <SalesOrderDetailModal order={selectedSalesOrder} onClose={() => setSelectedSalesOrder(null)} />}
    </Stack>
  );
}
