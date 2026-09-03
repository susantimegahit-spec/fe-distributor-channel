import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import { getItem } from '../../../../redux/production/materialReducer';
import { getResource } from '../../../../redux/production/resourceReducer';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies, getOrganizationAssignment, getOrganizationAssignmentDefault } from '../../../../utils/cookies';
import ProductionRelationMap from './ProductionRelationMap';

const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });
const pageSize = 10;
const COMPONENT_TYPE_ITEM = '4';
const COMPONENT_TYPE_RESOURCE = '290';
const PRODUCTION_ORDER_BASE_TYPE = 202;
const productionTypeOptions = [{ value: 'Special', label: 'Special' }];
const PRODUCTION_STATUS_PLANNED = 'PLANNED';
const PRODUCTION_STATUS_RELEASE = 'release';
const productionStatusOptions = [
  { value: PRODUCTION_STATUS_PLANNED, label: 'Planned' },
  { value: PRODUCTION_STATUS_RELEASE, label: 'Release' }
];
const plannedProductionStatusOptions = productionStatusOptions.filter((option) => option.value === PRODUCTION_STATUS_PLANNED);
const productionOrderFilterStatusOptions = ['Release', 'Close', 'Planned'].map((value) => ({ value, label: value }));
const shiftOptions = ['All', 'Shift 1', 'Shift 2', 'Shift 3'].map((value) => ({ value, label: value }));
const componentTypeOptions = [
  { value: COMPONENT_TYPE_ITEM, label: 'Item' },
  { value: COMPONENT_TYPE_RESOURCE, label: 'Resource' }
];
const issueMethodOptions = [
  { value: 'M', label: 'Manual' },
  { value: 'B', label: 'Backflush' }
];
const normalizeComponentType = (value) => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase();
  if (['I', 'ITEM', COMPONENT_TYPE_ITEM].includes(normalizedValue)) return COMPONENT_TYPE_ITEM;
  if (['R', 'RESOURCE', COMPONENT_TYPE_RESOURCE].includes(normalizedValue)) return COMPONENT_TYPE_RESOURCE;
  return normalizedValue;
};
const productionSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 38 })
};
const bomItemSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minWidth: 230, minHeight: 31, fontSize: '0.75rem' }),
  option: (base) => ({ ...base, fontSize: '0.75rem' })
};
const bomCompactSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minWidth: 115, minHeight: 31, fontSize: '0.75rem' }),
  option: (base) => ({ ...base, fontSize: '0.75rem' })
};
const actionPopperConfig = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
    { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-end'] } }
  ]
};
const today = new Date().toLocaleDateString('en-CA');
const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const createInitialOrderFilters = () => {
  const currentDate = new Date();
  const mondayOffset = currentDate.getDay() === 0 ? -6 : 1 - currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    from: formatInputDate(startOfWeek),
    to: formatInputDate(endOfWeek),
    whs_code: '',
    to_whs_code: '',
    status: ''
  };
};
const formatSeriesDate = (value) => String(value || '').replace(/-/g, '');
const formatDate = (value) => {
  if (!value) return '-';

  const compactDate = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compactDate ? new Date(Number(compactDate[1]), Number(compactDate[2]) - 1, Number(compactDate[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatDateInputValue = (value) => {
  if (!value) return today;
  const compactDate = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compactDate ? new Date(Number(compactDate[1]), Number(compactDate[2]) - 1, Number(compactDate[3])) : new Date(value);

  return Number.isNaN(date.getTime()) ? today : formatInputDate(date);
};

const createInitialForm = () => ({
  type: 'Special',
  status: PRODUCTION_STATUS_PLANNED,
  product: null,
  unit: '',
  warehouse: '',
  plannedQuantity: '',
  series: '',
  orderDate: today,
  startDate: today,
  dueDate: today,
  shift: 'All'
});

const createBomDetail = () => ({
  id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: '4',
  code: '',
  item_name: '',
  qty: '',
  uom: '',
  whs_code: getOrganizationAssignmentDefault('warehouses'),
  ocr_code: getOrganizationAssignmentDefault('branches'),
  ocr_code2: getOrganizationAssignmentDefault('business_units'),
  ocr_code3: getOrganizationAssignmentDefault('departments'),
  issue_method: 'M'
});

const normalizeComponentOption = (item = {}, type) => {
  const isResource = String(type) === COMPONENT_TYPE_RESOURCE;
  const code = isResource
    ? item.res_code || item.resource_code || item.code || item.ResCode || ''
    : item.item_code || item.material_code || item.code || item.ItemCode || '';
  const name = isResource
    ? item.res_name || item.resource_name || item.name || item.ResName || ''
    : item.item_name || item.material_name || item.name || item.ItemName || '';
  const uom = isResource
    ? item.unit_of_msr || item.unit_msr || item.uom || item.unit || item.unit_of_measure || ''
    : item.invntry_uom || item.inventory_uom || item.uom || item.unit || item.unit_msr || '';

  return { value: code, label: [code, name].filter(Boolean).join(' - ') || '-', name, uom };
};

const normalizeWarehouseOption = (item = {}) => {
  const code = item.whs_code || item.warehouse_code || item.code || item.WhsCode || '';
  const name = item.whs_name || item.warehouse_name || item.name || item.WhsName || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code) };
};

const normalizeOcrOption = (item = {}) => {
  const code = item.ocr_code || item.ocrCode || item.OcrCode || item.code || '';
  const name = item.ocr_name || item.ocrName || item.OcrName || item.name || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code) };
};

const normalizeUnitOption = (item = {}) => {
  const value = typeof item === 'object' ? item.u_unit || item.U_Unit || item.unit || item.Unit || item.code || item.value || '' : item;
  const label = typeof item === 'object' ? item.unit_name || item.UnitName || item.name || item.label || item.description || value : item;

  return value ? { value, label: String(label), raw: item } : null;
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.boms)) return payload.boms;
  if (Array.isArray(payload?.series)) return payload.series;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.production_orders)) return payload.production_orders;
  if (Array.isArray(payload?.units)) return payload.units;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

const getResponseItem = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload)) return payload[0] ?? {};
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload?.item && !Array.isArray(payload.item)) return payload.item;
  if (payload?.bom && !Array.isArray(payload.bom)) return payload.bom;
  if (payload?.order && !Array.isArray(payload.order)) return payload.order;
  if (payload?.production_order && !Array.isArray(payload.production_order)) return payload.production_order;

  return payload;
};

const getProductionOrderDetail = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const header = payload?.header ?? payload?.Header ?? payload;
  const items = payload?.items ?? payload?.Items ?? payload?.details ?? payload?.order_details ?? [];
  return {
    ...normalizeProductionOrder({ ...(header || {}), details: Array.isArray(items) ? items : [] }),
    headerData: header || {},
    itemsData: Array.isArray(items) ? items : []
  };
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatDetailLabel = (key) => {
  const normalizedKey = String(key || '')
    .replaceAll('_', '')
    .toLowerCase();
  const ocrLabel = {
    ocr: 'Branch',
    ocrcode: 'Branch',
    ocr2: 'Business Unit',
    ocrcode2: 'Business Unit',
    ocr3: 'Department',
    ocrcode3: 'Department'
  }[normalizedKey];

  return (
    ocrLabel ||
    String(key)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
  );
};
const formatShift = (value) => ({ A: '1', B: '2', C: '3', X: 'All' })[String(value || '').toUpperCase()] || value || '-';

const normalizeBom = (item = {}, index = 0) => ({
  ...item,
  id: item.id || item.bom_id || item.code || index,
  productCode: item.code || item.product_code || item.item_code || item.product?.item_code || item.product?.code || '',
  productName:
    item.product_name || item.item_name || item.name || item.product?.item_name || item.product?.product_name || item.product?.name || '',
  quantity: item.qty ?? item.quantity ?? 0,
  uom:
    item.parent_item?.sal_unit_msr ||
    item.parent_name?.sal_unit_msr ||
    item.product?.uom_name ||
    item.product?.uom ||
    item.product?.unit ||
    item.product?.invntry_uom ||
    item.uom_name ||
    item.uom ||
    item.unit ||
    item.invntry_uom ||
    '',
  alternate: item.alternate || '',
  details: Array.isArray(item.details)
    ? item.details
    : Array.isArray(item.bom_details)
      ? item.bom_details
      : Array.isArray(item.lines)
        ? item.lines
        : []
});

const getComponentItem = (detail = {}) => {
  const item = detail.item ?? {};
  const code =
    (typeof item === 'object' ? (item.code ?? item.item_code ?? item.material_code ?? item.resource_code ?? item.res_code) : null) ??
    detail.ItemCode ??
    detail.ItemNo ??
    detail.itemNo ??
    detail.code ??
    detail.item_code ??
    detail.material_code ??
    detail.resource_code ??
    detail.res_code ??
    '';
  const name =
    (typeof item === 'object' ? (item.name ?? item.item_name ?? item.material_name ?? item.resource_name ?? item.res_name) : item) ||
    detail.ItemName ||
    detail.itemName ||
    detail.ItemDescription ||
    detail.item_description ||
    detail.name ||
    detail.item_name ||
    detail.material_name ||
    detail.resource_name ||
    detail.res_name ||
    '';

  return { code, name };
};

