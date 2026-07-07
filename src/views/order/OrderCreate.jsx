import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { Badge, Button, Card, Form, Modal, Stack, Table } from 'react-bootstrap';
import { getCookies } from '../../utils/cookies';
import DistributorServices from '../../services/DistributorServices';
import { useAlert } from '../../utils/alertContext';
import LoaderData from '../../components/LoaderData';
import Select from 'react-select';
import ProductServices from '../../services/ProductServices';
import WarehouseServices from '../../services/WarehouseServices';
import { useNavigate, useParams } from 'react-router-dom';
import EmployeeServices from '../../services/EmployeeServices';
import OrderServices from '../../services/OrderServices';
import PromoServices from '../../services/PromoServices';
import PriceServices from '../../services/PriceServices';
import LoaderFull from '../../components/LoaderFull';
import LoaderButton from '../../components/LoaderButton';
import { currency } from '../../utils/global';
import ConfirmDialog from '../../components/ConfirmDialog';
import CreatableSelect from 'react-select/creatable';

// #FBD43C -> soft yellow
// #DAA919 -> dark yellow
const maxDocumentUploadSizeBytes = 1024 * 1024;

export default function OrderPost() {
  const roleId = getCookies('role');
  const roleNumber = Number(roleId);
  const isCustomerRole = roleNumber === 1;
  const isAdminSalesRole = roleNumber === 2;
  const canSelectSales = roleNumber === 2 || roleNumber === 5;
  const shouldShowSeriesSalesOrder = !isCustomerRole;
  const navigate = useNavigate();
  const { id } = useParams();
  const isDetailMode = Boolean(id);
  const { showAlert } = useAlert();
  const distributorId = getCookies('distributorId');
  const [showDisc, setShowDisc] = useState(false);
  const [selectedRewardTarget, setSelectedRewardTarget] = useState(null);
  const [rewardDiscountPreview, setRewardDiscountPreview] = useState([]);
  const [rewardResultCount, setRewardResultCount] = useState(0);
  const [loadingReward, setLoadingReward] = useState(false);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(null);
  const [loadingMaxDiscount, setLoadingMaxDiscount] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loaderDisc, setLoaderDisc] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingItemPriceRows, setLoadingItemPriceRows] = useState([false]);
  const [listItem, setListItem] = useState([]);
  const [listOcr1, setListOcr1] = useState([]);
  const [listOcr2, setListOcr2] = useState([]);
  const [listOcr3, setListOcr3] = useState([]);
  const [listWarehouse, setListWarehouse] = useState([]);
  const [listEmployee, setListEmployee] = useState([]);
  const [discId, setDiscId] = useState('');
  const [listDiscType, setListDiscType] = useState([]);
  // VAT disabled: const [listVats, setListVats] = useState([]);
  const [listSeries, setListSeries] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [statusType, setStatusType] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [discountSnapshot, setDiscountSnapshot] = useState(null);

  const [listAddressB, setListAddressB] = useState([]);
  const [listAddressS, setListAddressS] = useState([]);

  const customStyles = {
    container: (provided) => ({
      ...provided,
      minWidth: '220px'
    }),
    control: (provided) => ({
      ...provided,
      minHeight: '31px'
    }),
    valueContainer: (provided) => ({
      ...provided,
      paddingTop: 0,
      paddingBottom: 0
    })
  };

  const RequiredLabel = ({ children }) => (
    <>
      {children}
      <span className="text-danger ms-1">*</span>
    </>
  );

  const getTodayDate = () => {
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000;

    return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
  };

  const addDaysToDate = (value, days) => {
    if (!value) return '';

    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + days);

    const timezoneOffset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  };

  const todayDate = getTodayDate();

  // VAT disabled
  // const getVatRate = (vatGroup) => {
  //   const rate = vatGroup?.rate ?? vatGroup?.Rate ?? vatGroup?.percentage ?? vatGroup?.percent ?? 0;
  //
  //   return Number(String(rate).replace('%', '')) || 0;
  // };

  const calculateLineTotals = (item = {}) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const subtotal = quantity * unitPrice;
    // VAT disabled
    // const vatRate = getVatRate(item.vatGroup);
    // const vatTotal = subtotal * (vatRate / 100);

    return {
      lineTotal: subtotal,
      vatTotal: 0
    };
  };

  const [itemArr, setItemArr] = useState([
    {
      itemCode: null,
      quantity: '',
      unitMsr: '',
      unitPrice: '',
      whs_code: null,
      lineTotal: '',
      vatTotal: '',
      freeText: '',
      ocrCode: null,
      ocrCode2: null,
      ocrCode3: null,
      vatGroup: null
    }
  ]);

  const [orderInput, setOrderInput] = useState({
    cardCode: '',
    poNumber: '',
    docDate: todayDate,
    docDueDate: todayDate,
    etaDate: addDaysToDate(todayDate, 7),
    series: '',
    seriesName: '',
    slpCode: '',
    cnctCode: '',
    address: '',
    address2: '',
    comments: '',
    idDiscount: ''
  });

  const [detailDisc, setDetailDisc] = useState([
    {
      name: '',
      value: '',
      remarks: ''
    }
  ]);

  useEffect(() => {
    // setItemArr([itemArr]);
    // fetchItem();
    if (!isDetailMode) {
      fetchDistributor();
    }
    fetchOcr1();
    fetchOcr2();
    fetchOcr3();
    fetchWarehouse();
    fetchDiscType();
    // VAT disabled: fetchVats();
    if (!isCustomerRole) {
      fetchListDistributor();
    }
  }, [isDetailMode]);

  useEffect(() => {
    if (id) {
      fetchOrderDetail(id);
    }
  }, [id]);

  useEffect(() => {
    if (!shouldShowSeriesSalesOrder || !orderInput.docDate) {
      setListSeries([]);
      return;
    }

    fetchSalesOrderSeries(orderInput.docDate);
  }, [orderInput.docDate, shouldShowSeriesSalesOrder]);

  const getValue = (data, keys, defaultValue = '') => {
    for (const key of keys) {
      const value = String(key)
        .split('.')
        .reduce((current, path) => current?.[path], data);

      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return defaultValue;
  };

  const getPrimitiveValue = (data, keys, defaultValue = '') => {
    const visited = new Set();

    const normalize = (value) => {
      if (value === undefined || value === null || value === '') return defaultValue;
      if (typeof value !== 'object') return value;
      if (visited.has(value)) return defaultValue;

      visited.add(value);

      for (const key of keys) {
        const nestedValue = String(key)
          .split('.')
          .reduce((current, path) => current?.[path], value);
        const normalizedValue = normalize(nestedValue);

        if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
          return normalizedValue;
        }
      }

      return defaultValue;
    };

    return normalize(data);
  };

  const ocrValueKeys = ['value', 'ocr_code', 'ocrCode', 'OcrCode', 'branch_code', 'branchCode', 'code'];
  const ocrNameKeys = ['label', 'ocr_name', 'ocrName', 'OcrName', 'branch_name', 'branchName', 'name'];
  const ocr2ValueKeys = [
    'value',
    'ocr_code2',
    'ocrCode2',
    'OcrCode2',
    'business_unit_code',
    'businessUnitCode',
    'ocr_code',
    'ocrCode',
    'code'
  ];
  const ocr2NameKeys = [
    'label',
    'ocr_name2',
    'ocrName2',
    'OcrName2',
    'business_unit_name',
    'businessUnitName',
    'ocr_name',
    'ocrName',
    'name'
  ];
  const ocr3ValueKeys = ['value', 'ocr_code3', 'ocrCode3', 'OcrCode3', 'department_code', 'departmentCode', 'ocr_code', 'ocrCode', 'code'];
  const ocr3NameKeys = ['label', 'ocr_name3', 'ocrName3', 'OcrName3', 'department_name', 'departmentName', 'ocr_name', 'ocrName', 'name'];

  const formatDateInput = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
  };

  const formatSeriesDate = (value) => formatDateInput(value).replace(/-/g, '');

  const seriesNameKeys = ['series_name', 'seriesName', 'SeriesName', 'name', 'description'];
  const orderSeriesNameKeys = ['series_label', 'seriesLabel', 'series_name', 'seriesName', 'SeriesName'];
  const seriesValueKeys = ['series', 'Series', 'series_code', 'seriesCode', 'value', 'code', 'id'];

  const mapSeriesOption = (item) => {
    const value = getValue(item, seriesValueKeys);
    const label = getValue(item, ['label', ...seriesNameKeys], value);

    return value
      ? {
          value,
          label: String(label || value),
          raw: item
        }
      : null;
  };

  const fetchSalesOrderSeries = async (date) => {
    const formattedDate = formatSeriesDate(date);
    if (!formattedDate) return;

    setLoadingSeries(true);
    try {
      const response = await OrderServices.getSalesOrderSeries(formattedDate);
      if (response?.data?.success) {
        const seriesData = response.data.data || response.data.series || [];
        const normalizedSeries = (Array.isArray(seriesData) ? seriesData : [seriesData]).map(mapSeriesOption).filter(Boolean);

        setListSeries(normalizedSeries);
        return;
      }

      setListSeries([]);
      showAlert(response?.data?.message || 'Failed to fetch series data', 'danger');
    } catch (error) {
      setListSeries([]);
      showAlert('An error occurred while fetching series data', 'danger');
    } finally {
      setLoadingSeries(false);
    }
  };

  const getSelectedSeriesOption = () => {
    const selectedOption = listSeries.find((item) => String(item.value) === String(orderInput.series));
    if (selectedOption) return selectedOption;
    if (!orderInput.series) return null;

    const fallbackLabel = getValue(
      orderDetail,
      [...orderSeriesNameKeys, 'series', 'Series', 'series_code', 'seriesCode'],
      orderInput.series
    );

    return {
      value: orderInput.series,
      label: String(fallbackLabel || orderInput.series)
    };
  };

  const getSapDiscountDetails = (order = {}) => {
    let sapDiscount = order.sap_discount;

    if (typeof sapDiscount === 'string') {
      try {
        sapDiscount = JSON.parse(sapDiscount);
      } catch {
        return [];
      }
    }

    const details = sapDiscount?.details;

    return Array.isArray(details) ? details : [details].filter(Boolean);
  };

  const mapDiscountDetail = (detail = {}) => {
    const type = getValue(detail, ['type_discount', 'discount_type', 'discountType', 'TypeDiscount', 'Type', 'type', 'name']);

    return {
      name: type ? { value: type, label: type } : '',
      value: getValue(detail, ['total_discount', 'totalDiscount', 'discount_amount', 'amount'], ''),
      remarks: getValue(detail, ['remarks', 'remark', 'description', 'keterangan'], '')
    };
  };

  const formatFileSize = (size = 0) => {
    if (!size) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);

    return `${(size / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const createOption = (value, label, extra = {}) => {
    if (!value && !label) return null;
    return {
      value: value || label,
      label: label || value,
      ...extra
    };
  };

  const normalizeList = (response) => {
    const data = response?.data?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.rows)) return data.rows;

    return [];
  };

  const getRewardAmount = (item = {}) => {
    const directTotal = Number(
      item.total_reward ||
        item.totalReward ||
        item.total_discount ||
        item.total_diskon ||
        item.totalDiskon ||
        item.reward_amount ||
        item.rewardAmount ||
        item.discount_amount ||
        0
    );
    const calculatedTotal = Number(item.diskon_per_kg || item.reward_per_kg || 0) * Number(item.qty_kg || item.qty || item.quantity || 0);

    return directTotal || calculatedTotal || 0;
  };

  const getRewardCustomerCode = (item = {}) =>
    String(item.customer_code || item.customerCode || item.code_customer || item.distributor_code || item.distributorCode || '');

  const cloneDiscountDetails = (details = []) =>
    details.map((item) => ({
      ...item,
      name: item.name && typeof item.name === 'object' ? { ...item.name } : item.name
    }));

  const findOption = (options, value, label, extra = {}) => {
    if (!value && !label) return null;
    const matchedOption = options.find((option) => String(option.value) === String(value));

    if (matchedOption) {
      return {
        ...matchedOption,
        ...extra,
        label: label || matchedOption.label
      };
    }

    return createOption(value, label, extra);
  };

  const mapOrderLine = (line) => {
    const itemCode = getValue(line, ['item_code', 'itemCode', 'ItemCode', 'item.item_code', 'item.code', 'code']);
    const itemName = getValue(
      line,
      ['item_name', 'itemName', 'ItemName', 'Dscription', 'description', 'item_description', 'item.item_name', 'item.name'],
      itemCode
    );
    const unitMsr = getValue(line, ['unit_msr', 'unitMsr', 'unit', 'UomCode', 'uom_code']);
    const whs_code = getValue(line, ['whs_code', 'whs_code', 'warehouse_code', 'whs_code']);
    const whsName = getValue(line, ['whs_name', 'whsName', 'warehouse_name', 'WhsName', 'warehouse.whs_name', 'warehouse.name'], whs_code);
    // VAT disabled
    // const vatGroup = getValue(line, ['vat_group', 'vatGroup', 'VatGroup', 'vat_code', 'vatCode']);
    // const vatName = getValue(line, ['vat_name', 'vatName', 'VatName', 'vat_group_name', 'vatGroupName', 'vat.name'], vatGroup);
    // const vatRate = getValue(line, ['vat_rate', 'vatRate', 'VatRate', 'rate', 'vat.rate'], '');
    const rawOcrCode = getValue(line, ['ocr', 'ocr_code', 'ocrCode', 'OcrCode', 'branch_code', 'branchCode']);
    const ocrCode = getPrimitiveValue(rawOcrCode, ocrValueKeys);
    const ocrName = getPrimitiveValue(
      getValue(line, ['ocr_name', 'ocrName', 'OcrName', 'branch_name', 'branchName', 'cabang', 'branch.name', 'ocr'], rawOcrCode),
      ocrNameKeys,
      ocrCode
    );
    const rawOcrCode2 = getValue(line, ['ocr2', 'ocr_code2', 'ocrCode2', 'OcrCode2', 'business_unit_code', 'businessUnitCode']);
    const ocrCode2 = getPrimitiveValue(rawOcrCode2, ocr2ValueKeys);
    const ocrName2 = getPrimitiveValue(
      getValue(
        line,
        ['ocr_name2', 'ocrName2', 'OcrName2', 'business_unit_name', 'businessUnitName', 'bisnis_unit', 'business_unit.name', 'ocr2'],
        rawOcrCode2
      ),
      ocr2NameKeys,
      ocrCode2
    );
    const rawOcrCode3 = getValue(line, ['ocr3', 'ocr_code3', 'ocrCode3', 'OcrCode3', 'department_code', 'departmentCode']);
    const ocrCode3 = getPrimitiveValue(rawOcrCode3, ocr3ValueKeys);
    const ocrName3 = getPrimitiveValue(
      getValue(line, ['ocr_name3', 'ocrName3', 'OcrName3', 'department_name', 'departmentName', 'ocr3'], rawOcrCode3),
      ocr3NameKeys,
      ocrCode3
    );

    return {
      itemCode: findOption(listItem, itemCode, itemName, {
        unitMsr,
        uomEntry: getValue(line, ['uom_entry', 'uomEntry', 'UomEntry'])
      }),
      quantity: getValue(line, ['quantity', 'qty', 'Quantity'], ''),
      unitMsr,
      unitPrice: getValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], ''),
      whs_code: findOption(listWarehouse, whs_code, whsName),
      lineTotal: getValue(line, ['line_total', 'lineTotal', 'LineTotal'], ''),
      // VAT disabled: vatTotal: getValue(line, ['vat_total', 'vatTotal', 'VatTotal', 'tax_total', 'taxTotal'], ''),
      vatTotal: 0,
      freeText: getValue(line, ['free_text', 'freeText', 'FreeTxt'], ''),
      ocrCode: findOption(listOcr1, ocrCode, ocrName),
      ocrCode2: findOption(listOcr2, ocrCode2, ocrName2),
      ocrCode3: findOption(listOcr3, ocrCode3, ocrName3),
      // VAT disabled: vatGroup: findOption(listVats, vatGroup, vatName, vatRate !== '' ? { rate: vatRate } : {})
      vatGroup: null
    };
  };

  const fillOrderForm = (order) => {
    const cardCode = getValue(order, ['card_code', 'cardCode', 'customer_code', 'CardCode']);
    const billToCode = getValue(order, ['pay_to_code', 'payToCode', 'address_code', 'PayToCode']);
    const billToAddress = getValue(order, ['address', 'bill_to_address', 'Address']);
    const shipToCode = getValue(order, ['ship_to_code', 'shipToCode', 'address2_code', 'ShipToCode']);
    const shipToAddress = getValue(order, ['address2', 'ship_to_address', 'Address2']);
    const details = getValue(order, ['details', 'lines', 'document_lines', 'DocumentLines'], []);
    const detailLines = Array.isArray(details) ? details : [];
    const orderDocuments = getValue(order, ['documents', 'attachments', 'files', 'order_documents'], []);
    const orderDiscountId = getValue(order, ['id_discount', 'idDiscount', 'sap_discount.id_discount', 'sap_discount.id'], '');
    const discountDetails = getSapDiscountDetails(order);

    setOrderDetail(order);
    setExistingDocuments(Array.isArray(orderDocuments) ? orderDocuments : []);
    setDocuments([]);
    setDiscId(orderDiscountId);
    setDetailDisc(
      discountDetails.length > 0
        ? discountDetails.map(mapDiscountDetail)
        : [
            {
              name: '',
              value: '',
              remarks: ''
            }
          ]
    );
    const docDate = formatDateInput(getValue(order, ['doc_date', 'docDate', 'DocDate']));
    const docDueDate = formatDateInput(getValue(order, ['doc_due_date', 'docDueDate', 'DocDueDate']));
    const minEtaDate = docDueDate || todayDate;
    const orderEtaDate = formatDateInput(getValue(order, ['eta_date', 'etaDate', 'ETA', 'u_eta', 'U_ETA'])) || addDaysToDate(minEtaDate, 7);
    const etaDate = orderEtaDate < minEtaDate ? minEtaDate : orderEtaDate;

    setOrderInput({
      cardCode,
      poNumber: getValue(order, ['po_number', 'num_at_card', 'numAtCard', 'NumAtCard']),
      docDate,
      docDueDate,
      etaDate,
      series: getValue(order, ['series', 'Series', 'series_code', 'seriesCode']),
      seriesName: getValue(order, orderSeriesNameKeys, ''),
      slpCode: getValue(order, ['slp_code', 'slpCode', 'SlpCode']),
      cnctCode: getValue(order, ['cntct', 'cnctCode', 'contact_name', 'customer_name', 'CardName']),
      address: findOption(listAddressB, billToCode, billToAddress),
      address2: findOption(listAddressS, shipToCode, shipToAddress),
      comments: getValue(order, ['comments', 'Comments']),
      idDiscount: orderDiscountId
    });

    if (cardCode) {
      fetchAddress(cardCode, false);
      fetchEmployee(cardCode, false);
    }

    setItemArr(detailLines.length > 0 ? detailLines.map(mapOrderLine) : itemArr);
  };

  const fetchOrderDetail = async (orderId) => {
    setIsLoading(true);
    try {
      const response = await OrderServices.getDetailOrder(orderId);

      if (response?.data?.success) {
        fillOrderForm(response.data.data);
        setIsLoading(false);
        return;
      }

      const listResponse = await OrderServices.getListOrder();
      const selectedOrder = listResponse?.data?.data?.find((order) => String(order.id) === String(orderId));

      if (selectedOrder) {
        fillOrderForm(selectedOrder);
      } else {
        showAlert('Order detail not found', 'danger');
      }
    } catch {
      showAlert('Failed to fetch order detail', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDistributor = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getDetailDistributor(distributorId);
    if (response.data.success) {
      setIsLoading(false);
      setOrderInput({
        ...orderInput,
        cardCode: response.data?.data.code_customer,
        cnctCode: response.data?.data.name
        // address: createOption(response.data?.data.address, response.data?.data.address),
        // address2: createOption(response.data?.data.mail_address, response.data?.data.mail_address)
      });
      fetchAddress(response.data?.data.code_customer);
      fetchItem(response.data?.data.code_customer);
      fetchEmployee(response.data?.data.code_customer);
    } else {
      setIsLoading(false);
      // showAlert('Failed to fetch data', 'danger');
    }
  };

  const fetchItem = async (code) => {
    setIsLoading(true);
    const response = await ProductServices.getProductCustomer(code);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.forEach((items) => {
        let arr = {
          value: items.item_code,
          label: items?.item_name,
          unitMsr: items?.sal_unit_msr,
          uomEntry: items?.suom_entry
        };
        dataArr.push(arr);
      });
      setListItem(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const fetchOcr1 = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getOcrByType(1);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.forEach((items) => {
        let arr = {
          value: items?.ocr_code,
          label: items?.ocr_name
        };
        dataArr.push(arr);
      });
      setListOcr1(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const fetchOcr2 = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getOcrByType(2);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.forEach((items) => {
        let arr = {
          value: items?.ocr_code,
          label: items?.ocr_name
        };
        dataArr.push(arr);
      });
      setListOcr2(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const fetchOcr3 = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getOcrByType(3);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.forEach((items) => {
        let arr = {
          value: items?.ocr_code,
          label: items?.ocr_name
        };
        dataArr.push(arr);
      });
      setListOcr3(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const fetchWarehouse = async () => {
    setIsLoading(true);
    const response = await WarehouseServices.getAllWarehouse('');
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.forEach((items) => {
        let arr = {
          value: items.whs_code,
          label: items?.whs_code + ' - ' + items?.whs_name
        };
        dataArr.push(arr);
      });
      setListWarehouse(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const fetchEmployee = async (codeCustomer, shouldSetDefault = true) => {
    if (!codeCustomer) {
      setListEmployee([]);
      if (shouldSetDefault) {
        setOrderInput((prevState) => ({
          ...prevState,
          slpCode: ''
        }));
      }
      return;
    }

    setIsLoading(true);
    const response = await EmployeeServices.getSalesDistributor({
      keywords: '',
      codeCustomer
    });
    if (response.data.success) {
      const data = normalizeList(response);
      const dataArr = data
        .map((item) => ({
          value: item?.slp_code,
          label: `${item?.sales_employee?.slp_name || ''}`,
          name: item?.slp_name
        }))
        .filter((item) => item.value);

      setListEmployee(dataArr);
      if (shouldSetDefault) {
        setOrderInput((prevState) => ({
          ...prevState,
          slpCode: dataArr[0]?.value || ''
        }));
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch sales data', 'danger');
    }
  };

  const fetchListDistributor = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getAllDistributor();
    if (response.data.success) {
      const data = response.data.data;
      const dataArr = data.map((item) => ({
        value: item?.code_customer,
        label: `${item?.code_customer || ''} - ${item?.name || ''} - ${item?.depo || ''}`,
        name: item?.name,
        depo: item?.depo
      }));

      setListDistributor(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch sales data', 'danger');
    }
  };

  const fetchDiscType = async () => {
    setIsLoading(true);
    const response = await OrderServices.getDiscType();
    if (response.data.success) {
      const data = response.data.data;
      const dataArr = data.map((item) => ({
        value: item?.fld_value,
        label: item?.fld_value
      }));

      setListDiscType(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch sales data', 'danger');
    }
  };

  // VAT disabled
  // const fetchVats = async () => {
  //   setIsLoading(true);
  //   const response = await OrderServices.getVats();
  //   if (response.data.success) {
  //     const data = response.data.data;
  //     const dataArr = data.map((item) => ({
  //       value: item?.code,
  //       label: item?.name,
  //       rate: item?.rate ?? item?.Rate ?? item?.percentage ?? item?.percent ?? 0,
  //       raw: item
  //     }));
  //
  //     setListVats(dataArr);
  //     setIsLoading(false);
  //   } else {
  //     setIsLoading(false);
  //     showAlert('Failed to fetch sales data', 'danger');
  //   }
  // };

  const fetchAddress = async (code, shouldSetDefault = true) => {
    setIsLoading(true);
    const response = await DistributorServices.getAddress(code);
    if (response.data.success) {
      const data = response.data.data;
      let dataB = [];
      let dataS = [];
      data.forEach((item) => {
        if (item?.AdresType === 'B') {
          let arr = {
            value: item?.Address,
            label: item?.Street
          };
          dataB.push(arr);
        } else {
          let arr = {
            value: item?.Address,
            label: item?.Street
          };
          dataS.push(arr);
        }
      });
      setListAddressB(dataB);
      setListAddressS(dataS);
      if (shouldSetDefault) {
        setOrderInput((prevState) => ({
          ...prevState,
          address: dataB[0] || '',
          address2: dataS[0] || ''
        }));
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const handleSetInput = (e, key) => {
    setOrderInput({
      ...orderInput,
      [key]: e.target.value
    });
  };

  const handleSetDocDate = (e) => {
    setOrderInput({
      ...orderInput,
      docDate: e.target.value,
      series: '',
      seriesName: ''
    });
  };

  const handleSetDocDueDate = (e) => {
    const docDueDate = e.target.value;

    setOrderInput({
      ...orderInput,
      docDueDate,
      etaDate: addDaysToDate(docDueDate, 7)
    });
  };

  const handleSetEtaDate = (e) => {
    const minEtaDate = orderInput.etaDate || orderInput.docDueDate || todayDate;
    const etaDate = e.target.value;

    setOrderInput({
      ...orderInput,
      etaDate: etaDate && etaDate < minEtaDate ? minEtaDate : etaDate
    });
  };

  const handleSelectSeries = (e) => {
    setOrderInput({
      ...orderInput,
      series: e?.value || '',
      seriesName: e?.label || ''
    });
  };

  const setItemPriceRowLoading = (index, isLoadingRow) => {
    setLoadingItemPriceRows((prevState) => {
      const nextState = [...prevState];
      nextState[index] = isLoadingRow;

      return nextState;
    });
  };

  const handleSelectItem = async (e, index) => {
    if (!e) {
      itemArr[index].itemCode = null;
      itemArr[index].unitMsr = '';
      itemArr[index].unitPrice = '';
      itemArr[index].lineTotal = '';
      itemArr[index].vatTotal = '';
      setItemArr([...itemArr]);
      return;
    }

    itemArr[index].itemCode = e;
    itemArr[index].unitMsr = e.unitMsr;
    itemArr[index].unitPrice = '';
    itemArr[index].lineTotal = '';
    itemArr[index].vatTotal = '';
    setItemArr([...itemArr]);
    setItemPriceRowLoading(index, true);

    try {
      const resp = await PriceServices.getPriceByItem(e.value);

      if (resp.data.success) {
        const selectedPrice = resp.data.data?.[0]?.price || 0;

        itemArr[index].unitPrice = selectedPrice;
        const calculatedTotals = calculateLineTotals(itemArr[index]);
        itemArr[index].lineTotal = calculatedTotals.lineTotal;
        itemArr[index].vatTotal = calculatedTotals.vatTotal;
        setItemArr([...itemArr]);
      } else {
        showAlert(resp.data.message || 'Failed to fetch item price', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch item price', 'danger');
    } finally {
      setItemPriceRowLoading(index, false);
    }
  };

  const handleSelectWarehouse = async (e, index) => {
    itemArr[index].whs_code = e;
    setItemArr([...itemArr]);
  };

  const handleSelectOcr1 = (e, index) => {
    itemArr[index].ocrCode = e;
    setItemArr([...itemArr]);
  };

  const handleSelectOcr2 = (e, index) => {
    itemArr[index].ocrCode2 = e;
    setItemArr([...itemArr]);
  };

  const handleSelectOcr3 = (e, index) => {
    itemArr[index].ocrCode3 = e;
    setItemArr([...itemArr]);
  };

  // VAT disabled
  // const handleSelectVat = (e, index) => {
  //   itemArr[index].vatGroup = e;
  //   const calculatedTotals = calculateLineTotals(itemArr[index]);
  //   itemArr[index].lineTotal = calculatedTotals.lineTotal;
  //   itemArr[index].vatTotal = calculatedTotals.vatTotal;
  //   setItemArr([...itemArr]);
  // };

  const handleSelectAddress = (e, key) => {
    setOrderInput({
      ...orderInput,
      [key]: e
    });
  };

  const handleSelectSales = (e) => {
    setOrderInput({
      ...orderInput,
      slpCode: e?.value || ''
    });
  };

  const handleSelectDistributor = (e) => {
    setListAddressB([]);
    setListAddressS([]);
    setListEmployee([]);
    setListItem([]);
    setRewardDiscountPreview([]);
    setRewardResultCount(0);
    setOrderInput({
      ...orderInput,
      cardCode: e?.value || '',
      cnctCode: e?.name || '',
      slpCode: '',
      address: '',
      address2: ''
    });

    if (e?.value) {
      fetchAddress(e.value);
      fetchItem(e.value);
      fetchEmployee(e.value);
    }
  };

  const handleSelectDocuments = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const oversizedFiles = files.filter((file) => file.size > maxDocumentUploadSizeBytes);
    const validFiles = files.filter((file) => file.size <= maxDocumentUploadSizeBytes);

    if (oversizedFiles.length) {
      showAlert('Ukuran file maksimal 1MB per file', 'danger');
    }

    if (!validFiles.length) {
      event.target.value = '';
      return;
    }

    setDocuments((prevDocuments) => {
      if (isDetailMode && existingDocuments.length) {
        return validFiles;
      }

      const existingKeys = new Set(prevDocuments.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const nextFiles = validFiles.filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`));

      return [...prevDocuments, ...nextFiles];
    });
    event.target.value = '';
  };

  const removeDocument = (index) => {
    setDocuments((prevDocuments) => prevDocuments.filter((_, documentIndex) => documentIndex !== index));
  };

  const handleSelectDiscType = (e, index) => {
    detailDisc[index].name = e;
    setDetailDisc([...detailDisc]);
  };

  const fetchCustomerRewardDiscount = async () => {
    setRewardDiscountPreview([]);
    setRewardResultCount(0);

    if (!orderInput.cardCode) {
      showAlert('Select customer terlebih dahulu untuk mengambil total Reward', 'danger');
      return;
    }

    setLoadingReward(true);
    try {
      const response = await PromoServices.getClaimBatches();
      const payload = response?.data?.data;
      const normalizedBatches = normalizeList(response);
      const batches = normalizedBatches.length
        ? normalizedBatches
        : Array.isArray(payload)
          ? payload
          : payload?.batches || payload?.items || payload?.rows || payload?.data || [];

      if (!batches.length) {
        showAlert('Data Reward tidak tersedia', 'danger');
        return;
      }

      const resultResponses = await Promise.all(
        batches.map((batch, index) => {
          const id = batch.id || batch.batch_id || batch.claim_batch_id || batch.upload_batch_id || batch.upload_id || index;
          return PromoServices.getUploadResult(id).then((resultResponse) => ({ batch, index, resultResponse }));
        })
      );

      const customerResults = resultResponses.flatMap(({ batch, index, resultResponse }) => {
        const resultPayload = resultResponse?.data?.data;
        const results = Array.isArray(resultPayload)
          ? resultPayload
          : resultPayload?.results ||
            resultPayload?.claims ||
            resultPayload?.transactions ||
            resultPayload?.details ||
            resultPayload?.data ||
            [];
        const batchNo = batch.batch_no || batch.batch_code || batch.claim_no || batch.reference_no || `BATCH-${batch.id || index + 1}`;
        const fileName = batch.file_name || batch.original_file_name || batch.original_filename || batch.filename || '-';

        return results
          .filter((item) => getRewardCustomerCode(item) === String(orderInput.cardCode))
          .map((item) => ({ ...item, batchNo, fileName }));
      });

      if (!customerResults.length) {
        showAlert(`No Reward data for customer ${orderInput.cardCode}`, 'danger');
        return;
      }

      const totalReward = customerResults.reduce((total, item) => total + getRewardAmount(item), 0);
      const rewardReferences = Array.from(new Set(customerResults.map((item) => `${item.batchNo} · ${item.fileName}`))).filter(Boolean);

      setRewardResultCount(customerResults.length);
      setRewardDiscountPreview(
        totalReward > 0
          ? [
              {
                name: { value: 'REWARD', label: 'REWARD' },
                value: totalReward,
                remarks: rewardReferences.slice(0, 3).join(' | ')
              }
            ]
          : []
      );

      if (totalReward <= 0) {
        showAlert(`Total Reward untuk customer ${orderInput.cardCode} masih 0`, 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch Reward data', 'danger');
    } finally {
      setLoadingReward(false);
    }
  };

  const fetchMaxDiscount = async () => {
    if (maxDiscountPercentage !== null || loadingMaxDiscount) return;

    setLoadingMaxDiscount(true);
    try {
      const response = await OrderServices.getMaxDiscount();

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch maximum discount');
      }

      const payload = response?.data?.data ?? response?.data;
      const discountConfig = Array.isArray(payload) ? payload[0] : payload;
      const rawPercentage =
        typeof discountConfig === 'object'
          ? (discountConfig.max_discount ??
            discountConfig.maxDiscount ??
            discountConfig.maximum_discount ??
            discountConfig.max_discount_percentage ??
            discountConfig.percentage ??
            discountConfig.discount_percentage ??
            discountConfig.value)
          : discountConfig;
      const parsedPercentage = Number.parseFloat(String(rawPercentage).replace('%', ''));

      if (!Number.isFinite(parsedPercentage)) {
        throw new Error('Maximum discount value is invalid');
      }

      setMaxDiscountPercentage(parsedPercentage <= 1 ? parsedPercentage * 100 : parsedPercentage);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch maximum discount', 'danger');
    } finally {
      setLoadingMaxDiscount(false);
    }
  };

  const handleOpenDiscount = () => {
    setDiscountSnapshot(cloneDiscountDetails(detailDisc));
    setShowDisc(true);
    fetchCustomerRewardDiscount();
    fetchMaxDiscount();
  };

  const handleCancelDiscount = () => {
    if (discountSnapshot) {
      setDetailDisc(cloneDiscountDetails(discountSnapshot));
    }

    setSelectedRewardTarget(null);
    setRewardDiscountPreview([]);
    setRewardResultCount(0);
    setShowDisc(false);
    setDiscountSnapshot(null);
  };

  const addRewardDiscount = () => {
    if (!rewardDiscountPreview.length || selectedRewardTarget === null || !applicableRewardDiscount) return;

    setDetailDisc((currentDetails) => {
      const rewardReference = rewardDiscountPreview[0]?.remarks || `${rewardResultCount} data reward`;

      return currentDetails.map((item, index) => {
        if (index !== selectedRewardTarget) return item;

        return {
          ...item,
          value: Number(item.value || 0) + applicableRewardDiscount,
          remarks: [item.remarks, `Reward: ${rewardReference}`].filter(Boolean).join(' | ')
        };
      });
    });
    setSelectedRewardTarget(null);
    setRewardDiscountPreview([]);
    setRewardResultCount(0);
    showAlert(`Reward ${formatCurrency(applicableRewardDiscount)} applied successfully`, 'success');
  };

  const addItem = () => {
    const item = {
      itemCode: null,
      quantity: '',
      unitMsr: '',
      uomEntry: '',
      whs_code: null,
      lineTotal: '',
      vatTotal: '',
      freeText: '',
      ocrCode: null,
      ocrCode2: null,
      ocrCode3: null,
      vatGroup: null
    };

    let store = [...itemArr, item];
    setItemArr(store);
    setLoadingItemPriceRows((prevState) => [...prevState, false]);
  };

  const removeItem = (i) => {
    setItemArr((prevArray) => prevArray.filter((_, index) => index !== i));
    setLoadingItemPriceRows((prevArray) => prevArray.filter((_, index) => index !== i));
    // const itm = item.filter((item, index) => index != i);
    // setItemArr(itm)
  };

  const addItemDisc = () => {
    const item = {
      name: '',
      value: '',
      remarks: ''
    };

    let store = [...detailDisc, item];
    setDetailDisc(store);
  };

  const removeItemDisc = (i) => {
    setSelectedRewardTarget(null);
    setDetailDisc((prevArray) => prevArray.filter((_, index) => index !== i));
  };

  const handleChangeInputLine = (index, key, e) => {
    itemArr[index][key] = e.target.value;
    if (key === 'quantity' || key === 'unitPrice') {
      const calculatedTotals = calculateLineTotals(itemArr[index]);
      itemArr[index].lineTotal = calculatedTotals.lineTotal;
      itemArr[index].vatTotal = calculatedTotals.vatTotal;
    }
    setItemArr([...itemArr]);
  };

  const handleInputDiscName = (index, e) => {
    detailDisc[index].name = e.target.value;
    setDetailDisc([...detailDisc]);
  };

  const handleInputRemarks = (index, e) => {
    detailDisc[index].remarks = e.target.value;
    setDetailDisc([...detailDisc]);
  };

  const parseNumberInput = (value) => String(value || '').replace(/\D/g, '');

  const formatNumberInput = (value) => {
    const numberValue = parseNumberInput(value);

    if (!numberValue) return '';

    return new Intl.NumberFormat('id-ID').format(Number(numberValue));
  };

  const handleInputDiscValue = (index, e) => {
    detailDisc[index].value = parseNumberInput(e.target.value);
    setDetailDisc([...detailDisc]);
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const orderSubtotal = itemArr.reduce((total, item) => {
    return total + Number(item.quantity || 0) * Number(item.unitPrice || 0);
  }, 0);
  // VAT disabled
  // const orderVatTotal = itemArr.reduce((total, item) => total + Number(item.vatTotal || calculateLineTotals(item).vatTotal || 0), 0);
  // const orderTotalAfterVat = orderSubtotal + orderVatTotal;

  const discountTotal = detailDisc.reduce((total, item) => total + (Number(item.value) || 0), 0);
  const rewardTotal = rewardDiscountPreview.reduce((total, item) => total + (Number(item.value) || 0), 0);
  const maximumDiscount = orderSubtotal * ((maxDiscountPercentage || 0) / 100);
  const remainingDiscountLimit = Math.max(maximumDiscount - discountTotal, 0);
  const applicableRewardDiscount = Math.min(rewardTotal, remainingDiscountLimit);
  const rewardTargetOptions = detailDisc
    .map((item, index) => ({
      value: index,
      label: item.name?.label || item.name?.value || '',
      amount: Number(item.value || 0)
    }))
    .filter((item) => item.label);
  const grandTotal = Math.max(orderSubtotal - discountTotal, 0);

  const createOrderPayload = (type) => {
    const arrItem = itemArr.map((item) => ({
      item_code: item?.itemCode?.value,
      quantity: item?.quantity,
      unit_msr: item?.unitMsr,
      uom_entry: item?.itemCode?.uomEntry,
      whs_code: item?.whs_code?.value,
      unit_price: item?.unitPrice,
      // VAT disabled
      // vat_group: item?.vatGroup?.value,
      // vat_rate: getVatRate(item?.vatGroup),
      // vat_total: item?.vatTotal,
      line_total: item?.lineTotal,
      free_text: item?.freeText,
      ocr_code: getPrimitiveValue(item?.ocrCode, ocrValueKeys),
      ocr_code2: getPrimitiveValue(item?.ocrCode2, ocr2ValueKeys),
      ocr_code3: getPrimitiveValue(item?.ocrCode3, ocr3ValueKeys)
    }));

    const shouldPostSalesCode = isDetailMode && isAdminSalesRole;

    return {
      card_code: orderInput.cardCode,
      po_number: orderInput.poNumber,
      doc_date: orderInput.docDate,
      doc_due_date: orderInput.docDueDate,
      eta_date: orderInput.etaDate,
      Series: orderInput.series,
      series_name: orderInput.seriesName || getSelectedSeriesOption()?.label || '',
      ...(shouldPostSalesCode ? { slp_code: orderInput.slpCode } : {}),
      cntct: orderInput.cnctCode,
      pay_to_code: orderInput.address?.value,
      address: orderInput.address?.label,
      ship_to_code: orderInput.address2?.value,
      address2: orderInput.address2?.label,
      comments: orderInput.comments,
      status: type,
      doc_total: grandTotal,
      DocTotal: grandTotal,
      id_discount: discId,
      action: type === 'WAITING_OM' ? 'submit' : type === 'WAITING_FINANCE' ? 'approve' : '',
      lines: arrItem
    };
  };

  const buildOrderRequestPayload = (payload) => {
    if (!documents.length) return payload;

    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'lines') {
        formData.append(key, JSON.stringify(value));
        return;
      }

      formData.append(key, value ?? '');
    });

    documents.forEach((file) => {
      formData.append('attachment', file);
    });

    return formData;
  };

  const handleOrderResponse = (resp) => {
    if (resp.data.success) {
      showAlert(resp.data.message, 'success');
      setLoadingSubmit(false);
      navigate(-1);
    } else {
      showAlert(resp.data.message, 'danger');
      setLoadingSubmit(false);
    }
  };

  const handleSubmitOrder = async () => {
    const payload = buildOrderRequestPayload(createOrderPayload(statusType));

    if (id) {
      const resp = await OrderServices.putOrder(id, payload);
      handleOrderResponse(resp);
    } else {
      const resp = await OrderServices.postOrder(payload);
      handleOrderResponse(resp);
    }
  };

  const handlePostingData = async (type) => {
    setLoadingSubmit(true);
    const payload = buildOrderRequestPayload(createOrderPayload(type));

    if (id) {
      const resp = await OrderServices.postOrderPosting(id, payload);
      try {
        if (resp.data.success) {
          showAlert(resp.data.message, 'success');
          setLoadingSubmit(false);
          navigate(-1);
        } else {
          showAlert(resp.data.message, 'danger');
          setLoadingSubmit(false);
        }
      } catch (error) {
        console.log('err =>', error);
      }
    } else {
      const resp = await OrderServices.postOrderPosting('', payload);
      try {
        if (resp.data.success) {
          showAlert(resp.data.message, 'success');
          setLoadingSubmit(false);
          navigate(-1);
        } else {
          showAlert(resp.data.message, 'danger');
          setLoadingSubmit(false);
        }
      } catch (error) {
        console.log('err =>', error);
      }
    }
  };

  const handleSubmitDisc = async () => {
    const activeDiscounts = detailDisc.filter((item) => Number(item.value) > 0);

    if (activeDiscounts.some((item) => !item.name?.value)) {
      showAlert('Category is required for each discount component', 'danger');
      return;
    }

    setLoaderDisc(true);
    const dataDisc = activeDiscounts.map((item) => ({
      TypeDiscount: item?.name?.value,
      Persentase: 0,
      TotalDiskon: item?.value,
      Remarks: item?.remarks
    }));
    const payload = {
      CardCode: orderInput.cardCode,
      CardName: orderInput.cnctCode,
      OldIdDiscount: discId,
      Lines: dataDisc
    };

    const response = await OrderServices.postDiscount(payload);
    if (response.data.success) {
      setLoaderDisc(false);
      setDiscId(response.data.data.code);
      showAlert(response.data.message, 'success');
      setDiscountSnapshot(null);
      setSelectedRewardTarget(null);
      setRewardDiscountPreview([]);
      setRewardResultCount(0);
      setShowDisc(false);
    } else {
      setLoaderDisc(false);
      showAlert(response.data.message, 'danger');
    }
    // setShowDisc(false);
  };

  const validateForm = () => {
    if (!orderInput.cardCode) {
      return 'Customer Code is required.';
    }
    if (!orderInput.poNumber) {
      return 'PO Number is required.';
    }
    if (canSelectSales && !orderInput.slpCode) {
      return 'Sales Code is required.';
    }
    if (!orderInput.cnctCode) {
      return 'Customer Contact is required.';
    }
    if (!orderInput.docDate) {
      return 'Document Date is required.';
    }
    if (!orderInput.docDueDate) {
      return 'Requested Delivery Date is required.';
    }
    if (!orderInput.etaDate) {
      return 'ETA is required.';
    }
    if (orderInput.etaDate < orderInput.docDueDate) {
      return 'ETA cannot be before Requested Delivery Date.';
    }
    if (!orderInput.address) {
      return 'Billing Address is required.';
    }
    if (!orderInput.address2) {
      return 'Shipping Address is required.';
    }

    // Check order documents
    const totalDocsCount = (documents?.length || 0) + (existingDocuments?.length || 0);
    if (totalDocsCount === 0) {
      return 'Order Document is required.';
    }

    // Check Products
    if (!itemArr || itemArr.length === 0) {
      return 'Minimal harus add 1 item produk.';
    }

    for (let i = 0; i < itemArr.length; i++) {
      const item = itemArr[i];
      const rowNum = i + 1;
      if (!item.itemCode) {
        return `Item in row ${rowNum} is required.`;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        return `Qty in row ${rowNum} must be greater than 0.`;
      }
      if (!isCustomerRole) {
        if (!item.whs_code) {
          return `Warehouse in row ${rowNum} is required.`;
        }
        // VAT disabled
        // if (!item.vatGroup) {
        //   return `VAT in row ${rowNum} is required.`;
        // }
      }
    }

    return null; // No errors
  };

  const handleShowConfirm = (type) => {
    const errorMsg = validateForm();
    if (errorMsg) {
      showAlert(errorMsg, 'danger');
      return;
    }
    setStatusType(type);
    setConfirmSubmit(true);
  };

  return (
    <>
      <Stack gap={3}>
        <>
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">{isDetailMode ? 'Detail Order' : 'Create Order'}</h5>
                <span className="text-muted f-12">
                  {isDetailMode
                    ? `Showing detail ${orderDetail?.order_no || orderDetail?.doc_num || 'order'} yang dipilih.`
                    : 'Complete customer information, addresses, and product details before saving the order.'}
                </span>
                {shouldShowSeriesSalesOrder && isDetailMode && orderInput.series ? (
                  <span className="text-muted f-12">Series: {getSelectedSeriesOption()?.label || orderInput.series}</span>
                ) : null}
              </Stack>
            }
            secondary={
              <Stack direction="horizontal" gap={2} className="flex-wrap">
                <Button variant="light-secondary" onClick={() => navigate(-1)}>
                  <i className="ti ti-arrow-left me-1" />
                  Cancel
                </Button>

                {roleId === 1 || roleId === 5 ? (
                  <>
                    <Button onClick={() => handleShowConfirm('DRAFT')} variant="warning">
                      <i className="ti ti-device-floppy me-1" />
                      Save Draft
                    </Button>
                    <Button onClick={() => handleShowConfirm('WAITING_OM')} variant="primary">
                      <i className="ti ti-send" />
                      Kirim
                    </Button>
                  </>
                ) : null}
                {roleId === 2 && (
                  <Button onClick={() => handleShowConfirm('WAITING_FINANCE')} variant="primary">
                    <i className="ti ti-send" />
                    Submit
                  </Button>
                )}
                {/* {canSelectSales ? (
                  <Button onClick={() => handlePostingData('APPROVED')} variant="success">
                    <i className="ti ti-checks" />
                    Approve
                  </Button>
                ) : null} */}
              </Stack>
            }
          >
            {isLoading ? (
              <LoaderData />
            ) : (
              <Row className="g-3">
                <Col lg={isCustomerRole ? 12 : 9}>
                  <Card className="border mb-0 h-100 claim-transaction-card">
                    <Card.Header className="py-3">
                      <Stack direction="horizontal" gap={2} className="justify-content-between">
                        <div>
                          <h5 className="mb-0">Information Order</h5>
                          <small className="text-muted">Main transaction and customer data</small>
                        </div>
                        <Badge bg="light" text="dark">
                          Draft
                        </Badge>
                      </Stack>
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-4">
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>Customer Code</RequiredLabel>
                            </Form.Label>
                            {isCustomerRole ? (
                              <Form.Control
                                readOnly
                                onChange={(e) => handleSetInput(e, 'cardCode')}
                                value={orderInput.cardCode}
                                type="text"
                                placeholder="Customer Code"
                                size="sm"
                              />
                            ) : (
                              <Select
                                styles={customStyles}
                                value={listDistributor.find((item) => item.value === orderInput.cardCode) || null}
                                options={listDistributor}
                                menuPosition="fixed"
                                onChange={handleSelectDistributor}
                                placeholder="Select Customer"
                                isClearable
                              />
                            )}
                          </Form.Group>
                        </Col>
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>No. PO</RequiredLabel>
                            </Form.Label>
                            <Form.Control
                              onChange={(e) => handleSetInput(e, 'poNumber')}
                              value={orderInput.poNumber}
                              type="text"
                              placeholder="Enter PO number"
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        {canSelectSales ? (
                          <Col md={6} xl={4}>
                            <Form.Group>
                              <Form.Label className="small text-muted">
                                <RequiredLabel>Code Sales</RequiredLabel>
                              </Form.Label>
                              <Select
                                styles={customStyles}
                                value={listEmployee.find((item) => item.value === orderInput.slpCode) || null}
                                options={listEmployee}
                                menuPosition="fixed"
                                onChange={handleSelectSales}
                                placeholder="Select sales"
                                isClearable
                              />
                            </Form.Group>
                          </Col>
                        ) : null}
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>Kontak Pelanggan</RequiredLabel>
                            </Form.Label>
                            <Form.Control
                              onChange={(e) => handleSetInput(e, 'cnctCode')}
                              value={orderInput.cnctCode}
                              type="text"
                              placeholder="Kontak Pelanggan"
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>Document Date</RequiredLabel>
                            </Form.Label>
                            <Form.Control onChange={handleSetDocDate} value={orderInput.docDate} type="date" min={todayDate} size="sm" />
                          </Form.Group>
                        </Col>
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>Requested Delivery Date</RequiredLabel>
                            </Form.Label>
                            <Form.Control
                              onChange={handleSetDocDueDate}
                              value={orderInput.docDueDate}
                              type="date"
                              min={todayDate}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">ETA</Form.Label>
                            <Form.Control
                              onChange={handleSetEtaDate}
                              value={orderInput.etaDate}
                              type="date"
                              min={orderInput.etaDate || orderInput.docDueDate || todayDate}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        {shouldShowSeriesSalesOrder ? (
                          <Col md={6} xl={4}>
                            <Form.Group>
                              <Form.Label className="small text-muted">Series Sales Order</Form.Label>
                              <Select
                                value={getSelectedSeriesOption()}
                                options={listSeries}
                                isLoading={loadingSeries}
                                isDisabled={!orderInput.docDate || loadingSeries}
                                menuPosition="fixed"
                                onChange={handleSelectSeries}
                                placeholder={orderInput.docDate ? 'Select series' : 'Select document date first'}
                                isClearable
                              />
                            </Form.Group>
                          </Col>
                        ) : null}
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>Alamat Tagih</RequiredLabel>
                            </Form.Label>
                            <Select
                              value={orderInput.address || null}
                              options={listAddressB}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectAddress(e, 'address')}
                              placeholder="Select billing address"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small text-muted">
                              <RequiredLabel>Alamat Kirim</RequiredLabel>
                            </Form.Label>
                            <Select
                              value={orderInput.address2 || null}
                              options={listAddressS}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectAddress(e, 'address2')}
                              placeholder="Select shipping address"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="small text-muted">Notes</Form.Label>
                            <Form.Control
                              onChange={(e) => handleSetInput(e, 'comments')}
                              value={orderInput.comments}
                              as="textarea"
                              rows={3}
                              placeholder="Add order notes if needed"
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                {canSelectSales ? (
                  <Col lg={3}>
                    <Card className="border mb-0 h-100 claim-transaction-card">
                      <Card.Header className="py-3">
                        <h5 className="mb-0">Ringkasan Order</h5>
                        <small className="text-muted">Estimasi berdasarkan detail produk</small>
                      </Card.Header>
                      <Card.Body>
                        <Stack gap={3}>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Item Count</span>
                            <strong>{itemArr.length}</strong>
                          </Stack>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Subtotal</span>
                            <strong>{formatCurrency(orderSubtotal)}</strong>
                          </Stack>
                          {/* <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Total VAT</span>
                            <strong>{formatCurrency(orderVatTotal)}</strong>
                          </Stack> */}
                          {/* <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Total Setelah VAT</span>
                            <strong>{formatCurrency(orderTotalAfterVat)}</strong>
                          </Stack> */}
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Diskon {discId ? `- ${discId}` : ''}</span>
                            <Button variant="link" className="p-0 text-decoration-none" onClick={handleOpenDiscount}>
                              {formatCurrency(discountTotal)}
                            </Button>
                          </Stack>
                          <div className="border-top pt-3">
                            <Stack direction="horizontal" className="justify-content-between">
                              <span className="fw-semibold">Grand Total</span>
                              <h5 className="mb-0 text-primary">{formatCurrency(grandTotal)}</h5>
                            </Stack>
                          </div>
                          <Button variant="light-primary" onClick={handleOpenDiscount}>
                            <i className="ti ti-discount-2 me-1" />
                            Set Discount
                          </Button>
                        </Stack>
                      </Card.Body>
                    </Card>
                  </Col>
                ) : null}
              </Row>
            )}
          </MainCard>

          <MainCard
            className="claim-transaction-card"
            title={
              <Stack gap={1}>
                <h5 className="mb-0">
                  <RequiredLabel>Order Document</RequiredLabel>
                </h5>
                <span className="text-muted f-12">
                  Upload supporting documents such as PO, delivery notes, or approval attachments. Maximum 1MB per file.
                </span>
              </Stack>
            }
          >
            <Row className="g-3">
              <Col lg={5}>
                <Card className="border mb-0 h-100">
                  <Card.Body>
                    <Stack gap={3}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded bg-light-primary text-primary d-flex align-items-center justify-content-center p-3">
                          <i className="ti ti-file-upload f-24" />
                        </div>
                        <div>
                          <h6 className="mb-1">{isDetailMode && existingDocuments.length ? 'Upload Replacement Document' : 'Upload Document'}</h6>
                          <small className="text-muted">
                            {isDetailMode && existingDocuments.length
                              ? 'Select a new file only when you want to replace the saved document.'
                              : 'Select one or more supporting documents.'}
                          </small>
                        </div>
                      </div>
                      <Form.Group>
                        <Form.Label className="small text-muted">Select File</Form.Label>
                        <Form.Control
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          onChange={handleSelectDocuments}
                        />
                        <Form.Text className="text-muted">Format: PDF, Word, Excel, PNG, JPG, JPEG. Maximum 1MB per file.</Form.Text>
                      </Form.Group>
                    </Stack>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={7}>
                <Card className="border mb-0 h-100 claim-transaction-card">
                  <Card.Header className="py-3">
                    <Stack direction="horizontal" className="justify-content-between">
                      <div>
                        <h5 className="mb-0">Document List</h5>
                        <small className="text-muted">
                          {isDetailMode && existingDocuments.length
                            ? 'Saved documents stay unchanged unless a new file is selected.'
                            : 'Files will be sent when the order is saved.'}
                        </small>
                      </div>
                      <Badge bg={documents.length ? 'primary' : 'secondary'}>
                        {documents.length} new {documents.length === 1 ? 'file' : 'files'}
                      </Badge>
                    </Stack>
                  </Card.Header>
                  <Card.Body>
                    <Stack gap={2}>
                      {isDetailMode && existingDocuments.length && documents.length ? (
                        <div className="alert alert-warning py-2 mb-1">
                          New uploaded files will replace the saved documents when this order is saved.
                        </div>
                      ) : null}

                      {existingDocuments.length ? (
                        <>
                          <small className="text-muted fw-semibold">
                            {documents.length && isDetailMode ? 'Saved Documents (will be replaced)' : 'Saved Documents'}
                          </small>
                          {existingDocuments.map((documentItem, index) => {
                            const fileName = getValue(
                              documentItem,
                              ['file_name', 'name', 'original_name', 'document_name'],
                              `Document ${index + 1}`
                            );
                            const fileUrl = getValue(documentItem, ['file_url', 'url', 'path', 'document_url']);

                            return (
                              <div
                                key={`${fileName}-${index}`}
                                className="border rounded p-2 d-flex align-items-center justify-content-between gap-2"
                              >
                                <div className="d-flex align-items-center gap-2 text-truncate">
                                  <i className="ti ti-file-text text-primary f-20" />
                                  <span className="text-truncate">{fileName}</span>
                                </div>
                                {fileUrl ? (
                                  <Button as="a" href={fileUrl} target="_blank" rel="noreferrer" variant="light-primary" size="sm">
                                    <i className="ti ti-eye me-1" />
                                    View
                                  </Button>
                                ) : null}
                              </div>
                            );
                          })}
                        </>
                      ) : null}

                      {documents.length ? (
                        <>
                          {existingDocuments.length ? <small className="text-muted fw-semibold mt-2">Replacement Files</small> : null}
                          {documents.map((file, index) => (
                            <div
                              key={`${file.name}-${file.lastModified}`}
                              className="border rounded p-2 d-flex align-items-center justify-content-between gap-2"
                            >
                              <div className="d-flex align-items-center gap-2 text-truncate">
                                <i className="ti ti-file text-primary f-20" />
                                <div className="text-truncate">
                                  <div className="text-truncate fw-semibold">{file.name}</div>
                                  <small className="text-muted">{formatFileSize(file.size)}</small>
                                </div>
                              </div>
                              <Button
                                className="rounded-circle flex-shrink-0"
                                size="sm"
                                variant="outline-danger"
                                onClick={() => removeDocument(index)}
                              >
                                <i className="ti ti-x"></i>
                              </Button>
                            </div>
                          ))}
                        </>
                      ) : null}

                      {!documents.length && !existingDocuments.length ? (
                        <div className="text-center border rounded p-4">
                          <i className="ti ti-file-upload text-muted f-28" />
                          <p className="mb-0 mt-2 text-muted">No documents selected yet.</p>
                        </div>
                      ) : null}
                    </Stack>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </MainCard>

          <MainCard
            className="claim-transaction-card"
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Product Details</h5>
                <span className="text-muted f-12">Select item, warehouse, dimensions, quantity, and price for each order row.</span>
              </Stack>
            }
            secondary={
              <Button variant="light-primary" onClick={addItem}>
                <i className="ti ti-plus me-1" />
                Add Row
              </Button>
            }
          >
            <Table className="mb-0 align-middle" responsive hover>
              <thead>
                <tr>
                  <th style={{ minWidth: 240 }}>
                    <RequiredLabel>Item</RequiredLabel>
                  </th>
                  <th style={{ minWidth: 90 }}>
                    <RequiredLabel>Qty</RequiredLabel>
                  </th>
                  <th style={{ minWidth: 90 }}>Satuan</th>
                  <th style={{ minWidth: 160 }}>Price</th>
                  <th style={{ minWidth: 160 }}>Total</th>
                  {!isCustomerRole && (
                    <>
                      <th style={{ minWidth: 220 }}>
                        <RequiredLabel>Warehouse</RequiredLabel>
                      </th>
                      {/* <th style={{ minWidth: 160 }}>
                        <RequiredLabel>Vat</RequiredLabel>
                      </th> */}
                      {/* <th style={{ minWidth: 160 }}>Total VAT</th> */}
                      <th style={{ minWidth: 220 }}>Notes</th>
                      <th style={{ minWidth: 220 }}>Cabang</th>
                      <th style={{ minWidth: 220 }}>Bisnis Unit</th>
                      <th style={{ minWidth: 220 }}>Department</th>
                    </>
                  )}
                  <th className="text-center" style={{ width: 72 }}>
                    #
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemArr?.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <Select
                        styles={customStyles}
                        value={item.itemCode}
                        options={listItem}
                        menuPosition="fixed"
                        onChange={(e) => handleSelectItem(e, index)}
                        placeholder={loadingItemPriceRows[index] ? 'Loading price...' : 'Select item'}
                        isLoading={Boolean(loadingItemPriceRows[index])}
                        isDisabled={Boolean(loadingItemPriceRows[index])}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        onChange={(e) => handleChangeInputLine(index, 'quantity', e)}
                        value={Math.round(item.quantity)}
                        size="sm"
                      />
                    </td>
                    <td>
                      <Form.Control readOnly value={item.unitMsr} size="sm" />
                    </td>
                    <td>
                      <Form.Control
                        readOnly
                        type="text"
                        onChange={(e) => handleChangeInputLine(index, 'unitPrice', e)}
                        value={currency(Math.round(item.unitPrice))}
                        size="sm"
                        min="0"
                      />
                    </td>
                    <td>
                      <Form.Control
                        readOnly
                        type="text"
                        onChange={(e) => handleChangeInputLine(index, 'lineTotal', e)}
                        value={currency(item.lineTotal)}
                        size="sm"
                        min="0"
                        placeholder={String(calculateLineTotals(item).lineTotal)}
                      />
                    </td>
                    {!isCustomerRole && (
                      <>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.whs_code}
                            options={listWarehouse}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectWarehouse(e, index)}
                            placeholder="Select warehouse"
                          />
                        </td>
                        {/* <td>
                          <Select
                            styles={customStyles}
                            value={item.vatGroup}
                            options={listVats}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectVat(e, index)}
                            placeholder="Vat"
                          />
                        </td> */}
                        {/* <td>
                          <Form.Control readOnly type="text" value={currency(item.vatTotal)} size="sm" />
                        </td> */}
                        <td>
                          <Form.Control
                            onChange={(e) => handleChangeInputLine(index, 'freeText', e)}
                            value={item.freeText}
                            size="sm"
                            placeholder="Line notes"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.ocrCode}
                            options={listOcr1}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectOcr1(e, index)}
                            placeholder="Select branch"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.ocrCode2}
                            options={listOcr2}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectOcr2(e, index)}
                            placeholder="Select unit"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.ocrCode3}
                            options={listOcr3}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectOcr3(e, index)}
                            placeholder="Select department"
                          />
                        </td>
                      </>
                    )}
                    <td className="text-center">
                      {itemArr.length === 1 ? (
                        <Button className="rounded-circle" size="sm" variant="outline-primary" onClick={addItem}>
                          <i className="ti ti-plus"></i>
                        </Button>
                      ) : (
                        <Button className="rounded-circle" size="sm" variant="outline-danger" onClick={() => removeItem(index)}>
                          <i className="ti ti-trash"></i>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </MainCard>
        </>
      </Stack>
      <Modal show={showDisc} onHide={handleCancelDiscount} size="lg" centered>
        <Modal.Header closeButton>
          <div>
            <Modal.Title>Set Order Discount</Modal.Title>
            <small className="text-muted">Combine manual discounts and Reward into one order discount.</small>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            {/* <Card className="border mb-0">
              <Card.Body className="py-3">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="fw-semibold mb-1">Kategori Tujuan</Form.Label>
                    <Select
                      value={rewardTargetOptions.find((option) => option.value === selectedRewardTarget) || null}
                      options={rewardTargetOptions}
                      onChange={(option) => setSelectedRewardTarget(option?.value ?? null)}
                      isClearable
                      placeholder="Select discount category..."
                      noOptionsMessage={() => 'Fill in the discount category first'}
                    />
                    <Form.Text>Reward amount will be entered into this category.</Form.Text>
                  </Col>
                  <Col md={6}>
                    <Stack direction="horizontal" className="justify-content-between align-items-start gap-3">
                      <div>
                        <Form.Label className="fw-semibold mb-1">Total Reward Customer</Form.Label>
                        <div className="text-muted f-12">
                          Reward otomatis dihitung dari seluruh data reward yang cocok dengan customer pada order ini.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="light-primary"
                        onClick={fetchCustomerRewardDiscount}
                        disabled={loadingReward || !orderInput.cardCode}
                      >
                        {loadingReward ? <LoaderButton /> : 'Refresh'}
                      </Button>
                    </Stack>
                  </Col>
                </Row>

                {loadingReward ? (
                  <div className="bg-light rounded p-3 mt-3 text-center">
                    <LoaderData />
                  </div>
                ) : rewardDiscountPreview.length ? (
                  <div className="bg-light rounded p-3 mt-3">
                    <Row className="g-3 align-items-center">
                      <Col sm={4}>
                        <small className="text-muted d-block">Total Reward</small>
                        <strong>{formatCurrency(rewardTotal)}</strong>
                        <small className="text-muted d-block">{rewardResultCount} data ditemukan</small>
                      </Col>
                      <Col sm={4}>
                        <small className="text-muted d-block">Sisa Maksimal Diskon</small>
                        <strong>{loadingMaxDiscount ? 'Memuat...' : formatCurrency(remainingDiscountLimit)}</strong>
                        <small className="text-muted d-block">
                          {maxDiscountPercentage ?? 0}% total order - previous discount
                        </small>
                      </Col>
                      <Col sm={4} className="text-sm-end">
                        <small className="text-muted d-block">Amount yang Diterapkan</small>
                        <h5 className="text-primary mb-2">{formatCurrency(applicableRewardDiscount)}</h5>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={addRewardDiscount}
                          disabled={loadingReward || loadingMaxDiscount || selectedRewardTarget === null || !applicableRewardDiscount}
                        >
                          Terapkan ke Kategori
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <div className="bg-light rounded p-3 mt-3 text-muted f-12">
                    {orderInput.cardCode
                      ? 'Total Reward belum tersedia untuk customer ini.'
                      : 'Select customer terlebih dahulu untuk mengambil total Reward.'}
                  </div>
                )}
              </Card.Body>
            </Card> */}

            <Card className="border mb-0">
              <Card.Header className="py-3">
                <Stack direction="horizontal" className="justify-content-between">
                  <div>
                    <h6 className="mb-1">Komponen Diskon</h6>
                    <small className="text-muted">All rows below will be saved as one order discount.</small>
                  </div>
                  <Button size="sm" variant="light-primary" onClick={addItemDisc}>
                    <i className="ti ti-plus me-1" />
                    Add Manual
                  </Button>
                </Stack>
              </Card.Header>
              <Card.Body className="p-0">
                <Table className="mb-0 align-middle" responsive hover>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 210 }}>Kategori</th>
                      <th style={{ minWidth: 170 }}>Keterangan</th>
                      <th style={{ minWidth: 130 }}>Amount</th>
                      <th className="text-center">#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailDisc.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <CreatableSelect
                            styles={customStyles}
                            value={item.name}
                            options={listDiscType}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectDiscType(e, index)}
                            placeholder="Select or type a category"
                            formatCreateLabel={(value) => `Gunakan “${value}”`}
                          />
                        </td>
                        <td>
                          <Form.Control
                            value={item.remarks || ''}
                            onChange={(e) => handleInputRemarks(index, e)}
                            size="sm"
                            placeholder="Keterangan"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            inputMode="numeric"
                            value={formatNumberInput(item.value)}
                            onChange={(e) => handleInputDiscValue(index, e)}
                            size="sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            className="rounded-circle"
                            size="sm"
                            variant="outline-danger"
                            onClick={() => removeItemDisc(index)}
                            disabled={detailDisc.length === 1}
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

            <Stack direction="horizontal" className="justify-content-between bg-light rounded p-3">
              <div>
                <span className="fw-semibold d-block">Total Diskon Gabungan</span>
                <small className="text-muted">{detailDisc.filter((item) => Number(item.value) > 0).length} discount components</small>
              </div>
              <h4 className="mb-0 text-primary">{formatCurrency(discountTotal)}</h4>
            </Stack>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCancelDiscount}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmitDisc()} variant="primary" disabled={loaderDisc || loadingReward || !discountTotal}>
            {loaderDisc ? <LoaderButton /> : 'Save sebagai 1 Diskon'}
          </Button>
        </Modal.Footer>
      </Modal>
      {loadingSubmit ? (
        <div className="text-center">
          <LoaderFull />
        </div>
      ) : null}

      <ConfirmDialog
        show={confirmSubmit}
        onCancel={() => setConfirmSubmit(false)}
        onSubmit={handleSubmitOrder}
        title="Submit Order"
        subTitle="Are you sure you want to process this data"
      />
    </>
  );
}
