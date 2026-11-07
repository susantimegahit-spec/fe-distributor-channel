import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import ReactApexChart from 'react-apexcharts';
import Select from 'react-select';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

import FormDatePicker from 'components/FormDatePicker';
import MainCard from 'components/MainCard';
import OrderServices from 'services/customer-portal/OrderServices';
import { getAssignedCustomerCodes } from 'utils/cookies';
import { getThemePreference, THEME_CHANGED_EVENT } from 'utils/themePreference';
import './order-summary-widget.scss';

const PAGE_SIZE = 100;
const customerSelectStyles = {
  menu: (base) => ({ ...base, left: 0, right: 0, width: '100%', zIndex: 30 })
};
const STATUS_META = {
  DRAFT: { label: 'Draft', color: '#5f6b7a', darkColor: '#aeb9c6', icon: 'ti ti-file-pencil' },
  WAITING_OM: { label: 'Waiting OM', color: '#d98b00', darkColor: '#ffc857', icon: 'ti ti-clock' },
  WAITING_ASM: { label: 'Waiting ASM', color: '#e76f00', darkColor: '#ff9f43', icon: 'ti ti-clock' },
  WAITING_ADMIN_SALES: { label: 'Waiting Admin Sales', color: '#7048e8', darkColor: '#a78bfa', icon: 'ti ti-user-check' },
  WAITING_FINANCE: { label: 'Waiting Finance', color: '#a83cc1', darkColor: '#e599f7', icon: 'ti ti-cash' },
  ORDER_APPROVED: { label: 'Order Approved', color: '#0ca678', darkColor: '#4dd4ac', icon: 'ti ti-circle-check' },
  DELIVERY: { label: 'Delivery', color: '#1971c2', darkColor: '#4dabf7', icon: 'ti ti-truck-delivery' },
  ARRIVED: { label: 'Arrived', color: '#2b8a3e', darkColor: '#69db7c', icon: 'ti ti-package-import' },
  CANCELLED: { label: 'Cancelled', color: '#68727d', darkColor: '#adb5bd', icon: 'ti ti-circle-minus' },
  REJECTED: { label: 'Rejected', color: '#e03131', darkColor: '#ff6b6b', icon: 'ti ti-circle-x' },
  FAILED: { label: 'Failed', color: '#c92a2a', darkColor: '#ff8787', icon: 'ti ti-alert-triangle' }
};
const STATUS_ORDER = Object.keys(STATUS_META);

