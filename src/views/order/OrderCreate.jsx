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
import { useNavigate } from 'react-router-dom';
import EmployeeServices from '../../services/EmployeeServices';

export default function OrderCreate() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const distributorId = getCookies('distributorId');
  const [showDisc, setShowDisc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listItem, setListItem] = useState([]);
  const [listOcr1, setListOcr1] = useState([]);
  const [listOcr2, setListOcr2] = useState([]);
  const [listOcr3, setListOcr3] = useState([]);
  const [listWarehouse, setListWarehouse] = useState([]);
  const [listEmployee, setListEmployee] = useState([]);

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
      whsCode: null,
      lineTotal: '',
      freeText: '',
      ocrCode: null,
      ocrCode2: null,
      ocrCode3: null
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
      value: ''
    }
  ]);

  useEffect(() => {
    // setItemArr([itemArr]);
    fetchItem();
    fetchDistributor();
    fetchOcr1();
    fetchOcr2();
    fetchOcr3();
    fetchWarehouse();
    fetchEmployee();
  }, []);

  const fetchDistributor = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getDetailDistributor(distributorId);
    if (response.data.success) {
      setIsLoading(false);
      setOrderInput({
        ...orderInput,
        cardCode: response.data?.data.code_customer,
        cnctCode: response.data?.data.name,
        address: response.data?.data.address,
        address2: response.data?.data.mail_address
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
          unitMsr: items?.sal_unit_msr
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
            value: item?.Adress,
            label: item?.Street
          };
          dataB.push(arr);
        } else {
          let arr = {
            value: item?.Adress,
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

  const handleSelectItem = (e, index) => {
    itemArr[index].itemCode = e;
    itemArr[index].unitMsr = e.unitMsr;
    setItemArr([...itemArr]);
  };

  const handleSelectWarehouse = (e, index) => {
    itemArr[index].whsCode = e;
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

  const handleSelectAddress = (e, key) => {
    setOrderInput({
      ...orderInput,
      [key]: e?.value || ''
    });
  };

  const handleSelectSales = (e) => {
    setOrderInput({
      ...orderInput,
      slpCode: e?.value || ''
    });
  };

  const addItem = () => {
    const item = {
      itemCode: null,
      quantity: '',
      unitMsr: '',
      uomEntry: '',
      whsCode: null,
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
    setItemArr([...itemArr]);
  };

  const handelInputDiscName = (index, e) => {
    detailDisc[index].name = e.target.value;
    setDetailDisc([...detailDisc]);
  };

  const handelInputDiscValue = (index, e) => {
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

  const handleSubmitOrder = () => {
    const payload = {
      card_code: orderInput.cardCode,
      po_number: orderInput.numAtCard,
      doc_date: orderInput.docDate,
      doc_due_date: orderInput.docDueDate,
      slp_code: orderInput.slpCode,
      cntct: orderInput.cnctCode
    };

    console.log('payload => ', payload, itemArr);
  };

  const handleSubmitDisc = () => {
    console.log('disc => ', detailDisc);
    setShowDisc(false);
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Buat Order</h5>
              <span className="text-muted f-12">Lengkapi informasi pelanggan, alamat, dan detail produk sebelum menyimpan order.</span>
            </Stack>
          }
          secondary={
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              <Button variant="light-secondary" onClick={() => navigate(-1)}>
                <i className="ti ti-arrow-left me-1" />
                Batal
              </Button>
              <Button onClick={() => handleSubmitOrder()} variant="primary">
                <i className="ti ti-device-floppy me-1" />
                Simpan
              </Button>
            </Stack>
          }
        >
          {isLoading ? (
            <LoaderData />
          ) : (
            <Row className="g-3">
              <Col lg={8}>
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
                    <Row className="g-3">
                      <Col md={6} xl={4}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Kode Customer</Form.Label>
                          <Form.Control
                            readOnly
                            onChange={(e) => handleSetInput(e, 'cardCode')}
                            value={orderInput.cardCode}
                            type="text"
                            placeholder="Kode Customer"
                            size="sm"
                          />
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
                          <Form.Control
                            onChange={(e) => handleSetInput(e, 'docDate')}
                            value={orderInput.docDate}
                            type="date"
                            size="sm"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6} xl={4}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Jatuh Tempo</Form.Label>
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
              <Col lg={4}>
                <Card className="border mb-0 h-100">
                  <Card.Header className="py-3">
                    <h6 className="mb-0">Ringkasan Order</h6>
                    <small className="text-muted">Estimasi berdasarkan detail produk</small>
                  </Card.Header>
                  <Card.Body>
                    <Stack gap={3}>
                      <Stack direction="horizontal" className="justify-content-between">
                        <span className="text-muted">Jumlah Baris</span>
                        <strong>{itemArr.length}</strong>
                      </Stack>
                      <Stack direction="horizontal" className="justify-content-between">
                        <span className="text-muted">Subtotal</span>
                        <strong>{formatCurrency(orderSubtotal)}</strong>
                      </Stack>
                      <Stack direction="horizontal" className="justify-content-between">
                        <span className="text-muted">Diskon</span>
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
                <th style={{ minWidth: 220 }}>Warehouse</th>
                <th style={{ minWidth: 160 }}>Total</th>
                <th style={{ minWidth: 220 }}>Catatan</th>
                <th style={{ minWidth: 220 }}>Cabang</th>
                <th style={{ minWidth: 220 }}>Bisnis Unit</th>
                <th style={{ minWidth: 220 }}>Department</th>
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
                      type="number"
                      onChange={(e) => handleChangeInputLine(index, 'quantity', e)}
                      value={item.quantity}
                      size="sm"
                      min="0"
                    />
                  </td>
                  <td>
                    <Form.Control readOnly value={item.unitMsr} size="sm" />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      onChange={(e) => handleChangeInputLine(index, 'unitPrice', e)}
                      value={item.unitPrice}
                      size="sm"
                      min="0"
                    />
                  </td>
                  <td>
                    <Select
                      styles={customStyles}
                      value={item.whsCode}
                      options={listWarehouse}
                      menuPosition="fixed"
                      onChange={(e) => handleSelectWarehouse(e, index)}
                      placeholder="Pilih warehouse"
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      onChange={(e) => handleChangeInputLine(index, 'lineTotal', e)}
                      value={item.lineTotal}
                      size="sm"
                      min="0"
                      placeholder={String(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
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
      </Stack>

      <Modal show={showDisc} onHide={() => setShowDisc(false)} size="md" centered>
        <Modal.Header closeButton>
          <Modal.Title>Atur Diskon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Nominal</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {detailDisc.map((item, index) => (
                <tr key={index}>
                  <td>
                    <Form.Control value={item.name} onChange={(e) => handelInputDiscName(index, e)} size="sm" placeholder="Nama diskon" />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={item.value}
                      onChange={(e) => handelInputDiscValue(index, e)}
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
          <Button onClick={() => handleSubmitDisc()} variant="primary">
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
