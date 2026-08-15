import { useCallback, useEffect, useState } from 'react';

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
import Select from 'react-select';

// project-imports
import MainCard from 'components/MainCard';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import MaterialServices from '../../../../services/production/MaterialServices';
import ProductionServices from '../../../../services/production/ProductionServices';
import ProductionWarehouseServices from '../../../../services/production/WarehouseServices';
import { useAlert } from '../../../../utils/alertContext';
import { useConfirm } from '../../../../utils/confirmContext';

const today = new Date().toISOString().slice(0, 10);
const firstDayOfMonth = `${today.slice(0, 8)}01`;
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 });
const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1080 }),
  menu: (base) => ({ ...base, zIndex: 1080 })
};
const compactSelectStyles = {
  ...selectStyles,
  control: (base) => ({ ...base, minHeight: 31, fontSize: '0.75rem' }),
  valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
  input: (base) => ({ ...base, fontSize: '0.75rem' }),
  option: (base) => ({ ...base, fontSize: '0.75rem', paddingTop: 6, paddingBottom: 6 })
};
const actionPopperConfig = {
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

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.transfers)) return payload.transfers;
  if (Array.isArray(payload?.inventory_transfers)) return payload.inventory_transfers;
  if (Array.isArray(payload?.documents)) return payload.documents;
  if (Array.isArray(payload?.bins)) return payload.bins;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

const getResponseDetail = (response) => {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  if (Array.isArray(payload?.items)) return payload.items[0] || null;

  return payload?.inventory_transfer || payload?.transfer || payload?.document || payload || null;
};

