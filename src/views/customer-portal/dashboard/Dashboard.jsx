import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

// third-party
import ReactApexChart from 'react-apexcharts';
import ReactSelect from 'react-select';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import ConfirmDialog from 'components/ConfirmDialog';
import MainCard from 'components/MainCard';
import DashboardServices from '../../../services/customer-portal/DashboardServices';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import OrderServices from '../../../services/customer-portal/OrderServices';
import { currency } from '../../../utils/global';
import { useAlert } from '../../../utils/alertContext';
import { getAssignedCustomerCode, getAssignedCustomerCodes } from '../../../utils/cookies';

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

const comparisonMonthOptions = moment.months().map((label, index) => ({ value: index + 1, label }));
const currentComparisonYear = moment().year();
const comparisonYearOptions = Array.from({ length: 7 }, (_, index) => currentComparisonYear + 1 - index);
const MAX_RETURN_ATTACHMENTS = 5;
const MAX_RETURN_ATTACHMENT_SIZE = 1024 * 1024;
const completeOrderActionPopperConfig = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
    { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-end'] } }
  ]
};

const compressReturnImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      let width = image.naturalWidth;
      let height = image.naturalHeight;
      const initialScale = Math.min(1, Math.sqrt(MAX_RETURN_ATTACHMENT_SIZE / file.size) * 0.95);
      width = Math.max(1, Math.round(width * initialScale));
      height = Math.max(1, Math.round(height * initialScale));
      let quality = 0.86;
      let compressedBlob = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image, 0, 0, width, height);
        compressedBlob = await new Promise((done) => canvas.toBlob(done, 'image/jpeg', quality));

        if (compressedBlob?.size <= MAX_RETURN_ATTACHMENT_SIZE) break;
        quality = Math.max(0.45, quality - 0.08);
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
      }

      if (!compressedBlob || compressedBlob.size > MAX_RETURN_ATTACHMENT_SIZE) {
        reject(new Error(`Could not compress ${file.name} below 1 MB`));
        return;
      }

      const compressedName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      resolve(new File([compressedBlob], compressedName, { type: 'image/jpeg', lastModified: Date.now() }));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to read ${file.name}`));
    };
    image.src = objectUrl;
  });

function ReturnAttachmentPreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const isImage = file?.type?.startsWith('image/');

  useEffect(() => {
    if (!isImage) return undefined;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  if (!isImage || !previewUrl) {
    return (
      <span className="return-attachment-file-icon">
        <i className="ti ti-file" />
      </span>
    );
  }

  return <img className="return-attachment-preview" src={previewUrl} alt={`Preview ${file.name}`} />;
}

ReturnAttachmentPreview.propTypes = {
  file: PropTypes.object.isRequired
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

const getEtaValue = (item = {}, keys = [], fallback = '-') => getOrderValue(item, keys, fallback);

const getOrderLines = (order = {}) => {
  const lines = getFirstValue(order, ['details', 'lines', 'document_lines', 'documentLines', 'DocumentLines', 'items', 'products']);
  return Array.isArray(lines) ? lines : [];
};

const getOrderListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;

  const list = getFirstValue(payload, [
    'data',
    'items',
    'results',
    'orders',
    'sales_orders',
    'salesOrders',
    'sales_returns',
    'salesReturns',
    'sales_return'
  ]);

  if (Array.isArray(list)) return list;
  return list && typeof list === 'object' ? [list] : [];
};

const getEtaListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;

  const list = getFirstValue(payload, ['data', 'items', 'results', 'eta', 'etas', 'warnings', 'check_eta', 'checkEta']);

  if (Array.isArray(list)) return list;
  if (list && typeof list === 'object') return [list];
  if (payload && typeof payload === 'object') return [payload];

  return [];
};

const getComparisonListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;

  const list = getFirstValue(payload, ['lines', 'data', 'items', 'results', 'comparison', 'comparisons', 'products']);
  if (Array.isArray(list)) return list;
  if (list?.lines && Array.isArray(list.lines)) return list.lines;
  if (list && typeof list === 'object') return [list];

  return [];
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

const normalizeComparisonData = (payload = {}) =>
  getComparisonListPayload(payload).map((item, index) => {
    return {
      id: getFirstValue(item, ['id', 'item_code', 'brand']) || index,
      brand: getFirstValue(item, ['brand']) || '-',
      target: getNumberValue(item, ['target_amount']),
      cmo: getNumberValue(item, ['cmo_amount']),
      salesOrder: getNumberValue(item, ['so_amount']),
      completedOrder: getNumberValue(item, ['do_amount'])
    };
  });

const formatComparisonValue = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value) || 0);

const formatComparisonPercentage = (value, target) => {
  const percentage = Number(target) > 0 ? (Number(value || 0) / Number(target)) * 100 : 0;

  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(percentage)}%`;
};

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
  const [orderToComplete, setOrderToComplete] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [loadingViewOrderId, setLoadingViewOrderId] = useState(null);
  const [completeOrderActionMenu, setCompleteOrderActionMenu] = useState(null);
  const [expandedDoOrderId, setExpandedDoOrderId] = useState(null);
  const [loadingDoOrderId, setLoadingDoOrderId] = useState(null);
  const [doDetailsByOrderId, setDoDetailsByOrderId] = useState({});
  const [doErrorsByOrderId, setDoErrorsByOrderId] = useState({});
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnRequests, setReturnRequests] = useState([]);
  const [selectedReturnHistory, setSelectedReturnHistory] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [returnAttachments, setReturnAttachments] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [compressingAttachments, setCompressingAttachments] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [orderSummary, setOrderSummary] = useState({ totalOrder: 0, totalAmount: 0, totalItem: 0 });
  const [chartData, setChartData] = useState(() => emptyChartData());
  const [topProductsChartData, setTopProductsChartData] = useState(() => emptyTopProductsChartData());
  const [statusSummary, setStatusSummary] = useState([]);
  const [etaWarnings, setEtaWarnings] = useState([]);
  const [isLoadingEta, setIsLoadingEta] = useState(false);
  const [etaError, setEtaError] = useState('');
  const [orderComparison, setOrderComparison] = useState([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState(true);
  const [comparisonError, setComparisonError] = useState('');
  const [comparisonCustomers, setComparisonCustomers] = useState([]);
  const [isLoadingComparisonCustomers, setIsLoadingComparisonCustomers] = useState(false);
  const chartContainerRef = useRef(null);
  const assignedCustomerCodes = useMemo(() => getAssignedCustomerCodes(), []);
  const customerCode = getAssignedCustomerCode();
  const isDistributor = Boolean(customerCode);
  const [comparisonFilters, setComparisonFilters] = useState({
    months: [moment().month() + 1],
    year: currentComparisonYear,
    customerCode: ''
  });

  const handleComparisonMonthChange = (option) => {
    if (!option) return;
    setComparisonFilters((current) => ({ ...current, months: [Number(option.value)] }));
  };

  const comparisonCustomerOptions = useMemo(() => {
    const options = comparisonCustomers
      .map((customer) => {
        const code = getFirstValue(customer, ['code_customer', 'customer_code', 'customerCode', 'code']);
        const name = getFirstValue(customer, ['name', 'customer_name', 'customerName', 'name_distributor']);
        const depo = getFirstValue(customer, ['depo', 'depot', 'customer_depo', 'customerDepot']);

        return code ? { value: String(code), label: `${code} - ${name || '-'} - ${depo || '-'}` } : null;
      })
      .filter(Boolean);

    if (assignedCustomerCodes.length === 1 && !options.some((option) => option.value === assignedCustomerCodes[0])) {
      options.unshift({ value: assignedCustomerCodes[0], label: `${assignedCustomerCodes[0]} - - -` });
    }

    return assignedCustomerCodes.length ? options : [{ value: '', label: 'All Customer' }, ...options];
  }, [assignedCustomerCodes, comparisonCustomers]);

  const comparisonTotals = useMemo(
    () =>
      orderComparison.reduce(
        (totals, item) => ({
          target: totals.target + item.target,
          cmo: totals.cmo + item.cmo,
          salesOrder: totals.salesOrder + item.salesOrder,
          completedOrder: totals.completedOrder + item.completedOrder
        }),
        { target: 0, cmo: 0, salesOrder: 0, completedOrder: 0 }
      ),
    [orderComparison]
  );

  const comparisonChart = useMemo(
    () => ({
      series: [
        { name: 'Target', data: orderComparison.map((item) => item.target) },
        { name: 'CMO', data: orderComparison.map((item) => item.cmo) },
        { name: 'Process', data: orderComparison.map((item) => item.salesOrder) },
        { name: 'Completed Orders', data: orderComparison.map((item) => item.completedOrder) }
      ],
      options: {
        chart: {
          toolbar: { show: false },
          zoom: { enabled: false }
        },
        colors: ['#315fb4', '#f59e0b', '#06b6d4', '#16a34a'],
        dataLabels: { enabled: false },
        grid: {
          borderColor: 'var(--bs-border-color)',
          strokeDashArray: 4
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left'
        },
        plotOptions: {
          bar: {
            borderRadius: 3,
            barHeight: '72%',
            horizontal: true
          }
        },
        xaxis: {
          categories: orderComparison.map((item) => item.brand),
          labels: {
            formatter: (value) => formatComparisonValue(value)
          }
        },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (value) => `${formatComparisonValue(value)} Kg`
          }
        }
      }
    }),
    [orderComparison]
  );

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

  useEffect(() => {
    const fetchEtaWarning = async () => {
      setIsLoadingEta(true);
      setEtaError('');

      const payload = {
        customer_code: isDistributor ? customerCode || '' : '',
        eta_date_request: moment().format('YYYY-MM-DD')
      };

      try {
        const response = await OrderServices.getCheckEta(payload);

        if (response?.data?.success === false) {
          setEtaWarnings([]);
          setEtaError(response.data.message || 'Failed to fetch ETA warning data');
          return;
        }

        setEtaWarnings(getEtaListPayload(getResponsePayload(response)));
      } catch (error) {
        setEtaWarnings([]);
        setEtaError(error?.message || 'Failed to fetch ETA warning data');
      } finally {
        setIsLoadingEta(false);
      }
    };

    fetchEtaWarning();
  }, [customerCode, isDistributor]);

  useEffect(() => {
    const fetchOrderComparison = async () => {
      setIsLoadingComparison(true);
      setComparisonError('');

      try {
        const monthParameter =
          comparisonFilters.months.length > 1
            ? comparisonFilters.months.join(',')
            : comparisonFilters.months[0] || '';
        const response = await DashboardServices.getCompareOrder(
          monthParameter,
          comparisonFilters.year,
          comparisonFilters.customerCode,
          ''
        );

        if (response?.data?.success === false) {
          setOrderComparison([]);
          setComparisonError(response.data.message || 'Failed to fetch order comparison data');
          return;
        }

        setOrderComparison(normalizeComparisonData(getResponsePayload(response)));
      } catch (error) {
        setOrderComparison([]);
        setComparisonError(error?.response?.data?.message || error?.message || 'Failed to fetch order comparison data');
      } finally {
        setIsLoadingComparison(false);
      }
    };

    fetchOrderComparison();
  }, [comparisonFilters]);

  useEffect(() => {
    const fetchComparisonCustomers = async () => {
      setIsLoadingComparisonCustomers(true);

      try {
        const response = await DistributorServices.getAllDistributor('');
        setComparisonCustomers(getComparisonListPayload(getResponsePayload(response)));
      } catch {
        setComparisonCustomers([]);
      } finally {
        setIsLoadingComparisonCustomers(false);
      }
    };

    fetchComparisonCustomers();
  }, []);

  const deliveryOrders = useMemo(() => orders.filter((order) => normalizeStatus(order.status) === 'DELIVERY'), [orders]);
  const returnSummaryByDoItem = useMemo(() => {
    const requestsByDoItem = new Map();

    returnRequests.forEach((request) => {
      const requestDoNumber =
        getFirstValue(request, [
          'do_number',
          'do_num',
          'do_no',
          'doNumber',
          'doNum',
          'delivery_order_number',
          'delivery_order_no',
          'deliveryOrderNumber',
          'doc_num',
          'docNum',
          'DocNum'
        ]) ||
        getFirstValue(request?.delivery_order, ['do_number', 'do_num', 'doc_num', 'docNum', 'DocNum']) ||
        getFirstValue(request?.deliveryOrder, ['doNumber', 'doNum', 'docNum', 'DocNum']) ||
        getFirstValue(getOrderLines(request)[0], ['do_number', 'do_num', 'doNumber', 'doNum', 'doc_num', 'docNum', 'DocNum']);
      const requestItems = getOrderLines(request);
      const comparableItems = requestItems.length ? requestItems : [request];

      comparableItems.forEach((item) => {
        const doNumber =
          getFirstValue(item, ['do_number', 'do_num', 'doNumber', 'doNum', 'doc_num', 'docNum', 'DocNum']) ||
          requestDoNumber;
        const itemCode = getFirstValue(item, ['item_code', 'itemCode', 'ItemCode', 'code_item', 'codeItem']);

        if (doNumber !== undefined && doNumber !== null && doNumber !== '' && itemCode) {
          const key = `${String(doNumber).trim()}::${String(itemCode).trim().toUpperCase()}`;
          const currentSummary = requestsByDoItem.get(key) || {
            doNumber: String(doNumber).trim(),
            itemCode: String(itemCode).trim(),
            totalReturnQuantity: 0,
            entries: []
          };
          const returnQuantity = getNumberValue(item, ['quantity', 'qty', 'return_quantity', 'returnQuantity']);

          currentSummary.totalReturnQuantity += returnQuantity;
          currentSummary.entries.push({
            request,
            item,
            quantity: returnQuantity
          });
          requestsByDoItem.set(key, currentSummary);
        }
      });
    });

    return requestsByDoItem;
  }, [returnRequests]);

  useEffect(() => {
    const fetchReturnRequests = async () => {
      try {
        const response = await OrderServices.getRetur();
        if (response?.data?.success === false) {
          setReturnRequests([]);
          return;
        }

        setReturnRequests(getOrderListPayload(getResponsePayload(response)));
      } catch {
        setReturnRequests([]);
      }
    };

    fetchReturnRequests();
  }, []);

  const formatSapDate = (value) => {
    const compactDate = moment(String(value || ''), 'YYYYMMDD', true);

    return compactDate.isValid() ? compactDate.format('DD MMM YYYY') : formatOrderDate(value);
  };

  const toggleDoDetails = async (order) => {
    const orderId = String(order.id);

    if (String(expandedDoOrderId) === orderId) {
      setExpandedDoOrderId(null);
      return;
    }

    setExpandedDoOrderId(orderId);
    if (Object.prototype.hasOwnProperty.call(doDetailsByOrderId, orderId)) return;

    const soNum = getOrderValue(order, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'], '');

    if (!soNum) {
      setDoErrorsByOrderId((current) => ({ ...current, [orderId]: 'Sales Order number is not available.' }));
      return;
    }

    setLoadingDoOrderId(orderId);
    setDoErrorsByOrderId((current) => ({ ...current, [orderId]: '' }));

    try {
      const response = await OrderServices.getDoBySo(soNum);

      if (response?.data?.success === false) {
        setDoErrorsByOrderId((current) => ({
          ...current,
          [orderId]: response.data.message || 'Failed to fetch Delivery Order details.'
        }));
        return;
      }

      const payload = getResponsePayload(response);
      const details = Array.isArray(payload) ? payload : getOrderListPayload(payload);
      setDoDetailsByOrderId((current) => ({ ...current, [orderId]: Array.isArray(details) ? details : [] }));
    } catch (error) {
      setDoErrorsByOrderId((current) => ({
        ...current,
        [orderId]: error?.response?.data?.message || error?.message || 'Failed to fetch Delivery Order details.'
      }));
    } finally {
      setLoadingDoOrderId(null);
    }
  };

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
      setOrderToComplete(null);
    }
  };

  const closeReturnModal = () => {
    if (submittingReturn || compressingAttachments) return;
    setReturnOrder(null);
    setReturnQuantities({});
    setReturnReason('');
    setReturnAttachments([]);
  };

  const openReturnOrder = (order, doIndex) => {
    if (!order?.id) {
      showAlert('Order ID not found', 'danger');
      return;
    }

    const orderId = String(order.id);
    const doDetail = (doDetailsByOrderId[orderId] || [])[doIndex];

    if (!doDetail) {
      showAlert('Delivery Order detail not found', 'danger');
      return;
    }

    const doNumber = getOrderValue(doDetail, ['DocNum', 'doc_num', 'docNum', 'do_num', 'doNumber'], '');
    const itemCode = getOrderValue(doDetail, ['ItemCode', 'item_code', 'itemCode'], '');
    const returnSummary = returnSummaryByDoItem.get(`${String(doNumber).trim()}::${String(itemCode).trim().toUpperCase()}`);
    const deliveredQuantity = getNumberValue(doDetail, ['Delivered_Qty', 'delivered_qty', 'deliveredQty', 'quantity', 'qty']);
    const remainingQuantity = Math.max(deliveredQuantity - (returnSummary?.totalReturnQuantity || 0), 0);

    if (remainingQuantity <= 0) {
      showAlert('The delivered quantity has been fully returned', 'warning');
      return;
    }

    const returnLine = {
      ...doDetail,
      id: getOrderValue(doDetail, ['id', 'sales_order_detail_id', 'salesOrderDetailId'], ''),
      sales_order_detail_id: getOrderValue(doDetail, ['sales_order_detail_id', 'salesOrderDetailId', 'id'], ''),
      item_code: getOrderValue(doDetail, ['ItemCode', 'item_code', 'itemCode'], ''),
      item_name: getOrderValue(doDetail, ['ItemDescription', 'ItemName', 'item_name', 'itemName'], ''),
      quantity: remainingQuantity,
      delivered_quantity: deliveredQuantity,
      returned_quantity: returnSummary?.totalReturnQuantity || 0
    };

    setReturnOrder({
      ...order,
      details: [returnLine],
      lines: [returnLine],
      selected_do_index: doIndex,
      selected_do_detail: doDetail
    });
    setReturnQuantities({});
    setReturnReason('');
    setReturnAttachments([]);
  };

  const openOrderDetail = async (order) => {
    if (!order?.id) {
      showAlert('Order ID not found', 'danger');
      return;
    }

    setViewOrder(order);
    setLoadingViewOrderId(order.id);
    try {
      const response = await OrderServices.getDetailOrder(order.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch sales order detail');

      const payload = getResponsePayload(response);
      const detail = Array.isArray(payload) ? payload[0] : payload;
      setViewOrder({ ...order, ...(detail || {}) });
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch sales order detail', 'danger');
    } finally {
      setLoadingViewOrderId(null);
    }
  };

  const updateReturnQuantity = (lineKey, value, maximumQuantity) => {
    if (value === '') {
      setReturnQuantities((current) => ({ ...current, [lineKey]: '' }));
      return;
    }

    const quantity = Math.min(Math.max(Number(value) || 0, 0), maximumQuantity);
    setReturnQuantities((current) => ({ ...current, [lineKey]: quantity }));
  };

  const handleReturnAttachments = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    const availableSlots = MAX_RETURN_ATTACHMENTS - returnAttachments.length;

    if (availableSlots <= 0) {
      showAlert(`Maximum ${MAX_RETURN_ATTACHMENTS} attachment files`, 'danger');
      return;
    }
    if (selectedFiles.length > availableSlots) {
      showAlert(`Only ${availableSlots} more attachment file(s) can be added`, 'warning');
    }

    setCompressingAttachments(true);
    const acceptedFiles = [];
    const rejectedMessages = [];

    for (const file of selectedFiles.slice(0, availableSlots)) {
      try {
        if (file.size <= MAX_RETURN_ATTACHMENT_SIZE) {
          acceptedFiles.push(file);
        } else if (file.type.startsWith('image/')) {
          acceptedFiles.push(await compressReturnImage(file));
        } else {
          rejectedMessages.push(`${file.name} exceeds 1 MB`);
        }
      } catch (error) {
        rejectedMessages.push(error.message);
      }
    }

    setReturnAttachments((currentFiles) => {
      const filesByIdentity = new Map(
        [...currentFiles, ...acceptedFiles].map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file])
      );
      return [...filesByIdentity.values()].slice(0, MAX_RETURN_ATTACHMENTS);
    });
    setCompressingAttachments(false);

    if (rejectedMessages.length) showAlert(rejectedMessages.join(', '), 'danger');
  };

  const submitReturnRequest = async () => {
    const doDetail = returnOrder?.selected_do_detail || {};
    const returnLine = getOrderLines(returnOrder)[0] || {};
    const identity = getOrderValue(
      returnLine,
      ['id', 'sales_order_detail_id', 'line_num', 'lineNum', 'item_code', 'itemCode', 'ItemCode'],
      0
    );
    const lineKey = `${identity}-0`;
    const returnQuantity = Number(returnQuantities[lineKey]) || 0;
    const doNumber = getOrderValue(doDetail, ['DocNum', 'doc_num', 'docNum', 'do_num', 'doNumber'], '');
    const docDate = getOrderValue(doDetail, ['docDate', 'DocDate', 'doc_date', 'do_date', 'doDate'], '');
    const baseLine = getOrderValue(doDetail, ['BaseLine', 'base_line', 'baseLine'], '');
    const doQuantity = getNumberValue(doDetail, ['Delivered_Qty', 'delivered_qty', 'deliveredQty']);
    const items =
      returnQuantity > 0
        ? [
            {
              sales_order_detail_id: returnOrder.id,
              do_num: doNumber,
              do_date: docDate,
              baseline: baseLine,
              do_quantity: doQuantity,
              item_code: getOrderValue(doDetail, ['ItemCode', 'item_code', 'itemCode'], ''),
              item_description: getOrderValue(doDetail, ['ItemDescription', 'item_description', 'itemDescription'], ''),
              delivered_quantity: doQuantity,
              quantity: returnQuantity,
              reason: returnReason.trim()
            }
          ]
        : [];

    if (!returnReason.trim()) {
      showAlert('Reason is required', 'danger');
      return;
    }
    if (!items.length) {
      showAlert('Enter return quantity for at least one product', 'danger');
      return;
    }

    setSubmittingReturn(true);
    try {
      const response = await OrderServices.postRequestRetur({
        sales_order_id: returnOrder.id,
        do_num: doNumber,
        do_date: docDate,
        baseline: baseLine,
        do_quantity: doQuantity,
        do_status: getOrderValue(doDetail, ['Status', 'status'], ''),
        items,
        attachments: returnAttachments
      });

      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to submit return request');
      const createdReturn = getResponsePayload(response);
      setReturnRequests((currentRequests) => [
        ...currentRequests,
        {
          ...(createdReturn && typeof createdReturn === 'object' && !Array.isArray(createdReturn) ? createdReturn : {}),
          sales_order_id:
            getFirstValue(createdReturn, ['sales_order_id', 'salesOrderId', 'order_id', 'orderId']) || returnOrder.id,
          do_num:
            getFirstValue(createdReturn, ['do_number', 'do_num', 'doNumber', 'doNum', 'doc_num', 'docNum']) || doNumber,
          items: getOrderLines(createdReturn).length ? getOrderLines(createdReturn) : items,
          status: getFirstValue(createdReturn, ['status', 'return_status', 'returnStatus']) || 'PENDING'
        }
      ]);
      showAlert(response?.data?.message || 'Return request submitted successfully', 'success');
      setReturnOrder(null);
      setReturnQuantities({});
      setReturnReason('');
      setReturnAttachments([]);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to submit return request', 'danger');
    } finally {
      setSubmittingReturn(false);
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
    <>
      <Stack gap={3} className="dashboard-content-stack">
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

        {!isLoadingComparison && (
        <MainCard
          className="claim-transaction-card dashboard-comparison-card"
          title={
            <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
              <Stack gap={1}>
                <h5 className="mb-0">Order Comparison</h5>
                <span className="text-muted f-12">
                  Target, CMO, dan Sales Order berdasarkan customer dan periode terpilih.
                </span>
              </Stack>
              <span className="avtar avtar-s bg-light-primary text-primary">
                <i className="ti ti-chart-bar" />
              </span>
            </Stack>
          }
        >
          <Stack gap={3}>
            <Row className="g-3 dashboard-comparison-filters">
              <Col lg={6} md={12}>
                <Form.Label className="f-12 fw-semibold">Customer Code</Form.Label>
                <ReactSelect
                  value={
                    comparisonCustomerOptions.find((option) => option.value === String(comparisonFilters.customerCode || '')) || null
                  }
                  options={comparisonCustomerOptions}
                  isLoading={isLoadingComparisonCustomers}
                  isSearchable
                  placeholder="Search customer code..."
                  noOptionsMessage={() => 'Customer not found'}
                  onChange={(option) =>
                    setComparisonFilters((current) => ({ ...current, customerCode: option?.value || '' }))
                  }
                />
              </Col>
              <Col lg={3} sm={6}>
                <Form.Label className="f-12 fw-semibold">Month</Form.Label>
                <ReactSelect
                  options={comparisonMonthOptions}
                  value={comparisonMonthOptions.find((option) => comparisonFilters.months[0] === option.value) || null}
                  onChange={handleComparisonMonthChange}
                  isClearable={false}
                  placeholder="Select month"
                />
              </Col>
              <Col lg={3} sm={6}>
                <Form.Label className="f-12 fw-semibold">Year</Form.Label>
                <Form.Select
                  value={comparisonFilters.year}
                  onChange={(event) => setComparisonFilters((current) => ({ ...current, year: Number(event.target.value) }))}
                >
                  {comparisonYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            {comparisonError ? (
              <div className="text-center text-danger py-4">{comparisonError}</div>
            ) : orderComparison.length > 0 ? (
              <>
              <Table className="mb-0 align-middle dashboard-comparison-table" responsive hover>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th className="text-end">Target (Kg)</th>
                  <th className="text-end">CMO (Kg)</th>
                  <th className="text-end">Process (Kg)</th>
                  <th className="text-end">Completed Orders (Kg)</th>
                </tr>
              </thead>
              <tbody>
                {orderComparison.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-semibold">{item.brand}</td>
                      <td className="text-end fw-semibold">{formatComparisonValue(item.target)}</td>
                      <td className="text-end">
                        <div>{formatComparisonValue(item.cmo)}</div>
                        <div className="dashboard-comparison-percentage">{formatComparisonPercentage(item.cmo, item.target)}</div>
                      </td>
                      <td className="text-end">
                        <div>{formatComparisonValue(item.salesOrder)}</div>
                        <div className="dashboard-comparison-percentage">
                          {formatComparisonPercentage(item.salesOrder, item.target)}
                        </div>
                      </td>
                      <td className="text-end">
                        <div>{formatComparisonValue(item.completedOrder)}</div>
                        <div className="dashboard-comparison-percentage">
                          {formatComparisonPercentage(item.completedOrder, item.target)}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="dashboard-comparison-total">
                  <td>Total</td>
                  <td className="text-end">{formatComparisonValue(comparisonTotals.target)}</td>
                  <td className="text-end">
                    <div>{formatComparisonValue(comparisonTotals.cmo)}</div>
                    <div className="dashboard-comparison-percentage">
                      {formatComparisonPercentage(comparisonTotals.cmo, comparisonTotals.target)}
                    </div>
                  </td>
                  <td className="text-end">
                    <div>{formatComparisonValue(comparisonTotals.salesOrder)}</div>
                    <div className="dashboard-comparison-percentage">
                      {formatComparisonPercentage(comparisonTotals.salesOrder, comparisonTotals.target)}
                    </div>
                  </td>
                  <td className="text-end">
                    <div>{formatComparisonValue(comparisonTotals.completedOrder)}</div>
                    <div className="dashboard-comparison-percentage">
                      {formatComparisonPercentage(comparisonTotals.completedOrder, comparisonTotals.target)}
                    </div>
                  </td>
                </tr>
              </tfoot>
              </Table>
              <div className="dashboard-comparison-chart">
                <h6 className="mb-1">Comparison by Brand</h6>
                <p className="text-muted f-12 mb-2">Target, CMO, process, and completed order amounts.</p>
                <ReactApexChart
                  options={comparisonChart.options}
                  series={comparisonChart.series}
                  type="bar"
                  height={Math.max(320, orderComparison.length * 70)}
                  width="100%"
                />
              </div>
              </>
            ) : (
              <div className="text-center text-muted py-4">No order comparison data for this period.</div>
            )}
          </Stack>
        </MainCard>
        )}

        {!isLoadingEta && etaWarnings.length > 0 && (
          <Row className="g-3 align-items-stretch dashboard-action-cards">
            <Col xs={12} className="d-flex">
            <MainCard
              className="claim-transaction-card eta-warning-card border border-danger h-100 w-100"
              title={
            <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
              <Stack gap={1}>
                <Stack direction="horizontal" gap={2} className="align-items-center">
                  <h5 className="mb-0">ETA Warning</h5>
                  <Badge bg="danger">Warning</Badge>
                </Stack>
                <span className="text-muted f-12">
                  ETA check for {moment().format('DD MMM YYYY')}
                  {isDistributor && customerCode ? ` - ${customerCode}` : ''}
                </span>
              </Stack>
              <span className="avtar avtar-s bg-danger text-white eta-warning-icon">
                <i className="ti ti-alert-triangle" />
              </span>
            </Stack>
          }
        >
          {isLoadingEta ? (
            <div className="text-center text-muted py-4">Loading ETA warning data...</div>
          ) : etaError ? (
            <div className="text-center text-danger py-4">{etaError}</div>
          ) : etaWarnings.length > 0 ? (
            <Table className="mb-0 align-middle" responsive hover>
              <thead>
                <tr>
                  <th>No. SO</th>
                  <th>Tgl ETA</th>
                  <th>Total</th>
                  <th>Customer / Depo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {etaWarnings.map((item, index) => {
                  const etaDate = getEtaValue(item, ['eta_date_request', 'etaDateRequest', 'eta_date', 'etaDate', 'date'], null);
                  const parsedEtaDate = moment(etaDate);
                  const status = getEtaValue(item, ['status', 'type', 'level'], 'Warning');
                  const salesOrderNumber = getEtaValue(
                    item,
                    ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo', 'so_no', 'soNo'],
                    '-'
                  );
                  const totalOrder = getEtaValue(item, ['doc_total', 'docTotal', 'total', 'total_order', 'totalOrder'], 0);

                  return (
                    <tr key={`${salesOrderNumber}-${index}`}>
                      <td className="fw-semibold">{salesOrderNumber}</td>
                      <td>{parsedEtaDate.isValid() ? parsedEtaDate.format('DD MMM YYYY') : '-'}</td>
                      <td>{currency(totalOrder)}</td>
                      <td>
                        <div className="fw-semibold">
                          {getEtaValue(item, ['customer_name', 'customerName', 'card_name', 'cardName', 'name'], '-')}
                        </div>
                        <div className="text-muted f-12">
                          {getEtaValue(item, ['depo', 'depot', 'warehouse_name', 'warehouseName'], '-')}
                        </div>
                      </td>
                      <td>
                        <Badge bg="danger">{status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">No ETA warning for today.</div>
          )}
              </MainCard>
            </Col>
          </Row>
        )}

        <Row className="g-3 align-items-stretch dashboard-action-cards">
          <Col xs={12} className="d-flex">
            <MainCard
              className="claim-transaction-card complete-order-card border border-success h-100 w-100"
              title={
                <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
                  <Stack gap={1}>
                    <Stack direction="horizontal" gap={2} className="align-items-center">
                      <h5 className="mb-0">Complete Order</h5>
                      <Badge bg="success">Ready</Badge>
                    </Stack>
                    <span className="text-muted f-12">Sales orders with delivery status that need to be completed.</span>
                  </Stack>
                  <span className="avtar avtar-s bg-success text-white complete-order-icon">
                    <i className="ti ti-circle-check" />
                  </span>
                </Stack>
          }
        >
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th className="text-center complete-order-expand-column" aria-label="Delivery Order details" />
                <th>No. SO</th>
                <th>Depo</th>
                <th>Date</th>
                <th>Total Order</th>
                <th>Status</th>
                <th className="text-center complete-order-actions-column">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingOrders ? (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center text-muted py-4">Loading delivery sales orders...</div>
                  </td>
                </tr>
              ) : deliveryOrders.length > 0 ? (
                deliveryOrders.map((order) => {
                  const orderDate = moment(getOrderValue(order, ['doc_date', 'docDate', 'created_at', 'createdAt'], null));
                  const orderId = String(order.id);
                  const isDoExpanded = String(expandedDoOrderId) === orderId;
                  const isLoadingDo = String(loadingDoOrderId) === orderId;
                  const doDetails = doDetailsByOrderId[orderId] || [];
                  const doError = doErrorsByOrderId[orderId];

                  return (
                    <Fragment key={order.id}>
                      <tr>
                        <td className="text-center complete-order-expand-column">
                          <Button
                            className="complete-order-expand-btn"
                            variant="warning"
                            size="sm"
                            disabled={isLoadingDo}
                            onClick={() => toggleDoDetails(order)}
                            aria-expanded={isDoExpanded}
                            title={isDoExpanded ? 'Hide Delivery Order details' : 'Show Delivery Order details'}
                            aria-label={isDoExpanded ? 'Hide Delivery Order details' : 'Show Delivery Order details'}
                          >
                            <i
                              className={`ti ${isLoadingDo ? 'ti-loader-2' : isDoExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                            />
                          </Button>
                        </td>
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
                        <td className="text-center complete-order-actions-column">
                          <Button
                            size="sm"
                            variant={
                              String(completeOrderActionMenu?.order?.id) === String(order.id) ? 'primary' : 'outline-primary'
                            }
                            aria-label="Open complete order actions"
                            aria-expanded={String(completeOrderActionMenu?.order?.id) === String(order.id)}
                            onClick={(event) =>
                              setCompleteOrderActionMenu((current) =>
                                String(current?.order?.id) === String(order.id)
                                  ? null
                                  : { order, target: event.currentTarget }
                              )
                            }
                          >
                            <i className="ti ti-dots-vertical me-1" />
                            Actions
                            <i className="ti ti-chevron-down ms-1" />
                          </Button>
                        </td>
                      </tr>
                      {isDoExpanded ? (
                        <tr className="bg-light">
                          <td colSpan={7} className="p-3">
                            <div className="border rounded bg-white overflow-hidden">
                              {isLoadingDo ? (
                                <div className="text-center text-muted py-4">Loading Delivery Order details...</div>
                              ) : doError ? (
                                <div className="text-center text-danger py-4">{doError}</div>
                              ) : (
                                <Table className="mb-0 align-middle" responsive size="sm">
                                  <thead>
                                    <tr>
                                      <th>Status</th>
                                      <th>DO Number</th>
                                      <th>DO Date</th>
                                      <th>Base Line</th>
                                      <th>Item Code</th>
                                      <th>Item Description</th>
                                      <th className="text-end">Delivered Qty</th>
                                      <th>Status Retur</th>
                                      <th className="text-center">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {doDetails.length ? (
                                      doDetails.map((detail, index) => {
                                        const doReturnSummary = returnSummaryByDoItem.get(
                                          `${String(detail.DocNum || '').trim()}::${String(detail.ItemCode || '')
                                            .trim()
                                            .toUpperCase()}`
                                        );
                                        const latestReturnRequest = doReturnSummary?.entries.at(-1)?.request;
                                        const doReturnStatus = getOrderValue(
                                          latestReturnRequest,
                                          ['status', 'return_status', 'returnStatus'],
                                          '-'
                                        );
                                        const normalizedDoReturnStatus = normalizeStatus(doReturnStatus);
                                        const doReturnStatusColor = ['APPROVED', 'COMPLETED', 'SUCCESS'].includes(
                                          normalizedDoReturnStatus
                                        )
                                          ? 'success'
                                          : ['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(normalizedDoReturnStatus)
                                            ? 'danger'
                                            : 'warning';
                                        const deliveredQuantity = Number(detail.Delivered_Qty) || 0;
                                        const returnedQuantity = doReturnSummary?.totalReturnQuantity || 0;
                                        const remainingQuantity = Math.max(deliveredQuantity - returnedQuantity, 0);

                                        return (
                                          <tr key={`${detail.DocNum || 'do'}-${detail.BaseLine || index}-${detail.ItemCode || index}`}>
                                            <td>{detail.Status || '-'}</td>
                                            <td className="fw-semibold">{detail.DocNum || '-'}</td>
                                            <td>{formatSapDate(detail.DocDate)}</td>
                                            <td>{detail.BaseLine ?? '-'}</td>
                                            <td>{detail.ItemCode || '-'}</td>
                                            <td>{detail.ItemDescription || '-'}</td>
                                            <td className="text-end">
                                              {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(
                                                deliveredQuantity
                                              )}
                                              {doReturnSummary ? (
                                                <small className="d-block text-muted">
                                                  Returned {formatComparisonValue(returnedQuantity)} · Remaining{' '}
                                                  {formatComparisonValue(remainingQuantity)}
                                                </small>
                                              ) : null}
                                            </td>
                                            <td>
                                              {doReturnSummary ? (
                                                <Button
                                                  variant="link"
                                                  className="p-0 text-decoration-none"
                                                  onClick={() =>
                                                    setSelectedReturnHistory({
                                                      ...doReturnSummary,
                                                      deliveredQuantity,
                                                      remainingQuantity,
                                                      itemDescription: detail.ItemDescription || '-'
                                                    })
                                                  }
                                                >
                                                  <Badge bg={doReturnStatusColor}>{String(doReturnStatus).replace(/_/g, ' ')}</Badge>
                                                  <small className="d-block mt-1">{doReturnSummary.entries.length} return detail</small>
                                                </Button>
                                              ) : (
                                                '-'
                                              )}
                                            </td>
                                            <td className="text-center">
                                              <Button
                                                variant="warning"
                                                size="sm"
                                                disabled={remainingQuantity <= 0}
                                                onClick={() => openReturnOrder(order, index)}
                                              >
                                                <i className="ti ti-package-export me-1" />
                                                {remainingQuantity <= 0 ? 'Fully Returned' : doReturnSummary ? 'Return Remaining' : 'Request Return'}
                                              </Button>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={9} className="text-center text-muted py-4">
                                          Delivery Order details are not available.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </Table>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center text-muted py-4">No delivery sales orders.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
            </MainCard>
          </Col>
        </Row>

        <Row className="g-3">
          <Col sm={6} xl={4}>
            <Card className="dashboard-summary-card border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between" gap={3}>
                  <div>
                    <div className="text-muted f-12">Sales Order Value This Month</div>
                    <h4 className="mb-0">{isLoadingOrders ? '-' : currency(orderSummary.totalOrder)}</h4>
                    <small className="text-muted">Total value of all sales orders recorded during the current month.</small>
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
                    <div className="text-muted f-12">Order Count This Month</div>
                    <h4 className="mb-0">{isLoadingOrders ? '-' : orderSummary.totalAmount}</h4>
                    <small className="text-muted">Number of sales order transactions recorded during the current month.</small>
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
                    <div className="text-muted f-12">Total Quantity This Month (Kg)</div>
                    <h4 className="mb-0">{isLoadingOrders ? '-' : orderSummary.totalItem}</h4>
                    <small className="text-muted">Total product weight from sales orders recorded during the current month.</small>
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

      <Overlay
        show={Boolean(completeOrderActionMenu)}
        target={completeOrderActionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        popperConfig={completeOrderActionPopperConfig}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setCompleteOrderActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const order = completeOrderActionMenu?.order;
          const isLoadingDetail = String(loadingViewOrderId) === String(order?.id);
          const isCompleting = String(receivingOrderId) === String(order?.id);

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 190 }}
            >
              <button
                type="button"
                className="dropdown-item"
                disabled={isLoadingDetail}
                onClick={() => {
                  setCompleteOrderActionMenu(null);
                  if (order) openOrderDetail(order);
                }}
              >
                <i className={isLoadingDetail ? 'ti ti-loader-2 text-primary me-2' : 'ti ti-eye text-primary me-2'} />
                Detail
              </button>
              <button
                type="button"
                className="dropdown-item text-success"
                disabled={isCompleting}
                onClick={() => {
                  setCompleteOrderActionMenu(null);
                  if (order) setOrderToComplete(order);
                }}
              >
                <i className={isCompleting ? 'ti ti-loader-2 me-2' : 'ti ti-circle-check me-2'} />
                Complete Order
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal
        show={Boolean(viewOrder)}
        onHide={() => loadingViewOrderId === null && setViewOrder(null)}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton={loadingViewOrderId === null}>
          <Modal.Title>Sales Order Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col sm={6} lg={3}>
              <small className="text-muted">No. Sales Order</small>
              <div className="fw-semibold">
                {getOrderValue(viewOrder, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'])}
              </div>
            </Col>
            <Col sm={6} lg={3}>
              <small className="text-muted">Customer</small>
              <div className="fw-semibold">
                {getOrderValue(viewOrder, ['customer_name', 'customerName', 'card_name', 'cardName'])}
              </div>
            </Col>
            <Col sm={6} lg={2}>
              <small className="text-muted">Depo</small>
              <div className="fw-semibold">{getOrderValue(viewOrder, ['depo', 'depot', 'warehouse_name', 'warehouseName'])}</div>
            </Col>
            <Col sm={6} lg={2}>
              <small className="text-muted">Order Date</small>
              <div className="fw-semibold">
                {formatOrderDate(getOrderValue(viewOrder, ['doc_date', 'docDate', 'created_at', 'createdAt'], ''))}
              </div>
            </Col>
            <Col sm={6} lg={2}>
              <small className="text-muted">Status</small>
              <div><Badge bg="info">{getOrderValue(viewOrder, ['status'], 'Delivery')}</Badge></div>
            </Col>
          </Row>

          {loadingViewOrderId !== null ? (
            <div className="text-center text-muted py-5">Loading sales order detail...</div>
          ) : getOrderLines(viewOrder).length ? (
            <Table responsive bordered hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {getOrderLines(viewOrder).map((line, index) => {
                  const quantity = getNumberValue(line, ['quantity', 'qty', 'Quantity']);
                  const unitPrice = getNumberValue(line, ['unit_price', 'unitPrice', 'price', 'Price']);
                  const lineTotal = getNumberValue(line, ['line_total', 'lineTotal', 'LineTotal']) || quantity * unitPrice;

                  return (
                    <tr key={`${getOrderValue(line, ['id', 'item_code', 'itemCode', 'ItemCode'], index)}-${index}`}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{getOrderValue(line, ['item_code', 'itemCode', 'ItemCode'])}</td>
                      <td>
                        {getOrderValue(line, ['item_name', 'itemName', 'ItemName', 'description', 'Dscription', 'item_description'])}
                      </td>
                      <td className="text-end">{quantity}</td>
                      <td className="text-end">{currency(unitPrice)}</td>
                      <td className="text-end fw-semibold">{currency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-5">No product detail found for this sales order.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setViewOrder(null)} disabled={loadingViewOrderId !== null}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(returnOrder)} onHide={closeReturnModal} size="xl" centered scrollable>
        <Modal.Header closeButton={!submittingReturn && !compressingAttachments}>
          <Modal.Title>Request Return</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col sm={6} lg>
              <small className="text-muted">No. Sales Order</small>
              <div className="fw-semibold">
                {getOrderValue(returnOrder, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'])}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">No. Delivery Order</small>
              <div className="fw-semibold">
                {getOrderValue(returnOrder?.selected_do_detail, ['DocNum', 'doc_num', 'docNum', 'do_num', 'doNum'])}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">Customer</small>
              <div className="fw-semibold">
                {getOrderValue(returnOrder, ['customer_name', 'customerName', 'card_name', 'cardName'])}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">Depo</small>
              <div className="fw-semibold">{getOrderValue(returnOrder, ['depo', 'depot', 'warehouse_name', 'warehouseName'])}</div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">DO Date</small>
              <div className="fw-semibold">
                {formatSapDate(getOrderValue(returnOrder?.selected_do_detail, ['DocDate', 'doc_date', 'docDate'], ''))}
              </div>
            </Col>
          </Row>

          {getOrderLines(returnOrder).length ? (
            <Table responsive bordered hover className="mb-4 align-middle">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th className="text-end">Delivered Qty</th>
                  <th className="text-end">Returned Qty</th>
                  <th className="text-end">Remaining Qty</th>
                  <th style={{ minWidth: 160 }}>Qty Retur</th>
                </tr>
              </thead>
              <tbody>
                {getOrderLines(returnOrder).map((line, index) => {
                  const identity = getOrderValue(
                    line,
                    ['id', 'sales_order_detail_id', 'line_num', 'lineNum', 'item_code', 'itemCode', 'ItemCode'],
                    index
                  );
                  const lineKey = `${identity}-${index}`;
                  const remainingQuantity = getNumberValue(line, ['quantity', 'qty', 'Quantity']);
                  const deliveredQuantity = getNumberValue(line, ['delivered_quantity', 'deliveredQuantity']);
                  const returnedQuantity = getNumberValue(line, ['returned_quantity', 'returnedQuantity']);

                  return (
                    <tr key={lineKey}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{getOrderValue(line, ['item_code', 'itemCode', 'ItemCode'])}</td>
                      <td>
                        {getOrderValue(line, ['item_name', 'itemName', 'ItemName', 'description', 'Dscription', 'item_description'])}
                      </td>
                      <td className="text-end">{formatComparisonValue(deliveredQuantity)}</td>
                      <td className="text-end">{formatComparisonValue(returnedQuantity)}</td>
                      <td className="text-end fw-semibold text-success">{formatComparisonValue(remainingQuantity)}</td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          max={remainingQuantity}
                          step={1}
                          value={returnQuantities[lineKey] ?? ''}
                          onChange={(event) => updateReturnQuantity(lineKey, event.target.value, remainingQuantity)}
                        />
                        <small className="text-muted">Maximum {formatComparisonValue(remainingQuantity)}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">No product detail found for this sales order.</div>
          )}

          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Reason</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  placeholder="Enter return reason"
                  disabled={submittingReturn}
                  required
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group className="return-attachment-group">
                <Form.Label>Attachment</Form.Label>
                <Form.Control
                  id="return-attachments"
                  type="file"
                  name="attachment[]"
                  multiple
                  className="visually-hidden"
                  onChange={handleReturnAttachments}
                  disabled={submittingReturn || compressingAttachments || returnAttachments.length >= MAX_RETURN_ATTACHMENTS}
                />
                <label
                  className={`return-attachment-dropzone ${
                    submittingReturn || compressingAttachments || returnAttachments.length >= MAX_RETURN_ATTACHMENTS ? 'is-disabled' : ''
                  }`}
                  htmlFor="return-attachments"
                >
                  <span className="return-attachment-icon">
                    <i className="ti ti-cloud-upload" />
                  </span>
                  <span>
                    <strong>{compressingAttachments ? 'Compressing files...' : 'Choose attachment files'}</strong>
                    <small>Maximum 5 files, 1 MB per file. Large images are compressed automatically.</small>
                  </span>
                  <Badge bg={returnAttachments.length ? 'primary' : 'light'} text={returnAttachments.length ? undefined : 'dark'}>
                    {returnAttachments.length} file
                  </Badge>
                </label>
                {returnAttachments.length > 0 && (
                  <div className="return-attachment-list">
                    {returnAttachments.map((file, index) => (
                      <div className="return-attachment-item" key={`${file.name}-${file.size}-${file.lastModified}`}>
                        <ReturnAttachmentPreview file={file} />
                        <span className="return-attachment-file-info">
                          <strong title={file.name}>{file.name}</strong>
                          <small>{file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</small>
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          className="return-attachment-remove"
                          onClick={() => setReturnAttachments((files) => files.filter((_, fileIndex) => fileIndex !== index))}
                          disabled={submittingReturn}
                          aria-label={`Remove ${file.name}`}
                        >
                          <i className="ti ti-x" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeReturnModal} disabled={submittingReturn || compressingAttachments}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={submitReturnRequest}
            disabled={submittingReturn || compressingAttachments}
          >
            {submittingReturn ? 'Submitting...' : 'Submit Request Return'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedReturnHistory)} onHide={() => setSelectedReturnHistory(null)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Return Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReturnHistory ? (
            <>
              <Row className="g-3 mb-4">
                <Col sm={6}>
                  <small className="text-muted">DO Number</small>
                  <div className="fw-semibold">{selectedReturnHistory.doNumber || '-'}</div>
                </Col>
                <Col sm={6}>
                  <small className="text-muted">Item Code</small>
                  <div className="fw-semibold">{selectedReturnHistory.itemCode || '-'}</div>
                  <small className="text-muted">{selectedReturnHistory.itemDescription}</small>
                </Col>
                <Col sm={4}>
                  <small className="text-muted">Delivered Qty</small>
                  <div className="fw-semibold">{formatComparisonValue(selectedReturnHistory.deliveredQuantity)}</div>
                </Col>
                <Col sm={4}>
                  <small className="text-muted">Total Returned Qty</small>
                  <div className="fw-semibold text-warning">{formatComparisonValue(selectedReturnHistory.totalReturnQuantity)}</div>
                </Col>
                <Col sm={4}>
                  <small className="text-muted">Remaining Qty</small>
                  <div className="fw-semibold text-success">{formatComparisonValue(selectedReturnHistory.remainingQuantity)}</div>
                </Col>
              </Row>
              <Table responsive bordered hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th className="text-end">Return Qty</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturnHistory.entries.map(({ request, item, quantity }, index) => {
                    const requestStatus = getOrderValue(request, ['status', 'return_status', 'returnStatus'], 'PENDING');
                    const normalizedRequestStatus = normalizeStatus(requestStatus);
                    const statusColor = ['APPROVED', 'COMPLETED', 'SUCCESS'].includes(normalizedRequestStatus)
                      ? 'success'
                      : ['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(normalizedRequestStatus)
                        ? 'danger'
                        : 'warning';

                    return (
                      <tr key={request.id || `${selectedReturnHistory.doNumber}-${selectedReturnHistory.itemCode}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{formatOrderDate(getOrderValue(request, ['created_at', 'createdAt', 'request_date'], ''))}</td>
                        <td className="text-end fw-semibold">{formatComparisonValue(quantity)}</td>
                        <td>{getOrderValue(item, ['reason'], getOrderValue(request, ['reason'], '-'))}</td>
                        <td>
                          <Badge bg={statusColor}>{String(requestStatus).replace(/_/g, ' ')}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedReturnHistory(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={Boolean(orderToComplete)}
        title="Complete Sales Order"
        subTitle={`Are you sure you want to complete sales order ${getOrderValue(
          orderToComplete,
          ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'],
          'this order'
        )}?`}
        onSubmit={() => handleCompleteOrder(orderToComplete)}
        onCancel={() => setOrderToComplete(null)}
        loading={receivingOrderId !== null}
      />
    </>
  );
}
