import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';

// third-party
import ReactApexChart from 'react-apexcharts';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import DashboardServices from '../../../services/DashboardServices';
import OrderServices from '../../../services/OrderServices';
import { currency } from '../../../utils/global';
import { useAlert } from '../../../utils/alertContext';
import { getCookies } from '../../../utils/cookies';

const statusConfig = {
  DRAFT: { label: 'Draft', color: 'secondary', icon: 'ti ti-clipboard-list' },
  WAITING_OM: { label: 'Waiting OM', color: 'warning', icon: 'ti ti-clock-hour-4' },
  WAITING_ASM: { label: 'Waiting ASM', color: 'info', icon: 'ti ti-clock-hour-4' },
  WAITING_ADMIN_SALES: { label: 'Waiting Admin Sales', color: 'primary', icon: 'ti ti-clock-hour-4' },
  WAITING_APPROVAL: { label: 'Waiting Approval', color: 'warning', icon: 'ti ti-clock-hour-4' },
  DELIVERY: { label: 'Delivery', color: 'info', icon: 'ti ti-truck-delivery' },
  APPROVED: { label: 'Approved', color: 'success', icon: 'ti ti-circle-check' },
  ARRIVED: { label: 'Arrived', color: 'success', icon: 'ti ti-package' },
  REJECTED: { label: 'Rejected', color: 'orange', icon: 'ti ti-circle-x' },
  FAILED: { label: 'Failed', color: 'danger', icon: 'ti ti-alert-triangle' }
};

const salesOrderChartOptions = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    redrawOnParentResize: true,
    redrawOnWindowResize: true
  },
  dataLabels: { enabled: false },
  stroke: {
    width: [0, 3],
    curve: 'smooth'
  },
  plotOptions: {
    bar: {
      columnWidth: '44%',
      borderRadius: 4
    }
  },
  colors: ['var(--bs-primary)', 'var(--bs-success)'],
  grid: {
    borderColor: 'var(--bs-border-color)',
    strokeDashArray: 4
  },
  xaxis: {
    categories: []
  },
  yaxis: [
    {
      title: { text: 'Order Count' },
      labels: {
        formatter: (value) => Math.round(value)
      }
    },
    {
      opposite: true,
      title: { text: 'Total Order' },
      labels: {
        formatter: (value) => currency(value)
      }
    }
  ],
  tooltip: {
    shared: true,
    intersect: false,
    y: [
      {
        formatter: (value) => `${Math.round(value)} order`
      },
      {
        formatter: (value) => currency(value)
      }
    ]
  },
  legend: {
    position: 'bottom',
    markers: { size: 6, shape: 'circle', strokeWidth: 0 }
  }
};

const getStatusMeta = (status) => statusConfig[status] || { label: status || 'Unknown', color: 'secondary', icon: 'ti ti-circle' };
const formatOrderDate = (value) => {
  if (!value) return '-';

  const dateValue = moment(value);

  return dateValue.isValid() ? dateValue.format('DD MMM YYYY') : '-';
};

const emptyChartData = () => ({
  categories: Array.from({ length: 6 }, (_, index) =>
    moment()
      .subtract(5 - index, 'months')
      .format('MMM YY')
  ),
  count: Array(6).fill(0),
  total: Array(6).fill(0),
  series: [
    {
      name: 'Order Count',
      type: 'column',
      data: Array(6).fill(0)
    },
    {
      name: 'Total Order',
      type: 'line',
      data: Array(6).fill(0)
    }
  ],
  type: 'line',
  options: {}
});

const emptyTopProductsChartData = () => ({
  categories: [],
  series: [
    {
      name: 'Total Item',
      data: []
    }
  ]
});

const getResponsePayload = (response) => response?.data?.data || response?.data || {};

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const getFirstValue = (source, keys = []) => {
  if (!source || typeof source !== 'object') return undefined;

  return keys.reduce((result, key) => (result !== undefined ? result : source[key]), undefined);
};

const getOrderValue = (order = {}, keys = [], fallback = '-') => {
  const value = getFirstValue(order, keys);

  return value ?? fallback;
};

const getOrderListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;

  return getFirstValue(payload, ['data', 'items', 'results', 'orders', 'sales_orders', 'salesOrders']) || [];
};

