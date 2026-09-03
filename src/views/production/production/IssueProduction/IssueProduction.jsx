import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

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

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies, getOrganizationAssignmentDefault } from '../../../../utils/cookies';
import './issue-production.scss';

const pageSize = 10;
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 });
const shiftOptions = [
  { value: 'X', label: 'All' },
  { value: 'A', label: '1' },
  { value: 'B', label: '2' },
  { value: 'C', label: '3' }
];
const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 38 })
};
const today = new Date().toLocaleDateString('en-CA');
const createIssueForm = () => ({
  DocDate: today,
  DocDueDate: today,
  Series: '',
  Comments: '',
  Shift: 'X',
  Unit: '',
  WhsCode: getOrganizationAssignmentDefault('warehouses'),
  OcrCode: getOrganizationAssignmentDefault('branches'),
  OcrCode2: getOrganizationAssignmentDefault('business_units'),
  OcrCode3: getOrganizationAssignmentDefault('departments'),
  Lines: []
});
const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatInputDateValue = (value) => {
  if (!value) return today;
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? today : formatInputDate(date);
};
const initialFilters = () => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (now.getDay() === 0 ? -6 : 1 - now.getDay()));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: formatInputDate(monday), to: formatInputDate(sunday), whs_code: '', to_whs_code: '', unit: '' };
};
const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;
const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of [
    'data',
    'items',
    'rows',
    'issues',
    'production_issues',
    'orders',
    'production_orders',
    'documents',
    'series',
    'units',
    'value',
    'results'
  ]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const getStockResponseList = (response) => {
  const list = getResponseList(response);
  if (list.length) return list;

  const payload = response?.data?.data ?? response?.data;
  return payload && typeof payload === 'object' ? [payload] : [];
};
const getStockKey = (itemCode, warehouseCode) => `${String(warehouseCode || '').trim()}::${String(itemCode || '').trim()}`;
const normalizeItemStock = (item = {}, fallbackWarehouse = '') => ({
  itemCode: getValue(item, ['ItemCode', 'itemCode', 'item_code', 'code']),
  warehouseCode: getValue(item, ['WhsCode', 'whsCode', 'whs_code', 'Warehouse', 'warehouse_code'], fallbackWarehouse),
  stock: Number(
    getValue(
      item,
      ['OnHand', 'onHand', 'on_hand', 'OnHandQty', 'onHandQty', 'on_hand_qty', 'Stock', 'stock', 'Quantity', 'quantity', 'qty'],
      0
    )
  )
});
const normalizeUnit = (item = {}) => {
  const value = typeof item === 'object' ? item.u_unit || item.U_Unit || item.unit || item.Unit || item.code || item.value || '' : item;
  const label = typeof item === 'object' ? item.unit_name || item.UnitName || item.name || item.label || item.description || value : item;

  return value ? { value, label: String(label) } : null;
};
const normalizeOcr = (item = {}) => {
  const code = item.ocr_code || item.ocrCode || item.OcrCode || item.code || '';
  const name = item.ocr_name || item.ocrName || item.OcrName || item.name || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code) };
};
const normalizeWarehouse = (item = {}) => {
  const code = item.whs_code || item.warehouse_code || item.code || item.WhsCode || '';
  const name = item.whs_name || item.warehouse_name || item.name || item.WhsName || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code) };
};
const normalizeSeries = (item = {}) => {
  const value = typeof item === 'object' ? (item.series ?? item.Series ?? item.series_code ?? item.value ?? item.code ?? item.id) : item;
  const name =
    typeof item === 'object'
      ? (item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.label ?? item.description ?? value)
      : item;
  const label = typeof item === 'object' ? (item.label ?? name) : name;

  return value === undefined || value === null || value === '' ? null : { value, label: String(label), name: String(name), raw: item };
};
const normalizeSeriesName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();
const getResponseDetail = (response) => {
  const payload = response?.data?.data ?? response?.data;
  const detail = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const header = Array.isArray(detail?.header) ? detail.header[0] : (detail?.header ?? detail?.Header);
  if (!header) return null;
  return { header, items: detail?.items ?? detail?.Items ?? detail?.lines ?? [] };
};
const formatDate = (value) => {
  if (!value) return '-';
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatShift = (value) => ({ A: '1', B: '2', C: '3', X: 'All' })[String(value || '').toUpperCase()] || value || '-';
const pdoProductBadgeVariants = ['primary', 'success', 'warning', 'info', 'danger', 'secondary'];
const getPdoProductBadgeVariant = (code) => {
  const hash = [...String(code || '')].reduce((total, character) => total + character.charCodeAt(0), 0);
  return pdoProductBadgeVariants[hash % pdoProductBadgeVariants.length];
};
const normalizeIssue = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'docEntry', 'doc_entry', 'id', 'issue_id'], index),
  documentNumber: getValue(item, ['DocNum', 'doc_num', 'document_number', 'issue_number', 'number'], '-'),
  documentDate: getValue(item, ['DocDate', 'doc_date', 'document_date', 'posting_date', 'postingDate', 'created_at']),
  shift: formatShift(getValue(item, ['Shift', 'shift', 'U_Shift', 'U_SHIFT'])),
  unit: getValue(item, ['U_Unit', 'u_unit', 'Unit', 'unit'], '-'),
  comments: getValue(item, ['Comments', 'comments', 'remarks', 'remark'], '-'),
  raw: item
});
const normalizeProductionOrder = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'docEntry', 'doc_entry', 'id', 'production_order_id'], index),
  number: getValue(item, ['DocNum', 'doc_num', 'prod_order_no', 'production_order_no', 'number'], '-'),
  itemCode: getValue(item, ['ItemCode', 'item_code', 'product_code', 'code']),
  itemName: getValue(item, ['ProdName', 'ItemName', 'item_name', 'product_name', 'name']),
  plannedQuantity: Number(getValue(item, ['PlannedQty', 'PlannedQuantity', 'planned_qty', 'planned_quantity', 'quantity'], 0)),
  startDate: getValue(item, ['StartDate', 'startDate', 'start_date']),
  warehouse: getValue(item, ['Warehouse', 'WhsCode', 'whs_code', 'warehouse_code']),
  status: getValue(item, ['ProductionOrderStatus', 'Status', 'status', 'order_status']),
  unit: getValue(item, ['U_Unit', 'u_unit', 'Unit', 'unit']),
  remarks: getValue(item, ['Remarks', 'remarks', 'Comments', 'comments'], '-'),
  raw: item
});
const getProductionOrderDetail = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const header = payload?.header ?? payload?.Header ?? payload?.data ?? payload?.order ?? payload?.production_order ?? payload;
  const items = payload?.items ?? payload?.Items ?? payload?.details ?? payload?.order_details ?? [];
  return { header: header || {}, items: Array.isArray(items) ? items : [] };
};
const getIssuePlannedQuantity = (line = {}) =>
  Number(
    getValue(
      line,
      [
        'PlannedQty',
        'plannedQty',
        'planned_qty',
        'PlannedQuantity',
        'plannedQuantity',
        'planned_quantity',
        'RequiredQty',
        'required_qty',
        'BaseQty',
        'base_qty',
        'Quantity',
        'quantity',
        'qty'
      ],
      0
    )
  );