const normalizeStatus = (value) => {
  const status = String(value || 'UNKNOWN')
    .trim()
    .toUpperCase();
  if (status === 'WAITING_APPROVAL') return 'WAITING_OM';
  if (status === 'APPROVED') return 'ORDER_APPROVED';
  if (status === 'CANCELED') return 'CANCELLED';
  return status || 'UNKNOWN';
};
const rowsOf = (response) => {
  const root = response?.data ?? {};
  const payload = root?.data ?? root;
  if (Array.isArray(payload)) return payload;
  const rows = payload?.data || payload?.orders || payload?.sales_orders || payload?.salesOrders || payload?.items || payload?.results;
  return Array.isArray(rows) ? rows : [];
};
const pageCountOf = (response) => {
  const root = response?.data ?? {};
  const payload = root?.data ?? root;
  const meta = root?.pagination || root?.meta || payload?.pagination || payload?.meta || payload;
  const total = Number(meta?.total ?? root?.total ?? 0) || 0;
  return Number(meta?.last_page ?? meta?.lastPage ?? root?.last_page ?? 0) || Math.max(Math.ceil(total / PAGE_SIZE), 1);
};
const valueOf = (source, keys, fallback = '') => {
  const key = keys.find((name) => source?.[name] !== undefined && source?.[name] !== null && source?.[name] !== '');
  return key ? source[key] : fallback;
};
const customerOf = (order) => {
  const name = valueOf(order, ['customer_name', 'customerName', 'card_name', 'cardName', 'distributor_name'], '');
  const code = valueOf(order, ['customer_code', 'customerCode', 'card_code', 'cardCode', 'code_customer', 'CardCode'], '');
  return String(name || code || 'Unknown Customer').trim();
};
const branchOf = (order) => {
  const branch = valueOf(
    order,
    ['depo', 'depot', 'depo_name', 'depoName', 'branch', 'branch_name', 'branchName', 'warehouse_name', 'warehouseName'],
    ''
  );
  return String(branch || customerOf(order) || 'Unknown Branch').trim();
};
const orderLinesOf = (order = {}) => {
  const lines = valueOf(order, ['details', 'lines', 'document_lines', 'documentLines', 'DocumentLines', 'items', 'products'], []);
  return Array.isArray(lines) ? lines : [];
};
const productWeightKg = (name = '') => {
  const match = [...String(name).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)].at(-1);
  if (!match) return 0;
  const weight = Number(String(match[1]).replace(',', '.')) || 0;
  return /^(g|gr|gram)$/i.test(match[2]) ? weight / 1000 : weight;
};
const orderWeightKg = (order = {}) => {
  const explicitWeight = Number(valueOf(order, ['total_weight_kg', 'totalWeightKg', 'total_kg', 'totalKg', 'weight'], 0));
  if (explicitWeight > 0) return explicitWeight;
  return orderLinesOf(order).reduce((total, line) => {
    const itemName = valueOf(
      line,
      ['item_name', 'itemName', 'ItemName', 'Dscription', 'description', 'item_description', 'item.name', 'item.item_name'],
      ''
    );
    const quantity = Number(valueOf(line, ['quantity', 'qty', 'Quantity'], 0)) || 0;
    return total + productWeightKg(itemName) * quantity;
  }, 0);
};
const statusLabel = (status) => STATUS_META[status]?.label || status.replaceAll('_', ' ');
const formatCount = (value) => new Intl.NumberFormat('id-ID').format(Number(value) || 0);
const formatKg = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const activeTheme = () => {
  if (typeof document === 'undefined') return getThemePreference();
  const appliedTheme = document.documentElement.dataset.pcTheme || document.documentElement.dataset.bsTheme;
  return appliedTheme === 'dark' ? 'dark' : 'light';
};