const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    let normalizedValue = value.replace(/[^0-9,.-]/g, '');
    const lastCommaIndex = normalizedValue.lastIndexOf(',');
    const lastDotIndex = normalizedValue.lastIndexOf('.');

    if (lastCommaIndex > -1 && lastDotIndex > -1) {
      normalizedValue =
        lastCommaIndex > lastDotIndex ? normalizedValue.replace(/\./g, '').replace(',', '.') : normalizedValue.replace(/,/g, '');
    } else if (lastCommaIndex > -1) {
      const decimalLength = normalizedValue.length - lastCommaIndex - 1;
      normalizedValue = decimalLength === 3 ? normalizedValue.replace(/,/g, '') : normalizedValue.replace(',', '.');
    } else if ((normalizedValue.match(/\./g) || []).length > 1) {
      normalizedValue = normalizedValue.replace(/\./g, '');
    }

    return Number(normalizedValue) || 0;
  }

  return Number(value || 0);
};

const getNumberValue = (source, keys = []) => parseNumber(getFirstValue(source, keys));

const findValueByKeys = (source, keys = []) => {
  if (!source || typeof source !== 'object') return undefined;

  const directValue = getFirstValue(source, keys);

  if (directValue !== undefined) return directValue;

  for (const value of Object.values(source)) {
    const nestedValue = findValueByKeys(value, keys);

    if (nestedValue !== undefined) return nestedValue;
  }

  return undefined;
};

const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getSummaryValue = (source, valueKeys = [], labelKeys = []) => {
  if (!source) return 0;

  if (Array.isArray(source)) {
    const normalizedLabels = labelKeys.map(normalizeKey);
    const matchedItem = source.find((item) => {
      const label = getFirstValue(item, ['key', 'code', 'name', 'label', 'title', 'type']);

      return normalizedLabels.includes(normalizeKey(label));
    });

    if (matchedItem) return getNumberValue(matchedItem, ['total', 'value', 'amount', 'count', 'qty', ...valueKeys]);

    const itemWithDirectValue = source.find((item) => getFirstValue(item, valueKeys) !== undefined);

    return itemWithDirectValue ? getNumberValue(itemWithDirectValue, valueKeys) : 0;
  }

  if (typeof source === 'object') {
    const directValue = getFirstValue(source, valueKeys);

    if (directValue !== undefined) {
      return directValue && typeof directValue === 'object'
        ? getNumberValue(directValue, ['total', 'value', 'amount', 'count', 'qty'])
        : parseNumber(directValue);
    }

    const normalizedLabels = labelKeys.map(normalizeKey);
    const matchedEntry = Object.entries(source).find(([key]) => normalizedLabels.includes(normalizeKey(key)));

    if (matchedEntry) {
      const [, value] = matchedEntry;

      return value && typeof value === 'object'
        ? getNumberValue(value, ['total', 'value', 'amount', 'count', 'qty', ...valueKeys])
        : parseNumber(value);
    }
  }

  return 0;
};

const getTopProductValue = (item = {}) => {
  if (typeof item === 'number') return item;

  return parseNumber(
    getFirstValue(item, [
      'total',
      'qty',
      'quantity',
      'count',
      'total_qty',
      'totalQty',
      'total_quantity',
      'totalQuantity',
      'total_item',
      'totalItem',
      'total_items',
      'totalItems',
      'total_order',
      'totalOrder',
      'order_count',
      'orderCount',
      'total_sold',
      'totalSold',
      'total_sales',
      'totalSales',
      'total_order_quantity',
      'totalOrderQuantity',
      'order_quantity',
      'orderQuantity',
      'sold_qty',
      'soldQty',
      'sales_qty',
      'salesQty',
      'value'
    ])
  );
};

const getTopProductLabel = (item = {}) => {
  const label = getFirstValue(item, [
    'item_name',
    'itemName',
    'product_name',
    'productName',
    'product',
    'productName',
    'name',
    'item_code',
    'itemCode',
    'product_code',
    'productCode',
    'code'
  ]);

  if (label && typeof label === 'object') {
    return getFirstValue(label, ['name', 'product_name', 'productName', 'item_name', 'itemName', 'code']) || '-';
  }

  return label || '-';
};

const getTopProductsSource = (payload = {}) => {
  return findValueByKeys(payload, ['top_products', 'topProducts']) || [];
};

