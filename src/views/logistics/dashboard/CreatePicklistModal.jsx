import { useEffect, useState } from 'react';
import Select from 'react-select';
import { Alert, Badge, Button, Col, Form, Modal, Row, Stack, Table } from 'react-bootstrap';
import PicklistRecommendations from './PicklistRecommendations';
import SalesOrderDetailModal from './SalesOrderDetailModal';
import OrderServices from '../../../services/customer-portal/OrderServices';
import WarehouseServices from '../../../services/customer-portal/WarehouseServices';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import ExpeditionServices from '../../../services/logistics/ExpeditionServices';
import ProductionWarehouseServices from '../../../services/production/WarehouseServices';
import { useAlert } from '../../../utils/alertContext';

const approved = (order) =>
  String(order.status || '')
    .trim()
    .toUpperCase() === 'ORDER_APPROVED';
const orderNumber = (order) => order.sap_doc_num || order.order_no || order.id;
const orderDate = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
  return value ? String(value).slice(0, 10) : '-';
};
const formatStatus = (value) =>
  String(value || '-')
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
const logisticStatusClass = (value) =>
  String(value || '').toUpperCase().includes('RESCHEDULE')
    ? 'picklist-logistic-badge picklist-logistic-badge-reschedule'
    : 'picklist-logistic-badge';
