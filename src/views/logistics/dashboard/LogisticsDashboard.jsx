import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import RescheduleLogModal from '../../customer-portal/dashboard/RescheduleLogModal';
import AsyncSelect from 'react-select/async';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DestinationServices from '../../../services/logistics/DestinationServices';
import OriginServices from '../../../services/logistics/OriginServices';
import RateServices from '../../../services/logistics/RateServices';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import LeadTimeServices from '../../../services/logistics/LeadTimeServices';
import VendorManagementServices from '../../../services/vendor-management/VendorManagementServices';
import { useAlert } from '../../../utils/alertContext';
import { currency } from '../../../utils/global';

const selectStyles = {
  menu: (base) => ({ ...base, zIndex: 10 })
};

const routeOptions = [
  { value: 'D', label: 'Land Route' },
  { value: 'L', label: 'Sea Route' },
  { value: 'U', label: 'Air Route' }
];

const serviceTypeOptions = [
  { value: 'RIT', label: 'RIT' },
  { value: 'TONASE', label: 'TONASE' },
  { value: 'FEET', label: 'CONTAINER' }
];

const orderPageSize = 10;
const logisticStatusColors = {
  PENDING: '#92400e',
  RESCHEDULE_REQUESTED: '#7c3aed',
  RESCHEDULE_APPROVED: '#0e7490',
  RESCHEDULE_REJECTED: '#be123c',
  APPROVED: '#1d4ed8',
  PACKING: '#4338ca',
  PACKED: '#0f766e',
  COMPLETED: '#334155',
  CANCELLED: '#6b7280',
  REJECTED: '#b91c1c'
};

