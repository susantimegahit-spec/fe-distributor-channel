import { Fragment, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import OrderServices from '../../../services/customer-portal/OrderServices';
import LoaderData from '../../../components/LoaderData';
import { currency } from '../../../utils/global';
import { getCookies } from '../../../utils/cookies';
import { useAlert } from '../../../utils/alertContext';
import RoleServices from '../../../services/setting/RoleServices';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import { canUseMenuAction } from '../../../utils/actionPermissions';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'WAITING_OM', label: 'Waiting OM Distributor' },
  { value: 'WAITING_ASM', label: 'Waiting ASM PT. Susanti Megah' },
  { value: 'WAITING_ADMIN_SALES', label: 'Waiting Admin Sales PT. Susanti Megah' },
  { value: 'WAITING_FINANCE', label: 'Waiting Finance PT. Susanti Megah' },
  // { value: 'WAITING_APPROVAL', label: 'Waiting Approval SM' },
  { value: 'ORDER_APPROVED', label: 'Order Approved' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' }
];

const statusVariant = {
  DRAFT: 'secondary',
  WAITING_OM: 'warning',
  WAITING_ASM: 'info',
  WAITING_ADMIN_SALES: 'primary',
  WAITING_FINANCE: 'light-primary',
  DELIVERY: 'info',
  ORDER_APPROVED: 'success',
  ARRIVED: 'success',
  CANCELLED: 'danger',
  CANCELED: 'danger',
  REJECTED: 'orange',
  FAILED: 'danger'
};

const cmoStatusVariant = {
  DRAFT: 'warning',
  POSTED: 'success'
};

const getCmoStatusLabel = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (normalizedStatus === 'DRAFT') return 'Draft';
  if (normalizedStatus === 'POSTED') return 'Posted';

  return '-';
};

const getCmoCalendarButtonClass = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (normalizedStatus === 'DRAFT') return 'btn-light-warning';
  if (normalizedStatus === 'POSTED') return 'btn-light-success';

  return 'btn-light-secondary';
};

const pageSize = 10;
const commitmentPageSize = 5;
const cmoActionPopperConfig = {
  modifiers: [
    {
      name: 'offset',
      options: { offset: [0, 8] }
    },
    {
      name: 'preventOverflow',
      options: { boundary: 'viewport', padding: 8 }
    },
    {
      name: 'flip',
      options: { fallbackPlacements: ['top-end', 'bottom-end'] }
    }
  ]
};

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const normalizeSummaryStatus = (value) => {
  const normalizedStatus = normalizeStatus(value);

  if (normalizedStatus === 'WAITING_APPROVAL') return 'WAITING_OM';
  if (normalizedStatus === 'APPROVED') return 'ORDER_APPROVED';

  return normalizedStatus;
};

const getStatusLabel = (value) => {
  const normalizedStatus = normalizeStatus(value);
  return statusOptions.find((item) => item.value === normalizedStatus)?.label || normalizedStatus.replace(/_/g, ' ');
};

const statusSummaryItems = [
  {
    value: 'WAITING_OM',
    label: 'Waiting OM Distributor',
    icon: 'ti ti-user-check',
    avatarClassName: 'bg-light-warning text-warning',
    activeClassName: 'border-warning shadow-sm'
  },
  {
    value: 'WAITING_ASM',
    label: 'Waiting ASM PT. Susanti Megah',
    icon: 'ti ti-users',
    avatarClassName: 'bg-light-info text-info',
    activeClassName: 'border-info shadow-sm'
  },
  {
    value: 'WAITING_ADMIN_SALES',
    label: 'Waiting Admin Sales PT. Susanti Megah',
    icon: 'ti ti-user-cog',
    avatarClassName: 'bg-light-primary text-primary',
    activeClassName: 'border-primary shadow-sm'
  },
  {
    value: 'WAITING_FINANCE',
    label: 'Waiting Finance PT. Susanti Megah',
    icon: 'ti ti-cash',
    avatarClassName: 'bg-light-success text-success',
    activeClassName: 'border-success shadow-sm'
  },
  {
    value: 'ORDER_APPROVED',
    label: 'Order Approved',
    icon: 'ti ti-circle-check',
    avatarClassName: 'bg-light-success text-success',
    activeClassName: 'border-success shadow-sm'
  },
  {
    value: 'DELIVERY',
    label: 'Delivery',
    icon: 'ti ti-truck-delivery',
    avatarClassName: 'bg-light-info text-info',
    activeClassName: 'border-info shadow-sm'
  },
  {
    value: 'ARRIVED',
    label: 'Arrived',
    icon: 'ti ti-package-import',
    avatarClassName: 'bg-light-success text-success',
    activeClassName: 'border-success shadow-sm'
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    icon: 'ti ti-user-cancel',
    avatarClassName: 'bg-light-orange text-orange',
    activeClassName: 'border-orange shadow-sm'
  },
  {
    value: 'FAILED',
    label: 'Failed',
    icon: 'ti ti-forbid',
    avatarClassName: 'bg-light-danger text-danger',
    activeClassName: 'border-danger shadow-sm'
  }
];

