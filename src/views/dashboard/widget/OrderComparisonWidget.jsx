import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

import MainCard from 'components/MainCard';
import DashboardServices from 'services/customer-portal/DashboardServices';
import { getAssignedCustomerCode } from 'utils/cookies';
import { getThemePreference, THEME_CHANGED_EVENT } from 'utils/themePreference';

const listFromPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const list =
    payload.lines || payload.data || payload.items || payload.results || payload.comparison || payload.comparisons || payload.products;
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.lines)) return list.lines;
  return list && typeof list === 'object' ? [list] : [];
};

const numberValue = (value) => {
  if (typeof value === 'number') return value;
  const normalized = String(value ?? '').replace(/[^0-9.-]/g, '');
  return Number(normalized) || 0;
};

const normalizeRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};

  return listFromPayload(payload).map((row, index) => ({
    id: row.id ?? row.item_code ?? row.brand ?? index,
    brand: row.brand || '-',
    target: numberValue(row.target_amount),
    cmo: numberValue(row.cmo_amount),
    process: numberValue(row.so_amount),
    completed: numberValue(row.do_amount)
  }));
};

const formatValue = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value) || 0);

export default function OrderComparisonWidget() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(getThemePreference);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const now = new Date();
        const response = await DashboardServices.getCompareOrder(
          now.getMonth() + 1,
          now.getFullYear(),
          getAssignedCustomerCode() || '',
          ''
        );

        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load order comparison');
        if (active) setRows(normalizeRows(response));
      } catch (loadError) {
        if (active) {
          setRows([]);
          setError(loadError?.response?.data?.message || loadError?.message || 'Failed to load order comparison');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleThemeChanged = (event) => setTheme(event.detail?.theme || getThemePreference());

    window.addEventListener(THEME_CHANGED_EVENT, handleThemeChanged);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, handleThemeChanged);
  }, []);

  const chart = useMemo(() => {
    const isDark = theme === 'dark';
    const colors = isDark ? ['#93c5fd', '#fde68a', '#d8b4fe', '#86efac'] : ['#7da9e8', '#e6b94f', '#b794d9', '#66b98a'];
    const textColor = isDark ? '#dceaff' : '#526176';
    const gridColor = isDark ? 'rgba(111, 168, 214, 0.28)' : 'rgba(49, 95, 180, 0.18)';

    return {
      series: [
        { name: 'Target', data: rows.map((row) => row.target) },
        { name: 'CMO', data: rows.map((row) => row.cmo) },
        { name: 'Process', data: rows.map((row) => row.process) },
        { name: 'Completed Orders', data: rows.map((row) => row.completed) }
      ],
      options: {
        chart: {
          background: 'transparent',
          foreColor: textColor,
          toolbar: { show: false },
          zoom: { enabled: false }
        },
        theme: { mode: theme },
        colors,
        fill: {
          type: 'solid',
          opacity: isDark ? 0.36 : 0.28
        },
        stroke: {
          show: true,
          width: 2,
          colors
        },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor, strokeDashArray: 4 },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          labels: { colors: textColor },
          markers: {
            fillColors: colors,
            strokeColor: textColor,
            strokeWidth: 1
          }
        },
        plotOptions: { bar: { borderRadius: 3, barHeight: '72%', horizontal: true } },
        xaxis: {
          categories: rows.map((row) => row.brand),
          axisBorder: { color: gridColor },
          axisTicks: { color: gridColor },
          labels: {
            formatter: (value) => formatValue(value),
            style: { colors: textColor }
          }
        },
        yaxis: {
          labels: { style: { colors: textColor } }
        },
        tooltip: {
          theme,
          shared: true,
          intersect: false,
          y: { formatter: (value) => `${formatValue(value)} Kg` }
        }
      }
    };
  }, [rows, theme]);

  return (
    <MainCard
      className="h-100 sm-dashboard-widget"
      title={
        <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
          <Stack direction="horizontal" gap={2}>
            <span className="avtar avtar-s bg-light-primary text-primary">
              <i className="ti ti-chart-bar" />
            </span>
            <span>
              <h5 className="mb-0">Order Comparison</h5>
              <small className="text-muted">Target, CMO, process, and completed orders by brand</small>
            </span>
          </Stack>
          <button
            type="button"
            className="sm-widget-open"
            onClick={() => navigate('/customer-portal/dashboard')}
            aria-label="Open Order Comparison"
          >
            <i className="ti ti-arrow-up-right" />
          </button>
        </Stack>
      }
    >
      {loading ? (
        <div className="sm-widget-state">
          <Spinner size="sm" />
          <span>Loading widget...</span>
        </div>
      ) : error ? (
        <div className="sm-widget-state text-danger">{error}</div>
      ) : rows.length ? (
        <ReactApexChart options={chart.options} series={chart.series} type="bar" height={Math.max(320, rows.length * 70)} width="100%" />
      ) : (
        <div className="sm-widget-state">No order comparison data for this period.</div>
      )}
    </MainCard>
  );
}
