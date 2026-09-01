import { useCallback, useEffect, useMemo, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Select from 'react-select';
import { useDispatch, useSelector } from 'react-redux';

import MainCard from 'components/MainCard';
import LoaderData from 'components/LoaderData';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import TablePagination from 'components/TablePagination';
import ProductionServices from '../../../../services/production/ProductionServices';
import {
  fetchReceiptPdos,
  setReceiptPdoFilters,
  setReceiptPdoSearch,
  setReceiptPdoSelectedIds,
  toggleReceiptPdo
} from '../../../../redux/production/receiptPdoReducer';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies, getOrganizationAssignment, getOrganizationAssignmentDefault } from '../../../../utils/cookies';
import './receipt-production.scss';

const pageSize = 10;
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const shiftOptions = [
  { value: 'X', label: 'All' },
  { value: 'A', label: '1' },
  { value: 'B', label: '2' },
  { value: 'C', label: '3' }
];
const compactSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 31, minWidth: 180, fontSize: '0.75rem' }),
  valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
  option: (base) => ({ ...base, fontSize: '0.75rem' })
};
const today = new Date().toLocaleDateString('en-CA');
const createReceiptForm = () => ({
  DocDate: today,
  DocDueDate: today,
  Series: '',
  Comments: '',
  Shift: 'X',
  Unit: '',
  Bomid: '',
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

const initialFilters = () => {
  const currentDate = new Date();
  const mondayOffset = currentDate.getDay() === 0 ? -6 : 1 - currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    from: formatInputDate(startOfWeek),
    to: formatInputDate(endOfWeek)
  };
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.boms)) return payload.boms;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.production_orders)) return payload.production_orders;
  if (Array.isArray(payload?.receipts)) return payload.receipts;
  if (Array.isArray(payload?.production_receipts)) return payload.production_receipts;
  if (Array.isArray(payload?.documents)) return payload.documents;
  if (Array.isArray(payload?.series)) return payload.series;
  if (Array.isArray(payload?.warehouses)) return payload.warehouses;
  if (Array.isArray(payload?.units)) return payload.units;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;

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

const getResponseDetail = (response) => {
  const payload = response?.data?.data ?? response?.data;
  const detail = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const header = Array.isArray(detail?.header) ? detail.header[0] : detail?.header;

  if (!header) return null;

  return {
    header,
    items: Array.isArray(detail?.items) ? detail.items : []
  };
};

const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;

const getLines = (item = {}) => {
  const lines = getValue(item, ['DocumentLines', 'document_lines', 'Lines', 'lines', 'details', 'receipt_details'], []);
  return Array.isArray(lines) ? lines : [];
};

const formatShift = (value) => {
  const shift = String(value || '').toUpperCase();
  return { A: '1', B: '2', C: '3', X: 'All' }[shift] || shift || '-';
};

const normalizeReceipt = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'doc_entry', 'id', 'receipt_id'], index),
  documentNumber: getValue(item, ['DocNum', 'doc_num', 'document_number', 'receipt_number', 'number'], '-'),
  productionOrderNumber: getValue(item, ['ProdOrderNum', 'prod_order_num', 'production_order_number'], '-'),
  documentDate: getValue(item, ['DocDate', 'doc_date', 'document_date', 'posting_date', 'postingDate', 'created_at']),
  shift: formatShift(getValue(item, ['Shift', 'shift', 'U_Shift', 'U_SHIFT'])),
  unit: getValue(item, ['U_Unit', 'u_unit', 'Unit', 'unit'], '-'),
  comments: getValue(item, ['Comments', 'comments', 'remarks', 'remark'], '-'),
  raw: item
});

const getPlannedQuantity = (item = {}, fallback = 0) =>
  Number(
    item.PlannedQty ?? item.PlannedQuantity ?? item.plannedQty ?? item.planned_qty ?? item.planned_quantity ?? item.quantity ?? fallback
  );

const getCompletedQuantity = (item = {}, fallback = 0) =>
  Number(
    item.CmpltQty ??
      item.Cmpltqty ??
      item.cmpltQty ??
      item.cmpltqty ??
      item.CompletedQty ??
      item.completedQty ??
      item.completed_qty ??
      item.completed_quantity ??
      item.cmplt_qty ??
      item.CompleteQty ??
      item.completeQty ??
      item.complete_qty ??
      fallback
  );