const normalizeTopProducts = (payload = {}) => {
  const topProducts = getTopProductsSource(payload);

  const productList = Array.isArray(topProducts)
    ? topProducts
    : Object.entries(topProducts || {}).map(([label, value]) => ({
        label,
        value
      }));

  return productList
    .map((item) => ({
      label: item?.label || getTopProductLabel(item),
      value: getTopProductValue(item)
    }))
    .filter((item) => item.label !== '-' || item.value > 0);
};

const getTopProductsTotal = (payload = {}) => {
  const topProducts = normalizeTopProducts(payload);

  return topProducts.reduce((total, item) => total + item.value, 0);
};

const normalizeTopProductsChartData = (payload = {}) => {
  const topProducts = normalizeTopProducts(payload);

  if (!topProducts.length) return emptyTopProductsChartData();

  return {
    categories: topProducts.map((item) => item.label),
    series: [
      {
        name: 'Total Item',
        data: topProducts.map((item) => item.value)
      }
    ]
  };
};

const normalizeChartSeriesData = (data = []) =>
  data.map((value) => {
    if (value && typeof value === 'object') {
      return {
        ...value,
        y: parseNumber(value.y ?? value.value)
      };
    }

    return parseNumber(value);
  });

const normalizeChartSeries = (series = []) => {
  const seriesList = Array.isArray(series)
    ? series
    : Object.entries(series || {}).map(([name, data]) => ({
        name,
        data
      }));

  return seriesList
    .map((item, index) => {
      if (Array.isArray(item)) {
        return {
          name: index === 0 ? 'Order Count' : 'Total Order',
          type: index === 0 ? 'column' : 'line',
          data: normalizeChartSeriesData(item)
        };
      }

      if (item && typeof item === 'object' && Array.isArray(item.data)) {
        return {
          ...item,
          name: item.name || item.label || (index === 0 ? 'Order Count' : 'Total Order'),
          type: item.type || (index === 0 ? 'column' : 'line'),
          data: normalizeChartSeriesData(item.data)
        };
      }

      return null;
    })
    .filter(Boolean);
};

const normalizeStatusSummary = (payload = {}) => {
  const source =
    findValueByKeys(payload, [
      'order_statuses',
      'orderStatuses',
      'status_summary',
      'statusSummary',
      'statuses',
      'order_status',
      'orderStatus',
      'status_orders',
      'statusOrders'
    ]) || [];

  if (Array.isArray(source)) {
    return source
      .map((item) => {
        const status = getFirstValue(item, ['status', 'key', 'code', 'name', 'label']) || 'UNKNOWN';
        const total = parseNumber(getFirstValue(item, ['total', 'count', 'value', 'qty']));

        return { status, total, ...getStatusMeta(status) };
      })
      .sort((a, b) => b.total - a.total);
  }

  if (source && typeof source === 'object') {
    return Object.entries(source)
      .map(([status, value]) => {
        const total =
          value && typeof value === 'object' ? parseNumber(getFirstValue(value, ['total', 'count', 'value', 'qty'])) : parseNumber(value);

        return { status, total, ...getStatusMeta(status) };
      })
      .sort((a, b) => b.total - a.total);
  }

  return [];
};

const normalizeSummary = (payload = {}) => {
  const source =
    findValueByKeys(payload, ['sales_summary', 'salesSummary']) || getFirstValue(payload, ['summary', 'totals', 'data']) || payload;
  const topProductsTotal = getTopProductsTotal(payload);

  return {
    totalOrder: getSummaryValue(source, ['total_revenue_this_month']),
    totalAmount: getSummaryValue(source, ['total_orders_this_month']),
    totalItem:
      getSummaryValue(
        source,
        [
          'total_item',
          'total_items',
          'totalItem',
          'totalItems',
          'total_item_order',
          'totalItemOrder',
          'item_count',
          'itemCount',
          'item_qty',
          'itemQty',
          'total_qty',
          'totalQty',
          'total_quantity',
          'totalQuantity',
          'quantity',
          'qty'
        ],
        ['total_item_order', 'total item order', 'total_item', 'total item', 'item_count', 'item count', 'total_qty', 'quantity']
      ) || topProductsTotal
  };
};

