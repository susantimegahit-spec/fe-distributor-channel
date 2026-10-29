import { useEffect, useState } from 'react';
import FormDatePicker from 'components/FormDatePicker';
import TablePagination from 'components/TablePagination';
import Select from 'react-select';

import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Nav from 'react-bootstrap/Nav';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Overlay from 'react-bootstrap/Overlay';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import PurchasingServices from '../../../../services/corporate/PurchasingServices';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import ProductServices from '../../../../services/customer-portal/ProductServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import { getCookies } from '../../../../utils/cookies';
import { useAlert } from '../../../../utils/alertContext';
import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';
import './purchase-request.scss';

const metrics = [
  { label: 'Draft Requests', value: 0, variant: 'secondary', icon: 'ti ti-file-pencil' },
  { label: 'Waiting Approval', value: 0, variant: 'warning', icon: 'ti ti-clock' },
  { label: 'Approved', value: 0, variant: 'success', icon: 'ti ti-circle-check' },
  { label: 'Rejected', value: 0, variant: 'danger', icon: 'ti ti-circle-x' }
];

const today = () => new Date().toISOString().slice(0, 10);
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getCurrentMonthRange = () => {
  const currentDate = new Date();
  return {
    from: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)),
    to: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))
  };
};
const SERIES_CARD_CODE = '1470000113';
const REQUESTER_CODE = 'API';
const getPurchaseRequestPage = (response, requestedPage = 1, perPage = 15) => {
  const root = response?.data?.data ?? response?.data ?? {};
  const payload = root.Result ?? root.result ?? root;
  const collection = Array.isArray(payload) ? payload : (payload.data ?? payload.items ?? payload.rows ?? payload.results ?? []);
  const allItems = Array.isArray(collection) ? collection : [];
  const meta = payload.meta ?? payload.pagination ?? response?.data?.meta ?? response?.data?.pagination ?? payload;
  const hasServerPagination = !Array.isArray(payload) && Boolean(meta.current_page ?? meta.currentPage ?? meta.last_page ?? meta.lastPage);

  if (!hasServerPagination) {
    const total = Array.isArray(allItems) ? allItems.length : 0;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(Math.max(1, requestedPage), lastPage);
    const offset = (currentPage - 1) * perPage;

    return {
      items: allItems.slice(offset, offset + perPage),
      currentPage,
      lastPage,
      total
    };
  }

  return {
    items: Array.isArray(allItems) ? allItems : [],
    currentPage: Number(meta.current_page ?? meta.currentPage ?? 1) || 1,
    lastPage: Number(meta.last_page ?? meta.lastPage ?? 1) || 1,
    total: Number(meta.total ?? (Array.isArray(allItems) ? allItems.length : 0)) || 0
  };
};

const getFirstId = (value) => {
  if (Array.isArray(value)) return value.map(getFirstId).find(Boolean) ?? '';
  if (value && typeof value === 'object') {
    return getFirstId(value.USERID ?? value.userid ?? value.user_id ?? value.originator_id ?? value.id ?? value.code ?? value.value);
  }
  return (
    String(value ?? '')
      .split(',')
      .map((item) => item.trim())
      .find(Boolean) ?? ''
  );
};

const getRequestValue = (request, keys, fallback = '') => {
  for (const key of keys) {
    if (request?.[key] !== undefined && request[key] !== null && request[key] !== '') return request[key];
  }
  return fallback;
};