const getIssueIssuedQuantity = (line = {}) =>
  Number(
    getValue(
      line,
      ['IssuedQty', 'issuedQty', 'issued_qty', 'IssuedQuantity', 'issuedQuantity', 'issued_quantity', 'IssueQty', 'issue_qty'],
      0
    )
  );
const isBackflushIssueLine = (line = {}) =>
  [
    getValue(line, ['IssueMethod', 'issueMethod', 'issue_method', 'issue_mthd', 'IssueMthd']),
    getValue(line, ['IssueType', 'issueType', 'issue_type'])
  ].some((value) => String(value).trim().toUpperCase() === 'B');
const createIssueLine = (line = {}, header = {}, index = 0) => {
  const plannedQty = getIssuePlannedQuantity(line);
  const issuedQty = getIssueIssuedQuantity(line);

  return {
    ItemCode: getValue(line, ['ItemCode', 'ItemNo', 'itemNo', 'item_code', 'code']),
    ItemName: getValue(line, ['ItemName', 'itemName', 'item_name', 'ItemDescription', 'item_description', 'name']),
    BaseType: Number(getValue(line, ['BaseType', 'base_type'], 202)),
    BaseEntry: Number(getValue(line, ['BaseEntry', 'base_entry'], getValue(header, ['DocEntry', 'docEntry', 'doc_entry', 'id'], ''))),
    BaseLine: Number(getValue(line, ['BaseLine', 'base_line', 'LineNum', 'line_num'], index)),
    PlannedQty: plannedQty,
    IssuedQty: issuedQty,
    Quantity: 0,
    WhsCode:
      getOrganizationAssignmentDefault('warehouses') ||
      getValue(line, ['WhsCode', 'whs_code', 'Warehouse', 'warehouse_code'], getValue(header, ['Warehouse', 'WhsCode', 'whs_code'])),
    UoMEntry: Number(getValue(line, ['UoMEntry', 'UomEntry', 'uom_entry'], 0)),
    OcrCode:
      getOrganizationAssignmentDefault('branches') || getValue(line, ['OcrCode', 'ocr_code'], getValue(header, ['OcrCode', 'ocr_code'])),
    OcrCode2:
      getOrganizationAssignmentDefault('business_units') ||
      getValue(line, ['OcrCode2', 'ocr_code2'], getValue(header, ['OcrCode2', 'ocr_code2'])),
    OcrCode3:
      getOrganizationAssignmentDefault('departments') ||
      getValue(line, ['OcrCode3', 'ocr_code3'], getValue(header, ['OcrCode3', 'ocr_code3']))
  };
};
const normalizeKey = (key) =>
  String(key || '')
    .replaceAll('_', '')
    .toLowerCase();
