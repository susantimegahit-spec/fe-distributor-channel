import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { Button, Container, Form, Modal, Pagination, Table } from 'react-bootstrap';
import { getCookies } from '../../utils/cookies';
import DistributorServices from '../../services/DistributorServices';
import { useAlert } from '../../utils/alertContext';
import LoaderData from '../../components/LoaderData';
import Select from 'react-select';
import ProductServices from '../../services/ProductServices';
import WarehouseServices from '../../services/WarehouseServices';

export default function OrderCreate({ data, show, cancel, submit }) {
  const { showAlert } = useAlert();
  const [distributorId, setDistributorId] = useState(getCookies('distributorId'));
  const [startDate, setStartDate] = useState(new Date());
  const [showDisc, setShowDisc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listItem, setListItem] = useState(false);
  const [listOcr1, setListOcr1] = useState([]);
  const [listOcr2, setListOcr2] = useState([]);
  const [listOcr3, setListOcr3] = useState([]);
  const [listWarehouse, setListWarehouse] = useState([]);

  const customStyles = {
    container: (provided) => ({
      ...provided,
      width: '200px' // Sets the explicit width of the whole component
    })
  };

  const [itemArr, setItemArr] = useState([
    {
      itemCode: '',
      quantity: '',
      unitMsr: '',
      unitPrice: '',
      whsCode: '',
      lineTotal: '',
      freetext: '',
      ocrCode: '',
      ocrCode2: '',
      ocrCode3: ''
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
    if (show) {
      setItemArr([itemArr]);
      fetchItem();
      fetchDistributor();
      fetchOcr1();
      fetchOcr2();
      fetchOcr3();
      fetchWarehouse();
    }
  }, [show]);

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
      data.map((items, index) => {
        let arr = {
          value: items.item_code,
          label: items?.item_name,
          // width: 1000,
          unitMsr: items?.sal_unit_msr
        };
        dataArr.push(arr);
      });
      setListItem(dataArr);
    } else {
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const fetchOcr1 = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getOcrByType(1);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.map((items, index) => {
        let arr = {
          value: items.OcrCode,
          label: items?.OcrName
        };
        dataArr.push(arr);
      });
      setListOcr1(dataArr);
    } else {
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const fetchOcr2 = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getOcrByType(2);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.map((items, index) => {
        let arr = {
          value: items.OcrCode,
          label: items?.OcrName
        };
        dataArr.push(arr);
      });
      setListOcr2(dataArr);
    } else {
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const fetchOcr3 = async () => {
    setIsLoading(true);
    const response = await DistributorServices.getOcrByType(3);
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.map((items, index) => {
        let arr = {
          value: items.OcrCode,
          label: items?.OcrName
        };
        dataArr.push(arr);
      });
      setListOcr3(dataArr);
    } else {
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const fetchWarehouse = async () => {
    setIsLoading(true);
    const response = await WarehouseServices.getAllWarehouse('');
    if (response.data.success) {
      const data = response.data.data;
      let dataArr = [];
      data.map((items, index) => {
        let arr = {
          value: items.whs_code,
          label: items?.whs_name
        };
        dataArr.push(arr);
      });
      setListWarehouse(dataArr);
    } else {
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
    setItemArr((prevItem) => prevItem.map((item, idx) => (idx === index ? { ...item, unitMsr: e.unitMsr, itemCode: e.value } : item)));
  };

  const handleSelectWarehouse = (e, index) => {
    setItemArr((prevItem) => prevItem.map((item, idx) => (idx === index ? { ...item, whsCode: e.value } : item)));
  };

  const addItem = () => {
    const item = {
      itemCode: '',
      quantity: '',
      unitMsr: '',
      uomEntry: '',
      whsCode: '',
      lineTotal: '',
      freetext: '',
      ocrCode: '',
      ocrCode2: '',
      ocrCode3: ''
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
    // const itm = item.filter((item, index) => index != i);
    // setItemArr(itm)
  };

  const handleChangeQty = (index, e) => {
    itemArr[index].quantity = e.target.value
  }

  const handleChangeTotal = (index, e) => {
    itemArr[index].lineTotal = e.target.value
  }

  const handleSubmitOrder = () => {
    console.log('item => ', itemArr)
    console.log('input => ', orderInput)
  }

  return (
    <Modal show={show} onHide={cancel} fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Buat Order</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <LoaderData />
        ) : (
          <>
            <Row>
              <Col lg={4}>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Kode Customer</Form.Label>
                    <Form.Control
                      readOnly
                      onChange={(e) => handleSetInput(e, 'cardCode')}
                      value={orderInput.cardCode}
                      type="text"
                      placeholder="Kode Customer"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">No. PO</Form.Label>
                    <Form.Control
                      onChange={(e) => handleSetInput(e, 'numAtCard')}
                      value={orderInput.numAtCard}
                      type="text"
                      placeholder="No. PO"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Kode Sales</Form.Label>
                    <Form.Control
                      onChange={(e) => handleSetInput(e, 'slpCode')}
                      value={orderInput.slpCode}
                      type="text"
                      placeholder="Kode Sales"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Kode Kontak Pelanggan</Form.Label>
                    <Form.Control
                      onChange={(e) => handleSetInput(e, 'cnctCode')}
                      value={orderInput.cnctCode}
                      type="text"
                      placeholder="Kode Kontak Pelanggan"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
              </Col>
              <Col lg={4}>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Tanggal</Form.Label>
                    <Form.Control
                      onChange={(e) => handleSetInput(e, 'docDate')}
                      value={orderInput.docDate}
                      type="date"
                      placeholder="Tanggal"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Jatuh Tempo</Form.Label>
                    <Form.Control
                      onChange={(e) => handleSetInput(e, 'docDueDate')}
                      value={orderInput.docDueDate}
                      type="date"
                      placeholder="Jatuh Tempo"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Alamat Tagih</Form.Label>
                    <Form.Control
                      // onChange={(e) => handleSetInput(e, 'address')}
                      value={orderInput.address}
                      as="textarea"
                      rows={2}
                      placeholder="Alamat Tagih"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Alamat Kirim</Form.Label>
                    <Form.Control
                      // onChange={(e) => handleSetInput(e, 'address2')}
                      value={orderInput.address2}
                      as="textarea"
                      rows={2}
                      placeholder="Alamat Kirim"
                      size="sm"
                    />
                  </Form.Group>
                </Row>
              </Col>
              <Col lg={4}>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Diskon</Form.Label>
                    <Form.Control onClick={() => setShowDisc(true)} readOnly type="text" placeholder="Diskon" size="sm" />
                  </Form.Group>
                </Row>
                <Row>
                  <Form.Group>
                    <Form.Label className="small">Catatan</Form.Label>
                    <Form.Control as="textarea" rows={3} placeholder="Catatan" size="sm" />
                  </Form.Group>
                </Row>
              </Col>
            </Row>
            <br />
            <br />
            <h5>Detail Produk</h5>
            <div className="table table-responsive">
              <Table bordered responsive>
                <thead>
                  <th>Kode Item</th>
                  <th>Qty</th>
                  <th>Satuan</th>
                  <th>Harga</th>
                  <th>Warehouse</th>
                  <th>Total</th>
                  <th>Catatan</th>
                  <th>Cabang</th>
                  <th>Bisnis Unit</th>
                  <th>Department</th>
                  <th>#</th>
                </thead>
                <tbody>
                  {itemArr.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>
                          <Form.Group>
                            <Select
                              styles={customStyles}
                              options={listItem}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectItem(e, index)}
                            />
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Form.Control type='number' style={{ width: 75 }} onChange={(e) => handleChangeQty(index, e)} value={item.quantity} size="sm"></Form.Control>
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Form.Control style={{ width: 50 }} readOnly value={item.unitMsr} size="sm"></Form.Control>
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Form.Control style={{ width: 150 }} value={item.unitPrice} size="sm"></Form.Control>
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Select
                              styles={customStyles}
                              options={listWarehouse}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectItem(e, index)}
                            />
                            {/* <Form.Control style={{ width: 200 }} value={item.whsCode} size="sm"></Form.Control> */}
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Form.Control onClick={(e) => handleChangeTotal(index, e)} style={{ width: 150 }} value={item.lineTotal} size="sm"></Form.Control>
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Form.Control style={{ width: 200 }} value={item.freetext} size="sm"></Form.Control>
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Select
                              styles={customStyles}
                              options={listOcr1}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectItem(e, index)}
                            />
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Select
                              styles={customStyles}
                              options={listOcr2}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectItem(e, index)}
                            />
                          </Form.Group>
                        </td>
                        <td>
                          <Form.Group>
                            <Select
                              styles={customStyles}
                              options={listOcr3}
                              menuPosition="fixed"
                              onChange={(e) => handleSelectItem(e, index)}
                            />
                          </Form.Group>
                        </td>
                        <td>
                          {index === 0 ? (
                            <Form.Group>
                              <Button size="sm" variant="primary" onClick={addItem}>
                                <i className="ti ti-plus"></i>
                              </Button>
                            </Form.Group>
                          ) : (
                            <Form.Group>
                              <Button size="sm" variant="danger" onClick={() => removeItem(index)}>
                                <i className="ti ti-minus"></i>
                              </Button>
                            </Form.Group>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={cancel}>
          Batal
        </Button>
        <Button onClick={() => handleSubmitOrder()} variant="primary">Simpan</Button>
      </Modal.Footer>
      <Modal show={showDisc} onHide={() => setShowDisc(false)} size="md">
        <Modal.Header>
          <Modal.Title>Masukan Diskon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row></Row>
        </Modal.Body>
        <Table bordered>
          <thead>
            <th>Nama</th>
            <th>Nominal</th>
            <th>#</th>
          </thead>
          <tbody>
            {detailDisc.map((item, index) => {
              return (
                <tr key={index}>
                  <td>
                    <Form.Group>
                      <Form.Control size="sm"></Form.Control>
                    </Form.Group>
                  </td>
                  <td>
                    <Form.Group>
                      <Form.Control size="sm"></Form.Control>
                    </Form.Group>
                  </td>
                  <td>
                    {index === 0 ? (
                      <Form.Group>
                        <Button size="sm" variant="primary" onClick={addItemDisc}>
                          <i className="ti ti-plus"></i>
                        </Button>
                      </Form.Group>
                    ) : (
                      <Form.Group>
                        <Button size="sm" variant="danger" onClick={() => removeItemDisc(index)}>
                          <i className="ti ti-minus"></i>
                        </Button>
                      </Form.Group>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDisc(false)}>
            Batal
          </Button>
          <Button variant="primary">Simpan</Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
}