const normalizeProductionOrder = (item = {}, index = 0) => ({
  id: item.DocEntry ?? item.doc_entry ?? item.id ?? index,
  number: item.DocNum ?? item.doc_num ?? item.prod_order_no ?? item.production_order_no ?? '-',
  itemCode: item.ItemCode ?? item.item_code ?? item.product_code ?? '',
  itemName: item.ProdName ?? item.ItemName ?? item.item_name ?? item.product_name ?? '',
  plannedQuantity: getPlannedQuantity(item),
  completedQuantity: getCompletedQuantity(item),
  warehouse: item.Warehouse ?? item.WhsCode ?? item.whs_code ?? item.warehouse_code ?? '',
  uom: item.UomCode ?? item.UoMCode ?? item.UomName ?? item.UoMName ?? item.uom_code ?? item.uom ?? item.unit_of_measure ?? '',
  uomEntry: Number(item.UoMEntry ?? item.UomEntry ?? item.uom_entry ?? item.uomEntry ?? 0),
  bomId: item.Bomid ?? item.BomId ?? item.bom_id ?? item.bomId ?? '',
  unit: item.U_Unit ?? item.Unit ?? item.unit ?? item.ocr_code2 ?? '',
  ocrCode: item.OcrCode ?? item.ocr_code ?? '',
  ocrCode2: item.OcrCode2 ?? item.ocr_code2 ?? '',
  ocrCode3: item.OcrCode3 ?? item.ocr_code3 ?? '',
  raw: item
});

const createReceiptLineFromOrder = (order) => {
  const remainingQuantity = Math.max(order.plannedQuantity - order.completedQuantity, 0);
  return {
    ItemCode: order.itemCode,
    ItemName: order.itemName,
    BaseType: 202,
    BaseEntry: order.id,
    BaseLine: order.baseLine ?? 0,
    PlannedQty: order.plannedQuantity,
    CmpltQty: order.completedQuantity,
    Quantity: remainingQuantity,
    WhsCode: getOrganizationAssignmentDefault('warehouses') || order.warehouse,
    UomCode: order.uom,
    UoMEntry: order.uomEntry,
    OcrCode: getOrganizationAssignmentDefault('branches') || order.ocrCode,
    OcrCode2: getOrganizationAssignmentDefault('business_units') || order.ocrCode2,
    OcrCode3: getOrganizationAssignmentDefault('departments') || order.ocrCode3
  };
};

const getRemainingReceiptQuantity = (line = {}) => Math.max(Number(line.PlannedQty || 0) - Number(line.CmpltQty || 0), 0);
const cannotPostReceiptLine = (line = {}) => Number(line.CmpltQty || 0) >= Number(line.PlannedQty || 0);
const cannotPostProductionOrder = (order = {}) => Number(order.completedQuantity || 0) >= Number(order.plannedQuantity || 0);

const normalizeOcr = (item = {}) => {
  const code = item.ocr_code || item.ocrCode || item.OcrCode || item.code || '';
  const name = item.ocr_name || item.ocrName || item.OcrName || item.name || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code), raw: item };
};

const normalizeWarehouse = (item = {}) => {
  const code = item.whs_code || item.warehouse_code || item.code || item.WhsCode || '';
  const name = item.whs_name || item.warehouse_name || item.name || item.WhsName || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code) };
};

const normalizeUnit = (item = {}) => {
  const value = typeof item === 'object' ? item.u_unit || item.U_Unit || item.unit || item.Unit || item.code || item.value || '' : item;
  const label = typeof item === 'object' ? item.unit_name || item.UnitName || item.name || item.label || item.description || value : item;

  return value ? { value, label: String(label) } : null;
};

const normalizeSeries = (item = {}) => {
  const value = typeof item === 'object' ? (item.series ?? item.Series ?? item.series_code ?? item.value ?? item.code ?? item.id) : item;
  const label =
    typeof item === 'object'
      ? (item.label ?? item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.description ?? value)
      : item;

  return value === undefined || value === null || value === '' ? null : { value, label: String(label) };
};

const normalizeColumnKey = (key) =>
  String(key || '')
    .replaceAll('_', '')
    .toLowerCase();

const getItemColumnLabel = (key) =>
  ({
    ocr: 'Branch',
    ocr2: 'Business Unit',
    ocr3: 'Department',
    ocrcode: 'Branch',
    ocrcode2: 'Business Unit',
    ocrcode3: 'Department',
    docnum: 'Doc Num',
    linenum: 'Line Num',
    itemcode: 'Item',
    itemname: 'Item Name',
    whscode: 'Warehouse'
  })[normalizeColumnKey(key)] || key;