const parseAmount = (value) => {
  if (typeof value === 'number') return value;

  const normalizedValue = String(value ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  return Number(normalizedValue) || 0;
};

const approvalStatusMap = {
  WAITING_OM: 'WAITING_OM',
  WAITING_ASM: 'WAITING_ASM',
  WAITING_FINANCE: 'WAITING_FINANCE',
  ALL: 'ALL'
};

const creditLimitKeys = ['credit_limit_data.credit_limit'];

const creditRemainingKeys = ['creditLimitData.SisaCredit'];

const seriesNameKeys = ['series_name', 'seriesName', 'SeriesName'];
const seriesDisplayKeys = [...seriesNameKeys, 'series', 'Series', 'series_code', 'seriesCode'];
const seriesValueKeys = ['series', 'Series', 'series_code', 'seriesCode'];

export default function OrderList({ showOnlyCommitment = false }) {
  const navigate = useNavigate();
  const roleId = getCookies('role');
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [commitmentMonthlyOrders, setCommitmentMonthlyOrders] = useState([]);
  const [commitmentOrderToSend, setCommitmentOrderToSend] = useState(null);
  const [commitmentDeliveryDate, setCommitmentDeliveryDate] = useState('');
  const [processingCmoId, setProcessingCmoId] = useState(null);
  const [commitmentOrderToDelete, setCommitmentOrderToDelete] = useState(null);
  const [deletingCmoId, setDeletingCmoId] = useState(null);
  const [cmoActionMenu, setCmoActionMenu] = useState(null);
  const [orderActionMenu, setOrderActionMenu] = useState(null);
  const [duplicateCmoSource, setDuplicateCmoSource] = useState(null);
  const [duplicateCmoForm, setDuplicateCmoForm] = useState(null);
  const [loadingDuplicateCmo, setLoadingDuplicateCmo] = useState(false);
  const [savingDuplicateCmo, setSavingDuplicateCmo] = useState(false);
  const [expandedCommitmentOrderId, setExpandedCommitmentOrderId] = useState(null);
  const [commitmentStartDate, setCommitmentStartDate] = useState('');
  const [commitmentEndDate, setCommitmentEndDate] = useState('');
  const [commitmentCustomerCode, setCommitmentCustomerCode] = useState('');
  const [isLoadingCommitment, setIsLoadingCommitment] = useState(false);
  const [exportingCmo, setExportingCmo] = useState(false);
  const [commitmentCurrentPage, setCommitmentCurrentPage] = useState(1);
  const [commitmentLayout, setCommitmentLayout] = useState('list');
  const [commitmentCalendarMonth, setCommitmentCalendarMonth] = useState(() => moment().startOf('month'));
  const [selectedCmoCalendarDay, setSelectedCmoCalendarDay] = useState(null);
  const [draggedCmoId, setDraggedCmoId] = useState(null);
  const [cmoDropDate, setCmoDropDate] = useState('');
  const [movingCmoId, setMovingCmoId] = useState(null);
  const [showDuplicateMonthModal, setShowDuplicateMonthModal] = useState(false);
  const [duplicateMonthForm, setDuplicateMonthForm] = useState(() => ({
    sourceMonth: moment().format('YYYY-MM'),
    targetMonth: moment().add(1, 'month').format('YYYY-MM')
  }));
  const [duplicatingMonth, setDuplicatingMonth] = useState(false);
  const [duplicateMonthProgress, setDuplicateMonthProgress] = useState({ completed: 0, total: 0 });
  const [commitmentCustomerOptions, setCommitmentCustomerOptions] = useState([]);
  const [isLoadingCommitmentCustomers, setIsLoadingCommitmentCustomers] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [distributor, setDistributor] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [approvalLoadingAction, setApprovalLoadingAction] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [isLoadingCreditLimit, setIsLoadingCreditLimit] = useState(false);
  const [creditLimitError, setCreditLimitError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [orderLayout, setOrderLayout] = useState('list');
  const [orderCalendarMonth, setOrderCalendarMonth] = useState(() => moment().startOf('month'));
  const [permissionDetail, setPermissionDetail] = useState(null);

  useEffect(() => {
    getPermissionDetail();
    fetchCommitmentCustomers();
    if (showOnlyCommitment) {
      fetchCommitmentOrders();
    } else {
      fetchData();
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, distributor, keywords, status]);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keywords.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword = !normalizedKeyword || order.order_no?.toLowerCase().includes(normalizedKeyword);
      // ||order.distributor?.toLowerCase().includes(normalizedKeyword);
      const orderCustomerCode = String(
        order.card_code || order.cardCode || order.customer_code || order.customerCode || order.code_customer || order.CardCode || ''
      );
      const matchesDistributor = !distributor || orderCustomerCode === distributor;
      const matchesStatus = !status || normalizeSummaryStatus(order.status) === normalizeSummaryStatus(status);
      const matchesDate = !date || order.date === date;

      return matchesKeyword && matchesDistributor && matchesStatus && matchesDate;
    });
  }, [date, distributor, keywords, orders, status]);

  const commitmentPageCount = Math.max(Math.ceil(commitmentMonthlyOrders.length / commitmentPageSize), 1);
  const paginatedCommitmentOrders = useMemo(() => {
    const startIndex = (commitmentCurrentPage - 1) * commitmentPageSize;

    return commitmentMonthlyOrders.slice(startIndex, startIndex + commitmentPageSize);
  }, [commitmentCurrentPage, commitmentMonthlyOrders]);
  const commitmentCalendarDays = useMemo(() => {
    const calendarStart = commitmentCalendarMonth.clone().startOf('month').startOf('week');

    return Array.from({ length: 42 }, (_, index) => {
      const dateValue = calendarStart.clone().add(index, 'day');
      const ordersForDate = commitmentMonthlyOrders.filter((order) => moment(order.doc_date).isSame(dateValue, 'day'));

      return { date: dateValue, orders: ordersForDate };
    });
  }, [commitmentCalendarMonth, commitmentMonthlyOrders]);

  const summaryOrders = useMemo(() => {
    const normalizedKeyword = keywords.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword = !normalizedKeyword || order.order_no?.toLowerCase().includes(normalizedKeyword);
      const orderCustomerCode = String(
        order.card_code || order.cardCode || order.customer_code || order.customerCode || order.code_customer || order.CardCode || ''
      );
      const matchesDistributor = !distributor || orderCustomerCode === distributor;
      const matchesDate = !date || order.date === date;

      return matchesKeyword && matchesDistributor && matchesDate;
    });
  }, [date, distributor, keywords, orders]);

  const summary = useMemo(() => {
    const statusCounts = statusSummaryItems.reduce(
      (currentSummary, item) => ({
        ...currentSummary,
        [item.value]: summaryOrders.filter((order) => normalizeSummaryStatus(order.status) === item.value).length
      }),
      {}
    );

    return {
      ...statusCounts,
      total: summaryOrders.length
    };
  }, [summaryOrders]);

  const handleStatusSummaryClick = (nextStatus) => {
    setStatus((currentStatus) => (currentStatus === nextStatus ? '' : nextStatus));
  };

  const renderStatusFilterBoxes = () => (
    <Row className="g-2 mb-3 order-status-filter-row">
      <Col xs={12} sm={6} lg={3}>
        <button
          type="button"
          aria-pressed={!status}
          className={`card order-status-filter-box border mb-0 h-100 w-100 text-start bg-body p-0 overflow-hidden ${
            !status ? 'border-primary shadow-sm' : ''
          }`}
          onClick={() => setStatus('')}
        >
          <span className="card-body py-2 px-3">
            <Stack direction="horizontal" gap={2} className="justify-content-between">
              <span>
                <span className="d-block text-muted f-12 order-status-filter-label">Total Order</span>
                <span className="d-block h4 mb-0 order-status-filter-value">{summary.total}</span>
              </span>
              <span className="avtar avtar-s bg-light-primary text-primary">
                <i className="ti ti-shopping-cart" />
              </span>
            </Stack>
          </span>
        </button>
      </Col>
      {statusSummaryItems.map((item) => (
        <Col key={item.value} xs={12} sm={6} lg={3}>
          <button
            type="button"
            aria-pressed={status === item.value}
            className={`card order-status-filter-box border mb-0 h-100 w-100 text-start bg-body p-0 overflow-hidden ${
              status === item.value ? item.activeClassName : ''
            }`}
            onClick={() => handleStatusSummaryClick(item.value)}
          >
            <span className="card-body py-2 px-3">
              <Stack direction="horizontal" gap={2} className="justify-content-between">
                <span>
                  <span className="d-block text-muted f-12 order-status-filter-label">{item.label}</span>
                  <span className="d-block h4 mb-0 order-status-filter-value">{summary[item.value]}</span>
                </span>
                <span className={`avtar avtar-s ${item.avatarClassName}`}>
                  <i className={item.icon} />
                </span>
              </Stack>
            </span>
          </button>
        </Col>
      ))}
    </Row>
  );

  const hasActiveFilter = Boolean(keywords || distributor || status || date);
  const pageCount = Math.max(Math.ceil(filteredOrders.length / pageSize), 1);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredOrders]);
  const orderCalendarDays = useMemo(() => {
    const calendarStart = orderCalendarMonth.clone().startOf('month').startOf('week');

    return Array.from({ length: 42 }, (_, index) => {
      const dateValue = calendarStart.clone().add(index, 'day');
      const ordersForDate = filteredOrders.filter((order) => moment(order.doc_date).isSame(dateValue, 'day'));

      return { date: dateValue, orders: ordersForDate };
    });
  }, [filteredOrders, orderCalendarMonth]);

  const resetFilters = () => {
    setKeywords('');
    setDistributor('');
    setStatus('');
    setDate('');
    fetchData('');
  };

  const handleCustomerCodeChange = (option) => {
    const customerCode = option?.value || '';

    setDistributor(customerCode);
    fetchData(customerCode);
  };

  const extractOrderList = (response) => {
    const payload = response?.data?.data ?? response?.data;

    if (Array.isArray(payload)) return payload;

    const nestedPayload =
      payload?.orders || payload?.sales_orders || payload?.salesOrders || payload?.items || payload?.result || payload?.data;

    if (Array.isArray(nestedPayload)) return nestedPayload;

    return null;
  };

  const fetchCommitmentCustomers = async () => {
    setIsLoadingCommitmentCustomers(true);

    try {
      const response = await DistributorServices.getAllDistributor('');

      if (response?.data?.success) {
        const distributors = Array.isArray(response.data.data) ? response.data.data : [];
        const options = distributors
          .map((item) => {
            const code = String(item?.code_customer || item?.customer_code || item?.card_code || '');
            const name = item?.name || item?.customer_name || '';
            const depo = item?.depo || '';

            return {
              value: code,
              label: `${code || '-'} - ${name || '-'} - ${depo || '-'}`
            };
          })
          .filter((item) => item.value)
          .sort((first, second) => first.value.localeCompare(second.value));

        setCommitmentCustomerOptions(options);
      } else {
        showAlert(response?.data?.message || 'Failed to fetch distributor master', 'danger');
      }
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch distributor master', 'danger');
    } finally {
      setIsLoadingCommitmentCustomers(false);
    }
  };

  const fetchCommitmentOrders = async (filters = {}) => {
    const startDate = filters.start_date ?? commitmentStartDate;
    const endDate = filters.end_date ?? commitmentEndDate;
    const customerCode = filters.customer_code ?? commitmentCustomerCode;

    if (startDate && endDate && endDate < startDate) {
      showAlert('End date cannot be earlier than start date', 'warning');
      return;
    }

    setIsLoadingCommitment(true);

    try {
      const response = await OrderServices.getCmo({
        start_date: startDate,
        end_date: endDate,
        customer_code: customerCode.trim()
      });
      const draftOrders = extractOrderList(response);

      if (response?.data?.success && draftOrders) {
        setCommitmentMonthlyOrders(draftOrders);
        setCommitmentCurrentPage(1);
        setExpandedCommitmentOrderId(null);
      } else {
        showAlert(response?.data?.message || 'Failed to fetch commitment order data', 'danger');
      }
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch commitment order data', 'danger');
    } finally {
      setIsLoadingCommitment(false);
    }
  };

  const resetCommitmentFilters = () => {
    setCommitmentStartDate('');
    setCommitmentEndDate('');
    setCommitmentCustomerCode('');
    fetchCommitmentOrders({ start_date: '', end_date: '', customer_code: '' });
  };

  const handleExportCmo = async () => {
    if (commitmentStartDate && commitmentEndDate && commitmentEndDate < commitmentStartDate) {
      showAlert('End date cannot be earlier than start date', 'warning');
      return;
    }

    setExportingCmo(true);

    try {
      const response = await OrderServices.exportCmo({
        start_date: commitmentStartDate,
        end_date: commitmentEndDate,
        depo: commitmentCustomerCode
      });

      if (!response || response?.status >= 400 || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to export CMO report');
      }

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `CMO_Detailed_Report_${moment().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showAlert('CMO report downloaded successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to export CMO report', 'danger');
    } finally {
      setExportingCmo(false);
    }
  };

  const fetchData = async (customerCode = distributor) => {
    setIsLoading(true);

    try {
      const customerFilter = customerCode ? { customer_code: customerCode } : {};
      const [resp, draftResp] = await Promise.all([
        OrderServices.getSalesOrder(customerFilter),
        OrderServices.getSalesOrder({ ...customerFilter, status: 'DRAFT' })
      ]);
      const nextOrders = extractOrderList(resp);
      const nextDraftOrders = extractOrderList(draftResp);

      if (resp.data.success && draftResp.data.success && nextOrders && nextDraftOrders) {
        setOrders(nextOrders);
        setCommitmentMonthlyOrders(nextDraftOrders.filter((order) => normalizeSummaryStatus(order.status) === 'DRAFT'));
        setCommitmentCurrentPage(1);
      } else {
        showAlert(resp?.data?.message || draftResp?.data?.message || 'Failed to fetch order data', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch order data', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const syncData = async () => {
    setIsSyncing(true);

    try {
      const response = await OrderServices.syncAllOrders();
      const syncedOrders = extractOrderList(response);

      if (response?.data?.success) {
        if (syncedOrders) {
          setOrders(syncedOrders);
          await fetchCommitmentOrders();
          setCurrentPage(1);
        } else {
          await fetchData();
          await fetchCommitmentOrders();
        }

        showAlert(response.data.message || 'Order data synced successfully', 'success');
      } else {
        showAlert(response?.data?.message || 'Failed to sync order data', 'danger');
        await fetchData();
      }
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to sync order data', 'danger');
    } finally {
      setIsSyncing(false);
    }
  };

  const getOrderAttachments = (order = {}) => {
    const attachments = order.attachments || order.documents || order.files || order.order_documents || order.attachment || [];

    return Array.isArray(attachments) ? attachments : [attachments].filter(Boolean);
  };

  const getOrderValue = (order, keys, defaultValue = '-') => {
    for (const key of keys) {
      const value = String(key)
        .split('.')
        .reduce((current, path) => current?.[path], order);

      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return defaultValue;
  };

  const getOrderCustomerCode = (order = {}) =>
    getOrderValue(order, ['card_code', 'cardCode', 'customer_code', 'customerCode', 'code_customer', 'CardCode'], '');

  const getResponsePayload = (response) => {
    const payload = response?.data?.data ?? response?.data;

    if (Array.isArray(payload)) return payload[0] || {};

    const nestedPayload = payload?.data || payload?.result || payload?.payload || payload?.credit_limit || payload?.creditLimit;

    if (Array.isArray(nestedPayload)) return nestedPayload[0] || {};
    if (nestedPayload && typeof nestedPayload === 'object') return nestedPayload;

    return payload && typeof payload === 'object' ? payload : {};
  };

  const getOrderLines = (order = {}) => {
    const lines = order.details || order.lines || order.document_lines || order.DocumentLines || [];

    return Array.isArray(lines) ? lines : [];
  };

  const getKgFromProductName = (productName = '') => {
    const matches = [...String(productName).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)];
    const weightMatch = matches.at(-1);

    if (!weightMatch) return 0;

    const weight = Number(String(weightMatch[1]).replace(',', '.')) || 0;
    const unit = String(weightMatch[2]).toLowerCase();

    return ['g', 'gr', 'gram'].includes(unit) ? weight / 1000 : weight;
  };

  const getProductName = (line = {}) =>
    getOrderValue(
      line,
      ['item_name', 'itemName', 'ItemName', 'Dscription', 'description', 'item_description', 'item.item_name', 'item.name'],
      '-'
    );

  const getOrderTotalKg = (order = {}) =>
    getOrderLines(order).reduce((total, line) => {
      const productName = getProductName(line);
      const quantity = Number(getOrderValue(line, ['quantity', 'qty', 'Quantity'], 0)) || 0;

      return total + getKgFromProductName(productName) * quantity;
    }, 0);

  const formatKg = (value) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(Number(value) || 0)} Kg`;

  const createDuplicateCmoForm = (order = {}) => ({
    customerCode: getOrderCustomerCode(order),
    customerName: getOrderValue(order, ['customer_name', 'customerName', 'card_name', 'CardName', 'cntct'], ''),
    poNumber: getOrderValue(order, ['po_number', 'num_at_card', 'numAtCard', 'NumAtCard'], ''),
    docDate: moment(getOrderValue(order, ['doc_date', 'docDate', 'DocDate'], new Date())).format('YYYY-MM-DD'),
    etaDate: moment(getOrderValue(order, ['eta_date', 'etaDate', 'doc_due_date', 'docDueDate', 'DocDueDate'], new Date())).format(
      'YYYY-MM-DD'
    ),
    comments: getOrderValue(order, ['comments', 'Comments'], ''),
    source: order,
    lines: getOrderLines(order).map((line, index) => ({
      id: getOrderValue(line, ['id', 'detail_id', 'line_num', 'LineNum'], index),
      itemCode: getOrderValue(line, ['item_code', 'itemCode', 'ItemCode', 'item.code', 'item.item_code'], ''),
      itemName: getProductName(line),
      quantity: Number(getOrderValue(line, ['quantity', 'qty', 'Quantity'], 0)) || 0,
      unitMsr: getOrderValue(line, ['unit_msr', 'unitMsr', 'UomCode'], ''),
      uomEntry: getOrderValue(line, ['uom_entry', 'uomEntry', 'UomEntry'], ''),
      whsCode: getOrderValue(line, ['whs_code', 'warehouse_code', 'WhsCode'], ''),
      unitPrice: Number(getOrderValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], 0)) || 0,
      freeText: getOrderValue(line, ['free_text', 'freeText', 'FreeTxt'], ''),
      ocrCode: getOrderValue(line, ['ocr_code', 'ocrCode', 'OcrCode'], ''),
      ocrCode2: getOrderValue(line, ['ocr_code2', 'ocrCode2', 'OcrCode2'], ''),
      ocrCode3: getOrderValue(line, ['ocr_code3', 'ocrCode3', 'OcrCode3'], '')
    }))
  });

  const openDuplicateCmoModal = async (order) => {
    setDuplicateCmoSource(order);
    setDuplicateCmoForm(createDuplicateCmoForm(order));
    setLoadingDuplicateCmo(true);

    try {
      const response = await OrderServices.getCmoById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch CMO detail');
      }

      setDuplicateCmoForm(createDuplicateCmoForm(getResponsePayload(response)));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch CMO detail', 'danger');
    } finally {
      setLoadingDuplicateCmo(false);
    }
  };

  const closeDuplicateCmoModal = () => {
    if (savingDuplicateCmo) return;

    setDuplicateCmoSource(null);
    setDuplicateCmoForm(null);
    setLoadingDuplicateCmo(false);
  };

  const handleDuplicateCmoChange = (field) => (event) => {
    setDuplicateCmoForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleDuplicateCmoQuantityChange = (index, value) => {
    setDuplicateCmoForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, quantity: value === '' ? '' : Number(value) } : line))
    }));
  };

  const createCmoPayload = (form, status = 'DRAFT') => {
    const source = form.source || {};
    const docTotal = form.lines.reduce(
      (total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
      0
    );

    return {
      card_code: form.customerCode,
      customer_code: form.customerCode,
      po_number: form.poNumber,
      doc_date: form.docDate,
      doc_due_date: form.docDate,
      eta_date: form.etaDate,
      use_balance: getOrderValue(source, ['use_balance', 'useBalance'], false),
      Series: getOrderValue(source, seriesValueKeys, ''),
      series_name: getOrderValue(source, seriesNameKeys, ''),
      cntct: getOrderValue(source, ['cntct', 'cnctCode', 'contact_name', 'customer_name', 'CardName'], ''),
      pay_to_code: getOrderValue(source, ['pay_to_code', 'payToCode', 'address_code', 'PayToCode'], ''),
      address: getOrderValue(source, ['address', 'bill_to_address', 'Address'], ''),
      ship_to_code: getOrderValue(source, ['ship_to_code', 'shipToCode', 'address2_code', 'ShipToCode'], ''),
      address2: getOrderValue(source, ['address2', 'ship_to_address', 'Address2'], ''),
      comments: form.comments,
      status,
      doc_total: docTotal,
      DocTotal: docTotal,
      id_discount: getOrderValue(source, ['id_discount', 'idDiscount'], ''),
      action: getOrderValue(source, ['action'], ''),
      lines: form.lines.map((line) => ({
        item_code: line.itemCode,
        quantity: Number(line.quantity),
        unit_msr: line.unitMsr,
        uom_entry: line.uomEntry,
        whs_code: line.whsCode,
        unit_price: line.unitPrice,
        line_total: Number(line.quantity) * Number(line.unitPrice),
        free_text: line.freeText,
        ocr_code: line.ocrCode,
        ocr_code2: line.ocrCode2,
        ocr_code3: line.ocrCode3
      }))
    };
  };

  const handleSaveDuplicateCmo = async () => {
    if (
      !duplicateCmoForm?.customerCode ||
      !duplicateCmoForm.docDate ||
      !duplicateCmoForm.etaDate ||
      !duplicateCmoForm.lines.length ||
      duplicateCmoForm.lines.some((line) => !(Number(line.quantity) > 0))
    ) {
      showAlert('Customer, dates, and valid item quantities are required', 'warning');
      return;
    }

    const payload = createCmoPayload(
      { ...duplicateCmoForm, source: duplicateCmoForm.source || duplicateCmoSource || {} },
      'DRAFT'
    );

    setSavingDuplicateCmo(true);

    try {
      const response = await OrderServices.postCmo(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to duplicate CMO');
      }

      setDuplicateCmoSource(null);
      setDuplicateCmoForm(null);
      showAlert(response?.data?.message || 'CMO duplicated successfully', 'success');
      await fetchCommitmentOrders();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to duplicate CMO', 'danger');
    } finally {
      setSavingDuplicateCmo(false);
    }
  };

  const handleMoveCmo = async (orderId, targetDate) => {
    const order = commitmentMonthlyOrders.find((item) => String(item.id) === String(orderId));

    if (!order || moment(order.doc_date).format('YYYY-MM-DD') === targetDate || movingCmoId !== null) return;

    setMovingCmoId(order.id);

    try {
      const detailResponse = await OrderServices.getCmoById(order.id);
      if (detailResponse?.data?.success === false) {
        throw new Error(detailResponse.data.message || 'Failed to fetch CMO detail');
      }

      const detail = getResponsePayload(detailResponse);
      const form = { ...createDuplicateCmoForm(detail), docDate: targetDate };
      const payload = createCmoPayload(form, getOrderValue(detail, ['status'], 'DRAFT'));
      const response = await OrderServices.putCmo(order.id, payload);

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to move CMO');
      }

      setCommitmentMonthlyOrders((currentOrders) =>
        currentOrders.map((item) =>
          String(item.id) === String(order.id) ? { ...item, doc_date: targetDate, doc_due_date: targetDate } : item
        )
      );
      showAlert(response?.data?.message || `CMO moved to ${moment(targetDate).format('DD MMM YYYY')}`, 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to move CMO', 'danger');
    } finally {
      setMovingCmoId(null);
      setDraggedCmoId(null);
      setCmoDropDate('');
    }
  };

  const openDuplicateMonthModal = () => {
    const sourceMonth = commitmentCalendarMonth.format('YYYY-MM');

    setDuplicateMonthForm({
      sourceMonth,
      targetMonth: commitmentCalendarMonth.clone().add(1, 'month').format('YYYY-MM')
    });
    setDuplicateMonthProgress({ completed: 0, total: 0 });
    setShowDuplicateMonthModal(true);
  };

  const handleDuplicateCmoMonth = async () => {
    const { sourceMonth, targetMonth } = duplicateMonthForm;

    if (!sourceMonth || !targetMonth) {
      showAlert('Source month and target month are required', 'warning');
      return;
    }
    if (sourceMonth === targetMonth) {
      showAlert('Target month must be different from source month', 'warning');
      return;
    }

    const sourceStart = moment(`${sourceMonth}-01`).startOf('month');
    const sourceEnd = sourceStart.clone().endOf('month');
    const targetStart = moment(`${targetMonth}-01`).startOf('month');

    setDuplicatingMonth(true);
    setDuplicateMonthProgress({ completed: 0, total: 0 });

    try {
      const listResponse = await OrderServices.getCmo({
        start_date: sourceStart.format('YYYY-MM-DD'),
        end_date: sourceEnd.format('YYYY-MM-DD')
      });
      const sourceOrders = extractOrderList(listResponse) || [];

      if (!sourceOrders.length) {
        showAlert('No CMO data found in the selected source month', 'warning');
        return;
      }

      setDuplicateMonthProgress({ completed: 0, total: sourceOrders.length });
      let successCount = 0;
      let failedCount = 0;

      for (const sourceOrder of sourceOrders) {
        try {
          const detailResponse = await OrderServices.getCmoById(sourceOrder.id);
          if (detailResponse?.data?.success === false) throw new Error('Failed to fetch CMO detail');

          const detail = getResponsePayload(detailResponse);
          const sourceForm = createDuplicateCmoForm(detail);
          const sourceDocDate = moment(sourceForm.docDate);
          const targetDay = Math.min(sourceDocDate.date(), targetStart.daysInMonth());
          const targetDocDate = targetStart.clone().date(targetDay);
          const etaOffset = Math.max(moment(sourceForm.etaDate).diff(sourceDocDate, 'days'), 0);
          const duplicateForm = {
            ...sourceForm,
            docDate: targetDocDate.format('YYYY-MM-DD'),
            etaDate: targetDocDate.clone().add(etaOffset, 'days').format('YYYY-MM-DD')
          };
          const payload = { ...createCmoPayload(duplicateForm, 'DRAFT'), action: '' };
          const response = await OrderServices.postCmo(payload);

          if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to duplicate CMO');
          successCount += 1;
        } catch {
          failedCount += 1;
        } finally {
          setDuplicateMonthProgress((current) => ({ ...current, completed: current.completed + 1 }));
        }
      }

      if (successCount > 0) {
        showAlert(
          `${successCount} CMO duplicated to ${targetStart.format('MMMM YYYY')}${failedCount ? `, ${failedCount} failed` : ''}`,
          failedCount ? 'warning' : 'success'
        );
        setCommitmentCalendarMonth(targetStart.clone());
        const targetStartDate = targetStart.format('YYYY-MM-DD');
        const targetEndDate = targetStart.clone().endOf('month').format('YYYY-MM-DD');

        setCommitmentStartDate(targetStartDate);
        setCommitmentEndDate(targetEndDate);
        await fetchCommitmentOrders({ start_date: targetStartDate, end_date: targetEndDate });
      } else {
        showAlert('Failed to duplicate monthly CMO data', 'danger');
      }

      if (!failedCount) setShowDuplicateMonthModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to duplicate monthly CMO data', 'danger');
    } finally {
      setDuplicatingMonth(false);
    }
  };

  const getSapDiscounts = (order = {}) => {
    let discounts = order.sap_dicount ?? order.sap_discount ?? [];

    if (typeof discounts === 'string') {
      try {
        discounts = JSON.parse(discounts);
      } catch {
        return [];
      }
    }

    if (Array.isArray(discounts)) return discounts;

    const nestedDiscounts = discounts?.discounts || discounts?.details || discounts?.items || discounts?.rows || discounts?.data;

    if (Array.isArray(nestedDiscounts)) return nestedDiscounts;

    return discounts && typeof discounts === 'object' ? [discounts] : [];
  };

  const getSapDiscountTotal = (order = {}) => {
    let sapDiscount = order.sap_discount;

    if (typeof sapDiscount === 'string') {
      try {
        sapDiscount = JSON.parse(sapDiscount);
      } catch {
        return parseAmount(sapDiscount);
      }
    }

    const rawDetails = sapDiscount?.details;
    const details = Array.isArray(rawDetails) ? rawDetails : [rawDetails].filter(Boolean);

    return details.reduce((total, detail) => total + parseAmount(getOrderValue(detail, ['total_discount', 'totalDiscount'], 0)), 0);
  };

  const getLineVatTotal = (line = {}) => {
    const vatTotal = getOrderValue(line, ['vat_total', 'vatTotal', 'VatTotal', 'tax_total', 'taxTotal'], '');

    if (vatTotal !== '') return vatTotal;

    const lineTotal = parseAmount(getOrderValue(line, ['line_total', 'lineTotal', 'LineTotal'], 0));
    const quantity = parseAmount(getOrderValue(line, ['quantity', 'qty', 'Quantity'], 0));
    const unitPrice = parseAmount(getOrderValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], 0));
    const calculatedVatTotal = lineTotal - quantity * unitPrice;

    return calculatedVatTotal > 0 ? calculatedVatTotal : 0;
  };

  const buildOrderStatusPayload = (order, nextStatus, actionName) => ({
    card_code: getOrderValue(order, ['card_code', 'cardCode', 'customer_code', 'CardCode'], ''),
    po_number: getOrderValue(order, ['po_number', 'num_at_card', 'numAtCard', 'NumAtCard'], ''),
    doc_date: getOrderValue(order, ['doc_date', 'docDate', 'DocDate'], ''),
    doc_due_date: getOrderValue(order, ['doc_due_date', 'docDueDate', 'DocDueDate'], ''),
    eta_date: getOrderValue(order, ['eta_date', 'etaDate', 'ETA', 'u_eta', 'U_ETA'], ''),
    slp_code: getOrderValue(order, ['slp_code', 'slpCode', 'SlpCode'], ''),
    cntct: getOrderValue(order, ['cntct', 'cnctCode', 'contact_name', 'customer_name', 'CardName'], ''),
    pay_to_code: getOrderValue(order, ['pay_to_code', 'payToCode', 'address_code', 'PayToCode'], ''),
    address: getOrderValue(order, ['address', 'bill_to_address', 'Address'], ''),
    ship_to_code: getOrderValue(order, ['ship_to_code', 'shipToCode', 'address2_code', 'ShipToCode'], ''),
    address2: getOrderValue(order, ['address2', 'ship_to_address', 'Address2'], ''),
    comments: getOrderValue(order, ['comments', 'Comments'], ''),
    use_balance: getOrderValue(order, ['use_balance', 'useBalance'], false),
    Series: getOrderValue(order, seriesValueKeys, ''),
    series: getOrderValue(order, seriesValueKeys, ''),
    series_name: getOrderValue(order, seriesDisplayKeys, ''),
    status: nextStatus,
    action: actionName,
    notes: approvalNotes,
    id_discount: getOrderValue(order, ['id_discount', 'idDiscount'], ''),
    approval_id: permissionDetail?.role_menu?.approval_id,
    doc_total: getOrderValue(order, ['doc_total', 'docTotal', 'DocTotal'], ''),
    DocTotal: getOrderValue(order, ['DocTotal', 'doc_total', 'docTotal'], ''),
    lines: getOrderLines(order).map((line) => ({
      item_code: getOrderValue(line, ['item_code', 'itemCode', 'ItemCode'], ''),
      quantity: getOrderValue(line, ['quantity', 'qty', 'Quantity'], ''),
      unit_msr: getOrderValue(line, ['unit_msr', 'unitMsr', 'UomCode'], ''),
      uom_entry: getOrderValue(line, ['uom_entry', 'uomEntry', 'UomEntry'], ''),
      whs_code: getOrderValue(line, ['whs_code', 'warehouse_code', 'WhsCode'], ''),
      unit_price: getOrderValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], ''),
      vat_group: getOrderValue(line, ['vat_group', 'vatGroup', 'VatGroup'], ''),
      vat_rate: getOrderValue(line, ['vat_rate', 'vatRate', 'VatRate', 'rate'], ''),
      vat_total: getLineVatTotal(line),
      line_total: getOrderValue(line, ['line_total', 'lineTotal', 'LineTotal'], ''),
      free_text: getOrderValue(line, ['free_text', 'freeText', 'FreeTxt'], ''),
      ocr_code: getOrderValue(line, ['ocr_code', 'ocrCode', 'OcrCode'], ''),
      ocr_code2: getOrderValue(line, ['ocr_code2', 'ocrCode2', 'OcrCode2'], ''),
      ocr_code3: getOrderValue(line, ['ocr_code3', 'ocrCode3', 'OcrCode3'], '')
    }))
  });

  const openProcessCmoModal = (order) => {
    const initialDeliveryDate = getOrderValue(order, ['eta_date', 'etaDate', 'doc_due_date', 'docDueDate'], moment().format('YYYY-MM-DD'));

    setCommitmentOrderToSend(order);
    setCommitmentDeliveryDate(moment(initialDeliveryDate).format('YYYY-MM-DD'));
  };

  const closeProcessCmoModal = () => {
    if (processingCmoId !== null) return;

    setCommitmentOrderToSend(null);
    setCommitmentDeliveryDate('');
  };

  const handleProcessCmo = async () => {
    if (!commitmentOrderToSend?.id || !commitmentDeliveryDate) {
      showAlert('Delivery date is required', 'danger');
      return;
    }

    setProcessingCmoId(commitmentOrderToSend.id);

    try {
      const response = await OrderServices.postCmoToSales(commitmentOrderToSend.id, { eta_date: commitmentDeliveryDate });

      if (response?.data?.success) {
        showAlert(response.data.message || 'CMO successfully posted to sales order', 'success');
        setCommitmentOrderToSend(null);
        setCommitmentDeliveryDate('');
        await fetchCommitmentOrders();
      } else {
        showAlert(response?.data?.message || 'Failed to post CMO to sales order', 'danger');
      }
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to post CMO to sales order', 'danger');
    } finally {
      setProcessingCmoId(null);
    }
  };

  const handleDeleteCmo = async () => {
    if (!commitmentOrderToDelete?.id) return;

    setDeletingCmoId(commitmentOrderToDelete.id);

    try {
      const response = await OrderServices.deleteCmo(commitmentOrderToDelete.id);

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to delete CMO', 'danger');
        return;
      }

      setCommitmentOrderToDelete(null);
      showAlert(response?.data?.message || 'CMO deleted successfully', 'success');
      await fetchCommitmentOrders();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to delete CMO', 'danger');
    } finally {
      setDeletingCmoId(null);
    }
  };

  const formatOrderDate = (value) => {
    if (!value) return '-';

    const dateValue = moment(value);

    return dateValue.isValid() ? dateValue.format('DD MMM YYYY') : '-';
  };

  const getAttachmentValue = (attachment, keys, defaultValue = '') => {
    if (typeof attachment === 'string') return attachment;

    for (const key of keys) {
      const value = attachment?.[key];

      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return defaultValue;
  };

  const getAttachmentUrl = (attachment) => {
    const rawUrl = getAttachmentValue(attachment, ['file_url', 'url', 'path', 'document_url', 'attachment_url']);

    if (!rawUrl) return '';
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    try {
      return new URL(rawUrl, import.meta.env.VITE_APP_API_ENDPOINT_PRODUCTION).href;
    } catch {
      return rawUrl;
    }
  };

  const openAttachment = (attachment, targetWindow = null) => {
    const attachmentUrl = getAttachmentUrl(attachment);

    if (!attachmentUrl) {
      targetWindow?.close();
      showAlert('Attachment URL not found', 'danger');
      return;
    }

    if (targetWindow) {
      targetWindow.location.replace(attachmentUrl);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = attachmentUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleViewAttachment = async (order, isCmo = false) => {
    const attachmentTab = window.open('about:blank', '_blank');
    if (attachmentTab) attachmentTab.opener = null;

    setDownloadingAttachmentId(order.id);

    try {
      let attachments = getOrderAttachments(order);

      if (!attachments.length) {
        const response = isCmo ? await OrderServices.getCmoById(order.id) : await OrderServices.getDetailOrder(order.id);

        if (response?.data?.success) {
          attachments = getOrderAttachments(response.data.data);
        }
      }

      if (!attachments.length) {
        attachmentTab?.close();
        showAlert(`${isCmo ? 'CMO' : 'Order'} attachment is not available`, 'warning');
        return;
      }

      openAttachment(attachments[0], attachmentTab);
    } catch (error) {
      attachmentTab?.close();
      showAlert(error?.response?.data?.message || error?.message || `Failed to download ${isCmo ? 'CMO' : 'order'} attachment`, 'danger');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleDownloadPdf = async (order) => {
    setDownloadingPdfId(order.id);

    try {
      const response = await OrderServices.downloadPdf(order.id);
      if (response && response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const customerName = (order.customer_name || 'customer').replace(/[\s\\/]+/g, '-');
        link.download = `PI-${customerName}-${order.order_no || order.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showAlert('PDF downloaded successfully', 'success');
      } else {
        showAlert('Failed to download PDF file', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to download order PDF', 'danger');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleViewOrder = async (order) => {
    setLoadingDetailId(order.id);
    setApprovalNotes('');
    setCreditLimitError('');
    setIsLoadingCreditLimit(false);

    try {
      const response = showOnlyCommitment ? await OrderServices.getCmoById(order.id) : await OrderServices.getDetailOrder(order.id);

      if (response?.data?.success) {
        const orderDetail = response.data.data;
        const shouldLoadCreditLimit =
          normalizeStatus(orderDetail?.status || order?.status) === 'WAITING_FINANCE' &&
          canUseMenuAction(showOnlyCommitment ? ['order-cmo', 13] : ['order-list', 14], 'approve');
        const customerCode = getOrderCustomerCode(orderDetail) || getOrderCustomerCode(order);
        setSelectedOrderDetail(orderDetail);

        if (shouldLoadCreditLimit && customerCode) {
          setIsLoadingCreditLimit(true);

          try {
            const creditLimitResponse = await OrderServices.getCreditLimit(customerCode);

            if (creditLimitResponse?.data?.success === false) {
              setCreditLimitError(creditLimitResponse?.data?.message || 'Failed to fetch credit limit');
              return;
            }

            const creditLimitData = getResponsePayload(creditLimitResponse);

            setSelectedOrderDetail((currentDetail) =>
              currentDetail?.id === orderDetail.id
                ? {
                    ...currentDetail,
                    credit_limit_data: creditLimitData,
                    creditLimitData: creditLimitData
                  }
                : currentDetail
            );
          } catch (error) {
            setCreditLimitError(error?.response?.data?.message || error?.message || 'Failed to fetch credit limit');
          } finally {
            setIsLoadingCreditLimit(false);
          }
        } else if (shouldLoadCreditLimit && !customerCode) {
          setCreditLimitError('Customer code was not found to fetch the credit limit');
        }
      } else {
        showAlert(response?.data?.message || 'Failed to fetch order detail', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch order detail', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const closeDetailModal = () => {
    setSelectedOrderDetail(null);
    setApprovalNotes('');
    setCreditLimitError('');
    setIsLoadingCreditLimit(false);
  };

  const getNextApprovalStatus = (order) => approvalStatusMap[normalizeStatus(order.status)];

  const updateSelectedOrderStatus = async (nextStatus, actionName) => {
    if (!selectedOrderDetail?.id) {
      showAlert('Order detail not found', 'danger');
      return;
    }

    setApprovalLoadingAction(actionName);
    const payload = buildOrderStatusPayload(selectedOrderDetail, nextStatus, actionName);
    try {
      const response = await OrderServices.putOrder(
        selectedOrderDetail.id,
        buildOrderStatusPayload(selectedOrderDetail, nextStatus, actionName)
      );

      if (response?.data?.success) {
        const updatedOrder = response.data.data || { ...selectedOrderDetail, status: nextStatus };

        setSelectedOrderDetail(updatedOrder);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            String(order.id) === String(selectedOrderDetail.id) ? { ...order, ...updatedOrder, status: nextStatus } : order
          )
        );
        showAlert(response.data.message || 'Order status updated successfully', 'success');
        fetchData();
        setSelectedOrderDetail(null);
      } else {
        showAlert(response?.data?.message || 'Failed to update order status', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to update order status', 'danger');
    } finally {
      setApprovalLoadingAction('');
    }
  };

  const handleApproveOrder = () => {
    const nextStatus = getNextApprovalStatus(selectedOrderDetail);

    if (!nextStatus) {
      showAlert('This order status has no next approval flow', 'warning');
      return;
    }

    updateSelectedOrderStatus(nextStatus, 'approve');
  };

  const handleRejectOrder = () => {
    updateSelectedOrderStatus('DRAFT', 'reject');
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel?.id) return;

    setCancellingOrderId(orderToCancel.id);

    try {
      const response = await OrderServices.postCancelOrder(orderToCancel.id);

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to cancel sales order', 'danger');
        return;
      }

      const updatedOrder = response?.data?.data || { ...orderToCancel, status: 'CANCELLED' };
      setOrders((currentOrders) =>
        currentOrders.map((order) => (String(order.id) === String(orderToCancel.id) ? { ...order, ...updatedOrder } : order))
      );
      setOrderToCancel(null);
      showAlert(response?.data?.message || 'Sales order cancelled successfully', 'success');
      fetchData();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to cancel sales order', 'danger');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getPermissionDetail = async () => {
    const resp = await RoleServices.fetchRole(getCookies('role'));

    if (resp.data.success) {
      setPermissionDetail(resp.data.data);
    }
  };

  const hasAction = (actionName) => {
    const normalizedAction = actionName === 'attachment' ? 'download' : actionName;
    return canUseMenuAction(showOnlyCommitment ? ['order-cmo', 13] : ['order-list', 14], normalizedAction);
  };

  const canCreateOrder = hasAction('create');

  const getButtonVisibility = (order) => {
    const view = hasAction('view');
    const normalizedOrderStatus = normalizeStatus(order.status);
    const isApprovedByFinance =
      normalizedOrderStatus === 'ORDER_APPROVED' ||
      normalizedOrderStatus === 'APPROVED' ||
      normalizedOrderStatus === 'DELIVERY' ||
      normalizedOrderStatus === 'ARRIVED';
    const canEditOrder = hasAction('edit') && !['APPROVED', 'ARRIVED', 'ORDER_APPROVED'].includes(normalizedOrderStatus);

    return {
      view,
      attachment: hasAction('attachment') || hasAction('download'),
      download: hasAction('download') && isApprovedByFinance,
      edit: canEditOrder,
      delete: hasAction('delete')
    };
  };

  const getAccessAction = (order) => {
    const button = getButtonVisibility(order);
    const canCancel = hasAction('delete') && ['ORDER_APPROVED', 'APPROVED'].includes(normalizeStatus(order.status));
    const canDownloadPdf =
      hasAction('download') && ['ORDER_APPROVED', 'APPROVED', 'DELIVERY', 'ARRIVED'].includes(normalizeStatus(order.status));
    const canViewAttachment = hasAction('download') && Boolean(order?.id);

    const hasVisibleButton = button.view || canViewAttachment || canDownloadPdf || button.edit || canCancel;

    if (!hasVisibleButton) {
      return <span className="text-muted">-</span>;
    }

    return (
      <Button
        size="sm"
        variant={String(orderActionMenu?.order?.id) === String(order.id) ? 'primary' : 'outline-primary'}
        aria-label="Open order actions"
        aria-expanded={String(orderActionMenu?.order?.id) === String(order.id)}
        onClick={(event) =>
          setOrderActionMenu((current) => (String(current?.order?.id) === String(order.id) ? null : { order, target: event.currentTarget }))
        }
      >
        <i className="ti ti-dots-vertical me-1" />
        Actions
        <i className="ti ti-chevron-down ms-1" />
      </Button>
    );
  };

  const canShowSelectedApprovalAction = !showOnlyCommitment && Boolean(selectedOrderDetail) && hasAction('approve');
  const nextSelectedApprovalStatus = selectedOrderDetail ? getNextApprovalStatus(selectedOrderDetail) : '';
  const selectedSapDiscounts = selectedOrderDetail ? getSapDiscounts(selectedOrderDetail) : [];
  const selectedSapDiscountTotal = selectedSapDiscounts.reduce(
    (total, discount) =>
      total + Number(getOrderValue(discount, ['discount_amount', 'amount', 'discount_sum', 'DiscountSum', 'total_discount'], 0)),
    0
  );
  const selectedOrderTotal = selectedOrderDetail ? parseAmount(getOrderValue(selectedOrderDetail, ['doc_total', 'docTotal'], 0)) : 0;
  const selectedSapDetailDiscountTotal = selectedOrderDetail ? getSapDiscountTotal(selectedOrderDetail) : 0;
  const selectedOrderDiscountTotal = selectedOrderDetail?.sap_discount
    ? selectedSapDetailDiscountTotal
    : selectedSapDiscountTotal ||
      parseAmount(
        selectedOrderDetail
          ? getOrderValue(selectedOrderDetail, ['discount_total', 'total_discount', 'sap_discount_total', 'discountAmount'], 0)
          : 0
      );
  const selectedOrderGrandTotal = selectedOrderTotal - selectedOrderDiscountTotal;
  const selectedCreditLimit = selectedOrderDetail ? getOrderValue(selectedOrderDetail, creditLimitKeys, '') : '';
  const selectedCreditRemaining = selectedOrderDetail?.creditLimitData?.SisaCredit;
  const canShowCreditLimitInfo =
    selectedOrderDetail &&
    normalizeStatus(selectedOrderDetail.status) === 'WAITING_FINANCE' &&
    canUseMenuAction(showOnlyCommitment ? ['order-cmo', 13] : ['order-list', 14], 'approve');
  const formatCreditAmount = (value) => (value !== undefined && value !== null && value !== '' ? currency(parseAmount(value)) : '-');
  return (
    <>
      <Stack gap={3}>
        {!showOnlyCommitment && (
          <MainCard
            content={false}
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Order List</h5>
                <span className="text-muted f-12">Monitor distributor orders and continue the sales process from one page.</span>
              </Stack>
            }
            secondary={
              <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-end">
                <div className="btn-group" role="group" aria-label="Order layout">
                  <Button
                    variant={orderLayout === 'list' ? 'light-secondary' : 'outline-secondary'}
                    aria-pressed={orderLayout === 'list'}
                    onClick={() => setOrderLayout('list')}
                  >
                    <i className="ti ti-list me-1" />
                    List
                  </Button>
                  <Button
                    variant={orderLayout === 'calendar' ? 'light-secondary' : 'outline-secondary'}
                    aria-pressed={orderLayout === 'calendar'}
                    onClick={() => setOrderLayout('calendar')}
                  >
                    <i className="ti ti-calendar me-1" />
                    Calendar
                  </Button>
                </div>
                <Button variant="light-primary" onClick={syncData} disabled={isLoading || isSyncing}>
                  <i className={`ti ${isSyncing ? 'ti-loader-2' : 'ti-refresh'} me-1`} />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
                {canCreateOrder ? (
                  <Button variant="primary" as={Link} to={`/order/order-create`}>
                    <i className="ti ti-plus me-1" />
                    Add Order
                  </Button>
                ) : null}
              </Stack>
            }
          />
        )}

        {showOnlyCommitment && (
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Commitment Monthly Order</h5>
                <span className="text-muted f-12">Order commitments that are still in draft status.</span>
              </Stack>
            }
            secondary={
              <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-end">
                <div className="btn-group" role="group" aria-label="CMO layout">
                  <Button
                    variant={commitmentLayout === 'list' ? 'light-secondary' : 'outline-secondary'}
                    aria-pressed={commitmentLayout === 'list'}
                    onClick={() => setCommitmentLayout('list')}
                  >
                    <i className="ti ti-list me-1" />
                    List
                  </Button>
                  <Button
                    variant={commitmentLayout === 'calendar' ? 'light-secondary' : 'outline-secondary'}
                    aria-pressed={commitmentLayout === 'calendar'}
                    onClick={() => setCommitmentLayout('calendar')}
                  >
                    <i className="ti ti-calendar me-1" />
                    Calendar
                  </Button>
                </div>
                <Button variant="light-info" onClick={openDuplicateMonthModal}>
                  <i className="ti ti-calendar-copy me-1" />
                  Duplicate Month
                </Button>
                <Button variant="primary" as={Link} to="/customer-portal/order/cmo-create">
                  <i className="ti ti-plus me-1" />
                  Add CMO
                </Button>
              </Stack>
            }
          >
            <Row className="g-2 align-items-end mb-3">
              <Col lg={3} md={6}>
                <Form.Label className="f-12 text-muted">Customer Code</Form.Label>
                <Select
                  classNamePrefix="react-select"
                  value={commitmentCustomerOptions.find((option) => option.value === commitmentCustomerCode) || null}
                  options={commitmentCustomerOptions}
                  isLoading={isLoadingCommitmentCustomers}
                  isDisabled={isLoadingCommitmentCustomers}
                  isClearable
                  isSearchable
                  placeholder="Search customer code..."
                  noOptionsMessage={() => 'Distributor not found'}
                  onChange={(option) => setCommitmentCustomerCode(option?.value || '')}
                />
              </Col>
              <Col lg={2} md={3} sm={6}>
                <Form.Label className="f-12 text-muted">Start Date</Form.Label>
                <Form.Control type="date" value={commitmentStartDate} onChange={(event) => setCommitmentStartDate(event.target.value)} />
              </Col>
              <Col lg={2} md={3} sm={6}>
                <Form.Label className="f-12 text-muted">End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={commitmentEndDate}
                  min={commitmentStartDate || undefined}
                  onChange={(event) => setCommitmentEndDate(event.target.value)}
                />
              </Col>
              <Col lg={5} md={12}>
                <Stack direction="horizontal" gap={2} className="align-items-stretch flex-nowrap">
                  <Button
                    className="flex-grow-1 text-nowrap"
                    variant="primary"
                    disabled={isLoadingCommitment}
                    onClick={() => fetchCommitmentOrders()}
                  >
                    <i className="ti ti-filter me-1" />
                    Filter
                  </Button>
                  <Button
                    className="flex-shrink-0"
                    style={{ width: 42 }}
                    variant="light-primary"
                    disabled={isLoadingCommitment}
                    onClick={resetCommitmentFilters}
                    aria-label="Reset CMO filters"
                    title="Reset filters"
                  >
                    <i className="ti ti-refresh" />
                  </Button>
                  <Button
                    className="flex-shrink-0 text-nowrap"
                    style={{ minWidth: 132 }}
                    variant="outline-success"
                    disabled={isLoadingCommitment || exportingCmo}
                    onClick={handleExportCmo}
                  >
                    <i className={`ti ${exportingCmo ? 'ti-loader-2' : 'ti-file-export'} me-1`} />
                    {exportingCmo ? 'Exporting...' : 'Export CMO'}
                  </Button>
                </Stack>
              </Col>
            </Row>
            {commitmentLayout === 'list' ? (
              <>
                <Table className="mb-0 align-middle" responsive hover>
              <thead>
                <tr>
                  <th aria-label="Expand product details" style={{ width: 48 }} />
                  <th>CMO / Customer</th>
                  <th>Date</th>
                  <th>Total Item</th>
                  <th>Kg</th>
                  <th>Total Order</th>
                  <th>Status</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              {isLoading || isLoadingCommitment ? (
                <tbody>
                  <tr>
                    <td colSpan={8}>
                      <LoaderData />
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {paginatedCommitmentOrders.length > 0 ? (
                    paginatedCommitmentOrders.map((order) => {
                      const isExpanded = String(expandedCommitmentOrderId) === String(order.id);
                      const productLines = getOrderLines(order);

                      return (
                        <Fragment key={order.id}>
                          <tr>
                            <td className="text-center">
                              <Button
                                className="rounded-circle p-0"
                                size="sm"
                                variant="light-primary"
                                aria-label={isExpanded ? 'Hide product details' : 'Show product details'}
                                aria-expanded={isExpanded}
                                style={{ width: 32, height: 32 }}
                                onClick={() => setExpandedCommitmentOrderId(isExpanded ? null : order.id)}
                              >
                                <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                              </Button>
                            </td>
                            <td>
                              <div className="fw-semibold text-primary">
                                {getOrderValue(
                                  order,
                                  ['cmo_no', 'cmo_number', 'order_no', 'doc_num', 'document_number', 'DocNum'],
                                  `CMO-${order.id}`
                                )}
                              </div>
                              <div className="text-muted f-12">
                                {order.depo || '-'} - {order.customer_name || order.customer_code || '-'}
                              </div>
                            </td>
                            <td>{moment(order.doc_date).format('DD MMM YYYY')}</td>
                            <td>{productLines.length}</td>
                            <td className="fw-semibold">{formatKg(getOrderTotalKg(order))}</td>
                            <td>{currency(order?.doc_total)}</td>
                            <td>
                              <Badge bg={cmoStatusVariant[normalizeStatus(order.status)] || 'secondary'}>
                                {getCmoStatusLabel(order.status)}
                              </Badge>
                            </td>
                            <td className="text-center">
                              <Button
                                size="sm"
                                variant={String(cmoActionMenu?.order?.id) === String(order.id) ? 'primary' : 'outline-primary'}
                                aria-label="Open CMO actions"
                                aria-expanded={String(cmoActionMenu?.order?.id) === String(order.id)}
                                onClick={(event) =>
                                  setCmoActionMenu((current) =>
                                    String(current?.order?.id) === String(order.id) ? null : { order, target: event.currentTarget }
                                  )
                                }
                              >
                                <i className="ti ti-dots-vertical me-1" />
                                Actions
                                <i className="ti ti-chevron-down ms-1" />
                              </Button>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr key={`${order.id}-products`} className="bg-light">
                              <td colSpan={8} className="p-3">
                                <div className="border rounded bg-white overflow-hidden">
                                  <Table className="mb-0 align-middle" responsive size="sm">
                                    <thead>
                                      <tr>
                                        <th>Product</th>
                                        <th className="text-end">Qty</th>
                                        <th className="text-end">Kg / Item</th>
                                        <th className="text-end">Total Kg</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {productLines.length ? (
                                        productLines.map((line, index) => {
                                          const productName = getProductName(line);
                                          const quantity = Number(getOrderValue(line, ['quantity', 'qty', 'Quantity'], 0)) || 0;
                                          const kgPerItem = getKgFromProductName(productName);

                                          return (
                                            <tr key={line.id || getOrderValue(line, ['item_code', 'itemCode'], index)}>
                                              <td>{productName}</td>
                                              <td className="text-end">{quantity}</td>
                                              <td className="text-end">{formatKg(kgPerItem)}</td>
                                              <td className="text-end fw-semibold">{formatKg(kgPerItem * quantity)}</td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr>
                                          <td colSpan={4} className="text-center text-muted py-3">
                                            Product details are not available.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </Table>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="text-center text-muted py-4">No draft orders found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              )}
                </Table>
                <TablePagination
                  currentPage={commitmentCurrentPage}
                  onPageChange={(page) => {
                    setCommitmentCurrentPage(page);
                    setExpandedCommitmentOrderId(null);
                  }}
                  pageCount={commitmentPageCount}
                  pageSize={commitmentPageSize}
                  total={commitmentMonthlyOrders.length}
                  itemLabel="commitment order"
                />
              </>
            ) : (
              <div className="border rounded overflow-hidden">
                <Stack direction="horizontal" gap={2} className="justify-content-between border-bottom p-3 flex-wrap">
                  <Button
                    size="sm"
                    variant="light-primary"
                    onClick={() => setCommitmentCalendarMonth((currentMonth) => currentMonth.clone().subtract(1, 'month'))}
                    aria-label="Previous month"
                  >
                    <i className="ti ti-chevron-left" />
                  </Button>
                  <Stack direction="horizontal" gap={2}>
                    <h5 className="mb-0">{commitmentCalendarMonth.format('MMMM YYYY')}</h5>
                    <Button size="sm" variant="outline-primary" onClick={() => setCommitmentCalendarMonth(moment().startOf('month'))}>
                      Today
                    </Button>
                  </Stack>
                  <Button
                    size="sm"
                    variant="light-primary"
                    onClick={() => setCommitmentCalendarMonth((currentMonth) => currentMonth.clone().add(1, 'month'))}
                    aria-label="Next month"
                  >
                    <i className="ti ti-chevron-right" />
                  </Button>
                </Stack>
                {isLoading || isLoadingCommitment ? (
                  <LoaderData />
                ) : (
                  <div className="overflow-auto">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(135px, 1fr))', minWidth: 945 }}>
                      {moment.weekdaysShort().map((dayName) => (
                        <div key={dayName} className="border-bottom border-end bg-light text-center text-muted fw-semibold p-2">
                          {dayName}
                        </div>
                      ))}
                      {commitmentCalendarDays.map(({ date: calendarDate, orders: calendarOrders }) => {
                        const isCurrentMonth = calendarDate.isSame(commitmentCalendarMonth, 'month');
                        const isToday = calendarDate.isSame(moment(), 'day');
                        const visibleCalendarOrders = calendarOrders.slice(0, 2);
                        const hiddenCalendarOrderCount = Math.max(calendarOrders.length - visibleCalendarOrders.length, 0);
                        const canCreateCmoOnDate = isCurrentMonth;
                        const isEmptyCreateDate = canCreateCmoOnDate && calendarOrders.length === 0;
                        const createCmoForDate = () => {
                          if (canCreateCmoOnDate) {
                            navigate(`/customer-portal/order/cmo-create?date=${calendarDate.format('YYYY-MM-DD')}`);
                          }
                        };

                        return (
                          <div
                            key={calendarDate.format('YYYY-MM-DD')}
                            className={`border-end border-bottom p-2 ${isCurrentMonth ? 'bg-white' : 'bg-light'} ${
                              isEmptyCreateDate ? 'cursor-pointer' : ''
                            } ${cmoDropDate === calendarDate.format('YYYY-MM-DD') ? 'bg-light-primary border-primary' : ''}`}
                            style={{ minHeight: 130, cursor: isEmptyCreateDate ? 'pointer' : 'default' }}
                            role={isEmptyCreateDate ? 'button' : undefined}
                            tabIndex={isEmptyCreateDate ? 0 : undefined}
                            aria-label={isEmptyCreateDate ? `Add CMO on ${calendarDate.format('DD MMMM YYYY')}` : undefined}
                            onClick={isEmptyCreateDate ? createCmoForDate : undefined}
                            onDragOver={(event) => {
                              if (!isCurrentMonth || movingCmoId !== null) return;

                              event.preventDefault();
                              event.dataTransfer.dropEffect = 'move';
                              setCmoDropDate(calendarDate.format('YYYY-MM-DD'));
                            }}
                            onDragLeave={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget)) setCmoDropDate('');
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const orderId = event.dataTransfer.getData('text/plain') || draggedCmoId;

                              if (isCurrentMonth && orderId) handleMoveCmo(orderId, calendarDate.format('YYYY-MM-DD'));
                            }}
                            onKeyDown={(event) => {
                              if (isEmptyCreateDate && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault();
                                createCmoForDate();
                              }
                            }}
                          >
                            <span
                              className={`d-inline-flex align-items-center justify-content-center rounded-circle f-12 mb-2 ${
                                isToday ? 'bg-primary text-white' : isCurrentMonth ? '' : 'text-muted'
                              }`}
                              style={{ width: 26, height: 26 }}
                            >
                              {calendarDate.date()}
                            </span>
                            <Stack gap={1}>
                              {visibleCalendarOrders.map((order) => {
                                const cmoStatusLabel = getCmoStatusLabel(order.status);

                                return (
                                  <OverlayTrigger
                                    key={order.id}
                                    placement="top"
                                    delay={{ show: 250, hide: 100 }}
                                    overlay={
                                      <Popover className="border shadow-sm">
                                        <Popover.Body className="bg-white rounded p-2" style={{ minWidth: 190 }}>
                                          <div className="fw-semibold mb-1">{order.depo || '-'}</div>
                                          <div className="text-muted small mb-2">{order.customer_name || order.customer_code || '-'}</div>
                                          <Stack direction="horizontal" gap={2} className="justify-content-between">
                                            <span className="small text-muted">Status</span>
                                            <Badge bg={cmoStatusVariant[normalizeStatus(order.status)] || 'secondary'}>
                                              {cmoStatusLabel}
                                            </Badge>
                                          </Stack>
                                        </Popover.Body>
                                      </Popover>
                                    }
                                  >
                                    <button
                                      type="button"
                                      className={`btn ${getCmoCalendarButtonClass(order.status)} text-start w-100 px-1 py-1`}
                                      style={{ fontSize: 10, lineHeight: 1.15, cursor: movingCmoId === order.id ? 'wait' : 'grab' }}
                                      draggable={movingCmoId === null}
                                      disabled={String(movingCmoId) === String(order.id)}
                                      onDragStart={(event) => {
                                        event.dataTransfer.effectAllowed = 'move';
                                        event.dataTransfer.setData('text/plain', String(order.id));
                                        setDraggedCmoId(order.id);
                                        setCmoActionMenu(null);
                                      }}
                                      onDragEnd={() => {
                                        setDraggedCmoId(null);
                                        setCmoDropDate('');
                                      }}
                                      onClick={(event) =>
                                        setCmoActionMenu((current) =>
                                          String(current?.order?.id) === String(order.id) ? null : { order, target: event.currentTarget }
                                        )
                                      }
                                    >
                                      <span className="d-flex align-items-center gap-1 fw-semibold">
                                        <i className={String(movingCmoId) === String(order.id) ? 'ti ti-loader-2' : 'ti ti-grip-vertical'} />
                                        <span className="text-truncate">{order.depo || '-'}</span>
                                      </span>
                                      <span className="d-block text-truncate">{order.customer_name || order.customer_code || '-'}</span>
                                      <span className="d-block text-truncate text-muted">{formatKg(getOrderTotalKg(order))}</span>
                                    </button>
                                  </OverlayTrigger>
                                );
                              })}
                              {hiddenCalendarOrderCount > 0 ? (
                                <Button
                                  size="sm"
                                  variant="light-primary"
                                  className="w-100 px-1 py-1 fw-semibold"
                                  style={{ fontSize: 10 }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedCmoCalendarDay({ date: calendarDate.clone(), orders: calendarOrders });
                                  }}
                                >
                                  <i className="ti ti-list-details me-1" />+{hiddenCalendarOrderCount} lainnya
                                </Button>
                              ) : null}
                              {canCreateCmoOnDate ? (
                                <button
                                  type="button"
                                  className="btn btn-link d-flex align-items-center justify-content-center gap-1 w-100 p-1 text-decoration-none"
                                  style={{ fontSize: 10 }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    createCmoForDate();
                                  }}
                                >
                                  <i className="ti ti-plus" />
                                  Add CMO
                                </button>
                              ) : null}
                            </Stack>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </MainCard>
        )}

        {!showOnlyCommitment && (
          <>
            <MainCard>
              {renderStatusFilterBoxes()}
              <Row className="g-2 align-items-end mb-3">
                <Col lg={3} md={6}>
                  <Form.Label className="f-12 text-muted">Search Order</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="ti ti-search" />
                    </InputGroup.Text>
                    <Form.Control value={keywords} onChange={(event) => setKeywords(event.target.value)} type="text" placeholder="No. PO" />
                  </InputGroup>
                </Col>
                <Col lg={3} md={6}>
                  <Form.Label className="f-12 text-muted">Customer Code</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    value={commitmentCustomerOptions.find((option) => option.value === distributor) || null}
                    options={commitmentCustomerOptions}
                    menuPosition="fixed"
                    isLoading={isLoadingCommitmentCustomers}
                    isDisabled={isLoadingCommitmentCustomers}
                    isClearable
                    isSearchable
                    placeholder="Select customer code..."
                    noOptionsMessage={() => 'Distributor not found'}
                    onChange={handleCustomerCodeChange}
                  />
                </Col>
                <Col lg={3} md={6}>
                  <Form.Label className="f-12 text-muted">Date</Form.Label>
                  <Form.Control value={date} onChange={(event) => setDate(event.target.value)} type="date" />
                </Col>
                <Col lg={1} md={12} className="text-lg-end">
                  <Button className="w-100" variant="light-primary" onClick={resetFilters}>
                    <i className="ti ti-refresh" />
                  </Button>
                </Col>
              </Row>

                {orderLayout === 'list' ? (
                <>
                  <Table className="mb-0 align-middle" responsive hover>
                <thead>
                  <tr>
                    <th>No. SO</th>
                    <th>Depo</th>
                    <th>Date</th>
                    <th>Total Item</th>
                    <th>Total Order</th>
                    <th>Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <tbody>
                    <tr>
                      <td colSpan={8}>
                        <LoaderData />
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {paginatedOrders.length > 0 ? (
                      paginatedOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="fw-semibold">{order.sap_doc_num ?? '-'}</td>
                          <td>
                            {order.depo} - {order.customer_name}
                          </td>
                          <td>{moment(order.doc_date).format('DD MMM YYYY')}</td>
                          <td>{getOrderLines(order).length}</td>
                          <td>{currency(order?.doc_total)}</td>
                          <td>
                            <Badge bg={statusVariant[order.status] || 'secondary'}>
                              {getStatusLabel(order.status)}
                              {order.status === 'DELIVERY' ? (
                                <>
                                  <br />
                                  {formatOrderDate(
                                    getOrderValue(order, [
                                      'actual_delivery_date',
                                      'actualDeliveryDate',
                                      'ActualDeliveryDate',
                                      'delivery_date'
                                    ])
                                  )}
                                </>
                              ) : null}
                            </Badge>
                          </td>
                          <td className="text-center">{getAccessAction(order)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8}>
                          <div className="text-center py-5">
                            <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                              <i className="ti ti-clipboard-list f-24" />
                            </div>
                            <h5 className="mb-1">{hasActiveFilter ? 'Order not found' : 'No orders yet'}</h5>
                            <p className="text-muted mb-3">
                              {hasActiveFilter
                                ? 'Change the filter or reset the search to view other data.'
                                : 'Start creating a new order to add distributor transactions.'}
                            </p>
                            {hasActiveFilter ? (
                              <Button variant="light-primary" onClick={resetFilters}>
                                Reset Filter
                              </Button>
                            ) : canCreateOrder ? (
                              <Button variant="primary" as={Link} to={`/customer-portal/order/order-create`}>
                                <i className="ti ti-plus me-1" />
                                Add Order
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                )}
                  </Table>

                  <TablePagination
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    pageCount={pageCount}
                    pageSize={pageSize}
                    total={filteredOrders.length}
                    itemLabel="order"
                  />
                </>
              ) : (
                <div className="border rounded overflow-hidden">
                  <Stack direction="horizontal" gap={2} className="justify-content-between border-bottom p-3 flex-wrap">
                    <Button
                      size="sm"
                      variant="light-primary"
                      onClick={() => setOrderCalendarMonth((currentMonth) => currentMonth.clone().subtract(1, 'month'))}
                      aria-label="Previous month"
                    >
                      <i className="ti ti-chevron-left" />
                    </Button>
                    <Stack direction="horizontal" gap={2}>
                      <h5 className="mb-0">{orderCalendarMonth.format('MMMM YYYY')}</h5>
                      <Button size="sm" variant="outline-primary" onClick={() => setOrderCalendarMonth(moment().startOf('month'))}>
                        Today
                      </Button>
                    </Stack>
                    <Button
                      size="sm"
                      variant="light-primary"
                      onClick={() => setOrderCalendarMonth((currentMonth) => currentMonth.clone().add(1, 'month'))}
                      aria-label="Next month"
                    >
                      <i className="ti ti-chevron-right" />
                    </Button>
                  </Stack>
                  {isLoading ? (
                    <LoaderData />
                  ) : (
                    <div className="overflow-auto">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(135px, 1fr))', minWidth: 945 }}>
                        {moment.weekdaysShort().map((dayName) => (
                          <div key={dayName} className="border-bottom border-end bg-light text-center text-muted fw-semibold p-2">
                            {dayName}
                          </div>
                        ))}
                        {orderCalendarDays.map(({ date: calendarDate, orders: calendarOrders }) => {
                          const isCurrentMonth = calendarDate.isSame(orderCalendarMonth, 'month');
                          const isToday = calendarDate.isSame(moment(), 'day');
                          const canCreateOrderOnDate = isCurrentMonth && canCreateOrder;
                          const createOrderForDate = () => {
                            if (canCreateOrderOnDate) {
                              navigate(`/customer-portal/order/order-create?date=${calendarDate.format('YYYY-MM-DD')}`);
                            }
                          };

                          return (
                            <div
                              key={calendarDate.format('YYYY-MM-DD')}
                              className={`border-end border-bottom p-2 ${isCurrentMonth ? 'bg-white' : 'bg-light'}`}
                              style={{ minHeight: 130 }}
                            >
                              <span
                                className={`d-inline-flex align-items-center justify-content-center rounded-circle f-12 mb-2 ${
                                  isToday ? 'bg-primary text-white' : isCurrentMonth ? '' : 'text-muted'
                                }`}
                                style={{ width: 26, height: 26 }}
                              >
                                {calendarDate.date()}
                              </span>
                              <Stack gap={1}>
                                {calendarOrders.map((order) => (
                                  <button
                                    key={order.id}
                                    type="button"
                                    className="btn btn-light-primary text-start w-100 px-1 py-1"
                                    style={{ fontSize: 10, lineHeight: 1.15 }}
                                    title={`${order.depo || '-'} - ${order.customer_name || '-'}`}
                                    onClick={(event) =>
                                      setOrderActionMenu((current) =>
                                        String(current?.order?.id) === String(order.id) ? null : { order, target: event.currentTarget }
                                      )
                                    }
                                  >
                                    <span className="d-block text-truncate fw-semibold">
                                      {order.sap_doc_num || order.order_no || 'Order'}
                                    </span>
                                    <span className="d-block text-truncate">{order.customer_name || order.customer_code || '-'}</span>
                                    <span className="d-block text-truncate text-muted">{getStatusLabel(order.status)}</span>
                                  </button>
                                ))}
                                {canCreateOrderOnDate ? (
                                  <button
                                    type="button"
                                    className="btn btn-link d-flex align-items-center justify-content-center gap-1 w-100 p-1 text-decoration-none"
                                    style={{ fontSize: 10 }}
                                    onClick={createOrderForDate}
                                  >
                                    <i className="ti ti-plus" />
                                    Add Order
                                  </button>
                                ) : null}
                              </Stack>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </MainCard>
          </>
        )}
      </Stack>
      <Overlay
        show={Boolean(orderActionMenu)}
        target={orderActionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        popperConfig={cmoActionPopperConfig}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setOrderActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const order = orderActionMenu?.order;
          const button = order ? getButtonVisibility(order) : {};
          const normalizedOrderStatus = normalizeStatus(order?.status);
          const canDownloadPdf =
            hasAction('download') && ['ORDER_APPROVED', 'APPROVED', 'DELIVERY', 'ARRIVED'].includes(normalizedOrderStatus);
          const canCancel = hasAction('delete') && ['ORDER_APPROVED', 'APPROVED'].includes(normalizedOrderStatus);
          const canViewAttachment = hasAction('download') && Boolean(order?.id);

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 190 }}
            >
              {button.view ? (
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={loadingDetailId === order?.id}
                  onClick={() => {
                    setOrderActionMenu(null);
                    if (order) handleViewOrder(order);
                  }}
                >
                  <i className={loadingDetailId === order?.id ? 'ti ti-loader-2 text-primary me-2' : 'ti ti-eye text-primary me-2'} />
                  Detail
                </button>
              ) : null}
              {button.edit ? (
                <Link
                  className="dropdown-item"
                  to={`/customer-portal/order/order-create/${order?.id}`}
                  onClick={() => setOrderActionMenu(null)}
                >
                  <i className="ti ti-pencil text-success me-2" />
                  Edit
                </Link>
              ) : null}
              {canViewAttachment ? (
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={downloadingAttachmentId === order?.id}
                  onClick={() => {
                    setOrderActionMenu(null);
                    if (order) handleViewAttachment(order);
                  }}
                >
                  <i
                    className={
                      downloadingAttachmentId === order?.id
                        ? 'ti ti-loader-2 text-primary me-2'
                        : 'ti ti-paperclip text-primary me-2'
                    }
                  />
                  Download Attachment
                </button>
              ) : null}
              {canDownloadPdf ? (
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={downloadingPdfId === order?.id}
                  onClick={() => {
                    setOrderActionMenu(null);
                    if (order) handleDownloadPdf(order);
                  }}
                >
                  <i
                    className={
                      downloadingPdfId === order?.id ? 'ti ti-loader-2 text-secondary me-2' : 'ti ti-file-type-pdf text-secondary me-2'
                    }
                  />
                  Download PI
                </button>
              ) : null}
              {canCancel ? (
                <>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    disabled={String(cancellingOrderId) === String(order?.id)}
                    onClick={() => {
                      setOrderActionMenu(null);
                      if (order) setOrderToCancel(order);
                    }}
                  >
                    <i className={String(cancellingOrderId) === String(order?.id) ? 'ti ti-loader-2 me-2' : 'ti ti-x me-2'} />
                    Cancel Order
                  </button>
                </>
              ) : null}
            </div>
          );
        }}
      </Overlay>
      <Overlay
        show={Boolean(cmoActionMenu)}
        target={cmoActionMenu?.target}
        placement={cmoActionMenu?.placement || 'top-end'}
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        popperConfig={cmoActionPopperConfig}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setCmoActionMenu(null)}
      >
        {({ ref, style, placement }) => (
          <div ref={ref} className="dropdown-menu show" data-popper-placement={placement} style={{ ...style, zIndex: 1080, minWidth: 190 }}>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                const order = cmoActionMenu?.order;
                setCmoActionMenu(null);
                setSelectedCmoCalendarDay(null);
                if (order) handleViewOrder(order);
              }}
            >
              <i className="ti ti-eye text-primary me-2" />
              Detail
            </button>
            <Link
              className="dropdown-item"
              to={`/customer-portal/order/cmo-create/${cmoActionMenu?.order?.id}`}
              onClick={() => {
                setCmoActionMenu(null);
                setSelectedCmoCalendarDay(null);
              }}
            >
              <i className="ti ti-pencil text-success me-2" />
              Edit
            </Link>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                const order = cmoActionMenu?.order;
                setCmoActionMenu(null);
                setSelectedCmoCalendarDay(null);
                if (order) navigate(`/customer-portal/order/cmo-create?duplicate=${order.id}`);
              }}
            >
              <i className="ti ti-copy text-info me-2" />
              Duplicate
            </button>
            <button
              type="button"
              className="dropdown-item"
              disabled={String(downloadingAttachmentId) === String(cmoActionMenu?.order?.id)}
              onClick={() => {
                const order = cmoActionMenu?.order;
                setCmoActionMenu(null);
                setSelectedCmoCalendarDay(null);
                if (order) handleViewAttachment(order, true);
              }}
            >
              <i
                className={
                  String(downloadingAttachmentId) === String(cmoActionMenu?.order?.id)
                    ? 'ti ti-loader-2 text-primary me-2'
                    : 'ti ti-paperclip text-primary me-2'
                }
              />
              Download Attachment
            </button>
            <button
              type="button"
              className="dropdown-item"
              disabled={String(processingCmoId) === String(cmoActionMenu?.order?.id)}
              onClick={() => {
                const order = cmoActionMenu?.order;
                setCmoActionMenu(null);
                setSelectedCmoCalendarDay(null);
                if (order) openProcessCmoModal(order);
              }}
            >
              <i
                className={
                  String(processingCmoId) === String(cmoActionMenu?.order?.id)
                    ? 'ti ti-loader-2 text-success me-2'
                    : 'ti ti-send text-success me-2'
                }
              />
              Process
            </button>
            <div className="dropdown-divider" />
            <button
              type="button"
              className="dropdown-item text-danger"
              disabled={String(deletingCmoId) === String(cmoActionMenu?.order?.id)}
              onClick={() => {
                const order = cmoActionMenu?.order;
                setCmoActionMenu(null);
                setSelectedCmoCalendarDay(null);
                if (order) setCommitmentOrderToDelete(order);
              }}
            >
              <i className={String(deletingCmoId) === String(cmoActionMenu?.order?.id) ? 'ti ti-loader-2 me-2' : 'ti ti-trash me-2'} />
              Delete
            </button>
          </div>
        )}
      </Overlay>
      <Modal
        show={Boolean(selectedCmoCalendarDay)}
        onHide={() => setSelectedCmoCalendarDay(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <div>
            <Modal.Title>CMO pada {selectedCmoCalendarDay?.date?.format('DD MMMM YYYY')}</Modal.Title>
            <div className="text-muted f-12 mt-1">
              {selectedCmoCalendarDay?.orders?.length || 0} data CMO pada tanggal ini
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="bg-light">
          <Stack gap={2}>
            {(selectedCmoCalendarDay?.orders || []).map((order) => {
              const cmoStatusLabel = getCmoStatusLabel(order.status);

              return (
                <Card key={order.id} className="border mb-0 shadow-none">
                  <Card.Body className="p-3">
                    <Stack direction="horizontal" gap={3} className="justify-content-between align-items-center flex-wrap">
                      <div className="flex-grow-1">
                        <Stack direction="horizontal" gap={2} className="align-items-center flex-wrap mb-1">
                          <span className="fw-semibold">{order.depo || '-'}</span>
                          <Badge bg={cmoStatusVariant[normalizeStatus(order.status)] || 'secondary'}>{cmoStatusLabel}</Badge>
                        </Stack>
                        <div className="text-muted f-12">{order.customer_name || order.customer_code || '-'}</div>
                        <div className="f-12 mt-1">
                          <i className="ti ti-weight me-1 text-primary" />
                          {formatKg(getOrderTotalKg(order))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={String(cmoActionMenu?.order?.id) === String(order.id) ? 'primary' : 'outline-primary'}
                        aria-label="Open CMO actions"
                        aria-expanded={String(cmoActionMenu?.order?.id) === String(order.id)}
                        onClick={(event) =>
                          setCmoActionMenu((current) =>
                            String(current?.order?.id) === String(order.id)
                              ? null
                              : { order, target: event.currentTarget, placement: 'left-start' }
                          )
                        }
                      >
                        <i className="ti ti-dots-vertical me-1" />
                        Actions
                        <i className="ti ti-chevron-down ms-1" />
                      </Button>
                    </Stack>
                  </Card.Body>
                </Card>
              );
            })}
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedCmoCalendarDay(null)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
      {showOnlyCommitment && (
        <>
          <Modal
            show={showDuplicateMonthModal}
            onHide={() => !duplicatingMonth && setShowDuplicateMonthModal(false)}
            centered
            backdrop={duplicatingMonth ? 'static' : true}
          >
            <Modal.Header closeButton={!duplicatingMonth}>
              <Modal.Title>Duplicate Monthly CMO</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="text-muted">
                Copy all CMO data, including customer and product items, from the source month into the target month as new Draft CMO.
              </p>
              <Row className="g-3">
                <Col sm={6}>
                  <Form.Label>Source Month</Form.Label>
                  <Form.Control
                    type="month"
                    value={duplicateMonthForm.sourceMonth}
                    disabled={duplicatingMonth}
                    onChange={(event) => setDuplicateMonthForm((current) => ({ ...current, sourceMonth: event.target.value }))}
                  />
                </Col>
                <Col sm={6}>
                  <Form.Label>Target Month</Form.Label>
                  <Form.Control
                    type="month"
                    value={duplicateMonthForm.targetMonth}
                    disabled={duplicatingMonth}
                    onChange={(event) => setDuplicateMonthForm((current) => ({ ...current, targetMonth: event.target.value }))}
                  />
                </Col>
              </Row>
              {duplicateMonthProgress.total > 0 ? (
                <div className="mt-4">
                  <Stack direction="horizontal" className="justify-content-between mb-2">
                    <span className="small text-muted">Duplicating CMO...</span>
                    <span className="small fw-semibold">
                      {duplicateMonthProgress.completed}/{duplicateMonthProgress.total}
                    </span>
                  </Stack>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={duplicateMonthProgress.completed}
                    aria-valuemin={0}
                    aria-valuemax={duplicateMonthProgress.total}
                  >
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      style={{ width: `${(duplicateMonthProgress.completed / duplicateMonthProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light-secondary" disabled={duplicatingMonth} onClick={() => setShowDuplicateMonthModal(false)}>
                Cancel
              </Button>
              <Button
                variant="info"
                disabled={duplicatingMonth || !duplicateMonthForm.sourceMonth || !duplicateMonthForm.targetMonth}
                onClick={handleDuplicateCmoMonth}
              >
                {duplicatingMonth ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Duplicating...
                  </>
                ) : (
                  <>
                    <i className="ti ti-calendar-copy me-1" />
                    Duplicate Month
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal>
          <Modal show={Boolean(duplicateCmoSource)} onHide={closeDuplicateCmoModal} size="xl" centered scrollable>
            <Modal.Header closeButton={!loadingDuplicateCmo && !savingDuplicateCmo}>
              <Modal.Title>Duplicate Commitment Monthly Order</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {loadingDuplicateCmo ? (
                <LoaderData />
              ) : duplicateCmoForm ? (
                <>
                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Customer</Form.Label>
                      <Form.Control
                        readOnly
                        value={[duplicateCmoForm.customerCode, duplicateCmoForm.customerName].filter(Boolean).join(' - ')}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">PO Number</Form.Label>
                      <Form.Control
                        value={duplicateCmoForm.poNumber}
                        onChange={handleDuplicateCmoChange('poNumber')}
                        placeholder="Enter a new PO number"
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                      <Form.Control type="date" value={duplicateCmoForm.docDate} onChange={handleDuplicateCmoChange('docDate')} />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">ETA Date</Form.Label>
                      <Form.Control
                        type="date"
                        min={duplicateCmoForm.docDate || undefined}
                        value={duplicateCmoForm.etaDate}
                        onChange={handleDuplicateCmoChange('etaDate')}
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Label className="f-12 text-muted">Comments</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={duplicateCmoForm.comments}
                        onChange={handleDuplicateCmoChange('comments')}
                        placeholder="Enter comments"
                      />
                    </Col>
                  </Row>

                  <h6 className="mb-3">CMO Items</h6>
                  <Table className="mb-0 align-middle" responsive bordered hover>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Product</th>
                        <th style={{ minWidth: 130 }}>Quantity</th>
                        <th>UOM</th>
                        <th>Warehouse</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicateCmoForm.lines.length ? (
                        duplicateCmoForm.lines.map((line, index) => (
                          <tr key={`${line.id}-${line.itemCode}-${index}`}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="fw-semibold">{line.itemCode || '-'}</div>
                              <div className="text-muted f-12">{line.itemName || '-'}</div>
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                min={0.0001}
                                step="any"
                                value={line.quantity}
                                onChange={(event) => handleDuplicateCmoQuantityChange(index, event.target.value)}
                              />
                            </td>
                            <td>{line.unitMsr || '-'}</td>
                            <td>{line.whsCode || '-'}</td>
                            <td className="text-end">{currency(line.unitPrice)}</td>
                            <td className="text-end fw-semibold">
                              {currency((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-4">
                            No CMO item data found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={6} className="text-end">
                          Total
                        </th>
                        <th className="text-end">
                          {currency(
                            duplicateCmoForm.lines.reduce(
                              (total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
                              0
                            )
                          )}
                        </th>
                      </tr>
                    </tfoot>
                  </Table>
                </>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light-secondary" disabled={savingDuplicateCmo} onClick={closeDuplicateCmoModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={loadingDuplicateCmo || savingDuplicateCmo || !duplicateCmoForm?.lines.length}
                onClick={handleSaveDuplicateCmo}
              >
                {savingDuplicateCmo ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="ti ti-copy-plus me-1" />
                    Save as New CMO
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal>
          <Modal show={Boolean(commitmentOrderToSend)} onHide={closeProcessCmoModal} centered>
            <Modal.Header closeButton={processingCmoId === null}>
              <Modal.Title>Process Commitment Monthly Order</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Delivery Date</Form.Label>
                <Form.Control
                  type="date"
                  value={commitmentDeliveryDate}
                  min={moment().format('YYYY-MM-DD')}
                  disabled={processingCmoId !== null}
                  onChange={(event) => setCommitmentDeliveryDate(event.target.value)}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="danger" disabled={processingCmoId !== null} onClick={closeProcessCmoModal}>
                Cancel
              </Button>
              <Button variant="success" disabled={processingCmoId !== null || !commitmentDeliveryDate} onClick={handleProcessCmo}>
                <i className={processingCmoId !== null ? 'ti ti-loader-2 me-1' : 'ti ti-send me-1'} />
                {processingCmoId !== null ? 'Processing...' : 'Process'}
              </Button>
            </Modal.Footer>
          </Modal>
          <Modal show={Boolean(commitmentOrderToDelete)} onHide={() => !deletingCmoId && setCommitmentOrderToDelete(null)} centered>
            <Modal.Header closeButton={!deletingCmoId}>
              <Modal.Title>Delete CMO</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-0">
                Are you sure you want to delete this CMO for{' '}
                <strong>{commitmentOrderToDelete?.customer_name || commitmentOrderToDelete?.customer_code || '-'}</strong>? This action
                cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" disabled={Boolean(deletingCmoId)} onClick={() => setCommitmentOrderToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={Boolean(deletingCmoId)} onClick={handleDeleteCmo}>
                <i className={deletingCmoId ? 'ti ti-loader-2 me-1' : 'ti ti-trash me-1'} />
                {deletingCmoId ? 'Deleting...' : 'Delete CMO'}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
      <Modal show={Boolean(orderToCancel)} onHide={() => !cancellingOrderId && setOrderToCancel(null)} centered>
        <Modal.Header closeButton={!cancellingOrderId}>
          <Modal.Title>Cancel Sales Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Are you sure you want to cancel sales order <strong>{orderToCancel?.sap_doc_num || orderToCancel?.order_no || '-'}</strong>?
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" disabled={Boolean(cancellingOrderId)} onClick={() => setOrderToCancel(null)}>
            Back
          </Button>
          <Button variant="danger" disabled={Boolean(cancellingOrderId)} onClick={handleCancelOrder}>
            <i className={cancellingOrderId ? 'ti ti-loader-2 me-1' : 'ti ti-x me-1'} />
            {cancellingOrderId ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal className="sm-order-detail-modal" show={Boolean(selectedOrderDetail)} onHide={closeDetailModal} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Order Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrderDetail ? (
            <Stack gap={3}>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">No. Order</Form.Label>
                  <div className="fw-semibold">{getOrderValue(selectedOrderDetail, ['sap_doc_num'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">No. PO</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['po_number', 'num_at_card', 'numAtCard'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Status</Form.Label>
                  <div>
                    <Badge bg={statusVariant[selectedOrderDetail.status] || 'secondary'}>
                      {getStatusLabel(getOrderValue(selectedOrderDetail, ['status']))}
                    </Badge>
                  </div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Customer</Form.Label>
                  <div className="fw-semibold">{getOrderValue(selectedOrderDetail, ['card_code', 'cardCode', 'customer_code'])}</div>
                  <div>{getOrderValue(selectedOrderDetail, ['customer_name', 'card_name', 'CardName'])}</div>
                  <div>{getOrderValue(selectedOrderDetail, ['depo'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                  <div>{formatOrderDate(getOrderValue(selectedOrderDetail, ['doc_date', 'docDate'], ''))}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Requested Delivery Date</Form.Label>
                  <div>{formatOrderDate(getOrderValue(selectedOrderDetail, ['doc_due_date', 'docDueDate'], ''))}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">ETA Date</Form.Label>
                  <div>{formatOrderDate(getOrderValue(selectedOrderDetail, ['eta_date', 'etaDate', 'ETA', 'u_eta', 'U_ETA'], ''))}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Delivery Date</Form.Label>
                  <div>
                    {formatOrderDate(
                      getOrderValue(
                        selectedOrderDetail,
                        ['actual_delivery_date', 'actualDeliveryDate', 'ActualDeliveryDate', 'delivery_date'],
                        ''
                      )
                    )}
                  </div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Series Name</Form.Label>
                  <div>{selectedOrderDetail?.series ? getOrderValue(selectedOrderDetail, seriesNameKeys) : '-'}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Sales</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['sales_employee_name', 'sales_employee_name'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Billing Address</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['address', 'bill_to_address', 'Address'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Shipping Address</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['address2', 'ship_to_address', 'Address2'])}</div>
                </Col>
                <Col md={12}>
                  <Form.Label className="f-12 text-muted">Notes</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['comments', 'Comments'])}</div>
                </Col>
              </Row>

              <Table className="mb-0 align-middle" responsive hover>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Qty</th>
                    <th>Unit</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Total</th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {getOrderLines(selectedOrderDetail).length > 0 ? (
                    getOrderLines(selectedOrderDetail).map((line, index) => (
                      <tr key={line.id || line.item_code || index}>
                        <td>
                          <div className="fw-semibold">{getOrderValue(line, ['item_code', 'itemCode', 'ItemCode'])}</div>
                          <div className="text-muted f-12">
                            {getOrderValue(line, ['item_name', 'itemName', 'Dscription', 'description'])}
                          </div>
                        </td>
                        <td className="text-end">{Math.round(getOrderValue(line, ['quantity', 'qty', 'Quantity'], 0))}</td>
                        <td>{getOrderValue(line, ['unit_msr', 'unitMsr', 'uom_code', 'UomCode'])}</td>
                        <td className="text-end">{currency(getOrderValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], 0))}</td>
                        <td className="text-end">{currency(getOrderValue(line, ['line_total', 'lineTotal', 'LineTotal'], 0))}</td>
                        <td>{getOrderValue(line, ['whs_code', 'warehouse_code', 'WhsCode'])}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Item details are not available
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <h6 className="mb-1">Discount Detail</h6>
                      <small className="text-muted">List of discounts applied to the order.</small>
                    </div>
                    <Badge bg={selectedSapDiscounts.length ? 'primary' : 'secondary'}>{selectedSapDiscounts.length} discount</Badge>
                  </Stack>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table className="mb-0 align-middle" responsive hover>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 220 }}>Discount Name</th>
                        <th className="text-end" style={{ minWidth: 160 }}>
                          Amount Discount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSapDiscounts.length ? (
                        selectedSapDiscounts.map((discount, index) => {
                          const discountType = getOrderValue(discount, ['type_discount', 'type', 'discountType', 'Type'], '-');
                          const discountPercent = getOrderValue(
                            discount,
                            ['discount_percent', 'percentage', 'percent', 'rate', 'DiscountPercent'],
                            ''
                          );
                          const discountValue = getOrderValue(discount, ['discount_value', 'value', 'DiscountValue'], '');
                          const discountAmount = getOrderValue(
                            discount,
                            ['discount_amount', 'amount', 'discount_sum', 'DiscountSum', 'total_discount'],
                            0
                          );

                          return (
                            <tr key={discount.id || discount.discount_code || discount.code || index}>
                              <td>
                                <Badge bg="light-primary">{discountType}</Badge>
                              </td>
                              <td className="text-end fw-semibold">{currency(discountAmount)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            Discount details are not available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
                <Card.Footer className="text-end bg-white">
                  <span className="text-muted me-2">Total Discount</span>
                  <span className="fw-semibold text-primary">{currency(selectedOrderDiscountTotal)}</span>
                </Card.Footer>
              </Card>

              <Row className="g-3 justify-content-end">
                <Col md={4}>
                  <div className="border rounded p-3 h-100 text-end">
                    <div className="text-muted f-12 mb-1">Total Order</div>
                    <div className="fw-semibold">{currency(selectedOrderTotal)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="border rounded p-3 h-100 text-end">
                    <div className="text-muted f-12 mb-1">Total Discount</div>
                    <div className="fw-semibold text-danger">- {currency(selectedOrderDiscountTotal)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="border border-primary rounded p-3 h-100 text-end bg-light-primary">
                    <div className="text-muted f-12 mb-1">Grand Total</div>
                    <h5 className="mb-0 text-primary">{currency(selectedOrderGrandTotal)}</h5>
                  </div>
                </Col>
              </Row>
              {canShowSelectedApprovalAction || canShowCreditLimitInfo ? (
                <>
                  {canShowSelectedApprovalAction ? (
                    <Form.Group>
                      <Form.Label className="f-12 text-muted">Notes Approval</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={approvalNotes}
                        onChange={(event) => setApprovalNotes(event.target.value)}
                        placeholder="Add approval or rejection notes"
                      />
                    </Form.Group>
                  ) : null}

                  {canShowCreditLimitInfo ? (
                    <Card className="border border-primary mb-0">
                      <Card.Body>
                        {isLoadingCreditLimit ? (
                          <div className="text-muted mb-3">
                            <i className="ti ti-loader-2 me-1" />
                            Mengambil data limit kredit...
                          </div>
                        ) : null}
                        {creditLimitError ? (
                          <div className="text-danger mb-3">
                            <i className="ti ti-alert-circle me-1" />
                            {creditLimitError}
                          </div>
                        ) : null}
                        {selectedCreditRemaining !== '' ? (
                          <div className="text-end">
                            <div className="text-muted f-12 mb-1">Sisa Limit Kredit</div>
                            <h4 className={`mb-0 ${selectedCreditRemaining > 0 ? 'text-success' : 'text-danger'}`}>
                              {formatCreditAmount(selectedCreditRemaining)}
                            </h4>
                          </div>
                        ) : null}
                      </Card.Body>
                    </Card>
                  ) : null}
                </>
              ) : null}
            </Stack>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {canShowSelectedApprovalAction ? (
            <>
              <Button variant="outline-danger" disabled={Boolean(approvalLoadingAction)} onClick={handleRejectOrder}>
                <i className={approvalLoadingAction === 'reject' ? 'ti ti-loader-2 me-1' : 'ti ti-x me-1'} />
                Reject
              </Button>
              <Button
                variant="success"
                disabled={Boolean(approvalLoadingAction) || !nextSelectedApprovalStatus}
                onClick={handleApproveOrder}
              >
                <i className={approvalLoadingAction === 'approve' ? 'ti ti-loader-2 me-1' : 'ti ti-check me-1'} />
                Approve
              </Button>
            </>
          ) : null}
          <Button variant="light-secondary" onClick={closeDetailModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
