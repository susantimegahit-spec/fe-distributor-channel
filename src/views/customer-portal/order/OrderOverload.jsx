import { Fragment, useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Overlay, Row, Spinner, Stack, Table } from 'react-bootstrap';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

import MainCard from 'components/MainCard';
import FormDatePicker from 'components/FormDatePicker';
import TablePagination from 'components/TablePagination';
import LogisticsServices from 'services/logistics/LogisticsServices';
import DistributorServices from 'services/customer-portal/DistributorServices';
import EmployeeServices from 'services/customer-portal/EmployeeServices';
import OrderServices from 'services/customer-portal/OrderServices';
import PriceServices from 'services/customer-portal/PriceServices';
import ProductServices from 'services/customer-portal/ProductServices';
import PromoServices from 'services/customer-portal/PromoServices';
import WarehouseServices from 'services/customer-portal/WarehouseServices';
import { useAlert } from 'utils/alertContext';
import { getCookies } from 'utils/cookies';

const DEFAULT_PAGE_SIZE = 15;
const STATUSES = ['PENDING_ADJUSTMENT', 'UNLOADED', 'RESOLVED', 'CANCELLED'];
const EMPTY_FILTERS = { search: '', status: '', picklist_no: '', date_from: '', date_to: '' };
const EMPTY_OPTIONS = {
  items: [],
  warehouses: [],
  employees: [],
  vats: [],
  ocr1: [],
  ocr2: [],
  ocr3: [],
  billTo: [],
  shipTo: [],
  discounts: [],
  tradePromos: []
};
const SELECT_STYLES = {
  container: (provided) => ({ ...provided, minWidth: 180 }),
  control: (provided) => ({ ...provided, minHeight: 31 }),
  valueContainer: (provided) => ({ ...provided, paddingTop: 0, paddingBottom: 0 }),
  menuPortal: (provided) => ({ ...provided, zIndex: 1090 })
};
const DISCOUNT_VALUE_TYPES = [
  { value: 'nominal', label: 'Nominal' },
  { value: 'percent', label: 'Percent' },
  { value: 'kg', label: 'Kg' }
];
const EMPTY_ADJUSTMENT = {
  sales_order_id: '',
  DocEntry: '',
  NumAtCard: '',
  DocDate: '',
  DocDueDate: '',
  SlpCode: '',
  CntctCode: '',
  PayToCode: '',
  Address: '',
  ShipToCode: '',
  Address2: '',
  comments: '',
  DiscountPercent: '',
  DocTotal: '',
  IdDiskon: '',
  AddonId: '',
  UserId: '',
  action_taken: '',
  lines: []
};

const valueOf = (item, keys, fallback = '-') => {
  for (const key of keys) {
    const value = key.split('.').reduce((source, path) => source?.[path], item);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
};

const getPayload = (response) => response?.data?.data ?? response?.data ?? response ?? {};

const getDetail = (response) => {
  const payload = getPayload(response);
  return payload?.overload ?? payload?.record ?? payload?.data ?? payload;
};

const getRows = (response) => {
  const payload = getPayload(response);
  if (Array.isArray(payload)) return payload;
  for (const source of [payload?.overloads, payload?.records, payload]) {
    if (Array.isArray(source)) return source;
    for (const key of ['data', 'items', 'rows', 'results', 'overloads']) {
      if (Array.isArray(source?.[key])) return source[key];
    }
  }
  return [];
};

const getPagination = (response, rowCount, requestedPage, requestedPageSize) => {
  const payload = getPayload(response);
  const collection = payload?.overloads ?? payload?.records ?? payload;
  const meta = collection?.meta ?? collection?.pagination ?? payload?.meta ?? payload?.pagination ?? collection;
  const parsedTotal = Number(meta?.total ?? meta?.total_items ?? payload?.total);
  const total = Number.isFinite(parsedTotal) ? parsedTotal : rowCount;
  const currentPage = Number(meta?.current_page ?? meta?.currentPage ?? meta?.page ?? requestedPage) || requestedPage;
  const perPage = Number(meta?.per_page ?? meta?.perPage ?? requestedPageSize);
  const parsedPageCount = Number(meta?.last_page ?? meta?.lastPage ?? meta?.total_pages);
  const pageCount = requestedPageSize <= 0 ? 1 : parsedPageCount || Math.ceil(total / (perPage > 0 ? perPage : requestedPageSize)) || 1;
  return { total, currentPage, pageCount: Math.max(pageCount, 1) };
};

const formatStatus = (value) =>
  String(value || '-')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const statusVariant = (value) =>
  ({ RESOLVED: 'success', CANCELLED: 'secondary', UNLOADED: 'info', PENDING_ADJUSTMENT: 'warning' })[String(value || '').toUpperCase()] ||
  'warning';

const formatWeight = (value) => {
  const weight = Number(value);
  return Number.isFinite(weight) ? `${weight.toLocaleString('id-ID')} KG` : '-';
};

const formatNumber = (value, maximumFractionDigits = 2) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('id-ID', { maximumFractionDigits }) : '-';
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
};