const getLogisticOrderRows = (response) => {
  const root = response?.data?.data ?? response?.data ?? [];
  const payload = root?.orders || root?.data || root;
  const rows = Array.isArray(payload) ? payload : payload?.data || payload?.items || [];
  return Array.isArray(rows) ? rows : [];
};
const formatNumber = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 });
const shippingTypeOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'pickup', label: 'Pickup' }
];
const getVehicleRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'vehicles', 'kendaraan', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const getVehicleValue = (vehicle, keys) =>
  keys.map((key) => vehicle?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const normalizeVehicleOption = (vehicle, index) => {
  const licensePlate = String(
    getVehicleValue(vehicle, [
      'license_plate',
      'licensePlate',
      'LicensePlate',
      'plate_number',
      'plateNumber',
      'NoPolisi',
      'no_polisi',
      'Nopol',
      'nopol',
      'vehicle_number',
      'vehicleNumber',
      'code',
      'Code'
    ])
  ).trim();
  const vehicleName = String(
    getVehicleValue(vehicle, [
      'U_Merk',
      'u_merk',
      'vehicle_type',
      'vehicleType',
      'type',
      'jenis_kendaraan',
      'vehicle_name',
      'vehicleName',
      'name',
      'Name'
    ])
  ).trim();
  const capacityKg = getVehicleValue(vehicle, ['U_KapasitasKg', 'u_kapasitas_kg', 'capacity_kg', 'capacityKg']);
  const capacityM3 = getVehicleValue(vehicle, ['U_KapasitasM3', 'u_kapasitas_m3', 'capacity_m3', 'capacityM3']);
  const capacityLabel = [
    Number(capacityKg) > 0 ? `${Number(capacityKg).toLocaleString('id-ID', { maximumFractionDigits: 3 })} kg` : '',
    Number(capacityM3) > 0 ? `${Number(capacityM3).toLocaleString('id-ID', { maximumFractionDigits: 3 })} m³` : ''
  ]
    .filter(Boolean)
    .join(' / ');
  const labelDetails = [vehicleName, capacityLabel].filter(Boolean).join(' · ');

  if (!licensePlate) return null;
  return {
    value: licensePlate,
    label: labelDetails ? `${licensePlate} — ${labelDetails}` : licensePlate,
    key: String(getVehicleValue(vehicle, ['id', 'vehicle_id', 'vehicleId']) || `${licensePlate}-${index}`),
    capacityKg: Number(capacityKg) || 0,
    capacityM3: Number(capacityM3) || 0,
    brand: vehicleName,
    vehicle
  };
};
const getDriverRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'drivers', 'sopir', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const normalizeDriverOption = (driver, index) => {
  const driverCode = String(
    getVehicleValue(driver, [
      'driver_code',
      'driverCode',
      'DriverCode',
      'kode_sopir',
      'KodeSopir',
      'code',
      'Code',
      'id'
    ])
  ).trim();
  const driverName = String(
    getVehicleValue(driver, [
      'driver_name',
      'driverName',
      'DriverName',
      'nama_sopir',
      'NamaSopir',
      'name',
      'Name'
    ])
  ).trim();

  if (!driverCode && !driverName) return null;
  const value = driverCode || driverName;
  return {
    value,
    label: driverCode && driverName && driverCode !== driverName ? `${driverCode} — ${driverName}` : driverName || driverCode,
    key: `${value}-${index}`,
    driver
  };
};
const getCheckerRows = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'checkers', 'checker', 'nama_checker', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const normalizeCheckerOption = (checker, index) => {
  const checkerCode = String(
    getVehicleValue(checker, [
      'checker_code',
      'checkerCode',
      'CheckerCode',
      'kode_checker',
      'KodeChecker',
      'code',
      'Code',
      'id'
    ])
  ).trim();
  const checkerName = String(
    getVehicleValue(checker, [
      'checker_name',
      'checkerName',
      'CheckerName',
      'nama_checker',
      'NamaChecker',
      'name',
      'Name'
    ])
  ).trim();

  if (!checkerCode && !checkerName) return null;
  const value = checkerCode || checkerName;
  return {
    value,
    label: checkerCode && checkerName && checkerCode !== checkerName ? `${checkerCode} — ${checkerName}` : checkerName || checkerCode,
    key: `${value}-${index}`,
    checker
  };
};
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const getUnitWeight = (line) => {
  const match = [...String(line.item_name || '').matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)].at(-1);
  if (!match) return '';
  return Number(match[1].replace(',', '.')) / (/^(g|gr|gram)$/i.test(match[2]) ? 1000 : 1);
};
const getResponseRows = (response, keys = []) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of [...keys, 'data', 'items', 'rows', 'value', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const normalizeWarehouseOption = (item) => {
  const value = String(item?.whs_code ?? item?.whsCode ?? item?.WhsCode ?? item?.warehouse_code ?? item?.code ?? '').trim();
  const name = String(item?.whs_name ?? item?.whsName ?? item?.WhsName ?? item?.warehouse_name ?? item?.name ?? '').trim();
  return value ? { value, label: name && name !== value ? `${value} — ${name}` : value } : null;
};
const normalizeBinOption = (item, index) => {
  const value = String(item?.abs_entry ?? item?.absEntry ?? item?.AbsEntry ?? item?.id ?? item?.bin_code ?? item?.BinCode ?? '').trim();
  const code = String(item?.bin_code ?? item?.binCode ?? item?.BinCode ?? item?.code ?? item?.BinLoc ?? value).trim();
  const name = String(item?.description ?? item?.Description ?? item?.Descr ?? item?.descr ?? item?.bin_name ?? item?.name ?? '').trim();
  const stockValue =
    item?.available_qty ??
    item?.availableQty ??
    item?.SisaQty ??
    item?.sisa_qty ??
    item?.on_hand_qty ??
    item?.onHandQty ??
    item?.OnHandQty ??
    item?.OnHand ??
    item?.quantity ??
    item?.Quantity ??
    item?.qty ??
    item?.Qty;
  const stock = stockValue === undefined || stockValue === null || stockValue === '' ? null : Number(stockValue);
  return value
    ? {
        value,
        code: code || `Bin ${index + 1}`,
        name,
        label: name && name !== code ? `${code} — ${name}` : code || `Bin ${index + 1}`,
        stock: Number.isFinite(stock) ? stock : null
      }
    : null;
};

export default function CreatePicklistModal({ onClose, onSuccess }) {
  const { showAlert } = useAlert();
  const [form, setForm] = useState({ postingDate: today(), comments: '' });
  const [lines, setLines] = useState([]);
  const [shippingType, setShippingType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licensePlateOptions, setLicensePlateOptions] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const [driver, setDriver] = useState(null);
  const [driverOptions, setDriverOptions] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverError, setDriverError] = useState('');
  const [checker, setChecker] = useState(null);
  const [checkerOptions, setCheckerOptions] = useState([]);
  const [loadingCheckers, setLoadingCheckers] = useState(false);
  const [checkerError, setCheckerError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [capacity, setCapacity] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseError, setWarehouseError] = useState('');
  const [binPickerLineId, setBinPickerLineId] = useState(null);
  const [binAllocationDraft, setBinAllocationDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const totalWeight = lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitWeight) || 0), 0);
  const orderCount = new Set(lines.map((line) => line.orderId)).size;
  const allowsMultipleOrders = shippingType === 'internal';
  const singleOrderLimitReached = !allowsMultipleOrders && orderCount >= 1;
  const filteredOrders = orders.filter((item) =>
    `${orderNumber(item)} ${item.customer_name || ''} ${item.card_code || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const binPickerLine = lines.find((line) => line.id === binPickerLineId) || null;
  const allocatedBinQuantity = Object.values(binAllocationDraft).reduce((total, quantity) => total + (Number(quantity) || 0), 0);
  const openBinPicker = (line) => {
    setBinAllocationDraft(
      Object.fromEntries((line.binAllocations || []).map((allocation) => [String(allocation.value), String(allocation.quantity)]))
    );
    setBinPickerLineId(line.id);
  };
  const closeBinPicker = () => {
    setBinPickerLineId(null);
    setBinAllocationDraft({});
  };
  const saveBinAllocations = () => {
    if (!binPickerLine) return;
    const binAllocations = (binPickerLine.binOptions || [])
      .map((bin) => ({ ...bin, quantity: Number(binAllocationDraft[bin.value]) || 0 }))
      .filter((bin) => bin.quantity > 0);
    changeLine(binPickerLine.id, 'binAllocations', binAllocations);
    closeBinPicker();
  };
  const changeLine = (id, field, value) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  const requestClose = () => {
    if (saving) return;
    if (lines.length || form.comments) setConfirmClose(true);
    else onClose();
  };
  const invalidLines = lines.some((line) => {
    const quantity = Number(line.quantity);
    if (!line.warehouse || !Number.isFinite(quantity) || quantity <= 0 || quantity > line.orderedQuantity) return true;
    if (line.stockEmpty) return true;
    if (line.loadingBins || !line.binsLoaded) return true;
    if (line.binOptions?.length) {
      const allocated = (line.binAllocations || []).reduce((total, bin) => total + Number(bin.quantity || 0), 0);
      return allocated !== quantity;
    }
    return line.binsLoaded && Number(line.directBinQuantity) !== quantity;
  });
  const saveDisabled =
    saving ||
    !shippingType ||
    !form.postingDate ||
    !lines.length ||
    invalidLines ||
    (shippingType === 'internal' && !licensePlate);

  const savePicklist = async () => {
    if (saveDisabled) return;
    setSaving(true);
    setError('');
    const driverName = String(
      getVehicleValue(driver?.driver, ['driver_name', 'driverName', 'DriverName', 'nama_sopir', 'NamaSopir', 'name', 'Name']) ||
        driver?.label ||
        ''
    );
    const checkerName = String(
      getVehicleValue(checker?.checker, ['checker_name', 'checkerName', 'CheckerName', 'nama_checker', 'NamaChecker', 'name', 'Name']) ||
        checker?.label ||
        ''
    );
    const payload = {
      shipping_type: shippingType,
      license_plate: licensePlate,
      driver_name: driverName,
      checker_name: checkerName,
      posting_date: form.postingDate,
      due_date: form.postingDate,
      total_weight_limit: Number(capacity) || 0,
      comments: form.comments.trim(),
      to_whs_code: '',
      items: lines.map((line) => ({
        sales_order_id: Number(line.orderId) || line.orderId,
        sales_order_detail_id: Number(line.orderDetailId) || line.orderDetailId,
        item_code: line.itemCode,
        whs_code: line.warehouse,
        ordered_qty: Number(line.orderedQuantity),
        pick_qty: Number(line.quantity),
        ...((line.binAllocations || []).length
          ? {
              bin_allocations: line.binAllocations.map((bin) => ({
                AbsEntry: Number(bin.value) || bin.value,
                Quantity: Number(bin.quantity),
                code: bin.code,
                name: bin.name
              }))
            }
          : {})
      }))
    };
    try {
      const response = await LogisticsServices.postPicklist(payload);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to create picklist.');
      }
      showAlert(response?.data?.message || 'Picklist created successfully.', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Failed to create picklist.';
      setError(message);
      showAlert(message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const fetchWarehouses = async () => {
    setLoadingWarehouses(true);
    setWarehouseError('');
    try {
      const response = await WarehouseServices.getAllWarehouse('');
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load warehouses.');
      setWarehouseOptions(getResponseRows(response, ['warehouses']).map(normalizeWarehouseOption).filter(Boolean));
    } catch (err) {
      setWarehouseOptions([]);
      setWarehouseError(err?.response?.data?.message || err.message || 'Failed to load warehouses.');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const fetchLineBins = async (lineId, itemCode, warehouse) => {
    if (!itemCode || !warehouse) {
      setLines((current) =>
        current.map((line) =>
          line.id === lineId
            ? {
                ...line,
                bin: null,
                binAllocations: [],
                binOptions: [],
                directBinQuantity: '',
                loadingBins: false,
                binsLoaded: false,
                stockEmpty: false
              }
            : line
        )
      );
      return;
    }
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              bin: null,
              binAllocations: [],
              binOptions: [],
              directBinQuantity: '',
              loadingBins: true,
              binsLoaded: false,
              stockEmpty: false,
              binError: ''
            }
          : line
      )
    );
    try {
      const response = await ProductionWarehouseServices.getBinDetails(itemCode, warehouse);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load bins.');
      const binOptions = getResponseRows(response, ['bins', 'bin_locations']).map(normalizeBinOption).filter(Boolean);
      if (!binOptions.length && /not[\s_-]*found/i.test(String(response?.data?.message || ''))) {
        throw new Error(response.data.message);
      }
      setLines((current) =>
        current.map((line) =>
          line.id === lineId && line.warehouse === warehouse
            ? { ...line, binOptions, loadingBins: false, binsLoaded: true, stockEmpty: false, binError: '' }
            : line
        )
      );
    } catch (err) {
      const binError = err?.response?.data?.message || err.message || 'Failed to load bins.';
      const stockEmpty = err?.response?.status === 404 || /not[\s_-]*found/i.test(String(binError));
      setLines((current) =>
        current.map((line) =>
          line.id === lineId && line.warehouse === warehouse
            ? {
                ...line,
                binOptions: [],
                loadingBins: false,
                binsLoaded: false,
                stockEmpty,
                binError: stockEmpty ? 'Stock Empty: no stock was found for this item and warehouse.' : binError
              }
            : line
        )
      );
    }
  };

  useEffect(() => {
    fetchWarehouses();
    // Warehouse master data is loaded once when the picklist modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    setVehicleError('');
    try {
      const response = await ExpeditionServices.getVehicle();
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load vehicle data.');
      }
      const options = getVehicleRows(response).map(normalizeVehicleOption).filter(Boolean);
      setLicensePlateOptions(options);
      if (!options.some((option) => option.value === licensePlate)) {
        setLicensePlate('');
        setCapacity('');
      }
    } catch (err) {
      setLicensePlateOptions([]);
      setVehicleError(err?.response?.data?.message || err.message || 'Failed to load vehicle data.');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    setDriverError('');
    try {
      const response = await ExpeditionServices.getDriver();
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load driver data.');
      }
      const options = getDriverRows(response).map(normalizeDriverOption).filter(Boolean);
      setDriverOptions(options);
      setDriver((current) => (options.some((option) => option.value === current?.value) ? current : null));
    } catch (err) {
      setDriverOptions([]);
      setDriver(null);
      setDriverError(err?.response?.data?.message || err.message || 'Failed to load driver data.');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const fetchCheckers = async () => {
    setLoadingCheckers(true);
    setCheckerError('');
    try {
      const response = await ExpeditionServices.getChecker();
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to load checker data.');
      }
      const options = getCheckerRows(response).map(normalizeCheckerOption).filter(Boolean);
      setCheckerOptions(options);
      setChecker((current) => (options.some((option) => option.value === current?.value) ? current : null));
    } catch (err) {
      setCheckerOptions([]);
      setChecker(null);
      setCheckerError(err?.response?.data?.message || err.message || 'Failed to load checker data.');
    } finally {
      setLoadingCheckers(false);
    }
  };

  useEffect(() => {
    if (shippingType !== 'internal') return;
    if (!licensePlateOptions.length && !loadingVehicles) fetchVehicles();
    if (!driverOptions.length && !loadingDrivers) fetchDrivers();
    if (!checkerOptions.length && !loadingCheckers) fetchCheckers();
    // Vehicle, driver, and checker data are loaded when the internal shipping controls become visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingType]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const statuses = ['RESCHEDULE_APPROVED', 'APPROVED'];
      const responses = await Promise.all(
        statuses.map((logisticStatus) => LogisticsServices.getLogisticOrders({
          logistic_status: logisticStatus,
          per_page: 1000,
          page: 1
        }))
      );
      responses.forEach((response) => {
        if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
          throw new Error(response?.data?.message || 'Failed to load logistics orders.');
        }
      });
      const uniqueOrders = new Map();
      responses.flatMap(getLogisticOrderRows).forEach((item, index) => {
        const nestedOrder = item.sales_order || item.order || {};
        const normalizedOrder = {
          ...item,
          ...nestedOrder,
          logistic_status: nestedOrder.logistic_status || item.logistic_status
        };
        const uniqueId = normalizedOrder.id ?? normalizedOrder.sales_order_id ?? normalizedOrder.requested_order_id ?? `${orderNumber(normalizedOrder)}-${index}`;
        uniqueOrders.set(String(uniqueId), { ...normalizedOrder, id: uniqueId });
      });
      setOrders([...uniqueOrders.values()]);
    } catch (err) {
      setOrders([]);
      setError(err?.response?.data?.message || err.message || 'Failed to load Sales Orders.');
    } finally {
      setLoading(false);
    }
  };
  const openSelection = () => {
    if (!shippingType || singleOrderLimitReached) return;
    setSelectedIds([]);
    setQuery('');
    setSelecting(true);
    fetchOrders();
  };
  const addOrders = async () => {
    if (adding || !selectedIds.length) return;
    if (!shippingType || (!allowsMultipleOrders && new Set([...lines.map((line) => line.orderId), ...selectedIds]).size > 1)) {
      setError('External and Pickup shipping allow only one Sales Order.');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await OrderServices.getDetailOrder(id);
          if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load Sales Order details.');
          const detail = response?.data?.data;
          if (!detail || !approved(detail)) throw new Error(`SO ${id} is no longer Order Approved. Refresh the list.`);
          if (!Array.isArray(detail.details) || !detail.details.length) throw new Error(`SO ${orderNumber(detail)} has no items.`);
          return detail.details.map((item, index) => ({
            id: `${id}-${item.id ?? index}`,
            orderId: String(id),
            orderDetailId: item.id ?? item.sales_order_detail_id ?? item.salesOrderDetailId ?? index,
            orderNumber: orderNumber(detail),
            customer: detail.customer_name,
            depo: detail.depo,
            address: detail.address || detail.bill_to_address || detail.Address,
            destinationCode: detail.card_code,
            itemCode: item.item_code,
            itemName: item.item_name,
            warehouse: item.whs_code,
            bin: null,
            binAllocations: [],
            directBinQuantity: '',
            binOptions: [],
            loadingBins: Boolean(item.whs_code),
            binsLoaded: false,
            stockEmpty: false,
            unit: item.unit_msr,
            orderedQuantity: Number(item.quantity) || 0,
            quantity: Number(item.quantity) || 0,
            unitWeight: getUnitWeight(item)
          }));
        })
      );
      setLines((current) => {
        const existing = new Set(current.map((line) => line.id));
        return [...current, ...details.flat().filter((line) => !existing.has(line.id))];
      });
      details
        .flat()
        .filter((line) => line.warehouse)
        .forEach((line) => fetchLineBins(line.id, line.itemCode, line.warehouse));
      setSelecting(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to add Sales Orders.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Modal show={!selecting && !resetting && !confirmClose && !detailOrder && !binPickerLineId} onHide={requestClose} fullscreen scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            Create Picklist
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Form.Label htmlFor="picklist-shipping-type">Shipping Type *</Form.Label>
              <Select
                inputId="picklist-shipping-type"
                classNamePrefix="react-select"
                options={shippingTypeOptions}
                value={shippingTypeOptions.find((option) => option.value === shippingType) || null}
                onChange={(option) => {
                  const nextShippingType = option?.value || '';
                  setError('');
                  setShippingType(nextShippingType);
                  setLines([]);
                  setSelectedIds([]);
                  closeBinPicker();
                  setLicensePlate('');
                  setCapacity('');
                  setDriver(null);
                  setChecker(null);
                }}
                placeholder="Select shipping type"
                isClearable
              />
            </Col>
            {shippingType === 'internal' && (
              <Col xs={12}>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label htmlFor="picklist-license-plate">License Plate Number *</Form.Label>
                    <Select
                      inputId="picklist-license-plate"
                      classNamePrefix="react-select"
                      options={licensePlateOptions}
                      value={licensePlateOptions.find((option) => option.value === licensePlate) || null}
                      onChange={(option) => {
                        setLicensePlate(option?.value || '');
                        setCapacity(option?.capacityKg || '');
                      }}
                      placeholder="Select license plate number"
                      isLoading={loadingVehicles}
                      isDisabled={loadingVehicles}
                      noOptionsMessage={() => (vehicleError ? 'Failed to load vehicles' : 'No vehicles found')}
                      isClearable
                    />
                    {vehicleError ? (
                      <Form.Text className="text-danger">
                        {vehicleError}{' '}
                        <Button variant="link" size="sm" className="p-0 align-baseline" onClick={fetchVehicles} disabled={loadingVehicles}>
                          Retry
                        </Button>
                      </Form.Text>
                    ) : (
                      <Form.Text>{loadingVehicles ? 'Loading vehicle data...' : 'Vehicle data from Expedition.'}</Form.Text>
                    )}
                  </Col>
                  <Col md={4}>
                    <Form.Label htmlFor="picklist-driver">Driver</Form.Label>
                    <Select
                      inputId="picklist-driver"
                      classNamePrefix="react-select"
                      options={driverOptions}
                      value={driver}
                      onChange={setDriver}
                      placeholder="Select driver"
                      isLoading={loadingDrivers}
                      isDisabled={loadingDrivers}
                      noOptionsMessage={() => (driverError ? 'Failed to load drivers' : 'No drivers found')}
                      isClearable
                    />
                    {driverError ? (
                      <Form.Text className="text-danger">
                        {driverError}{' '}
                        <Button variant="link" size="sm" className="p-0 align-baseline" onClick={fetchDrivers} disabled={loadingDrivers}>
                          Retry
                        </Button>
                      </Form.Text>
                    ) : null}
                  </Col>
                  <Col md={4}>
                    <Form.Label htmlFor="picklist-checker">Checker</Form.Label>
                    <Select
                      inputId="picklist-checker"
                      classNamePrefix="react-select"
                      options={checkerOptions}
                      value={checker}
                      onChange={setChecker}
                      placeholder="Select checker"
                      isLoading={loadingCheckers}
                      isDisabled={loadingCheckers}
                      noOptionsMessage={() => (checkerError ? 'Failed to load checkers' : 'No checkers found')}
                      isClearable
                    />
                    {checkerError ? (
                      <Form.Text className="text-danger">
                        {checkerError}{' '}
                        <Button variant="link" size="sm" className="p-0 align-baseline" onClick={fetchCheckers} disabled={loadingCheckers}>
                          Retry
                        </Button>
                      </Form.Text>
                    ) : null}
                  </Col>
                </Row>
              </Col>
            )}
            {shippingType === 'pickup' && (
              <Col md={8} className="d-flex align-items-end">
                <Alert variant="light" className="mb-0 w-100">
                  The customer will collect the goods. Select the Sales Orders and quantities to pick up.
                </Alert>
              </Col>
            )}
          </Row>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Form.Label>Posting Date *</Form.Label>
              <Form.Control
                type="date"
                value={form.postingDate}
                onChange={(event) => setForm({ ...form, postingDate: event.target.value })}
              />
            </Col>
            {shippingType === 'internal' && (
              <Col md={4}>
                <Form.Label>Vehicle Capacity (kg)</Form.Label>
                <Form.Control
                  type="number"
                  value={capacity}
                  readOnly
                  placeholder="Select a license plate"
                />
              </Col>
            )}
            <Col xs={12}>
              <Form.Label>Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Add picking or delivery instructions"
                value={form.comments}
                onChange={(event) => setForm({ ...form, comments: event.target.value })}
              />
            </Col>
          </Row>
          {error && <Alert variant="danger">{error}</Alert>}
          {warehouseError && (
            <Alert variant="warning">
              {warehouseError}{' '}
              <Button variant="link" className="p-0 align-baseline" onClick={fetchWarehouses} disabled={loadingWarehouses}>
                Retry
              </Button>
            </Alert>
          )}
          {!shippingType && <Alert variant="light">Select a shipping type to add Sales Orders.</Alert>}
          {shippingType && !allowsMultipleOrders && (
            <Alert variant="info">
              External and Pickup allow only one Sales Order. Remove the current SO items or reset to select another SO.
            </Alert>
          )}
          {shippingType && (
            <>
              <Stack direction="horizontal" className="justify-content-between mb-3">
                <div>
                  <h6 className="mb-1">Items</h6>
                  <small className="text-muted">Select approved Sales Orders, then adjust the quantity to pick.</small>
                </div>
                <Stack direction="horizontal" gap={2}>
                  <Button
                    data-permission-action="utility"
                    size="sm"
                    variant="outline-danger"
                    disabled={!lines.length}
                    onClick={() => setResetting(true)}
                  >
                    <i className="ti ti-refresh me-1" /> Reset
                  </Button>
                  <Button
                    data-permission-action="utility"
                    size="sm"
                    variant="outline-primary"
                    disabled={singleOrderLimitReached}
                    onClick={openSelection}
                  >
                    <i className="ti ti-plus me-1" /> Add SO
                  </Button>
                </Stack>
              </Stack>
              <Table responsive bordered className="align-middle">
                <thead>
                  <tr>
                    <th>Item / Sales Order</th>
                    <th>Customer / Address</th>
                    <th>Ordered Qty</th>
                    <th>Pick Qty</th>
                    <th>Warehouse</th>
                    <th>Bin Location</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td style={{ minWidth: 220 }}>
                        <span className="fw-semibold">{line.itemCode}</span>
                        <Badge
                          as="button"
                          type="button"
                          bg="light"
                          text="primary"
                          className="border ms-2 d-inline-flex align-items-center gap-1"
                          data-permission-action="utility"
                          aria-label={`View sales order ${line.orderNumber} details`}
                          title="Sales Order Detail"
                          onClick={() => setDetailOrder({ id: line.orderId, number: line.orderNumber })}
                        >
                          SO {line.orderNumber}
                          <i className="ti ti-info-circle" aria-hidden="true" />
                        </Badge>
                        <div className="text-muted f-12">{line.itemName || '-'}</div>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <div className="fw-semibold">{line.customer || '-'}</div>
                        <small className="text-muted d-block">{line.depo || '-'}</small>
                        <small className="text-muted d-block mt-1 text-break" style={{ whiteSpace: 'pre-line' }}>
                          <i className="ti ti-map-pin me-1" aria-hidden="true" />
                          {line.address || '-'}
                        </small>
                      </td>
                      <td>
                        {formatNumber(line.orderedQuantity)} {line.unit}
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <Form.Control
                          aria-label={`Pick quantity ${line.itemCode}`}
                          size="sm"
                          type="text"
                          inputMode="decimal"
                          value={line.quantity}
                          isInvalid={
                            !Number.isFinite(Number(line.quantity)) ||
                            Number(line.quantity) <= 0 ||
                            Number(line.quantity) > line.orderedQuantity
                          }
                          onChange={(event) => {
                            const value = event.target.value.replace(',', '.');
                            if (/^\d*\.?\d*$/.test(value)) {
                              setLines((current) =>
                                current.map((item) =>
                                  item.id === line.id
                                    ? { ...item, quantity: value, binAllocations: [], directBinQuantity: '' }
                                    : item
                                )
                              );
                            }
                          }}
                        />
                        <Form.Control.Feedback type="invalid">
                          Enter a positive quantity up to {line.orderedQuantity}.
                        </Form.Control.Feedback>
                      </td>
                      <td style={{ minWidth: 230 }}>
                        <Select
                          inputId={`picklist-warehouse-${line.id}`}
                          aria-label={`Warehouse ${line.itemCode}`}
                          classNamePrefix="react-select"
                          options={warehouseOptions}
                          value={warehouseOptions.find((option) => option.value === line.warehouse) || (line.warehouse ? { value: line.warehouse, label: line.warehouse } : null)}
                          onChange={(option) => {
                            const warehouse = option?.value || '';
                            changeLine(line.id, 'warehouse', warehouse);
                            fetchLineBins(line.id, line.itemCode, warehouse);
                          }}
                          placeholder="Select warehouse"
                          isLoading={loadingWarehouses}
                          isDisabled={loadingWarehouses}
                          isClearable
                          menuPortalTarget={document.body}
                          styles={{ menuPortal: (base) => ({ ...base, zIndex: 1060 }) }}
                        />
                        {!line.loadingBins && line.binError && !line.stockEmpty && (
                          <small className="text-danger d-block mt-1">{line.binError}</small>
                        )}
                      </td>
                      <td style={{ minWidth: 230 }}>
                        {line.warehouse && (
                          line.loadingBins || line.binOptions?.length ? (
                            <Button
                              type="button"
                              variant="outline-secondary"
                              size="sm"
                              className="w-100 text-start d-flex align-items-center justify-content-between"
                              disabled={line.loadingBins}
                              onClick={() => openBinPicker(line)}
                            >
                              <span>
                                {line.loadingBins
                                  ? 'Loading bins...'
                                  : line.binAllocations?.length
                                    ? `${line.binAllocations.length} bin · Allocated ${formatNumber(
                                        line.binAllocations.reduce((total, bin) => total + Number(bin.quantity || 0), 0)
                                      )}`
                                    : 'Set bin allocation'}
                              </span>
                              <i className={`ti ${line.loadingBins ? 'ti-loader-2' : 'ti-list-search'} ms-2`} aria-hidden="true" />
                            </Button>
                          ) : line.binsLoaded ? (
                            <Form.Control
                              aria-label={`Bin quantity ${line.itemCode}`}
                              size="sm"
                              type="text"
                              inputMode="decimal"
                              placeholder="Bin Qty"
                              value={line.directBinQuantity || ''}
                              isInvalid={
                                line.directBinQuantity !== '' && Number(line.directBinQuantity) !== Number(line.quantity)
                              }
                              onChange={(event) => {
                                const value = event.target.value.replace(',', '.');
                                if (/^\d*\.?\d*$/.test(value)) changeLine(line.id, 'directBinQuantity', value);
                              }}
                            />
                          ) : null
                        )}
                        {line.warehouse &&
                          line.binsLoaded &&
                          !line.binOptions?.length &&
                          line.directBinQuantity !== '' &&
                          Number(line.directBinQuantity) !== Number(line.quantity) && (
                            <small className="text-danger d-block mt-1">Bin Qty must match Pick Qty.</small>
                          )}
                        {line.stockEmpty && (
                          <div className="text-warning-emphasis bg-warning-subtle border border-warning-subtle rounded px-2 py-1 mt-1 small">
                            <i className="ti ti-alert-triangle me-1" aria-hidden="true" />
                            Stock Empty — Please select another warehouse
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          data-permission-action="utility"
                          className="logistics-order-action"
                          size="sm"
                          variant="outline-danger"
                          aria-label={`Remove ${line.itemCode}`}
                          onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                        >
                          <i className="ti ti-trash" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!lines.length && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <i className="ti ti-package d-block fs-1 mb-2" />
                        No items added. Click Add SO to select approved Sales Orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <div className="bg-light border rounded p-3 d-flex justify-content-between flex-wrap gap-3" aria-live="polite">
                <span>
                  {orderCount} Sales Orders · {lines.length} items
                </span>
                <span>
                  Total Weight: <strong>{formatNumber(totalWeight)} kg</strong>
                  {Number(capacity) > 0 && <> / {formatNumber(capacity)} kg</>}
                </span>
              </div>
              {Number(capacity) > 0 && totalWeight > Number(capacity) && (
                <Alert variant="danger" className="mt-3">
                  Total item weight exceeds the weight limit. Reduce the pick quantities.
                </Alert>
              )}
              {shippingType === 'external' && <PicklistRecommendations lines={lines} />}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button data-permission-action="utility" disabled={saveDisabled} onClick={savePicklist}>
            <i className={`ti ${saving ? 'ti-loader-2' : 'ti-device-floppy'} me-1`} />
            {saving ? 'Saving...' : 'Save Picklist'}
          </Button>
        </Modal.Footer>
      </Modal>
      {detailOrder && <SalesOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
      <Modal
        show={selecting}
        onHide={() => !adding && setSelecting(false)}
        dialogClassName="picklist-sales-order-dialog"
        centered
        scrollable
      >
        <Modal.Header closeButton={!adding}>
          <Modal.Title>Select Sales Orders</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack direction="horizontal" className="justify-content-between mb-3" gap={3}>
            <Form.Control
              aria-label="Search Sales Orders"
              placeholder="Search SO number or customer..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Badge className="picklist-approved-badge flex-shrink-0">
              Approved / Reschedule Approved
            </Badge>
            <Button variant="outline-secondary" size="sm" disabled={loading || adding} onClick={fetchOrders}>
              Refresh
            </Button>
          </Stack>
          {error && <Alert variant="danger">{error}</Alert>}
          <Table responsive hover className="align-middle">
            <thead>
              <tr>
                <th>Select</th>
                <th>SO Number</th>
                <th>Customer</th>
                <th>Loading Date</th>
                <th>ETA Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading approved Sales Orders...
                  </td>
                </tr>
              ) : (
                filteredOrders.map((item) => {
                  const id = String(item.id);
                  const selectOrder = () => {
                    if (adding) return;
                    setSelectedIds((current) =>
                      allowsMultipleOrders ? (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) : [id]
                    );
                  };
                  return (
                    <tr
                      key={id}
                      className={selectedIds.includes(id) ? 'table-active' : undefined}
                      style={{ cursor: adding ? 'default' : 'pointer' }}
                      onClick={selectOrder}
                    >
                      <td>
                        <Form.Check
                          type={allowsMultipleOrders ? 'checkbox' : 'radio'}
                          name="picklist-sales-order"
                          aria-label={`Select SO ${orderNumber(item)}`}
                          checked={selectedIds.includes(id)}
                          disabled={adding}
                          onClick={(event) => event.stopPropagation()}
                          onChange={selectOrder}
                        />
                      </td>
                      <td className="fw-semibold">{orderNumber(item)}</td>
                      <td>
                        <div>{item.customer_name || item.card_code || '-'}</div>
                        <small className="text-muted d-block">{item.depo || '-'}</small>
                      </td>
                      <td>{orderDate(item.doc_due_date, item.loading_date, item.loadingDate)}</td>
                      <td>{orderDate(item.eta_date, item.etaDate)}</td>
                      <td>
                        <Stack gap={1} className="align-items-start">
                          <Badge className="picklist-approved-badge">Order Approved</Badge>
                          <Badge className={logisticStatusClass(item.logistic_status)}>
                            Logistic: {formatStatus(item.logistic_status)}
                          </Badge>
                        </Stack>
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && !filteredOrders.length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
                    {error ? 'Could not load Sales Orders. Please retry.' : 'No approved Sales Orders found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <span className="me-auto text-muted">{selectedIds.length} SO selected · Existing items will not be duplicated.</span>
          <Button variant="light-secondary" disabled={adding} onClick={() => setSelecting(false)}>
            Cancel
          </Button>
          <Button data-permission-action="utility" disabled={loading || adding || !selectedIds.length} onClick={addOrders}>
            {adding ? 'Adding...' : 'Add Selected SO'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={Boolean(binPickerLine)} onHide={closeBinPicker} centered scrollable size="lg">
        <Modal.Header closeButton>
          <Modal.Title>From Bin Locations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {binPickerLine && (
            <>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <small className="text-muted d-block">Item</small>
                  <span className="fw-semibold">{binPickerLine.itemCode} - {binPickerLine.itemName || '-'}</span>
                </Col>
                <Col md={3}>
                  <small className="text-muted d-block">From Warehouse</small>
                  <span className="fw-semibold">{binPickerLine.warehouse}</span>
                </Col>
                <Col md={3}>
                  <small className="text-muted d-block">Required Qty</small>
                  <span className="fw-semibold">{formatNumber(binPickerLine.quantity)} {binPickerLine.unit}</span>
                </Col>
                <Col md={2}>
                  <small className="text-muted d-block">Allocated Qty</small>
                  <Badge bg={allocatedBinQuantity === Number(binPickerLine.quantity) ? 'success' : 'warning'}>
                    {formatNumber(allocatedBinQuantity)}
                  </Badge>
                </Col>
              </Row>
              <Table responsive bordered hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th>Bin</th>
                    <th className="text-end">Available Qty</th>
                    <th style={{ minWidth: 210 }}>Pick Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(binPickerLine.binOptions || []).map((bin, index) => (
                    <tr key={bin.value}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="fw-semibold">{bin.code}</div>
                        <small className="text-muted">{bin.name || '-'}</small>
                      </td>
                      <td className="text-end fw-semibold">
                        {bin.stock === null ? '-' : `${formatNumber(bin.stock)} ${binPickerLine.unit || ''}`}
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          inputMode="decimal"
                          value={binAllocationDraft[bin.value] ?? ''}
                          placeholder="0"
                          isInvalid={
                            Number(binAllocationDraft[bin.value] || 0) < 0 ||
                            (bin.stock !== null && Number(binAllocationDraft[bin.value] || 0) > bin.stock)
                          }
                          onChange={(event) => {
                            const value = event.target.value.replace(',', '.');
                            if (/^\d*\.?\d*$/.test(value)) {
                              setBinAllocationDraft((current) => ({ ...current, [bin.value]: value }));
                            }
                          }}
                        />
                        <Form.Control.Feedback type="invalid">Quantity exceeds available stock.</Form.Control.Feedback>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={closeBinPicker}>
            Cancel
          </Button>
          <Button
            onClick={saveBinAllocations}
            disabled={
              !binPickerLine ||
              allocatedBinQuantity !== Number(binPickerLine.quantity) ||
              (binPickerLine.binOptions || []).some(
                (bin) => bin.stock !== null && Number(binAllocationDraft[bin.value] || 0) > bin.stock
              )
            }
          >
            Save Bin Allocation
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={resetting || confirmClose}
        onHide={() => {
          setResetting(false);
          setConfirmClose(false);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{resetting ? 'Reset Items?' : 'Discard Picklist?'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetting
            ? 'All selected SO items will be removed from this form.'
            : 'Your mockup inputs will be cleared when you close this form.'}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light-secondary"
            onClick={() => {
              setResetting(false);
              setConfirmClose(false);
            }}
          >
            Keep Editing
          </Button>
          <Button
            data-permission-action="utility"
            variant="danger"
            onClick={() => {
              if (resetting) {
                setLines([]);
                setResetting(false);
              } else onClose();
            }}
          >
            {resetting ? 'Reset Items' : 'Discard'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
