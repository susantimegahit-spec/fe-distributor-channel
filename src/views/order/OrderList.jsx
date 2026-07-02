import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import OrderServices from '../../services/OrderServices';
import LoaderData from '../../components/LoaderData';
import { currency } from '../../utils/global';
import { getCookies } from '../../utils/cookies';
import { useAlert } from '../../utils/alertContext';
import { downloadSalesOrderPdf } from '../../utils/orderPdf';
import RoleServices from '../../services/RoleServices';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'WAITING_OM', label: 'Waiting OM' },
  { value: 'WAITING_ASM', label: 'Waiting ASM' },
  { value: 'WAITING_ADMIN_SALES', label: 'Waiting Admin Sales' },
  { value: 'WAITING_FINANCE', label: 'Waiting Finance' },
  // { value: 'WAITING_APPROVAL', label: 'Waiting Approval SM' },
  { value: 'ORDER_APPROVED', label: 'Order Approved' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'ARRIVED', label: 'Arrived' },
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
  REJECTED: 'orange',
  FAILED: 'danger'
};

const pageSize = 10;

const actionAliases = {
  view: ['view', 'read', 'show', 'detail', 'lihat'],
  create: ['create', 'add', 'store', 'insert', 'tambah'],
  edit: ['edit', 'update', 'ubah'],
  delete: ['delete', 'remove', 'destroy', 'hapus'],
  download: ['download', 'export', 'pdf', 'print', 'unduh'],
  attachment: ['attachment', 'document', 'file', 'lampiran']
};

const normalizeAction = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

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