const toDateInput = (value) => {
  if (!value) return '';
  const matchedDate = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchedDate) return matchedDate[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const itemSalesOrderId = (item) => valueOf(item, ['sales_order_id', 'order_id', 'sales_order.id', 'sales_order.sales_order_id'], '');

const itemSalesOrderLabel = (item) =>
  valueOf(item, ['sales_order.order_no', 'order_no', 'so_number', 'sales_order.doc_num', 'sales_order_id'], 'Sales Order');

const toAdjustmentLine = (item, index) => ({
  _key: `${valueOf(item, ['id', 'item_code', 'ItemCode'], 'line')}-${index}`,
  sales_order_id: itemSalesOrderId(item),
  _itemName: String(valueOf(item, ['item_name', 'ItemName', 'Dscription'], '')),
  _whsName: String(valueOf(item, ['whs_name', 'warehouse.whs_name'], '')),
  _unitPrice: valueOf(item, ['unit_price', 'UnitPrice', 'Price'], ''),
  _ocrName: String(valueOf(item, ['ocr_name', 'ocr.ocr_name'], '')),
  _ocrName2: String(valueOf(item, ['ocr_name2', 'ocr2.ocr_name'], '')),
  _ocrName3: String(valueOf(item, ['ocr_name3', 'ocr3.ocr_name'], '')),
  LineNum: Number(valueOf(item, ['LineNum', 'line_num', 'lineNum'], index)),
  ItemCode: String(valueOf(item, ['ItemCode', 'item_code'], '')),
  Quantity: valueOf(item, ['Quantity', 'quantity', 'pick_qty', 'ordered_qty'], ''),
  WhsCode: String(valueOf(item, ['WhsCode', 'whs_code', 'warehouse_code'], '')),
  UomEntry: valueOf(item, ['UomEntry', 'uom_entry'], ''),
  UnitMsr: String(valueOf(item, ['UnitMsr', 'unit_msr', 'uom'], '')),
  LineTotal: valueOf(item, ['LineTotal', 'line_total'], 0),
  DiscPrcnt: valueOf(item, ['DiscPrcnt', 'disc_prcnt', 'discount_percent'], 0),
  VatGroup: String(valueOf(item, ['VatGroup', 'vat_group'], '')),
  TaxCode: String(valueOf(item, ['TaxCode', 'tax_code'], '')),
  OcrCode: String(valueOf(item, ['OcrCode', 'ocr_code'], '')),
  OcrCode2: String(valueOf(item, ['OcrCode2', 'ocr_code2'], '')),
  OcrCode3: String(valueOf(item, ['OcrCode3', 'ocr_code3'], ''))
});

const newAdjustmentLine = () => ({
  _key: `new-${Date.now()}-${Math.random()}`,
  sales_order_id: '',
  _itemName: '',
  _whsName: '',
  _unitPrice: '',
  _ocrName: '',
  _ocrName2: '',
  _ocrName3: '',
  LineNum: -1,
  ItemCode: '',
  Quantity: '',
  WhsCode: '',
  UomEntry: '',
  UnitMsr: '',
  LineTotal: 0,
  DiscPrcnt: 0,
  VatGroup: '',
  TaxCode: '',
  OcrCode: '',
  OcrCode2: '',
  OcrCode3: ''
});

const option = (value, label, extra = {}) =>
  value === undefined || value === null || value === '' ? null : { value, label: label || value, ...extra };
const selectedOption = (options, value, label = '') =>
  options.find((item) => String(item.value) === String(value)) || option(value, label || value);
const uniqueOptions = (options) => Array.from(new Map(options.filter(Boolean).map((item) => [String(item.value), item])).values());

export default function OrderOverload() {
  const { showAlert } = useAlert();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOverload, setSelectedOverload] = useState(null);
  const [overloadDetail, setOverloadDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [adjustingOverload, setAdjustingOverload] = useState(null);
  const [adjustment, setAdjustment] = useState(EMPTY_ADJUSTMENT);
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [adjustmentOptions, setAdjustmentOptions] = useState(EMPTY_OPTIONS);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountLines, setDiscountLines] = useState([
    {
      name: null,
      remarks: '',
      value: '',
      section: 'primary',
      valueType: 'nominal',
      calculationValue: '',
      kgItemIndexes: [],
      claimBatch: null
    },
    {
      name: null,
      remarks: '',
      value: '',
      section: 'other',
      valueType: 'nominal',
      calculationValue: '',
      kgItemIndexes: [],
      claimBatch: null
    },
    {
      name: null,
      remarks: '',
      value: '',
      section: 'tradePromo',
      valueType: 'nominal',
      calculationValue: '',
      kgItemIndexes: [],
      claimBatch: null
    }
  ]);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [claimOptions, setClaimOptions] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const fetchOverloads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await LogisticsServices.getOverload({
        ...appliedFilters,
        per_page: DEFAULT_PAGE_SIZE,
        page: currentPage
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load overload data.');
      }
      const nextRows = getRows(response);
      const pagination = getPagination(response, nextRows.length, currentPage, DEFAULT_PAGE_SIZE);
      setRows(nextRows);
      setTotal(pagination.total);
      setPageCount(pagination.pageCount);
      if (pagination.currentPage !== currentPage) setCurrentPage(pagination.currentPage);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setPageCount(1);
      showAlert(error?.response?.data?.message || error.message || 'Failed to load overload data.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage, showAlert]);

  useEffect(() => {
    fetchOverloads();
  }, [fetchOverloads]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = (event) => {
    event.preventDefault();
    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      showAlert('Date From cannot be later than Date To.', 'warning');
      return;
    }
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  };
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const openOverloadDetail = async (item) => {
    const picklistId = valueOf(item, ['picklist_id', 'picklist.id', 'id'], '');
    if (!picklistId) {
      showAlert('Picklist ID is unavailable.', 'warning');
      return;
    }

    setSelectedOverload(item);
    setOverloadDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await LogisticsServices.getOverloadDetail(picklistId);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load overload detail.');
      }
      setOverloadDetail(getDetail(response));
    } catch (error) {
      setDetailError(error?.response?.data?.message || error.message || 'Failed to load overload detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeOverloadDetail = () => {
    if (detailLoading) return;
    setSelectedOverload(null);
    setOverloadDetail(null);
    setDetailError('');
  };

  const loadAdjustmentOptions = async (loadedDetail, items) => {
    const order = { ...(items[0]?.sales_order ?? {}), ...(loadedDetail?.sales_order ?? {}) };
    const details = Array.isArray(items[0]?.sales_order?.details) ? items[0].sales_order.details : [];
    const fallback = {
      items: details.map((line) => option(line.item_code, line.item_name, { unitMsr: line.unit_msr, uomEntry: line.uom_entry })),
      warehouses: details.map((line) => option(line.whs_code, line.whs_name)),
      employees: [option(order.slp_code, items[0]?.sales_order?.sales_employee_name || order.slp_code)],
      vats: details.map((line) => option(line.vat_group, line.vat_name)),
      ocr1: details.map((line) => option(line.ocr_code, line.ocr_name)),
      ocr2: details.map((line) => option(line.ocr_code2, line.ocr_name2)),
      ocr3: details.map((line) => option(line.ocr_code3, line.ocr_name3)),
      billTo: [option(order.pay_to_code, order.address, { address: order.address })],
      shipTo: [option(order.ship_to_code, order.address2, { address: order.address2 })]
    };

    const requests = [
      ProductServices.getAllProduct(),
      WarehouseServices.getAllWarehouse(''),
      EmployeeServices.getAllEmployee(''),
      OrderServices.getVats(),
      DistributorServices.getOcrByType(1),
      DistributorServices.getOcrByType(2),
      DistributorServices.getOcrByType(3),
      OrderServices.getDiscType(),
      order.card_code ? DistributorServices.getAddress(order.card_code) : Promise.resolve(null)
    ];
    const results = await Promise.allSettled(requests);
    const dataAt = (index) =>
      results[index]?.status === 'fulfilled' && Array.isArray(results[index].value?.data?.data) ? results[index].value.data.data : [];
    const addresses = dataAt(8);
    const discountOptions = dataAt(7)
      .filter((item) => Number(item?.status ?? 1) === 1)
      .map((item) => option(item.fld_value, item.descr || item.fld_value, { description: item.descr || '' }))
      .filter(Boolean);
    const isTradePromo = (item) => `${item.value} ${item.description}`.toLowerCase().includes('promo');
    setAdjustmentOptions({
      items: uniqueOptions([
        ...fallback.items,
        ...dataAt(0).map((item) => option(item.item_code, item.item_name, { unitMsr: item.sal_unit_msr, uomEntry: item.suom_entry }))
      ]),
      warehouses: uniqueOptions([...fallback.warehouses, ...dataAt(1).map((item) => option(item.whs_code, item.whs_name))]),
      employees: uniqueOptions([
        ...fallback.employees,
        ...dataAt(2).map((item) => option(item.slp_code, `${item.slp_code || '-'} - ${item.slp_name || '-'}`))
      ]),
      vats: uniqueOptions([...fallback.vats, ...dataAt(3).map((item) => option(item.code, item.name))]),
      ocr1: uniqueOptions([...fallback.ocr1, ...dataAt(4).map((item) => option(item.ocr_code, item.ocr_name))]),
      ocr2: uniqueOptions([...fallback.ocr2, ...dataAt(5).map((item) => option(item.ocr_code, item.ocr_name))]),
      ocr3: uniqueOptions([...fallback.ocr3, ...dataAt(6).map((item) => option(item.ocr_code, item.ocr_name))]),
      discounts: uniqueOptions(discountOptions.filter((item) => !isTradePromo(item))),
      tradePromos: uniqueOptions(discountOptions.filter(isTradePromo)),
      billTo: uniqueOptions([
        ...fallback.billTo,
        ...addresses.filter((item) => item.AdresType === 'B').map((item) => option(item.Address, item.Street, { address: item.Street }))
      ]),
      shipTo: uniqueOptions([
        ...fallback.shipTo,
        ...addresses.filter((item) => item.AdresType !== 'B').map((item) => option(item.Address, item.Street, { address: item.Street }))
      ])
    });
  };

  const openAdjustment = async (item) => {
    const picklistId = valueOf(item, ['picklist_id', 'picklist.id', 'id'], '');
    if (!picklistId) {
      showAlert('Picklist ID is unavailable.', 'warning');
      return;
    }

    setAdjustingOverload({ ...item, picklistId });
    setAdjustment(EMPTY_ADJUSTMENT);
    setAdjustmentOptions(EMPTY_OPTIONS);
    setAdjustmentLoading(true);
    try {
      const response = await LogisticsServices.getOverloadDetail(picklistId);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load overload detail.');
      }
      const loadedDetail = getDetail(response);
      const loadedLatest = loadedDetail?.latest_overload ?? loadedDetail?.latestOverload ?? loadedDetail;
      const payloadTemplate = loadedDetail?.adjust_payload_template ?? {};
      const items = Array.isArray(loadedDetail?.items) ? loadedDetail.items : [];
      const salesOrder = loadedDetail?.sales_order ?? items.find((detailItem) => detailItem?.sales_order)?.sales_order;
      const sourceLines = Array.isArray(salesOrder?.lines)
        ? salesOrder.lines
        : Array.isArray(payloadTemplate?.Lines)
          ? payloadTemplate.Lines
          : Array.isArray(payloadTemplate?.lines)
            ? payloadTemplate.lines
            : items.length
              ? items
              : Array.isArray(loadedLatest?.items_snapshot)
                ? loadedLatest.items_snapshot
                : [];
      const salesOrderLines = [
        ...(Array.isArray(items[0]?.sales_order?.details) ? items[0].sales_order.details : []),
        ...(Array.isArray(salesOrder?.lines) ? salesOrder.lines : [])
      ];
      const lines = sourceLines.map((line, index) => {
        const matchingLine = salesOrderLines.find(
          (detailLine) =>
            String(valueOf(detailLine, ['line_num', 'LineNum'], '')) === String(valueOf(line, ['line_num', 'LineNum'], '')) ||
            String(valueOf(detailLine, ['item_code', 'ItemCode'], '')) === String(valueOf(line, ['item_code', 'ItemCode'], ''))
        );
        return toAdjustmentLine({ ...matchingLine, ...line }, index);
      });
      const salesOrderIds = [
        ...new Set(
          [salesOrder?.id, ...items.map((item) => itemSalesOrderId(item)), ...lines.map((line) => line.sales_order_id)]
            .filter((id) => id !== undefined && id !== null && id !== '')
            .map(String)
        )
      ];
      const headerValue = (keys, fallback = '') =>
        valueOf(payloadTemplate, keys, valueOf(loadedDetail, keys, valueOf(loadedLatest, keys, fallback)));
      setAdjustingOverload((current) => ({ ...current, detail: loadedDetail, items }));
      setAdjustment({
        sales_order_id: salesOrderIds.length === 1 ? String(salesOrderIds[0]) : '',
        DocEntry: headerValue(['DocEntry', 'doc_entry', 'sales_order.DocEntry', 'sales_order.doc_entry']),
        NumAtCard: headerValue(['NumAtCard', 'num_at_card', 'sales_order.NumAtCard', 'sales_order.num_at_card', 'sales_order.po_number']),
        DocDate: toDateInput(headerValue(['DocDate', 'doc_date', 'sales_order.DocDate', 'sales_order.doc_date'])),
        DocDueDate: toDateInput(headerValue(['DocDueDate', 'doc_due_date', 'sales_order.DocDueDate', 'sales_order.doc_due_date'])),
        SlpCode: headerValue(['SlpCode', 'slp_code', 'sales_order.SlpCode', 'sales_order.slp_code']),
        CntctCode: headerValue(['CntctCode', 'cntct_code', 'sales_order.CntctCode', 'sales_order.cntct_code']),
        PayToCode: headerValue(['PayToCode', 'pay_to_code', 'sales_order.PayToCode', 'sales_order.pay_to_code']),
        Address: headerValue(['Address', 'address', 'sales_order.Address', 'sales_order.address']),
        ShipToCode: headerValue(['ShipToCode', 'ship_to_code', 'sales_order.ShipToCode', 'sales_order.ship_to_code']),
        Address2: headerValue(['Address2', 'address2', 'sales_order.Address2', 'sales_order.address2']),
        comments: String(headerValue(['Comments', 'comments', 'sales_order.comments', 'notes'])),
        DiscountPercent: headerValue([
          'DiscountPercent',
          'discount_percent',
          'sales_order.DiscountPercent',
          'sales_order.discount_percent',
          'sales_order.disc_percent'
        ]),
        DocTotal: headerValue(['DocTotal', 'doc_total', 'sales_order.DocTotal', 'sales_order.doc_total']),
        IdDiskon: headerValue(['IdDiskon', 'id_diskon', 'sales_order.IdDiskon', 'sales_order.id_diskon', 'sales_order.id_discount']),
        AddonId: headerValue(['AddonId', 'addon_id', 'sales_order.AddonId', 'sales_order.addon_id']),
        UserId: headerValue(['UserId', 'user_id', 'sales_order.UserId', 'sales_order.user_id']),
        action_taken: String(headerValue(['action_taken'])),
        lines
      });
      const initialDiscountPercent = Number(headerValue(['DiscountPercent', 'discount_percent', 'sales_order.disc_percent'], 0));
      const initialSubtotal = lines.reduce((totalValue, line) => totalValue + (Number(line.LineTotal) || 0), 0);
      const initialDiscountId = headerValue(['IdDiskon', 'id_diskon', 'sales_order.id_discount'], '');
      setDiscountLines([
        {
          name: initialDiscountId ? option(initialDiscountId, initialDiscountId) : null,
          remarks: '',
          value: initialDiscountPercent > 0 ? (initialSubtotal * initialDiscountPercent) / 100 : '',
          section: 'primary',
          valueType: 'nominal',
          calculationValue: '',
          kgItemIndexes: [],
          claimBatch: null
        },
        {
          name: null,
          remarks: '',
          value: '',
          section: 'other',
          valueType: 'nominal',
          calculationValue: '',
          kgItemIndexes: [],
          claimBatch: null
        },
        {
          name: null,
          remarks: '',
          value: '',
          section: 'tradePromo',
          valueType: 'nominal',
          calculationValue: '',
          kgItemIndexes: [],
          claimBatch: null
        }
      ]);
      await loadAdjustmentOptions(loadedDetail, items);
    } catch (error) {
      showAlert(error?.response?.data?.message || error.message || 'Failed to load overload detail.', 'danger');
      setAdjustingOverload(null);
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const closeAdjustment = () => {
    if (adjustmentSaving) return;
    setShowDiscountModal(false);
    setAdjustingOverload(null);
    setAdjustment(EMPTY_ADJUSTMENT);
  };

  const updateAdjustmentLine = (key, field, value) => {
    setAdjustment((current) => ({
      ...current,
      lines: current.lines.map((line) => (line._key === key ? { ...line, [field]: value } : line))
    }));
  };

  const selectAdjustmentItem = async (key, selected) => {
    setAdjustment((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line._key === key
          ? {
              ...line,
              ItemCode: selected?.value || '',
              _itemName: selected?.label || '',
              UnitMsr: selected?.unitMsr || '',
              UomEntry: selected?.uomEntry || ''
            }
          : line
      )
    }));
    if (!selected?.value) return;
    try {
      const response = await PriceServices.getPriceByItem(selected.value);
      const priceRecord = Array.isArray(response?.data?.data) ? response.data.data[0] : null;
      const price = valueOf(priceRecord, ['price', 'unit_price'], '');
      setAdjustment((current) => ({
        ...current,
        lines: current.lines.map((line) => (line._key === key ? { ...line, _unitPrice: price } : line))
      }));
    } catch {
      // Keep the existing price when the distributor price endpoint is unavailable.
    }
  };

  const visibleAdjustmentLines = adjustment.sales_order_id
    ? adjustment.lines.filter((line) => line.sales_order_id === '' || String(line.sales_order_id) === String(adjustment.sales_order_id))
    : adjustment.lines;

  const adjustmentSalesOrders = adjustingOverload?.items
    ? Array.from(
        new Map(adjustingOverload.items.map((item) => [String(itemSalesOrderId(item)), itemSalesOrderLabel(item)]).filter(([id]) => id)),
        ([id, label]) => ({ id, label })
      )
    : [];
  const adjustmentSubtotal = visibleAdjustmentLines.reduce((totalValue, line) => totalValue + (Number(line.LineTotal) || 0), 0);
  const adjustmentDiscount = discountLines.reduce((totalValue, line) => totalValue + (Number(line.value) || 0), 0);
  const adjustmentGrandTotal = Math.max(adjustmentSubtotal - adjustmentDiscount, 0);
  const primaryDiscountTotal = discountLines
    .filter((line) => line.section === 'primary')
    .reduce((totalValue, line) => totalValue + (Number(line.value) || 0), 0);
  const primaryDiscountReference = Math.max(adjustmentSubtotal - primaryDiscountTotal, 0);
  const tradePromoTotal = discountLines
    .filter((line) => line.section === 'tradePromo')
    .reduce((totalValue, line) => totalValue + (Number(line.value) || 0), 0);
  const maximumTradePromo = primaryDiscountReference * 0.2;
  const adjustmentTotalKg = Number(valueOf(adjustingOverload, ['detail.total_weight'], 0)) || 0;
  const kgMultiplierItemOptions = visibleAdjustmentLines.map((line, index) => {
    const matchingItem = adjustingOverload?.detail?.items?.find((item) => String(item.item_code) === String(line.ItemCode));
    const totalKg = Number(matchingItem?.total_weight) || 0;
    return {
      value: index,
      totalKg,
      label: `${line._itemName || line.ItemCode} · Qty ${formatNumber(line.Quantity, 4)} · ${formatNumber(totalKg, 4)} Kg`
    };
  });

  const updateDiscountLine = (index, changes) => {
    setDiscountLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...changes } : line)));
  };

  const updateDiscountCalculation = (index, valueType, calculationValue, kgItemIndexes) => {
    const normalizedValue = Math.max(Number(calculationValue) || 0, 0);
    const selectedKg = kgMultiplierItemOptions
      .filter((item) => (kgItemIndexes || []).some((selectedIndex) => String(selectedIndex) === String(item.value)))
      .reduce((totalValue, item) => totalValue + item.totalKg, 0);
    const amount =
      valueType === 'percent'
        ? (adjustmentSubtotal * Math.min(normalizedValue, 100)) / 100
        : valueType === 'kg'
          ? selectedKg * normalizedValue
          : normalizedValue;
    updateDiscountLine(index, { valueType, calculationValue, kgItemIndexes: kgItemIndexes || [], value: amount });
  };

  const addDiscountLine = (section) =>
    setDiscountLines((current) => [
      ...current,
      { name: null, remarks: '', value: '', section, valueType: 'nominal', calculationValue: '', kgItemIndexes: [], claimBatch: null }
    ]);

  const openDiscountModal = async () => {
    setShowDiscountModal(true);
    const customerCode = adjustingOverload?.detail?.items?.[0]?.sales_order?.card_code;
    if (!customerCode) return;
    setClaimsLoading(true);
    try {
      const response = await PromoServices.getClaimBatches({ customer_code: customerCode });
      const payload = response?.data?.data;
      const claims = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object'
          ? (payload.data ?? payload.batches ?? payload.approved_claims ?? payload.approvedClaims ?? payload.claims ?? payload.items ?? [])
          : [];
      const nextOptions = claims
        .map((claim, index) => {
          const id = claim.batch_id || claim.batchId || claim.claim_batch_id || claim.claimBatchId || claim.ledger_id || claim.id || index;
          const batchNo =
            claim.ref_number ||
            claim.refNumber ||
            claim.reference_no ||
            claim.claim_no ||
            claim.batch_no ||
            claim.batch_code ||
            `CLAIM-${id}`;
          const branchName =
            claim.branch_name || claim.branchName || claim.branch || claim.cabang || claim.depo || claim.customer_name || customerCode;
          const amount = Number(claim.total_diskon_verified ?? 0);
          const claimDate = claim.created_at || claim.uploaded_at || claim.claim_date || claim.transaction_date || claim.date || '';
          return { value: String(id), batchNo, branchName, amount, claimDate, originalIndex: index };
        })
        .filter((claim) => claim.amount > 0)
        .sort(
          (left, right) =>
            (Date.parse(left.claimDate) || Number.MAX_SAFE_INTEGER) - (Date.parse(right.claimDate) || Number.MAX_SAFE_INTEGER) ||
            left.originalIndex - right.originalIndex
        )
        .map((claim, index) => ({
          ...claim,
          label: `${index + 1}. ${claim.batchNo} · ${claim.branchName} · Rp ${formatNumber(claim.amount)}${claim.claimDate ? ` · ${formatDateTime(claim.claimDate)}` : ''}`
        }));
      setClaimOptions(nextOptions);
    } catch (error) {
      setClaimOptions([]);
      showAlert(error?.response?.data?.message || error.message || 'Failed to load trade promo claims.', 'danger');
    } finally {
      setClaimsLoading(false);
    }
  };

  const selectClaimBatch = (index, selected) => {
    const usedAmount = discountLines.reduce(
      (totalValue, line, lineIndex) => totalValue + (lineIndex === index || line.section !== 'tradePromo' ? 0 : Number(line.value) || 0),
      0
    );
    const remainingMaximum = Math.max(maximumTradePromo - usedAmount, 0);
    const amount = selected ? Math.min(Number(selected.amount) || 0, remainingMaximum) : 0;
    updateDiscountLine(index, {
      claimBatch: selected,
      value: amount,
      remarks: selected ? `${selected.batchNo} · ${selected.branchName}` : ''
    });
  };

  const saveDiscount = async () => {
    if (tradePromoTotal > maximumTradePromo) {
      showAlert(`Total Trade Promo cannot exceed Rp ${formatNumber(maximumTradePromo)}.`, 'warning');
      return;
    }
    const activeDiscountLines = discountLines.filter((line) => Number(line.value) > 0 || line.name?.value);
    const invalidLine = activeDiscountLines.some((line) => !line.name?.value || Number(line.value) <= 0);
    if (!activeDiscountLines.length || invalidLine) {
      showAlert('Complete discount type and amount.', 'warning');
      return;
    }
    const order = adjustingOverload?.detail?.items?.[0]?.sales_order ?? {};
    setDiscountSaving(true);
    try {
      const response = await OrderServices.postDiscount({
        CardCode: order.card_code,
        CardName: order.customer_name,
        Lines: activeDiscountLines.map((line) => ({
          TypeDiscount: line.name.value,
          Persentase: 0,
          TotalDiscount: Number(line.value) || 0,
          Remarks: line.remarks
        }))
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to save discount.');
      }
      const discountTotal = activeDiscountLines.reduce((totalValue, line) => totalValue + (Number(line.value) || 0), 0);
      setAdjustment((current) => ({
        ...current,
        IdDiskon: response?.data?.data?.code || current.IdDiskon,
        DiscountPercent: adjustmentSubtotal > 0 ? (discountTotal / adjustmentSubtotal) * 100 : 0,
        DocTotal: Math.max(adjustmentSubtotal - discountTotal, 0)
      }));
      setShowDiscountModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error.message || 'Failed to save discount.', 'danger');
    } finally {
      setDiscountSaving(false);
    }
  };

  const renderAdjustmentDiscountSection = (section, title, description) => {
    const sectionLines = discountLines.map((line, index) => ({ line, index })).filter(({ line }) => line.section === section);
    const options = section === 'tradePromo' ? adjustmentOptions.tradePromos : adjustmentOptions.discounts;

    return (
      <Card className="border mb-0">
        <Card.Header className="py-3">
          <Stack direction="horizontal" className="justify-content-between gap-3">
            <div>
              <h6 className="mb-1">{title}</h6>
              <small className="text-muted">{description}</small>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline-primary"
              data-permission-action="utility"
              onClick={() => addDiscountLine(section)}
              disabled={section === 'tradePromo' && tradePromoTotal >= maximumTradePromo}
            >
              <i className="ti ti-plus me-1" /> Add Discount
            </Button>
          </Stack>
        </Card.Header>
        <Card.Body className="p-0">
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th style={{ minWidth: 210 }}>Category</th>
                {section === 'tradePromo' && <th style={{ minWidth: 320 }}>Claim &amp; Branch Amount (Oldest First)</th>}
                {section !== 'tradePromo' && <th style={{ minWidth: 240 }}>Value Type</th>}
                <th style={{ minWidth: 180 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sectionLines.map(({ line, index }) => (
                <Fragment key={`${section}-${index}`}>
                  <tr className={index ? 'border-top' : ''}>
                    <td>
                      {section !== 'tradePromo' ? (
                        <CreatableSelect
                          styles={SELECT_STYLES}
                          menuPosition="fixed"
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          options={options}
                          value={line.name}
                          onChange={(selected) => updateDiscountLine(index, { name: selected })}
                          placeholder="Select or type a category"
                          formatCreateLabel={(value) => `Use "${value}"`}
                        />
                      ) : (
                        <Select
                          styles={SELECT_STYLES}
                          menuPosition="fixed"
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          options={options}
                          value={line.name}
                          onChange={(selected) => updateDiscountLine(index, { name: selected })}
                          placeholder="Select trade promo"
                          isClearable
                        />
                      )}
                    </td>
                    {section === 'tradePromo' && (
                      <td>
                        <Select
                          styles={SELECT_STYLES}
                          menuPosition="fixed"
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          options={claimOptions}
                          value={line.claimBatch}
                          onChange={(selected) => selectClaimBatch(index, selected)}
                          isOptionDisabled={(claim) => {
                            if (line.claimBatch?.value === claim.value) return false;
                            const selectedClaims = new Set(
                              discountLines
                                .filter((item, itemIndex) => itemIndex !== index && item.section === 'tradePromo' && item.claimBatch?.value)
                                .map((item) => item.claimBatch.value)
                            );
                            const oldestUnused = claimOptions.find((item) => !selectedClaims.has(item.value));
                            return selectedClaims.has(claim.value) || claim.value !== oldestUnused?.value;
                          }}
                          isLoading={claimsLoading}
                          isClearable
                          placeholder="Select the oldest claim"
                          noOptionsMessage={() => (claimsLoading ? 'Loading claims...' : 'No claim balance for this customer')}
                        />
                      </td>
                    )}
                    {section !== 'tradePromo' && (
                      <td>
                        <Select
                          styles={SELECT_STYLES}
                          menuPosition="fixed"
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          options={DISCOUNT_VALUE_TYPES}
                          value={DISCOUNT_VALUE_TYPES.find((item) => item.value === line.valueType)}
                          onChange={(selected) => updateDiscountCalculation(index, selected?.value || 'nominal', '', line.kgItemIndexes)}
                          isSearchable={false}
                        />
                        {section === 'primary' && line.valueType === 'kg' && (
                          <Select
                            className="mt-2"
                            styles={SELECT_STYLES}
                            menuPosition="fixed"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            options={kgMultiplierItemOptions}
                            value={kgMultiplierItemOptions.filter((item) => line.kgItemIndexes.includes(item.value))}
                            onChange={(selected) => {
                              const indexes = (selected || []).map((item) => item.value);
                              updateDiscountCalculation(index, 'kg', line.calculationValue, indexes);
                            }}
                            placeholder="Select multiplier item"
                            isMulti
                            closeMenuOnSelect={false}
                            isClearable
                          />
                        )}
                        {(line.valueType === 'percent' || line.valueType === 'kg') && (
                          <Form.Control
                            className="mt-2"
                            type="number"
                            min="0"
                            max={line.valueType === 'percent' ? 100 : undefined}
                            step="any"
                            value={line.calculationValue}
                            onChange={(event) => updateDiscountCalculation(index, line.valueType, event.target.value, line.kgItemIndexes)}
                            size="sm"
                            placeholder={line.valueType === 'percent' ? 'Percent value' : 'Discount per Kg'}
                          />
                        )}
                      </td>
                    )}
                    <td>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        value={line.value ? new Intl.NumberFormat('id-ID').format(Number(line.value)) : ''}
                        onChange={(event) => updateDiscountCalculation(index, 'nominal', event.target.value.replace(/\D/g, ''), [])}
                        readOnly={section === 'tradePromo' || line.valueType === 'percent' || line.valueType === 'kg'}
                        size="sm"
                        placeholder={
                          section === 'tradePromo' ? 'Select approved claim' : line.valueType === 'nominal' ? '0' : 'Calculated amount'
                        }
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-0">
                      <Form.Label className="f-12 text-muted mb-1">Remarks</Form.Label>
                      <Form.Control
                        size="sm"
                        value={line.remarks}
                        onChange={(event) => updateDiscountLine(index, { remarks: event.target.value })}
                        placeholder="Remarks"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-3 pb-3 text-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-danger"
                        data-permission-action="utility"
                        onClick={() => setDiscountLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                      >
                        <i className="ti ti-trash me-1" /> Remove Discount
                      </Button>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    if (adjustmentSalesOrders.length > 1 && !adjustment.sales_order_id) {
      showAlert('Select a Sales Order to adjust.', 'warning');
      return;
    }
    if (!visibleAdjustmentLines.length) {
      showAlert('At least one item line is required.', 'warning');
      return;
    }

    const invalidLine = visibleAdjustmentLines.some(
      (line) => !line.ItemCode.trim() || !line.WhsCode.trim() || line.Quantity === '' || Number(line.Quantity) < 0
    );
    if (invalidLine) {
      showAlert('Complete Item Code, Quantity, and Warehouse for every line.', 'warning');
      return;
    }

    const optionalHeader = {};
    ['DocEntry', 'SlpCode', 'CntctCode', 'DiscountPercent', 'DocTotal'].forEach((field) => {
      if (adjustment[field] !== '') optionalHeader[field] = Number(adjustment[field]);
    });
    ['NumAtCard', 'PayToCode', 'Address', 'ShipToCode', 'Address2', 'IdDiskon', 'AddonId'].forEach((field) => {
      if (String(adjustment[field]).trim()) optionalHeader[field] = String(adjustment[field]).trim();
    });
    ['DocDate', 'DocDueDate'].forEach((field) => {
      if (adjustment[field]) optionalHeader[field] = new Date(adjustment[field]).toISOString();
    });
    optionalHeader.DiscountPercent = adjustmentSubtotal > 0 ? (adjustmentDiscount / adjustmentSubtotal) * 100 : 0;
    optionalHeader.DocTotal = adjustmentGrandTotal;

    const payload = {
      ...(adjustment.sales_order_id ? { sales_order_id: Number(adjustment.sales_order_id) } : {}),
      ...optionalHeader,
      AddonId: '2',
      UserId: String(getCookies('userId') ?? getCookies('id') ?? ''),
      Comments: adjustment.comments.trim(),
      action_taken: adjustment.action_taken.trim(),
      Lines: visibleAdjustmentLines.map((line) => ({
        LineNum: Number(line.LineNum),
        ItemCode: line.ItemCode,
        Quantity: Number(line.Quantity),
        WhsCode: line.WhsCode,
        UomEntry: line.UomEntry === '' ? null : Number(line.UomEntry),
        UnitMsr: line.UnitMsr,
        LineTotal: Number(line.LineTotal) || 0,
        DiscPrcnt: Number(line.DiscPrcnt) || 0,
        VatGroup: line.VatGroup,
        TaxCode: line.TaxCode,
        OcrCode: line.OcrCode,
        OcrCode2: line.OcrCode2,
        OcrCode3: line.OcrCode3
      }))
    };

    setAdjustmentSaving(true);
    try {
      const response = await LogisticsServices.postAdjustOverload(adjustingOverload.picklistId, payload);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to adjust overload.');
      }
      showAlert(response?.data?.message || 'Overload adjusted successfully.', 'success');
      setAdjustingOverload(null);
      setAdjustment(EMPTY_ADJUSTMENT);
      await fetchOverloads();
    } catch (error) {
      showAlert(error?.response?.data?.message || error.message || 'Failed to adjust overload.', 'danger');
    } finally {
      setAdjustmentSaving(false);
    }
  };

  const detail = overloadDetail || selectedOverload || {};
  const latestOverload = detail?.latest_overload ?? detail?.latestOverload ?? detail;
  const overloadItems = Array.isArray(detail?.items)
    ? detail.items
    : Array.isArray(latestOverload?.items_snapshot)
      ? latestOverload.items_snapshot
      : [];
  const overloadHistory = Array.isArray(detail?.history) ? detail.history : [];

  return (
    <Stack gap={3}>
      <div>
        <h4 className="mb-1">Overload</h4>
        <span className="text-muted f-12">Monitor and review rejected weigh-out loads.</span>
      </div>
      <MainCard>
        <Form onSubmit={applyFilters} className="mb-4">
          <Row className="g-3">
            <Col xl={3} md={6}>
              <Form.Label>Search</Form.Label>
              <Form.Control
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Picklist, ticket, operator, reason, or vehicle"
              />
            </Col>
            <Col xl={2} md={4}>
              <Form.Label>Status</Form.Label>
              <Form.Select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xl={3} md={6}>
              <Form.Label>Picklist Number</Form.Label>
              <Form.Control
                value={filters.picklist_no}
                onChange={(event) => updateFilter('picklist_no', event.target.value)}
                placeholder="Picklist number"
              />
            </Col>
            <Col xl={2} md={6}>
              <Form.Label>Date From</Form.Label>
              <Form.Control type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
            </Col>
            <Col xl={2} md={6}>
              <Form.Label>Date To</Form.Label>
              <Form.Control type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
            </Col>
            <Col xs={12} className="d-flex flex-wrap align-items-end gap-2">
              <Button type="button" variant="outline-secondary" onClick={resetFilters} disabled={loading}>
                Reset
              </Button>
              <Button type="submit" disabled={loading}>
                <i className="ti ti-filter me-1" /> Apply Filter
              </Button>
              <Button type="button" variant="outline-primary" onClick={fetchOverloads} disabled={loading}>
                <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'} me-1`} /> Refresh
              </Button>
            </Col>
          </Row>
        </Form>

        <Table responsive hover bordered className="align-middle mb-0">
          <thead>
            <tr>
              <th>Picklist</th>
              <th>Vehicle</th>
              <th>Operator</th>
              <th className="text-end">Gross Weight</th>
              <th>Rejection Reason</th>
              <th>Notes</th>
              <th>Weighed At</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-5">
                  <Spinner size="sm" className="me-2" /> Loading overload data...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((item, index) => (
                <tr key={valueOf(item, ['id', 'overload_id'], index)}>
                  <td>
                    <span className="fw-semibold">
                      {valueOf(item, ['picklist_no', 'picklist_number', 'picklist.picklist_no', 'picklist.document_number'])}
                    </span>
                  </td>
                  <td>
                    <div>{valueOf(item, ['vehicle_no', 'picklist.vehicle_no', 'picklist.license_plate'])}</div>
                    <small className="text-muted">
                      {valueOf(item, ['driver_name', 'picklist.driver_name'])} / {valueOf(item, ['checker_name', 'picklist.checker_name'])}
                    </small>
                  </td>
                  <td>{valueOf(item, ['operator_name', 'operatorName'])}</td>
                  <td className="text-end fw-semibold">{formatWeight(valueOf(item, ['weight', 'gross_weight'], null))}</td>
                  <td style={{ minWidth: 220 }}>{valueOf(item, ['rejection_reason', 'rejectionReason'])}</td>
                  <td style={{ minWidth: 180 }}>{valueOf(item, ['notes'])}</td>
                  <td className="text-nowrap">{formatDateTime(valueOf(item, ['weighed_at', 'weighedAt'], ''))}</td>
                  <td>
                    <Badge bg={statusVariant(valueOf(item, ['status'], ''))}>{formatStatus(valueOf(item, ['status']))}</Badge>
                  </td>
                  <td className="text-center">
                    <Button
                      type="button"
                      variant={actionMenu?.item === item ? 'primary' : 'outline-primary'}
                      size="sm"
                      data-permission-action="utility"
                      aria-label={`Open actions for overload ${valueOf(item, ['picklist_no', 'picklist_number'], '')}`}
                      aria-expanded={actionMenu?.item === item}
                      onClick={(event) =>
                        setActionMenu((current) => (current?.item === item ? null : { item, target: event.currentTarget }))
                      }
                    >
                      <i className="ti ti-dots-vertical me-1" /> Actions
                      <i className="ti ti-chevron-down ms-1" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="text-center text-muted py-5">
                  No overload data found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={DEFAULT_PAGE_SIZE}
          total={total}
          itemLabel="overloads"
        />
      </MainCard>

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
        {({ ref, style, placement }) => (
          <div ref={ref} className="dropdown-menu show" data-popper-placement={placement} style={{ ...style, zIndex: 1080, minWidth: 170 }}>
            <button
              type="button"
              className="dropdown-item"
              data-permission-action="utility"
              onClick={() => {
                const item = actionMenu?.item;
                setActionMenu(null);
                openOverloadDetail(item);
              }}
            >
              <i className="ti ti-eye text-primary me-2" /> View
            </button>
            <button
              type="button"
              className="dropdown-item"
              data-permission-action="utility"
              onClick={() => {
                const item = actionMenu?.item;
                setActionMenu(null);
                openAdjustment(item);
              }}
            >
              <i className="ti ti-edit text-warning me-2" /> Edit
            </button>
          </div>
        )}
      </Overlay>

      <Modal show={Boolean(selectedOverload)} onHide={closeOverloadDetail} centered size="xl" scrollable>
        <Modal.Header closeButton={!detailLoading}>
          <Modal.Title>Overload Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner className="me-2" size="sm" /> Loading overload detail...
            </div>
          ) : detailError ? (
            <div className="text-center py-4">
              <i className="ti ti-alert-circle text-danger f-32" />
              <p className="text-danger mt-2 mb-3">{detailError}</p>
              <Button variant="outline-primary" onClick={() => openOverloadDetail(selectedOverload)}>
                Retry
              </Button>
            </div>
          ) : (
            <Stack gap={4}>
              <div className="border rounded p-3 bg-light bg-opacity-10 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <small className="text-muted text-uppercase fw-semibold">Picklist</small>
                  <h4 className="mb-1">{valueOf(detail, ['picklist_no'])}</h4>
                </div>
                <Stack direction="horizontal" gap={2}>
                  <Badge bg={statusVariant(valueOf(latestOverload, ['status'], ''))} className="px-3 py-2">
                    {formatStatus(valueOf(latestOverload, ['status']))}
                  </Badge>
                  <Badge bg="danger" className="px-3 py-2">
                    {formatStatus(valueOf(detail, ['weight_check_status', 'status']))}
                  </Badge>
                </Stack>
              </div>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-scale me-2 text-primary" />
                  Weight Summary
                </h6>
                <Row className="g-3">
                  {[
                    [
                      'Weight Limit',
                      valueOf(detail, ['total_weight_limit'], valueOf(latestOverload, ['weight_limit'], null)),
                      'text-primary'
                    ],
                    ['Tare / Weigh In', valueOf(detail, ['weigh_in_weight'], valueOf(latestOverload, ['tare_weight'], null)), 'text-info'],
                    [
                      'Gross / Weigh Out',
                      valueOf(detail, ['weigh_out_weight'], valueOf(latestOverload, ['gross_weight'], null)),
                      'text-warning'
                    ],
                    [
                      'Net Weight',
                      valueOf(detail, ['weigh_out_net_weight'], valueOf(latestOverload, ['net_weight'], null)),
                      'text-success'
                    ],
                    ['Overload Weight', valueOf(latestOverload, ['overload_weight'], null), 'text-danger']
                  ].map(([label, value, color]) => (
                    <Col xl md={4} sm={6} key={label}>
                      <div className="border rounded p-3 h-100 text-center">
                        <small className="text-muted text-uppercase fw-semibold">{label}</small>
                        <div className={`fs-4 fw-bold mt-2 ${color}`}>{formatWeight(value)}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </section>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-clipboard-data me-2 text-primary" />
                  Weigh-Out Information
                </h6>
                <Row className="g-3">
                  {[
                    ['Ticket Number', valueOf(latestOverload, ['ticket_no'])],
                    ['Operator', valueOf(latestOverload, ['operator_name'])],
                    ['Weighed At', formatDateTime(valueOf(latestOverload, ['weighed_at'], ''))],
                    ['Action Taken', valueOf(latestOverload, ['action_taken'])],
                    ['Resolved By', valueOf(latestOverload, ['resolved_by'])],
                    ['Resolved At', formatDateTime(valueOf(latestOverload, ['resolved_at'], ''))]
                  ].map(([label, value]) => (
                    <Col lg={4} md={6} key={label}>
                      <div className="border rounded p-3 h-100">
                        <small className="text-muted text-uppercase fw-semibold">{label}</small>
                        <div className="fw-semibold mt-1">{value}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
                <div className="border border-danger border-opacity-50 rounded p-3 mt-3">
                  <small className="text-danger text-uppercase fw-semibold">Rejection Reason</small>
                  <div className="fw-semibold mt-1">{valueOf(latestOverload, ['rejection_reason'])}</div>
                </div>
              </section>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-packages me-2 text-primary" />
                  Picklist Items ({overloadItems.length})
                </h6>
                <Table responsive bordered hover size="sm" className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Sales Order / Customer</th>
                      <th>Warehouse / Bin</th>
                      <th className="text-end">Ordered</th>
                      <th className="text-end">Picked</th>
                      <th className="text-end">Unit Weight</th>
                      <th className="text-end">Total Weight</th>
                      <th>Checker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overloadItems.length ? (
                      overloadItems.map((item, index) => (
                        <tr key={valueOf(item, ['id'], index)}>
                          <td>
                            <div className="fw-semibold">{valueOf(item, ['item_code'])}</div>
                            <small className="text-muted">{valueOf(item, ['item_name'])}</small>
                          </td>
                          <td>
                            <div>{valueOf(item, ['sales_order.order_no', 'order_no', 'so_number'])}</div>
                            <small className="text-muted">{valueOf(item, ['sales_order.customer_name'])}</small>
                          </td>
                          <td>
                            <div>{valueOf(item, ['whs_code'])}</div>
                            <small className="text-muted">{valueOf(item, ['bin_allocations.0.code'])}</small>
                          </td>
                          <td className="text-end">{formatNumber(valueOf(item, ['ordered_qty'], null))}</td>
                          <td className="text-end">
                            {formatNumber(valueOf(item, ['pick_qty'], null))} {valueOf(item, ['unit_msr', 'uom'], '')}
                          </td>
                          <td className="text-end">{formatWeight(valueOf(item, ['unit_weight'], null))}</td>
                          <td className="text-end fw-semibold">{formatWeight(valueOf(item, ['total_weight'], null))}</td>
                          <td>
                            <div>{valueOf(item, ['checked_by_checker'])}</div>
                            <small className="text-muted">{formatDateTime(valueOf(item, ['checked_at'], ''))}</small>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No picklist items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </section>

              <section>
                <h6 className="mb-3">
                  <i className="ti ti-history me-2 text-primary" />
                  Overload History ({overloadHistory.length})
                </h6>
                <Table responsive bordered size="sm" className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Weighed At</th>
                      <th>Status</th>
                      <th>Operator</th>
                      <th className="text-end">Gross</th>
                      <th className="text-end">Tare</th>
                      <th className="text-end">Net</th>
                      <th className="text-end">Overload</th>
                      <th>Reason / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overloadHistory.length ? (
                      overloadHistory.map((history, index) => (
                        <tr key={valueOf(history, ['id'], index)}>
                          <td className="text-nowrap">{formatDateTime(valueOf(history, ['weighed_at'], ''))}</td>
                          <td>
                            <Badge bg={statusVariant(valueOf(history, ['status'], ''))}>{formatStatus(valueOf(history, ['status']))}</Badge>
                          </td>
                          <td>{valueOf(history, ['operator_name'])}</td>
                          <td className="text-end">{formatWeight(valueOf(history, ['gross_weight'], null))}</td>
                          <td className="text-end">{formatWeight(valueOf(history, ['tare_weight'], null))}</td>
                          <td className="text-end">{formatWeight(valueOf(history, ['net_weight'], null))}</td>
                          <td className="text-end text-danger fw-semibold">{formatWeight(valueOf(history, ['overload_weight'], null))}</td>
                          <td>
                            <div>{valueOf(history, ['rejection_reason'])}</div>
                            <small className="text-muted">{valueOf(history, ['action_taken'])}</small>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No overload history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </section>
            </Stack>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeOverloadDetail} disabled={detailLoading}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(adjustingOverload)} onHide={closeAdjustment} fullscreen scrollable>
        <Form onSubmit={submitAdjustment} className="d-flex flex-column overflow-hidden" style={{ height: '100vh', minHeight: 0 }}>
          <Modal.Header>
            <div className="d-flex justify-content-between align-items-center w-100 gap-3">
              <div>
                <Modal.Title>Adjust Overload</Modal.Title>
                <small className="text-muted">Review Sales Order information and adjust overloaded product quantities.</small>
              </div>
              <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-end">
                <Button
                  type="button"
                  variant="outline-primary"
                  data-permission-action="utility"
                  onClick={closeAdjustment}
                  disabled={adjustmentSaving}
                >
                  <i className="ti ti-arrow-left me-1" /> Cancel
                </Button>
                <Button type="submit" data-permission-action="utility" disabled={adjustmentLoading || adjustmentSaving}>
                  {adjustmentSaving ? <Spinner size="sm" className="me-2" /> : <i className="ti ti-device-floppy me-1" />}
                  Save Adjustment
                </Button>
              </Stack>
            </div>
          </Modal.Header>
          <Modal.Body className="overflow-auto" style={{ minHeight: 0 }}>
            {adjustmentLoading ? (
              <div className="text-center py-5">
                <Spinner size="sm" className="me-2" /> Loading adjustment data...
              </div>
            ) : (
              <Stack gap={3}>
                <Row className="g-3">
                  <Col lg={8}>
                    <Card className="border mb-0 h-100">
                      <Card.Header className="py-3">
                        <Stack direction="horizontal" gap={2} className="justify-content-between">
                          <div>
                            <h6 className="mb-0">Order Information</h6>
                            <small className="text-muted">Sales Order and overload handling data</small>
                          </div>
                          <Badge bg="warning" text="dark">
                            Overload Adjustment
                          </Badge>
                        </Stack>
                      </Card.Header>
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={6} xl={4}>
                            <Form.Label className="small text-muted">Picklist</Form.Label>
                            <Form.Control
                              size="sm"
                              value={valueOf(adjustingOverload, ['picklist_no', 'picklist_number', 'detail.picklist_no'], '')}
                              readOnly
                            />
                          </Col>
                          <Col md={6} xl={4}>
                            <Form.Label className="small text-muted">Customer</Form.Label>
                            <Form.Control
                              size="sm"
                              value={`${valueOf(adjustingOverload, ['detail.items.0.sales_order.card_code'], '')} - ${valueOf(
                                adjustingOverload,
                                ['detail.items.0.sales_order.customer_name'],
                                ''
                              )}`}
                              readOnly
                            />
                          </Col>
                          {adjustmentSalesOrders.length > 1 && (
                            <Col md={6} xl={4}>
                              <Form.Label className="small text-muted">Sales Order</Form.Label>
                              <Form.Select
                                size="sm"
                                required
                                value={adjustment.sales_order_id}
                                onChange={(event) => setAdjustment((current) => ({ ...current, sales_order_id: event.target.value }))}
                              >
                                <option value="">Select Sales Order</option>
                                {adjustmentSalesOrders.map((order) => (
                                  <option key={order.id} value={order.id}>
                                    {order.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Col>
                          )}
                          {adjustmentSalesOrders.length <= 1 && (
                            <Col md={6} xl={4}>
                              <Form.Label className="small text-muted">Sales Order</Form.Label>
                              <Form.Control
                                size="sm"
                                value={valueOf(
                                  adjustingOverload,
                                  [
                                    'detail.sales_order.sap_doc_num',
                                    'detail.items.0.sales_order.sap_doc_num',
                                    'detail.sales_order.order_no'
                                  ],
                                  ''
                                )}
                                readOnly
                              />
                            </Col>
                          )}
                          {[
                            ['NumAtCard', 'No. PO Customer', 'text'],
                            ['DocDate', 'Date', 'date'],
                            ['DocDueDate', 'Due Date', 'date'],
                            ['CntctCode', 'Customer Contact', 'number']
                          ].map(([field, label, type]) => (
                            <Col xl={field === 'CntctCode' ? 6 : 4} md={6} key={field}>
                              <Form.Label className="small text-muted">{label}</Form.Label>
                              {type === 'date' ? (
                                <FormDatePicker
                                  size="sm"
                                  value={adjustment[field]}
                                  onChange={(event) => setAdjustment((current) => ({ ...current, [field]: event.target.value }))}
                                />
                              ) : (
                                <Form.Control
                                  size="sm"
                                  type={type}
                                  value={adjustment[field]}
                                  onChange={(event) => setAdjustment((current) => ({ ...current, [field]: event.target.value }))}
                                />
                              )}
                            </Col>
                          ))}
                          <Col xl={6} md={6}>
                            <Form.Label className="small text-muted">Code Sales</Form.Label>
                            <Select
                              styles={SELECT_STYLES}
                              menuPosition="fixed"
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              isClearable
                              options={adjustmentOptions.employees}
                              value={selectedOption(adjustmentOptions.employees, adjustment.SlpCode)}
                              onChange={(selected) => setAdjustment((current) => ({ ...current, SlpCode: selected?.value ?? '' }))}
                              placeholder="Select sales"
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label className="small text-muted">Billing Address</Form.Label>
                            <Select
                              styles={SELECT_STYLES}
                              menuPosition="fixed"
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              isClearable
                              options={adjustmentOptions.billTo}
                              value={selectedOption(adjustmentOptions.billTo, adjustment.PayToCode, adjustment.Address)}
                              onChange={(selected) =>
                                setAdjustment((current) => ({
                                  ...current,
                                  PayToCode: selected?.value ?? '',
                                  Address: selected?.address ?? selected?.label ?? ''
                                }))
                              }
                              placeholder="Select billing address"
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label className="small text-muted">Shipping Address</Form.Label>
                            <Select
                              styles={SELECT_STYLES}
                              menuPosition="fixed"
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              isClearable
                              options={adjustmentOptions.shipTo}
                              value={selectedOption(adjustmentOptions.shipTo, adjustment.ShipToCode, adjustment.Address2)}
                              onChange={(selected) =>
                                setAdjustment((current) => ({
                                  ...current,
                                  ShipToCode: selected?.value ?? '',
                                  Address2: selected?.address ?? selected?.label ?? ''
                                }))
                              }
                              placeholder="Select shipping address"
                            />
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="small text-muted">Notes</Form.Label>
                            <Form.Control
                              size="sm"
                              as="textarea"
                              rows={2}
                              required
                              value={adjustment.comments}
                              onChange={(event) => setAdjustment((current) => ({ ...current, comments: event.target.value }))}
                              placeholder="Sales Order load adjustment notes"
                            />
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="small text-muted">Overload Action Taken</Form.Label>
                            <Form.Control
                              size="sm"
                              as="textarea"
                              rows={2}
                              required
                              value={adjustment.action_taken}
                              onChange={(event) => setAdjustment((current) => ({ ...current, action_taken: event.target.value }))}
                              placeholder="Describe the overload handling action"
                            />
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col lg={4}>
                    <Card className="border mb-0 h-100">
                      <Card.Header className="py-3">
                        <h6 className="mb-0">Order Summary</h6>
                        <small className="text-muted">Estimate based on adjusted product lines</small>
                      </Card.Header>
                      <Card.Body>
                        <Stack gap={3}>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Item Count</span>
                            <strong>{visibleAdjustmentLines.length}</strong>
                          </Stack>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Subtotal</span>
                            <strong>Rp {formatNumber(adjustmentSubtotal)}</strong>
                          </Stack>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Discount {adjustment.IdDiskon ? `- ${adjustment.IdDiskon}` : ''}</span>
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 text-decoration-none"
                              data-permission-action="utility"
                              onClick={openDiscountModal}
                            >
                              Rp {formatNumber(adjustmentDiscount)}
                            </Button>
                          </Stack>
                          <div className="border-top pt-3">
                            <Stack direction="horizontal" className="justify-content-between">
                              <span className="fw-semibold">Grand Total</span>
                              <h5 className="mb-0 text-primary">Rp {formatNumber(adjustmentGrandTotal)}</h5>
                            </Stack>
                          </div>
                          <Button type="button" variant="light-primary" data-permission-action="utility" onClick={openDiscountModal}>
                            <i className="ti ti-discount-2 me-1" /> Set Discount
                          </Button>
                        </Stack>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card className="border mb-0">
                  <Card.Header className="py-3 d-flex align-items-center justify-content-between gap-2">
                    <div>
                      <h6 className="mb-0">Product Details</h6>
                      <small className="text-muted">Adjust item, warehouse, quantity, price, tax, and dimensions.</small>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-primary"
                      data-permission-action="utility"
                      onClick={() =>
                        setAdjustment((current) => ({
                          ...current,
                          lines: [...current.lines, { ...newAdjustmentLine(), sales_order_id: current.sales_order_id }]
                        }))
                      }
                    >
                      <i className="ti ti-plus me-1" /> Add Line
                    </Button>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table responsive hover size="sm" className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 240 }}>Item</th>
                          <th style={{ minWidth: 90 }}>Qty</th>
                          <th style={{ minWidth: 100 }}>Unit</th>
                          <th style={{ minWidth: 140 }}>Price</th>
                          <th style={{ minWidth: 220 }}>Warehouse</th>
                          <th style={{ minWidth: 150 }}>Total</th>
                          <th style={{ minWidth: 100 }}>Disc. %</th>
                          <th style={{ minWidth: 140 }}>VAT</th>
                          <th style={{ minWidth: 180 }}>Branch</th>
                          <th style={{ minWidth: 180 }}>Business Unit</th>
                          <th style={{ minWidth: 180 }}>Department</th>
                          <th className="text-center" style={{ width: 72 }}>
                            #
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAdjustmentLines.map((line) => (
                          <tr key={line._key}>
                            <td>
                              <Select
                                styles={SELECT_STYLES}
                                menuPosition="fixed"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                options={adjustmentOptions.items}
                                value={selectedOption(adjustmentOptions.items, line.ItemCode, line._itemName)}
                                onChange={(selected) => selectAdjustmentItem(line._key, selected)}
                                placeholder="Select item"
                              />
                            </td>
                            <td>
                              <Form.Control
                                className="overload-qty-input"
                                size="sm"
                                required
                                type="number"
                                min="0"
                                step="any"
                                value={line.Quantity}
                                onChange={(event) => {
                                  const quantity = event.target.value;
                                  setAdjustment((current) => ({
                                    ...current,
                                    lines: current.lines.map((item) =>
                                      item._key === line._key
                                        ? {
                                            ...item,
                                            Quantity: quantity,
                                            LineTotal:
                                              item._unitPrice === '' ? item.LineTotal : Number(quantity || 0) * Number(item._unitPrice || 0)
                                          }
                                        : item
                                    )
                                  }));
                                }}
                              />
                            </td>
                            <td>
                              <Form.Control size="sm" value={line.UnitMsr} readOnly />
                            </td>
                            <td>
                              <Form.Control size="sm" type="number" value={line._unitPrice} readOnly />
                            </td>
                            <td>
                              <Select
                                styles={SELECT_STYLES}
                                menuPosition="fixed"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                options={adjustmentOptions.warehouses}
                                value={selectedOption(adjustmentOptions.warehouses, line.WhsCode, line._whsName)}
                                onChange={(selected) => {
                                  updateAdjustmentLine(line._key, 'WhsCode', selected?.value || '');
                                  updateAdjustmentLine(line._key, '_whsName', selected?.label || '');
                                }}
                                placeholder="Select warehouse"
                              />
                            </td>
                            <td>
                              <Form.Control size="sm" type="number" min="0" step="any" value={line.LineTotal} readOnly />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                type="number"
                                min="0"
                                step="any"
                                value={line.DiscPrcnt}
                                onChange={(event) => updateAdjustmentLine(line._key, 'DiscPrcnt', event.target.value)}
                              />
                            </td>
                            <td>
                              <Select
                                styles={SELECT_STYLES}
                                menuPosition="fixed"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                isClearable
                                options={adjustmentOptions.vats}
                                value={selectedOption(adjustmentOptions.vats, line.VatGroup)}
                                onChange={(selected) => {
                                  updateAdjustmentLine(line._key, 'VatGroup', selected?.value || '');
                                  updateAdjustmentLine(line._key, 'TaxCode', selected?.value || '');
                                }}
                                placeholder="Select VAT"
                              />
                            </td>
                            {[
                              ['OcrCode', '_ocrName'],
                              ['OcrCode2', '_ocrName2'],
                              ['OcrCode3', '_ocrName3']
                            ].map(([field, nameField]) => (
                              <td key={field}>
                                <Select
                                  styles={SELECT_STYLES}
                                  menuPosition="fixed"
                                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                  isClearable
                                  options={adjustmentOptions[field === 'OcrCode' ? 'ocr1' : field === 'OcrCode2' ? 'ocr2' : 'ocr3']}
                                  value={selectedOption(
                                    adjustmentOptions[field === 'OcrCode' ? 'ocr1' : field === 'OcrCode2' ? 'ocr2' : 'ocr3'],
                                    line[field],
                                    line[nameField]
                                  )}
                                  onChange={(selected) => {
                                    updateAdjustmentLine(line._key, field, selected?.value || '');
                                    updateAdjustmentLine(line._key, nameField, selected?.label || '');
                                  }}
                                  placeholder="Select"
                                />
                              </td>
                            ))}
                            <td className="text-center">
                              <Button
                                type="button"
                                variant="outline-danger"
                                size="sm"
                                className="rounded-circle"
                                data-permission-action="utility"
                                aria-label={`Remove ${line.ItemCode || 'line'}`}
                                onClick={() =>
                                  setAdjustment((current) => ({
                                    ...current,
                                    lines: current.lines.filter((item) => item._key !== line._key)
                                  }))
                                }
                              >
                                <i className="ti ti-trash" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Stack>
            )}
          </Modal.Body>
        </Form>
      </Modal>

      <Modal
        show={showDiscountModal}
        onHide={() => !discountSaving && setShowDiscountModal(false)}
        size="xl"
        centered
        scrollable
        className="overload-discount-modal"
        backdropClassName="overload-discount-backdrop"
      >
        <Modal.Header closeButton={!discountSaving}>
          <div className="d-flex justify-content-between align-items-center w-100 pe-3 gap-3">
            <div>
              <Modal.Title>Set Order Discount</Modal.Title>
              <small className="text-muted">Combine primary, other, and trade promo discounts into one order discount.</small>
            </div>
            <div className="d-flex align-items-center gap-4 text-end">
              <div>
                <small className="text-muted d-block">Total Kg</small>
                <h5 className="mb-0">{formatNumber(adjustmentTotalKg, 4)} Kg</h5>
              </div>
              <div>
                <small className="text-muted d-block">Total Product</small>
                <h5 className="mb-0 text-primary">Rp {formatNumber(adjustmentSubtotal)}</h5>
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            {renderAdjustmentDiscountSection('primary', 'Primary Discount', 'Main discount component for this order.')}
            {primaryDiscountTotal > 0 && (
              <Stack direction="horizontal" className="justify-content-between bg-light-primary rounded px-3 py-2">
                <div>
                  <span className="fw-semibold d-block">Discount Reference</span>
                  <small className="text-muted">Total Product - Primary Discount</small>
                </div>
                <h5 className="mb-0 text-primary">Rp {formatNumber(primaryDiscountReference)}</h5>
              </Stack>
            )}
            {renderAdjustmentDiscountSection(
              'other',
              'Other Discount',
              'Additional discount components outside the primary discount and trade promo.'
            )}
            <Stack
              direction="horizontal"
              className={`justify-content-between rounded px-3 py-2 ${tradePromoTotal > maximumTradePromo ? 'bg-danger-subtle' : 'bg-light-primary'}`}
            >
              <div>
                <span className="fw-semibold d-block">Maximum Total Trade Promo</span>
                <small className="text-muted">20% × Discount Reference</small>
              </div>
              <div className="text-end">
                <small className="text-muted d-block">Current: Rp {formatNumber(tradePromoTotal)}</small>
                <h5 className={tradePromoTotal > maximumTradePromo ? 'mb-0 text-danger' : 'mb-0 text-primary'}>
                  Rp {formatNumber(maximumTradePromo)}
                </h5>
              </div>
            </Stack>
            {renderAdjustmentDiscountSection(
              'tradePromo',
              'Trade Promo',
              'Trade promo categories returned by the Sales Order discount master.'
            )}
            <Stack direction="horizontal" className="justify-content-between bg-light rounded p-3">
              <div>
                <span className="fw-semibold d-block">Combined Total Discount</span>
                <small className="text-muted">{discountLines.filter((line) => Number(line.value) > 0).length} discount components</small>
              </div>
              <h4 className="mb-0 text-primary">Rp {formatNumber(adjustmentDiscount)}</h4>
            </Stack>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="danger"
            data-permission-action="utility"
            disabled={discountSaving}
            onClick={() => setShowDiscountModal(false)}
          >
            Cancel
          </Button>
          <Button type="button" data-permission-action="utility" disabled={discountSaving || !adjustmentDiscount} onClick={saveDiscount}>
            {discountSaving && <Spinner size="sm" className="me-2" />}
            Save as 1 Discount
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