const normalizeProductionOrder = (item = {}, index = 0) => ({
  ...item,
  id: item.id || item.production_order_id || item.prod_order_no || item.DocEntry || item.doc_entry || item.doc_num || index,
  number: item.prod_order_no || item.production_order_no || item.doc_num || item.DocNum || item.number || '',
  itemCode: item.ItemCode || item.item_code || item.product_code || item.code || item.product?.item_code || item.product?.code || '',
  itemName:
    item.ProdName ||
    item.ItemName ||
    item.item_name ||
    item.product_name ||
    item.name ||
    item.product?.item_name ||
    item.product?.product_name ||
    item.product?.name ||
    '',
  plannedQuantity: item.PlannedQty ?? item.PlannedQuantity ?? item.planned_qty ?? item.planned_quantity ?? item.quantity ?? item.qty ?? 0,
  completedQuantity: item.CmpltQty ?? item.CompletedQty ?? item.completed_qty ?? item.completed_quantity ?? item.cmplt_qty ?? 0,
  warehouse:
    (typeof item.warehouse === 'string' ? item.warehouse : item.warehouse?.code || item.warehouse?.whs_code) ||
    item.Warehouse ||
    item.WhsCode ||
    item.whs_code ||
    item.warehouse_code ||
    '',
  unit: item.U_Unit || item.u_unit || item.Unit || item.unit || item.OcrCode2 || item.ocr_code2 || '',
  status: item.ProductionOrderStatus || item.Status || item.status || item.order_status || '',
  orderDate:
    item.PostingDate || item.PostDate || item.DocDate || item.post_date || item.order_date || item.posting_date || item.created_at || '',
  dueDate: item.DueDate || item.due_date || item.end_date || '',
  startDate: item.StartDate || item.start_date || '',
  type: item.type || item.order_type || '',
  series: item.seriesName || item.SeriesName || item.series || item.series_code || '',
  shift: item.U_Shift || item.u_shift || item.Shift || item.shift || '',
  priority: item.priority ?? '',
  comments: item.Comments || item.comments || item.remarks || '',
  details: Array.isArray(item.details)
    ? item.details
    : Array.isArray(item.order_details)
      ? item.order_details
      : Array.isArray(item.lines)
        ? item.lines
        : []
});

const getStatus = (value) => {
  const status = String(value || '').trim();
  const normalized = status.toLowerCase();
  const variant =
    {
      planned: 'secondary',
      released: 'primary',
      closed: 'success',
      cancelled: 'danger',
      canceled: 'danger'
    }[normalized] || 'info';

  return status ? { label: status, variant } : null;
};

const canCancelProductionOrder = (status) =>
  ['planned', 'released', 'open', 'o', 'r', 'p', 'bost_open'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );

const canReleaseProductionOrder = (status) =>
  ['planned', 'open', 'o', 'p', 'bost_planned', 'bost_open'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );

const canEditProductionOrder = (status) =>
  ['planned', 'p', 'bost_planned', 'bopos_planned'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );

const canCloseProductionOrder = (status) =>
  ['release', 'released', 'r', 'bost_released'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );

const canAddIssueProductionOrder = (status) =>
  ['released', 'release', 'open', 'r', 'o', 'bost_released', 'bost_open'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );

const normalizeShiftValue = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'A' || normalized === '1') return 'Shift 1';
  if (normalized === 'B' || normalized === '2') return 'Shift 2';
  if (normalized === 'C' || normalized === '3') return 'Shift 3';
  return value || 'All';
};

const normalizeProductionStatusValue = (value) => {
  const status = String(value || '')
    .trim()
    .toLowerCase();
  if (['planned', 'p', 'bost_planned', 'bopos_planned'].includes(status)) return PRODUCTION_STATUS_PLANNED;
  if (['release', 'released', 'r', 'open', 'o', 'bost_released', 'bost_open'].includes(status)) return PRODUCTION_STATUS_RELEASE;
  return value || PRODUCTION_STATUS_PLANNED;
};

const mapOrderDetailToForm = (order) => {
  const details = order.itemsData?.length ? order.itemsData : order.details || [];

  return {
    ...createInitialForm(),
    type: order.type || 'Special',
    status: normalizeProductionStatusValue(
      order.status ?? order.ProductionOrderStatus ?? order.Status ?? order.headerData?.ProductionOrderStatus ?? order.headerData?.Status
    ),
    product: {
      ...order.headerData,
      id: order.id,
      DocEntry: order.DocEntry ?? order.doc_entry ?? order.headerData?.DocEntry ?? order.id,
      productCode: order.itemCode,
      productName: order.itemName,
      comments: order.comments,
      whs_code: order.warehouse,
      to_whs: order.warehouse,
      ocr_code: order.OcrCode ?? order.ocr_code ?? order.headerData?.OcrCode ?? order.headerData?.ocr_code ?? '',
      ocr_code2: order.OcrCode2 ?? order.ocr_code2 ?? order.headerData?.OcrCode2 ?? order.headerData?.ocr_code2 ?? '',
      ocr_code3: order.OcrCode3 ?? order.ocr_code3 ?? order.headerData?.OcrCode3 ?? order.headerData?.ocr_code3 ?? '',
      details: details.map((detail, index) => {
        const item = getComponentItem(detail);
        const itemType = String(
          detail.ItemType ?? detail.item_type ?? detail.type ?? detail.component_type ?? COMPONENT_TYPE_ITEM
        ).toUpperCase();

        return {
          ...detail,
          id: detail.id ?? detail.LineNum ?? detail.line_num ?? `${item.code || 'line'}-${index}`,
          type: ['R', 'RESOURCE', COMPONENT_TYPE_RESOURCE].includes(itemType) ? COMPONENT_TYPE_RESOURCE : COMPONENT_TYPE_ITEM,
          code: item.code,
          item_code: item.code,
          item_name: item.name,
          qty: detail.BaseQty ?? detail.base_qty ?? detail.qty ?? detail.quantity ?? detail.PlannedQty ?? detail.planned_qty ?? '',
          uom: detail.UomCode ?? detail.uom_code ?? detail.uom ?? detail.unit ?? '',
          whs_code: detail.Warehouse ?? detail.WhsCode ?? detail.whs_code ?? detail.warehouse_code ?? order.warehouse ?? '',
          issue_mthd: detail.IssueMethod ?? detail.issue_mthd ?? detail.issue_method ?? '',
          issue_method: detail.IssueMethod ?? detail.issue_mthd ?? detail.issue_method ?? '',
          ocr_code: detail.OcrCode ?? detail.ocr_code ?? order.headerData?.OcrCode ?? '',
          ocr_code2: detail.OcrCode2 ?? detail.ocr_code2 ?? order.headerData?.OcrCode2 ?? '',
          ocr_code3: detail.OcrCode3 ?? detail.ocr_code3 ?? order.headerData?.OcrCode3 ?? ''
        };
      })
    },
    plannedQuantity: order.plannedQuantity || '',
    unit: order.headerData?.u_unit || order.headerData?.U_Unit || order.headerData?.Unit || order.unit || '',
    warehouse: order.warehouse || '',
    series: order.Series ?? order.series ?? order.headerData?.Series ?? '',
    orderDate: formatDateInputValue(order.orderDate),
    startDate: formatDateInputValue(order.startDate || order.orderDate),
    dueDate: formatDateInputValue(order.dueDate),
    shift: normalizeShiftValue(order.shift)
  };
};

const getOrderDocEntry = (order = {}) =>
  order.DocEntry ?? order.docEntry ?? order.doc_entry ?? order.headerData?.DocEntry ?? order.headerData?.doc_entry ?? order.id;

const getIssueLineQuantity = (line = {}) =>
  line.Quantity ??
  line.quantity ??
  line.PlannedQty ??
  line.planned_qty ??
  line.PlannedQuantity ??
  line.planned_quantity ??
  line.RequiredQty ??
  line.required_qty ??
  line.BaseQty ??
  line.base_qty ??
  line.qty ??
  '';

const createIssuePayloadFromOrder = (order = {}) => {
  const docEntry = getOrderDocEntry(order);
  const lines = order.itemsData?.length ? order.itemsData : order.details || [];

  return {
    DocDate: formatDateInputValue(new Date()),
    DocDueDate: formatDateInputValue(order.dueDate || new Date()),
    Comments: order.comments || order.headerData?.Comments || order.headerData?.comments || '',
    Shift: order.shift || order.headerData?.U_Shift || order.headerData?.Shift || '',
    Unit: order.headerData?.U_Unit || order.headerData?.Unit || order.ocr_code2 || order.OcrCode2 || '',
    Bomid: String(order.headerData?.Bomid ?? order.headerData?.bom_id ?? order.bomId ?? order.bom_id ?? ''),
    AddonId: String(order.headerData?.AddonId ?? order.headerData?.addon_id ?? getCookies('addonId') ?? ''),
    UserId: String(getCookies('id') ?? ''),
    Lines: lines
      .map((line) => {
        const baseEntry = line.BaseEntry ?? line.base_entry ?? docEntry;
        const baseLine = line.BaseLine ?? line.base_line ?? line.LineNum ?? line.line_num ?? '';
        const quantity = getIssueLineQuantity(line);

        return {
          BaseType: Number(line.BaseType ?? line.base_type ?? PRODUCTION_ORDER_BASE_TYPE),
          BaseEntry: baseEntry === '' ? '' : Number(baseEntry),
          BaseLine: baseLine === '' ? '' : Number(baseLine),
          Quantity: quantity === '' ? '' : Number(quantity),
          WhsCode: line.WhsCode ?? line.whs_code ?? line.Warehouse ?? line.warehouse_code ?? order.warehouse ?? '',
          UoMEntry: Number(line.UoMEntry ?? line.uom_entry ?? line.UomEntry ?? 0),
          OcrCode: line.OcrCode ?? line.ocr_code ?? order.headerData?.OcrCode ?? '',
          OcrCode2: line.OcrCode2 ?? line.ocr_code2 ?? order.headerData?.OcrCode2 ?? '',
          OcrCode3: line.OcrCode3 ?? line.ocr_code3 ?? order.headerData?.OcrCode3 ?? ''
        };
      })
      .filter((line) => line.BaseEntry !== '' && line.BaseLine !== '' && Number(line.Quantity) > 0)
  };
};

