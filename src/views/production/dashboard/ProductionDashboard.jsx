import { useCallback, useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import MaterialServices from '../../../services/production/MaterialServices';
import ProductionServices from '../../../services/production/ProductionServices';
import { useAlert } from '../../../utils/alertContext';

const statusVariant = {
  Planned: 'secondary',
  Release: 'warning',
  'In Progress': 'warning',
  Completed: 'success',
  Close: 'success'
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

export default function ProductionDashboard() {
  const { showAlert } = useAlert();
  const [productionOrders, setProductionOrders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

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
                        <Badge bg={statusVariant[order.status] || 'secondary'}>{order.status}</Badge>
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
    </Stack>
  );
}
