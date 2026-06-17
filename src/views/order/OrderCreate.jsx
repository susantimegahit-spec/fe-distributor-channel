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
import PriceServices from '../../services/PriceServices';
import LoaderFull from '../../components/LoaderFull';
import LoaderButton from '../../components/LoaderButton';
import { currency } from '../../utils/global';

// #FBD43C -> soft yellow
// #DAA919 -> dark yellow

export default function OrderPost() {
  const roleId = getCookies('role');
  const navigate = useNavigate();
  const { id } = useParams();
  const isDetailMode = Boolean(id);
  const { showAlert } = useAlert();
  const distributorId = getCookies('distributorId');
  const [showDisc, setShowDisc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loaderDisc, setLoaderDisc] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [listItem, setListItem] = useState([]);
  const [listOcr1, setListOcr1] = useState([]);
  const [listOcr2, setListOcr2] = useState([]);
  const [listOcr3, setListOcr3] = useState([]);
  const [listWarehouse, setListWarehouse] = useState([]);
  const [listEmployee, setListEmployee] = useState([]);
  const [discId, setDiscId] = useState('');
  const [listDiscType, setListDiscType] = useState([]);
  const [listVats, setListVats] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);

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

  const [itemArr, setItemArr] = useState([
    {
      itemCode: null,
      quantity: '',
      unitMsr: '',
      unitPrice: '',
      whs_code: null,
      lineTotal: '',
      freeText: '',
      ocrCode: null,
      ocrCode2: null,
      ocrCode3: null,
      vatGroup: null
    }
  ]);

  const [orderInput, setOrderInput] = useState({
    cardCode: '',
    numAtCard: '',
    docDate: '',
    docDueDate: '',
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
    fetchItem();
    if (!isDetailMode) {
      fetchDistributor();
    }
    fetchOcr1();
    fetchOcr2();
    fetchOcr3();
    fetchWarehouse();
    fetchEmployee();
    fetchDiscType();
    fetchVats();
    if (roleId !== 1) {
      fetchListDistributor();
    }
  }, [isDetailMode]);

  useEffect(() => {
    if (id) {
      fetchOrderDetail(id);
    }
  }, [id]);

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

  const formatDateInput = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
  };

  const createOption = (value, label, extra = {}) => {
    if (!value && !label) return null;
    return {
      value: value || label,
      label: label || value,
      ...extra
    };
  };

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
    console.log('line => ', line);
    const itemCode = getValue(line, ['item_code', 'itemCode', 'ItemCode', 'item.item_code', 'item.code', 'code']);
    const itemName = getValue(
      line,
      ['item_name', 'itemName', 'ItemName', 'Dscription', 'description', 'item_description', 'item.item_name', 'item.name'],
      itemCode
    );
    const unitMsr = getValue(line, ['unit_msr', 'unitMsr', 'unit', 'UomCode', 'uom_code']);
    const whs_code = getValue(line, ['whs_code', 'whs_code', 'warehouse_code', 'whs_code']);
    const whsName = getValue(line, ['whs_name', 'whsName', 'warehouse_name', 'WhsName', 'warehouse.whs_name', 'warehouse.name'], whs_code);
    const vatGroup = getValue(line, ['vat_group', 'vatGroup', 'VatGroup', 'vat_code', 'vatCode']);
    const vatName = getValue(line, ['vat_name', 'vatName', 'VatName', 'vat_group_name', 'vatGroupName', 'vat.name'], vatGroup);
    const ocrCode = getValue(line, ['ocr_code', 'ocrCode', 'OcrCode', 'branch_code', 'branchCode']);
    const ocrName = getValue(line, ['ocr_name', 'ocrName', 'OcrName', 'branch_name', 'branchName', 'cabang', 'branch.name'], ocrCode);
    const ocrCode2 = getValue(line, ['ocr_code2', 'ocrCode2', 'OcrCode2', 'business_unit_code', 'businessUnitCode']);
    const ocrName2 = getValue(
      line,
      ['ocr_name2', 'ocrName2', 'OcrName2', 'business_unit_name', 'businessUnitName', 'bisnis_unit', 'business_unit.name'],
      ocrCode2
    );
    const ocrCode3 = getValue(line, ['ocr_code3', 'ocrCode3', 'OcrCode3', 'department_code', 'departmentCode']);
    const ocrName3 = getValue(line, ['ocr_name3', 'ocrName3', 'OcrName3', 'department_name', 'departmentName'], ocrCode3);

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
      freeText: getValue(line, ['free_text', 'freeText', 'FreeTxt'], ''),
      ocrCode: findOption(listOcr1, ocrCode, ocrName),
      ocrCode2: findOption(listOcr2, ocrCode2, ocrName2),
      ocrCode3: findOption(listOcr3, ocrCode3, ocrName3),
      vatGroup: findOption(listVats, vatGroup, vatName)
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

    setOrderDetail(order);
    setOrderInput({
      cardCode,
      numAtCard: getValue(order, ['po_number', 'num_at_card', 'numAtCard', 'NumAtCard']),
      docDate: formatDateInput(getValue(order, ['doc_date', 'docDate', 'DocDate'])),
      docDueDate: formatDateInput(getValue(order, ['doc_due_date', 'docDueDate', 'DocDueDate'])),
      slpCode: getValue(order, ['slp_code', 'slpCode', 'SlpCode']),
      cnctCode: getValue(order, ['cntct', 'cnctCode', 'contact_name', 'customer_name', 'CardName']),
      address: findOption(listAddressB, billToCode, billToAddress),
      address2: findOption(listAddressS, shipToCode, shipToAddress),
      comments: getValue(order, ['comments', 'Comments']),
      idDiscount: getValue(order, ['id_discount', 'idDiscount'])
    });

    if (cardCode) {
      fetchAddress(cardCode);
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
        showAlert('Detail order tidak ditemukan', 'danger');
      }
    } catch {
      showAlert('Gagal ambil detail order', 'danger');
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
    } else {
      setIsLoading(false);
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const fetchItem = async () => {
    setIsLoading(true);
    const response = await ProductServices.getAllProduct();
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
      showAlert('Gagal ambil data', 'danger');
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
      showAlert('Gagal ambil data', 'danger');
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
      showAlert('Gagal ambil data', 'danger');
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
      showAlert('Gagal ambil data', 'danger');
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
          label: items?.whs_name
        };
        dataArr.push(arr);
      });
      setListWarehouse(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const fetchEmployee = async () => {
    setIsLoading(true);
    const response = await EmployeeServices.getAllEmployee('');
    if (response.data.success) {
      const data = response.data.data;
      const dataArr = data.map((item) => ({
        value: item?.slp_code,
        label: `${item?.slp_code || '-'} - ${item?.slp_name || '-'}`,
        name: item?.slp_name
      }));

      setListEmployee(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Gagal ambil data sales', 'danger');
    }
  };

  const fetchListDistributor = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getAllDistributor();
    if (response.data.success) {
      const data = response.data.data;
      const dataArr = data.map((item) => ({
        value: item?.code_customer,
        label: `${item?.name || '-'}`,
        name: item?.name
      }));

      setListDistributor(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Gagal ambil data sales', 'danger');
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
      showAlert('Gagal ambil data sales', 'danger');
    }
  };

  const fetchVats = async () => {
    setIsLoading(true);
    const response = await OrderServices.getVats();
    if (response.data.success) {
      const data = response.data.data;
      const dataArr = data.map((item) => ({
        value: item?.code,
        label: item?.name
      }));

      setListVats(dataArr);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Gagal ambil data sales', 'danger');
    }
  };

  const fetchAddress = async (code) => {
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
      setIsLoading(false);
    } else {
      setIsLoading(false);
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const handleSetInput = (e, key) => {
    setOrderInput({
      ...orderInput,
      [key]: e.target.value
    });
  };

  const handleSelectItem = async (e, index) => {
    const resp = await PriceServices.getPriceByItem(e.value);
    if (resp.data.success) {
      itemArr[index].itemCode = e;
      itemArr[index].unitMsr = e.unitMsr;
      itemArr[index].unitPrice = resp.data.data[0].price;
      if (itemArr[index].quantity > 0) {
        itemArr[index].lineTotal = resp.data.data[0].price * itemArr[index].quantity;
      }
      setItemArr([...itemArr]);
    }
    // const response = await
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

  const handleSelectVat = (e, index) => {
    itemArr[index].vatGroup = e;
    setItemArr([...itemArr]);
  };

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
    setOrderInput({
      ...orderInput,
      cardCode: e?.value || '',
      cnctCode: e?.name || '',
      address: '',
      address2: ''
    });
    fetchAddress(e?.value);
  };

  const handleSelectDiscType = (e, index) => {
    detailDisc[index].name = e;
    setDetailDisc([...detailDisc]);
  };

  const addItem = () => {
    const item = {
      itemCode: null,
      quantity: '',
      unitMsr: '',
      uomEntry: '',
      whs_code: null,
      lineTotal: '',
      freeText: '',
      ocrCode: null,
      ocrCode2: null,
      ocrCode3: null
    };

    let store = [...itemArr, item];
    setItemArr(store);
  };

  const removeItem = (i) => {
    setItemArr((prevArray) => prevArray.filter((_, index) => index !== i));
    // const itm = item.filter((item, index) => index != i);
    // setItemArr(itm)
  };

  const addItemDisc = () => {
    const item = {
      name: '',
      value: ''
    };

    let store = [...detailDisc, item];
    setDetailDisc(store);
  };

  const removeItemDisc = (i) => {
    setDetailDisc((prevArray) => prevArray.filter((_, index) => index !== i));
  };

  const handleChangeInputLine = (index, key, e) => {
    itemArr[index][key] = e.target.value;
    if (key === 'quantity') {
      itemArr[index].lineTotal = e.target.value * itemArr[index].unitPrice;
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

  const handleInputDiscValue = (index, e) => {
    detailDisc[index].value = e.target.value;
    setDetailDisc([...detailDisc]);
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const orderSubtotal = itemArr.reduce((total, item) => {
    const lineTotal = Number(item.lineTotal);
    const calculatedTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);

    return total + (Number.isFinite(lineTotal) && lineTotal > 0 ? lineTotal : calculatedTotal);
  }, 0);

  const discountTotal = detailDisc.reduce((total, item) => total + (Number(item.value) || 0), 0);
  const grandTotal = Math.max(orderSubtotal - discountTotal, 0);

  const handleSubmitOrder = async (type) => {
    let arrItem = [];
    itemArr.map((item) => {
      let data = {
        item_code: item?.itemCode?.value,
        quantity: item?.quantity,
        unit_msr: item?.unitMsr,
        uom_entry: item?.itemCode?.uomEntry,
        whs_code: item?.whs_code?.value,
        unit_price: item?.unitPrice,
        vat_group: item?.vatGroup?.value,
        line_total: item?.lineTotal,
        free_text: item?.freeText,
        ocr_code: item?.ocrCode?.value,
        ocr_code2: item?.ocrCode2?.value,
        ocr_code3: item?.ocrCode3?.value
      };
      arrItem.push(data);
    });

    const payload = {
      card_code: orderInput.cardCode,
      po_number: orderInput.numAtCard,
      doc_date: orderInput.docDate,
      doc_due_date: orderInput.docDueDate,
      slp_code: orderInput.slpCode,
      cntct: orderInput.cnctCode,
      pay_to_code: orderInput.address?.value,
      address: orderInput.address?.label,
      ship_to_code: orderInput.address2.value,
      address2: orderInput.address2?.label,
      comments: orderInput.comments,
      status: type,
      id_discount: discId,
      lines: arrItem
    };

    if (id) {
      const resp = await OrderServices.putOrder(id, payload);
      if (resp.data.success) {
        showAlert(resp.data.message, 'success');
        setLoadingSubmit(false);
        navigate(-1);
      } else {
        showAlert(resp.data.message, 'danger');
        setLoadingSubmit(false);
      }
    } else {
      const resp = await OrderServices.postOrder(payload);
      if (resp.data.success) {
        showAlert(resp.data.message, 'success');
        setLoadingSubmit(false);
        navigate(-1);
      } else {
        showAlert(resp.data.message, 'danger');
        setLoadingSubmit(false);
      }
    }
  };

  const handlePostingData = async (type) => {
    setLoadingSubmit(true);
    let arrItem = [];
    itemArr.map((item) => {
      let data = {
        item_code: item?.itemCode?.value,
        quantity: item?.quantity,
        unit_msr: item?.unitMsr,
        uom_entry: item?.itemCode?.uomEntry,
        whs_code: item?.whs_code?.value,
        unit_price: item?.unitPrice,
        vat_group: item?.vatGroup?.value,
        line_total: item?.lineTotal,
        free_text: item?.freeText,
        ocr_code: item?.ocrCode?.value,
        ocr_code2: item?.ocrCode2?.value,
        ocr_code3: item?.ocrCode3?.value
      };
      arrItem.push(data);
    });

    const payload = {
      card_code: orderInput.cardCode,
      po_number: orderInput.numAtCard,
      doc_date: orderInput.docDate,
      doc_due_date: orderInput.docDueDate,
      slp_code: orderInput.slpCode,
      cntct: orderInput.cnctCode,
      pay_to_code: orderInput.address?.value,
      address: orderInput.address?.label,
      ship_to_code: orderInput.address2.value,
      address2: orderInput.address2?.label,
      comments: orderInput.comments,
      status: type,
      id_discount: discId,
      lines: arrItem
    };

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
    setLoaderDisc(true);
    let dataDisc = [];
    detailDisc.map((item) => {
      let data = {
        TypeDiscount: item?.name?.value,
        Persentase: 0,
        TotalDiskon: item?.value,
        Remarks: item?.remarks
      };
      dataDisc.push(data);
    });
    const payload = {
      CardCode: orderInput.cardCode,
      CardName: orderInput.cnctCode,
      Lines: dataDisc
    };

    const response = await OrderServices.postDiscount(payload);
    if (response.data.success) {
      setLoaderDisc(false);
      setDiscId(response.data.data.code);
      showAlert(response.data.message, 'success');
      setShowDisc(false);
    } else {
      setLoaderDisc(false);
      showAlert(response.data.message, 'danger');
    }
    // setShowDisc(false);
  };

  return (
    <>
      <Stack gap={3}>
        <>
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">{isDetailMode ? 'Detail Order' : 'Buat Order'}</h5>
                <span className="text-muted f-12">
                  {isDetailMode
                    ? `Menampilkan detail ${orderDetail?.order_no || orderDetail?.doc_num || 'order'} yang dipilih.`
                    : 'Lengkapi informasi pelanggan, alamat, dan detail produk sebelum menyimpan order.'}
                </span>
              </Stack>
            }
            secondary={
              <Stack direction="horizontal" gap={2} className="flex-wrap">
                <Button variant="light-secondary" onClick={() => navigate(-1)}>
                  <i className="ti ti-arrow-left me-1" />
                  Batal
                </Button>
                <Button onClick={() => handleSubmitOrder('DRAFT')} variant="warning">
                  <i className="ti ti-device-floppy me-1" />
                  Simpan Draft
                </Button>
                <Button onClick={() => handleSubmitOrder('WAITING_APPROVAL')} variant="primary">
                  <i className="ti ti-send" />
                  Kirim
                </Button>
                {roleId === 5 || roleId === 2 ? (
                  <Button onClick={() => handlePostingData('APPROVED')} variant="success">
                    <i className="ti ti-checks" />
                    Approve
                  </Button>
                ) : null}
              </Stack>
            }
          >
            {isLoading ? (
              <LoaderData />
            ) : (
              <Row className="g-3">
                <Col lg={roleId === 1 ? 12 : 9}>
                  <Card className="border mb-0 h-100">
                    <Card.Header className="py-3">
                      <Stack direction="horizontal" gap={2} className="justify-content-between">
                        <div>
                          <h6 className="mb-0">Informasi Order</h6>
                          <small className="text-muted">Data utama transaksi dan pelanggan</small>
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
                            <Form.Label className="small text-muted">Kode Customer</Form.Label>
                            {roleId === 1 ? (
                              <Form.Control
                                readOnly
                                onChange={(e) => handleSetInput(e, 'cardCode')}
                                value={orderInput.cardCode}
                                type="text"
                                placeholder="Kode Customer"
                                size="sm"
                              />
                            ) : (
                              <Select
                                styles={customStyles}
                                value={listDistributor.find((item) => item.value === orderInput.cardCode) || null}
                                options={listDistributor}
                                menuPosition="fixed"
                                onChange={handleSelectDistributor}
                                placeholder="Pilih Customer"
                                isClearable
                              />
                            )}
                          </Form.Group>
                        </Col>
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">No. PO</Form.Label>
                            <Form.Control
                              onChange={(e) => handleSetInput(e, 'numAtCard')}
                              value={orderInput.numAtCard}
                              type="text"
                              placeholder="Masukkan nomor PO"
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        {roleId === 5 || roleId === 2 ? (
                          <Col md={6} xl={4}>
                            <Form.Group>
                              <Form.Label className="small text-muted">Kode Sales</Form.Label>
                              <Select
                                styles={customStyles}
                                value={listEmployee.find((item) => item.value === orderInput.slpCode) || null}
                                options={listEmployee}
                                menuPosition="fixed"
                                onChange={handleSelectSales}
                                placeholder="Pilih sales"
                                isClearable
                              />
                            </Form.Group>
                          </Col>
                        ) : null}
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">Kontak Pelanggan</Form.Label>
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
                            <Form.Label className="small text-muted">Tanggal</Form.Label>
                            <Form.Control onChange={(e) => handleSetInput(e, 'docDate')} value={orderInput.docDate} type="date" size="sm" />
                          </Form.Group>
                        </Col>
                        <Col md={6} xl={4}>
                          <Form.Group>
                            <Form.Label className="small text-muted">Request Tanggal Kirim</Form.Label>
                            <Form.Control
                              onChange={(e) => handleSetInput(e, 'docDueDate')}
                              value={orderInput.docDueDate}
                              type="date"
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small text-muted">Alamat Tagih</Form.Label>
                            <Select
                              value={orderInput.address || null}
                              options={listAddressB}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectAddress(e, 'address')}
                              placeholder="Pilih alamat tagih"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small text-muted">Alamat Kirim</Form.Label>
                            <Select
                              value={orderInput.address2 || null}
                              options={listAddressS}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectAddress(e, 'address2')}
                              placeholder="Pilih alamat kirim"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="small text-muted">Catatan</Form.Label>
                            <Form.Control
                              onChange={(e) => handleSetInput(e, 'comments')}
                              value={orderInput.comments}
                              as="textarea"
                              rows={3}
                              placeholder="Tambahkan catatan order bila diperlukan"
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                {roleId === 5 || roleId === 2 ? (
                  <Col lg={3}>
                    <Card className="border mb-0 h-100">
                      <Card.Header className="py-3">
                        <h6 className="mb-0">Ringkasan Order</h6>
                        <small className="text-muted">Estimasi berdasarkan detail produk</small>
                      </Card.Header>
                      <Card.Body>
                        <Stack gap={3}>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Jumlah Item</span>
                            <strong>{itemArr.length}</strong>
                          </Stack>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Subtotal</span>
                            <strong>{formatCurrency(orderSubtotal)}</strong>
                          </Stack>
                          <Stack direction="horizontal" className="justify-content-between">
                            <span className="text-muted">Diskon {discId ? `- ${discId}` : ''}</span>
                            <Button variant="link" className="p-0 text-decoration-none" onClick={() => setShowDisc(true)}>
                              {formatCurrency(discountTotal)}
                            </Button>
                          </Stack>
                          <div className="border-top pt-3">
                            <Stack direction="horizontal" className="justify-content-between">
                              <span className="fw-semibold">Grand Total</span>
                              <h5 className="mb-0 text-primary">{formatCurrency(grandTotal)}</h5>
                            </Stack>
                          </div>
                          <Button variant="light-primary" onClick={() => setShowDisc(true)}>
                            <i className="ti ti-discount-2 me-1" />
                            Atur Diskon
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
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Detail Produk</h5>
                <span className="text-muted f-12">Pilih item, gudang, dimensi, quantity, dan harga untuk setiap baris order.</span>
              </Stack>
            }
            secondary={
              <Button variant="light-primary" onClick={addItem}>
                <i className="ti ti-plus me-1" />
                Tambah Baris
              </Button>
            }
          >
            <Table className="mb-0 align-middle" responsive hover>
              <thead>
                <tr>
                  <th style={{ minWidth: 240 }}>Item</th>
                  <th style={{ minWidth: 90 }}>Qty</th>
                  <th style={{ minWidth: 90 }}>Satuan</th>
                  <th style={{ minWidth: 160 }}>Harga</th>
                  <th style={{ minWidth: 160 }}>Total</th>
                  {roleId !== 1 && (
                    <>
                      <th style={{ minWidth: 220 }}>Warehouse</th>
                      <th style={{ minWidth: 160 }}>Vat</th>
                      <th style={{ minWidth: 220 }}>Catatan</th>
                      <th style={{ minWidth: 220 }}>Cabang</th>
                      <th style={{ minWidth: 220 }}>Bisnis Unit</th>
                      <th style={{ minWidth: 220 }}>Department</th>
                    </>
                  )}
                  <th className="text-center" style={{ width: 72 }}>
                    Aksi
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
                        placeholder="Pilih item"
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
                        placeholder={String(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                      />
                    </td>
                    {roleId !== 1 && (
                      <>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.whs_code}
                            options={listWarehouse}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectWarehouse(e, index)}
                            placeholder="Pilih warehouse"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.vatGroup}
                            options={listVats}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectVat(e, index)}
                            placeholder="Vat"
                          />
                        </td>
                        <td>
                          <Form.Control
                            onChange={(e) => handleChangeInputLine(index, 'freeText', e)}
                            value={item.freeText}
                            size="sm"
                            placeholder="Catatan baris"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.ocrCode}
                            options={listOcr1}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectOcr1(e, index)}
                            placeholder="Pilih cabang"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.ocrCode2}
                            options={listOcr2}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectOcr2(e, index)}
                            placeholder="Pilih unit"
                          />
                        </td>
                        <td>
                          <Select
                            styles={customStyles}
                            value={item.ocrCode3}
                            options={listOcr3}
                            menuPosition="fixed"
                            onChange={(e) => handleSelectOcr3(e, index)}
                            placeholder="Pilih department"
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
      <Modal show={showDisc} onHide={() => setShowDisc(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Atur Diskon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {detailDisc.map((item, index) => (
                <tr key={index}>
                  <td>
                    <Select
                      styles={customStyles}
                      value={item.name}
                      options={listDiscType}
                      menuPosition="fixed"
                      onChange={(e) => handleSelectDiscType(e, index)}
                      placeholder="Pilih Tipe Diskon"
                    />
                  </td>
                  <td>
                    <Form.Control value={item.remarks} onChange={(e) => handleInputRemarks(index, e)} size="sm" placeholder="Keterangan" />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={item.value}
                      onChange={(e) => handleInputDiscValue(index, e)}
                      size="sm"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="text-center">
                    {index === 0 ? (
                      <Button className="rounded-circle" size="sm" variant="outline-primary" onClick={addItemDisc}>
                        <i className="ti ti-plus"></i>
                      </Button>
                    ) : (
                      <Button className="rounded-circle" size="sm" variant="outline-danger" onClick={() => removeItemDisc(index)}>
                        <i className="ti ti-trash"></i>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Stack direction="horizontal" className="justify-content-between border-top mt-3 pt-3">
            <span className="text-muted">Total Diskon</span>
            <strong>{formatCurrency(discountTotal)}</strong>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowDisc(false)}>
            Batal
          </Button>
          <Button onClick={() => handleSubmitDisc()} variant="primary" disabled={loaderDisc}>
            {loaderDisc ? <LoaderButton /> : 'Simpan Diskon'}
          </Button>
        </Modal.Footer>
      </Modal>
      {loadingSubmit ? (
        <div className="text-center">
          <LoaderFull />
        </div>
      ) : null}
    </>
  );
}