export default function ProductionOrder() {
  const { showAlert } = useAlert();
  const dispatch = useDispatch();
  const { items: materialItems, loading: loadingMaterials } = useSelector((state) => state.productionMaterial);
  const { items: resourceItems, loading: loadingResources } = useSelector((state) => state.productionResource);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilters, setOrderFilters] = useState(createInitialOrderFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [orderSort, setOrderSort] = useState({ key: '', direction: 'asc' });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [closeOrder, setCloseOrder] = useState(null);
  const [closingOrder, setClosingOrder] = useState(false);
  const [issuingOrderId, setIssuingOrderId] = useState(null);
  const [relationOrder, setRelationOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicatingOrderId, setDuplicatingOrderId] = useState(null);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [releaseOrder, setReleaseOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [showBomModal, setShowBomModal] = useState(false);
  const [loadingBoms, setLoadingBoms] = useState(false);
  const [loadingBomDetail, setLoadingBomDetail] = useState(false);
  const [selectingBomId, setSelectingBomId] = useState(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [boms, setBoms] = useState([]);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [ocrOptions, setOcrOptions] = useState({ ocrCode: [], ocrCode2: [], ocrCode3: [] });
  const [unitOptions, setUnitOptions] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const organizationAssignments = useMemo(() => getOrganizationAssignment(), []);
  const materialOptions = useMemo(
    () => materialItems.map((item) => normalizeComponentOption(item, COMPONENT_TYPE_ITEM)).filter((option) => option.value),
    [materialItems]
  );
  const resourceOptions = useMemo(
    () => resourceItems.map((item) => normalizeComponentOption(item, COMPONENT_TYPE_RESOURCE)).filter((option) => option.value),
    [resourceItems]
  );
  const isReleaseMode = Boolean(releaseOrder);
  const isEditMode = Boolean(editOrder);

  useEffect(() => {
    if (!isReleaseMode && !isEditMode && !isDuplicate) return;

    setForm((current) => {
      if (!current.product?.details?.length) return current;
      let changed = false;
      const details = current.product.details.map((detail) => {
        const currentUom = detail.uom ?? detail.unit ?? detail.unit_of_msr ?? detail.invntry_uom ?? '';
        if (String(currentUom).trim()) return detail;

        const item = getComponentItem(detail);
        const options = String(detail.type ?? detail.component_type) === COMPONENT_TYPE_RESOURCE ? resourceOptions : materialOptions;
        const normalizedName = String(item.name || '')
          .trim()
          .toLowerCase();
        const matchedOption =
          options.find(
            (option) =>
              normalizedName &&
              String(option.name || '')
                .trim()
                .toLowerCase() === normalizedName
          ) || options.find((option) => String(option.value) === String(item.code));

        if (!matchedOption?.uom) return detail;
        changed = true;
        return { ...detail, uom: matchedOption.uom };
      });

      return changed ? { ...current, product: { ...current.product, details } } : current;
    });
  }, [editOrder, isDuplicate, isEditMode, isReleaseMode, materialOptions, releaseOrder, resourceOptions]);

  const fetchProductionOrders = useCallback(
    async (activeFilters) => {
      const filters = activeFilters || orderFilters;
      if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }

      setLoadingOrders(true);

      try {
        const response = await ProductionServices.getListOrderSap({
          from: filters.from || '',
          to: filters.to || '',
          whs_code: filters.whs_code?.value || '',
          to_whs_code: filters.to_whs_code?.value || '',
          status: filters.status?.value || filters.status || ''
        });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');

        setOrders(getResponseList(response).map(normalizeProductionOrder));
        setCurrentPage(1);
      } catch (error) {
        setOrders([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
      } finally {
        setLoadingOrders(false);
      }
    },
    [orderFilters, showAlert]
  );

  useEffect(() => {
    const defaultFilters = createInitialOrderFilters();
    fetchProductionOrders(defaultFilters);
    // Initial page load uses the current-week filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) =>
      [order.number, order.itemCode, order.itemName, order.unit, order.status].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [orderSearch, orders]);

  const sortedOrders = useMemo(() => {
    if (!orderSort.key) return filteredOrders;

    const getSortValue = (order) => {
      switch (orderSort.key) {
        case 'product':
          return `${order.itemCode || ''} ${order.itemName || ''}`;
        case 'plannedQuantity':
        case 'completedQuantity':
          return Number(order[orderSort.key]) || 0;
        case 'orderDate':
        case 'dueDate':
          return new Date(order[orderSort.key] || 0).getTime() || 0;
        case 'status':
          return getStatus(order.status)?.label || order.status || '';
        default:
          return order[orderSort.key] || '';
      }
    };

    return [...filteredOrders].sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), 'id-ID', { numeric: true, sensitivity: 'base' });
      return orderSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredOrders, orderSort]);

  const handleOrderSort = (key) => {
    setOrderSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    setCurrentPage(1);
  };

  const renderOrderSortableHeader = (label, key, alignment = 'start') => {
    const ascending = orderSort.key === key && orderSort.direction === 'asc';
    const descending = orderSort.key === key && orderSort.direction === 'desc';

    return (
      <button
        type="button"
        className={`btn btn-link link-dark text-decoration-none fw-semibold p-0 text-nowrap ${alignment === 'end' ? 'float-end' : ''}`}
        onClick={() => handleOrderSort(key)}
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

  const pageCount = Math.max(Math.ceil(sortedOrders.length / pageSize), 1);
  const paginatedOrders = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;
    return sortedOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageCount, sortedOrders]);
  const issueableOrders = useMemo(() => filteredOrders.filter((order) => canAddIssueProductionOrder(order.status)), [filteredOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orderSearch]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setLoadingOrderDetail(true);

    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      }

      setSelectedOrder(getProductionOrderDetail(response));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!order?.id) return;
    setCancellingOrder(true);

    try {
      const response = await ProductionServices.postCancelProductionOrder({
        DocEntry: order.DocEntry ?? order.doc_entry ?? order.id,
        UserId: getCookies('id') ?? '',
        AddonId: getCookies('addonId') ?? ''
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to cancel Production Order');
      showAlert(response?.data?.message || 'Production Order cancelled successfully', 'success');
      fetchProductionOrders(orderFilters);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to cancel Production Order', 'danger');
    } finally {
      setCancellingOrder(false);
      setCancelOrder(null);
    }
  };

  const handleCloseProductionOrder = async (order) => {
    const docEntry = getOrderDocEntry(order);
    if (docEntry === undefined || docEntry === null || docEntry === '') {
      showAlert('Production Order DocEntry was not found', 'danger');
      return;
    }

    setClosingOrder(true);
    try {
      const response = await ProductionServices.closeProductionRelease({ DocEntry: String(docEntry) });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to close Production Order');
      showAlert(response?.data?.message || 'Production Order closed successfully', 'success');
      setCloseOrder(null);
      await fetchProductionOrders(orderFilters);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to close Production Order', 'danger');
    } finally {
      setClosingOrder(false);
    }
  };

  const handleAddIssue = async (order) => {
    if (!order?.id) return;

    setActionMenu(null);
    setIssuingOrderId(order.id);

    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      }

      const orderDetail = getProductionOrderDetail(response);
      const payload = createIssuePayloadFromOrder(orderDetail);
      const hasInvalidLine = payload.Lines.some((line) => line.BaseEntry === '' || line.BaseLine === '' || !(Number(line.Quantity) > 0));

      if (!payload.DocDate || !payload.DocDueDate || !payload.Lines.length || hasInvalidLine) {
        throw new Error('Complete Base Entry, Base Line, Quantity, and document dates before adding issue');
      }

      const issueResponse = await ProductionServices.postIssueProduction(payload);
      if (issueResponse?.data?.success === false) {
        throw new Error(issueResponse.data.message || 'Failed to add production issue');
      }

      setShowAddIssueModal(false);
      showAlert(issueResponse?.data?.message || 'Production issue added successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to add production issue', 'danger');
    } finally {
      setIssuingOrderId(null);
    }
  };

  const fetchBoms = async (keyword = '') => {
    setLoadingBoms(true);

    try {
      const response = await ProductionServices.getBoms({ code: '', search: keyword });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Bill of Material data');

      setBoms(getResponseList(response).map(normalizeBom));
    } catch (error) {
      setBoms([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material data', 'danger');
    } finally {
      setLoadingBoms(false);
    }
  };

  const fetchSeries = async (date) => {
    const formattedDate = formatSeriesDate(date);
    if (!formattedDate) {
      setSeriesOptions([]);
      return;
    }

    setLoadingSeries(true);

    try {
      const response = await ProductionServices.getSeries(formattedDate);
      if (!response?.data?.success) throw new Error(response?.data?.message || 'Failed to fetch series data');

      const seriesData = response.data.data || response.data.series || [];
      setSeriesOptions(
        (Array.isArray(seriesData) ? seriesData : [seriesData])
          .map((item) => {
            const value =
              typeof item === 'object'
                ? (item.series ?? item.Series ?? item.series_code ?? item.seriesCode ?? item.value ?? item.code ?? item.id)
                : item;
            const name =
              typeof item === 'object'
                ? (item.label ?? item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.description ?? value)
                : item;

            return value == null ? null : { value, label: String(name || value), raw: item };
          })
          .filter(Boolean)
      );
    } catch (error) {
      setSeriesOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch series data', 'danger');
    } finally {
      setLoadingSeries(false);
    }
  };

  const fetchWarehouses = async () => {
    if (warehouseOptions.length) return;
    setLoadingWarehouses(true);
    try {
      const response = await WarehouseServices.getAllWarehouse('');
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch warehouse data');
      setWarehouseOptions(
        getResponseList(response)
          .map(normalizeWarehouseOption)
          .filter((option) => option.value)
      );
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch warehouse data', 'danger');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleUnitChange = async (option) => {
    const unit = option?.value || '';
    const masterUnitId = option?.raw?.id ?? option?.raw?.master_unit_id ?? option?.raw?.masterUnitId ?? option?.value ?? '';

    setForm((current) => ({
      ...current,
      unit,
      warehouse: '',
      product: current.product
        ? {
            ...current.product,
            whs_code: '',
            to_whs: '',
            details: current.product.details.map((detail) => ({ ...detail, whs_code: '' }))
          }
        : current.product
    }));
    if (!masterUnitId) {
      setWarehouseOptions([]);
      return;
    }

    setLoadingWarehouses(true);
    try {
      const response = await WarehouseServices.getWarehouseByUnit(masterUnitId);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch warehouse data');
      const options = getResponseList(response)
        .map(normalizeWarehouseOption)
        .filter((warehouse) => warehouse.value);
      const selectedWarehouse = options[0] || null;
      setWarehouseOptions(options);
      setForm((current) => ({
        ...current,
        unit,
        warehouse: selectedWarehouse?.value || '',
        product: current.product
          ? {
              ...current.product,
              whs_code: selectedWarehouse?.value || '',
              to_whs: selectedWarehouse?.value || '',
              details: current.product.details.map((detail) => ({ ...detail, whs_code: selectedWarehouse?.value || '' }))
            }
          : current.product
      }));
    } catch (error) {
      setWarehouseOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch warehouse data by unit', 'danger');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const fetchOcrOptions = async () => {
    if (ocrOptions.ocrCode.length || ocrOptions.ocrCode2.length || ocrOptions.ocrCode3.length) return;
    setLoadingOcr(true);
    try {
      const responses = await Promise.all([
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);
      if (responses.some((response) => response?.data?.success === false)) throw new Error('Failed to fetch OCR data');
      const normalizeResponse = (response) =>
        getResponseList(response)
          .map(normalizeOcrOption)
          .filter((option) => option.value);
      setOcrOptions({
        ocrCode: normalizeResponse(responses[0]),
        ocrCode2: normalizeResponse(responses[1]),
        ocrCode3: normalizeResponse(responses[2])
      });
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch OCR data', 'danger');
    } finally {
      setLoadingOcr(false);
    }
  };

  const fetchUnits = async () => {
    if (unitOptions.length) return;
    setLoadingUnits(true);
    try {
      const response = await ProductionServices.getUnit();
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch unit data');
      const assignedUnits = new Set(organizationAssignments.units.map((unit) => String(unit).trim().toLowerCase()));
      const options = getResponseList(response).map(normalizeUnitOption).filter(Boolean);

      setUnitOptions(
        assignedUnits.size
          ? options.filter((option) => {
              const unit = option.raw;
              const aliases = [
                option.value,
                unit?.id,
                unit?.master_unit_id,
                unit?.masterUnitId,
                unit?.value,
                unit?.unit_code,
                unit?.unitCode,
                unit?.u_unit,
                unit?.U_Unit,
                unit?.unit,
                unit?.Unit,
                unit?.code
              ]
                .map((value) =>
                  String(value ?? '')
                    .trim()
                    .toLowerCase()
                )
                .filter(Boolean);

              return aliases.some((alias) => assignedUnits.has(alias));
            })
          : options
      );
    } catch (error) {
      setUnitOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch unit data', 'danger');
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleOpenCreate = () => {
    setForm(createInitialForm());
    setReleaseOrder(null);
    setEditOrder(null);
    setIsDuplicate(false);
    setSearch('');
    setShowCreateModal(true);
    fetchSeries(today);
    fetchWarehouses();
    fetchOcrOptions();
    fetchUnits();
  };

  const handleCloseOrderForm = () => {
    setShowCreateModal(false);
    setReleaseOrder(null);
    setEditOrder(null);
    setIsDuplicate(false);
    setForm(createInitialForm());
  };

  const handleDuplicate = async (order) => {
    if (!order?.id) return;

    setActionMenu(null);
    setReleaseOrder(null);
    setEditOrder(null);
    setIsDuplicate(true);
    setDuplicatingOrderId(order.id);
    setLoadingBomDetail(true);
    setForm(createInitialForm());
    setShowCreateModal(true);
    fetchWarehouses();
    fetchOcrOptions();
    fetchUnits();

    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      }

      const orderDetail = getProductionOrderDetail(response);
      const duplicateForm = mapOrderDetailToForm(orderDetail);
      duplicateForm.status = PRODUCTION_STATUS_PLANNED;
      duplicateForm.product = {
        ...duplicateForm.product,
        bom_id:
          orderDetail.headerData?.Bomid ??
          orderDetail.headerData?.BomId ??
          orderDetail.headerData?.bom_id ??
          orderDetail.bomId ??
          orderDetail.bom_id ??
          ''
      };
      setForm(duplicateForm);
      fetchSeries(duplicateForm.orderDate);

      const componentTypes = [...new Set(duplicateForm.product.details.map((detail) => detail.type))];
      await Promise.all([
        componentTypes.includes(COMPONENT_TYPE_ITEM) ? dispatch(getItem('')) : Promise.resolve(),
        componentTypes.includes(COMPONENT_TYPE_RESOURCE) ? dispatch(getResource('')) : Promise.resolve()
      ]);
    } catch (error) {
      setShowCreateModal(false);
      setIsDuplicate(false);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load Production Order for duplication', 'danger');
    } finally {
      setDuplicatingOrderId(null);
      setLoadingBomDetail(false);
    }
  };

  const handleOpenRelease = async (order) => {
    if (!order?.id) return;

    setActionMenu(null);
    setReleaseOrder(order);
    setEditOrder(null);
    setIsDuplicate(false);
    setForm({
      ...createInitialForm(),
      status: PRODUCTION_STATUS_RELEASE,
      product: {
        productCode: order.itemCode,
        productName: order.itemName,
        whs_code: order.warehouse,
        details: []
      },
      plannedQuantity: order.plannedQuantity || '',
      unit: order.u_unit || order.U_Unit || order.Unit || '',
      warehouse: order.warehouse || '',
      orderDate: formatDateInputValue(order.orderDate),
      startDate: formatDateInputValue(order.startDate || order.orderDate),
      dueDate: formatDateInputValue(order.dueDate),
      shift: normalizeShiftValue(order.shift)
    });
    setShowCreateModal(true);
    setLoadingBomDetail(true);
    fetchWarehouses();
    fetchOcrOptions();
    fetchUnits();

    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      }

      const orderDetail = getProductionOrderDetail(response);
      setReleaseOrder(orderDetail);
      setForm({ ...mapOrderDetailToForm(orderDetail), status: PRODUCTION_STATUS_RELEASE });
      fetchSeries(formatDateInputValue(orderDetail.orderDate));

      const componentTypes = [
        ...new Set(
          (orderDetail.itemsData?.length ? orderDetail.itemsData : orderDetail.details || []).map((detail) => {
            const itemType = String(detail.ItemType ?? detail.item_type ?? detail.type ?? detail.component_type ?? '').toUpperCase();
            return ['R', 'RESOURCE', COMPONENT_TYPE_RESOURCE].includes(itemType) ? COMPONENT_TYPE_RESOURCE : COMPONENT_TYPE_ITEM;
          })
        )
      ];
      await Promise.all([
        componentTypes.includes(COMPONENT_TYPE_ITEM) ? dispatch(getItem('')) : Promise.resolve(),
        componentTypes.includes(COMPONENT_TYPE_RESOURCE) ? dispatch(getResource('')) : Promise.resolve()
      ]);
    } catch (error) {
      setShowCreateModal(false);
      setReleaseOrder(null);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingBomDetail(false);
    }
  };

  const handleOpenEdit = async (order) => {
    if (!order?.id) return;

    setActionMenu(null);
    setReleaseOrder(null);
    setEditOrder(order);
    setIsDuplicate(false);
    setForm(createInitialForm());
    setShowCreateModal(true);
    setLoadingBomDetail(true);
    fetchWarehouses();
    fetchOcrOptions();
    fetchUnits();

    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      }

      const orderDetail = getProductionOrderDetail(response);
      setEditOrder(orderDetail);
      setForm(mapOrderDetailToForm(orderDetail));
      fetchSeries(formatDateInputValue(orderDetail.orderDate));

      const componentTypes = [
        ...new Set(
          (orderDetail.itemsData?.length ? orderDetail.itemsData : orderDetail.details || []).map((detail) => {
            const itemType = String(detail.ItemType ?? detail.item_type ?? detail.type ?? detail.component_type ?? '').toUpperCase();
            return ['R', 'RESOURCE', COMPONENT_TYPE_RESOURCE].includes(itemType) ? COMPONENT_TYPE_RESOURCE : COMPONENT_TYPE_ITEM;
          })
        )
      ];
      await Promise.all([
        componentTypes.includes(COMPONENT_TYPE_ITEM) ? dispatch(getItem('')) : Promise.resolve(),
        componentTypes.includes(COMPONENT_TYPE_RESOURCE) ? dispatch(getResource('')) : Promise.resolve()
      ]);
    } catch (error) {
      setShowCreateModal(false);
      setEditOrder(null);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingBomDetail(false);
    }
  };

  const handleOpenBomSelection = () => {
    setSearch('');
    setShowBomModal(true);
    fetchBoms('');
  };

  const handleSearchBoms = (event) => {
    event.preventDefault();
    fetchBoms(search.trim());
  };

  const handleSelectBom = async (bom) => {
    setLoadingBomDetail(true);
    setSelectingBomId(bom.id);

    try {
      const response = await ProductionServices.getBomsById(bom.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Bill of Material detail');

      const bomDetail = getResponseItem(response);
      const normalizedBom = normalizeBom(bomDetail);
      const componentTypes = [
        ...new Set(
          normalizedBom.details.map((detail) =>
            normalizeComponentType(detail.ItemType ?? detail.item_type ?? detail.type ?? detail.component_type)
          )
        )
      ];
      await Promise.all([
        componentTypes.includes(COMPONENT_TYPE_ITEM) ? dispatch(getItem('')) : Promise.resolve(),
        componentTypes.includes(COMPONENT_TYPE_RESOURCE) ? dispatch(getResource('')) : Promise.resolve()
      ]);
      const defaultWarehouseCode = getOrganizationAssignmentDefault('warehouses') || normalizedBom.whs_code || normalizedBom.to_whs;
      const branchCode = getOrganizationAssignmentDefault('branches') || normalizedBom.ocr_code;
      const businessUnitCode = getOrganizationAssignmentDefault('business_units') || normalizedBom.ocr_code2;
      const departmentCode = getOrganizationAssignmentDefault('departments') || normalizedBom.ocr_code3;
      setForm((current) => {
        const warehouseCode = current.warehouse || defaultWarehouseCode;
        return {
          ...current,
          warehouse: warehouseCode,
          product: {
            ...normalizedBom,
            whs_code: warehouseCode,
            to_whs: warehouseCode,
            ocr_code: branchCode,
            ocr_code2: businessUnitCode,
            ocr_code3: departmentCode,
            details: normalizedBom.details.map((detail) => ({
              ...detail,
              type: normalizeComponentType(detail.ItemType ?? detail.item_type ?? detail.type ?? detail.component_type),
              whs_code: warehouseCode,
              ocr_code: branchCode,
              ocr_code2: businessUnitCode,
              ocr_code3: departmentCode
            }))
          },
          plannedQuantity: Number(bomDetail?.qty ?? bomDetail?.quantity) || ''
        };
      });
      setShowBomModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material detail', 'danger');
    } finally {
      setLoadingBomDetail(false);
      setSelectingBomId(null);
    }
  };

  const updateBomDetail = (detailIndex, values) => {
    setForm((current) => ({
      ...current,
      product: {
        ...current.product,
        details: current.product.details.map((detail, index) => (index === detailIndex ? { ...detail, ...values } : detail))
      }
    }));
  };

  const updateHeaderWarehouse = (option) => {
    const warehouseCode = option?.value || '';
    setForm((current) =>
      current.product
        ? {
            ...current,
            warehouse: warehouseCode,
            product: {
              ...current.product,
              whs_code: warehouseCode,
              to_whs: warehouseCode,
              details: current.product.details.map((detail) => ({ ...detail, whs_code: warehouseCode }))
            }
          }
        : { ...current, warehouse: warehouseCode }
    );
  };

  const updateHeaderDistributionRole = (field, option) => {
    const value = option?.value || '';
    setForm((current) =>
      current.product
        ? {
            ...current,
            product: {
              ...current.product,
              [field]: value,
              details: current.product.details.map((detail) => ({ ...detail, [field]: value }))
            }
          }
        : current
    );
  };

  const handleBomDetailTypeChange = async (detailIndex, type) => {
    updateBomDetail(detailIndex, { type, item: null, code: '', item_code: '', item_name: '', uom: '' });
    if (!type) return;

    try {
      if (type === COMPONENT_TYPE_ITEM) await dispatch(getItem(''));
      if (type === COMPONENT_TYPE_RESOURCE) await dispatch(getResource(''));
    } catch (error) {
      showAlert(
        error?.response?.data?.message ||
          error?.message ||
          `Failed to fetch ${type === COMPONENT_TYPE_ITEM ? 'material' : 'resource'} data`,
        'danger'
      );
    }
  };

  const addBomDetail = () => {
    if (!form.product) {
      showAlert('Select a Bill of Material first', 'warning');
      return;
    }
    setForm((current) => ({
      ...current,
      product: {
        ...current.product,
        details: [
          ...current.product.details,
          {
            ...createBomDetail(),
            whs_code: current.product.whs_code || current.product.to_whs || '',
            ocr_code: current.product.ocr_code || '',
            ocr_code2: current.product.ocr_code2 || '',
            ocr_code3: current.product.ocr_code3 || ''
          }
        ]
      }
    }));
    if (!materialItems.length) {
      dispatch(getItem('')).catch((error) => {
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch material data', 'danger');
      });
    }
  };

  const removeBomDetail = (detailIndex) => {
    setForm((current) => ({
      ...current,
      product: { ...current.product, details: current.product.details.filter((_, index) => index !== detailIndex) }
    }));
  };

  const handleSave = async () => {
    const plannedQuantity = Number(form.plannedQuantity);
    const warehouse =
      form.warehouse ||
      organizationAssignments.warehouses[0] ||
      form.product?.to_whs ||
      form.product?.whs_code ||
      form.product?.warehouse_code ||
      form.product?.warehouse?.code ||
      '';

    if (!form.product || !form.series || !form.orderDate || !form.startDate || !form.dueDate || !warehouse) {
      showAlert('Please complete product, series, dates, and warehouse data', 'warning');
      return;
    }

    const hasInvalidBomDetail =
      !form.product.details.length ||
      form.product.details.some((detail) => {
        const item = getComponentItem(detail);
        return !detail.type || !item.code;
      });
    if (hasInvalidBomDetail) {
      showAlert('Complete the type and item code for every Bill of Material detail', 'warning');
      return;
    }

    const series = Number(form.series);
    const selectedSeries = seriesOptions.find((option) => String(option.value) === String(form.series));
    const seriesName =
      selectedSeries?.raw?.series_name ?? selectedSeries?.raw?.seriesName ?? selectedSeries?.raw?.SeriesName ?? selectedSeries?.label ?? '';
    const formatPayloadDate = (date) => `${date}T00:00:00`;
    const status = isReleaseMode ? PRODUCTION_STATUS_RELEASE : form.status || PRODUCTION_STATUS_PLANNED;
    const orderId =
      releaseOrder?.id ??
      releaseOrder?.DocEntry ??
      releaseOrder?.doc_entry ??
      releaseOrder?.headerData?.DocEntry ??
      editOrder?.id ??
      editOrder?.DocEntry ??
      editOrder?.doc_entry ??
      editOrder?.headerData?.DocEntry ??
      form.product?.DocEntry ??
      form.product?.doc_entry;
    if ((isReleaseMode || isEditMode) && !orderId) {
      showAlert('Production Order id was not found', 'danger');
      return;
    }

    const payload = {
      ItemCode: form.product.productCode,
      Series: Number.isFinite(series) ? series : form.series,
      series_name: seriesName,
      Status: status,
      ProductionOrderStatus: status,
      PlannedQty: plannedQuantity,
      PostingDate: formatPayloadDate(form.orderDate),
      DueDate: formatPayloadDate(form.dueDate),
      WhsCode: warehouse,
      Remarks: form.product.comments ?? form.product.remarks ?? '',
      Shift: form.shift,
      Unit: form.product.ocr_code2 ?? form.product.business_unit_code ?? form.product.unit ?? '',
      u_unit: form.unit || '',
      Bomid: String(form.product.bom_id ?? form.product.bomId ?? form.product.id ?? ''),
      UserId: String(getCookies('id') ?? ''),
      AddonId: String(
        form.product.addon_id ?? form.product.addonId ?? form.product.add_on_id ?? form.product.addon?.id ?? getCookies('addonId') ?? ''
      ),
      Lines: form.product.details.map((detail) => {
        const item = getComponentItem(detail);
        const baseQuantity = Number(detail.qty ?? detail.quantity) || 0;
        const detailType = String(detail.type ?? detail.component_type ?? '').toUpperCase();

        return {
          ItemType: ['4', 'ITEM', 'I'].includes(detailType) ? 'I' : ['290', 'RESOURCE', 'R'].includes(detailType) ? 'R' : detailType,
          ItemCode: item.code,
          BaseQty: baseQuantity,
          WhsCode:
            form.warehouse ||
            organizationAssignments.warehouses[0] ||
            detail.whs_code ||
            detail.warehouse_code ||
            detail.to_whs ||
            detail.warehouse?.code ||
            detail.warehouse?.whs_code ||
            warehouse,
          IssueMethod: detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '',
          OcrCode: organizationAssignments.branches[0] || detail.ocr_code || detail.OcrCode || form.product.ocr_code || '',
          OcrCode2: organizationAssignments.business_units[0] || detail.ocr_code2 || detail.OcrCode2 || form.product.ocr_code2 || '',
          OcrCode3: organizationAssignments.departments[0] || detail.ocr_code3 || detail.OcrCode3 || form.product.ocr_code3 || ''
        };
      })
    };

    setSaving(true);
    try {
      const response =
        isReleaseMode || isEditMode
          ? await ProductionServices.putProductionOrder(orderId, payload)
          : await ProductionServices.postProductionOrder(payload);
      if (response?.data?.success === false) {
        throw new Error(
          response.data.message || `Failed to ${isReleaseMode ? 'release' : isEditMode ? 'update' : 'create'} Production Order`
        );
      }

      setShowCreateModal(false);
      setReleaseOrder(null);
      setEditOrder(null);
      setIsDuplicate(false);
      setForm(createInitialForm());
      showAlert(
        response?.data?.message || `Production Order ${isReleaseMode ? 'released' : isEditMode ? 'updated' : 'created'} successfully`,
        'success'
      );
      await fetchProductionOrders();
    } catch (error) {
      showAlert(
        error?.response?.data?.message ||
          error?.message ||
          `Failed to ${isReleaseMode ? 'release' : isEditMode ? 'update' : 'create'} Production Order`,
        'danger'
      );
    } finally {
      setSaving(false);
    }
  };

  const headerDetail = form.product?.details?.[0] || {};
  const headerWarehouseCode =
    form.warehouse ||
    organizationAssignments.warehouses[0] ||
    headerDetail.whs_code ||
    headerDetail.warehouse_code ||
    form.product?.to_whs ||
    form.product?.whs_code ||
    form.product?.warehouse_code ||
    '';
  const getHeaderDistributionValue = (field, apiField, assignmentKey) =>
    organizationAssignments[assignmentKey]?.[0] || headerDetail[field] || headerDetail[apiField] || form.product?.[field] || '';

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Production Order</h5>
            <span className="text-muted f-12">Plan, release, and monitor production work orders.</span>
          </Stack>
        }
        secondary={
          <Stack direction="horizontal" gap={2}>
            <Button
              variant="outline-success"
              onClick={() => setShowAddIssueModal(true)}
              disabled={loadingOrders || Boolean(issuingOrderId)}
            >
              <i className="ti ti-package-export me-1" />
              Add Issue
            </Button>
            <Button variant="success" onClick={handleOpenCreate}>
              <i className="ti ti-plus me-1" />
              Create Production Order
            </Button>
          </Stack>
        }
      >
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={6} lg={3}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.from}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={6} lg={3}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.to}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={6} lg={3}>
                <Form.Label>Status</Form.Label>
                <Select
                  styles={productionSelectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  options={productionOrderFilterStatusOptions}
                  value={
                    productionOrderFilterStatusOptions.find(
                      (option) => String(option.value) === String(orderFilters.status?.value || orderFilters.status)
                    ) || null
                  }
                  isClearable
                  placeholder="All status"
                  onChange={(option) => setOrderFilters((current) => ({ ...current, status: option || '' }))}
                />
              </Col>
              <Col md={6} lg={3}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loadingOrders} onClick={() => fetchProductionOrders()}>
                    <i className={loadingOrders ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loadingOrders ? 'Loading...' : 'Search'}
                  </Button>
                  <Button
                    variant="light-secondary"
                    disabled={loadingOrders}
                    aria-label="Reset production order filters"
                    onClick={() => {
                      const defaultFilters = createInitialOrderFilters();
                      setOrderFilters(defaultFilters);
                      fetchProductionOrders(defaultFilters);
                    }}
                  >
                    <i className="ti ti-refresh" />
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Row className="g-2 align-items-end mb-3">
          <Col lg={7} md={7}>
            <Form.Label className="f-12 text-muted">Search Production Order</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <i className="ti ti-search" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Order number, product, unit, or status"
              />
            </InputGroup>
          </Col>
          <Col lg={5} className="text-lg-end">
            <span className="text-muted f-12">Total Production Order</span>
            <div className="fw-semibold">{filteredOrders.length}</div>
          </Col>
        </Row>

        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>{renderOrderSortableHeader('Order No.', 'number')}</th>
              <th>{renderOrderSortableHeader('Product', 'product')}</th>
              <th className="text-end">{renderOrderSortableHeader('Planned Qty', 'plannedQuantity', 'end')}</th>
              <th className="text-end">{renderOrderSortableHeader('Completed Qty', 'completedQuantity', 'end')}</th>
              <th>{renderOrderSortableHeader('Unit', 'unit')}</th>
              <th>{renderOrderSortableHeader('Posting Date', 'orderDate')}</th>
              <th>{renderOrderSortableHeader('Due Date', 'dueDate')}</th>
              <th>{renderOrderSortableHeader('Status', 'status')}</th>
              <th className="text-center">#</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? (
              <tr>
                <td colSpan={9}>
                  <LoaderData />
                </td>
              </tr>
            ) : paginatedOrders.length ? (
              paginatedOrders.map((order) => {
                const status = getStatus(order.status);

                return (
                  <tr key={order.id}>
                    <td>{order.number || '-'}</td>
                    <td>
                      <div className="fw-semibold">{order.itemCode || '-'}</div>
                      <div className="text-muted f-12">{order.itemName || '-'}</div>
                    </td>
                    <td className="text-end">{numberFormatter.format(Number(order.plannedQuantity) || 0)}</td>
                    <td className="text-end">{numberFormatter.format(Number(order.completedQuantity) || 0)}</td>
                    <td>{order.unit || '-'}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{formatDate(order.dueDate)}</td>
                    <td>{status ? <Badge bg={status.variant}>{status.label}</Badge> : '-'}</td>
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant={String(actionMenu?.order?.id) === String(order.id) ? 'primary' : 'outline-primary'}
                        aria-label={`Open actions for Production Order ${order.number || ''}`}
                        aria-expanded={String(actionMenu?.order?.id) === String(order.id)}
                        onClick={(event) =>
                          setActionMenu((current) =>
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
                );
              })
            ) : (
              <tr>
                <td colSpan={9}>
                  <div className="text-center py-5">
                    <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
                      <i className="ti ti-clipboard-text f-32" />
                    </span>
                    <h5 className="mb-2">{orderSearch ? 'Production order not found' : 'No production order data yet'}</h5>
                    <p className="text-muted mb-0">
                      {orderSearch
                        ? 'Try another order number, product, warehouse, or status.'
                        : 'Create a production order from an existing Bill of Material.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <Overlay
          show={Boolean(actionMenu)}
          target={actionMenu?.target}
          placement="top-end"
          container={typeof document !== 'undefined' ? document.body : null}
          containerPadding={8}
          popperConfig={actionPopperConfig}
          rootClose
          rootCloseEvent="mousedown"
          onHide={() => setActionMenu(null)}
        >
          {({ ref, style, placement }) => {
            const order = actionMenu?.order;
            const canCancel = canCancelProductionOrder(order?.status);
            const canRelease = canReleaseProductionOrder(order?.status);
            const canEdit = canEditProductionOrder(order?.status);
            const canClose = canCloseProductionOrder(order?.status);
            return (
              <div
                ref={ref}
                className="dropdown-menu show"
                data-popper-placement={placement}
                style={{ ...style, zIndex: 1080, minWidth: 190 }}
              >
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setActionMenu(null);
                    if (order) handleOpenDetail(order);
                  }}
                >
                  <i className="ti ti-eye text-primary me-2" /> Detail
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setActionMenu(null);
                    setRelationOrder(order);
                  }}
                >
                  <i className="ti ti-sitemap text-info me-2" /> Relation Map
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={duplicatingOrderId !== null}
                  onClick={() => {
                    if (order) handleDuplicate(order);
                  }}
                >
                  <i
                    className={
                      String(duplicatingOrderId) === String(order?.id) ? 'ti ti-loader-2 text-info me-2' : 'ti ti-copy text-info me-2'
                    }
                  />{' '}
                  Duplicate
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    className="dropdown-item"
                    data-permission-action="edit"
                    data-permission-menu-key="50"
                    onClick={() => {
                      if (order) handleOpenEdit(order);
                    }}
                  >
                    <i className="ti ti-edit text-warning me-2" /> Edit
                  </button>
                ) : null}
                {canRelease ? (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      if (order) handleOpenRelease(order);
                    }}
                  >
                    <i className="ti ti-player-play text-success me-2" /> Release
                  </button>
                ) : null}
                {canClose ? (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setActionMenu(null);
                      if (order) setCloseOrder(order);
                    }}
                  >
                    <i className="ti ti-lock-check text-success me-2" /> Close
                  </button>
                ) : null}
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  disabled={!canCancel}
                  onClick={() => {
                    setActionMenu(null);
                    if (order) setCancelOrder(order);
                  }}
                >
                  <i className="ti ti-ban me-2" /> Cancel
                </button>
              </div>
            );
          }}
        </Overlay>

        <Modal show={Boolean(closeOrder)} onHide={() => !closingOrder && setCloseOrder(null)} centered>
          <Modal.Header closeButton={!closingOrder}>
            <Modal.Title>
              <i className="ti ti-lock-check text-success me-2" />
              Confirm Close
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to close Production Order <strong>{closeOrder?.number || '-'}</strong>?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" onClick={() => setCloseOrder(null)} disabled={closingOrder}>
              Cancel
            </Button>
            <Button variant="success" onClick={() => handleCloseProductionOrder(closeOrder)} disabled={closingOrder}>
              {closingOrder ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Closing...
                </>
              ) : (
                <>
                  <i className="ti ti-lock-check me-1" />
                  Close Order
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={Boolean(cancelOrder)} onHide={() => !cancellingOrder && setCancelOrder(null)} centered>
          <Modal.Header closeButton={!cancellingOrder}>
            <Modal.Title className="text-warning">
              <i className="ti ti-alert-triangle me-2" />
              Confirm Cancel
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to cancel Production Order <strong>{cancelOrder?.number || '-'}</strong>?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" onClick={() => setCancelOrder(null)} disabled={cancellingOrder}>
              Close
            </Button>
            <Button variant="danger" onClick={() => handleCancelOrder(cancelOrder)} disabled={cancellingOrder}>
              {cancellingOrder ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Cancelling...
                </>
              ) : (
                <>
                  <i className="ti ti-ban me-1" />
                  Cancel Order
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        <ProductionRelationMap order={relationOrder} onClose={() => setRelationOrder(null)} />

        {!loadingOrders && filteredOrders.length > 0 ? (
          <TablePagination
            currentPage={Math.min(currentPage, pageCount)}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredOrders.length}
            itemLabel="production orders"
          />
        ) : null}
      </MainCard>

      <Modal show={showAddIssueModal} onHide={() => !issuingOrderId && setShowAddIssueModal(false)} size="xl" centered scrollable>
        <Modal.Header closeButton={!issuingOrderId}>
          <Modal.Title>Add Issue Production</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Product</th>
                <th className="text-end">Planned Qty</th>
                <th>Warehouse</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-center">#</th>
              </tr>
            </thead>
            <tbody>
              {issueableOrders.length ? (
                issueableOrders.map((order) => {
                  const status = getStatus(order.status);
                  const isIssuing = String(issuingOrderId) === String(order.id);

                  return (
                    <tr key={order.id}>
                      <td>{order.number || '-'}</td>
                      <td>
                        <div className="fw-semibold">{order.itemCode || '-'}</div>
                        <div className="text-muted f-12">{order.itemName || '-'}</div>
                      </td>
                      <td className="text-end">{numberFormatter.format(Number(order.plannedQuantity) || 0)}</td>
                      <td>{order.warehouse || '-'}</td>
                      <td>{formatDate(order.dueDate)}</td>
                      <td>{status ? <Badge bg={status.variant}>{status.label}</Badge> : '-'}</td>
                      <td className="text-center">
                        <Button size="sm" variant="success" disabled={Boolean(issuingOrderId)} onClick={() => handleAddIssue(order)}>
                          <i className={isIssuing ? 'ti ti-loader-2 me-1' : 'ti ti-package-export me-1'} />
                          {isIssuing ? 'Adding...' : 'Add Issue'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No released Production Order found in the current list.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowAddIssueModal(false)} disabled={Boolean(issuingOrderId)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailModal} onHide={() => !loadingOrderDetail && setShowDetailModal(false)} size="xl" centered scrollable>
        <Modal.Header closeButton={!loadingOrderDetail}>
          <Modal.Title>Production Order Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrderDetail ? (
            <LoaderData />
          ) : selectedOrder ? (
            <>
              {false && selectedOrder.headerData && (
                <div className="mb-4">
                  <h6 className="mb-3">Header</h6>
                  <Row className="g-3">
                    {Object.entries(selectedOrder.headerData).map(([key, value]) => (
                      <Col md={3} key={key}>
                        <div className="text-muted f-12 text-capitalize">{formatDetailLabel(key)}</div>
                        <div className="text-break">{formatDetailValue(value)}</div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="text-muted f-12">Production Order No.</div>
                  <div className="fw-semibold">{selectedOrder.number || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Product</div>
                  <div className="fw-semibold">{selectedOrder.itemCode || '-'}</div>
                  <div className="text-muted f-12">{selectedOrder.itemName || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Series</div>
                  <div>{selectedOrder.series || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Warehouse</div>
                  <div>{selectedOrder.warehouse || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Shift</div>
                  <div>{formatShift(selectedOrder.shift)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Order Date</div>
                  <div>{formatDate(selectedOrder.orderDate)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Due Date</div>
                  <div>{formatDate(selectedOrder.dueDate)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Planned Quantity</div>
                  <div>{numberFormatter.format(Number(selectedOrder.plannedQuantity) || 0)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Completed Quantity</div>
                  <div>{numberFormatter.format(Number(selectedOrder.completedQuantity) || 0)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Comments</div>
                  <div>{selectedOrder.comments || '-'}</div>
                </Col>
              </Row>

              {false && <h6 className="mb-3">Production Order Components</h6>}
              {false && (
                <Table className="mb-0 align-middle" responsive bordered hover>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Item</th>
                      <th className="text-end">Base Qty</th>
                      <th className="text-end">Planned Qty</th>
                      <th>Warehouse</th>
                      <th>Issue Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.details.length ? (
                      selectedOrder.details.map((detail, index) => {
                        const item = getComponentItem(detail);
                        const detailType = String(detail.type ?? detail.component_type ?? '');

                        return (
                          <tr key={detail.id ?? detail.detail_id ?? `${item.code}-${index}`}>
                            <td>{detailType === '4' ? 'Item' : detailType === '290' ? 'Resource' : detailType || '-'}</td>
                            <td>
                              <div className="fw-semibold">{item.code || '-'}</div>
                              <div className="text-muted f-12">{item.name || '-'}</div>
                            </td>
                            <td className="text-end">
                              {numberFormatter.format(Number(detail.base_qty ?? detail.qty ?? detail.quantity) || 0)}
                            </td>
                            <td className="text-end">
                              {numberFormatter.format(Number(detail.planned_qty ?? detail.planned_quantity) || 0)}
                            </td>
                            <td>
                              {detail.warehouse_code ??
                                detail.whs_code ??
                                detail.warehouse?.code ??
                                (typeof detail.warehouse === 'string' ? detail.warehouse : '') ??
                                '-'}
                            </td>
                            <td>{detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No Production Order component data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}

              {selectedOrder.itemsData?.length ? (
                <div className="mt-4">
                  <h6 className="mb-3">Items Response</h6>
                  <Table className="mb-0 align-middle" responsive bordered hover>
                    <thead>
                      <tr>
                        {Object.keys(selectedOrder.itemsData[0]).map((key) => (
                          <th key={key}>{formatDetailLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.itemsData.map((item, index) => (
                        <tr key={item.id ?? item.LineNum ?? index}>
                          {Object.keys(selectedOrder.itemsData[0]).map((key) => (
                            <td key={key}>{formatDetailValue(item[key])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowDetailModal(false)} disabled={loadingOrderDetail}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCreateModal} onHide={() => !loadingBomDetail && !saving && handleCloseOrderForm()} fullscreen scrollable>
        <Modal.Header closeButton={!loadingBomDetail && !saving}>
          <Modal.Title>
            {isReleaseMode
              ? 'Release Production Order'
              : isEditMode
                ? 'Edit Production Order'
                : isDuplicate
                  ? 'Duplicate Production Order'
                  : 'Create Production Order'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col lg={6}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Type</Form.Label>
                        <Select
                          styles={productionSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={productionTypeOptions}
                          value={productionTypeOptions.find((option) => option.value === form.type) || null}
                          onChange={(option) => setForm((current) => ({ ...current, type: option?.value || '' }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Status</Form.Label>
                        <Select
                          styles={productionSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={isReleaseMode ? productionStatusOptions : plannedProductionStatusOptions}
                          value={productionStatusOptions.find((option) => option.value === form.status) || null}
                          isDisabled={isReleaseMode || isEditMode}
                          onChange={(option) => setForm((current) => ({ ...current, status: option?.value || '' }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Product</Form.Label>
                        <InputGroup>
                          <Form.Control
                            readOnly
                            value={form.product ? [form.product.productCode, form.product.productName].filter(Boolean).join(' - ') : ''}
                            placeholder="Select product from Bill of Material"
                            onClick={isReleaseMode || isEditMode ? undefined : handleOpenBomSelection}
                          />
                          <Button variant="outline-primary" onClick={handleOpenBomSelection} disabled={isReleaseMode || isEditMode}>
                            <i className="ti ti-search me-1" />
                            Select BOM
                          </Button>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Planned Quantity</Form.Label>
                        <Form.Control
                          type="number"
                          step="any"
                          value={form.plannedQuantity}
                          disabled={isReleaseMode || isEditMode}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              plannedQuantity: event.target.value === '' ? '' : Number(event.target.value)
                            }))
                          }
                          placeholder="Enter quantity"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>UOM Name</Form.Label>
                        <Form.Control
                          value={
                            form.product?.parent_item?.sal_unit_msr ||
                            form.product?.parent_name?.sal_unit_msr ||
                            form.product?.parentName?.sal_unit_msr ||
                            form.product?.product?.sal_unit_msr ||
                            form.product?.product?.uom_name ||
                            form.product?.uom ||
                            ''
                          }
                          placeholder="Select product first"
                          readOnly
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Remarks</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={form.product?.comments || ''}
                          disabled={!form.product || isReleaseMode}
                          placeholder="Enter remarks"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              product: current.product ? { ...current.product, comments: event.target.value } : null
                            }))
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Series</Form.Label>
                        <Select
                          styles={productionSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={seriesOptions}
                          value={seriesOptions.find((option) => String(option.value) === String(form.series)) || null}
                          isLoading={loadingSeries}
                          isDisabled={loadingSeries}
                          isClearable
                          placeholder={loadingSeries ? 'Loading series...' : 'Select series'}
                          onChange={(option) => setForm((current) => ({ ...current, series: option?.value || '' }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Shift</Form.Label>
                        <Select
                          styles={productionSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={shiftOptions}
                          value={shiftOptions.find((option) => option.value === form.shift) || null}
                          onChange={(option) => setForm((current) => ({ ...current, shift: option?.value || '' }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Unit</Form.Label>
                        <Select
                          styles={productionSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={unitOptions}
                          value={unitOptions.find((option) => String(option.value) === String(form.unit)) || null}
                          isLoading={loadingUnits}
                          isDisabled={loadingUnits}
                          isClearable
                          placeholder={loadingUnits ? 'Loading units...' : 'Select unit'}
                          onChange={handleUnitChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Posting Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={form.orderDate}
                          onChange={(event) => {
                            const orderDate = event.target.value;
                            setForm((current) => ({ ...current, orderDate, series: '' }));
                            fetchSeries(orderDate);
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={form.startDate}
                          onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Due Date</Form.Label>
                        <Form.Control
                          type="date"
                          min={form.startDate || undefined}
                          value={form.dueDate}
                          onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <h6 className="mb-0">Warehouse &amp; Distribution Role</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3 align-items-start">
                    <Col lg={4}>
                      <Form.Group>
                        <Form.Label>Warehouse</Form.Label>
                        <Select
                          styles={productionSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={warehouseOptions}
                          value={
                            warehouseOptions.find((option) => String(option.value) === String(headerWarehouseCode)) ||
                            (headerWarehouseCode ? { value: headerWarehouseCode, label: headerWarehouseCode } : null)
                          }
                          isLoading={loadingWarehouses}
                          isDisabled={!form.unit || !form.product || loadingWarehouses}
                          placeholder={form.unit ? 'Select warehouse' : 'Select unit first'}
                          onChange={updateHeaderWarehouse}
                        />
                      </Form.Group>
                    </Col>
                    <Col lg={8}>
                      <Row className="g-3">
                        {[
                          ['ocr_code', 'OcrCode', ocrOptions.ocrCode, 'Branch', 'Select branch'],
                          ['ocr_code2', 'OcrCode2', ocrOptions.ocrCode2, 'Business Unit', 'Select business unit'],
                          ['ocr_code3', 'OcrCode3', ocrOptions.ocrCode3, 'Department', 'Select department']
                        ].map(([field, apiField, options, label, placeholder]) => {
                          const assignmentKey = {
                            ocr_code: 'branches',
                            ocr_code2: 'business_units',
                            ocr_code3: 'departments'
                          }[field];
                          const value = getHeaderDistributionValue(field, apiField, assignmentKey);
                          return (
                            <Col md={4} key={field}>
                              <Form.Group>
                                <Form.Label className="text-muted f-12">{label}</Form.Label>
                                <Select
                                  styles={productionSelectStyles}
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
                                  menuPlacement="auto"
                                  maxMenuHeight={240}
                                  menuShouldScrollIntoView={false}
                                  options={options}
                                  value={
                                    options.find((option) => String(option.value) === String(value)) ||
                                    (value ? { value, label: value } : null)
                                  }
                                  isLoading={loadingOcr}
                                  isDisabled={!form.product || loadingOcr || organizationAssignments[assignmentKey].length > 0}
                                  placeholder={placeholder}
                                  onChange={(option) => updateHeaderDistributionRole(field, option)}
                                />
                              </Form.Group>
                            </Col>
                          );
                        })}
                      </Row>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Stack direction="horizontal" className="justify-content-between mb-3">
            <h6 className="mb-0">Bill of Material Details</h6>
            <Button size="sm" variant="outline-primary" disabled={!form.product || loadingBomDetail} onClick={addBomDetail}>
              <i className="ti ti-plus me-1" /> Add Item
            </Button>
          </Stack>
          <Table className="mb-0 align-middle" responsive bordered hover>
            <thead>
              <tr>
                <th>Type</th>
                <th>Item</th>
                <th className="text-end">Base Qty</th>
                <th className="text-end">Planned Qty</th>
                <th>UOM</th>
                <th style={{ minWidth: 190 }}>Issue Method</th>
                <th className="text-center" style={{ minWidth: 110 }}>
                  #
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingBomDetail ? (
                <tr>
                  <td colSpan={7}>
                    <LoaderData />
                  </td>
                </tr>
              ) : form.product?.details?.length ? (
                form.product.details.map((detail, index) => {
                  const item = getComponentItem(detail);
                  const type = String(detail.type ?? detail.component_type ?? '');
                  const baseQuantity = Number(detail.qty ?? detail.quantity) || 0;
                  const plannedQuantity = baseQuantity * (Number(form.plannedQuantity) || 0);
                  return (
                    <tr key={detail.id ?? detail.detail_id ?? `${item.code}-${index}`}>
                      <td style={{ minWidth: 120 }}>
                        <Select
                          styles={bomCompactSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={componentTypeOptions}
                          value={componentTypeOptions.find((option) => option.value === type) || null}
                          onChange={(option) => handleBomDetailTypeChange(index, option?.value || COMPONENT_TYPE_ITEM)}
                        />
                      </td>
                      <td style={{ minWidth: 250 }}>
                        <Select
                          styles={bomItemSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={type === COMPONENT_TYPE_RESOURCE ? resourceOptions : materialOptions}
                          value={
                            (type === COMPONENT_TYPE_RESOURCE ? resourceOptions : materialOptions).find(
                              (option) => String(option.value) === String(item.code)
                            ) || (item.code ? { value: item.code, label: [item.code, item.name].filter(Boolean).join(' - ') } : null)
                          }
                          isLoading={type === COMPONENT_TYPE_RESOURCE ? loadingResources : loadingMaterials}
                          placeholder={type === COMPONENT_TYPE_RESOURCE ? 'Select resource' : 'Select material'}
                          onChange={(option) =>
                            updateBomDetail(index, {
                              code: option?.value || '',
                              item_code: option?.value || '',
                              item_name: option?.name || '',
                              item: option ? { code: option.value, name: option.name } : null,
                              uom: option?.uom || ''
                            })
                          }
                        />
                      </td>
                      <td style={{ minWidth: 110 }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          step="any"
                          value={detail.qty ?? detail.quantity ?? ''}
                          onChange={(event) => updateBomDetail(index, { qty: event.target.value })}
                        />
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          step="any"
                          value={plannedQuantity || ''}
                          readOnly={!isEditMode && !isReleaseMode}
                          onChange={(event) => {
                            const orderQuantity = Number(form.plannedQuantity);
                            const nextPlannedQuantity = event.target.value;
                            updateBomDetail(index, {
                              qty: nextPlannedQuantity === '' || orderQuantity === 0 ? '' : Number(nextPlannedQuantity) / orderQuantity
                            });
                          }}
                        />
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <Form.Control
                          size="sm"
                          value={detail.uom ?? detail.unit ?? detail.unit_of_msr ?? detail.invntry_uom ?? ''}
                          onChange={(event) => updateBomDetail(index, { uom: event.target.value })}
                        />
                      </td>
                      <td style={{ minWidth: 190 }}>
                        <Select
                          styles={bomItemSelectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuPlacement="auto"
                          maxMenuHeight={240}
                          menuShouldScrollIntoView={false}
                          options={issueMethodOptions}
                          value={
                            issueMethodOptions.find(
                              (option) => option.value === (detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '')
                            ) || null
                          }
                          isClearable
                          placeholder="Select method"
                          onChange={(option) =>
                            updateBomDetail(index, { issue_mthd: option?.value || '', issue_method: option?.value || '' })
                          }
                        />
                      </td>
                      <td className="text-center" style={{ minWidth: 110 }}>
                        <Button
                          type="button"
                          className="btn-icon avatar-s"
                          size="sm"
                          variant="outline-danger"
                          data-permission-action="utility"
                          aria-label={`Remove ${item.code || 'BOM item'}`}
                          onClick={() => removeBomDetail(index)}
                        >
                          <i className="ti ti-trash" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Select a product from Bill of Material to display its details.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light-secondary"
            onClick={handleCloseOrderForm}
            disabled={loadingBomDetail || saving || duplicatingOrderId !== null}
          >
            Close
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            disabled={loadingBomDetail || loadingSeries || saving || duplicatingOrderId !== null}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                {isReleaseMode ? 'Releasing...' : isEditMode ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <i className={isReleaseMode ? 'ti ti-player-play me-1' : 'ti ti-device-floppy me-1'} />
                {isReleaseMode ? 'Release' : isEditMode ? 'Update' : isDuplicate ? 'Save as New' : 'Save'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showBomModal}
        onHide={() => !loadingBomDetail && setShowBomModal(false)}
        size="lg"
        className="production-nested-modal"
        backdropClassName="production-nested-modal-backdrop"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingBomDetail}>
          <Modal.Title>Select Bill of Material</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSearchBoms} className="mb-3">
            <InputGroup>
              <Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search BOM code or product" />
              <Button type="submit" variant="primary" disabled={loadingBoms}>
                <i className="ti ti-search" />
              </Button>
            </InputGroup>
          </Form>

          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th>Product</th>
                <th>UOM</th>
                <th>Alternate</th>
                <th>Remarks</th>
                <th className="text-center" style={{ width: 90 }}>
                  #
                </th>
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
                boms.map((bom) => (
                  <tr key={bom.id}>
                    <td>
                      <div className="fw-semibold">{bom.productCode || '-'}</div>
                      <div className="text-muted f-12">{bom.productName || '-'}</div>
                    </td>
                    <td>{bom.uom || '-'}</td>
                    <td>{bom.alternate || '-'}</td>
                    <td>{bom.comments || '-'}</td>
                    <td className="text-center">
                      <Button variant="success" size="sm" onClick={() => handleSelectBom(bom)} disabled={loadingBomDetail}>
                        {String(selectingBomId) === String(bom.id) ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                            Loading...
                          </>
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No Bill of Material data found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
}