const columnLabels = {
  itemcode: 'Item',
  itemname: 'Item Name',
  whscode: 'Warehouse',
  quantity: 'Quantity',
  qty: 'Quantity',
  ocrcode: 'Branch',
  ocrcode2: 'Business Unit',
  ocrcode3: 'Department'
};
const formatValue = (value, key) => {
  if (value === undefined || value === null || value === '') return '-';
  if (['qty', 'quantity'].includes(normalizeKey(key))) {
    const number = Number(value);
    return Number.isNaN(number) ? String(value) : numberFormatter.format(number);
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

export default function IssueProduction() {
  const { showAlert } = useAlert();
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [issueSort, setIssueSort] = useState({ key: '', direction: 'asc' });
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [issueForm, setIssueForm] = useState(createIssueForm);
  const [savingIssue, setSavingIssue] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [productionOrders, setProductionOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderFilters, setOrderFilters] = useState(initialFilters);
  const [orderSearch, setOrderSearch] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetailId, setLoadingOrderDetailId] = useState(null);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [itemStocks, setItemStocks] = useState({});
  const [loadingItemStocks, setLoadingItemStocks] = useState(false);

  const stockRequests = useMemo(() => {
    const requests = issueForm.Lines.reduce((groups, line) => {
      const itemCode = String(line.ItemCode || '').trim();
      const warehouseCode = String(line.WhsCode || issueForm.WhsCode || '').trim();
      if (!itemCode || !warehouseCode) return groups;

      if (!groups[warehouseCode]) groups[warehouseCode] = new Set();
      groups[warehouseCode].add(itemCode);
      return groups;
    }, {});

    return Object.entries(requests).map(([WhsCode, itemCodes]) => ({ WhsCode, item_codes: [...itemCodes].sort() }));
  }, [issueForm.Lines, issueForm.WhsCode]);
  const stockRequestKey = JSON.stringify(stockRequests);

  useEffect(() => {
    let active = true;

    const fetchItemStocks = async () => {
      if (!stockRequests.length) {
        setItemStocks({});
        setLoadingItemStocks(false);
        return;
      }

      setLoadingItemStocks(true);
      try {
        const responses = await Promise.all(
          stockRequests.map(async (request) => ({
            warehouseCode: request.WhsCode,
            response: await ProductionServices.getItemStock(request)
          }))
        );
        if (!active) return;

        const stocks = {};
        responses.forEach(({ warehouseCode, response }) => {
          if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch item stock');
          getStockResponseList(response).forEach((item) => {
            const normalized = normalizeItemStock(item, warehouseCode);
            if (normalized.itemCode) stocks[getStockKey(normalized.itemCode, normalized.warehouseCode)] = normalized.stock;
          });
        });
        setItemStocks(stocks);
      } catch (error) {
        if (!active) return;
        setItemStocks({});
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch item stock', 'danger');
      } finally {
        if (active) setLoadingItemStocks(false);
      }
    };

    fetchItemStocks();
    return () => {
      active = false;
    };
    // stockRequestKey represents the unique item and warehouse combinations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockRequestKey]);

  const fetchOcrOptions = async () => {
    setLoadingOcr(true);
    try {
      const responses = await Promise.all([
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);
      if (responses.some((response) => response?.data?.success === false)) throw new Error('Failed to fetch OCR data');
      setOcrOptions({
        branch: getResponseList(responses[0])
          .map(normalizeOcr)
          .filter((option) => option.value),
        businessUnit: getResponseList(responses[1])
          .map(normalizeOcr)
          .filter((option) => option.value),
        department: getResponseList(responses[2])
          .map(normalizeOcr)
          .filter((option) => option.value)
      });
    } catch (error) {
      setOcrOptions({ branch: [], businessUnit: [], department: [] });
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch OCR data', 'danger');
    } finally {
      setLoadingOcr(false);
    }
  };

  const fetchWarehouseOptions = async () => {
    if (warehouseOptions.length) return;
    setLoadingWarehouses(true);
    try {
      const response = await WarehouseServices.getAllWarehouse('');
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch warehouse data');
      setWarehouseOptions(
        getResponseList(response)
          .map(normalizeWarehouse)
          .filter((option) => option.value)
      );
    } catch (error) {
      setWarehouseOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch warehouse data', 'danger');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const fetchIssues = useCallback(
    async (activeFilters) => {
      const query = activeFilters || filters;
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }
      setLoading(true);
      try {
        const response = await ProductionServices.getIssueProduction(query);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production issues');
        setIssues(getResponseList(response).map(normalizeIssue));
        setCurrentPage(1);
      } catch (error) {
        setIssues([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production issues', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    fetchIssues(initialFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedIssues = useMemo(() => {
    if (!issueSort.key) return issues;

    return [...issues].sort((left, right) => {
      const getValue = (issue) =>
        issueSort.key === 'documentDate' ? new Date(issue.documentDate || 0).getTime() || 0 : issue[issueSort.key] || '';
      const leftValue = getValue(left);
      const rightValue = getValue(right);
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), 'id-ID', { numeric: true, sensitivity: 'base' });
      return issueSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [issueSort, issues]);

  const handleIssueSort = (key) => {
    setIssueSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    setCurrentPage(1);
  };

  const renderIssueSortableHeader = (label, key) => {
    const ascending = issueSort.key === key && issueSort.direction === 'asc';
    const descending = issueSort.key === key && issueSort.direction === 'desc';

    return (
      <button
        type="button"
        className="btn btn-link link-dark text-decoration-none fw-semibold p-0 text-nowrap"
        onClick={() => handleIssueSort(key)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="d-inline-flex flex-column align-middle ms-1" style={{ gap: 0, lineHeight: 0 }} aria-hidden="true">
          <i
            className={`ti ti-triangle ${ascending ? 'text-primary' : 'text-muted'}`}
            style={{ fontSize: '0.55rem', lineHeight: '0.55rem' }}
          />
          <i
            className={`ti ti-triangle ${descending ? 'text-primary' : 'text-muted'}`}
            style={{ fontSize: '0.55rem', lineHeight: '0.55rem', marginTop: -3, transform: 'rotate(180deg)' }}
          />
        </span>
      </button>
    );
  };

  const pageCount = Math.max(Math.ceil(sortedIssues.length / pageSize), 1);
  const paginatedIssues = useMemo(() => {
    const start = (Math.min(currentPage, pageCount) - 1) * pageSize;
    return sortedIssues.slice(start, start + pageSize);
  }, [currentPage, pageCount, sortedIssues]);

  const handleViewDetail = async (issue) => {
    const docEntry = issue?.raw?.DocEntry ?? issue?.raw?.docEntry ?? issue?.raw?.doc_entry ?? issue?.id;
    if (docEntry === undefined || docEntry === null || docEntry === '') {
      showAlert('DocEntry was not found', 'danger');
      return;
    }
    setLoadingDetailId(docEntry);
    try {
      const response = await ProductionServices.getIssueProductionDetail(docEntry);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production issue detail');
      const detail = getResponseDetail(response);
      if (!detail) throw new Error('Production issue detail was not found');
      setSelectedIssue(detail);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production issue detail', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleReset = () => {
    const defaults = initialFilters();
    setFilters(defaults);
    fetchIssues(defaults);
  };

  const fetchUnitOptions = async () => {
    if (unitOptions.length) return;

    setLoadingUnits(true);
    try {
      const response = await ProductionServices.getUnit();
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch unit data');
      setUnitOptions(getResponseList(response).map(normalizeUnit).filter(Boolean));
    } catch (error) {
      setUnitOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch unit data', 'danger');
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchSeriesOptions = async (date) => {
    const formattedDate = String(date || '').replace(/-/g, '');
    if (!formattedDate) {
      setSeriesOptions([]);
      return [];
    }

    setLoadingSeries(true);
    try {
      const response = await ProductionServices.getSeries(formattedDate, 60);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch series data');
      const options = getResponseList(response).map(normalizeSeries).filter(Boolean);
      setSeriesOptions(options);
      return options;
    } catch (error) {
      setSeriesOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch series data', 'danger');
      return [];
    } finally {
      setLoadingSeries(false);
    }
  };

  const filteredProductionOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    const selectedUnit = String(orderFilters.unit || '').toLowerCase();

    return productionOrders.filter(
      (order) =>
        (!selectedUnit || String(order.unit || '').toLowerCase() === selectedUnit) &&
        (!keyword ||
          [order.number, order.itemCode, order.itemName, order.warehouse].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(keyword)
          ))
    );
  }, [orderFilters.unit, orderSearch, productionOrders]);

  const fetchProductionOrders = async () => {
    if (orderFilters.from && orderFilters.to && new Date(orderFilters.from) > new Date(orderFilters.to)) {
      showAlert('From date cannot be after To date', 'warning');
      return;
    }
    setLoadingOrders(true);
    try {
      const response = await ProductionServices.getListOrderSap({ ...orderFilters, status: 'Release' });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');
      setProductionOrders(getResponseList(response).map(normalizeProductionOrder));
    } catch (error) {
      setProductionOrders([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenOrderSelection = () => {
    setSelectedOrderIds([...new Set(issueForm.Lines.map((line) => String(line.BaseEntry)))]);
    setShowOrderModal(true);
    fetchProductionOrders();
  };

  const handleToggleProductionOrder = (order, isChecked) => {
    const normalizedId = String(order.id);
    if (isChecked) {
      const unit = String(order.unit || '').trim();
      if (!unit) {
        showAlert(`PDO ${order.number} does not have a unit`, 'warning');
        return;
      }
      const activeUnits = new Set(
        [
          issueForm.Unit,
          ...productionOrders
            .filter((item) => selectedOrderIds.includes(String(item.id)) && String(item.id) !== normalizedId)
            .map((item) => item.unit)
        ]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      );
      if (activeUnits.size && !activeUnits.has(unit)) {
        showAlert('Selected Production Orders must be from the same unit', 'warning');
        return;
      }
    }
    setSelectedOrderIds((current) => (isChecked ? [...new Set([...current, normalizedId])] : current.filter((id) => id !== normalizedId)));
  };

  const handleAddSelectedProductionOrders = async () => {
    if (!selectedOrderIds.length) {
      showAlert('Select at least one Production Order', 'warning');
      return;
    }

    const checkedOrders = productionOrders.filter((order) => selectedOrderIds.includes(String(order.id)));
    if (checkedOrders.some((order) => !String(order.unit || '').trim())) {
      showAlert('Every selected Production Order must have a unit', 'warning');
      return;
    }
    const selectedUnits = new Set(
      [issueForm.Unit, ...checkedOrders.map((order) => order.unit)].map((unit) => String(unit || '').trim()).filter(Boolean)
    );
    if (selectedUnits.size > 1) {
      showAlert('Selected Production Orders must be from the same unit', 'warning');
      return;
    }

    const existingEntryIds = issueForm.Lines.map((line) => String(line.BaseEntry));
    const selectedOrders = productionOrders.filter(
      (order) => selectedOrderIds.includes(String(order.id)) && !existingEntryIds.includes(String(order.id))
    );

    setLoadingOrderDetailId('selected');
    try {
      const orderDetails = await Promise.all(
        selectedOrders.map(async (order) => {
          const response = await ProductionServices.getProductionOrderById(order.id);
          if (response?.data?.success === false) {
            throw new Error(response.data.message || `Failed to fetch Production Order ${order.number}`);
          }
          const { header, items } = getProductionOrderDetail(response);
          const lines = items.flatMap((line, index) =>
            isBackflushIssueLine(line)
              ? []
              : [
                  {
                    ...createIssueLine(line, header, index),
                    ProductionOrderNumber: getValue(header, ['DocNum', 'doc_num'], order.number),
                    ProductionItemCode: getValue(header, ['ItemCode', 'item_code', 'product_code'], order.itemCode),
                    ProductionItemName: getValue(header, ['ProdName', 'ItemName', 'item_name', 'product_name'], order.itemName)
                  }
                ]
          );
          if (!lines.length) throw new Error(`No non-backflush material lines were found in Production Order ${order.number}`);
          return { header, lines };
        })
      );
      const firstHeader = orderDetails[0]?.header || {};
      const dueDate = formatInputDateValue(getValue(firstHeader, ['PostDate'], issueForm.DocDueDate));
      const postingDate = issueForm.DocDate && issueForm.DocDate > dueDate ? dueDate : issueForm.DocDate;
      const pdoSeries = getValue(firstHeader, ['Series', 'series', 'series_code', 'seriesCode']);
      const pdoSeriesName = getValue(firstHeader, ['SeriesName', 'seriesName', 'series_name']);
      const availableSeries = await fetchSeriesOptions(postingDate);
      const matchingSeries = availableSeries.find(
        (option) =>
          (pdoSeriesName && normalizeSeriesName(option.name) === normalizeSeriesName(pdoSeriesName)) ||
          (!pdoSeriesName && pdoSeries && String(option.value) === String(pdoSeries))
      );

      setIssueForm((current) => ({
        ...current,
        DocDate: postingDate,
        DocDueDate: dueDate,
        Series: matchingSeries?.value || (postingDate !== current.DocDate ? '' : current.Series),
        Comments: current.Comments || getValue(firstHeader, ['Comments', 'comments', 'remarks']),
        Shift: getValue(firstHeader, ['U_Shift', 'Shift', 'shift'], current.Shift),
        Unit: getValue(firstHeader, ['U_Unit', 'Unit', 'unit', 'OcrCode2', 'ocr_code2'], current.Unit),
        WhsCode: current.WhsCode || orderDetails[0]?.lines[0]?.WhsCode || '',
        OcrCode: current.OcrCode || orderDetails[0]?.lines[0]?.OcrCode || '',
        OcrCode2: current.OcrCode2 || orderDetails[0]?.lines[0]?.OcrCode2 || '',
        OcrCode3: current.OcrCode3 || orderDetails[0]?.lines[0]?.OcrCode3 || '',
        Lines: [
          ...current.Lines.filter((line) => selectedOrderIds.includes(String(line.BaseEntry))),
          ...orderDetails.flatMap((detail) => detail.lines)
        ].map((line) => ({
          ...line,
          WhsCode: current.WhsCode || line.WhsCode,
          OcrCode: current.OcrCode || line.OcrCode,
          OcrCode2: current.OcrCode2 || line.OcrCode2,
          OcrCode3: current.OcrCode3 || line.OcrCode3
        }))
      }));
      setShowOrderModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingOrderDetailId(null);
    }
  };

  const updateIssueLine = (lineIndex, values) => {
    setIssueForm((current) => ({
      ...current,
      Lines: current.Lines.map((line, index) => (index === lineIndex ? { ...line, ...values } : line))
    }));
  };

  const handleDeleteIssueLine = (lineIndex) => {
    setIssueForm((current) => ({ ...current, Lines: current.Lines.filter((_, index) => index !== lineIndex) }));
  };

  const handleSubmitIssue = async () => {
    if (issueForm.DocDate && issueForm.DocDueDate && issueForm.DocDate > issueForm.DocDueDate) {
      showAlert('Posting Date cannot be after Due Date', 'warning');
      return;
    }
    const invalidLine = issueForm.Lines.some(
      (line) => !(Number(line.BaseEntry) > 0) || !Number.isFinite(Number(line.BaseLine)) || !line.WhsCode
    );
    if (!issueForm.DocDate || !issueForm.DocDueDate || !issueForm.Series || !issueForm.Lines.length || invalidLine) {
      showAlert('Complete document dates, Series, Base Entry, Base Line, and Warehouse for every line', 'warning');
      return;
    }

    const payload = {
      ...issueForm,
      AddonId: String(getCookies('addonId') ?? ''),
      UserId: String(getCookies('id') ?? ''),
      Lines: issueForm.Lines.map(
        ({ ItemCode, ItemName, PlannedQty, IssuedQty, ProductionOrderNumber, ProductionItemCode, ProductionItemName, ...line }) => ({
          ...line,
          BaseType: Number(line.BaseType),
          BaseEntry: Number(line.BaseEntry),
          BaseLine: Number(line.BaseLine),
          Quantity: Number(line.Quantity),
          UoMEntry: Number(line.UoMEntry || 0),
          WhsCode: issueForm.WhsCode || line.WhsCode,
          OcrCode: issueForm.OcrCode || line.OcrCode,
          OcrCode2: issueForm.OcrCode2 || line.OcrCode2,
          OcrCode3: issueForm.OcrCode3 || line.OcrCode3
        })
      )
    };

    setSavingIssue(true);
    try {
      const response = await ProductionServices.postIssueProduction(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to add production issue');
      setShowAddIssue(false);
      setIssueForm(createIssueForm());
      showAlert(response?.data?.message || 'Production issue added successfully', 'success');
      await fetchIssues();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to add production issue', 'danger');
    } finally {
      setSavingIssue(false);
    }
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Issue Production</h5>
            <span className="text-muted f-12">View materials issued to production orders in SAP.</span>
          </Stack>
        }
        secondary={
          <Button
            variant="success"
            onClick={() => {
              setIssueForm(createIssueForm());
              setItemStocks({});
              setShowAddIssue(true);
              fetchOcrOptions();
              fetchWarehouseOptions();
              fetchUnitOptions();
              fetchSeriesOptions(today);
            }}
          >
            <i className="ti ti-plus me-1" />
            Add Issue
          </Button>
        }
      >
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((old) => ({ ...old, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((old) => ({ ...old, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loading} onClick={() => fetchIssues()}>
                    <i className={loading ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loading ? 'Loading...' : 'Search'}
                  </Button>
                  <Button variant="light-secondary" disabled={loading} aria-label="Reset issue filters" onClick={handleReset}>
                    <i className="ti ti-refresh" />
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>{renderIssueSortableHeader('Doc. No.', 'documentNumber')}</th>
              <th>{renderIssueSortableHeader('Doc. Date', 'documentDate')}</th>
              <th>{renderIssueSortableHeader('Shift', 'shift')}</th>
              <th>{renderIssueSortableHeader('Unit', 'unit')}</th>
              <th>{renderIssueSortableHeader('Comment', 'comments')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary me-2" />
                  Loading production issues...
                </td>
              </tr>
            ) : paginatedIssues.length ? (
              paginatedIssues.map((issue, index) => (
                <tr key={issue.id || `${issue.documentNumber}-${index}`}>
                  <td>
                    <Button
                      variant="link"
                      className="p-0 fw-semibold text-decoration-none"
                      disabled={loadingDetailId !== null}
                      onClick={() => handleViewDetail(issue)}
                    >
                      {String(loadingDetailId) === String(issue.id) ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                      {issue.documentNumber}
                    </Button>
                  </td>
                  <td>{formatDate(issue.documentDate)}</td>
                  <td>{issue.shift}</td>
                  <td>{issue.unit}</td>
                  <td>{issue.comments}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No production issue data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        {!loading && issues.length ? (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={issues.length}
            itemLabel="issues"
          />
        ) : null}
      </MainCard>

      <Modal show={showAddIssue} onHide={() => !savingIssue && setShowAddIssue(false)} fullscreen scrollable>
        <Modal.Header closeButton={!savingIssue}>
          <Modal.Title>Add Issue Production</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Label>Posting Date *</Form.Label>
              <Form.Control
                type="date"
                value={issueForm.DocDate}
                max={issueForm.DocDueDate || undefined}
                onChange={(event) => {
                  const date = event.target.value;
                  setIssueForm((current) => ({ ...current, DocDate: date, Series: '' }));
                  fetchSeriesOptions(date);
                }}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Due Date *</Form.Label>
              <Form.Control type="date" value={issueForm.DocDueDate} readOnly />
            </Col>
            <Col md={2}>
              <Form.Label>Series *</Form.Label>
              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={seriesOptions}
                value={seriesOptions.find((option) => String(option.value) === String(issueForm.Series)) || null}
                isLoading={loadingSeries}
                isDisabled
                placeholder={loadingSeries ? 'Loading series...' : 'Select series'}
                onChange={(option) => setIssueForm((current) => ({ ...current, Series: option?.value || '' }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Shift</Form.Label>
              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={shiftOptions}
                value={shiftOptions.find((option) => option.value === issueForm.Shift) || null}
                isDisabled
                placeholder="Select shift"
                onChange={(option) => setIssueForm((current) => ({ ...current, Shift: option?.value || '' }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Unit</Form.Label>
              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={unitOptions}
                value={
                  unitOptions.find((option) => String(option.value) === String(issueForm.Unit)) ||
                  (issueForm.Unit ? { value: issueForm.Unit, label: issueForm.Unit } : null)
                }
                isLoading={loadingUnits}
                isDisabled
                placeholder={loadingUnits ? 'Loading units...' : 'Select unit'}
                onChange={(option) => setIssueForm((current) => ({ ...current, Unit: option?.value || '' }))}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Comments</Form.Label>
              <Form.Control as="textarea" rows={2} value={issueForm.Comments} readOnly />
            </Col>
            {[
              ['WhsCode', warehouseOptions, 'Warehouse', loadingWarehouses],
              ['OcrCode', ocrOptions.branch, 'Branch', loadingOcr],
              ['OcrCode2', ocrOptions.businessUnit, 'Business Unit', loadingOcr],
              ['OcrCode3', ocrOptions.department, 'Department', loadingOcr]
            ].map(([field, options, label, isLoading]) => (
              <Col md={3} key={field}>
                <Form.Label>{label}</Form.Label>
                <Select
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={options}
                  value={
                    options.find((option) => String(option.value) === String(issueForm[field])) ||
                    (issueForm[field] ? { value: issueForm[field], label: issueForm[field] } : null)
                  }
                  isLoading={isLoading}
                  isDisabled
                  placeholder={`Select ${label.toLowerCase()}`}
                />
              </Col>
            ))}
          </Row>

          <Stack direction="horizontal" className="justify-content-between mb-2">
            <h6 className="mb-0">Items</h6>
            <Button size="sm" variant="outline-primary" onClick={handleOpenOrderSelection}>
              <i className="ti ti-plus me-1" /> Add PDO
            </Button>
          </Stack>
          <Table responsive bordered className="align-middle mb-0">
            <thead>
              <tr>
                <th>Item</th>
                <th>Planned Qty</th>
                <th>Issued Qty</th>
                <th>Stock</th>
                <th>Qty</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {issueForm.Lines.length ? (
                issueForm.Lines.map((line, index) => (
                  <tr key={`${line.BaseEntry}-${line.BaseLine}-${index}`}>
                    <td style={{ minWidth: 180 }}>
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <span className="fw-semibold">{line.ItemCode || '-'}</span>
                        <Badge bg={getPdoProductBadgeVariant(line.ProductionItemCode)} className="fw-normal">
                          {line.ProductionItemCode || '-'}
                        </Badge>
                      </div>
                      <div className="text-muted f-12">{line.ItemName || '-'}</div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control size="sm" type="number" value={line.PlannedQty} readOnly />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control size="sm" type="number" value={line.IssuedQty} readOnly />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        size="sm"
                        value={
                          loadingItemStocks
                            ? 'Loading...'
                            : (itemStocks[getStockKey(line.ItemCode, line.WhsCode || issueForm.WhsCode)] ?? '-')
                        }
                        readOnly
                      />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        size="sm"
                        type="number"
                        step="any"
                        value={line.Quantity}
                        onChange={(event) => {
                          const value = event.target.value;
                          const quantity = value === '' ? '' : Number(value);
                          updateIssueLine(index, { Quantity: quantity });
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <Button
                        type="button"
                        className="btn-icon avatar-s"
                        size="sm"
                        variant="outline-danger"
                        data-permission-action="create"
                        aria-label={`Delete ${line.ItemCode || 'item'}`}
                        onClick={() => handleDeleteIssueLine(index)}
                      >
                        <i className="ti ti-trash" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No items added. Click Add PDO to select a Production Order.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={savingIssue} onClick={() => setShowAddIssue(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={savingIssue || loadingSeries} onClick={handleSubmitIssue}>
            {savingIssue ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
            {savingIssue ? 'Saving...' : 'Save Issue'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showOrderModal}
        onHide={() => !loadingOrders && !loadingOrderDetailId && setShowOrderModal(false)}
        size="xl"
        className="production-nested-modal"
        backdropClassName="production-nested-modal-backdrop"
        dialogClassName="issue-pdo-selection-modal"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingOrders && !loadingOrderDetailId}>
          <Modal.Title>Select Production Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            className="mb-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchProductionOrders();
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.from}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.to}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Unit</Form.Label>
                <Select
                  styles={selectStyles}
                  options={unitOptions}
                  value={unitOptions.find((option) => String(option.value) === String(orderFilters.unit)) || null}
                  isLoading={loadingUnits}
                  isClearable
                  placeholder="All units"
                  onChange={(option) => setOrderFilters((current) => ({ ...current, unit: option?.value || '' }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Search PDO</Form.Label>
                <InputGroup>
                  <Form.Control
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Order number or product"
                  />
                  <Button type="submit" disabled={loadingOrders} aria-label="Search Production Order">
                    <i className="ti ti-search" />
                  </Button>
                </InputGroup>
              </Col>
            </Row>
          </Form>
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 52 }}>
                  Select
                </th>
                <th>Order No.</th>
                <th>Product</th>
                <th>Start Date</th>
                <th>Planned Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <span className="spinner-border spinner-border-sm me-2" /> Loading Production Orders...
                  </td>
                </tr>
              ) : filteredProductionOrders.length ? (
                filteredProductionOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(String(order.id));
                  const toggleSelection = () => handleToggleProductionOrder(order, !isSelected);

                  return (
                    <tr
                      key={order.id}
                      className={isSelected ? 'table-primary' : ''}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onClick={toggleSelection}
                      onKeyDown={(event) => {
                        if (['Enter', ' '].includes(event.key)) {
                          event.preventDefault();
                          toggleSelection();
                        }
                      }}
                    >
                      <td className="text-center">
                        <Form.Check
                          type="checkbox"
                          aria-label={`Select PDO ${order.number}`}
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleToggleProductionOrder(order, event.target.checked)}
                        />
                      </td>
                      <td className="fw-semibold">{order.number}</td>
                      <td>
                        <div className="fw-semibold">{order.itemCode || '-'}</div>
                        <div className="text-muted f-12">{order.itemName || '-'}</div>
                      </td>
                      <td>{formatDate(order.startDate)}</td>
                      <td>{numberFormatter.format(order.plannedQuantity)}</td>
                      <td>{order.remarks || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No released Production Order found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={loadingOrderDetailId !== null} onClick={() => setShowOrderModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={loadingOrderDetailId !== null || !selectedOrderIds.length}
            onClick={handleAddSelectedProductionOrders}
          >
            {loadingOrderDetailId !== null ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-plus me-1" />}
            {loadingOrderDetailId !== null ? 'Adding...' : `Add Selected PDO (${selectedOrderIds.length})`}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedIssue)} onHide={() => setSelectedIssue(null)} fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Production Issue Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIssue
            ? (() => {
                const issue = normalizeIssue(selectedIssue.header);
                const items = Array.isArray(selectedIssue.items) ? selectedIssue.items : [];
                const columns = [...new Set(items.flatMap((item) => Object.keys(item || {})))].filter(
                  (key) => !['docentry', 'linenum', 'baseentry'].includes(normalizeKey(key))
                );
                const itemCodeKey = columns.find((key) => ['item', 'itemcode', 'itemno'].includes(normalizeKey(key)));
                const itemNameKey = columns.find((key) => ['itemname', 'itemdescription'].includes(normalizeKey(key)));
                const detailColumns = columns.filter((key) => key !== itemCodeKey && key !== itemNameKey);
                const hasItemColumn = Boolean(itemCodeKey || itemNameKey);
                return (
                  <Stack gap={4}>
                    <Card className="border mb-0">
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Document No.</Form.Label>
                            <div className="fw-semibold">{issue.documentNumber}</div>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                            <div>{formatDate(issue.documentDate)}</div>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Shift</Form.Label>
                            <div>{issue.shift}</div>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Unit</Form.Label>
                            <div>{issue.unit}</div>
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="f-12 text-muted">Comments</Form.Label>
                            <div>{issue.comments}</div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                    <Card className="border mb-0">
                      <Card.Header>
                        <h6 className="mb-0">Items</h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <Table responsive hover className="mb-0">
                          <thead>
                            <tr>
                              <th>#</th>
                              {hasItemColumn ? <th>Item</th> : null}
                              {detailColumns.map((key) => (
                                <th key={key}>{columnLabels[normalizeKey(key)] || key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.length ? (
                              items.map((item, index) => (
                                <tr key={item?.LineNum ?? item?.line_num ?? index}>
                                  <td>{index + 1}</td>
                                  {hasItemColumn ? (
                                    <td style={{ minWidth: 220 }}>
                                      <div className="fw-semibold">{itemCodeKey ? formatValue(item[itemCodeKey], itemCodeKey) : '-'}</div>
                                      <div className="text-muted f-12">
                                        {itemNameKey ? formatValue(item[itemNameKey], itemNameKey) : '-'}
                                      </div>
                                    </td>
                                  ) : null}
                                  {detailColumns.map((key) => (
                                    <td key={key}>{formatValue(item[key], key)}</td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={Math.max(detailColumns.length + (hasItemColumn ? 1 : 0) + 1, 1)}
                                  className="text-center text-muted py-4"
                                >
                                  No issue item detail found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Stack>
                );
              })()
            : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedIssue(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