const formatTransferDate = (value) => {
  if (!value) return '-';

  const compactDate = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compactDate ? new Date(Number(compactDate[1]), Number(compactDate[2]) - 1, Number(compactDate[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTransferValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;

const normalizeInventoryTransfer = (item, index) => {
  const lines = getTransferValue(item, ['Lines', 'lines', 'DocumentLines', 'document_lines'], []);
  const lineList = Array.isArray(lines) ? lines : [];
  const fromWarehouse = getTransferValue(item, [
    'Filler',
    'filler',
    'FromWhsCode',
    'from_whs_code',
    'WhsCode',
    'whs_code',
    'fromWarehouse'
  ]);
  const toWarehouse = getTransferValue(item, ['ToWhsCode', 'to_whs_code', 'toWarehouse', 'to_warehouse']);
  const seriesCode = getTransferValue(item, ['Series', 'series', 'series_code', 'seriesCode']);
  const seriesName = getTransferValue(item, ['SeriesName', 'series_name', 'seriesName']);
  const series =
    [...new Set([seriesCode, seriesName].filter((value) => value !== undefined && value !== null && String(value).trim() !== ''))]
      .map(String)
      .join(' - ') || '-';

  return {
    id: getTransferValue(item, ['DocEntry', 'doc_entry', 'id'], index),
    documentNumber: getTransferValue(item, ['DocNum', 'doc_num', 'document_number', 'number'], '-'),
    series,
    postingDate: getTransferValue(item, ['DocDate', 'doc_date', 'posting_date', 'postingDate']),
    documentDate: getTransferValue(item, ['DocDueDate', 'doc_due_date', 'document_date', 'documentDate']),
    fromWarehouse,
    toWarehouse,
    comments: getTransferValue(item, ['Comments', 'comments', 'remark', 'remarks'], '-'),
    status: getTransferValue(item, ['DocumentStatus', 'document_status', 'Status', 'status'], '-'),
    totalItems: lineList.length || Number(getTransferValue(item, ['total_items', 'line_count', 'totalLines'], 0)) || 0,
    raw: item
  };
};

const normalizeTransferLine = (line, index) => ({
  id: getTransferValue(line, ['LineNum', 'line_num', 'id'], index),
  itemCode: getTransferValue(line, ['ItemCode', 'item_code', 'code'], '-'),
  description: getTransferValue(line, ['Dscription', 'Description', 'description', 'item_name', 'ItemName'], '-'),
  quantity: Number(getTransferValue(line, ['Quantity', 'quantity', 'qty'], 0)) || 0,
  uom: getTransferValue(line, ['Uom', 'UomCode', 'UomName', 'uom', 'unit'], '-'),
  fromWarehouse: getTransferValue(line, ['FromWhsCod', 'Filler', 'from_whs_code', 'WhsCode'], '-'),
  toWarehouse: getTransferValue(line, ['WhsCode', 'ToWhsCode', 'to_whs_code'], '-')
});

const createLine = () => ({
  item: null,
  description: '',
  quantity: '',
  uom: '',
  uomEntry: 0,
  ocrCode: null,
  ocrCode2: null,
  ocrCode3: null,
  fromBinQuantity: '',
  toBinQuantity: '',
  binAllocations: [],
  toBinAllocations: []
});

const createInitialForm = () => ({
  postingDate: today,
  documentDate: today,
  series: null,
  fromWarehouse: null,
  toWarehouse: null,
  toBinLocation: null,
  comments: '',
  lines: [createLine()]
});

const normalizeProduct = (item) => {
  const code = item.item_code || item.product_code || item.code || item.ItemCode || '';
  const name = item.item_name || item.product_name || item.name || item.ItemName || '';
  const uom = item.invntry_uom || item.inventory_uom || item.sal_unit_msr || item.uom || item.unit || item.unit_msr || '';
  const uomEntry = item.uom_entry ?? item.uomEntry ?? item.UomEntry ?? item.iuom_entry ?? item.inventory_uom_entry ?? item.suom_entry ?? 0;

  return {
    value: code,
    label: [code, name].filter(Boolean).join(' - ') || '-',
    name,
    uom,
    uomEntry,
    raw: item
  };
};

const normalizeWarehouse = (item) => {
  const code = item.whs_code || item.warehouse_code || item.code || item.WhsCode || '';
  const name = item.whs_name || item.warehouse_name || item.name || item.WhsName || '';

  return {
    value: code,
    label: [code, name].filter(Boolean).join(' - ') || '-',
    name,
    raw: item
  };
};

const normalizeOcr = (item) => {
  const code = item.ocr_code || item.ocrCode || item.OcrCode || item.code || '';
  const name = item.ocr_name || item.ocrName || item.OcrName || item.name || '';

  return {
    value: code,
    label: [code, name].filter(Boolean).join(' - ') || '-',
    name,
    raw: item
  };
};

const normalizeBin = (item, index) => {
  const code = item.bin_code || item.binCode || item.BinCode || item.code || '';
  const name = item.bin_name || item.binName || item.BinName || item.name || item.description || item.Description || item.Descr || '';
  const itemName = item.item_name || item.itemName || item.ItemName || item.product_name || item.productName || '';
  const itemCode = item.item_code || item.itemCode || item.ItemCode || item.product_code || item.productCode || '';
  const absEntry = item.AbsEntry ?? item.absEntry ?? item.abs_entry ?? item.BinAbsEntry ?? item.bin_abs_entry ?? item.id ?? code ?? index;
  const availableQty = Number(
    item.available_qty ??
      item.availableQty ??
      item.SisaQty ??
      item.sisa_qty ??
      item.sisaQty ??
      item.on_hand_qty ??
      item.onHandQty ??
      item.OnHandQty ??
      item.OnHand ??
      item.quantity ??
      item.Quantity ??
      item.qty ??
      item.Qty ??
      0
  );

  return { id: absEntry, absEntry, code, name, itemName, itemCode, availableQty, quantity: '', raw: item };
};

const normalizeBinHeader = (item, index) => {
  const code = item.bin_code || item.binCode || item.BinCode || item.code || '';
  const description =
    item.description ||
    item.Description ||
    item.Descr ||
    item.bin_description ||
    item.binDescription ||
    item.BinDescription ||
    item.bin_name ||
    item.binName ||
    item.BinName ||
    item.name ||
    '';
  const id = item.id || item.abs_entry || item.absEntry || item.AbsEntry || code || index;

  return {
    value: id,
    code,
    description,
    label: [code, description].filter(Boolean).join(' - ') || String(id),
    raw: item
  };
};

const getAllocatedQuantity = (line, allocationKey = 'binAllocations') =>
  (line[allocationKey] || []).reduce((total, allocation) => total + (Number(allocation.quantity) || 0), 0);

const isQuantityEqual = (first, second) => Math.abs((Number(first) || 0) - (Number(second) || 0)) < 0.000001;

export default function InventoryTransfer() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [productOptions, setProductOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });
  const [toBinHeaderOptions, setToBinHeaderOptions] = useState([]);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingToBinHeaders, setLoadingToBinHeaders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeBinLineIndex, setActiveBinLineIndex] = useState(null);
  const [activeBinType, setActiveBinType] = useState('from');
  const [binRows, setBinRows] = useState([]);
  const [loadingBins, setLoadingBins] = useState(false);
  const [inventoryTransfers, setInventoryTransfers] = useState([]);
  const [loadingInventoryTransfers, setLoadingInventoryTransfers] = useState(false);
  const [transferFilters, setTransferFilters] = useState({
    From: firstDayOfMonth,
    To: today,
    WhsCode: null,
    ToWhsCode: null
  });
  const [selectedTransferDetail, setSelectedTransferDetail] = useState(null);
  const [loadingTransferDetailId, setLoadingTransferDetailId] = useState(null);
  const [transferActionMenu, setTransferActionMenu] = useState(null);

  const activeBinLine = activeBinLineIndex === null ? null : form.lines[activeBinLineIndex];
  const activeBinWarehouse = activeBinType === 'from' ? form.fromWarehouse : form.toWarehouse;
  const allocatedBinQuantity = binRows.reduce((total, bin) => total + (Number(bin.quantity) || 0), 0);
  const hasInvalidBinQuantity = binRows.some(
    (bin) => Number(bin.quantity) < 0 || (bin.availableQty > 0 && Number(bin.quantity) > bin.availableQty)
  );

  const fetchInventoryTransfers = useCallback(
    async (filters = transferFilters) => {
      if (filters.From && filters.To && new Date(filters.From) > new Date(filters.To)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }

      setLoadingInventoryTransfers(true);

      try {
        const response = await ProductionWarehouseServices.getInventoryTransfer(
          filters.From || '',
          filters.To || '',
          filters.WhsCode?.value || '',
          filters.ToWhsCode?.value || ''
        );
        if (response?.data?.success === false) {
          throw new Error(response.data.message || 'Failed to fetch inventory transfers');
        }

        setInventoryTransfers(getResponseList(response).map(normalizeInventoryTransfer));
      } catch (error) {
        setInventoryTransfers([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch inventory transfers', 'danger');
      } finally {
        setLoadingInventoryTransfers(false);
      }
    },
    [showAlert, transferFilters]
  );

  const fetchTransferWarehouseOptions = useCallback(async () => {
    try {
      const response = await WarehouseServices.getAllWarehouse('');
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch warehouses');

      setWarehouseOptions(
        getResponseList(response)
          .map(normalizeWarehouse)
          .filter((option) => option.value)
      );
    } catch (error) {
      setWarehouseOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch warehouses', 'danger');
    }
  }, [showAlert]);

  useEffect(() => {
    fetchTransferWarehouseOptions();
    fetchInventoryTransfers();
    // Initial page load uses the default current-month filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewInventoryTransfer = async (transfer) => {
    const docEntry = transfer?.id;
    if (docEntry === undefined || docEntry === null || docEntry === '') {
      showAlert('DocEntry was not found', 'danger');
      return;
    }

    setLoadingTransferDetailId(docEntry);

    try {
      const response = await ProductionWarehouseServices.getDetailInventoryTransfer(docEntry);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch inventory transfer detail');
      }

      const detail = getResponseDetail(response);
      if (!detail) throw new Error('Inventory transfer detail was not found');

      setSelectedTransferDetail(detail);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch inventory transfer detail', 'danger');
    } finally {
      setLoadingTransferDetailId(null);
    }
  };

  const handleCancelInventoryTransfer = (transfer) => {
    const docEntry = transfer?.id;
    if (docEntry === undefined || docEntry === null || docEntry === '') {
      showAlert('DocEntry was not found', 'danger');
      return;
    }

    showConfirm({
      title: 'Cancel Inventory Transfer',
      subTitle: `Are you sure you want to cancel inventory transfer ${transfer.documentNumber || docEntry}?`,
      onConfirm: async () => {
        try {
          const response = await ProductionWarehouseServices.postCancelInventoryTransfer(docEntry);
          if (response?.data?.success === false) {
            throw new Error(response.data.message || 'Failed to cancel inventory transfer');
          }

          await fetchInventoryTransfers();
          showAlert(response?.data?.message || 'Inventory transfer cancelled successfully', 'success');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Failed to cancel inventory transfer', 'danger');
          throw error;
        }
      }
    });
  };

  const fetchSeries = async (documentDate) => {
    if (!documentDate) {
      setSeriesOptions([]);
      return;
    }

    setLoadingSeries(true);

    try {
      const response = await ProductionServices.getSeries(documentDate.replace(/-/g, ''), 67);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch series');

      const seriesData = response?.data?.data || response?.data?.series || [];
      setSeriesOptions(
        (Array.isArray(seriesData) ? seriesData : [seriesData])
          .map((item) => {
            const value =
              typeof item === 'object'
                ? (item.series ?? item.Series ?? item.series_code ?? item.seriesCode ?? item.value ?? item.code ?? item.id)
                : item;
            const label =
              typeof item === 'object'
                ? (item.label ?? item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.description ?? value)
                : item;

            return value == null ? null : { value, label: String(label || value), raw: item };
          })
          .filter(Boolean)
      );
    } catch (error) {
      setSeriesOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch series', 'danger');
    } finally {
      setLoadingSeries(false);
    }
  };

  const fetchFormOptions = async () => {
    setLoadingOptions(true);

    try {
      const [productResponse, warehouseResponse, branchResponse, businessUnitResponse, departmentResponse] = await Promise.all([
        MaterialServices.getMaterial(''),
        WarehouseServices.getAllWarehouse(''),
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);

      if (
        [productResponse, warehouseResponse, branchResponse, businessUnitResponse, departmentResponse].some(
          (response) => response?.data?.success === false
        )
      ) {
        throw new Error('Failed to fetch material, warehouse, or OCR data');
      }

      setProductOptions(
        getResponseList(productResponse)
          .map(normalizeProduct)
          .filter((option) => option.value)
      );
      setWarehouseOptions(
        getResponseList(warehouseResponse)
          .map(normalizeWarehouse)
          .filter((option) => option.value)
      );
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
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch form options', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchToBinHeaders = async (warehouseCode) => {
    if (!warehouseCode) {
      setToBinHeaderOptions([]);
      return;
    }

    setLoadingToBinHeaders(true);

    try {
      const response = await ProductionWarehouseServices.getBinHeader(warehouseCode);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch destination bin locations');
      }

      setToBinHeaderOptions(
        getResponseList(response)
          .map(normalizeBinHeader)
          .filter((option) => option.value !== '' && option.value !== null)
      );
    } catch (error) {
      setToBinHeaderOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch destination bin locations', 'danger');
    } finally {
      setLoadingToBinHeaders(false);
    }
  };

  const openCreateModal = () => {
    setForm(createInitialForm());
    setToBinHeaderOptions([]);
    setShowCreateModal(true);
    fetchFormOptions();
    fetchSeries(today);
  };

  const closeCreateModal = () => {
    if (submitting) return;

    setShowCreateModal(false);
    setActiveBinLineIndex(null);
    setBinRows([]);
  };

  const updateLine = (lineIndex, changes) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, index) => (index === lineIndex ? { ...line, ...changes } : line))
    }));
  };

  const selectProduct = (lineIndex, product) => {
    updateLine(lineIndex, {
      item: product,
      description: product?.name || '',
      uom: product?.uom || '',
      uomEntry: product?.uomEntry ?? 0,
      fromBinQuantity: '',
      toBinQuantity: '',
      binAllocations: [],
      toBinAllocations: []
    });
  };

  const addLine = () => {
    setForm((current) => ({ ...current, lines: [...current.lines, createLine()] }));
  };

  const removeLine = (lineIndex) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, index) => index !== lineIndex)
    }));
  };

  const setDirectFromBinQuantity = (lineIndex, value) => {
    const quantity = value === '' ? '' : value;

    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, index) => {
        if (index !== lineIndex) return line;
        if (quantity === '') return { ...line, fromBinQuantity: '', binAllocations: [] };

        return {
          ...line,
          fromBinQuantity: quantity,
          binAllocations: line.binAllocations.length ? [{ ...line.binAllocations[0], quantity }] : []
        };
      })
    }));
  };

  const setDirectToBinQuantity = (lineIndex, value) => {
    const quantity = value === '' ? '' : value;

    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, index) => {
        if (index !== lineIndex) return line;
        if (quantity === '') return { ...line, toBinQuantity: '', toBinAllocations: [] };

        return {
          ...line,
          toBinQuantity: quantity,
          toBinAllocations: line.toBinAllocations.length ? [{ ...line.toBinAllocations[0], quantity }] : []
        };
      })
    }));
  };

  const openBinLocations = async (lineIndex, binType) => {
    const line = form.lines[lineIndex];
    const warehouse = binType === 'from' ? form.fromWarehouse : form.toWarehouse;
    const allocationKey = binType === 'from' ? 'binAllocations' : 'toBinAllocations';
    const inputQuantity = binType === 'from' ? line.fromBinQuantity : line.toBinQuantity;

    if (!warehouse?.value) {
      showAlert(`Please select ${binType === 'from' ? 'From' : 'To'} Warehouse first`, 'warning');
      return;
    }

    if (!line.item?.value || !(Number(line.quantity) > 0)) {
      showAlert('Please select an item and enter its quantity first', 'warning');
      return;
    }

    setActiveBinLineIndex(lineIndex);
    setActiveBinType(binType);
    setLoadingBins(true);
    setBinRows([]);

    try {
      const response = await ProductionWarehouseServices.getBinDetails(line.item.value, warehouse.value);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch bin location quantities');
      }

      const existingAllocations = new Map((line[allocationKey] || []).map((allocation) => [String(allocation.id), allocation.quantity]));
      const nextBins = getResponseList(response).map((item, index) => {
        const bin = normalizeBin(item, index);
        return { ...bin, quantity: existingAllocations.get(String(bin.id)) ?? '' };
      });

      if (!existingAllocations.size && Number(inputQuantity) > 0 && nextBins.length) {
        nextBins[0] = { ...nextBins[0], quantity: inputQuantity };
      }

      setBinRows(nextBins);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch bin location quantities', 'danger');
    } finally {
      setLoadingBins(false);
    }
  };

  const closeBinModal = () => {
    setActiveBinLineIndex(null);
    setActiveBinType('from');
    setBinRows([]);
  };

  const saveBinAllocations = () => {
    const requiredQuantity = Number(activeBinLine?.quantity) || 0;

    if (hasInvalidBinQuantity) {
      showAlert('Bin transfer quantity cannot exceed its available quantity', 'warning');
      return;
    }

    if (!isQuantityEqual(allocatedBinQuantity, requiredQuantity)) {
      showAlert(
        `Total bin quantity must equal item quantity (${numberFormatter.format(requiredQuantity)}). Current allocation: ${numberFormatter.format(
          allocatedBinQuantity
        )}`,
        'warning'
      );
      return;
    }

    updateLine(activeBinLineIndex, {
      [activeBinType === 'from' ? 'binAllocations' : 'toBinAllocations']: binRows.filter((bin) => Number(bin.quantity) > 0),
      [activeBinType === 'from' ? 'fromBinQuantity' : 'toBinQuantity']: allocatedBinQuantity
    });
    closeBinModal();
  };

  const submitInventoryTransfer = async () => {
    const invalidLine = form.lines.find(
      (line) =>
        !line.item?.value ||
        !(Number(line.quantity) > 0) ||
        !line.uom ||
        !line.binAllocations.length ||
        !line.toBinAllocations.length ||
        !isQuantityEqual(getAllocatedQuantity(line), line.quantity) ||
        !isQuantityEqual(getAllocatedQuantity(line, 'toBinAllocations'), line.quantity) ||
        [...line.binAllocations, ...line.toBinAllocations].some(
          (bin) => Number(bin.quantity) < 0 || (bin.availableQty > 0 && Number(bin.quantity) > bin.availableQty)
        )
    );

    if (
      !form.postingDate ||
      !form.documentDate ||
      !form.series?.value ||
      !form.fromWarehouse?.value ||
      !form.toWarehouse?.value ||
      !form.toBinLocation?.value
    ) {
      showAlert('Please complete all inventory transfer header fields', 'warning');
      return;
    }

    if (invalidLine) {
      showAlert('Please complete every item and ensure each bin allocation equals its item quantity', 'warning');
      return;
    }

    const payload = {
      DocDate: form.postingDate,
      DocDueDate: form.documentDate,
      Comments: form.comments,
      Filler: form.fromWarehouse.value,
      ToWhsCode: form.toWarehouse.value,
      Lines: form.lines.map((line) => ({
        ItemCode: line.item.value,
        Quantity: Number(line.quantity),
        UomEntry: Number(line.uomEntry) || 0,
        Filler: form.fromWarehouse.value,
        ToWhsCode: form.toWarehouse.value,
        UseBaseUn: 'y',
        OcrCode: line.ocrCode?.value || '',
        OcrCode2: line.ocrCode2?.value || '',
        OcrCode3: line.ocrCode3?.value || '',
        Lines_BinFROM: line.binAllocations.map((bin) => ({
          AbsEntry: Number.isNaN(Number(bin.id)) ? bin.id : Number(bin.id),
          Quantity: Number(bin.quantity)
        })),
        Lines_BinTO: line.toBinAllocations.map((bin) => ({
          AbsEntry: Number.isNaN(Number(bin.id)) ? bin.id : Number(bin.id),
          Quantity: Number(bin.quantity)
        }))
      }))
    };

    setSubmitting(true);

    try {
      const response = await ProductionWarehouseServices.postInventory(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to create inventory transfer');
      }

      showAlert(response?.data?.message || 'Inventory transfer created successfully', 'success');
      setShowCreateModal(false);
      setForm(createInitialForm());
      await fetchInventoryTransfers();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create inventory transfer', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Inventory Transfer</h5>
            <span className="text-muted f-12">Manage inventory movements between production warehouses.</span>
          </Stack>
        }
        secondary={
          <Button variant="primary" onClick={openCreateModal}>
            <i className="ti ti-plus me-1" />
            Create Inventory Transfer
          </Button>
        }
      >
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={6} lg={2}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={transferFilters.From}
                  onChange={(event) => setTransferFilters((current) => ({ ...current, From: event.target.value }))}
                />
              </Col>
              <Col md={6} lg={2}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={transferFilters.To}
                  onChange={(event) => setTransferFilters((current) => ({ ...current, To: event.target.value }))}
                />
              </Col>
              <Col md={6} lg={3}>
                <Form.Label>From Warehouse</Form.Label>
                <Select
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  value={transferFilters.WhsCode}
                  options={warehouseOptions}
                  onChange={(WhsCode) => setTransferFilters((current) => ({ ...current, WhsCode }))}
                  placeholder="All source warehouses"
                  isClearable
                  isSearchable
                />
              </Col>
              <Col md={6} lg={3}>
                <Form.Label>To Warehouse</Form.Label>
                <Select
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  value={transferFilters.ToWhsCode}
                  options={warehouseOptions}
                  onChange={(ToWhsCode) => setTransferFilters((current) => ({ ...current, ToWhsCode }))}
                  placeholder="All destination warehouses"
                  isClearable
                  isSearchable
                />
              </Col>
              <Col lg={2}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loadingInventoryTransfers} onClick={() => fetchInventoryTransfers()}>
                    <i className={loadingInventoryTransfers ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loadingInventoryTransfers ? 'Loading...' : 'Search'}
                  </Button>
                  <Button
                    variant="light-secondary"
                    disabled={loadingInventoryTransfers}
                    aria-label="Reset inventory transfer filters"
                    onClick={() => {
                      const defaultFilters = { From: firstDayOfMonth, To: today, WhsCode: null, ToWhsCode: null };
                      setTransferFilters(defaultFilters);
                      fetchInventoryTransfers(defaultFilters);
                    }}
                  >
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
              <th>Document No.</th>
              <th>Document Date</th>
              <th>From Warehouse</th>
              <th>To Warehouse</th>
              <th>Status</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingInventoryTransfers ? (
              <tr>
                <td colSpan={6} className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                  Loading inventory transfers...
                </td>
              </tr>
            ) : inventoryTransfers.length ? (
              inventoryTransfers.map((transfer, index) => {
                const normalizedStatus = String(transfer.status).toUpperCase();
                const canCancel = ['O', 'OPEN', 'BOST_OPEN'].includes(normalizedStatus);
                const statusVariant =
                  normalizedStatus === 'O' || normalizedStatus === 'OPEN'
                    ? 'success'
                    : normalizedStatus === 'C' || normalizedStatus === 'CLOSED'
                      ? 'secondary'
                      : 'light';

                return (
                  <tr key={transfer.id || `${transfer.documentNumber}-${index}`}>
                    <td className="fw-semibold">{transfer.documentNumber}</td>
                    <td>{formatTransferDate(transfer.postingDate)}</td>
                    <td>{transfer.fromWarehouse || '-'}</td>
                    <td>{transfer.toWarehouse || '-'}</td>
                    <td>
                      <Badge bg={statusVariant} text={statusVariant === 'light' ? 'dark' : undefined}>
                        {transfer.status}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant={String(transferActionMenu?.transfer?.id) === String(transfer.id) ? 'primary' : 'outline-primary'}
                        aria-label={`Open actions for inventory transfer ${transfer.documentNumber}`}
                        aria-expanded={String(transferActionMenu?.transfer?.id) === String(transfer.id)}
                        onClick={(event) =>
                          setTransferActionMenu((current) =>
                            String(current?.transfer?.id) === String(transfer.id)
                              ? null
                              : { transfer, canCancel, target: event.currentTarget }
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
                <td colSpan={6} className="text-center text-muted py-5">
                  No inventory transfer data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>

      <Overlay
        show={Boolean(transferActionMenu)}
        target={transferActionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        popperConfig={actionPopperConfig}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setTransferActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const transfer = transferActionMenu?.transfer;

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
                disabled={loadingTransferDetailId !== null}
                onClick={() => {
                  setTransferActionMenu(null);
                  if (transfer) handleViewInventoryTransfer(transfer);
                }}
              >
                <i
                  className={
                    String(loadingTransferDetailId) === String(transfer?.id)
                      ? 'ti ti-loader-2 text-primary me-2'
                      : 'ti ti-eye text-primary me-2'
                  }
                />
                Detail
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-danger"
                disabled={!transferActionMenu?.canCancel}
                title={transferActionMenu?.canCancel ? 'Cancel inventory transfer' : 'Only open inventory transfers can be cancelled'}
                onClick={() => {
                  setTransferActionMenu(null);
                  if (transfer) handleCancelInventoryTransfer(transfer);
                }}
              >
                <i className="ti ti-x me-2" />
                Cancel Transfer
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal show={Boolean(selectedTransferDetail)} onHide={() => setSelectedTransferDetail(null)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Inventory Transfer Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransferDetail
            ? (() => {
                const detail = normalizeInventoryTransfer(selectedTransferDetail, 0);
                const rawLines =
                  selectedTransferDetail?.Lines ||
                  selectedTransferDetail?.lines ||
                  selectedTransferDetail?.DocumentLines ||
                  selectedTransferDetail?.document_lines ||
                  [];
                const lines = (Array.isArray(rawLines) ? rawLines : []).map(normalizeTransferLine);

                return (
                  <Stack gap={4}>
                    <Card className="border mb-0">
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document No.</Form.Label>
                            <div className="fw-semibold">{detail.documentNumber}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Series</Form.Label>
                            <div>{detail.series}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                            <div>{formatTransferDate(detail.postingDate)}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Status</Form.Label>
                            <div>
                              <Badge bg="light" text="dark">
                                {detail.status}
                              </Badge>
                            </div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">From Warehouse</Form.Label>
                            <div>{detail.fromWarehouse || '-'}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">To Warehouse</Form.Label>
                            <div>{detail.toWarehouse || '-'}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">DocEntry</Form.Label>
                            <div>{detail.id}</div>
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
                              <th>Item Code</th>
                              <th>Description</th>
                              <th className="text-end">Quantity</th>
                              <th>UOM</th>
                              <th>From Warehouse</th>
                              <th>To Warehouse</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.length ? (
                              lines.map((line, index) => (
                                <tr key={line.id ?? index}>
                                  <td>{index + 1}</td>
                                  <td className="fw-semibold">{line.itemCode}</td>
                                  <td>{line.description}</td>
                                  <td className="text-end">{numberFormatter.format(line.quantity)}</td>
                                  <td>{line.uom}</td>
                                  <td>{line.fromWarehouse}</td>
                                  <td>{line.toWarehouse}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="text-center text-muted py-4">
                                  No item detail found.
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
          <Button variant="light-secondary" onClick={() => setSelectedTransferDetail(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCreateModal} onHide={closeCreateModal} fullscreen>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title>Create Inventory Transfer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={4}>
            <Card className="border mb-0">
              <Card.Header>
                <h6 className="mb-0">Document Information</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col lg={6}>
                    <div className="border rounded p-3 h-100">
                      <h6 className="mb-3">Document Details</h6>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Label>Posting Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={form.postingDate}
                            onChange={(event) => setForm((current) => ({ ...current, postingDate: event.target.value }))}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label>Document Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={form.documentDate}
                            onChange={(event) => {
                              const documentDate = event.target.value;
                              setForm((current) => ({ ...current, documentDate, series: null }));
                              fetchSeries(documentDate);
                            }}
                          />
                        </Col>
                        <Col xs={12}>
                          <Form.Label>Series</Form.Label>
                          <Select
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                            value={form.series}
                            options={seriesOptions}
                            isLoading={loadingSeries}
                            isDisabled={!form.documentDate || loadingSeries}
                            onChange={(series) => setForm((current) => ({ ...current, series }))}
                            placeholder="Select series"
                            noOptionsMessage={() => (loadingSeries ? 'Loading series...' : 'Series not found')}
                          />
                        </Col>
                        <Col xs={12}>
                          <Form.Label>Comments</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={form.comments}
                            onChange={(event) => setForm((current) => ({ ...current, comments: event.target.value }))}
                            placeholder="Enter inventory transfer comments"
                          />
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="border rounded p-3 h-100">
                      <h6 className="mb-3">Warehouse Information</h6>
                      <Row className="g-3">
                        <Col xs={12}>
                          <Form.Label>From Warehouse</Form.Label>
                          <Select
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                            value={form.fromWarehouse}
                            options={warehouseOptions}
                            isLoading={loadingOptions}
                            onChange={(fromWarehouse) =>
                              setForm((current) => ({
                                ...current,
                                fromWarehouse,
                                lines: current.lines.map((line) => ({ ...line, fromBinQuantity: '', binAllocations: [] }))
                              }))
                            }
                            placeholder="Select source warehouse"
                            isSearchable
                          />
                        </Col>
                        <Col xs={12}>
                          <Form.Label>To Warehouse</Form.Label>
                          <Select
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                            value={form.toWarehouse}
                            options={warehouseOptions}
                            isLoading={loadingOptions}
                            onChange={(toWarehouse) => {
                              setForm((current) => ({
                                ...current,
                                toWarehouse,
                                toBinLocation: null,
                                lines: current.lines.map((line) => ({ ...line, toBinQuantity: '', toBinAllocations: [] }))
                              }));
                              setToBinHeaderOptions([]);
                              fetchToBinHeaders(toWarehouse?.value || '');
                            }}
                            placeholder="Select destination warehouse"
                            isSearchable
                          />
                        </Col>
                        <Col xs={12}>
                          <Form.Label>To Bin Location</Form.Label>
                          <Select
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                            value={form.toBinLocation}
                            options={toBinHeaderOptions}
                            isLoading={loadingToBinHeaders}
                            isDisabled={!form.toWarehouse?.value || loadingToBinHeaders}
                            onChange={(toBinLocation) => setForm((current) => ({ ...current, toBinLocation }))}
                            placeholder={form.toWarehouse?.value ? 'Select destination bin' : 'Select To Warehouse first'}
                            noOptionsMessage={() =>
                              loadingToBinHeaders ? 'Loading bin locations...' : 'Destination bin location not found'
                            }
                            isSearchable
                          />
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border mb-0">
              <Card.Header>
                <Stack direction="horizontal" className="justify-content-between">
                  <h6 className="mb-0">Items</h6>
                  <Button variant="light-primary" size="sm" onClick={addLine}>
                    <i className="ti ti-plus me-1" />
                    Add Item
                  </Button>
                </Stack>
              </Card.Header>
              <Card.Body className="p-0 f-12">
                <Table className="mb-0 align-middle f-12" responsive bordered size="sm">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>#</th>
                      <th style={{ minWidth: 250 }}>Item</th>
                      <th style={{ minWidth: 210 }}>Item Description</th>
                      <th style={{ minWidth: 105 }}>Qty</th>
                      <th style={{ minWidth: 90 }}>UOM</th>
                      <th style={{ minWidth: 190 }}>Branch</th>
                      <th style={{ minWidth: 190 }}>Business Unit</th>
                      <th style={{ minWidth: 190 }}>Department</th>
                      <th style={{ minWidth: 180 }}>From Bin Locations</th>
                      <th style={{ minWidth: 180 }}>To Bin Locations</th>
                      <th style={{ width: 55 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, lineIndex) => {
                      const fromAllocatedQuantity = getAllocatedQuantity(line);
                      const toAllocatedQuantity = getAllocatedQuantity(line, 'toBinAllocations');
                      const fromAllocationValid =
                        Number(line.quantity) > 0 &&
                        line.binAllocations.length > 0 &&
                        isQuantityEqual(fromAllocatedQuantity, line.quantity);
                      const toAllocationValid =
                        Number(line.quantity) > 0 &&
                        line.toBinAllocations.length > 0 &&
                        isQuantityEqual(toAllocatedQuantity, line.quantity);

                      return (
                        <tr key={lineIndex}>
                          <td>{lineIndex + 1}</td>
                          <td>
                            <Select
                              styles={compactSelectStyles}
                              menuPortalTarget={document.body}
                              menuPlacement="top"
                              value={line.item}
                              options={productOptions}
                              isLoading={loadingOptions}
                              onChange={(product) => selectProduct(lineIndex, product)}
                              placeholder="Search item..."
                              noOptionsMessage={() => 'Item not found'}
                              isSearchable
                            />
                          </td>
                          <td>
                            <Form.Control size="sm" value={line.description} readOnly placeholder="Filled from selected item" />
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="number"
                              min="0.000001"
                              step="any"
                              value={line.quantity}
                              onChange={(event) => updateLine(lineIndex, { quantity: event.target.value })}
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control size="sm" value={line.uom} readOnly placeholder="UOM" />
                          </td>
                          <td>
                            <Select
                              styles={compactSelectStyles}
                              menuPortalTarget={document.body}
                              menuPlacement="top"
                              value={line.ocrCode}
                              options={ocrOptions.branch}
                              isLoading={loadingOptions}
                              onChange={(ocrCode) => updateLine(lineIndex, { ocrCode })}
                              placeholder="Select branch"
                              isClearable
                              isSearchable
                            />
                          </td>
                          <td>
                            <Select
                              styles={compactSelectStyles}
                              menuPortalTarget={document.body}
                              menuPlacement="top"
                              value={line.ocrCode2}
                              options={ocrOptions.businessUnit}
                              isLoading={loadingOptions}
                              onChange={(ocrCode2) => updateLine(lineIndex, { ocrCode2 })}
                              placeholder="Select unit"
                              isClearable
                              isSearchable
                            />
                          </td>
                          <td>
                            <Select
                              styles={compactSelectStyles}
                              menuPortalTarget={document.body}
                              menuPlacement="top"
                              value={line.ocrCode3}
                              options={ocrOptions.department}
                              isLoading={loadingOptions}
                              onChange={(ocrCode3) => updateLine(lineIndex, { ocrCode3 })}
                              placeholder="Select department"
                              isClearable
                              isSearchable
                            />
                          </td>
                          <td>
                            <InputGroup size="sm">
                              <Form.Control
                                type="number"
                                min="0"
                                step="any"
                                value={line.fromBinQuantity}
                                onChange={(event) => setDirectFromBinQuantity(lineIndex, event.target.value)}
                                isValid={fromAllocationValid}
                                isInvalid={line.binAllocations.some(
                                  (bin) => bin.availableQty > 0 && Number(bin.quantity) > bin.availableQty
                                )}
                                placeholder="Input qty"
                                aria-label="From bin allocated quantity"
                              />
                              <Button
                                size="sm"
                                variant={fromAllocationValid ? 'success' : 'outline-warning'}
                                onClick={() => openBinLocations(lineIndex, 'from')}
                                title="Select From Bin Locations"
                                aria-label="Select From Bin Locations"
                              >
                                <i className="ti ti-list-search" />
                              </Button>
                            </InputGroup>
                          </td>
                          <td>
                            <InputGroup size="sm">
                              <Form.Control
                                type="number"
                                min="0"
                                step="any"
                                value={line.toBinQuantity}
                                onChange={(event) => setDirectToBinQuantity(lineIndex, event.target.value)}
                                isValid={toAllocationValid}
                                isInvalid={line.toBinAllocations.some(
                                  (bin) => bin.availableQty > 0 && Number(bin.quantity) > bin.availableQty
                                )}
                                placeholder="Input qty"
                                aria-label="To bin allocated quantity"
                              />
                              <Button
                                size="sm"
                                variant={toAllocationValid ? 'success' : 'outline-info'}
                                onClick={() => openBinLocations(lineIndex, 'to')}
                                title="Select To Bin Locations"
                                aria-label="Select To Bin Locations"
                              >
                                <i className="ti ti-list-search" />
                              </Button>
                            </InputGroup>
                          </td>
                          <td className="text-center">
                            <Button
                              className="rounded-circle"
                              variant="outline-danger"
                              size="sm"
                              disabled={form.lines.length === 1}
                              onClick={() => removeLine(lineIndex)}
                              aria-label="Remove item"
                            >
                              <i className="ti ti-trash" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={submitting} onClick={closeCreateModal}>
            Cancel
          </Button>
          <Button variant="primary" disabled={submitting} onClick={submitInventoryTransfer}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <i className="ti ti-device-floppy me-1" />
                Create Inventory Transfer
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={activeBinLineIndex !== null} onHide={closeBinModal} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{activeBinType === 'from' ? 'From' : 'To'} Bin Locations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col md={4}>
              <small className="text-muted d-block">Item</small>
              <span className="fw-semibold">{activeBinLine?.item?.label || '-'}</span>
            </Col>
            <Col md={3}>
              <small className="text-muted d-block">{activeBinType === 'from' ? 'From' : 'To'} Warehouse</small>
              <span className="fw-semibold">{activeBinWarehouse?.label || '-'}</span>
            </Col>
            <Col md={2}>
              <small className="text-muted d-block">Required Qty</small>
              <span className="fw-semibold">{numberFormatter.format(Number(activeBinLine?.quantity) || 0)}</span>
            </Col>
            <Col md={3}>
              <small className="text-muted d-block">Allocated Qty</small>
              <Badge bg={isQuantityEqual(allocatedBinQuantity, activeBinLine?.quantity) ? 'success' : 'warning'}>
                {numberFormatter.format(allocatedBinQuantity)}
              </Badge>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive bordered hover>
            <thead>
              <tr>
                <th style={{ width: 55 }}>#</th>
                <th>AbsEntry</th>
                <th>Item</th>
                <th className="text-end">Available Qty</th>
                <th style={{ minWidth: 180 }}>Transfer Qty</th>
              </tr>
            </thead>
            <tbody>
              {loadingBins ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Loading bin locations...
                  </td>
                </tr>
              ) : binRows.length ? (
                binRows.map((bin, index) => (
                  <tr key={bin.id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">{bin.absEntry ?? '-'}</td>
                    <td>
                      <div className="fw-semibold">{bin.itemName || '-'}</div>
                      <small className="text-muted">{bin.itemCode || '-'}</small>
                    </td>
                    <td className="text-end">{numberFormatter.format(bin.availableQty)}</td>
                    <td>
                      <Form.Control
                        type="number"
                        min="0"
                        max={bin.availableQty || undefined}
                        step="any"
                        value={bin.quantity}
                        onChange={(event) =>
                          setBinRows((current) =>
                            current.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: event.target.value } : row))
                          )
                        }
                        isInvalid={Number(bin.quantity) < 0 || (bin.availableQty > 0 && Number(bin.quantity) > bin.availableQty)}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No bin locations found for the selected warehouse and item.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4} className="text-end">
                  Total Allocated
                </th>
                <th>{numberFormatter.format(allocatedBinQuantity)}</th>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={closeBinModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={
              loadingBins || !binRows.length || hasInvalidBinQuantity || !isQuantityEqual(allocatedBinQuantity, activeBinLine?.quantity)
            }
            onClick={saveBinAllocations}
          >
            Save Bin Allocation
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