const formatRequestDate = (value) => {
  if (!value) return '-';
  const compactDate = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDate) return `${compactDate[3]}/${compactDate[2]}/${compactDate[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('id-ID');
};

const formatQuantity = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity.toLocaleString('id-ID', { maximumFractionDigits: 6 }) : '-';
};

const getStatusVariant = (status) => {
  const variants = {
    DRAFT: 'secondary',
    OPEN: 'success',
    CLOSED: 'secondary',
    PENDING: 'warning',
    SUBMITTED: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'dark',
    COMPLETED: 'primary'
  };
  return variants[String(status || '').toUpperCase()] || 'secondary';
};

const getDocumentStatus = (request) => {
  const value = String(getRequestValue(request, ['DocStatus', 'doc_status', 'status', 'Status'], 'DRAFT'))
    .trim()
    .toUpperCase();
  const labels = {
    O: 'OPEN',
    BOST_OPEN: 'OPEN',
    C: 'CLOSED',
    BOST_CLOSE: 'CLOSED',
    BOST_CLOSED: 'CLOSED',
    D: 'DRAFT',
    W: 'PENDING',
    P: 'PENDING',
    Y: 'APPROVED',
    A: 'APPROVED',
    N: 'REJECTED',
    R: 'REJECTED'
  };

  return labels[value] ?? value;
};

const getSeriesList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'rows', 'series', 'value', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeSeries = (item = {}) => {
  const value = typeof item === 'object' ? (item.series ?? item.Series ?? item.series_code ?? item.value ?? item.code ?? item.id) : item;
  const label =
    typeof item === 'object'
      ? (item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.label ?? item.description ?? value)
      : item;

  return value === undefined || value === null || value === '' ? null : { value, label: String(label) };
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'rows', 'warehouses', 'departments', 'department', 'Department', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeOcr = (item = {}) => {
  const value = item.ocr_code ?? item.ocrCode ?? item.OcrCode ?? item.code ?? item.value ?? '';
  const name = item.ocr_name ?? item.ocrName ?? item.OcrName ?? item.name ?? item.label ?? '';
  return value ? { value: String(value), label: [value, name].filter(Boolean).join(' - ') } : null;
};

const normalizeDepartment = (item = {}) => {
  const value =
    item.department_code ??
    item.departmentCode ??
    item.DepartmentCode ??
    item.dept_code ??
    item.deptCode ??
    item.PrcCode ??
    item.Code ??
    item.code ??
    item.value ??
    item.id ??
    '';
  const name =
    item.department_name ??
    item.departmentName ??
    item.DepartmentName ??
    item.dept_name ??
    item.deptName ??
    item.PrcName ??
    item.Name ??
    item.name ??
    item.label ??
    '';

  return value ? { value: String(value), label: [value, name].filter(Boolean).join(' - ') } : null;
};

const normalizeWarehouse = (item = {}) => {
  const value = item.whs_code ?? item.warehouse_code ?? item.code ?? item.WhsCode ?? item.value ?? '';
  const name = item.whs_name ?? item.warehouse_name ?? item.name ?? item.WhsName ?? item.label ?? '';
  return value ? { value: String(value), label: [value, name].filter(Boolean).join(' - ') } : null;
};

const normalizeItem = (item = {}) => {
  const value = item.item_code ?? item.itemCode ?? item.code_item ?? item.code ?? item.value ?? '';
  const name = item.item_name ?? item.itemName ?? item.name ?? item.label ?? '';

  return value
    ? {
        value: String(value),
        label: [value, name].filter(Boolean).join(' - '),
        name: String(name),
        uomEntry: item.puom_entry ?? '',
        unitMsr: [item.pur_pack_msr, item.pur_pack_mrs, item.PurPackMsr].map((value) => String(value ?? '').trim()).find(Boolean) ?? ''
      }
    : null;
};

const createLine = () => ({
  key: `${Date.now()}-${Math.random()}`,
  ItemCode: '',
  ItemName: '',
  PQTReqDate: today(),
  Quantity: 1,
  UomEntry: '',
  UomCode: '',
  WhsCode: String(getCookies('userWarehouse') ?? ''),
  UnitMsr: '',
  FreeTxt: '',
  OcrCode: String(getCookies('userBranch') ?? ''),
  OcrCode2: String(getCookies('userBusinessUnit') ?? ''),
  OcrCode3: String(getCookies('userDepartment') ?? '')
});

const createInitialForm = () => {
  const userId = String(getCookies('userId') ?? getCookies('id') ?? '');

  return {
    Series: '',
    ReqType: '12',
    Requester: REQUESTER_CODE,
    RequesterName: String(getCookies('name') ?? ''),
    Department: String(getCookies('userDepartment') ?? ''),
    DocDate: today(),
    DocDueDate: today(),
    Comments: '',
    UserId: userId,
    AddonId: String(getCookies('addonId') ?? ''),
    Lines: [createLine()]
  };
};

export default function PurchaseRequest() {
  const { showAlert } = useAlert();
  const userBranch = String(getCookies('userBranch') ?? '');
  const userBusinessUnit = String(getCookies('userBusinessUnit') ?? '');
  const userDepartment = String(getCookies('userDepartment') ?? '');
  const userWarehouse = String(getCookies('userWarehouse') ?? '');
  const loggedInUserId = String(getCookies('id') ?? getCookies('userId') ?? '');
  const userOriginatorId = getFirstId(getCookies('approval_originator'));
  const initialMonthRange = getCurrentMonthRange();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [loadingLineMasters, setLoadingLineMasters] = useState(false);
  const [loadingHeaderDepartments, setLoadingHeaderDepartments] = useState(false);
  const [headerDepartmentOptions, setHeaderDepartmentOptions] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemOptions, setItemOptions] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingRequestDetail, setLoadingRequestDetail] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [requestPage, setRequestPage] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loadingDepartmentFilter, setLoadingDepartmentFilter] = useState(false);
  const [departmentFilterOptions, setDepartmentFilterOptions] = useState([]);
  const [requestFilters, setRequestFilters] = useState({
    department: userDepartment,
    costCenter: '',
    status: 'DRAFT',
    from: initialMonthRange.from,
    to: initialMonthRange.to,
    search: '',
    perPage: 15
  });
  const [appliedRequestFilters, setAppliedRequestFilters] = useState({
    department: userDepartment,
    costCenter: '',
    status: 'DRAFT',
    from: initialMonthRange.from,
    to: initialMonthRange.to,
    search: '',
    perPage: 15
  });
  const [requestRefresh, setRequestRefresh] = useState(0);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });
  const [form, setForm] = useState(createInitialForm);

  const viewPurchaseRequest = async (request) => {
    const requestId = getRequestValue(request, ['DocEntry', 'doc_entry', 'id', 'request_id', 'DraftEntry', 'draft_entry']);
    setSelectedRequest(request);
    if (!requestId) {
      showAlert('Purchase request ID is unavailable.', 'warning');
      return;
    }

    setLoadingRequestDetail(true);
    try {
      const response = await PurchasingServices.getDetailPR(requestId);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load purchase request details');
      const payload = response?.data?.data ?? response?.data ?? response;
      const detail =
        payload?.header ??
        (Array.isArray(payload?.Table1) ? payload.Table1[0] : null) ??
        payload?.request ??
        payload?.purchase_request ??
        payload?.purchaseRequest ??
        payload;
      const details =
        payload?.items ??
        payload?.Table2 ??
        payload?.details ??
        payload?.lines ??
        payload?.Lines ??
        detail?.details ??
        detail?.lines ??
        detail?.Lines ??
        request?.details;

      setSelectedRequest({
        ...request,
        ...(detail && typeof detail === 'object' ? detail : {}),
        ...(Array.isArray(details) ? { details } : {})
      });
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load purchase request details', 'danger');
    } finally {
      setLoadingRequestDetail(false);
    }
  };

  useEffect(() => {
    if (userDepartment) return undefined;

    let active = true;
    const fetchDepartmentFilterOptions = async () => {
      setLoadingDepartmentFilter(true);
      try {
        const response = await DistributorServices.getOcrByType(3);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load departments');
        if (active) setDepartmentFilterOptions(getResponseList(response).map(normalizeOcr).filter(Boolean));
      } catch (error) {
        if (active) {
          setDepartmentFilterOptions([]);
          showAlert(error?.response?.data?.message || error?.message || 'Failed to load departments', 'danger');
        }
      } finally {
        if (active) setLoadingDepartmentFilter(false);
      }
    };

    fetchDepartmentFilterOptions();
    return () => {
      active = false;
    };
  }, [showAlert, userDepartment]);

  useEffect(() => {
    let active = true;
    const fetchRequests = async () => {
      setLoadingRequests(true);
      try {
        const response =
          appliedRequestFilters.status === 'DRAFT'
            ? await PurchasingServices.getDraftPr({
                CustomQuery: userOriginatorId,
                UserId: loggedInUserId,
                From: appliedRequestFilters.from.replaceAll('-', ''),
                To: appliedRequestFilters.to.replaceAll('-', ''),
                Status: appliedRequestFilters.status
              })
            : await PurchasingServices.getGeneratedPr({
                CustomQuery: appliedRequestFilters.search || appliedRequestFilters.department,
                From: appliedRequestFilters.from.replaceAll('-', ''),
                To: appliedRequestFilters.to.replaceAll('-', '')
              });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load purchase requests');
        if (active) {
          const result = getPurchaseRequestPage(response, requestPage.currentPage, appliedRequestFilters.perPage);
          setRequests(result.items);

          setRequestPage({ currentPage: result.currentPage, lastPage: result.lastPage, total: result.total });
        }
      } catch (error) {
        if (active) {
          setRequests([]);
          showAlert(error?.response?.data?.message || error?.message || 'Failed to load purchase requests', 'danger');
        }
      } finally {
        if (active) setLoadingRequests(false);
      }
    };

    fetchRequests();
    return () => {
      active = false;
    };
  }, [appliedRequestFilters, loggedInUserId, requestPage.currentPage, requestRefresh, showAlert, userOriginatorId]);

  useEffect(() => {
    if (!showForm || !form.DocDate) {
      setSeriesOptions([]);
      return undefined;
    }

    let active = true;
    const fetchSeries = async () => {
      setLoadingSeries(true);
      try {
        const date = String(form.DocDate).replace(/-/g, '');
        const response = await PurchasingServices.getSeries(date, SERIES_CARD_CODE);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch series data');
        if (active) setSeriesOptions(getSeriesList(response).map(normalizeSeries).filter(Boolean));
      } catch (error) {
        if (active) {
          setSeriesOptions([]);
          showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch series data', 'danger');
        }
      } finally {
        if (active) setLoadingSeries(false);
      }
    };

    fetchSeries();
    return () => {
      active = false;
    };
  }, [form.DocDate, showForm, showAlert]);

  useEffect(() => {
    if (!showForm || userDepartment) return undefined;

    let active = true;
    const fetchHeaderDepartments = async () => {
      setLoadingHeaderDepartments(true);
      try {
        const response = await PurchasingServices.getDepartment();
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load departments');
        if (active) setHeaderDepartmentOptions(getResponseList(response).map(normalizeDepartment).filter(Boolean));
      } catch (error) {
        if (active) {
          setHeaderDepartmentOptions([]);
          showAlert(error?.response?.data?.message || error?.message || 'Failed to load departments', 'danger');
        }
      } finally {
        if (active) setLoadingHeaderDepartments(false);
      }
    };

    fetchHeaderDepartments();
    return () => {
      active = false;
    };
  }, [showAlert, showForm, userDepartment]);

  useEffect(() => {
    if (!showForm) return undefined;

    let active = true;
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const response = await ProductServices.getAllProduct('', undefined, 'Y');
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load item data');
        if (active) setItemOptions(getResponseList(response).map(normalizeItem).filter(Boolean));
      } catch (error) {
        if (active) {
          setItemOptions([]);
          showAlert(error?.response?.data?.message || error?.message || 'Failed to load item data', 'danger');
        }
      } finally {
        if (active) setLoadingItems(false);
      }
    };

    fetchItems();
    return () => {
      active = false;
    };
  }, [showAlert, showForm]);

  useEffect(() => {
    if (!showForm || (userBranch && userBusinessUnit && userDepartment && userWarehouse)) return undefined;

    let active = true;
    const fetchLineMasters = async () => {
      setLoadingLineMasters(true);
      try {
        const [branchResponse, businessUnitResponse, departmentResponse, warehouseResponse] = await Promise.all([
          userBranch ? null : DistributorServices.getOcrByType(1),
          userBusinessUnit ? null : DistributorServices.getOcrByType(2),
          userDepartment ? null : DistributorServices.getOcrByType(3),
          userWarehouse ? null : WarehouseServices.getAllWarehouse('')
        ]);
        const responses = [branchResponse, businessUnitResponse, departmentResponse, warehouseResponse].filter(Boolean);
        if (responses.some((response) => response?.data?.success === false)) throw new Error('Failed to load line master data');
        if (active) {
          setOcrOptions({
            branch: branchResponse ? getResponseList(branchResponse).map(normalizeOcr).filter(Boolean) : [],
            businessUnit: businessUnitResponse ? getResponseList(businessUnitResponse).map(normalizeOcr).filter(Boolean) : [],
            department: departmentResponse ? getResponseList(departmentResponse).map(normalizeOcr).filter(Boolean) : []
          });
          setWarehouseOptions(warehouseResponse ? getResponseList(warehouseResponse).map(normalizeWarehouse).filter(Boolean) : []);
        }
      } catch (error) {
        if (active) showAlert(error?.response?.data?.message || error?.message || 'Failed to load line master data', 'danger');
      } finally {
        if (active) setLoadingLineMasters(false);
      }
    };

    fetchLineMasters();
    return () => {
      active = false;
    };
  }, [showAlert, showForm, userBranch, userBusinessUnit, userDepartment, userWarehouse]);

  const openNewRequest = () => {
    setEditingRequest(null);
    setForm(createInitialForm());
    setShowForm(true);
  };

  const editRequest = (request) => {
    const initial = createInitialForm();
    const fields = {
      Series: 'series',
      ReqType: 'req_type',
      RequesterName: 'requester_name',
      Department: 'department',
      DocDate: 'doc_date',
      DocDueDate: 'doc_due_date',
      Comments: 'comments',
      UserId: 'user_id',
      AddonId: 'addon_id'
    };
    for (const [field, key] of Object.entries(fields)) {
      initial[field] = String(request[key] ?? request[field] ?? initial[field]);
    }
    initial.DocDate = initial.DocDate.slice(0, 10);
    initial.DocDueDate = String(request.required_date ?? initial.DocDueDate).slice(0, 10);
    initial.Lines = (Array.isArray(request.details) ? request.details : []).map((detail) => {
      const line = { ...createLine(), original: detail };
      const lineFields = {
        ItemCode: 'item_code',
        ItemName: 'item_description',
        PQTReqDate: 'pqt_req_date',
        Quantity: 'quantity',
        UomEntry: 'uom_entry',
        UomCode: 'uom_code',
        WhsCode: 'whs_code',
        UnitMsr: 'unit_msr',
        FreeTxt: 'free_txt',
        OcrCode: 'ocr_code',
        OcrCode2: 'ocr_code2',
        OcrCode3: 'ocr_code3'
      };
      for (const [field, key] of Object.entries(lineFields)) {
        line[field] = String(detail[key] ?? detail[field] ?? line[field]);
      }
      line.PQTReqDate = line.PQTReqDate.slice(0, 10);
      line.UnitMsr = String(detail.unit_msr ?? detail.uom ?? line.UnitMsr);
      return line;
    });
    setEditingRequest(request);
    setSelectedRequest(null);
    setForm(initial);
    setShowForm(true);
  };

  const confirmAction = async () => {
    if (!pendingAction || actionSaving) return;
    setActionSaving(true);
    try {
      const response = await PurchasingServices.updatePurchaseRequestStatus(pendingAction.request.id, pendingAction.status);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to update request status');
      showAlert(response?.data?.message || 'Request status updated', 'success');
      setPendingAction(null);
      setSelectedRequest(null);
      setRequestRefresh((current) => current + 1);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to update request status', 'danger');
    } finally {
      setActionSaving(false);
    }
  };

  const closeForm = () => {
    if (!saving) setShowForm(false);
  };

  const applyRequestFilters = (event) => {
    event?.preventDefault();
    if (requestFilters.from && requestFilters.to && requestFilters.from > requestFilters.to) {
      showAlert('From date cannot be after To date.', 'warning');
      return;
    }
    setRequestPage((current) => ({ ...current, currentPage: 1 }));
    setAppliedRequestFilters({ ...requestFilters, search: requestFilters.search.trim() });
  };

  const resetRequestFilters = () => {
    const monthRange = getCurrentMonthRange();
    const filters = {
      department: userDepartment,
      costCenter: '',
      status: appliedRequestFilters.status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
      from: monthRange.from,
      to: monthRange.to,
      search: '',
      perPage: 15
    };
    setRequestFilters(filters);
    setRequestPage((current) => ({ ...current, currentPage: 1 }));
    setAppliedRequestFilters(filters);
  };

  const changeRequestTab = (tab) => {
    const status = tab === 'draft' ? 'DRAFT' : 'SUBMITTED';
    setRequests([]);
    setLoadingRequests(true);
    setRequestPage({ currentPage: 1, lastPage: 1, total: 0 });
    setRequestFilters((current) => ({ ...current, status }));
    setAppliedRequestFilters((current) => ({ ...current, status }));
  };

  const updateHeader = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      Lines: current.Lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    }));
  };

  useEffect(() => {
    if (!showForm || !itemOptions.length) return;

    setForm((current) => {
      let changed = false;
      const Lines = current.Lines.map((line) => {
        if (String(line.UnitMsr ?? '').trim()) return line;
        const item = itemOptions.find((option) => option.value === line.ItemCode);
        if (!item?.unitMsr) return line;
        changed = true;
        return { ...line, UnitMsr: item.unitMsr };
      });
      return changed ? { ...current, Lines } : current;
    });
  }, [showForm, itemOptions]);

  const selectLineItem = (index, option) => {
    setForm((current) => ({
      ...current,
      Lines: current.Lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              ItemCode: option?.value ?? '',
              ItemName: option?.name ?? '',
              UomEntry: option?.uomEntry ?? '',
              UnitMsr: option?.unitMsr ?? ''
            }
          : line
      )
    }));
  };

  const addLine = () => {
    setForm((current) => ({ ...current, Lines: [...current.Lines, createLine()] }));
  };

  const removeLine = (index) => {
    setForm((current) => ({
      ...current,
      Lines: current.Lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  };

  const validate = () => {
    const requiredHeader = [
      ['Series', 'Series'],
      ['ReqType', 'Request type'],
      ['Requester', 'Requester'],
      ['RequesterName', 'Requester name'],
      ['Department', 'Department'],
      ['DocDate', 'Document date'],
      ['DocDueDate', 'Required date'],
      ['UserId', 'User ID']
    ];
    const missingHeader = requiredHeader.find(([field]) => !String(form[field] ?? '').trim());
    if (missingHeader) return `${missingHeader[1]} is required`;
    if (!form.Lines.length) return 'At least one request line is required';

    const invalidLine = form.Lines.findIndex(
      (line) =>
        !String(line.ItemCode ?? '').trim() ||
        !String(line.PQTReqDate ?? '').trim() ||
        !(Number(line.Quantity) > 0) ||
        !String(line.WhsCode ?? '').trim()
    );
    if (invalidLine >= 0) return `Complete item code, required date, quantity, and warehouse on line ${invalidLine + 1}`;
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      showAlert(validationMessage, 'warning');
      return;
    }

    const payload = {
      Series: String(form.Series),
      ReqType: form.ReqType.trim(),
      Requester: REQUESTER_CODE,
      RequesterName: form.RequesterName.trim(),
      Department: form.Department.trim(),
      DocDate: form.DocDate,
      DocDueDate: form.DocDueDate,
      ReqDate: form.DocDueDate,
      Comments: form.Comments.trim(),
      UserId: form.UserId.trim(),
      AddonId: form.AddonId.trim(),
      Lines: form.Lines.map((line) => ({
        ItemCode: line.ItemCode.trim(),
        PQTReqDate: line.PQTReqDate,
        Quantity: Number(line.Quantity),
        UomEntry: String(line.UomEntry ?? ''),
        UomCode: String(line.UomCode ?? ''),
        WhsCode: String(line.WhsCode ?? ''),
        UnitMsr: String(line.UnitMsr ?? ''),
        FreeTxt: line.FreeTxt.trim(),
        OcrCode: String(line.OcrCode ?? ''),
        OcrCode2: String(line.OcrCode2 ?? ''),
        OcrCode3: String(line.OcrCode3 ?? '')
      }))
    };

    setSaving(true);
    try {
      const response = editingRequest
        ? await PurchasingServices.putPurchasing(editingRequest.id, {
            series: payload.Series,
            req_type: payload.ReqType,
            requester: payload.Requester,
            requester_name: payload.RequesterName,
            department: payload.Department,
            doc_date: payload.DocDate,
            doc_due_date: payload.DocDueDate,
            required_date: payload.ReqDate,
            comments: payload.Comments,
            user_id: payload.UserId,
            addon_id: payload.AddonId,
            details: payload.Lines.map((line, index) => ({
              ...form.Lines[index].original,
              item_code: line.ItemCode,
              item_description: form.Lines[index].ItemName,
              pqt_req_date: line.PQTReqDate,
              quantity: line.Quantity,
              uom_entry: line.UomEntry,
              uom_code: line.UomCode,
              unit_msr: line.UnitMsr,
              uom: line.UnitMsr,
              whs_code: line.WhsCode,
              free_txt: line.FreeTxt,
              ocr_code: line.OcrCode,
              ocr_code2: line.OcrCode2,
              ocr_code3: line.OcrCode3
            }))
          })
        : await PurchasingServices.postPurchaseRequest(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to create purchase request');
      }
      showAlert(
        response?.data?.message || (editingRequest ? 'Purchase request updated successfully' : 'Purchase request created successfully'),
        'success'
      );
      setShowForm(false);
      setForm(createInitialForm());
      if (!editingRequest) changeRequestTab('generated');
      setEditingRequest(null);
      setRequestRefresh((current) => current + 1);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create purchase request', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EnterpriseWorkspace
        title="Purchase Request"
        description="Create, review, and monitor internal purchasing requests through the approval workflow."
        icon="ti ti-file-description"
        actionLabel="New Request"
        actionClassName="purchase-request-new-button"
        onAction={openNewRequest}
        metrics={metrics}
        compactMetrics
        columns={['Request No.', 'Request Date', 'Department', 'Requester', 'Status', 'Action']}
        tableClassName="purchase-request-list-table"
        emptyMessage="Purchase requests will appear here after they are created."
        loading={loadingRequests}
        tableToolbar={
          <div className="w-100">
            <Nav
              variant="tabs"
              className="purchase-request-tabs mb-3"
              aria-label="Purchase request categories"
              activeKey={appliedRequestFilters.status === 'DRAFT' ? 'draft' : 'generated'}
              onSelect={changeRequestTab}
            >
              <Nav.Item>
                <Nav.Link eventKey="draft">Draft</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="generated">Generated</Nav.Link>
              </Nav.Item>
            </Nav>
            <Form className="purchase-request-list-filters purchase-request-list-filters-wide" onSubmit={applyRequestFilters}>
              {userDepartment ? (
                <Form.Control size="sm" aria-label="Department" value={userDepartment} readOnly />
              ) : (
                <Select
                  className="purchase-request-department-filter"
                  classNamePrefix="select"
                  options={departmentFilterOptions}
                  value={departmentFilterOptions.find((option) => option.value === requestFilters.department) || null}
                  onChange={(option) => setRequestFilters((current) => ({ ...current, department: option?.value ?? '' }))}
                  isLoading={loadingDepartmentFilter}
                  isDisabled={loadingDepartmentFilter}
                  placeholder={loadingDepartmentFilter ? 'Loading departments...' : 'All departments'}
                  noOptionsMessage={() => (loadingDepartmentFilter ? 'Loading departments...' : 'Department not found')}
                  aria-label="Filter department"
                />
              )}
              <InputGroup size="sm" className="purchase-request-date-filter">
                <InputGroup.Text>From</InputGroup.Text>
                <FormDatePicker
                  type="date"
                  aria-label="From date"
                  value={requestFilters.from}
                  max={requestFilters.to || undefined}
                  onChange={(event) => setRequestFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </InputGroup>
              <InputGroup size="sm" className="purchase-request-date-filter">
                <InputGroup.Text>To</InputGroup.Text>
                <FormDatePicker
                  type="date"
                  aria-label="To date"
                  value={requestFilters.to}
                  min={requestFilters.from || undefined}
                  onChange={(event) => setRequestFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </InputGroup>
              <Form.Control
                size="sm"
                aria-label="Search purchase requests"
                placeholder="Search request..."
                value={requestFilters.search}
                onChange={(event) => setRequestFilters((current) => ({ ...current, search: event.target.value }))}
              />
              <Button type="submit" size="sm" variant="primary" className="purchase-request-filter-search">
                <i className="ti ti-search" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="light-secondary"
                className="purchase-request-filter-reset"
                onClick={resetRequestFilters}
              >
                Reset
              </Button>
            </Form>
          </div>
        }
        tableBody={
          requests.length
            ? requests.map((request, index) => {
                const requestNumber = getRequestValue(request, ['sap_doc_num', 'DocNum', 'doc_num', 'DraftNum', 'draft_num'], '-');
                const status = getDocumentStatus(request);
                const requestId = getRequestValue(request, ['id', 'request_id', 'DocEntry']);
                const requestForAction = { ...request, id: requestId };
                const canChangeStatus = Boolean(requestId) && !['CANCELLED', 'COMPLETED'].includes(status);
                return (
                  <tr key={requestId ?? index}>
                    <td>{requestNumber}</td>
                    <td>{formatRequestDate(getRequestValue(request, ['request_date', 'doc_date', 'DocDate', 'created_at']))}</td>
                    <td>{getRequestValue(request, ['department', 'department_name', 'Department'], '-')}</td>
                    <td>{getRequestValue(request, ['requester_name', 'RequesterName', 'requester'], '-')}</td>
                    <td>
                      <Badge
                        bg="transparent"
                        className={`purchase-request-status-badge purchase-request-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      >
                        {status}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant={String(actionMenu?.request?.id) === String(requestId) ? 'primary' : 'outline-primary'}
                        aria-label={`Open actions for request ${requestNumber}`}
                        aria-expanded={String(actionMenu?.request?.id) === String(requestId)}
                        onClick={(event) =>
                          setActionMenu((current) =>
                            String(current?.request?.id) === String(requestId)
                              ? null
                              : { request: requestForAction, canChangeStatus, target: event.currentTarget }
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
          requestPage.total > 0 ? (
            <TablePagination
              className="purchase-request-pagination border-top px-3 py-2 mt-0"
              currentPage={requestPage.currentPage}
              onPageChange={(currentPage) => setRequestPage((current) => ({ ...current, currentPage }))}
              pageCount={requestPage.lastPage}
              pageSize={appliedRequestFilters.perPage}
              total={requestPage.total}
              itemLabel="requests"
            />
          ) : undefined
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
          const request = actionMenu?.request;
          const canChangeStatus = actionMenu?.canChangeStatus;
          return (
            <div
              ref={ref}
              className="dropdown-menu show purchase-request-action-menu"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 170 }}
            >
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setActionMenu(null);
                  if (request) viewPurchaseRequest(request);
                }}
              >
                <i className="ti ti-eye text-primary me-2" />
                View
              </button>
              <button
                type="button"
                className="dropdown-item"
                disabled={!request?.id}
                onClick={() => {
                  setActionMenu(null);
                  if (request) editRequest(request);
                }}
              >
                <i className="ti ti-edit text-primary me-2" />
                Edit
              </button>
              <button
                type="button"
                className="dropdown-item"
                disabled={!canChangeStatus}
                onClick={() => {
                  setActionMenu(null);
                  if (request) setPendingAction({ request, status: 'COMPLETED', label: 'Close' });
                }}
              >
                <i className="ti ti-lock text-secondary me-2" />
                Close
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-danger"
                disabled={!canChangeStatus}
                onClick={() => {
                  setActionMenu(null);
                  if (request) setPendingAction({ request, status: 'CANCELLED', label: 'Cancel' });
                }}
              >
                <i className="ti ti-circle-x me-2" />
                Cancel
              </button>
            </div>
          );
        }}
      </Overlay>

      <Offcanvas
        show={Boolean(selectedRequest)}
        onHide={() => setSelectedRequest(null)}
        placement="end"
        className="purchase-request-detail-panel"
        aria-labelledby="purchase-request-detail-title"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title id="purchase-request-detail-title">Purchase Request Details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="purchase-request-details">
            {loadingRequestDetail ? (
              <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-muted">
                <Spinner animation="border" size="sm" />
                Loading purchase request details...
              </div>
            ) : selectedRequest ? (
              <>
                <div className="purchase-request-detail-header mb-4">
                  <Stack direction="horizontal" className="justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <div className="text-muted f-12">Purchase Request</div>
                      <h5 className="mb-0">
                        {getRequestValue(selectedRequest, ['DocNum', 'sap_doc_num', 'doc_num', 'DraftNum', 'draft_num'], '-')}
                      </h5>
                    </div>
                    <Badge
                      bg="transparent"
                      className={`purchase-request-status-badge purchase-request-status-${String(
                        getRequestValue(selectedRequest, ['DocStatus', 'status', 'document_status'], 'Open')
                      )
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')}`}
                    >
                      {getRequestValue(selectedRequest, ['DocStatus', 'status', 'document_status'], 'Open')}
                    </Badge>
                  </Stack>
                  <Row className="g-3">
                    {[
                      ['DocEntry', getRequestValue(selectedRequest, ['DocEntry', 'doc_entry'], '-')],
                      ['Series', getRequestValue(selectedRequest, ['SeriesName', 'series_name', 'Series'], '-')],
                      ['Document Date', formatRequestDate(getRequestValue(selectedRequest, ['DocDate', 'request_date']))],
                      ['Required Date', formatRequestDate(getRequestValue(selectedRequest, ['ReqDate', 'DocDueDate']))],
                      [
                        'Department',
                        [
                          getRequestValue(selectedRequest, ['Department'], ''),
                          getRequestValue(selectedRequest, ['DepartmentName', 'department_name'], '')
                        ]
                          .filter(Boolean)
                          .join(' - ') || '-'
                      ],
                      ['Requester', getRequestValue(selectedRequest, ['RequesterName', 'requester_name', 'Requester'], '-')]
                    ].map(([label, value]) => (
                      <Col sm={6} lg={4} key={label}>
                        <div className="purchase-request-detail-field">
                          <div className="text-muted f-12">{label}</div>
                          <div className="fw-semibold">{value}</div>
                        </div>
                      </Col>
                    ))}
                    <Col xs={12}>
                      <div className="purchase-request-detail-field">
                        <div className="text-muted f-12">Comments</div>
                        <div>{getRequestValue(selectedRequest, ['Comments', 'comments'], '-') || '-'}</div>
                      </div>
                    </Col>
                  </Row>
                </div>

                <Stack direction="horizontal" className="justify-content-between mb-2">
                  <h6 className="mb-0">Request Items</h6>
                  <Badge bg="light" text="dark">
                    {selectedRequest.details?.length || 0} item
                  </Badge>
                </Stack>
                {selectedRequest.details?.length ? (
                  <div className="table-responsive border rounded">
                    <table className="table table-sm mb-0 align-middle purchase-request-detail-items">
                  <thead>
                    <tr>
                      {[
                        '#',
                        'Item Code',
                        'Item Name',
                        'Quantity',
                        'Unit',
                        'Warehouse',
                        'Required Date',
                        'Branch',
                        'Business Unit',
                        'Department',
                        'Remarks',
                        'Status'
                      ].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.details.map((detail, detailIndex) => (
                      <tr key={detail.LineNum ?? detail.id ?? detailIndex}>
                        <td>{detailIndex + 1}</td>
                        <td>{getRequestValue(detail, ['item_code', 'ItemCode'], '-')}</td>
                        <td>{getRequestValue(detail, ['item_description', 'item_name', 'ItemName'], '-')}</td>
                        <td>{formatQuantity(getRequestValue(detail, ['quantity', 'Quantity']))}</td>
                        <td>{getRequestValue(detail, ['unit_msr', 'UnitMsr', 'uom'], '-')}</td>
                        <td>
                          {[getRequestValue(detail, ['WhsCode', 'whs_code'], ''), getRequestValue(detail, ['WhsName'], '')]
                            .filter(Boolean)
                            .join(' - ') || '-'}
                        </td>
                        <td>{formatRequestDate(getRequestValue(detail, ['pqt_req_date', 'PQTReqDate']))}</td>
                        <td>{getRequestValue(detail, ['ocr_code', 'OcrCode'], '-')}</td>
                        <td>{getRequestValue(detail, ['ocr_code2', 'OcrCode2'], '-')}</td>
                        <td>{getRequestValue(detail, ['ocr_code3', 'OcrCode3'], '-')}</td>
                        <td>{getRequestValue(detail, ['free_txt', 'FreeTxt', 'remarks'], '-')}</td>
                        <td>
                          <Badge bg="light-success" text="success">
                            {getRequestValue(detail, ['LineStatus', 'line_status'], '-')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                ) : (
                  <div className="text-center text-muted border rounded py-5">No items available for this request.</div>
                )}
              </>
            ) : (
              <p className="text-muted mb-0">No details available for this request.</p>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={Boolean(pendingAction)} onHide={() => !actionSaving && setPendingAction(null)} centered backdrop="static">
        <Modal.Header closeButton={!actionSaving}>
          <Modal.Title>{pendingAction?.label} Purchase Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pendingAction?.label} request {getRequestValue(pendingAction?.request, ['sap_doc_num'], '-')}? This will change its status to{' '}
          {pendingAction?.status}.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" disabled={actionSaving} onClick={() => setPendingAction(null)}>
            Back
          </Button>
          <Button variant={pendingAction?.status === 'CANCELLED' ? 'danger' : 'primary'} disabled={actionSaving} onClick={confirmAction}>
            {actionSaving ? 'Saving...' : pendingAction?.label}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showForm} onHide={closeForm} backdrop="static" dialogClassName="purchase-request-dialog" centered scrollable>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>{editingRequest ? 'Edit Purchase Request' : 'New Purchase Request'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="purchase-request-form" onSubmit={handleSubmit}>
            <h6 className="mb-3">Request Information</h6>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label>Series</Form.Label>
                <Select
                  inputId="purchase-request-series"
                  options={seriesOptions}
                  value={seriesOptions.find((option) => String(option.value) === String(form.Series)) || null}
                  onChange={(option) => updateHeader('Series', option?.value ?? '')}
                  isLoading={loadingSeries}
                  isDisabled={!form.DocDate || loadingSeries}
                  placeholder={loadingSeries ? 'Loading series...' : 'Select series'}
                  noOptionsMessage={() => (loadingSeries ? 'Loading series...' : 'Series not found')}
                />
              </Col>
              <Col md={4}>
                <Form.Label>Department</Form.Label>
                {userDepartment ? (
                  <Form.Control value={form.Department} readOnly required />
                ) : (
                  <Select
                    inputId="purchase-request-department"
                    options={headerDepartmentOptions}
                    value={headerDepartmentOptions.find((option) => option.value === form.Department) || null}
                    onChange={(option) => updateHeader('Department', option?.value ?? '')}
                    isLoading={loadingHeaderDepartments}
                    isDisabled={loadingHeaderDepartments}
                    placeholder={loadingHeaderDepartments ? 'Loading departments...' : 'Select department'}
                    noOptionsMessage={() => (loadingHeaderDepartments ? 'Loading departments...' : 'Department not found')}
                  />
                )}
              </Col>
              <Col md={4}>
                <Form.Label>Document Date</Form.Label>
                <FormDatePicker
                  type="date"
                  value={form.DocDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      DocDate: event.target.value,
                      Series: '',
                      DocDueDate: current.DocDueDate < event.target.value ? event.target.value : current.DocDueDate
                    }))
                  }
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Required Date</Form.Label>
                <FormDatePicker
                  type="date"
                  min={form.DocDate}
                  value={form.DocDueDate}
                  onChange={(event) => updateHeader('DocDueDate', event.target.value)}
                  required
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Comments</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  className="purchase-request-comments"
                  value={form.Comments}
                  onChange={(event) => updateHeader('Comments', event.target.value)}
                />
              </Col>
            </Row>

            <Stack direction="horizontal" className="justify-content-between mt-4 mb-3">
              <h6 className="mb-0">Request Lines</h6>
              <Button type="button" size="sm" variant="outline-primary" onClick={addLine}>
                <i className="ti ti-plus me-1" /> Add Item
              </Button>
            </Stack>

            <div className="purchase-request-lines-table table-responsive border rounded">
              <Table className="mb-0 align-middle" bordered>
                <thead>
                  <tr>
                    <th className="purchase-request-line-number">#</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Required Date</th>
                    <th>Quantity</th>
                    <th>UoM Entry</th>
                    <th>Unit</th>
                    <th>Warehouse</th>
                    <th>Branch</th>
                    <th>Unit</th>
                    <th>Department</th>
                    <th>Line Remarks</th>
                    <th className="purchase-request-line-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.Lines.map((line, index) => (
                    <tr key={line.key}>
                      <td className="purchase-request-line-number fw-semibold">{index + 1}</td>
                      <td>
                    <Select
                      inputId={`purchase-request-item-${index}`}
                      options={itemOptions}
                      value={itemOptions.find((option) => option.value === line.ItemCode) || null}
                      onChange={(option) => selectLineItem(index, option)}
                      isLoading={loadingItems}
                      isDisabled={loadingItems}
                      placeholder={loadingItems ? 'Loading items...' : 'Select item'}
                      noOptionsMessage={() => (loadingItems ? 'Loading items...' : 'Item not found')}
                    />
                      </td>
                      <td>
                    <Form.Control
                      value={line.ItemName}
                      onChange={(event) => updateLine(index, 'ItemName', event.target.value)}
                      readOnly={!line.ItemCode.toUpperCase().startsWith('JS')}
                    />
                      </td>
                      <td>
                    <FormDatePicker
                      type="date"
                      value={line.PQTReqDate}
                      onChange={(event) => updateLine(index, 'PQTReqDate', event.target.value)}
                      required
                    />
                      </td>
                      <td>
                    <Form.Control
                      type="number"
                      min="0.01"
                      step="any"
                      className="purchase-request-quantity"
                      value={line.Quantity}
                      onChange={(event) => updateLine(index, 'Quantity', event.target.value)}
                      onWheel={(event) => event.currentTarget.blur()}
                      required
                    />
                      </td>
                      <td>
                    <Form.Control value={line.UomEntry} onChange={(event) => updateLine(index, 'UomEntry', event.target.value)} />
                      </td>
                      <td>
                    <Form.Control value={line.UnitMsr} onChange={(event) => updateLine(index, 'UnitMsr', event.target.value)} />
                      </td>
                      <td>
                    {userWarehouse ? (
                      <Form.Control value={line.WhsCode} readOnly required />
                    ) : (
                      <Select
                        inputId={`purchase-request-warehouse-${index}`}
                        options={warehouseOptions}
                        value={warehouseOptions.find((option) => option.value === line.WhsCode) || null}
                        onChange={(option) => updateLine(index, 'WhsCode', option?.value ?? '')}
                        isLoading={loadingLineMasters}
                        isDisabled={loadingLineMasters}
                        placeholder="Select warehouse"
                      />
                    )}
                      </td>
                      <td>
                    {userBranch ? (
                      <Form.Control value={line.OcrCode} readOnly />
                    ) : (
                      <Select
                        inputId={`purchase-request-branch-${index}`}
                        options={ocrOptions.branch}
                        value={ocrOptions.branch.find((option) => option.value === line.OcrCode) || null}
                        onChange={(option) => updateLine(index, 'OcrCode', option?.value ?? '')}
                        isLoading={loadingLineMasters}
                        isDisabled={loadingLineMasters}
                        placeholder="Select branch"
                      />
                    )}
                      </td>
                      <td>
                    {userBusinessUnit ? (
                      <Form.Control value={line.OcrCode2} readOnly />
                    ) : (
                      <Select
                        inputId={`purchase-request-business-unit-${index}`}
                        options={ocrOptions.businessUnit}
                        value={ocrOptions.businessUnit.find((option) => option.value === line.OcrCode2) || null}
                        onChange={(option) => updateLine(index, 'OcrCode2', option?.value ?? '')}
                        isLoading={loadingLineMasters}
                        isDisabled={loadingLineMasters}
                        placeholder="Select unit"
                      />
                    )}
                      </td>
                      <td>
                    {userDepartment ? (
                      <Form.Control value={line.OcrCode3} readOnly />
                    ) : (
                      <Select
                        inputId={`purchase-request-line-department-${index}`}
                        options={ocrOptions.department}
                        value={ocrOptions.department.find((option) => option.value === line.OcrCode3) || null}
                        onChange={(option) => updateLine(index, 'OcrCode3', option?.value ?? '')}
                        isLoading={loadingLineMasters}
                        isDisabled={loadingLineMasters}
                        placeholder="Select department"
                      />
                    )}
                      </td>
                      <td>
                    <Form.Control
                      value={line.FreeTxt}
                      onChange={(event) => updateLine(index, 'FreeTxt', event.target.value)}
                    />
                      </td>
                      <td className="purchase-request-line-action text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-danger"
                          className="purchase-request-remove-line"
                          aria-label={`Remove item ${index + 1}`}
                          title="Remove line"
                          onClick={() => removeLine(index)}
                        >
                          <i className="ti ti-trash" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" className="purchase-request-cancel" onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="purchase-request-form" variant="primary" className="purchase-request-save" disabled={saving}>
            {saving ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="ti ti-device-floppy me-1" />}
            Save Request
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