export default function OrderList() {
  const roleId = getCookies('role');
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [distributor, setDistributor] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [approvalLoadingAction, setApprovalLoadingAction] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [isLoadingCreditLimit, setIsLoadingCreditLimit] = useState(false);
  const [creditLimitError, setCreditLimitError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [permissionDetail, setPermissionDetail] = useState(null);
  const [isDefaultStatusApplied, setIsDefaultStatusApplied] = useState(false);

  useEffect(() => {
    fetchData();
    getPermissionDetail();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, distributor, keywords, status]);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keywords.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword = !normalizedKeyword || order.order_no?.toLowerCase().includes(normalizedKeyword);
      // ||order.distributor?.toLowerCase().includes(normalizedKeyword);
      const matchesDistributor = !distributor || order.distributorId === distributor;
      const matchesStatus = !status || order.status === status;
      const matchesDate = !date || order.date === date;

      return matchesKeyword && matchesDistributor && matchesStatus && matchesDate;
    });
  }, [date, distributor, keywords, orders, status]);

  const selectedStatusOption = useMemo(() => statusOptions.find((item) => item.value === status), [status]);

  const summary = useMemo(
    () => ({
      total: filteredOrders.length,
      DRAFT: filteredOrders.filter((order) => order.status === 'DRAFT').length,
      APPROVED: filteredOrders.filter((order) => ['APPROVED', 'ORDER_APPROVED', 'DELIVERY', 'ARRIVED'].includes(order.status)).length,
      WAITING_APPROVAL: filteredOrders.filter((order) => String(order.status).startsWith('WAITING_')).length,
      REJECTED: filteredOrders.filter((order) => order.status === 'REJECTED').length,
      FAILED: filteredOrders.filter((order) => order.status === 'FAILED').length
      // waiti: orders.filter((order) => order.status === 'rejected').length
    }),
    [filteredOrders]
  );

  const summaryLabels = useMemo(
    () => ({
      DRAFT: status === 'DRAFT' ? selectedStatusOption?.label || 'Draft' : 'Draft',
      WAITING_APPROVAL: String(status).startsWith('WAITING_') ? selectedStatusOption?.label || 'Waiting' : 'Waiting',
      APPROVED: ['APPROVED', 'ORDER_APPROVED', 'DELIVERY', 'ARRIVED'].includes(status)
        ? selectedStatusOption?.label || 'Approved'
        : 'Approved',
      REJECTED: status === 'REJECTED' ? selectedStatusOption?.label || 'Rejected' : 'Rejected',
      FAILED: status === 'FAILED' ? selectedStatusOption?.label || 'Failed' : 'Failed'
    }),
    [selectedStatusOption?.label, status]
  );

  const hasActiveFilter = Boolean(keywords || distributor || status || date);
  const pageCount = Math.max(Math.ceil(filteredOrders.length / pageSize), 1);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredOrders]);

  const resetFilters = () => {
    setKeywords('');
    setDistributor('');
    setStatus('');
    setDate('');
    fetchData();
  };

  const extractOrderList = (response) => {
    const payload = response?.data?.data ?? response?.data;

    if (Array.isArray(payload)) return payload;

    const nestedPayload =
      payload?.orders || payload?.sales_orders || payload?.salesOrders || payload?.items || payload?.result || payload?.data;

    if (Array.isArray(nestedPayload)) return nestedPayload;

    return null;
  };

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const resp = await OrderServices.getListOrder();
      const nextOrders = extractOrderList(resp);

      if (resp.data.success && nextOrders) {
        setOrders(nextOrders);
      } else {
        showAlert(resp?.data?.message || 'Failed to fetch order data', 'danger');
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
          setCurrentPage(1);
        } else {
          await fetchData();
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
    slp_code: getOrderValue(order, ['slp_code', 'slpCode', 'SlpCode'], ''),
    cntct: getOrderValue(order, ['cntct', 'cnctCode', 'contact_name', 'customer_name', 'CardName'], ''),
    pay_to_code: getOrderValue(order, ['pay_to_code', 'payToCode', 'address_code', 'PayToCode'], ''),
    address: getOrderValue(order, ['address', 'bill_to_address', 'Address'], ''),
    ship_to_code: getOrderValue(order, ['ship_to_code', 'shipToCode', 'address2_code', 'ShipToCode'], ''),
    address2: getOrderValue(order, ['address2', 'ship_to_address', 'Address2'], ''),
    comments: getOrderValue(order, ['comments', 'Comments'], ''),
    series: getOrderValue(order, seriesValueKeys, ''),
    series_name: getOrderValue(order, seriesDisplayKeys, ''),
    status: nextStatus,
    action: actionName,
    notes: approvalNotes,
    id_discount: getOrderValue(order, ['id_discount', 'idDiscount'], ''),
    approval_id: permissionDetail?.role_menu?.approval_id,
    DocTotal: getOrderValue(order, ['DocTotal'], ''),
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

  const openAttachment = (attachment) => {
    const attachmentUrl = getAttachmentUrl(attachment);

    if (!attachmentUrl) {
      showAlert('URL lampiran tidak ditemukan', 'danger');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = attachmentUrl;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleViewAttachment = async (order) => {
    setDownloadingAttachmentId(order.id);

    try {
      let attachments = getOrderAttachments(order);

      if (!attachments.length) {
        const response = await OrderServices.getDetailOrder(order.id);

        if (response?.data?.success) {
          attachments = getOrderAttachments(response.data.data);
        }
      }

      if (!attachments.length) {
        showAlert('Order attachment is not available', 'warning');
        return;
      }

      openAttachment(attachments[0]);
    } catch (error) {
      showAlert(error?.message || 'Failed to open order attachment', 'danger');
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
      const response = await OrderServices.getDetailOrder(order.id);

      if (response?.data?.success) {
        const orderDetail = response.data.data;
        const shouldLoadCreditLimit =
          normalizeStatus(orderDetail?.status || order?.status) === 'WAITING_FINANCE' && (isAdministrator || isFinanceUser);
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
          setCreditLimitError('Customer code tidak ditemukan untuk mengambil limit kredit');
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
      showAlert('Status order tidak memiliki alur approve berikutnya', 'warning');
      return;
    }

    updateSelectedOrderStatus(nextStatus, 'approve');
  };

  const handleRejectOrder = () => {
    updateSelectedOrderStatus('DRAFT', 'reject');
  };

  const getPermissionDetail = async () => {
    const resp = await RoleServices.fetchRole(getCookies('role'));

    if (resp.data.success) {
      setPermissionDetail(resp.data.data);
    }
  };

  const getPermissionActionList = () => {
    let rawAction =
      permissionDetail?.role_menu?.approval?.action ||
      permissionDetail?.role_menu?.approval?.actions ||
      permissionDetail?.roleMenu?.approval?.action ||
      permissionDetail?.permissionDetail?.actionList ||
      permissionDetail?.actionList ||
      [];
    if (Number(roleId) === 5) {
      rawAction = 'view, edit, delete, add';
    }
    if (Array.isArray(rawAction)) {
      return rawAction
        .filter((item) => item?.allowed !== false && item?.is_allowed !== false)
        .map((item) => normalizeAction(item?.name || item?.action || item?.code || item?.value || item))
        .filter(Boolean);
    }

    return String(rawAction)
      .split(',')
      .map((item) => normalizeAction(item))
      .filter(Boolean);
  };

  const actionList = useMemo(() => getPermissionActionList(), [permissionDetail]);

  const permissionApprovalName = useMemo(
    () => (Number(roleId) === 5 ? 'ALL' : normalizeStatus(permissionDetail?.role_menu?.approval?.name)),
    [permissionDetail, roleId]
  );

  const roleName = useMemo(
    () => normalizeStatus(permissionDetail?.name || permissionDetail?.role?.name || permissionDetail?.role_name),
    [permissionDetail]
  );
  const isAdministrator = Number(roleId) === 5;
  const isFinanceUser = permissionApprovalName === 'WAITING_FINANCE' || roleName.includes('FINANCE');

  const defaultStatusByAccess = useMemo(() => {
    if (!permissionApprovalName || permissionApprovalName === 'ALL') return '';

    return statusOptions.some((item) => item.value === permissionApprovalName) ? permissionApprovalName : '';
  }, [permissionApprovalName]);

  useEffect(() => {
    if (isDefaultStatusApplied || !permissionDetail) return;

    setStatus(defaultStatusByAccess);
    setIsDefaultStatusApplied(true);
  }, [defaultStatusByAccess, isDefaultStatusApplied, permissionDetail]);

  const hasAction = (actionName) => {
    const aliases = actionAliases[actionName] || [actionName];

    return actionList.some((action) => aliases.some((alias) => action === alias || action.includes(alias)));
  };

  const canCreateOrder = hasAction('create');

  const isOrderStatusSameWithPermission = (order) =>
    (Boolean(permissionApprovalName) && normalizeStatus(order.status) === permissionApprovalName) || Number(roleId) === 5;

  const isOrderStatusAllowed = (order) => {
    if (!permissionApprovalName) return true;

    return isOrderStatusSameWithPermission(order);
  };

  const getButtonVisibility = (order) => {
    const view = hasAction('view');
    const isApprovedByFinance =
      order.status === 'ORDER_APPROVED' || order.status === 'APPROVED' || order.status === 'DELIVERY' || order.status === 'ARRIVED';

    if (!isOrderStatusAllowed(order)) {
      return {
        view,
        attachment: false,
        download: isApprovedByFinance,
        edit: false,
        delete: false
      };
    }

    return {
      view,
      attachment: hasAction('attachment') || hasAction('download'),
      download: hasAction('download') || isApprovedByFinance,
      edit: hasAction('edit') && order.status !== 'APPROVED' && order.status !== 'ARRIVED' && order.status !== 'ORDER_APPROVED',
      delete: hasAction('delete')
    };
  };

  const getAccessAction = (order) => {
    const button = getButtonVisibility(order);

    const hasVisibleButton = button.view || button.download || button.edit || button.delete;

    if (!hasVisibleButton) {
      return <span className="text-muted">-</span>;
    }

    return (
      <>
        {button.view ? (
          <>
            <Button
              className="rounded-circle"
              variant="outline-primary"
              size="sm"
              disabled={loadingDetailId === order.id}
              onClick={() => handleViewOrder(order)}
            >
              <i className={loadingDetailId === order.id ? 'ti ti-loader-2' : 'ti ti-eye'} />
            </Button>
            &nbsp;
          </>
        ) : null}
        {order.status === 'ORDER_APPROVED' ? (
          <>
            <Button
              className="rounded-circle"
              variant="outline-secondary"
              size="sm"
              disabled={downloadingPdfId === order.id}
              onClick={() => handleDownloadPdf(order)}
            >
              <i className={downloadingPdfId === order.id ? 'ti ti-loader-2' : 'ti ti-file-type-pdf'} />
            </Button>
            &nbsp;
          </>
        ) : null}
        {button.edit ? (
          <>
            <Button as={Link} to={`/customer-portal/order/order-create/${order.id}`} className="rounded-circle" variant="outline-success" size="sm">
              <i className="ti ti-pencil" />
            </Button>
            &nbsp;
          </>
        ) : null}
        {/* {button.delete ? (
          <Button className="rounded-circle" variant="outline-danger" size="sm">
            <i className="ti ti-trash" />
          </Button>
        ) : null} */}
      </>
    );
  };

  const canShowSelectedApprovalAction = selectedOrderDetail && isOrderStatusSameWithPermission(selectedOrderDetail);
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
    selectedOrderDetail && normalizeStatus(selectedOrderDetail.status) === 'WAITING_FINANCE' && (isAdministrator || isFinanceUser);
  const formatCreditAmount = (value) => (value !== undefined && value !== null && value !== '' ? currency(parseAmount(value)) : '-');

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Order List</h5>
              <span className="text-muted f-12">Monitor distributor orders and continue the sales process from one page.</span>
            </Stack>
          }
          secondary={
            <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-end">
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
        >
          <Row className="g-3">
            <Col sm={6} xl={2}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Order</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-shopping-cart" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={2}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">{summaryLabels.DRAFT}</div>
                      <h4 className="mb-0">{summary.DRAFT}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-secondary text-secondary">
                      <i className="ti ti-clipboard-list" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={2}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">{summaryLabels.WAITING_APPROVAL}</div>
                      <h4 className="mb-0">{summary.WAITING_APPROVAL}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-warning text-warning">
                      <i className="ti ti-clock-hour-4" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={2}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">{summaryLabels.APPROVED}</div>
                      <h4 className="mb-0">{summary.APPROVED}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-user-check" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={2}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">{summaryLabels.REJECTED}</div>
                      <h4 className="mb-0">{summary.REJECTED}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-orange text-orange">
                      <i className="ti ti-user-cancel" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={2}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">{summaryLabels.FAILED}</div>
                      <h4 className="mb-0">{summary.FAILED}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-danger text-danger">
                      <i className="ti ti-forbid" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </MainCard>

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={4} md={6}>
              <Form.Label className="f-12 text-muted">Search Order</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control value={keywords} onChange={(event) => setKeywords(event.target.value)} type="text" placeholder="No. PO" />
              </InputGroup>
            </Col>
            <Col lg={4} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Form.Select>
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

          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th>No. SO</th>
                <th>Depo</th>
                <th>Date</th>
                <th>Total Item</th>
                <th>Total Order</th>
                <th>Status</th>
                <th>Attachment</th>
                <th className="text-center">#</th>
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
                        <Badge bg={statusVariant[order.status] || 'secondary'}>{order.status.replace('_', ' ')}</Badge>
                      </td>
                      <td>
                        {getOrderAttachments(order).length > 0 ? (
                          <Button
                            variant="light-primary"
                            size="sm"
                            disabled={downloadingAttachmentId === order.id}
                            onClick={() => handleViewAttachment(order)}
                          >
                            <i className={downloadingAttachmentId === order.id ? 'ti ti-loader-2 me-1' : 'ti ti-paperclip me-1'} />
                            View Attachment
                          </Button>
                        ) : null}
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
                            : 'Mulai buat order baru untuk add transaksi distributor.'}
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
        </MainCard>
      </Stack>
      <Modal show={Boolean(selectedOrderDetail)} onHide={closeDetailModal} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Detail Order</Modal.Title>
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
                      {getOrderValue(selectedOrderDetail, ['status'])}
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
                  <Form.Label className="f-12 text-muted">Series Name</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, seriesNameKeys)}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Sales</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['sales_employee_name', 'sales_employee_name'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Alamat Tagih</Form.Label>
                  <div>{getOrderValue(selectedOrderDetail, ['address', 'bill_to_address', 'Address'])}</div>
                </Col>
                <Col md={4}>
                  <Form.Label className="f-12 text-muted">Alamat Kirim</Form.Label>
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
                    <th>Satuan</th>
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
                        Detail item tidak tersedia
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
                            Detail discount tidak tersedia
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
                    <div className="text-muted f-12 mb-1">Total Diskon</div>
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
