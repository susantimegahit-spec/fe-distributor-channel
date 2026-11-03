import { Fragment, useCallback, useEffect, useState } from 'react';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';

import PurchasingServices from '../../../../services/corporate/PurchasingServices';
import FormDatePicker from '../../../../components/FormDatePicker';
import TablePagination from '../../../../components/TablePagination';
import { useAlert } from '../../../../utils/alertContext';
import { useConfirm } from '../../../../utils/confirmContext';
import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';
import { createQuotationToken, getQuotationOffers } from '../../../../utils/publicQuotations';
import './purchase-quotation.scss';

const getValue = (item, keys, fallback = '') => {
  const value = keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && entry !== '');
  return value ?? fallback;
};

const formatQuantity = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity.toLocaleString('id-ID', { maximumFractionDigits: 6 }) : '-';
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 })
    : String(value);
};

const formatDisplayDate = (value) => {
  if (!value) return '-';
  const normalizedValue = String(value).trim();
  const compactDate = normalizedValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDate) return `${compactDate[3]}/${compactDate[2]}/${compactDate[1]}`;
  const isoDate = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  return normalizedValue;
};

const getList = (response) => {
  const root = response?.data?.data ?? response?.data ?? response ?? [];
  const payload = root.Result ?? root.result ?? root;
  const list = Array.isArray(payload) ? payload : (payload.data ?? payload.items ?? payload.rows ?? payload.results ?? []);
  return Array.isArray(list) ? list : [];
};

const getPagination = (response, fallbackPage = 1, fallbackPageSize = 15) => {
  const responseData = response?.data ?? {};
  const payload = responseData.data ?? responseData;
  const meta = payload.meta ?? responseData.meta ?? payload;
  const total = Number(meta.total ?? payload.total ?? 0);
  const perPage = Number(meta.per_page ?? meta.perPage ?? payload.per_page ?? fallbackPageSize) || fallbackPageSize;
  const currentPage = Number(meta.current_page ?? meta.currentPage ?? payload.current_page ?? fallbackPage) || fallbackPage;
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? payload.last_page ?? Math.max(1, Math.ceil(total / perPage))) || 1;
  return { total, perPage, currentPage, lastPage };
};

const getDetailPayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  const request =
    payload.header ??
    (Array.isArray(payload.Table1) ? payload.Table1[0] : null) ??
    payload.request ??
    payload.purchase_request ??
    payload.purchaseRequest ??
    payload;
  const lines =
    payload.items ??
    payload.Table2 ??
    payload.details ??
    payload.lines ??
    payload.Lines ??
    request.details ??
    request.lines ??
    request.Lines ??
    [];
  return { request, lines: Array.isArray(lines) ? lines : [] };
};

const getQuotationDetailPayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  const quotation = payload.quotation ?? payload.data ?? payload;
  const items = quotation.items ?? quotation.details ?? quotation.lines ?? payload.items ?? [];
  return { quotation, items: Array.isArray(items) ? items : [] };
};

const getQuotationOffersPayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? [];
  const offers = Array.isArray(payload)
    ? payload
    : (payload.offers ?? payload.data ?? payload.items ?? payload.rows ?? payload.results ?? []);
  return Array.isArray(offers) ? offers : [];
};

const getOfferItemKey = (item, fallback = '') =>
  String(getValue(item, ['itemCode', 'item_code', 'ItemCode', 'quotation_item_id', 'id'], fallback));

const getOfferComparisonMatrix = (offers, quotationItems = []) => {
  const itemMap = new Map(
    quotationItems.map((item, index) => [
      getOfferItemKey(item, `quotation-item-${index}`),
      {
        key: getOfferItemKey(item, `quotation-item-${index}`),
        itemCode: getValue(item, ['itemCode', 'item_code', 'ItemCode'], '-'),
        itemName: getValue(item, ['itemName', 'item_name', 'ItemName', 'description'], '-')
      }
    ])
  );

  const vendors = offers.map((offer, offerIndex) => {
    const vendor = offer.vendor ?? offer.supplier ?? {};
    const vendorData = { ...offer, ...vendor };
    const offerItems = offer.items ?? offer.details ?? offer.lines ?? [];
    const vendorCompany = getValue(
      vendorData,
      ['company', 'vendor_company', 'supplier_name', 'vendor_name', 'company_name'],
      `Supplier ${offerIndex + 1}`
    );

    const items = new Map();
    (Array.isArray(offerItems) ? offerItems : []).forEach((item, itemIndex) => {
      const itemKey = getOfferItemKey(item, `offer-${offerIndex}-item-${itemIndex}`);
      items.set(itemKey, item);
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          key: itemKey,
          itemCode: getValue(item, ['itemCode', 'item_code', 'ItemCode'], '-'),
          itemName: getValue(item, ['itemName', 'item_name', 'ItemName', 'description'], '-')
        });
      }
    });

    return {
      offer,
      offerIndex,
      vendorData,
      vendorCompany,
      items
    };
  });

  const items = [...itemMap.values()].sort((first, second) =>
    String(first.itemCode).localeCompare(String(second.itemCode), undefined, { numeric: true })
  );

  return { vendors, items };
};