export default function OrderSummaryWidget() {
  const assignedCustomerCodes = useMemo(() => getAssignedCustomerCodes(), []);
  const [month, setMonth] = useState(() => moment().format('YYYY-MM'));
  const [orders, setOrders] = useState([]);
  const [customerFilter, setCustomerFilter] = useState(null);
  const [drilldownCustomer, setDrilldownCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [theme, setTheme] = useState(activeTheme);
  const yearOptions = useMemo(() => {
    const currentYear = moment().year();
    const selectedYear = Number(month.slice(0, 4));
    return [...new Set([selectedYear, ...Array.from({ length: 12 }, (_, index) => currentYear + 1 - index)])]
      .filter(Boolean)
      .sort((first, second) => second - first);
  }, [month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const selectedMonth = moment(month, 'YYYY-MM', true);
      if (!selectedMonth.isValid()) throw new Error('Please select a valid month');
      const filters = {
        start_date: selectedMonth.clone().startOf('month').format('YYYY-MM-DD'),
        end_date: selectedMonth.clone().endOf('month').format('YYYY-MM-DD'),
        customer_code: assignedCustomerCodes.length === 1 ? assignedCustomerCodes[0] : '',
        page: 1,
        per_page: PAGE_SIZE
      };
      const firstResponse = await OrderServices.getListOrder(filters);
      if (firstResponse?.data?.success === false) throw new Error(firstResponse.data.message || 'Failed to load order summary');

      const pageCount = pageCountOf(firstResponse);
      const remainingResponses =
        pageCount > 1
          ? await Promise.all(
              Array.from({ length: pageCount - 1 }, (_, index) => OrderServices.getListOrder({ ...filters, page: index + 2 }))
            )
          : [];
      const failedResponse = remainingResponses.find((response) => response?.data?.success === false);
      if (failedResponse) throw new Error(failedResponse.data.message || 'Failed to load all order summary pages');
      setOrders([firstResponse, ...remainingResponses].flatMap(rowsOf));
    } catch (loadError) {
      setOrders([]);
      setError(loadError?.response?.data?.message || loadError?.message || 'Failed to load order summary');
    } finally {
      setLoading(false);
    }
  }, [assignedCustomerCodes, month]);

  useEffect(() => {
    load();
  }, [load, revision]);

  useEffect(() => {
    const handleThemeChanged = () => setTheme(activeTheme());
    const observer = new MutationObserver(handleThemeChanged);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pc-theme', 'data-bs-theme'] });
    handleThemeChanged();
    window.addEventListener(THEME_CHANGED_EVENT, handleThemeChanged);
    return () => {
      observer.disconnect();
      window.removeEventListener(THEME_CHANGED_EVENT, handleThemeChanged);
    };
  }, []);

  const customerOptions = useMemo(
    () =>
      [...new Set(orders.map(customerOf).filter(Boolean))]
        .sort((first, second) => first.localeCompare(second, 'id-ID'))
        .map((customer) => ({ value: customer, label: customer })),
    [orders]
  );

  useEffect(() => {
    if (customerFilter && !customerOptions.some((option) => option.value === customerFilter.value)) setCustomerFilter(null);
  }, [customerFilter, customerOptions]);

  useEffect(() => {
    setDrilldownCustomer(null);
  }, [customerFilter, month]);

  const summary = useMemo(() => {
    const counts = new Map();
    const customers = new Map();
    const branchNames = new Set();
    orders
      .filter((order) => !customerFilter || customerOf(order) === customerFilter.value)
      .forEach((order) => {
        const status = normalizeStatus(order?.status);
        const customer = customerOf(order);
        const branch = branchOf(order);
        const weightKg = orderWeightKg(order);
        counts.set(status, (counts.get(status) || 0) + 1);
        branchNames.add(branch);
        const customerSummary = customers.get(customer) || {
          branchOrders: new Map(),
          branchWeights: new Map(),
          totalOrders: 0,
          totalWeight: 0
        };
        customerSummary.branchOrders.set(branch, (customerSummary.branchOrders.get(branch) || 0) + 1);
        customerSummary.branchWeights.set(branch, (customerSummary.branchWeights.get(branch) || 0) + weightKg);
        customerSummary.totalOrders += 1;
        customerSummary.totalWeight += weightKg;
        customers.set(customer, customerSummary);
      });

    const activeStatuses = [...counts.keys()].sort((first, second) => {
      const firstIndex = STATUS_ORDER.indexOf(first);
      const secondIndex = STATUS_ORDER.indexOf(second);
      return (firstIndex < 0 ? STATUS_ORDER.length : firstIndex) - (secondIndex < 0 ? STATUS_ORDER.length : secondIndex);
    });
    const statuses = [...STATUS_ORDER, ...activeStatuses.filter((status) => !STATUS_ORDER.includes(status))];
    const customerRows = [...customers.entries()]
      .map(([customer, customerSummary]) => ({ customer, ...customerSummary }))
      .sort((first, second) => first.customer.localeCompare(second.customer, 'id-ID'));
    return {
      branchNames: [...branchNames].sort((first, second) => first.localeCompare(second, 'id-ID')),
      counts,
      customers: customerRows,
      statuses
    };
  }, [customerFilter, orders]);

  const chart = useMemo(() => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#dceaff' : '#344054';
    const gridColor = isDark ? 'rgba(145, 190, 226, 0.28)' : 'rgba(71, 84, 103, 0.2)';
    const palette = isDark
      ? ['#ff8787', '#ffd166', '#74c0fc', '#63e6be', '#b197fc', '#ffa94d', '#91a7ff', '#8ce99a', '#e599f7', '#66d9e8']
      : ['#e03131', '#d98b00', '#1971c2', '#0ca678', '#7048e8', '#e8590c', '#4263eb', '#2b8a3e', '#a61eaf', '#087f8c'];
    const selectedCustomer = summary.customers.find((customer) => customer.customer === drilldownCustomer) || null;
    const detailRows = selectedCustomer
      ? [...selectedCustomer.branchWeights.entries()]
          .map(([branch, weight]) => ({ branch, weight, orders: selectedCustomer.branchOrders.get(branch) || 0 }))
          .sort((first, second) => second.weight - first.weight || first.branch.localeCompare(second.branch, 'id-ID'))
      : [];
    const rows = selectedCustomer
      ? detailRows.map((row) => ({ label: row.branch, value: row.weight, orders: row.orders }))
      : summary.customers.map((customer) => ({
          label: customer.customer,
          value: customer.totalWeight,
          orders: customer.totalOrders
        }));
    const seriesColors = rows.map((_, index) => palette[index % palette.length]);
    return {
      detailRows,
      isDetail: Boolean(selectedCustomer),
      rows,
      series: [{ name: selectedCustomer ? 'Branch Total' : 'Customer Total', data: rows.map((row) => row.value) }],
      options: {
        chart: {
          stacked: false,
          background: 'transparent',
          foreColor: textColor,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_event, _chartContext, config) => {
              if (!selectedCustomer && config.dataPointIndex >= 0) {
                setDrilldownCustomer(rows[config.dataPointIndex]?.label || null);
              }
            }
          }
        },
        theme: { mode: theme },
        colors: seriesColors,
        fill: { type: 'solid', opacity: isDark ? 0.28 : 0.2 },
        stroke: { show: true, width: 2, colors: seriesColors },
        dataLabels: {
          enabled: true,
          formatter: (value, options) => {
            if (!value) return '';
            const row = rows[options.dataPointIndex];
            return `${row?.label || '-'} · ${formatKg(value)} Kg · ${formatCount(row?.orders)} orders`;
          },
          textAnchor: 'start',
          offsetY: -8,
          style: {
            fontSize: '10px',
            fontWeight: 700,
            colors: seriesColors.length ? seriesColors : [textColor]
          },
          background: {
            enabled: true,
            foreColor: isDark ? '#e6fbff' : '#183b4d',
            borderRadius: 5,
            padding: 5,
            opacity: isDark ? 0.34 : 0.26,
            borderWidth: 2,
            borderColor: isDark ? '#22d3ee' : '#086f83'
          },
          dropShadow: {
            enabled: true,
            top: 0,
            left: 0,
            blur: 5,
            color: isDark ? '#22d3ee' : '#0891b2',
            opacity: isDark ? 0.65 : 0.35
          }
        },
        grid: { borderColor: gridColor, strokeDashArray: 4, padding: { top: 120, left: 12, right: 12 } },
        legend: { show: false },
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 3,
            borderRadiusApplication: 'end',
            distributed: true,
            columnWidth: '80%',
            dataLabels: { position: 'top', orientation: 'vertical' }
          }
        },
        xaxis: {
          categories: rows.map((row) => row.label),
          labels: {
            rotate: rows.length > 5 ? -35 : 0,
            rotateAlways: rows.length > 5,
            trim: true,
            maxHeight: 100,
            style: { colors: Array(rows.length).fill(textColor) }
          }
        },
        yaxis: {
          title: { text: 'Total Weight (Kg)', style: { color: textColor } },
          labels: { formatter: (value) => `${formatKg(value)} Kg`, style: { colors: [textColor] } }
        },
        tooltip: { theme, shared: true, intersect: false, y: { formatter: (value) => `${formatKg(value)} Kg` } }
      }
    };
  }, [drilldownCustomer, summary, theme]);

  return (
    <MainCard
      className="h-100 sm-dashboard-widget order-summary-widget"
      title={
        <Stack direction="horizontal" className="justify-content-between align-items-start flex-wrap" gap={3}>
          <Stack direction="horizontal" gap={2}>
            <span className="avtar avtar-s bg-light-primary text-primary">
              <i className="ti ti-chart-bar" />
            </span>
            <span>
              <h5 className="mb-0">Order Summary</h5>
              <small className="text-muted">Order status and customer distribution</small>
            </span>
          </Stack>
          <Stack direction="horizontal" gap={2} className="align-items-end">
            <Form.Group controlId="order-summary-customer">
              <Form.Label className="f-12 text-muted mb-1">Customer</Form.Label>
              <Select
                inputId="order-summary-customer"
                className="order-summary-widget__customer-select"
                classNamePrefix="react-select"
                styles={customerSelectStyles}
                value={customerFilter}
                options={customerOptions}
                isClearable
                isSearchable
                placeholder="All customers"
                noOptionsMessage={() => 'Customer not found'}
                onChange={setCustomerFilter}
              />
            </Form.Group>
            <Form.Group controlId="order-summary-month">
              <Form.Label className="f-12 text-muted mb-1">Month</Form.Label>
              <FormDatePicker
                mode="month"
                size="sm"
                value={month}
                clearable={false}
                className="order-summary-widget__month-picker"
                onChange={(event) => setMonth(event.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="order-summary-year">
              <Form.Label className="f-12 text-muted mb-1">Year</Form.Label>
              <Form.Select
                size="sm"
                className="order-summary-widget__year-select"
                value={month.slice(0, 4)}
                onChange={(event) => setMonth((current) => `${event.target.value}-${current.slice(5, 7)}`)}
              >
                {yearOptions.map((year) => (
                  <option value={year} key={year}>
                    {year}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setRevision((value) => value + 1)}
              disabled={loading}
              data-widget-action="sync"
              aria-label="Refresh order summary"
            >
              <i className={`ti ti-refresh ${loading ? 'spin' : ''}`} />
            </Button>
          </Stack>
        </Stack>
      }
    >
      {loading ? (
        <div className="sm-widget-state">
          <Spinner size="sm" />
          <span>Loading order summary...</span>
        </div>
      ) : error ? (
        <div className="sm-widget-state text-danger">{error}</div>
      ) : orders.length ? (
        <>
          <div className="order-summary-widget__statuses">
            {summary.statuses.map((status) => (
              <div
                className="order-summary-widget__status"
                key={status}
                style={{
                  '--status-color':
                    (theme === 'dark' ? STATUS_META[status]?.darkColor : STATUS_META[status]?.color) ||
                    (theme === 'dark' ? '#4dd0e1' : '#087f8c')
                }}
              >
                <span className="order-summary-widget__status-icon">
                  <i className={STATUS_META[status]?.icon || 'ti ti-circle'} />
                </span>
                <span>
                  <small>{statusLabel(status)}</small>
                  <strong>{formatCount(summary.counts.get(status))}</strong>
                </span>
              </div>
            ))}
          </div>
          <div className="order-summary-widget__chart-heading">
            {chart.isDetail ? (
              <Button variant="outline-primary" size="sm" onClick={() => setDrilldownCustomer(null)}>
                <i className="ti ti-arrow-left me-1" /> Back
              </Button>
            ) : null}
            <span>
              <strong>{chart.isDetail ? `Branch Detail — ${drilldownCustomer}` : 'Total Orders by Customer'}</strong>
              <small>
                {chart.isDetail
                  ? `${formatCount(chart.detailRows.length)} branches · click Back to view all customers`
                  : `${formatCount([...summary.counts.values()].reduce((total, count) => total + count, 0))} orders · ${formatCount(summary.customers.length)} customers · click a bar for branch detail`}
              </small>
            </span>
          </div>
          <div className="order-summary-widget__chart-scroll">
            <ReactApexChart
              options={chart.options}
              series={chart.series}
              type="bar"
              height={540}
              width={Math.max(1000, chart.rows.length * 220)}
            />
          </div>
        </>
      ) : (
        <div className="sm-widget-state">No orders found for the selected month.</div>
      )}
    </MainCard>
  );
}