const normalizeChartData = (payload = {}) => {
  const source =
    getFirstValue(payload, [
      'daily_sales_trend',
      'dailySalesTrend',
      'chart',
      'charts',
      'sales_order_chart',
      'salesOrderChart',
      'sales_orders',
      'salesOrders',
      'data',
      'items'
    ]) || payload;

  if (Array.isArray(source)) {
    const categories = source.map((item) => getFirstValue(item, ['label', 'month', 'period', 'date', 'name']) || '-');
    const count = source.map((item) =>
      parseNumber(getFirstValue(item, ['count', 'order_count', 'orderCount', 'total_order', 'totalOrder']))
    );
    const total = source.map((item) =>
      parseNumber(getFirstValue(item, ['total', 'amount', 'total_amount', 'totalAmount', 'order_value', 'orderValue']))
    );

    return {
      categories,
      count,
      total,
      series: [
        { name: 'Order Count', type: 'column', data: count },
        { name: 'Total Order', type: 'line', data: total }
      ],
      type: 'line',
      options: {}
    };
  }

  const apiOptions = getFirstValue(source, ['options', 'chart_options', 'chartOptions']) || {};
  const categories =
    getFirstValue(source, ['categories', 'labels', 'months', 'periods']) ||
    getFirstValue(apiOptions?.xaxis, ['categories', 'labels', 'months', 'periods']);
  const apiSeries = normalizeChartSeries(getFirstValue(source, ['series', 'datasets', 'data_series', 'dataSeries']) || []);
  const apiType = getFirstValue(source, ['type', 'chart_type', 'chartType']) || 'line';

  if (apiSeries.length) {
    const nextCategories = Array.isArray(categories) ? categories : [];

    return {
      categories: nextCategories,
      count: apiSeries[0]?.data || nextCategories.map(() => 0),
      total: apiSeries[1]?.data || nextCategories.map(() => 0),
      series: apiSeries,
      type: apiType,
      options: apiOptions
    };
  }

  const count = getFirstValue(source, ['count', 'counts', 'order_count', 'orderCount', 'order_counts', 'orderCounts']);
  const total = getFirstValue(source, [
    'total',
    'totals',
    'amount',
    'amounts',
    'total_amount',
    'totalAmount',
    'total_amounts',
    'totalAmounts'
  ]);

  if (Array.isArray(categories)) {
    const countData = Array.isArray(count) ? count.map((item) => parseNumber(item)) : categories.map(() => 0);
    const totalData = Array.isArray(total) ? total.map((item) => parseNumber(item)) : categories.map(() => 0);

    return {
      categories,
      count: countData,
      total: totalData,
      series: [
        { name: 'Order Count', type: 'column', data: countData },
        { name: 'Total Order', type: 'line', data: totalData }
      ],
      type: 'line',
      options: apiOptions
    };
  }

  return emptyChartData();
};