const getRequestId = (request) => getValue(request, ['DocEntry', 'doc_entry', 'id', 'request_id', 'DraftEntry', 'draft_entry'], '');

const getRequestNumber = (request) => getValue(request, ['sap_doc_num', 'DocNum', 'doc_num', 'DraftNum', 'draft_num'], '-');

const getLineKey = (requestId, line, index) => `${requestId}:${getValue(line, ['id', 'line_id', 'LineNum', 'line_num'], index)}`;

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthFilters = () => {
  const currentDate = new Date();
  return {
    from: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)),
    to: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))
  };
};

const initialQuotationFilters = { search: '', status: '', from: '', to: '', per_page: 15 };

const getQuotationStatusClass = (status) => {
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (['OPEN', 'ACTIVE'].includes(normalizedStatus)) return 'is-open';
  if (['SUBMITTED', 'RESPONDED', 'OFFERED'].includes(normalizedStatus)) return 'is-submitted';
  if (['DRAFT', 'PENDING'].includes(normalizedStatus)) return 'is-draft';
  if (['CLOSED', 'COMPLETED'].includes(normalizedStatus)) return 'is-closed';
  if (['CANCELLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(normalizedStatus)) return 'is-cancelled';
  return 'is-other';
};

const getPublicBaseUrl = () => {
  const hostname = window.location.hostname.toLowerCase();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const configuredUrl = isLocal
    ? import.meta.env.VITE_BASE_URL_LOCAL
    : hostname.includes('dev')
      ? import.meta.env.VITE_BASE_URL_DEV
      : import.meta.env.VITE_BASE_URL_PROD;

  return (configuredUrl || window.location.origin).replace(/\/$/, '');
};

const getInitialQuotationForm = () => {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);
  return { title: '', notes: '', valid_until: formatLocalDate(validUntil) };
};

const normalizeApiDate = (value) => {
  if (!value) return '';
  const normalizedValue = String(value).trim();
  const compactDate = normalizedValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  return compactDate ? `${compactDate[1]}-${compactDate[2]}-${compactDate[3]}` : normalizedValue.slice(0, 10);
};

export default function PurchaseQuotation() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [expandedRequests, setExpandedRequests] = useState({});
  const [requestLines, setRequestLines] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [dateFilters, setDateFilters] = useState(getCurrentMonthFilters);
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(true);
  const [savingQuotation, setSavingQuotation] = useState(false);
  const [quotationForm, setQuotationForm] = useState(getInitialQuotationForm);
  const [copiedToken, setCopiedToken] = useState('');
  const [actionMenu, setActionMenu] = useState(null);
  const [quotationDetail, setQuotationDetail] = useState(null);
  const [quotationDetailItems, setQuotationDetailItems] = useState([]);
  const [quotationOffers, setQuotationOffers] = useState([]);
  const [quotationOffersError, setQuotationOffersError] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingQuotationDetail, setLoadingQuotationDetail] = useState(false);
  const [quotationFilters, setQuotationFilters] = useState(initialQuotationFilters);
  const [activeQuotationFilters, setActiveQuotationFilters] = useState(initialQuotationFilters);
  const [quotationPagination, setQuotationPagination] = useState({ total: 0, perPage: 15, currentPage: 1, lastPage: 1 });
  const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
  const publicBaseUrl = getPublicBaseUrl();
  const getOfferUrl = (token) => `${publicBaseUrl}${baseName}/quotation-offer/${token}`;
  const quotationOfferMatrix = getOfferComparisonMatrix(quotationOffers, quotationDetailItems);

  const loadQuotations = useCallback(
    async (page = 1, filters = initialQuotationFilters) => {
      setLoadingQuotations(true);
      try {
        const response = await PurchasingServices.getQuotations({ ...filters, page });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load quotations');
        setQuotations(getList(response));
        setQuotationPagination(getPagination(response, page, filters.per_page));
      } catch (error) {
        setQuotations([]);
        setQuotationPagination((current) => ({ ...current, total: 0, currentPage: page, lastPage: 1 }));
        showAlert(error?.response?.data?.message || error?.message || 'Failed to load quotations', 'danger');
      } finally {
        setLoadingQuotations(false);
      }
    },
    [showAlert]
  );

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const applyQuotationFilters = (event) => {
    event.preventDefault();
    const nextFilters = { ...quotationFilters, search: quotationFilters.search.trim() };
    setActiveQuotationFilters(nextFilters);
    loadQuotations(1, nextFilters);
  };

  const metrics = [
    { label: 'Draft Quotations', value: 0, variant: 'secondary', icon: 'ti ti-file-pencil' },
    { label: 'Open Quotations', value: quotations.length, variant: 'primary', icon: 'ti ti-file-dollar' },
    {
      label: 'Submitted',
      value: quotations.reduce(
        (total, quotation) =>
          total +
          Number(
            getValue(
              quotation,
              ['offers_count', 'offer_count', 'responses_count'],
              getQuotationOffers(getValue(quotation, ['id'], '')).length
            )
          ),
        0
      ),
      variant: 'warning',
      icon: 'ti ti-send'
    },
    { label: 'Completed', value: 0, variant: 'success', icon: 'ti ti-circle-check' }
  ];

  const loadRequests = async (filters = dateFilters) => {
    setLoadingRequests(true);
    setExpandedRequests({});
    setRequestLines({});
    try {
      const response = await PurchasingServices.getGeneratedPr({
        From: filters.from.replaceAll('-', ''),
        To: filters.to.replaceAll('-', '')
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load purchase requests');
      setRequests(getList(response));
    } catch (error) {
      setRequests([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load purchase requests', 'danger');
    } finally {
      setLoadingRequests(false);
    }
  };

  const openRequestModal = async () => {
    const monthFilters = getCurrentMonthFilters();
    setSelectedItems({});
    setQuotationForm(getInitialQuotationForm());
    setShowRequestModal(true);
    setDateFilters(monthFilters);
    await loadRequests(monthFilters);
  };

  const applyDateFilters = (event) => {
    event.preventDefault();
    loadRequests(dateFilters);
  };

  const resetDateFilters = () => {
    const monthFilters = getCurrentMonthFilters();
    setDateFilters(monthFilters);
    loadRequests(monthFilters);
  };

  const toggleRequest = async (request) => {
    const requestId = String(getRequestId(request));
    if (!requestId) return;

    if (expandedRequests[requestId]) {
      setExpandedRequests((current) => ({ ...current, [requestId]: false }));
      return;
    }

    setExpandedRequests((current) => ({ ...current, [requestId]: true }));
    if (requestLines[requestId]) return;

    setLoadingDetails((current) => ({ ...current, [requestId]: true }));
    try {
      const response = await PurchasingServices.getDetailPR(requestId);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load request details');
      const detail = getDetailPayload(response);
      setRequestLines((current) => ({ ...current, [requestId]: detail.lines }));
    } catch (error) {
      setExpandedRequests((current) => ({ ...current, [requestId]: false }));
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load request details', 'danger');
    } finally {
      setLoadingDetails((current) => ({ ...current, [requestId]: false }));
    }
  };

  const toggleItem = (request, line, index) => {
    const requestId = String(getRequestId(request));
    const key = getLineKey(requestId, line, index);
    setSelectedItems((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = { requestId, requestNumber: getRequestNumber(request), line };
      return next;
    });
  };

  const toggleAllRequestItems = (request, lines) => {
    const requestId = String(getRequestId(request));
    const lineEntries = lines.map((line, index) => ({ key: getLineKey(requestId, line, index), line }));
    const allSelected = lineEntries.length > 0 && lineEntries.every(({ key }) => Boolean(selectedItems[key]));

    setSelectedItems((current) => {
      const next = { ...current };
      lineEntries.forEach(({ key, line }) => {
        if (allSelected) delete next[key];
        else next[key] = next[key] || { requestId, requestNumber: getRequestNumber(request), line };
      });
      return next;
    });
  };

  const closeModal = () => {
    setShowSelectedModal(false);
    setShowRequestModal(false);
  };
  const removeSelectedItem = (key) => {
    setSelectedItems((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const updateSelectedItemNotes = (key, notes) => {
    setSelectedItems((current) => ({
      ...current,
      [key]: { ...current[key], notes }
    }));
  };
  const selectedCount = Object.keys(selectedItems).length;
  const selectedItemEntries = Object.entries(selectedItems);

  const createQuotation = async () => {
    if (!selectedItemEntries.length) return;
    const publicToken = createQuotationToken();
    const publicLink = getOfferUrl(publicToken);
    const items = selectedItemEntries.map(([, selected]) => ({
      requestId: selected.requestId,
      requestNumber: selected.requestNumber,
      itemCode: getValue(selected.line, ['item_code', 'ItemCode'], '-'),
      itemName: getValue(selected.line, ['item_name', 'ItemName', 'description', 'Dscription'], '-'),
      quantity: Number(getValue(selected.line, ['quantity', 'Quantity'], 0)) || 0,
      unit: getValue(selected.line, ['unit', 'UnitMsr', 'UomCode'], '-'),
      warehouse: getValue(selected.line, ['warehouse', 'WhsCode', 'whs_code'], '-'),
      requiredDate: normalizeApiDate(getValue(selected.line, ['required_date', 'PQTReqDate', 'pqt_req_date'], '')),
      notes: selected.notes ?? getValue(selected.line, ['notes', 'note', 'remarks', 'remark', 'comments'], '')
    }));
    const payload = {
      title: quotationForm.title.trim(),
      notes: quotationForm.notes.trim(),
      link: publicLink,
      valid_until: quotationForm.valid_until,
      items
    };

    setSavingQuotation(true);
    try {
      const response = await PurchasingServices.postQuotations(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to create quotation');
      setSelectedItems({});
      closeModal();
      showAlert(response?.data?.message || 'Request quotation berhasil dibuat', 'success');
      await loadQuotations(1, activeQuotationFilters);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create quotation', 'danger');
    } finally {
      setSavingQuotation(false);
    }
  };

  const copyOfferLink = async (token) => {
    await navigator.clipboard.writeText(getOfferUrl(token));
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(''), 1800);
  };

  const deleteQuotation = (quotation) => {
    if (!quotation?.id) return;
    showConfirm({
      title: 'Delete quotation?',
      subTitle: `${quotation.number} will be permanently deleted. This action cannot be undone.`,
      skipCountdown: true,
      onConfirm: async () => {
        try {
          const response = await PurchasingServices.deleteQuotations(quotation.id);
          if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to delete quotation');
          showAlert(response?.data?.message || 'Quotation deleted successfully', 'success');
          const targetPage =
            quotations.length === 1 && quotationPagination.currentPage > 1
              ? quotationPagination.currentPage - 1
              : quotationPagination.currentPage;
          await loadQuotations(targetPage, activeQuotationFilters);
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Failed to delete quotation', 'danger');
        }
      }
    });
  };

  const openQuotationDetail = async (quotation) => {
    if (!quotation?.id) return;
    setShowDetailModal(true);
    setLoadingQuotationDetail(true);
    setQuotationDetail(null);
    setQuotationDetailItems([]);
    setQuotationOffers([]);
    setQuotationOffersError('');
    try {
      const [detailResult, offersResult] = await Promise.allSettled([
        PurchasingServices.getDetailQuotations(quotation.id),
        PurchasingServices.getListOffer(quotation.id)
      ]);
      if (detailResult.status === 'rejected') throw detailResult.reason;
      const response = detailResult.value;
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load quotation detail');
      const detail = getQuotationDetailPayload(response);
      setQuotationDetail(detail.quotation);
      setQuotationDetailItems(detail.items);

      if (offersResult.status === 'fulfilled' && offersResult.value?.data?.success !== false) {
        setQuotationOffers(getQuotationOffersPayload(offersResult.value));
      } else {
        const offerError =
          offersResult.status === 'rejected'
            ? offersResult.reason
            : new Error(offersResult.value?.data?.message || 'Failed to load supplier offers');
        setQuotationOffersError(offerError?.response?.data?.message || offerError?.message || 'Failed to load supplier offers');
      }
    } catch (error) {
      setShowDetailModal(false);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load quotation detail', 'danger');
    } finally {
      setLoadingQuotationDetail(false);
    }
  };

  return (
    <>
      <EnterpriseWorkspace
        title="Quotation"
        description="Create and manage supplier quotation requests from approved purchase request items."
        icon="ti ti-file-dollar"
        actionLabel="Create Request Quotation"
        onAction={openRequestModal}
        metrics={metrics}
        compactMetrics
        columns={['Quotation No.', 'Date', 'Supplier', 'Purchase Request', 'Status', 'Action']}
        emptyMessage="No quotation data available."
        loading={loadingQuotations}
        tableToolbar={
          <Form className="purchase-quotation-list-filters" onSubmit={applyQuotationFilters}>
            <Form.Control
              size="sm"
              type="search"
              placeholder="Search RFQ, title, item..."
              aria-label="Search quotation"
              value={quotationFilters.search}
              onChange={(event) => setQuotationFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <Form.Select
              size="sm"
              aria-label="Quotation status"
              value={quotationFilters.status}
              onChange={(event) => setQuotationFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">All status</option>
              <option value="OPEN">Open</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </Form.Select>
            <FormDatePicker
              size="sm"
              type="date"
              aria-label="Quotation from date"
              value={quotationFilters.from}
              max={quotationFilters.to || undefined}
              onChange={(event) => setQuotationFilters((current) => ({ ...current, from: event.target.value }))}
            />
            <FormDatePicker
              size="sm"
              type="date"
              aria-label="Quotation to date"
              value={quotationFilters.to}
              min={quotationFilters.from || undefined}
              onChange={(event) => setQuotationFilters((current) => ({ ...current, to: event.target.value }))}
            />
            <Button
              type="button"
              variant="light-secondary"
              size="sm"
              disabled={loadingQuotations}
              onClick={() => loadQuotations(quotationPagination.currentPage, activeQuotationFilters)}
            >
              {loadingQuotations ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="ti ti-refresh me-1" />}
              Refresh
            </Button>
          </Form>
        }
        tableBody={
          quotations.length
            ? quotations.map((quotation) => {
                const quotationId = getValue(quotation, ['id', 'quotation_id', 'DocEntry', 'doc_entry']);
                const quotationNumber = getValue(
                  quotation,
                  ['quotation_no', 'quotation_number', 'number', 'doc_num', 'DocNum', 'code'],
                  '-'
                );
                const token = getValue(quotation, ['token']);
                const items = Array.isArray(quotation.items) ? quotation.items : [];
                const itemRequestNumbers = items.map((item) => getValue(item, ['requestNumber', 'request_number'])).filter(Boolean);
                const requestNumbers =
                  getValue(
                    quotation,
                    ['purchase_request_number', 'purchase_request_no', 'request_number', 'pr_number'],
                    [...new Set(itemRequestNumbers)].join(', ')
                  ) || '-';
                const offerCount = Number(
                  getValue(quotation, ['offers_count', 'offer_count', 'responses_count'], getQuotationOffers(quotationId).length)
                );
                const status = getValue(quotation, ['status', 'document_status', 'DocStatus'], offerCount ? 'SUBMITTED' : 'OPEN');
                return (
                  <tr key={quotationId || quotationNumber}>
                    <td className="fw-semibold">{quotationNumber}</td>
                    <td>{formatDisplayDate(getValue(quotation, ['quotation_date', 'date', 'created_at', 'createdAt', 'DocDate']))}</td>
                    <td>
                      {getValue(
                        quotation,
                        ['supplier_name', 'vendor_name', 'supplier', 'vendor'],
                        offerCount ? `${offerCount} penawaran` : '-'
                      )}
                    </td>
                    <td>{requestNumbers}</td>
                    <td>
                      <Badge
                        bg="light"
                        className={`purchase-quotation-status-badge ${getQuotationStatusClass(status)}`}
                      >
                        {status}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant={String(actionMenu?.quotation?.id) === String(quotationId) ? 'primary' : 'outline-primary'}
                        aria-label={`Open actions for quotation ${quotationNumber}`}
                        aria-expanded={String(actionMenu?.quotation?.id) === String(quotationId)}
                        onClick={(event) =>
                          setActionMenu((current) =>
                            String(current?.quotation?.id) === String(quotationId)
                              ? null
                              : {
                                  quotation: { raw: quotation, id: quotationId, number: quotationNumber, token },
                                  target: event.currentTarget
                                }
                          )
                        }
                      >
                        <i className="ti ti-dots-vertical me-1" />
                        Actions
                        <i className="ti ti-chevron-down ms-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            : undefined
        }
        tableFooter={
          quotationPagination.total > 0 ? (
            <div className="px-3 pb-3">
              <TablePagination
                currentPage={quotationPagination.currentPage}
                onPageChange={(page) => loadQuotations(page, activeQuotationFilters)}
                pageCount={quotationPagination.lastPage}
                pageSize={quotationPagination.perPage}
                total={quotationPagination.total}
                itemLabel="quotations"
              />
            </div>
          ) : null
        }
      />

      <Overlay
        show={Boolean(actionMenu)}
        target={actionMenu?.target}
        placement="bottom-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const quotation = actionMenu?.quotation;
          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 180 }}
            >
              <button
                type="button"
                className="dropdown-item"
                disabled={!quotation?.id}
                onClick={() => {
                  setActionMenu(null);
                  openQuotationDetail(quotation);
                }}
              >
                <i className="ti ti-eye text-primary me-2" />
                Detail
              </button>
              <button
                type="button"
                className="dropdown-item"
                disabled={!quotation?.token}
                onClick={() => {
                  setActionMenu(null);
                  if (quotation?.token) window.open(getOfferUrl(quotation.token), '_blank', 'noopener,noreferrer');
                }}
              >
                <i className="ti ti-external-link text-primary me-2" />
                Open Link
              </button>
              <OverlayTrigger
                placement="left"
                show={Boolean(quotation?.token && copiedToken === quotation.token)}
                overlay={<Tooltip id="quotation-copy-link-tooltip">Link successfully copied</Tooltip>}
              >
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={!quotation?.token}
                  onClick={() => {
                    if (quotation?.token) copyOfferLink(quotation.token);
                  }}
                >
                  <i className="ti ti-copy text-primary me-2" />
                  {copiedToken === quotation?.token ? 'Link Copied' : 'Copy Link'}
                </button>
              </OverlayTrigger>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-danger"
                data-permission-action="none"
                disabled={!quotation?.id}
                onClick={() => {
                  setActionMenu(null);
                  deleteQuotation(quotation);
                }}
              >
                <i className="ti ti-trash me-2" />
                Delete
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        centered
        scrollable
        dialogClassName="purchase-quotation-detail-dialog"
      >
        <Modal.Header closeButton>
          <Modal.Title>Quotation Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingQuotationDetail ? (
            <div className="text-center text-muted py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="mb-0">Loading quotation detail...</p>
            </div>
          ) : quotationDetail ? (
            <>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <small className="text-muted d-block">Quotation No.</small>
                  <strong>{getValue(quotationDetail, ['rfq_number', 'quotation_no', 'quotation_number', 'number', 'code'], '-')}</strong>
                </Col>
                <Col md={4}>
                  <small className="text-muted d-block">Title</small>
                  <strong>{getValue(quotationDetail, ['title', 'quotation_title'], '-')}</strong>
                </Col>
                <Col md={2}>
                  <small className="text-muted d-block">Status</small>
                  <Badge bg="light-success" text="success" className="purchase-quotation-status-badge">
                    {getValue(quotationDetail, ['status', 'document_status'], 'OPEN')}
                  </Badge>
                </Col>
                <Col md={2}>
                  <small className="text-muted d-block">Valid Until</small>
                  <strong>{formatDisplayDate(getValue(quotationDetail, ['valid_until', 'validUntil']))}</strong>
                </Col>
                <Col md={12}>
                  <small className="text-muted d-block">Notes</small>
                  <span>{getValue(quotationDetail, ['notes', 'description'], '-')}</span>
                </Col>
                <Col md={12}>
                  <small className="text-muted d-block">Public Link</small>
                  {getValue(quotationDetail, ['token']) ? (
                    <a href={getOfferUrl(getValue(quotationDetail, ['token']))} target="_blank" rel="noreferrer">
                      {getOfferUrl(getValue(quotationDetail, ['token']))}
                    </a>
                  ) : (
                    '-'
                  )}
                </Col>
              </Row>
              <div className="table-responsive border rounded">
                <Table hover className="mb-0 align-middle purchase-quotation-selected-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Purchase Request</th>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Warehouse</th>
                      <th>Required Date</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationDetailItems.length ? (
                      quotationDetailItems.map((item, index) => (
                        <tr key={getValue(item, ['id', 'quotation_item_id', 'line_id'], index)}>
                          <td>{index + 1}</td>
                          <td>{getValue(item, ['requestNumber', 'request_number', 'purchase_request_number'], '-')}</td>
                          <td className="fw-semibold">{getValue(item, ['itemCode', 'item_code', 'ItemCode'], '-')}</td>
                          <td>{getValue(item, ['itemName', 'item_name', 'ItemName', 'description'], '-')}</td>
                          <td>{formatQuantity(getValue(item, ['quantity', 'Quantity']))}</td>
                          <td>{getValue(item, ['unit', 'uom', 'UnitMsr'], '-')}</td>
                          <td>{getValue(item, ['warehouse', 'warehouse_code', 'WhsCode'], '-')}</td>
                          <td>{formatDisplayDate(getValue(item, ['requiredDate', 'required_date']))}</td>
                          <td>{getValue(item, ['notes', 'remarks'], '-')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          No quotation items available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <section className="purchase-quotation-offers mt-4">
                <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                  <div>
                    <h5 className="mb-1">Supplier Offers</h5>
                    <p className="text-muted mb-0">Offers submitted for this quotation.</p>
                  </div>
                  <Badge bg="light-primary" text="primary">
                    {quotationOffers.length} offer{quotationOffers.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                {quotationOffersError ? (
                  <div className="alert alert-danger mb-0" role="alert">
                    {quotationOffersError}
                  </div>
                ) : quotationOffers.length ? (
                  <div className="table-responsive purchase-quotation-comparison-table">
                    <Table hover bordered className="mb-0 align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th className="purchase-quotation-comparison-item">Item</th>
                          {quotationOfferMatrix.vendors.map((vendor) => (
                            <th
                              className={`purchase-quotation-comparison-vendor purchase-quotation-vendor-tone-${vendor.offerIndex % 6}`}
                              key={getValue(vendor.offer, ['id', 'offer_id'], vendor.offerIndex)}
                            >
                              <strong>{vendor.vendorCompany}</strong>
                              <small>{getValue(vendor.vendorData, ['name', 'pic_name', 'contact_name'], '-')}</small>
                              <small>{getValue(vendor.vendorData, ['email', 'vendor_email'], '-')}</small>
                              <small>
                                Submitted:{' '}
                                {formatDisplayDate(getValue(vendor.offer, ['submitted_at', 'submittedAt', 'created_at', 'createdAt']))}
                              </small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {quotationOfferMatrix.items.length ? (
                          quotationOfferMatrix.items.map((row, index) => {
                            return (
                              <tr key={row.key}>
                                <td>{index + 1}</td>
                                <td className="purchase-quotation-comparison-item">
                                  <strong>{row.itemCode}</strong>
                                  <small className="d-block text-muted">{row.itemName}</small>
                                </td>
                                {quotationOfferMatrix.vendors.map((vendor) => {
                                  const item = vendor.items.get(row.key);
                                  if (!item) {
                                    return (
                                      <td
                                        className={`purchase-quotation-comparison-detail purchase-quotation-vendor-tone-${vendor.offerIndex % 6} is-empty`}
                                        key={getValue(vendor.offer, ['id', 'offer_id'], vendor.offerIndex)}
                                      >
                                        No offer
                                      </td>
                                    );
                                  }

                                  const quantity = getValue(item, ['commitQty', 'commit_qty', 'committed_quantity', 'quantity'], 0);
                                  const unitPrice = getValue(item, ['unitPrice', 'unit_price', 'price'], 0);
                                  const attachment = getValue(item, ['attachment_url', 'attachmentUrl', 'attachment', 'file_url']);
                                  return (
                                    <td
                                      className={`purchase-quotation-comparison-detail purchase-quotation-vendor-tone-${vendor.offerIndex % 6}`}
                                      key={getValue(vendor.offer, ['id', 'offer_id'], vendor.offerIndex)}
                                    >
                                      <dl>
                                        <div>
                                          <dt>Commit Qty</dt>
                                          <dd>{formatQuantity(quantity)}</dd>
                                        </div>
                                        <div>
                                          <dt>Unit Price</dt>
                                          <dd>{formatCurrency(unitPrice)}</dd>
                                        </div>
                                        <div className="is-total">
                                          <dt>Total</dt>
                                          <dd>{formatCurrency(Number(quantity || 0) * Number(unitPrice || 0))}</dd>
                                        </div>
                                        <div>
                                          <dt>Lead Time</dt>
                                          <dd>{getValue(item, ['leadTime', 'lead_time'], '-')}</dd>
                                        </div>
                                        <div>
                                          <dt>Notes</dt>
                                          <dd>{getValue(item, ['notes', 'remarks'], '-')}</dd>
                                        </div>
                                        <div>
                                          <dt>Attachment</dt>
                                          <dd>
                                            {attachment ? (
                                              <a href={attachment} target="_blank" rel="noreferrer">
                                                View file
                                              </a>
                                            ) : (
                                              '-'
                                            )}
                                          </dd>
                                        </div>
                                      </dl>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={quotationOfferMatrix.vendors.length + 2} className="text-center text-muted py-4">
                              No offer item details available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="purchase-quotation-offers-empty">No supplier offers have been submitted.</div>
                )}
              </section>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showRequestModal}
        onHide={closeModal}
        fullscreen
        scrollable
        backdrop="static"
        dialogClassName={showSelectedModal ? 'purchase-quotation-background-blurred' : undefined}
        backdropClassName="purchase-quotation-blur-backdrop"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Request Quotation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Expand a purchase request, then select one or more items to include in the quotation.</p>
          <Form className="purchase-quotation-date-filters mb-3" onSubmit={applyDateFilters}>
            <InputGroup size="sm">
              <InputGroup.Text>From</InputGroup.Text>
              <FormDatePicker
                type="date"
                aria-label="Purchase request from date"
                value={dateFilters.from}
                max={dateFilters.to || undefined}
                onChange={(event) => setDateFilters((current) => ({ ...current, from: event.target.value }))}
              />
            </InputGroup>
            <InputGroup size="sm">
              <InputGroup.Text>To</InputGroup.Text>
              <FormDatePicker
                type="date"
                aria-label="Purchase request to date"
                value={dateFilters.to}
                min={dateFilters.from || undefined}
                onChange={(event) => setDateFilters((current) => ({ ...current, to: event.target.value }))}
              />
            </InputGroup>
            <Button type="submit" size="sm" variant="primary" disabled={loadingRequests}>
              <i className="ti ti-search me-1" />
              Search
            </Button>
            <Button type="button" size="sm" variant="light-secondary" disabled={loadingRequests} onClick={resetDateFilters}>
              <i className="ti ti-refresh me-1" />
              Reset
            </Button>
          </Form>
          <div className="purchase-quotation-request-list table-responsive border rounded">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th className="purchase-quotation-expand-column" aria-label="Expand" />
                  <th>Request No.</th>
                  <th>Request Date</th>
                  <th>Department</th>
                  <th>Requester</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRequests ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading purchase requests...
                    </td>
                  </tr>
                ) : requests.length ? (
                  requests.map((request, requestIndex) => {
                    const requestId = String(getRequestId(request) || requestIndex);
                    const isExpanded = Boolean(expandedRequests[requestId]);
                    const lines = requestLines[requestId] || [];
                    return (
                      <Fragment key={requestId}>
                        <tr>
                          <td className="text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="light-primary"
                              className="purchase-quotation-expand-button"
                              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} request ${getRequestNumber(request)}`}
                              aria-expanded={isExpanded}
                              onClick={() => toggleRequest(request)}
                            >
                              <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                            </Button>
                          </td>
                          <td className="fw-semibold">{getRequestNumber(request)}</td>
                          <td>{formatDisplayDate(getValue(request, ['request_date', 'doc_date', 'DocDate', 'created_at']))}</td>
                          <td>{getValue(request, ['department', 'department_name', 'Department'], '-')}</td>
                          <td>{getValue(request, ['requester_name', 'RequesterName', 'requester'], '-')}</td>
                          <td>
                            <Badge bg="light-success" text="success" className="purchase-quotation-status-badge">
                              {getValue(request, ['status', 'DocStatus', 'document_status'], 'OPEN')}
                            </Badge>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="purchase-quotation-detail-cell">
                              {loadingDetails[requestId] ? (
                                <div className="text-center text-muted py-4">
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Loading request items...
                                </div>
                              ) : lines.length ? (
                                <Table size="sm" className="purchase-quotation-item-table mb-0 align-middle">
                                  <thead>
                                    <tr>
                                      <th className="purchase-quotation-check-column">
                                        <Form.Check
                                          type="checkbox"
                                          checked={
                                            lines.length > 0 &&
                                            lines.every((line, index) => selectedItems[getLineKey(requestId, line, index)])
                                          }
                                          aria-label={`Select all items from request ${getRequestNumber(request)}`}
                                          onChange={() => toggleAllRequestItems(request, lines)}
                                        />
                                      </th>
                                      <th>Item Code</th>
                                      <th>Item Name</th>
                                      <th>Quantity</th>
                                      <th>Unit</th>
                                      <th>Warehouse</th>
                                      <th>Required Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((line, lineIndex) => {
                                      const key = getLineKey(requestId, line, lineIndex);
                                      return (
                                        <tr key={key}>
                                          <td className="text-center">
                                            <Form.Check
                                              type="checkbox"
                                              checked={Boolean(selectedItems[key])}
                                              aria-label={`Select ${getValue(line, ['item_name', 'ItemName', 'description'], `item ${lineIndex + 1}`)}`}
                                              onChange={() => toggleItem(request, line, lineIndex)}
                                            />
                                          </td>
                                          <td>{getValue(line, ['item_code', 'ItemCode'], '-')}</td>
                                          <td>{getValue(line, ['item_name', 'ItemName', 'description', 'Dscription'], '-')}</td>
                                          <td>{formatQuantity(getValue(line, ['quantity', 'Quantity']))}</td>
                                          <td>{getValue(line, ['unit', 'UnitMsr', 'UomCode'], '-')}</td>
                                          <td>{getValue(line, ['warehouse', 'WhsCode', 'whs_code'], '-')}</td>
                                          <td>{formatDisplayDate(getValue(line, ['required_date', 'PQTReqDate', 'pqt_req_date']))}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </Table>
                              ) : (
                                <div className="text-center text-muted py-4">No items found for this purchase request.</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      No purchase requests available.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <span className="me-auto text-muted">{selectedCount} item selected</span>
          <Button variant="outline-primary" disabled={!selectedCount} onClick={() => setShowSelectedModal(true)}>
            <i className="ti ti-list-details me-1" />
            View Selected Items ({selectedCount})
          </Button>
          <Button variant="outline-secondary" onClick={closeModal}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showSelectedModal}
        onHide={() => setShowSelectedModal(false)}
        dialogClassName="purchase-quotation-selected-dialog"
        backdropClassName="purchase-quotation-blur-backdrop"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Selected Quotation Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col md={8}>
              <Form.Label>Quotation Title</Form.Label>
              <Form.Control
                value={quotationForm.title}
                placeholder="Enter quotation title"
                onChange={(event) => setQuotationForm((current) => ({ ...current, title: event.target.value }))}
              />
            </Col>
            <Col md={4}>
              <Form.Label>Valid Until</Form.Label>
              <FormDatePicker
                type="date"
                value={quotationForm.valid_until}
                min={formatLocalDate(new Date())}
                onChange={(event) => setQuotationForm((current) => ({ ...current, valid_until: event.target.value }))}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={quotationForm.notes}
                placeholder="Add notes for suppliers"
                onChange={(event) => setQuotationForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Col>
          </Row>
          <div className="table-responsive border rounded">
            <Table hover className="purchase-quotation-selected-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Purchase Request</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Warehouse</th>
                  <th>Required Date</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedItemEntries.length ? (
                  selectedItemEntries.map(([key, selected], index) => (
                    <Fragment key={key}>
                      <tr>
                        <td>{index + 1}</td>
                        <td className="fw-semibold">{selected.requestNumber}</td>
                        <td>{getValue(selected.line, ['item_code', 'ItemCode'], '-')}</td>
                        <td>{getValue(selected.line, ['item_name', 'ItemName', 'description', 'Dscription'], '-')}</td>
                        <td>{formatQuantity(getValue(selected.line, ['quantity', 'Quantity']))}</td>
                        <td>{getValue(selected.line, ['unit', 'UnitMsr', 'UomCode'], '-')}</td>
                        <td>{getValue(selected.line, ['warehouse', 'WhsCode', 'whs_code'], '-')}</td>
                        <td>{formatDisplayDate(getValue(selected.line, ['required_date', 'PQTReqDate', 'pqt_req_date']))}</td>
                        <td className="text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            data-permission-action="none"
                            className="purchase-quotation-remove-selected"
                            aria-label={`Remove ${getValue(selected.line, ['item_name', 'ItemName'], `item ${index + 1}`)}`}
                            onClick={() => removeSelectedItem(key)}
                          >
                            <i className="ti ti-trash" />
                          </Button>
                        </td>
                      </tr>
                      <tr className="purchase-quotation-item-notes-row">
                        <td colSpan={9}>
                          <Form.Label className="small fw-semibold mb-1">Notes for item {index + 1}</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            aria-label={`Notes for ${getValue(selected.line, ['item_name', 'ItemName'], `item ${index + 1}`)}`}
                            placeholder="Add notes for this item"
                            value={selected.notes ?? getValue(selected.line, ['notes', 'note', 'remarks', 'remark', 'comments'], '')}
                            onChange={(event) => updateSelectedItemNotes(key, event.target.value)}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-5">
                      No items selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <span className="me-auto text-muted">{selectedCount} item selected</span>
          <Button variant="outline-secondary" disabled={savingQuotation} onClick={() => setShowSelectedModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selectedCount || !quotationForm.valid_until || savingQuotation} onClick={createQuotation}>
            {savingQuotation ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="ti ti-link me-1" />}
            {savingQuotation ? 'Creating Quotation...' : 'Create Quotation & Public Link'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