const getLogisticOrderPage = (response, requestedPageSize, requestedPage) => {
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
    pageCount: lastPage || Math.max(Math.ceil(total / (Number(meta?.per_page) || requestedPageSize)), 1)
  };
};
const getOrderLines = (order) => order.details || order.lines || order.document_lines || [];
const getOrderWeight = (order) => getOrderLines(order).reduce((total, line) => {
  const productName = line.item_name || line.item?.item_name || line.description || '';
  const match = [...String(productName).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)].at(-1);
  const unitWeight = match ? Number(match[1].replace(',', '.')) / (/^(g|gr|gram)$/i.test(match[2]) ? 1000 : 1) : 0;
  return total + unitWeight * (Number(line.quantity ?? line.qty ?? 0) || 0);
}, 0);
const formatOrderDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
const normalizeLocationName = (value) =>
  String(value || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toUpperCase();
const subtractDays = (dateValue, days) => {
  if (!dateValue || !Number.isFinite(Number(days))) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - Math.round(Number(days)));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const normalizeDeliveryOrder = (order) => {
  const salesOrder = { ...order, ...(order.sales_order || order.order || {}) };
  const firstLine = getOrderLines(salesOrder)[0] || {};
  return {
    ...salesOrder,
    id: salesOrder.id,
    status: String(salesOrder.status || '').trim().toUpperCase(),
    logisticStatus: String(salesOrder.logistic_status || '').trim().toUpperCase(),
    orderNumber: salesOrder.sap_doc_num || salesOrder.order_no || salesOrder.id,
    customer: salesOrder.customer_name || salesOrder.distributor?.name || '-',
    depo: salesOrder.depo || '-',
    originCode: salesOrder.origin_code || firstLine.whs_code || '-',
    origin: salesOrder.origin_name || firstLine.whs_name || firstLine.warehouse?.whs_name || firstLine.whs_code || '-',
    destination: salesOrder.destination_name || salesOrder.ship_to_name || salesOrder.ship_to_code || salesOrder.address2 || '-',
    destinationCity: salesOrder.destination_city || salesOrder.ship_to_city || '',
    weight: Number(salesOrder.total_weight_kg ?? salesOrder.total_kg ?? salesOrder.weight ?? getOrderWeight(salesOrder)) || 0,
    loadingDate: formatOrderDate(salesOrder.doc_due_date),
    etaDate: formatOrderDate(salesOrder.eta_date)
  };
};

const getPayloadList = (response, keys = []) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['data', 'items', ...keys]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

const getVendorRateValue = (item, keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const getVendorRateBatchId = (header) => getVendorRateValue(header, ['batch_id', 'batchId', 'id', 'uuid', 'header_id', 'headerId']);
const getVendorRateId = (rate) => getVendorRateValue(rate, ['id', 'rate_id', 'rateId']);
const isPendingVendorRate = (rate) =>
  String(getVendorRateValue(rate, ['approval_status', 'approvalStatus']) || 'PENDING').trim().toUpperCase() === 'PENDING';
const getVendorRateName = (header) =>
  getVendorRateValue(header, ['vendor_name', 'company_name', 'expedition_name', 'vendorName', 'companyName']) ||
  header?.vendor?.company_name || header?.vendor?.name || header?.expedition?.expedition_name || '-';

const formatMasterOption = ({ label, code, customerCode }) => (
  <div>
    <div>{label || '-'}</div>
    {code ? <small className="text-muted">{code}</small> : null}
    {customerCode ? <small className="text-muted d-block">{customerCode}</small> : null}
  </div>
);

const formatDestinationOption = ({ label, street }) => (
  <div>
    <div>{label || '-'}</div>
    <small className="text-muted d-block">{street || '-'}</small>
  </div>
);

const filterMasterOption = ({ data }, inputValue) =>
  `${data.label} ${data.code} ${data.customerCode} ${data.street}`.toLowerCase().includes(inputValue.trim().toLowerCase());

const formatWeightRange = (minTonnage, maxTonnage) => {
  const minValue = Number(minTonnage);
  const maxValue = Number(maxTonnage);
  const hasMin = minTonnage !== undefined && minTonnage !== null && minTonnage !== '';
  const hasMax = maxTonnage !== undefined && maxTonnage !== null && maxTonnage !== '';

  if (!hasMin && !hasMax) return '-';

  const formatWeight = (value, numericValue) => (Number.isFinite(numericValue) ? numericValue.toLocaleString('id-ID') : value);
  const formattedMin = hasMin ? formatWeight(minTonnage, minValue) : null;
  const formattedMax = hasMax ? formatWeight(maxTonnage, maxValue) : null;

  if (!hasMin) return `${formattedMax} kg`;
  const hasSameWeight = Number.isFinite(minValue) && Number.isFinite(maxValue) ? minValue === maxValue : minTonnage === maxTonnage;

  if (!hasMax || hasSameWeight) {
    return `${formattedMin} kg`;
  }

  return `${formattedMin} - ${formattedMax} kg`;
};

const normalizeShipToOption = (item, index) => {
  const code = String(item.shipToCode ?? item.ship_to_code ?? item.address_code ?? item.AddressName ?? item.code ?? '');
  const customerCode = String(
    item.customerCode ?? item.customer_code ?? item.code_customer ?? item.card_code ?? item.CardCode ?? item.customer?.code ?? ''
  );
  const name = item.customerName ?? item.customer_name ?? item.name ?? item.customer?.name ?? item.card_name ?? item.CardName ?? '';
  const destination = item.shipToName ?? item.ship_to_name ?? item.address_name ?? item.AddressName2 ?? item.destination ?? item.city ?? '';
  const alias = item.alias ?? item.ship_to_alias ?? item.destination_alias ?? '';
  const street = item.street ?? item.Street ?? item.ship_to_address ?? item.Address ?? item.address ?? '';

  return {
    value: code || String(item.id ?? item.shipto_id ?? item.ship_to_id ?? index),
    label: alias || destination || name || code || '-',
    code,
    customerCode,
    destination: item.city ?? item.City ?? destination ?? code,
    destinationLabel: alias || destination || name || code || '-',
    street,
    city: item.city ?? item.City ?? ''
  };
};

export default function LogisticsDashboard() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('orders');
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [orderLogDetail, setOrderLogDetail] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageCount, setOrderPageCount] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const ordersRequestIdRef = useRef(0);
  const [loadingDeliveryOrders, setLoadingDeliveryOrders] = useState(true);
  const [deliveryOrdersError, setDeliveryOrdersError] = useState('');
  const [approvingOrderId, setApprovingOrderId] = useState(null);
  const [orderToApprove, setOrderToApprove] = useState(null);
  const [orderToClose, setOrderToClose] = useState(null);
  const [closeOrderForm, setCloseOrderForm] = useState({ etaDate: '', loadingDate: '', comment: '' });
  const [reschedulingOrderId, setReschedulingOrderId] = useState(null);
  const [rescheduleLeadTimeDays, setRescheduleLeadTimeDays] = useState(null);
  const [loadingRescheduleLeadTime, setLoadingRescheduleLeadTime] = useState(false);
  const [originOptions, setOriginOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [loadingOrigins, setLoadingOrigins] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [loadingRatesRank, setLoadingRatesRank] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [pendingRateHeaders, setPendingRateHeaders] = useState([]);
  const [selectedRateHeader, setSelectedRateHeader] = useState(null);
  const [selectedRateDetails, setSelectedRateDetails] = useState([]);
  const [selectedRateDetailIds, setSelectedRateDetailIds] = useState([]);
  const [loadingRateDetails, setLoadingRateDetails] = useState(false);
  const [rateDetailsError, setRateDetailsError] = useState('');
  const [processingRateApproval, setProcessingRateApproval] = useState(null);
  const [loadingPendingRates, setLoadingPendingRates] = useState(true);
  const [pendingRatesError, setPendingRatesError] = useState('');
  const [form, setForm] = useState({
    originCode: '',
    departure: '',
    originLabel: '',
    originStreet: '',
    originCity: '',
    destinationCode: '',
    destination: '',
    destinationLabel: '',
    destinationStreet: '',
    destinationCity: '',
    weight: 0,
    serviceType: '',
    route: []
  });

  const selectedOrigin =
    originOptions.find((item) => item.value === form.originCode) ||
    (form.originCode ? { value: form.originCode, label: form.originLabel, code: form.originCode, city: form.originCity } : null);
  const selectedDestination =
    destinationOptions.find((item) => item.value === form.destinationCode) ||
    (form.destinationCode
      ? { value: form.destinationCode, label: form.destinationLabel, code: form.destinationCode, city: form.destinationCity }
      : null);
  const selectedRoute = routeOptions.filter((item) => form.route.includes(item.value));
  const selectedServiceType = serviceTypeOptions.find((item) => item.value === form.serviceType) || null;

  const fetchMasterRoutes = useCallback(async () => {
    setLoadingOrigins(true);
    setLoadingDestinations(true);

    try {
      const [originResponse, destinationResponse] = await Promise.all([
        OriginServices.getOrigins({ per_page: 100 }),
        DestinationServices.getDestinations({ per_page: 100 })
      ]);

      if (originResponse?.data?.success === false) throw new Error(originResponse.data.message || 'Failed to fetch origin data');
      if (destinationResponse?.data?.success === false) {
        throw new Error(destinationResponse.data.message || 'Failed to fetch destination data');
      }

      const origins = getPayloadList(originResponse, ['origins']);
      const destinations = getPayloadList(destinationResponse, ['shiptos', 'ship_tos', 'destinations']);

      setOriginOptions(
        origins.map((item, index) => {
          const code = String(item.whsCode ?? item.whs_code ?? item.warehouse_code ?? item.code ?? '');
          const name = item.whsNameOrigin ?? item.whs_name_origin ?? item.warehouse_name ?? item.name ?? '';

          return {
            value: code || String(item.id ?? item.origin_id ?? index),
            label: name || code || '-',
            code,
            departure: item.city || item.regency || name || code || '',
            street: item.street ?? item.address ?? '',
            city: item.city ?? item.regency ?? item.city_name ?? ''
          };
        })
      );
      setDestinationOptions(destinations.map(normalizeShipToOption));
    } catch (error) {
      setOriginOptions([]);
      setDestinationOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch route master data', 'danger');
    } finally {
      setLoadingOrigins(false);
      setLoadingDestinations(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchMasterRoutes();
  }, [fetchMasterRoutes]);

  const fetchDeliveryOrders = useCallback(async () => {
    const requestId = ++ordersRequestIdRef.current;
    setLoadingDeliveryOrders(true);
    setDeliveryOrdersError('');
    try {
      const response = await LogisticsServices.getLogisticOrders({
        search: debouncedOrderSearch,
        per_page: orderPageSize,
        page: orderPage
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load logistics orders');
      }
      if (requestId !== ordersRequestIdRef.current) return;
      const result = getLogisticOrderPage(response, orderPageSize, orderPage);
      setDeliveryOrders(result.rows.map(normalizeDeliveryOrder));
      setOrderTotal(result.total);
      setOrderPageCount(result.pageCount);
      if (result.currentPage !== orderPage) setOrderPage(result.currentPage);
    } catch (error) {
      if (requestId !== ordersRequestIdRef.current) return;
      setDeliveryOrders([]);
      setOrderTotal(0);
      setOrderPageCount(1);
      setDeliveryOrdersError(error?.response?.data?.message || error?.message || 'Failed to load logistics orders');
    } finally {
      if (requestId === ordersRequestIdRef.current) setLoadingDeliveryOrders(false);
    }
  }, [debouncedOrderSearch, orderPage]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedOrderSearch(orderSearch.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [orderSearch]);

  useEffect(() => {
    fetchDeliveryOrders();
  }, [fetchDeliveryOrders]);

  const openCloseOrderModal = async (order) => {
    const etaDate = order.eta_date ? String(order.eta_date).slice(0, 10) : '';
    setOrderToClose(order);
    setRescheduleLeadTimeDays(null);
    setCloseOrderForm({
      etaDate,
      loadingDate: '',
      comment: ''
    });
    setLoadingRescheduleLeadTime(true);
    try {
      const response = await LeadTimeServices.getLeadTimes({ per_page: 100 });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load lead time');
      }
      const depo = normalizeLocationName(order.depo);
      const leadTime = getPayloadList(response, ['leadtimes']).find((item) => {
        const destination = normalizeLocationName(item.destination_name || item.destination_city || item.destination_code);
        return Boolean(depo && destination) && (destination === depo || destination.includes(depo) || depo.includes(destination));
      });
      const averageDays = Number(leadTime?.avg_lead_time_days);
      if (!leadTime || !Number.isFinite(averageDays)) {
        showAlert(`Lead time for depo ${order.depo || '-'} was not found.`, 'warning');
        return;
      }
      setRescheduleLeadTimeDays(averageDays);
      setCloseOrderForm((current) => ({ ...current, loadingDate: subtractDays(current.etaDate, averageDays) }));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load lead time', 'danger');
    } finally {
      setLoadingRescheduleLeadTime(false);
    }
  };

  const submitOrderReschedule = async () => {
    if (!orderToClose?.id || reschedulingOrderId !== null) return;
    if (!closeOrderForm.loadingDate || !closeOrderForm.comment.trim()) {
      showAlert('Proposed loading date and notes are required.', 'warning');
      return;
    }

    setReschedulingOrderId(orderToClose.id);
    try {
      const response = await LogisticsServices.postRescheduleOrder(orderToClose.id, {
        proposed_delivery_date: closeOrderForm.loadingDate,
        proposed_eta_date: closeOrderForm.etaDate || undefined,
        notes: closeOrderForm.comment.trim()
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to reschedule order');
      }
      showAlert(response?.data?.message || `Order ${orderToClose.orderNumber} rescheduled successfully`, 'success');
      setOrderToClose(null);
      await fetchDeliveryOrders();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to reschedule order', 'danger');
    } finally {
      setReschedulingOrderId(null);
    }
  };

  const approveOrderPacking = async (order) => {
    if (!order?.id || approvingOrderId !== null) return;

    setApprovingOrderId(order.id);
    try {
      const response = await LogisticsServices.postApproveOrdersPacking(order.id);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to approve order for packing');
      }
      showAlert(response?.data?.message || `Order ${order.orderNumber} approved for packing`, 'success');
      setOrderToApprove(null);
      await fetchDeliveryOrders();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to approve order for packing', 'danger');
    } finally {
      setApprovingOrderId(null);
    }
  };

  useEffect(() => {
    let refreshTimeouts = [];
    const refreshOrders = () => {
      fetchDeliveryOrders();
      refreshTimeouts.forEach(window.clearTimeout);
      refreshTimeouts = [1500, 5000].map((delay) => window.setTimeout(fetchDeliveryOrders, delay));
    };
    const refreshIfPending = () => {
      if (window.sessionStorage.getItem('sm-orders-refresh-pending') !== 'true') return;
      window.sessionStorage.removeItem('sm-orders-refresh-pending');
      refreshOrders();
    };
    const handleWindowMessage = (event) => {
      if (event.origin === window.location.origin && event.data?.type === 'sm:orders-refresh-needed') refreshOrders();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfPending();
    };

    window.addEventListener('sm:orders-refresh-needed', refreshOrders);
    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('focus', refreshIfPending);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    refreshIfPending();

    return () => {
      refreshTimeouts.forEach(window.clearTimeout);
      window.removeEventListener('sm:orders-refresh-needed', refreshOrders);
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('focus', refreshIfPending);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDeliveryOrders]);

  const fetchPendingVendorRates = useCallback(async () => {
    setLoadingPendingRates(true);
    setPendingRatesError('');
    try {
      const response = await VendorManagementServices.getVendorRates();
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load pending rates');
      }
      setPendingRateHeaders(
        getPayloadList(response, ['headers', 'rates']).filter(
          (header) => String(getVendorRateValue(header, ['approval_status', 'approvalStatus'])).trim().toUpperCase() === 'PENDING'
        )
      );
    } catch (error) {
      setPendingRateHeaders([]);
      setPendingRatesError(error?.response?.data?.message || error?.message || 'Failed to load pending rates');
    } finally {
      setLoadingPendingRates(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingVendorRates();
  }, [fetchPendingVendorRates]);

  const openPendingRateDetails = async (header) => {
    setSelectedRateHeader(header);
    setSelectedRateDetails([]);
    setSelectedRateDetailIds([]);
    setRateDetailsError('');
    setLoadingRateDetails(true);
    try {
      const response = await VendorManagementServices.getVendorRateDetail(getVendorRateBatchId(header));
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load rate details');
      }
      setSelectedRateDetails(getPayloadList(response, ['details', 'routes', 'rates']));
    } catch (error) {
      setRateDetailsError(error?.response?.data?.message || error?.message || 'Failed to load rate details');
    } finally {
      setLoadingRateDetails(false);
    }
  };

  const handleRateApproval = async (action) => {
    if (!selectedRateHeader || processingRateApproval) return;
    if (action === 'approve' && !selectedRateDetailIds.length) return;
    setProcessingRateApproval(action);
    setRateDetailsError('');
    try {
      let response;
      if (action === 'approve') {
        const responses = await Promise.all(selectedRateDetailIds.map((rateId) => RateServices.postApproveRates(rateId)));
        const failedResponse = responses.find(
          (result) => !(result?.status >= 200 && result.status < 300) || result?.data?.success === false
        );
        if (failedResponse) {
          throw new Error(failedResponse?.data?.message || 'Failed to approve selected vendor rates');
        }
        response = responses[responses.length - 1];
      } else {
        response = await VendorManagementServices.postRejectVendorRates(getVendorRateBatchId(selectedRateHeader));
        if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
          throw new Error(response?.data?.message || 'Failed to reject vendor rates');
        }
      }
      showAlert(
        response?.data?.message ||
          (action === 'approve'
            ? `${selectedRateDetailIds.length} vendor rate(s) approved successfully`
            : 'Vendor rates rejected successfully'),
        'success'
      );
      setSelectedRateDetailIds([]);
      setSelectedRateHeader(null);
      await fetchPendingVendorRates();
    } catch (error) {
      setRateDetailsError(error?.response?.data?.message || error?.message || `Failed to ${action} vendor rates`);
    } finally {
      setProcessingRateApproval(null);
    }
  };

  const selectableVendorRateIds = selectedRateDetails
    .filter(isPendingVendorRate)
    .map(getVendorRateId)
    .filter((id) => id !== '')
    .map(String);
  const allVendorRatesSelected =
    Boolean(selectableVendorRateIds.length) && selectableVendorRateIds.every((id) => selectedRateDetailIds.includes(id));

  const toggleVendorRate = (rateId) => {
    const normalizedId = String(rateId);
    setSelectedRateDetailIds((current) =>
      current.includes(normalizedId) ? current.filter((id) => id !== normalizedId) : [...current, normalizedId]
    );
  };

  const toggleAllVendorRates = () => {
    setSelectedRateDetailIds(allVendorRatesSelected ? [] : selectableVendorRateIds);
  };

  const searchShipToOptions = useCallback(async (inputValue) => {
    try {
      const response = await DestinationServices.getDestinations({
        search: inputValue.trim() || undefined,
        per_page: 100
      });

      if (response?.data?.success === false) return [];

      return getPayloadList(response, ['shiptos', 'ship_tos', 'destinations']).map(normalizeShipToOption);
    } catch {
      return [];
    }
  }, []);

  const weight = Number(form.weight || 0);
  const weightColumns = useMemo(() => {
    const columns = new Map();

    recommendations.forEach((item) => {
      const key = `${item.min_tonnage ?? ''}|${item.max_tonnage ?? ''}`;
      if (!columns.has(key)) {
        columns.set(key, {
          key,
          label: item.weightRange,
          min: Number(item.min_tonnage ?? 0),
          max: Number(item.max_tonnage ?? item.min_tonnage ?? 0)
        });
      }
    });

    return [...columns.values()].sort((a, b) => a.min - b.min || a.max - b.max);
  }, [recommendations]);

  const expeditionComparisonRows = useMemo(() => {
    const rows = new Map();

    recommendations.forEach((item) => {
      const expeditionKey = String(item.expedition_id ?? item.expedition_code ?? item.name);
      const weightKey = `${item.min_tonnage ?? ''}|${item.max_tonnage ?? ''}`;
      const current = rows.get(expeditionKey) || {
        key: expeditionKey,
        name: item.name,
        prices: {}
      };
      const currentPrice = current.prices[weightKey];

      if (currentPrice === undefined || item.price < currentPrice) {
        current.prices[weightKey] = item.price;
      }
      rows.set(expeditionKey, current);
    });

    return [...rows.values()];
  }, [recommendations]);

  const lowestPricesByWeight = useMemo(
    () =>
      Object.fromEntries(
        weightColumns.map((column) => {
          const prices = expeditionComparisonRows
            .map((item) => item.prices[column.key])
            .filter((price) => price !== undefined && Number.isFinite(price));

          return [column.key, prices.length ? Math.min(...prices) : undefined];
        })
      ),
    [expeditionComparisonRows, weightColumns]
  );

  const originLocation = form.originStreet
    ? `${form.originStreet}${form.originCity ? ` (${form.originCity})` : ''}`
    : form.originCity
      ? `(${form.originCity})`
      : '';
  const originHeader = [form.originLabel, originLocation].filter(Boolean).join(' - ');
  const destinationLocation = form.destinationStreet
    ? `${form.destinationStreet}${form.destinationCity ? ` (${form.destinationCity})` : ''}`
    : form.destinationCity
      ? `(${form.destinationCity})`
      : '';
  const destinationHeader = [form.destinationLabel, destinationLocation].filter(Boolean).join(' - ');

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleOriginChange = (option) => {
    setForm((current) => ({
      ...current,
      originCode: option?.value || '',
      departure: option?.departure || '',
      originLabel: option?.label || '',
      originStreet: option?.street || '',
      originCity: option?.city || ''
    }));
  };

  const handleDestinationChange = (option) => {
    if (option) {
      setDestinationOptions((current) => (current.some((item) => item.value === option.value) ? current : [...current, option]));
    }

    setForm((current) => ({
      ...current,
      destinationCode: option?.value || '',
      destination: option?.destination || '',
      destinationLabel: option?.destinationLabel || '',
      destinationStreet: option?.street || '',
      destinationCity: option?.city || ''
    }));
  };

  const handleFindRates = async (criteria = form) => {
    setLoadingRatesRank(true);

    try {
      const response = await RateServices.getRatesRank(
        criteria.originCode,
        criteria.destinationCode,
        Number(criteria.weight || 0),
        criteria.serviceType,
        criteria.route
      );

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch rate recommendations');
      }

      const rates = getPayloadList(response, ['rank', 'ranks', 'rates', 'rankings']);
      const normalizedRates = rates.map((item, index) => {
        const expedition = item.expedition_data ?? item.expedition ?? {};
        const expeditionName =
          typeof expedition === 'object'
            ? (expedition.name ?? expedition.expedition_name ?? expedition.code ?? expedition.expedition_code)
            : expedition;
        const totalPrice = Number(item.total_price ?? item.total_rate ?? item.rate ?? item.price ?? 0);

        return {
          ...item,
          id: item.id ?? item.rate_id ?? index,
          name: expeditionName ?? item.expedition_name ?? item.expedition_code ?? '-',
          service: item.service ?? '-',
          serviceType:
            String(item.service_type ?? item.service ?? '').toUpperCase() === 'FEET'
              ? 'CONTAINER'
              : (item.service_type ?? item.service ?? '-'),
          weightRange: formatWeightRange(item.min_tonnage, item.max_tonnage),
          totalPrice,
          price: Number(item.price ?? 0)
        };
      });

      setRecommendations(normalizedRates);
      if (!normalizedRates.length) showAlert('No rate recommendations found', 'info');
    } catch (error) {
      setRecommendations([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch rate recommendations', 'danger');
    } finally {
      setLoadingRatesRank(false);
    }
  };

  return (
    <Stack gap={3}>
      <Stack direction="horizontal" gap={3} className="justify-content-between flex-wrap">
        <h4 className="mb-0">Dashboard</h4>
      </Stack>
      <MainCard>
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          <Button variant={activeTab === 'orders' ? 'primary' : 'light-secondary'} onClick={() => setActiveTab('orders')}>
            <i className="ti ti-package me-2" /> Orders
            <Badge bg={activeTab === 'orders' ? 'light' : 'primary'} text={activeTab === 'orders' ? 'primary' : undefined} className="ms-2">
              {orderTotal}
            </Badge>
          </Button>
          <Button variant={activeTab === 'find' ? 'primary' : 'light-secondary'} onClick={() => setActiveTab('find')}>
            <i className="ti ti-search me-2" /> Find
          </Button>
        </Stack>

        <hr className="my-4" />

        {activeTab === 'orders' ? (
          <div>
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
                  value={orderSearch}
                  onChange={(event) => {
                    setOrderSearch(event.target.value);
                    setOrderPage(1);
                  }}
                  style={{ width: 220 }}
                />
                <Button size="sm" variant="light-primary" onClick={fetchDeliveryOrders} disabled={loadingDeliveryOrders}>
                  <i className={`ti ${loadingDeliveryOrders ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
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
                  <th>Status</th>
                  <th>Logistic Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingDeliveryOrders ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">Loading Sales Orders...</td>
                  </tr>
                ) : deliveryOrdersError ? (
                  <tr>
                    <td colSpan={9} className="text-center text-danger py-4">{deliveryOrdersError}</td>
                  </tr>
                ) : deliveryOrders.length ? deliveryOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        type="button"
                        className="border-0 bg-transparent p-0 fw-semibold text-start"
                        style={{ color: '#315fb4' }}
                        disabled={!order.id}
                        aria-label={`View reschedule history for order ${order.orderNumber}`}
                        onClick={() => setOrderLogDetail(order)}
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td>
                      <div className="fw-semibold">{order.customer}</div>
                      <small className="text-muted d-block">
                        {order.depo}
                      </small>
                    </td>
                    <td>
                      <div>{order.origin}</div>
                      <small className="text-muted">{order.originCode}</small>
                    </td>
                    <td className="text-end fw-semibold">{order.weight.toLocaleString('id-ID')} kg</td>
                    <td>{order.loadingDate}</td>
                    <td>{order.etaDate}</td>
                    <td>
                      <Badge
                        bg={order.status === 'ORDER_APPROVED' ? 'success' : 'warning'}
                        text={order.status === 'ORDER_APPROVED' ? 'light' : 'dark'}
                      >
                        {order.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td>
                      {order.logisticStatus ? (
                        <Badge
                          bg=""
                          style={{ backgroundColor: logisticStatusColors[order.logisticStatus] || '#6b7280', color: '#ffffff' }}
                        >
                          {order.logisticStatus.replaceAll('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-end">
                      {order.status === 'ORDER_APPROVED' && !['APPROVED', 'RESCHEDULE_APPROVED'].includes(order.logisticStatus) && (
                        <Stack direction="horizontal" gap={1} className="justify-content-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-success"
                            className="logistics-order-action logistics-order-action--confirm"
                            aria-label={`Approve order ${order.orderNumber} for packing`}
                            title="Approve for Packing"
                            disabled={approvingOrderId !== null}
                            onClick={() => setOrderToApprove(order)}
                          >
                            <i className={`ti ${String(approvingOrderId) === String(order.id) ? 'ti-loader-2' : 'ti-check'}`} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            className="logistics-order-action"
                            aria-label={`Reschedule order ${order.orderNumber}`}
                            title="Reschedule Order"
                            disabled={approvingOrderId !== null || reschedulingOrderId !== null}
                            onClick={() => openCloseOrderModal(order)}
                          >
                            <i className="ti ti-x" />
                          </Button>
                        </Stack>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-4">
                      No logistics orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
            <TablePagination
              currentPage={orderPage}
              onPageChange={setOrderPage}
              pageCount={orderPageCount}
              pageSize={orderPageSize}
              total={orderTotal}
              itemLabel="orders"
            />
          </div>
        ) : (
          <div>
            <Stack gap={1} className="mb-4">
              <h5 className="mb-0">Logistics Dashboard</h5>
              <span className="text-muted f-12">Find expedition recommendations based on route and shipment weight.</span>
            </Stack>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="f-12 text-muted">Origin</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isClearable
                    isLoading={loadingOrigins}
                    filterOption={filterMasterOption}
                    formatOptionLabel={formatMasterOption}
                    noOptionsMessage={() => 'Origin not found'}
                    onChange={handleOriginChange}
                    options={originOptions}
                    placeholder="Search origin"
                    styles={selectStyles}
                    value={selectedOrigin}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="f-12 text-muted">Destination</Form.Label>
                  <AsyncSelect
                    cacheOptions
                    classNamePrefix="react-select"
                    defaultOptions={destinationOptions}
                    isClearable
                    isLoading={loadingDestinations}
                    filterOption={filterMasterOption}
                    formatOptionLabel={formatDestinationOption}
                    loadOptions={searchShipToOptions}
                    noOptionsMessage={() => 'Destination not found'}
                    onChange={handleDestinationChange}
                    options={destinationOptions}
                    placeholder="Search destination"
                    styles={selectStyles}
                    value={selectedDestination}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="f-12 text-muted">Weight (Kg)</Form.Label>
                  <Form.Control min={1} type="number" value={form.weight} onChange={handleChange('weight')} placeholder="0" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="f-12 text-muted">Route</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isMulti
                    isClearable
                    options={routeOptions}
                    placeholder="Search route"
                    styles={selectStyles}
                    value={selectedRoute}
                    onChange={(options) =>
                      setForm((current) => ({
                        ...current,
                        route: options.map((option) => option.value)
                      }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="f-12 text-muted">Service Type</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isClearable
                    options={serviceTypeOptions}
                    placeholder="Search service type"
                    styles={selectStyles}
                    value={selectedServiceType}
                    onChange={(option) => setForm((current) => ({ ...current, serviceType: option?.value || '' }))}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Button className="w-100 py-3" size="lg" disabled={loadingRatesRank} onClick={() => handleFindRates()}>
                  {loadingRatesRank ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                      Finding...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-search me-2" />
                      Find Expedition Recommendation
                    </>
                  )}
                </Button>
              </Col>
            </Row>

            <hr className="my-4" />

            <Stack direction="horizontal" className="align-items-start justify-content-between mb-4" gap={3}>
              <Stack gap={1}>
                <h5 className="mb-0">Expedition Recommendations</h5>
                <span className="text-muted f-12">Rates are ranked based on the selected route and shipment weight.</span>
              </Stack>
              <Button variant="light-secondary" disabled={loadingRatesRank} onClick={() => handleFindRates()}>
                <i className="ti ti-refresh me-1" />
                Refresh
              </Button>
            </Stack>
            {originHeader || destinationHeader ? (
              <Row className="g-2 mb-3">
                <Col md={6}>
                  <div className="rounded border bg-light-primary px-3 py-2 h-100">
                    <span className="text-muted f-12 d-block">Origin</span>
                    <span className="fw-semibold">{originHeader || '-'}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="rounded border bg-light-primary px-3 py-2 h-100">
                    <span className="text-muted f-12 d-block">Destination</span>
                    <span className="fw-semibold">{destinationHeader || '-'}</span>
                  </div>
                </Col>
              </Row>
            ) : null}
            <Table className="mb-0 align-middle" responsive hover>
              <thead>
                <tr>
                  <th>Expedition</th>
                  {weightColumns.map((column) => (
                    <th className="text-end" key={column.key}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expeditionComparisonRows.length > 0 ? (
                  expeditionComparisonRows.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <div className="fw-semibold">{item.name}</div>
                      </td>
                      {weightColumns.map((column) => {
                        const price = item.prices[column.key];
                        const isLowestPrice = price !== undefined && price === lowestPricesByWeight[column.key];

                        return (
                          <td className="text-end fw-semibold" key={column.key}>
                            {price === undefined ? (
                              <Badge bg="danger">SKIP</Badge>
                            ) : isLowestPrice ? (
                              <Badge bg="success">{currency(price)}</Badge>
                            ) : (
                              currency(price)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(weightColumns.length + 1, 2)} className="text-center text-muted py-4">
                      Complete the origin, destination, and weight to view recommendations.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </MainCard>
      <MainCard
        title={
          <Stack direction="horizontal" gap={2} className="justify-content-between flex-wrap">
            <Stack direction="horizontal" gap={2}>
              <h5 className="mb-0">Approval Rates Vendor</h5>
              <Badge bg="warning" text="dark">
                {pendingRateHeaders.length} PENDING
              </Badge>
            </Stack>
            <Stack direction="horizontal" gap={2}>
              <Button size="sm" variant="light-primary" onClick={fetchPendingVendorRates} disabled={loadingPendingRates}>
                <i className={`ti ${loadingPendingRates ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
              </Button>
            </Stack>
          </Stack>
        }
      >
        {pendingRatesError ? <div className="text-danger py-3">{pendingRatesError}</div> : null}
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Period</th>
              <th>Batch</th>
              <th>Total Routes</th>
              <th>Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {loadingPendingRates ? (
              <tr>
                <td colSpan={5} className="text-center py-4">Loading pending rates...</td>
              </tr>
            ) : pendingRateHeaders.length ? (
              pendingRateHeaders.map((header) => (
                <tr key={getVendorRateBatchId(header)}>
                  <td>
                    <Button variant="link" className="p-0 fw-semibold" onClick={() => openPendingRateDetails(header)} disabled={!getVendorRateBatchId(header)}>
                      {getVendorRateName(header)}
                    </Button>
                  </td>
                  <td>{header.period_label || '-'}</td>
                  <td>{getVendorRateBatchId(header) || '-'}</td>
                  <td>{header.total_routes ?? 0}</td>
                  <td>
                    <Badge bg="warning" text="dark">{getVendorRateValue(header, ['approval_status', 'approvalStatus'])}</Badge>
                  </td>
                </tr>
              ))
            ) : !pendingRatesError ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">Tidak ada rates yang menunggu approval.</td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </MainCard>
      <Modal
        show={Boolean(selectedRateHeader)}
        onHide={() => !processingRateApproval && setSelectedRateHeader(null)}
        dialogClassName="vendor-rates-approval-dialog"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Rates {selectedRateHeader ? getVendorRateName(selectedRateHeader) : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted mb-3">{selectedRateHeader?.period_label} · {selectedRateHeader ? getVendorRateBatchId(selectedRateHeader) : ''}</div>
          {rateDetailsError ? <div className="text-danger mb-3">{rateDetailsError}</div> : null}
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 44 }}>
                  <Form.Check
                    type="checkbox"
                    className="m-0 d-inline-flex"
                    checked={allVendorRatesSelected}
                    onChange={toggleAllVendorRates}
                    disabled={Boolean(processingRateApproval) || !selectableVendorRateIds.length}
                    aria-label="Select all pending vendor rates"
                  />
                </th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Service</th>
                <th>Weight</th>
                <th>Rate</th>
                <th>Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingRateDetails ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">Loading rate details...</td>
                </tr>
              ) : selectedRateDetails.length ? (
                selectedRateDetails.map((rate, index) => {
                  const rateId = getVendorRateId(rate);
                  const canSelectRate = isPendingVendorRate(rate) && rateId !== '';
                  return <tr key={rateId || index}>
                    <td className="text-center">
                      <Form.Check
                        type="checkbox"
                        className="m-0 d-inline-flex"
                        checked={canSelectRate && selectedRateDetailIds.includes(String(rateId))}
                        onChange={() => toggleVendorRate(rateId)}
                        disabled={Boolean(processingRateApproval) || !canSelectRate}
                        aria-label={`Select vendor rate ${rateId || index + 1}`}
                      />
                    </td>
                    <td>{getVendorRateValue(rate, ['origin_name', 'originName', 'origin']) || '-'}</td>
                    <td>{getVendorRateValue(rate, ['destination_name', 'destinationName', 'destination']) || '-'}</td>
                    <td>{rate.service_type || '-'}</td>
                    <td>{formatWeightRange(rate.min_weight_kg, rate.max_weight_kg)}</td>
                    <td>
                      {currency(rate.rate ?? rate.amount ?? 0)}
                      {rate.service_type ? `/${rate.service_type}` : ''}
                    </td>
                    <td>
                      <Badge bg="warning" text="dark">{getVendorRateValue(rate, ['approval_status', 'approvalStatus']) || 'PENDING'}</Badge>
                    </td>
                  </tr>;
                })
              ) : !rateDetailsError ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">Tidak ada detail rates.</td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedRateHeader(null)} disabled={Boolean(processingRateApproval)}>
            Close
          </Button>
          <Button
            variant="outline-danger"
            onClick={() => handleRateApproval('reject')}
            disabled={loadingRateDetails || Boolean(processingRateApproval) || !selectedRateDetails.length}
          >
            {processingRateApproval === 'reject' ? 'Rejecting...' : 'Reject'}
          </Button>
          <Button
            variant="success"
            onClick={() => handleRateApproval('approve')}
            disabled={loadingRateDetails || Boolean(processingRateApproval) || !selectedRateDetailIds.length}
          >
            {processingRateApproval === 'approve'
              ? 'Approving...'
              : `Approve${selectedRateDetailIds.length ? ` (${selectedRateDetailIds.length})` : ''}`}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={Boolean(orderToApprove)}
        onHide={() => approvingOrderId === null && setOrderToApprove(null)}
        centered
      >
        <Modal.Header closeButton={approvingOrderId === null}>
          <Modal.Title>Approve Order for Packing</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to approve order <strong>{orderToApprove?.orderNumber}</strong> for packing?
          <div className="text-muted mt-2">
            {orderToApprove?.customer} · {orderToApprove?.destination}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={approvingOrderId !== null} onClick={() => setOrderToApprove(null)}>
            Cancel
          </Button>
          <Button
            variant="success"
            disabled={approvingOrderId !== null}
            onClick={() => approveOrderPacking(orderToApprove)}
          >
            <i className={`ti ${approvingOrderId !== null ? 'ti-loader-2' : 'ti-check'} me-1`} />
            {approvingOrderId !== null ? 'Approving...' : 'Yes, Approve'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={Boolean(orderToClose)}
        onHide={() => reschedulingOrderId === null && setOrderToClose(null)}
        centered
      >
        <Modal.Header closeButton={reschedulingOrderId === null}>
          <Modal.Title>Reschedule Order {orderToClose?.orderNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="reject-order-eta-date">
            <Form.Label>Proposed ETA Date <span className="text-muted">(Optional)</span></Form.Label>
            <Form.Control
              type="date"
              value={closeOrderForm.etaDate}
              disabled={reschedulingOrderId !== null || loadingRescheduleLeadTime}
              onChange={(event) =>
                setCloseOrderForm((current) => ({
                  ...current,
                  etaDate: event.target.value,
                  loadingDate: subtractDays(event.target.value, rescheduleLeadTimeDays)
                }))
              }
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="reject-order-loading-date">
            <Form.Label>Proposed Loading Date <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="date"
              required
              value={closeOrderForm.loadingDate}
              disabled={reschedulingOrderId !== null || loadingRescheduleLeadTime}
              onChange={(event) => setCloseOrderForm((current) => ({ ...current, loadingDate: event.target.value }))}
            />
            <Form.Text className="text-muted">
              {loadingRescheduleLeadTime
                ? 'Loading lead time...'
                : rescheduleLeadTimeDays !== null
                  ? `Calculated from ETA minus ${rescheduleLeadTimeDays} day${rescheduleLeadTimeDays === 1 ? '' : 's'} for depo ${orderToClose?.depo || '-'}.`
                  : 'Lead time for this depo is unavailable.'}
            </Form.Text>
          </Form.Group>
          <Form.Group controlId="close-order-comment">
            <Form.Label>Notes <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              required
              value={closeOrderForm.comment}
              disabled={reschedulingOrderId !== null}
              onChange={(event) => setCloseOrderForm((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Enter the reason for rescheduling..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={reschedulingOrderId !== null} onClick={() => setOrderToClose(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={reschedulingOrderId !== null || !closeOrderForm.loadingDate || !closeOrderForm.comment.trim()}
            onClick={submitOrderReschedule}
          >
            <i className={`ti ${reschedulingOrderId !== null ? 'ti-loader-2' : 'ti-calendar-time'} me-1`} />
            {reschedulingOrderId !== null ? 'Submitting...' : 'Submit Reschedule'}
          </Button>
        </Modal.Footer>
      </Modal>

      {orderLogDetail && (
        <RescheduleLogModal
          order={orderLogDetail}
          onClose={() => setOrderLogDetail(null)}
          onSuccess={fetchDeliveryOrders}
        />
      )}
    </Stack>
  );
}
