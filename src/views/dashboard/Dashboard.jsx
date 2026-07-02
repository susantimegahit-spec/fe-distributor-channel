import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';

// third-party
import ReactApexChart from 'react-apexcharts';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import OrderServices from '../../services/OrderServices';
import { currency } from '../../utils/global';
import { useAlert } from '../../utils/alertContext';

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

const summaryItems = [
  {
    title: 'Distributor',
    description: 'Manage distributor customer data, active status, depot, and address details.',
    icon: 'ti ti-building-store',
    color: 'primary',
    url: '/customer-portal/master/distributor'
  },
  {
    title: 'Item',
    description: 'Pantau daftar item produk dan sinkronkan data produk terbaru dari pusat.',
    icon: 'ti ti-clipboard-list',
    color: 'success',
    url: '/customer-portal/master/product'
  },
  {
    title: 'Sales',
    description: 'View dan sinkronkan data sales yang menangani aktivitas distributor.',
    icon: 'ti ti-users',
    color: 'info',
    url: '/customer-portal/master/employee'
  },
  {
    title: 'Warehouse',
    description: 'Manage warehouse lists as distribution operational references.',
    icon: 'ti ti-building-warehouse',
    color: 'warning',
    url: '/customer-portal/master/warehouse'
  }
];

const getOrderDate = (order) => order.doc_date || order.docDate || order.created_at || order.createdAt;
const getOrderTotal = (order) => Number(order.doc_total || order.docTotal || order.total || 0);
const getStatusMeta = (status) => statusConfig[status] || { label: status || 'Unknown', color: 'secondary', icon: 'ti ti-circle' };

export default function Dashboard() {
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const fetchSalesOrders = async () => {
      setIsLoadingOrders(true);

      try {
        const response = await OrderServices.getListOrder();

        if (response?.data?.success) {
          setOrders(Array.isArray(response.data.data) ? response.data.data : []);
        } else {
          showAlert(response?.data?.message || 'Failed to fetch sales order data', 'danger');
        }
      } catch (error) {
        showAlert(error?.message || 'Failed to fetch sales order data', 'danger');
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchSalesOrders();
  }, [showAlert]);

  const orderSummary = useMemo(() => {
    const totalAmount = orders.reduce((total, order) => total + getOrderTotal(order), 0);
    const totalItem = orders.reduce((total, order) => total + (Array.isArray(order.details) ? order.details.length : 0), 0);

    return {
      totalOrder: orders.length,
      totalAmount,
      totalItem
    };
  }, [orders]);

  const chartData = useMemo(() => {
    const monthKeys = Array.from({ length: 6 }, (_, index) => moment().subtract(5 - index, 'months').format('YYYY-MM'));
    const monthMap = monthKeys.reduce((result, key) => ({ ...result, [key]: { count: 0, total: 0 } }), {});

    orders.forEach((order) => {
      const date = moment(getOrderDate(order));

      if (!date.isValid()) return;

      const key = date.format('YYYY-MM');

      if (!monthMap[key]) return;

      monthMap[key].count += 1;
      monthMap[key].total += getOrderTotal(order);
    });

    return {
      categories: monthKeys.map((key) => moment(key, 'YYYY-MM').format('MMM YY')),
      count: monthKeys.map((key) => monthMap[key].count),
      total: monthKeys.map((key) => monthMap[key].total)
    };
  }, [orders]);

  const statusSummary = useMemo(() => {
    const statusMap = orders.reduce((result, order) => {
      const status = order.status || 'UNKNOWN';

      return {
        ...result,
        [status]: (result[status] || 0) + 1
      };
    }, {});

    return Object.entries(statusMap)
      .map(([status, total]) => ({ status, total, ...getStatusMeta(status) }))
      .sort((a, b) => b.total - a.total);
  }, [orders]);

  const chartOptions = useMemo(
    () => ({
      ...salesOrderChartOptions,
      xaxis: {
        ...salesOrderChartOptions.xaxis,
        categories: chartData.categories
      }
    }),
    [chartData.categories]
  );

  const chartSeries = useMemo(
    () => [
      {
        name: 'Order Count',
        type: 'column',
        data: chartData.count
      },
      {
        name: 'Total Order',
        type: 'line',
        data: chartData.total
      }
    ],
    [chartData.count, chartData.total]
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
  }, [isLoadingOrders, chartData.categories, chartData.count, chartData.total]);

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Dashboard</h5>
            <span className="text-muted f-12">Summary of distributor channel main feature access.</span>
          </Stack>
        }
        secondary={
          <Button as={Link} to="/customer-portal/order/order-list" variant="primary">
            <i className="ph ph-list-bullets me-1" />
            View Order
          </Button>
        }
      >
        <Row className="g-3">
          {/* {summaryItems.map((item) => (
            <Col sm={6} xl={3} key={item.title}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack gap={3} className="h-100">
                    <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
                      <span className={`avtar avtar-s bg-light-${item.color} text-${item.color}`}>
                        <i className={item.icon} />
                      </span>
                      <Button as={Link} to={item.url} variant="light-secondary" size="sm" className="rounded-circle">
                        <i className="ti ti-arrow-up-right" />
                      </Button>
                    </Stack>
                    <div>
                      <h6 className="mb-1">{item.title}</h6>
                      <p className="text-muted f-12 mb-0">{item.description}</p>
                    </div>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          ))} */}
        </Row>
      </MainCard>

      <Row className="g-3">
        <Col sm={6} xl={4}>
          <Card className="border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Total Sales Order</div>
                  <h4 className="mb-0">{isLoadingOrders ? '-' : orderSummary.totalOrder}</h4>
                </div>
                <span className="avtar avtar-s bg-light-primary text-primary">
                  <i className="ti ti-shopping-cart" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} xl={4}>
          <Card className="border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Total Order Value</div>
                  <h4 className="mb-0">{isLoadingOrders ? '-' : currency(orderSummary.totalAmount)}</h4>
                </div>
                <span className="avtar avtar-s bg-light-success text-success">
                  <i className="ti ti-cash" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} xl={4}>
          <Card className="border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Total Item Order</div>
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
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Tren Sales Order</h5>
                <span className="text-muted f-12">Sales order count and value in the last 6 months.</span>
              </Stack>
            }
          >
            <div ref={chartContainerRef} style={{ minHeight: 340, width: '100%' }}>
              {isLoadingOrders || !isChartReady ? (
                <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 340 }}>
                  Memuat data sales order...
                </div>
              ) : (
                <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={340} width="100%" />
              )}
            </div>
          </MainCard>
        </Col>
        <Col xl={4}>
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Status Order</h5>
                <span className="text-muted f-12">Information status dari sales order yang dibuat.</span>
              </Stack>
            }
          >
            <Stack gap={2}>
              {isLoadingOrders ? (
                <div className="text-center text-muted py-5">Memuat status order...</div>
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
                <div className="text-center text-muted py-5">No sales orders yet.</div>
              )}
            </Stack>
          </MainCard>
        </Col>
      </Row>
    </Stack>
  );
}
