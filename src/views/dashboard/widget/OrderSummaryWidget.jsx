import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import ReactApexChart from 'react-apexcharts';
import Select from 'react-select';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

import MainCard from 'components/MainCard';
import OrderServices from 'services/customer-portal/OrderServices';
import { getAssignedCustomerCodes } from 'utils/cookies';
import { getThemePreference, THEME_CHANGED_EVENT } from 'utils/themePreference';
import './order-summary-widget.scss';

const PAGE_SIZE = 100;
const customerSelectStyles = {
  menu: (base) => ({ ...base, left: 0, right: 0, width: '100%', zIndex: 30 })
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
const monthIndexOf = (order) => {
  const value = valueOf(order, ['doc_date', 'docDate', 'date', 'order_date', 'orderDate', 'created_at', 'createdAt'], '');
  const compactDate = moment(String(value), 'YYYYMMDD', true);
  const date = compactDate.isValid() ? compactDate : moment(value);
  return date.isValid() ? date.month() : null;
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
const formatCount = (value) => new Intl.NumberFormat('id-ID').format(Number(value) || 0);
const formatKg = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const activeTheme = () => {
  if (typeof document === 'undefined') return getThemePreference();
  const appliedTheme = document.documentElement.dataset.pcTheme || document.documentElement.dataset.bsTheme;
  return appliedTheme === 'dark' ? 'dark' : 'light';
};

export default function OrderSummaryWidget() {
  const assignedCustomerCodes = useMemo(() => getAssignedCustomerCodes(), []);
  const [year, setYear] = useState(() => String(moment().year()));
  const [orders, setOrders] = useState([]);
  const [customerFilter, setCustomerFilter] = useState(null);
  const [drilldownMonth, setDrilldownMonth] = useState(null);
  const [drilldownCustomer, setDrilldownCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [theme, setTheme] = useState(activeTheme);
  const yearOptions = useMemo(() => {
    const currentYear = moment().year();
    const selectedYear = Number(year);
    return [...new Set([selectedYear, ...Array.from({ length: 12 }, (_, index) => currentYear + 1 - index)])]
      .filter(Boolean)
      .sort((first, second) => second - first);
  }, [year]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const selectedYear = moment(year, 'YYYY', true);
      if (!selectedYear.isValid()) throw new Error('Please select a valid year');
      const filters = {
        start_date: selectedYear.clone().startOf('year').format('YYYY-MM-DD'),
        end_date: selectedYear.clone().endOf('year').format('YYYY-MM-DD'),
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
  }, [assignedCustomerCodes, year]);

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
    setDrilldownMonth(null);
    setDrilldownCustomer(null);
  }, [customerFilter, year]);

  const summary = useMemo(() => {
    let totalOrders = 0;
    const customers = new Map();
    const branchNames = new Set();
    const months = Array.from({ length: 12 }, (_, index) => ({ index, customers: new Map(), totalOrders: 0, totalWeight: 0 }));
    const addToCustomer = (collection, customer, branch, weightKg) => {
      const customerSummary = collection.get(customer) || {
        branchOrders: new Map(),
        branchWeights: new Map(),
        totalOrders: 0,
        totalWeight: 0
      };
      customerSummary.branchOrders.set(branch, (customerSummary.branchOrders.get(branch) || 0) + 1);
      customerSummary.branchWeights.set(branch, (customerSummary.branchWeights.get(branch) || 0) + weightKg);
      customerSummary.totalOrders += 1;
      customerSummary.totalWeight += weightKg;
      collection.set(customer, customerSummary);
    };
    orders
      .filter((order) => !customerFilter || customerOf(order) === customerFilter.value)
      .forEach((order) => {
        const customer = customerOf(order);
        const branch = branchOf(order);
        const monthIndex = monthIndexOf(order);
        const weightKg = orderWeightKg(order);
        totalOrders += 1;
        branchNames.add(branch);
        addToCustomer(customers, customer, branch, weightKg);
        if (monthIndex !== null) {
          const month = months[monthIndex];
          addToCustomer(month.customers, customer, branch, weightKg);
          month.totalOrders += 1;
          month.totalWeight += weightKg;
        }
      });

    const customerRows = [...customers.entries()]
      .map(([customer, customerSummary]) => ({ customer, ...customerSummary }))
      .sort((first, second) => first.customer.localeCompare(second.customer, 'id-ID'));
    return {
      branchNames: [...branchNames].sort((first, second) => first.localeCompare(second, 'id-ID')),
      customers: customerRows,
      months,
      totalOrders
    };
  }, [customerFilter, orders]);

  const chart = useMemo(() => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#dceaff' : '#344054';
    const gridColor = isDark ? 'rgba(145, 190, 226, 0.28)' : 'rgba(71, 84, 103, 0.2)';
    const palette = isDark
      ? ['#ff8787', '#ffd166', '#74c0fc', '#63e6be', '#b197fc', '#ffa94d', '#91a7ff', '#8ce99a', '#e599f7', '#66d9e8']
      : ['#e03131', '#d98b00', '#1971c2', '#0ca678', '#7048e8', '#e8590c', '#4263eb', '#2b8a3e', '#a61eaf', '#087f8c'];
    const selectedMonth = drilldownMonth === null ? null : summary.months[drilldownMonth];
    const monthCustomers = selectedMonth
      ? [...selectedMonth.customers.entries()]
          .map(([customer, customerSummary]) => ({ customer, ...customerSummary }))
          .sort((first, second) => first.customer.localeCompare(second.customer, 'id-ID'))
      : [];
    const selectedCustomer = monthCustomers.find((customer) => customer.customer === drilldownCustomer) || null;
    const detailRows = selectedCustomer
      ? [...selectedCustomer.branchWeights.entries()]
          .map(([branch, weight]) => ({ branch, weight, orders: selectedCustomer.branchOrders.get(branch) || 0 }))
          .sort((first, second) => second.weight - first.weight || first.branch.localeCompare(second.branch, 'id-ID'))
      : [];
    const rows = selectedCustomer
      ? detailRows.map((row) => ({ label: row.branch, value: row.weight, orders: row.orders }))
      : summary.months.map((month) => ({
          label: moment().month(month.index).format('MMMM'),
          value: month.totalWeight,
          orders: month.totalOrders
        }));
    const overviewCustomers = summary.customers;
    const seriesColors = (selectedCustomer ? rows : overviewCustomers).map((_, index) => palette[index % palette.length]);
    const series = selectedCustomer
      ? [{ name: 'Branch Total', data: rows.map((row) => row.value) }]
      : overviewCustomers.map((customer) => ({
          name: customer.customer,
          data: summary.months.map((month) => month.customers.get(customer.customer)?.totalWeight || 0)
        }));
    const legendItems = selectedCustomer
      ? rows.map((row, index) => ({ ...row, color: seriesColors[index] }))
      : overviewCustomers.map((customer, index) => ({
          color: seriesColors[index],
          label: customer.customer,
          orders: customer.totalOrders,
          value: customer.totalWeight
        }));
    return {
      detailRows,
      level: selectedCustomer ? 'branch' : 'month',
      legendItems,
      rows,
      series,
      options: {
        chart: {
          stacked: false,
          background: 'transparent',
          foreColor: textColor,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_event, _chartContext, config) => {
              if (!selectedCustomer && config.dataPointIndex >= 0 && config.seriesIndex >= 0) {
                setDrilldownMonth(config.dataPointIndex);
                setDrilldownCustomer(overviewCustomers[config.seriesIndex]?.customer || null);
              }
            }
          }
        },
        theme: { mode: theme },
        colors: seriesColors,
        fill: { type: 'solid', opacity: isDark ? 0.68 : 0.78 },
        stroke: { show: true, width: 1.5, colors: seriesColors },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor, strokeDashArray: 4, padding: { top: 12, left: 12, right: 12 } },
        legend: { show: false },
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 3,
            borderRadiusApplication: 'end',
            distributed: Boolean(selectedCustomer),
            columnWidth: selectedCustomer ? '8%' : '36%'
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
  }, [drilldownCustomer, drilldownMonth, summary, theme]);

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
            <Form.Group controlId="order-summary-year">
              <Form.Label className="f-12 text-muted mb-1">Year</Form.Label>
              <Form.Select
                size="sm"
                className="order-summary-widget__year-select"
                value={year}
                onChange={(event) => setYear(event.target.value)}
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
          <div className="order-summary-widget__chart-heading">
            {chart.level !== 'month' ? (
              <Button
                variant="outline-primary"
                size="sm"
                className="order-summary-widget__back-button"
                onClick={() => {
                  setDrilldownCustomer(null);
                  setDrilldownMonth(null);
                }}
                aria-label="Back one level"
                title="Back one level"
              >
                <i className="ti ti-arrow-left" />
              </Button>
            ) : null}
            <span>
              <strong>
                {chart.level === 'branch'
                  ? `Branch Detail — ${drilldownCustomer} — ${moment().month(drilldownMonth).format('MMMM')}`
                  : `Monthly Customer Orders — ${year}`}
              </strong>
              <small>
                {chart.level === 'branch'
                  ? `${formatCount(chart.detailRows.length)} branches · click Back to view monthly customers`
                  : `${formatCount(summary.totalOrders)} orders · each color represents a customer · click a customer bar for branch detail`}
              </small>
            </span>
          </div>
          <div className="order-summary-widget__legend" aria-label={`${chart.level} legend`}>
            {chart.legendItems.map((item) => (
              <span className="order-summary-widget__legend-item" style={{ '--legend-color': item.color }} key={item.label}>
                <i />
                <span>{item.label}</span>
                <small>
                  {formatKg(item.value)} Kg · {formatCount(item.orders)} orders
                </small>
              </span>
            ))}
          </div>
          <div className="order-summary-widget__chart-scroll">
            <ReactApexChart
              options={chart.options}
              series={chart.series}
              type="bar"
              height={500}
              width={chart.level === 'branch' ? Math.max(800, chart.rows.length * 180) : 1200}
            />
          </div>
        </>
      ) : (
        <div className="sm-widget-state">No orders found for the selected year.</div>
      )}
    </MainCard>
  );
}
