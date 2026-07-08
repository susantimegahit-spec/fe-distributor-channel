import { useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
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

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LoaderData from '../../components/LoaderData';
import DistributorServices from '../../services/DistributorServices';
import PriceServices from '../../services/PriceServices';
import ProductServices from '../../services/ProductServices';
import { useAlert } from '../../utils/alertContext';
import { useConfirm } from '../../utils/confirmContext';

const pageSize = 10;
const initialPriceInput = {
  item_code: '',
  code_customer: '',
  uom: '',
  price: '',
  status: '1'
};

const getValue = (item, keys, fallback = '-') => {
  const key = keys.find((field) => item?.[field] !== undefined && item?.[field] !== null && item?.[field] !== '');
  return key ? item[key] : fallback;
};

const getPriceValue = (item) => Number(getValue(item, ['price', 'item_price', 'selling_price', 'unit_price', 'amount', 'harga'], 0));

const getPriceId = (item) =>
  getValue(item, ['id', 'price_id', 'distributor_item_price_id', 'distributor_item_prices_id'], '');

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
};

const normalizeList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

export default function MasterPrice() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [dataSource, setDataSource] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [deletingPriceId, setDeletingPriceId] = useState(null);
  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(initialPriceInput);
  const [listItem, setListItem] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const selectStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: '43px'
    }),
    valueContainer: (provided) => ({
      ...provided,
      paddingTop: 0,
      paddingBottom: 0
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 1060
    })
  };

  useEffect(() => {
    setCurrentPage(1);

    if (keywords) {
      const delayTimer = setTimeout(() => {
        fetchData();
      }, 700);

      return () => clearTimeout(delayTimer);
    }

    fetchData();
  }, [keywords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);

    try {
      const response = await PriceServices.getPriceByItem(keywords);

      if (response.data.success) {
        setDataSource(normalizeList(response));
      } else {
        showAlert(response.data.message || 'Failed to fetch master price data', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch master price data', 'danger');
    } finally {
      setLoadingData(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!selectedStatus) return dataSource;

    return dataSource.filter((item) => String(getValue(item, ['status', 'is_active'], '')) === selectedStatus);
  }, [dataSource, selectedStatus]);

  const summary = useMemo(() => {
    const prices = dataSource.map(getPriceValue).filter((value) => value > 0);
    const totalPrice = prices.reduce((total, value) => total + value, 0);

    return {
      total: dataSource.length,
      active: dataSource.filter((item) => Number(getValue(item, ['status', 'is_active'], 0)) === 1).length,
      inactive: dataSource.filter((item) => Number(getValue(item, ['status', 'is_active'], 0)) !== 1).length,
      averagePrice: prices.length ? totalPrice / prices.length : 0
    };
  }, [dataSource]);

  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const hasActiveFilter = Boolean(keywords || selectedStatus);

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
  };

  const fetchOptions = async () => {
    setLoadingOptions(true);

    try {
      const [productResponse, distributorResponse] = await Promise.all([
        ProductServices.getAllProduct(''),
        DistributorServices.getAllDistributor('')
      ]);

      if (productResponse.data.success) {
        setListItem(
          normalizeList(productResponse).map((item) => ({
            value: item.item_code,
            label: `${item.item_code || '-'} - ${item.item_name || '-'}`,
            name: item.item_name,
            uom: item.sal_unit_msr || item.uom || item.unit
          }))
        );
      } else {
        showAlert(productResponse.data.message || 'Failed to fetch item data', 'danger');
      }

      if (distributorResponse.data.success) {
        setListDistributor(
          normalizeList(distributorResponse).map((item) => ({
            value: item.code_customer,
            label: `${item.code_customer || '-'} - ${item?.depo} - ${item.name || '-'}`,
            name: item.name
          }))
        );
      } else {
        showAlert(distributorResponse.data.message || 'Failed to fetch distributor data', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch master price dropdown data', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handlePriceInput = (event) => {
    const { name, value } = event.target;

    setPriceInput((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingPriceId(null);
    setPriceInput(initialPriceInput);
  };

  const openAddModal = () => {
    setEditingPriceId(null);
    setPriceInput(initialPriceInput);
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    const priceId = getPriceId(item);

    if (!priceId) {
      showAlert('Master price ID not found', 'danger');
      return;
    }

    setEditingPriceId(priceId);
    setPriceInput({
      item_code: getValue(item, ['item_code', 'code_item', 'itemCode'], ''),
      code_customer: getValue(item, ['code_customer', 'customer_code', 'distributor_code'], ''),
      uom: getValue(item, ['uom', 'unit', 'uom_code', 'uom_name'], ''),
      price: String(getPriceValue(item) || ''),
      status: String(getValue(item, ['status', 'is_active'], '1'))
    });
    setShowAddModal(true);
  };

  const handleSelectItem = (option) => {
    setPriceInput((prevState) => ({
      ...prevState,
      item_code: option?.value || '',
      uom: option?.uom || prevState.uom
    }));
  };

  const handleSelectDistributor = (option) => {
    setPriceInput((prevState) => ({
      ...prevState,
      code_customer: option?.value || ''
    }));
  };

  const submitPrice = async (event) => {
    event.preventDefault();

    if (!priceInput.item_code || !priceInput.code_customer || !priceInput.price) {
      showAlert('Item code, distributor code, and price are required', 'danger');
      return;
    }

    setSubmittingPrice(true);

    const payload = {
      item_code: priceInput.item_code,
      code_customer: priceInput.code_customer,
      uom: priceInput.uom,
      price: Number(priceInput.price),
      status: Number(priceInput.status)
    };

    try {
      const response = editingPriceId ? await PriceServices.putPrice(editingPriceId, payload) : await PriceServices.postPrice(payload);

      if (response.data.success) {
        showAlert(editingPriceId ? 'Master price updated successfully' : 'Master price added successfully', 'success');
        closeAddModal();
        fetchData();
      } else {
        showAlert(response.data.message || (editingPriceId ? 'Failed to update master price' : 'Failed to add master price'), 'danger');
      }
    } catch (error) {
      showAlert(error?.message || (editingPriceId ? 'Failed to update master price' : 'Failed to add master price'), 'danger');
    } finally {
      setSubmittingPrice(false);
    }
  };

  const deletePrice = async (item) => {
    const priceId = getPriceId(item);

    if (!priceId) {
      showAlert('Master price ID not found', 'danger');
      return;
    }

    setDeletingPriceId(priceId);

    try {
      const response = await PriceServices.deletePrice(priceId);

      if (response.data.success) {
        showAlert(response.data.message || 'Master price deleted successfully', 'success');
        fetchData();
      } else {
        showAlert(response.data.message || 'Failed to delete master price', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to delete master price', 'danger');
    } finally {
      setDeletingPriceId(null);
    }
  };

  const confirmDeletePrice = (item) => {
    showConfirm({
      title: 'Delete Master Price',
      subTitle: `Are you sure you want to delete item price ${getValue(item, ['item_code', 'code_item', 'itemCode'])}?`,
      onConfirm: () => deletePrice(item)
    });
  };

  const canSubmitPrice = Boolean(priceInput.item_code && priceInput.code_customer && priceInput.price && !submittingPrice);

  return (
    <>
      <Stack gap={3}>
        <MainCard
          content={false}
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Price List</h5>
              <span className="text-muted f-12">Manage distributor item price lists based on Price Services data.</span>
            </Stack>
          }
          secondary={
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              <Button onClick={openAddModal} variant="primary">
                <i className="ti ti-plus me-1" />
                Add Price
              </Button>
              <Button onClick={fetchData} variant="light-primary" disabled={loadingData}>
                <i className="ti ti-refresh me-1" />
                Refresh
              </Button>
            </Stack>
          }
        />

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={5} md={6}>
              <Form.Label className="f-12 text-muted">Search Price</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  type="text"
                  placeholder="Item code, item name, or distributor"
                />
              </InputGroup>
            </Col>
            {/* <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">All Statuses</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Form.Select>
            </Col> */}
            <Col lg={2} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh me-1" />
                Reset
              </Button>
            </Col>
            <Col lg={5} md={6} className="text-lg-end">
              <span className="text-muted f-12">Showing</span>
              <div className="fw-semibold">
                {filteredData.length} of {dataSource.length}
              </div>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive hover>
            {loadingData ? (
              <tbody>
                <tr>
                  <td colSpan={7}>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>Item Code</th>
                    <th style={{ minWidth: 240 }}>Item Name</th>
                    <th style={{ minWidth: 180 }}>Distributor</th>
                    <th style={{ minWidth: 140 }}>Depo</th>
                    <th style={{ minWidth: 100 }}>Price</th>
                    <th style={{ minWidth: 110 }}>Status</th>
                    <th className="text-center" style={{ minWidth: 150 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const status = Number(getValue(item, ['status', 'is_active'], 0));
                      const priceId = getPriceId(item);
                      const isDeleting = String(deletingPriceId) === String(priceId);

                      return (
                        <tr key={priceId || `${getValue(item, ['item_code'], 'item')}-${index}`}>
                          <td className="fw-semibold">{getValue(item, ['item_code', 'code_item', 'itemCode'])}</td>
                          <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            {getValue(item, ['item_name', 'name_item', 'itemName', 'product_name'])}
                          </td>
                          <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            {getValue(item, ['distributor_name', 'customer_name', 'card_name', 'name_customer'])}
                          </td>
                          <td>{getValue(item, ['depo'])}</td>
                          <td className="fw-semibold">{formatCurrency(getPriceValue(item))}</td>
                          <td>{status === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                          <td className="text-center">
                            <Stack direction="horizontal" gap={1} className="justify-content-center flex-nowrap">
                              <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => setSelectedPrice(item)}>
                                <i className="ti ti-eye" />
                              </Button>
                              <Button
                                className="rounded-circle"
                                variant="outline-warning"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                disabled={submittingPrice || Boolean(deletingPriceId)}
                              >
                                <i className="ti ti-edit" />
                              </Button>
                              <Button
                                className="rounded-circle"
                                variant="outline-danger"
                                size="sm"
                                onClick={() => confirmDeletePrice(item)}
                                disabled={Boolean(deletingPriceId)}
                              >
                                {isDeleting ? <span className="spinner-border spinner-border-sm" /> : <i className="ti ti-trash" />}
                              </Button>
                            </Stack>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-currency-dollar f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'Price data not found' : 'No price data yet'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter
                              ? 'Change the keyword or status to view other data.'
                              : 'Click refresh to fetch the latest price data.'}
                          </p>
                          <Button
                            variant={hasActiveFilter ? 'light-primary' : 'primary'}
                            onClick={hasActiveFilter ? resetFilters : fetchData}
                          >
                            <i className="ti ti-refresh me-1" />
                            {hasActiveFilter ? 'Reset Filter' : 'Refresh'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </Table>

          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredData.length}
            itemLabel="harga"
          />
        </MainCard>
      </Stack>

      <Modal show={Boolean(selectedPrice)} onHide={() => setSelectedPrice(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detail Master Price</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPrice && (
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Item Code</Form.Label>
                <div className="fw-semibold">{getValue(selectedPrice, ['item_code', 'code_item', 'itemCode'])}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Price</Form.Label>
                <div className="fw-semibold">{formatCurrency(getPriceValue(selectedPrice))}</div>
              </Col>
              <Col md={12}>
                <Form.Label className="f-12 text-muted">Item Name</Form.Label>
                <div>{getValue(selectedPrice, ['item_name', 'name_item', 'itemName', 'product_name'])}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Distributor</Form.Label>
                <div>{getValue(selectedPrice, ['distributor_name', 'customer_name', 'card_name', 'name_customer'])}</div>
              </Col>
              <Col md={3}>
                <Form.Label className="f-12 text-muted">UOM</Form.Label>
                <div>{getValue(selectedPrice, ['uom', 'unit', 'uom_code', 'uom_name'])}</div>
              </Col>
              <Col md={3}>
                <Form.Label className="f-12 text-muted">Status</Form.Label>
                <div>
                  {Number(getValue(selectedPrice, ['status', 'is_active'], 0)) === 1 ? (
                    <Badge bg="success">Active</Badge>
                  ) : (
                    <Badge bg="secondary">Inactive</Badge>
                  )}
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedPrice(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAddModal} onHide={closeAddModal} centered size="lg">
        <Form onSubmit={submitPrice}>
          <Modal.Header closeButton>
            <Modal.Title>{editingPriceId ? 'Edit Price' : 'Add Price'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>
                  Item Code <span className="text-danger">*</span>
                </Form.Label>
                <Select
                  styles={selectStyles}
                  options={listItem}
                  value={listItem.find((item) => item.value === priceInput.item_code) || null}
                  onChange={handleSelectItem}
                  isClearable
                  isLoading={loadingOptions}
                  placeholder="Select item"
                  noOptionsMessage={() => 'Item not found'}
                />
              </Col>
              <Col md={6}>
                <Form.Label>
                  Code Distributor <span className="text-danger">*</span>
                </Form.Label>
                <Select
                  styles={selectStyles}
                  options={listDistributor}
                  value={listDistributor.find((item) => item.value === priceInput.code_customer) || null}
                  onChange={handleSelectDistributor}
                  isClearable
                  isLoading={loadingOptions}
                  placeholder="Select distributor"
                  noOptionsMessage={() => 'Distributor not found'}
                />
              </Col>
              <Col md={4}>
                <Form.Label>UOM</Form.Label>
                <Form.Control readOnly name="uom" value={priceInput.uom} onChange={handlePriceInput} placeholder="PCS / CTN" />
              </Col>
              <Col md={4}>
                <Form.Label>
                  Price <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control name="price" value={priceInput.price} onChange={handlePriceInput} type="number" min="0" placeholder="0" />
              </Col>
              <Col md={4}>
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={priceInput.status} onChange={handlePriceInput}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </Form.Select>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" onClick={closeAddModal} disabled={submittingPrice}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmitPrice}>
              {submittingPrice ? 'Saving...' : editingPriceId ? 'Save Changes' : 'Save Price'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