export default function Dashboard() {
  const { showAlert } = useAlert();
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [receivingOrderId, setReceivingOrderId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [orderSummary, setOrderSummary] = useState({ totalOrder: 0, totalAmount: 0, totalItem: 0 });
  const [chartData, setChartData] = useState(() => emptyChartData());
  const [topProductsChartData, setTopProductsChartData] = useState(() => emptyTopProductsChartData());
  const [statusSummary, setStatusSummary] = useState([]);
  const chartContainerRef = useRef(null);
  const customerCode = getCookies('customerCode');
  const isDistributor = Boolean(customerCode);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingOrders(true);

      try {
        const [summaryResponse, chartResponse, orderResponse] = await Promise.all([
          isDistributor ? DashboardServices.getDistributorSummary() : DashboardServices.getAdminSummary(),
          isDistributor ? DashboardServices.getDistributorChart() : DashboardServices.getAdminChart(),
          OrderServices.getListOrder()
        ]);

        if (summaryResponse?.data?.success === false || chartResponse?.data?.success === false || orderResponse?.data?.success === false) {
          showAlert(
            summaryResponse?.data?.message ||
              chartResponse?.data?.message ||
              orderResponse?.data?.message ||
              'Failed to fetch dashboard data',
            'danger'
          );
          return;
        }

        const summaryPayload = getResponsePayload(summaryResponse);
        const chartPayload = getResponsePayload(chartResponse);
        const orderPayload = getResponsePayload(orderResponse);
        const dashboardPayload = { summary: summaryPayload, chart: chartPayload };

        const summaryStatus = normalizeStatusSummary(summaryPayload);
        setOrderSummary(normalizeSummary(dashboardPayload));
        const topProductsData = normalizeTopProductsChartData(summaryPayload);

        setTopProductsChartData(topProductsData.categories.length ? topProductsData : normalizeTopProductsChartData(chartPayload));
        setStatusSummary(summaryStatus.length ? summaryStatus : normalizeStatusSummary(chartPayload));
        setChartData(normalizeChartData(chartPayload));
        setOrders(getOrderListPayload(orderPayload));
      } catch (error) {
        showAlert(error?.message || 'Failed to fetch dashboard data', 'danger');
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchDashboardData();
  }, [isDistributor, showAlert]);

  const deliveryOrders = useMemo(() => orders.filter((order) => normalizeStatus(order.status) === 'DELIVERY'), [orders]);

  const handleCompleteOrder = async (order) => {
    if (!order?.id) {
      showAlert('Order ID not found', 'danger');
      return;
    }

    setReceivingOrderId(order.id);

    try {
      const response = await OrderServices.postArrive(order.id);

      if (response?.data?.success) {
        const updatedOrder = response.data.data || { ...order, status: 'ARRIVED' };

        setOrders((currentOrders) =>
          currentOrders.map((item) => (String(item.id) === String(order.id) ? { ...item, ...updatedOrder, status: 'ARRIVED' } : item))
        );
        showAlert(response.data.message || 'Sales order completed successfully', 'success');
      } else {
        showAlert(response?.data?.message || 'Failed to complete sales order', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to complete sales order', 'danger');
    } finally {
      setReceivingOrderId(null);
    }
  };

  const chartOptions = useMemo(
    () => ({
      ...salesOrderChartOptions,
      ...chartData.options,
      xaxis: {
        ...salesOrderChartOptions.xaxis,
        ...(chartData.options?.xaxis || {}),
        categories: chartData.categories
      }
    }),
    [chartData.categories, chartData.options]
  );

  const topProductsChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false }
      },
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '42%'
        }
      },
      colors: ['var(--bs-primary)'],
      grid: {
        borderColor: 'var(--bs-border-color)',
        strokeDashArray: 4
      },
      xaxis: {
        categories: topProductsChartData.categories,
        labels: {
          rotate: -25,
          trim: true
        }
      },
      yaxis: {
        labels: {
          formatter: (value) => Math.round(value)
        }
      },
      tooltip: {
        y: {
          formatter: (value) => `${Math.round(value)} item`
        }
      }
    }),
    [topProductsChartData.categories]
  );

  useEffect(() => {
    if (isLoadingOrders) {
      setIsChartReady(false);
      return undefined;
    }

    let animationFrame;
    const renderTimer = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(() => {
        setIsChartReady(true);
        window.dispatchEvent(new Event('resize'));
      });
    }, 120);

    return () => {
      window.clearTimeout(renderTimer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [isLoadingOrders, chartData.categories, chartData.series, topProductsChartData.categories, topProductsChartData.series]);

  return (
    <Stack gap={3}>
      <MainCard
        className="dashboard-title-card"
        content={false}
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Dashboard</h5>
            <span className="text-muted f-12">Summary of distributor channel main feature access.</span>
          </Stack>
        }
        secondary={
          <Button as={Link} to="/customer-portal/order/order-list" variant="light" className="dashboard-title-action">
            <i className="ph ph-list-bullets me-1" />
            View Order
          </Button>
        }
      />

      <MainCard
        className="claim-transaction-card"
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Complete Order</h5>
            <span className="text-muted f-12">Sales orders with delivery status that need to be completed.</span>
          </Stack>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>No. SO</th>
              <th>Depo</th>
              <th>Date</th>
              <th>Total Order</th>
              <th>Status</th>
              <th className="text-center">#</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingOrders ? (
              <tr>
                <td colSpan={6}>
                  <div className="text-center text-muted py-4">Loading delivery sales orders...</div>
                </td>
              </tr>
            ) : deliveryOrders.length > 0 ? (
              deliveryOrders.map((order) => {
                const orderDate = moment(getOrderValue(order, ['doc_date', 'docDate', 'created_at', 'createdAt'], null));

                return (
                  <tr key={order.id}>
                    <td className="fw-semibold">
                      {getOrderValue(order, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'])}
                    </td>
                    <td>
                      {getOrderValue(order, ['depo', 'depot', 'warehouse_name', 'warehouseName'])} -{' '}
                      {getOrderValue(order, ['customer_name', 'customerName', 'card_name', 'cardName'])}
                    </td>
                    <td>{orderDate.isValid() ? orderDate.format('DD MMM YYYY') : '-'}</td>
                    <td>{currency(getOrderValue(order, ['doc_total', 'docTotal', 'total', 'total_order', 'totalOrder'], 0))}</td>
                    <td>
                      <Badge bg="info">Delivery</Badge>
                    </td>
                    <td className="text-center">
                      <Button
                        variant="success"
                        size="sm"
                        disabled={String(receivingOrderId) === String(order.id)}
                        onClick={() => handleCompleteOrder(order)}
                      >
                        <i className={String(receivingOrderId) === String(order.id) ? 'ti ti-loader-2 me-1' : 'ti ti-circle-check me-1'} />
                        Complete
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="text-center text-muted py-4">No delivery sales orders.</div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>

      <Row className="g-3">
        <Col sm={6} xl={4}>
          <Card className="dashboard-summary-card border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Total Sales Order</div>
                  <h4 className="mb-0">{isLoadingOrders ? '-' : currency(orderSummary.totalOrder)}</h4>
                </div>
                <span className="avtar avtar-s bg-light-primary text-primary">
                  <i className="ti ti-shopping-cart" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} xl={4}>
          <Card className="dashboard-summary-card border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Total Order</div>
                  <h4 className="mb-0">{isLoadingOrders ? '-' : orderSummary.totalAmount}</h4>
                </div>
                <span className="avtar avtar-s bg-light-success text-success">
                  <i className="ti ti-cash" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} xl={4}>
          <Card className="dashboard-summary-card border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Total Quantity (Kg)</div>
                  <h4 className="mb-0">{isLoadingOrders ? '-' : orderSummary.totalItem}</h4>
                </div>
                <span className="avtar avtar-s bg-light-info text-info">
                  <i className="ti ti-package" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col xl={8}>
          <MainCard
            className="claim-transaction-card dashboard-order-overview-card h-100"
            bodyClassName="dashboard-order-overview-body"
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Sales Order Trend</h5>
                <span className="text-muted f-12">Sales order count and value in the last 6 months.</span>
              </Stack>
            }
          >
            <div ref={chartContainerRef} style={{ minHeight: 340, width: '100%' }}>
              {isLoadingOrders || !isChartReady ? (
                <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 340 }}>
                  Loading sales order data...
                </div>
              ) : (
                <ReactApexChart options={chartOptions} series={chartData.series} type={chartData.type} height={340} width="100%" />
              )}
            </div>
          </MainCard>
        </Col>
        <Col xl={4} className="d-flex">
          <MainCard
            className="claim-transaction-card dashboard-order-overview-card h-100 w-100"
            bodyClassName="dashboard-order-overview-body"
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Status Order</h5>
                <span className="text-muted f-12">Status information for created sales orders.</span>
              </Stack>
            }
          >
            <Stack gap={2} style={{ height: 340, overflowY: 'auto', paddingRight: 4 }}>
              {isLoadingOrders ? (
                <div className="d-flex align-items-center justify-content-center text-muted h-100">Loading order status...</div>
              ) : statusSummary.length > 0 ? (
                statusSummary.map((item) => (
                  <Card className="border mb-0" key={item.status}>
                    <Card.Body className="py-2">
                      <Stack direction="horizontal" className="justify-content-between" gap={3}>
                        <Stack direction="horizontal" gap={2}>
                          <span className={`avtar avtar-xs bg-light-${item.color} text-${item.color}`}>
                            <i className={item.icon} />
                          </span>
                          <div>
                            <div className="fw-semibold">{item.label}</div>
                            <div className="text-muted f-12">{item.status}</div>
                          </div>
                        </Stack>
                        <h5 className="mb-0">{item.total}</h5>
                      </Stack>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <div className="d-flex align-items-center justify-content-center text-muted h-100">No sales orders yet.</div>
              )}
            </Stack>
          </MainCard>
        </Col>
      </Row>

      <MainCard
        className="claim-transaction-card"
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Top Products</h5>
            <span className="text-muted f-12">Product ranking based on total ordered items.</span>
          </Stack>
        }
      >
        <div style={{ minHeight: 320, width: '100%' }}>
          {isLoadingOrders || !isChartReady ? (
            <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 320 }}>
              Loading top product data...
            </div>
          ) : topProductsChartData.categories.length > 0 ? (
            <ReactApexChart options={topProductsChartOptions} series={topProductsChartData.series} type="bar" height={320} width="100%" />
          ) : (
            <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 320 }}>
              No top product data yet.
            </div>
          )}
        </div>
      </MainCard>
    </Stack>
  );
}