const formatItemValue = (value, key) => {
  if (value === undefined || value === null || value === '') return '-';
  if (['qty', 'quantity'].includes(normalizeColumnKey(key))) {
    const quantity = Number(value);
    return Number.isNaN(quantity) ? String(value) : numberFormatter.format(quantity);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const isHiddenItemColumn = (key) => ['docentry', 'linenum'].includes(normalizeColumnKey(key));

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ReceiptProduction() {
  const { showAlert } = useAlert();
  const organizationAssignments = useMemo(() => getOrganizationAssignment(), []);
  const dispatch = useDispatch();
  const {
    items: pdoItems,
    filters: pdoFilters,
    search: bomSearch,
    selectedIds: selectedPdoIds,
    loading: loadingBoms,
    initialized: pdoInitialized
  } = useSelector((state) => state.productionReceiptPdo);
  const [receipts, setReceipts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loadingReceiptDetailId, setLoadingReceiptDetailId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [receiptForm, setReceiptForm] = useState(createReceiptForm);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [showBomModal, setShowBomModal] = useState(false);
  const [loadingBomDetail, setLoadingBomDetail] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [itemStocks, setItemStocks] = useState({});
  const [loadingItemStocks, setLoadingItemStocks] = useState(false);

  const stockRequests = useMemo(() => {
    const requests = receiptForm.Lines.reduce((groups, line) => {
      const itemCode = String(line.ItemCode || '').trim();
      const warehouseCode = String(line.WhsCode || receiptForm.WhsCode || '').trim();
      if (!itemCode || !warehouseCode) return groups;

      if (!groups[warehouseCode]) groups[warehouseCode] = new Set();
      groups[warehouseCode].add(itemCode);
      return groups;
    }, {});

    return Object.entries(requests).map(([WhsCode, itemCodes]) => ({ WhsCode, item_codes: [...itemCodes].sort() }));
  }, [receiptForm.Lines, receiptForm.WhsCode]);
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

  const fetchReceipts = useCallback(
    async (activeFilters) => {
      const query = activeFilters || filters;
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }

      setLoadingReceipts(true);
      try {
        const response = await ProductionServices.getReceipt({
          from: query.from || '',
          to: query.to || '',
          whs_code: '',
          to_whs_code: ''
        });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production receipts');

        setReceipts(getResponseList(response).map(normalizeReceipt));
        setCurrentPage(1);
      } catch (error) {
        setReceipts([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production receipts', 'danger');
      } finally {
        setLoadingReceipts(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    const defaultFilters = initialFilters();
    fetchReceipts(defaultFilters);
    // Initial page load uses the current-month filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageCount = Math.max(Math.ceil(receipts.length / pageSize), 1);
  const paginatedReceipts = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;
    return receipts.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageCount, receipts]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleViewDetail = async (receipt) => {
    if (receipt?.id === undefined || receipt?.id === null || receipt?.id === '') {
      showAlert('Receipt ID was not found', 'danger');
      return;
    }

    setLoadingReceiptDetailId(receipt.id);
    try {
      const response = await ProductionServices.getReceiptDetail(receipt.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production receipt detail');

      const detail = getResponseDetail(response);
      if (!detail) throw new Error('Production receipt detail was not found');
      setSelectedReceipt(detail);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production receipt detail', 'danger');
    } finally {
      setLoadingReceiptDetailId(null);
    }
  };

  const handleReset = () => {
    const defaultFilters = initialFilters();
    setFilters(defaultFilters);
    fetchReceipts(defaultFilters);
  };

  const boms = useMemo(() => {
    const search = bomSearch.trim().toLowerCase();
    const selectedUnit = String(pdoFilters.unit || '').toLowerCase();
    const orders = pdoItems.map(normalizeProductionOrder);

    return orders.filter(
      (order) =>
        (!selectedUnit || String(order.unit || '').toLowerCase() === selectedUnit) &&
        (!search ||
          [order.number, order.itemCode, order.itemName].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(search)
          ))
    );
  }, [bomSearch, pdoFilters.unit, pdoItems]);

  const fetchBoms = async (keyword = bomSearch, activeFilters = pdoFilters) => {
    if (activeFilters.from && activeFilters.to && new Date(activeFilters.from) > new Date(activeFilters.to)) {
      showAlert('Start Date cannot be after End Date', 'warning');
      return;
    }
    try {
      await dispatch(fetchReceiptPdos(activeFilters, keyword));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
    }
  };

  const fetchOcrOptions = async () => {
    setLoadingOcr(true);
    try {
      const [branchResponse, businessUnitResponse, departmentResponse] = await Promise.all([
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);
      if ([branchResponse, businessUnitResponse, departmentResponse].some((response) => response?.data?.success === false)) {
        throw new Error('Failed to fetch OCR data');
      }
      setOcrOptions({
        branch: getResponseList(branchResponse)
          .map(normalizeOcr)
          .filter((option) => option.value),
        businessUnit: getResponseList(businessUnitResponse)
          .map(normalizeOcr)
          .filter((option) => option.value),
        department: getResponseList(departmentResponse)
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
      return;
    }

    setLoadingSeries(true);
    try {
      const response = await ProductionServices.getSeries(formattedDate, 59);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch series data');
      setSeriesOptions(getResponseList(response).map(normalizeSeries).filter(Boolean));
    } catch (error) {
      setSeriesOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch series data', 'danger');
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleOpenBomSelection = () => {
    const activePdoFilters = pdoInitialized ? pdoFilters : { from: filters.from, to: filters.to, unit: '' };
    dispatch(setReceiptPdoSelectedIds(receiptForm.Lines.map((line) => line.BaseEntry)));
    setShowBomModal(true);
    fetchBoms('', activePdoFilters);
  };

  const handleTogglePdo = (order, isChecked) => {
    if (isChecked && cannotPostProductionOrder(order)) {
      showAlert(`PDO ${order.number} cannot be selected because Complete Qty is greater than or equal to Plan Qty`, 'warning');
      return;
    }
    if (isChecked) {
      const unit = String(order.unit || '').trim();
      if (!unit) {
        showAlert(`PDO ${order.number} does not have a unit`, 'warning');
        return;
      }
      const normalizedOrders = pdoItems.map(normalizeProductionOrder);
      const activeUnits = new Set(
        [
          receiptForm.Unit,
          ...normalizedOrders
            .filter((item) => selectedPdoIds.includes(String(item.id)) && String(item.id) !== String(order.id))
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
    dispatch(toggleReceiptPdo(order.id, isChecked));
  };

  const handleDeleteReceiptLine = (lineIndex) => {
    setReceiptForm((current) => ({
      ...current,
      Lines: current.Lines.filter((_, index) => index !== lineIndex)
    }));
  };

  const updateReceiptLine = (lineIndex, values) => {
    setReceiptForm((current) => ({
      ...current,
      Lines: current.Lines.map((line, index) => (index === lineIndex ? { ...line, ...values } : line))
    }));
  };

  const updateReceiptHeaderField = (field, value) => {
    setReceiptForm((current) => ({
      ...current,
      [field]: value,
      Lines: current.Lines.map((line) => ({ ...line, [field]: value }))
    }));
  };

  const handleAddSelectedPdos = async () => {
    if (!selectedPdoIds.length) {
      showAlert('Select at least one Production Order', 'warning');
      return;
    }
    const normalizedOrders = pdoItems.map(normalizeProductionOrder);
    const checkedOrders = normalizedOrders.filter((order) => selectedPdoIds.includes(String(order.id)));
    if (checkedOrders.some((order) => !String(order.unit || '').trim())) {
      showAlert('Every selected Production Order must have a unit', 'warning');
      return;
    }
    const selectedUnits = new Set(
      [receiptForm.Unit, ...checkedOrders.map((order) => order.unit)].map((unit) => String(unit || '').trim()).filter(Boolean)
    );
    if (selectedUnits.size > 1) {
      showAlert('Selected Production Orders must be from the same unit', 'warning');
      return;
    }
    const unpostableOrders = normalizedOrders.filter(
      (order) => selectedPdoIds.includes(String(order.id)) && cannotPostProductionOrder(order)
    );
    if (unpostableOrders.length) {
      showAlert(`Complete Qty must be less than Plan Qty for PDO: ${unpostableOrders.map((order) => order.number).join(', ')}`, 'warning');
      return;
    }
    const existingEntryIds = receiptForm.Lines.map((line) => String(line.BaseEntry));
    const selectedOrders = normalizedOrders.filter(
      (order) => selectedPdoIds.includes(String(order.id)) && !existingEntryIds.includes(String(order.id))
    );

    setLoadingBomDetail(true);
    try {
      const receiptOrderGroups = await Promise.all(
        selectedOrders.map(async (order) => {
          const response = await ProductionServices.getProductionOrderById(order.id);
          if (response?.data?.success === false) {
            throw new Error(response.data.message || `Failed to fetch Production Order ${order.number}`);
          }
          const payload = response?.data?.data ?? response?.data ?? {};
          const header = payload?.header ?? payload?.Header ?? payload?.data ?? payload?.order ?? payload?.production_order ?? payload;
          const headerItems = Array.isArray(header) ? header : [header];

          return headerItems.filter(Boolean).map((headerItem, index) => ({
            ...normalizeProductionOrder({ ...order.raw, ...headerItem }),
            baseLine: headerItem.BaseLine ?? headerItem.base_line ?? headerItem.LineNum ?? headerItem.line_num ?? index
          }));
        })
      );
      const receiptOrders = receiptOrderGroups.flat();

      setReceiptForm((current) => ({
        ...current,
        Bomid: current.Bomid || String(receiptOrders[0]?.bomId || ''),
        Unit: current.Unit || receiptOrders[0]?.unit || '',
        WhsCode: current.WhsCode || receiptOrders[0]?.warehouse || '',
        OcrCode: current.OcrCode || receiptOrders[0]?.ocrCode || '',
        OcrCode2: current.OcrCode2 || receiptOrders[0]?.ocrCode2 || '',
        OcrCode3: current.OcrCode3 || receiptOrders[0]?.ocrCode3 || '',
        Lines: [
          ...current.Lines.filter((line) => selectedPdoIds.includes(String(line.BaseEntry))),
          ...receiptOrders.map(createReceiptLineFromOrder)
        ].map((line) => ({
          ...line,
          WhsCode: current.WhsCode || line.WhsCode,
          OcrCode: current.OcrCode || line.OcrCode,
          OcrCode2: current.OcrCode2 || line.OcrCode2,
          OcrCode3: current.OcrCode3 || line.OcrCode3
        }))
      }));
      setShowBomModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingBomDetail(false);
    }
  };

  const handleSubmitReceipt = async () => {
    const unpostableLines = receiptForm.Lines.filter(cannotPostReceiptLine);
    if (unpostableLines.length) {
      const itemCodes = unpostableLines.map((line) => line.ItemCode || `Base Entry ${line.BaseEntry}`).join(', ');
      showAlert(`Complete Qty must be less than Plan Qty for: ${itemCodes}. These rows cannot be posted`, 'warning');
      return;
    }

    const invalidLine = receiptForm.Lines.some(
      (line) => line.BaseEntry === '' || line.BaseLine === '' || !(Number(line.Quantity) > 0) || !line.WhsCode
    );
    if (!receiptForm.DocDate || !receiptForm.DocDueDate || !receiptForm.Series || !receiptForm.Lines.length || invalidLine) {
      showAlert('Complete document dates, Series, Base Entry, Base Line, Quantity, and Warehouse for every line', 'warning');
      return;
    }
    const exceedsRemainingQuantity = receiptForm.Lines.some((line) => Number(line.Quantity) > getRemainingReceiptQuantity(line));
    if (exceedsRemainingQuantity) {
      showAlert('Quantity cannot exceed Planned Qty minus Complete Qty', 'warning');
      return;
    }

    const payload = {
      ...receiptForm,
      AddonId: String(getCookies('addonId') ?? ''),
      UserId: String(getCookies('id') ?? ''),
      Lines: receiptForm.Lines.map((line) => ({
        BaseType: Number(line.BaseType),
        BaseEntry: Number(line.BaseEntry),
        BaseLine: Number(line.BaseLine),
        Quantity: Number(line.Quantity),
        WhsCode: receiptForm.WhsCode || line.WhsCode,
        UoMEntry: line.UoMEntry === '' ? 0 : Number(line.UoMEntry),
        OcrCode: receiptForm.OcrCode || line.OcrCode,
        OcrCode2: receiptForm.OcrCode2 || line.OcrCode2,
        OcrCode3: receiptForm.OcrCode3 || line.OcrCode3
      }))
    };

    setSavingReceipt(true);
    try {
      const response = await ProductionServices.postReceipt(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to add production receipt');
      setShowAddReceipt(false);
      setReceiptForm(createReceiptForm());
      showAlert(response?.data?.message || 'Production receipt added successfully', 'success');
      await fetchReceipts();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to add production receipt', 'danger');
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Receipt Production</h5>
            <span className="text-muted f-12">View finished goods receipts posted to SAP.</span>
          </Stack>
        }
        secondary={
          <Button
            variant="success"
            onClick={() => {
              setReceiptForm(createReceiptForm());
              setItemStocks({});
              setShowAddReceipt(true);
              fetchOcrOptions();
              fetchWarehouseOptions();
              fetchUnitOptions();
              fetchSeriesOptions(today);
            }}
          >
            <i className="ti ti-plus me-1" />
            Add Receipt
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
                  onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loadingReceipts} onClick={() => fetchReceipts()}>
                    <i className={loadingReceipts ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loadingReceipts ? 'Loading...' : 'Search'}
                  </Button>
                  <Button variant="light-secondary" disabled={loadingReceipts} aria-label="Reset receipt filters" onClick={handleReset}>
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
              <th>Doc. No.</th>
              <th>Doc. Date</th>
              <th>Shift</th>
              <th>Unit</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {loadingReceipts ? (
              <tr>
                <td colSpan={5} className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                  Loading production receipts...
                </td>
              </tr>
            ) : paginatedReceipts.length ? (
              paginatedReceipts.map((receipt, index) => {
                return (
                  <tr key={receipt.id || `${receipt.documentNumber}-${index}`}>
                    <td>
                      <Button
                        variant="link"
                        className="p-0 fw-semibold text-decoration-none"
                        disabled={loadingReceiptDetailId !== null}
                        onClick={() => handleViewDetail(receipt)}
                      >
                        {String(loadingReceiptDetailId) === String(receipt.id) ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                        ) : null}
                        {receipt.documentNumber}
                      </Button>
                    </td>
                    <td>{formatDate(receipt.documentDate)}</td>
                    <td>{receipt.shift}</td>
                    <td>{receipt.unit}</td>
                    <td>{receipt.comments}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No production receipt data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {!loadingReceipts && receipts.length > 0 ? (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={receipts.length}
            itemLabel="receipts"
          />
        ) : null}
      </MainCard>

      <Modal show={showAddReceipt} onHide={() => !savingReceipt && setShowAddReceipt(false)} fullscreen scrollable>
        <Modal.Header closeButton={!savingReceipt}>
          <Modal.Title>Add Receipt Production</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Label>Posting Date *</Form.Label>
              <Form.Control
                type="date"
                value={receiptForm.DocDate}
                onChange={(event) => {
                  const date = event.target.value;
                  setReceiptForm((current) => ({ ...current, DocDate: date, Series: '' }));
                  fetchSeriesOptions(date);
                }}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Due Date *</Form.Label>
              <Form.Control
                type="date"
                value={receiptForm.DocDueDate}
                onChange={(event) => setReceiptForm((current) => ({ ...current, DocDueDate: event.target.value }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Series *</Form.Label>
              <Select
                styles={compactSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={seriesOptions}
                value={seriesOptions.find((option) => String(option.value) === String(receiptForm.Series)) || null}
                isLoading={loadingSeries}
                isDisabled={loadingSeries}
                placeholder={loadingSeries ? 'Loading series...' : 'Select series'}
                onChange={(option) => setReceiptForm((current) => ({ ...current, Series: option?.value || '' }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Shift</Form.Label>
              <Select
                styles={compactSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={shiftOptions}
                value={shiftOptions.find((option) => option.value === receiptForm.Shift) || null}
                placeholder="Select shift"
                onChange={(option) => setReceiptForm((current) => ({ ...current, Shift: option?.value || '' }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Unit</Form.Label>
              <Select
                styles={compactSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={unitOptions}
                value={
                  unitOptions.find((option) => String(option.value) === String(receiptForm.Unit)) ||
                  (receiptForm.Unit ? { value: receiptForm.Unit, label: receiptForm.Unit } : null)
                }
                isLoading={loadingUnits}
                isDisabled={loadingUnits}
                isClearable
                placeholder={loadingUnits ? 'Loading units...' : 'Select unit'}
                onChange={(option) => setReceiptForm((current) => ({ ...current, Unit: option?.value || '' }))}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={receiptForm.Comments}
                onChange={(event) => setReceiptForm((current) => ({ ...current, Comments: event.target.value }))}
              />
            </Col>
            {[
              ['WhsCode', 'warehouses', warehouseOptions, 'Warehouse', loadingWarehouses],
              ['OcrCode', 'branches', ocrOptions.branch, 'Branch', loadingOcr],
              ['OcrCode2', 'business_units', ocrOptions.businessUnit, 'Business Unit', loadingOcr],
              ['OcrCode3', 'departments', ocrOptions.department, 'Department', loadingOcr]
            ].map(([field, assignmentKey, options, label, isLoading]) => (
              <Col md={3} key={field}>
                <Form.Label>{label}</Form.Label>
                <Select
                  styles={compactSelectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={options}
                  value={
                    options.find((option) => String(option.value) === String(receiptForm[field])) ||
                    (receiptForm[field] ? { value: receiptForm[field], label: receiptForm[field] } : null)
                  }
                  isLoading={isLoading}
                  isDisabled={isLoading || organizationAssignments[assignmentKey].length > 0}
                  placeholder={`Select ${label.toLowerCase()}`}
                  onChange={(option) => updateReceiptHeaderField(field, option?.value || '')}
                />
              </Col>
            ))}
          </Row>

          <Stack direction="horizontal" className="justify-content-between mb-2">
            <h6 className="mb-0">Items</h6>
            <Button size="sm" variant="outline-primary" onClick={handleOpenBomSelection}>
              <i className="ti ti-plus me-1" /> Add PDO
            </Button>
          </Stack>
          <Table responsive bordered className="align-middle mb-0">
            <thead>
              <tr>
                <th>Item</th>
                <th>UOM</th>
                <th>Plan Qty</th>
                <th>Complete Qty</th>
                <th>Stock</th>
                <th>Qty</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {receiptForm.Lines.length ? (
                receiptForm.Lines.map((line, index) => (
                  <tr key={index} className={cannotPostReceiptLine(line) ? 'table-warning' : ''}>
                    <td style={{ minWidth: 170 }}>
                      <div className="fw-semibold">{line.ItemCode || '-'}</div>
                      <div className="text-muted f-12">{line.ItemName || '-'}</div>
                    </td>
                    <td style={{ minWidth: 100 }}>{line.UomCode || '-'}</td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control size="sm" type="number" value={line.PlannedQty} readOnly />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control size="sm" type="number" value={line.CmpltQty} readOnly isInvalid={cannotPostReceiptLine(line)} />
                      {cannotPostReceiptLine(line) ? (
                        <Form.Text className="text-danger">Complete Qty must be less than Plan Qty.</Form.Text>
                      ) : null}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        size="sm"
                        value={
                          loadingItemStocks
                            ? 'Loading...'
                            : (itemStocks[getStockKey(line.ItemCode, line.WhsCode || receiptForm.WhsCode)] ?? '-')
                        }
                        readOnly
                      />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        size="sm"
                        type="number"
                        min="0"
                        max={getRemainingReceiptQuantity(line)}
                        step="any"
                        value={line.Quantity}
                        disabled={cannotPostReceiptLine(line)}
                        onChange={(event) => {
                          const value = event.target.value;
                          const quantity = value === '' ? '' : Math.min(Math.max(Number(value), 0), getRemainingReceiptQuantity(line));
                          updateReceiptLine(index, { Quantity: quantity });
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
                        onClick={() => handleDeleteReceiptLine(index)}
                      >
                        <i className="ti ti-trash" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No items added. Click Add PDO to select Production Orders.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={savingReceipt} onClick={() => setShowAddReceipt(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={savingReceipt || loadingSeries} onClick={handleSubmitReceipt}>
            {savingReceipt ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
            {savingReceipt ? 'Saving...' : 'Save Receipt'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showBomModal}
        onHide={() => !loadingBoms && !loadingBomDetail && setShowBomModal(false)}
        size="xl"
        className="production-nested-modal"
        backdropClassName="production-nested-modal-backdrop"
        dialogClassName="receipt-pdo-selection-modal"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingBoms && !loadingBomDetail}>
          <Modal.Title>Select Production Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            className="mb-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchBoms(bomSearch.trim(), pdoFilters);
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={pdoFilters.from}
                  onChange={(event) => dispatch(setReceiptPdoFilters({ ...pdoFilters, from: event.target.value }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={pdoFilters.to}
                  onChange={(event) => dispatch(setReceiptPdoFilters({ ...pdoFilters, to: event.target.value }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Unit</Form.Label>
                <Select
                  styles={compactSelectStyles}
                  options={unitOptions}
                  value={unitOptions.find((option) => String(option.value) === String(pdoFilters.unit)) || null}
                  isLoading={loadingUnits}
                  isClearable
                  placeholder="All units"
                  onChange={(option) => dispatch(setReceiptPdoFilters({ ...pdoFilters, unit: option?.value || '' }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Search PDO</Form.Label>
                <InputGroup>
                  <Form.Control
                    value={bomSearch}
                    onChange={(event) => dispatch(setReceiptPdoSearch(event.target.value))}
                    placeholder="Order number or product"
                  />
                  <Button type="submit" disabled={loadingBoms}>
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
                <th>Planned Qty</th>
                <th>Complete Qty</th>
              </tr>
            </thead>
            <tbody>
              {loadingBoms ? (
                <tr>
                  <td colSpan={5}>
                    <LoaderData />
                  </td>
                </tr>
              ) : boms.length ? (
                boms.map((bom) => {
                  const cannotSelect = cannotPostProductionOrder(bom);
                  const isSelected = selectedPdoIds.includes(String(bom.id));
                  const toggleSelection = () => {
                    if (!cannotSelect) handleTogglePdo(bom, !isSelected);
                  };

                  return (
                    <tr
                      key={bom.id}
                      className={cannotSelect ? 'table-warning' : isSelected ? 'table-primary' : ''}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-disabled={cannotSelect}
                      tabIndex={cannotSelect ? -1 : 0}
                      style={{ cursor: cannotSelect ? 'not-allowed' : 'pointer' }}
                      onClick={toggleSelection}
                      onKeyDown={(event) => {
                        if (!cannotSelect && ['Enter', ' '].includes(event.key)) {
                          event.preventDefault();
                          toggleSelection();
                        }
                      }}
                    >
                      <td className="text-center">
                        {cannotSelect ? (
                          <i className="ti ti-alert-triangle text-danger" title="This PDO cannot be posted" />
                        ) : (
                          <Form.Check
                            type="checkbox"
                            aria-label={`Select PDO ${bom.number}`}
                            checked={isSelected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => handleTogglePdo(bom, event.target.checked)}
                          />
                        )}
                      </td>
                      <td className="fw-semibold">{bom.number}</td>
                      <td>
                        <div className="fw-semibold">{bom.itemCode || '-'}</div>
                        <div className="text-muted f-12">{bom.itemName || '-'}</div>
                      </td>
                      <td>{numberFormatter.format(bom.plannedQuantity)}</td>
                      <td>
                        <div>{numberFormatter.format(bom.completedQuantity)}</div>
                        {cannotSelect ? (
                          <div className="text-danger f-12">
                            <i className="ti ti-alert-triangle me-1" /> Cannot be posted
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No Production Order data found for the selected date filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={loadingBomDetail} onClick={() => setShowBomModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={loadingBomDetail || !selectedPdoIds.length} onClick={handleAddSelectedPdos}>
            {loadingBomDetail ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-plus me-1" />}
            {loadingBomDetail ? 'Adding...' : `Add Selected PDO (${selectedPdoIds.length})`}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedReceipt)} onHide={() => setSelectedReceipt(null)} fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Production Receipt Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReceipt
            ? (() => {
                const receipt = normalizeReceipt(selectedReceipt.header);
                const items = selectedReceipt.items;
                const itemColumns = [...new Set(items.flatMap((item) => Object.keys(item || {})))].filter(
                  (column) => !isHiddenItemColumn(column) && normalizeColumnKey(column) !== 'itemname'
                );

                return (
                  <Stack gap={4}>
                    <Card className="border mb-0">
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document No.</Form.Label>
                            <div className="fw-semibold">{receipt.documentNumber}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                            <div>{formatDate(receipt.documentDate)}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Shift</Form.Label>
                            <div>{receipt.shift}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Unit</Form.Label>
                            <div>{receipt.unit}</div>
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="f-12 text-muted">Comments</Form.Label>
                            <div>{receipt.comments}</div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    <Card className="border mb-0">
                      <Card.Header>
                        <h6 className="mb-0">Items</h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <Table responsive hover className="mb-0 align-middle">
                          <thead>
                            <tr>
                              <th>#</th>
                              {itemColumns.map((column) => (
                                <th key={column}>{getItemColumnLabel(column)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.length ? (
                              items.map((item, index) => (
                                <tr key={item?.LineNum ?? item?.line_num ?? item?.id ?? index}>
                                  <td>{index + 1}</td>
                                  {itemColumns.map((column) => (
                                    <td key={column}>
                                      {normalizeColumnKey(column) === 'itemcode' ? (
                                        <>
                                          <div className="fw-semibold">{formatItemValue(item?.[column], column)}</div>
                                          <div className="text-muted f-12">
                                            {formatItemValue(item?.itemName ?? item?.ItemName ?? item?.item_name, 'itemname')}
                                          </div>
                                        </>
                                      ) : (
                                        formatItemValue(item?.[column], column)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={Math.max(itemColumns.length + 1, 1)} className="text-center text-muted py-4">
                                  No receipt item detail found.
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
          <Button variant="light-secondary" onClick={() => setSelectedReceipt(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
