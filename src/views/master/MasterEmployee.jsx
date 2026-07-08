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
import EmployeeServices from '../../services/EmployeeServices';
import { useAlert } from '../../utils/alertContext';
import { useConfirm } from '../../utils/confirmContext';

const initialSalesInput = {
  slpCode: [],
  slpName: [],
  salesId: [],
  distributorCode: '',
  distributorName: '',
  distributorId: '',
  status: '1'
};

const normalizeList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

const getValue = (item, keys, fallback = '') => {
  const key = keys.find((field) => item?.[field] !== undefined && item?.[field] !== null && item?.[field] !== '');
  return key ? item[key] : fallback;
};

const getSalesCode = (item) => getValue(item, ['slp_code', 'sales_code', 'code_sales', 'employee_code', 'code']);
// const getSalesName = (item) => getValue(item, ['slp_name', 'sales_name', 'name_sales', 'employee_name', 'name']);
const getSalesName = (item) => getValue(item, ['slp_name']) || item?.sales_employee?.slp_name || '';
const getSalesDistributorId = (item) => getValue(item, ['id', 'sales_distributor_id', 'salesDistributorId'], '');
const getDistributorCode = (item) =>
  getValue(item, ['code_customer', 'distributor_code', 'customer_code', 'card_code']) ||
  item?.distributor?.code_customer ||
  item?.distributor?.customer_code ||
  '';
const getDistributorName = (item) =>
  getValue(item, ['distributor_name', 'name_distributor', 'customer_name', 'card_name']) ||
  item?.distributor?.name ||
  item?.distributor?.name_distributor ||
  '';

export default function MasterEmployee() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [dataSource, setDataSource] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDistributorSearch, setSelectedDistributorSearch] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSalesId, setEditingSalesId] = useState(null);
  const [deletingSalesId, setDeletingSalesId] = useState(null);
  const [submittingSales, setSubmittingSales] = useState(false);
  const [salesInput, setSalesInput] = useState(initialSalesInput);
  const [listSales, setListSales] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
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
    if (keywords || selectedDistributorSearch) {
      const delayTimer = setTimeout(() => {
        fetchData();
      }, 700);

      return () => clearTimeout(delayTimer);
    }

    fetchData();
  }, [keywords, selectedDistributorSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  const fetchData = async () => {
    const payload = {
      keywords: keywords,
      codeCustomer: selectedDistributorSearch?.value || ''
    };
    setLoadingData(true);
    try {
      const response = await EmployeeServices.getSalesDistributor(payload);
      if (response.data.success) {
        // let spliceData = normalizeList(response).slice(1);
        let spliceData = response.data.data.data;
        setDataSource(spliceData);
        setLoadingData(false);
      } else {
        setLoadingData(false);
        showAlert('Failed to fetch data', 'danger');
      }
    } catch (error) {
      setLoadingData(false);
      showAlert(error?.message || 'Failed to fetch data', 'danger');
    }
  };

  const fetchOptions = async () => {
    setLoadingOptions(true);

    try {
      const [employeeResponse, distributorResponse] = await Promise.all([
        EmployeeServices.getAllEmployee(''),
        DistributorServices.getAllDistributor('')
      ]);

      if (employeeResponse.data.success) {
        setListSales(
          normalizeList(employeeResponse)
            .slice(1)
            .map((item) => ({
              value: getSalesCode(item),
              label: `${getSalesCode(item) || '-'} - ${getSalesName(item) || '-'}`,
              id: item.id || item.sales_employee_id || item.employee_id,
              name: getSalesName(item)
            }))
            .filter((item) => item.value)
        );
      } else {
        showAlert(employeeResponse.data.message || 'Failed to fetch sales data', 'danger');
      }

      if (distributorResponse.data.success) {
        setListDistributor(
          normalizeList(distributorResponse).map((item) => ({
            value: item.code_customer,
            label: `${item.code_customer} - ${item.depo} - ${item.name}`,
            id: item.id,
            name: item.name
          }))
        );
      } else {
        showAlert(distributorResponse.data.message || 'Failed to fetch distributor data', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch add sales dropdown data', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const syncData = async () => {
    setLoadingData(true);
    const response = await EmployeeServices.syncEmployee();
    if (response.data.success) {
      showAlert('Sales data synced successfully', 'success');
      fetchData();
    } else {
      showAlert(response.data.message, 'danger');
      fetchData();
    }
  };

  const filteredData = useMemo(() => {
    if (!selectedStatus) return dataSource;

    return dataSource.filter((item) => String(item.status) === selectedStatus);
  }, [dataSource, selectedStatus]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.status === 1).length,
      inactive: dataSource.filter((item) => item.status !== 1).length
    }),
    [dataSource]
  );

  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const hasActiveFilter = Boolean(keywords || selectedStatus || selectedDistributorSearch);

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
    setSelectedDistributorSearch(null);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingSalesId(null);
    setSalesInput(initialSalesInput);
  };

  const openAddModal = () => {
    setEditingSalesId(null);
    setSalesInput(initialSalesInput);
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    const salesDistributorId = getSalesDistributorId(item);
    const salesCode = getSalesCode(item);
    const salesName = getSalesName(item);
    const distributorCode = getDistributorCode(item);
    const distributorName = getDistributorName(item);

    if (!salesDistributorId) {
      showAlert('Sales relation ID not found', 'danger');
      return;
    }

    setEditingSalesId(salesDistributorId);
    setSalesInput({
      slpCode: salesCode ? [salesCode] : [],
      slpName: salesName ? [salesName] : [],
      salesId: [item?.sales_employee_id || item?.employee_id || item?.sales_employee?.id || ''],
      distributorCode,
      distributorName,
      distributorId: item?.distributor_id || item?.distributor?.id || '',
      status: String(getValue(item, ['status'], '1'))
    });
    setShowAddModal(true);
  };

  const handleSelectSales = (options) => {
    const selectedOptions = Array.isArray(options) ? options : options ? [options] : [];

    setSalesInput((prevState) => ({
      ...prevState,
      slpCode: selectedOptions.map((option) => option.value),
      slpName: selectedOptions.map((option) => option.name),
      salesId: selectedOptions.map((option) => option.id)
    }));
  };

  const handleSelectDistributor = (option) => {
    setSalesInput((prevState) => ({
      ...prevState,
      distributorCode: option?.value || '',
      distributorName: option?.name || '',
      distributorId: option?.id || ''
    }));
  };

  const handleSelectSearchDistributor = (option) => {
    if (!option) {
      setSelectedDistributorSearch(null);
      return;
    }

    setSelectedDistributorSearch({
      value: option.value,
      label: option.label
    });
  };

  const handleSalesInput = (event) => {
    const { name, value } = event.target;

    setSalesInput((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  const submitSales = async (event) => {
    event.preventDefault();

    if (!salesInput.slpCode.length || !salesInput.distributorCode) {
      showAlert('Sales name and distributor must be selected', 'danger');
      return;
    }

    setSubmittingSales(true);

    const payloads = salesInput.slpCode.map((slpCode) => ({
      slp_code: slpCode,
      code_customer: salesInput.distributorCode,
      status: Number(salesInput.status)
    }));

    try {
      if (editingSalesId) {
        const response = await EmployeeServices.putSalesDistributor(editingSalesId, payloads[0]);

        if (response.data.success) {
          showAlert(response.data.message || 'Sales updated successfully', 'success');
          closeAddModal();
          fetchData();
        } else {
          showAlert(response.data.message || 'Failed to update sales', 'danger');
        }

        return;
      }

      const responses = await Promise.allSettled(payloads.map((payload) => EmployeeServices.postSalesDistributor(payload)));
      const fulfilledResponses = responses.filter((response) => response.status === 'fulfilled').map((response) => response.value);
      const failedResponses = fulfilledResponses.filter((response) => !response.data.success);
      const rejectedResponses = responses.filter((response) => response.status === 'rejected');

      if (!failedResponses.length && !rejectedResponses.length) {
        showAlert(
          fulfilledResponses.length > 1
            ? `${fulfilledResponses.length} sales added successfully`
            : fulfilledResponses[0].data.message || 'Sales added successfully',
          'success'
        );
        closeAddModal();
        fetchData();
      } else {
        showAlert(
          failedResponses[0]?.data?.message || rejectedResponses[0]?.reason?.message || 'Some sales failed to be added',
          'danger'
        );
      }
    } catch (error) {
      showAlert(error?.message || (editingSalesId ? 'Failed to update sales' : 'Failed to add sales'), 'danger');
    } finally {
      setSubmittingSales(false);
    }
  };

  const deleteSales = async (item) => {
    const salesDistributorId = getSalesDistributorId(item);

    if (!salesDistributorId) {
      showAlert('Sales relation ID not found', 'danger');
      return;
    }

    setDeletingSalesId(salesDistributorId);

    try {
      const response = await EmployeeServices.deleteSalesDistributor(salesDistributorId);

      if (response.data.success) {
        showAlert(response.data.message || 'Sales deleted successfully', 'success');
        fetchData();
      } else {
        showAlert(response.data.message || 'Failed to delete sales', 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to delete sales', 'danger');
    } finally {
      setDeletingSalesId(null);
    }
  };

  const confirmDeleteSales = (item) => {
    showConfirm({
      title: 'Delete Sales',
      subTitle: `Are you sure you want to delete sales ${getSalesName(item) || getSalesCode(item) || 'this'} from customer ${
        getDistributorCode(item) || '-'
      }?`,
      onConfirm: () => deleteSales(item)
    });
  };

  const canSubmitSales = Boolean(salesInput.slpCode.length && salesInput.distributorCode && !submittingSales);
  const submitButtonText = editingSalesId
    ? 'Save Changes'
    : salesInput.slpCode.length
      ? `Save ${salesInput.slpCode.length} Sales`
      : 'Save Sales';
  const selectedSalesOption = salesInput.slpCode.map(
    (slpCode, index) =>
      listSales.find((item) => item.value === slpCode) || {
        value: slpCode,
        label: `${slpCode || '-'} - ${salesInput.slpName[index] || '-'}`,
        id: salesInput.salesId[index],
        name: salesInput.slpName[index]
      }
  );
  const selectedDistributorOption =
    listDistributor.find((item) => item.value === salesInput.distributorCode) ||
    (salesInput.distributorCode
      ? {
          value: salesInput.distributorCode,
          label: [salesInput.distributorCode, salesInput.distributorName].filter(Boolean).join(' - '),
          id: salesInput.distributorId,
          name: salesInput.distributorName
        }
      : null);

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Sales Data</h5>
              <span className="text-muted f-12">Manage sales lists and sync sales force data from the central system.</span>
            </Stack>
          }
          secondary={
            <Stack direction="horizontal" gap={2}>
              <Button className="btn-add-sales" onClick={openAddModal} variant="light" disabled={loadingData}>
                <i className="ti ti-plus me-1" />
                Add Sales
              </Button>
              {/* <Button onClick={syncData} variant="primary" disabled={loadingData}>
                <i className="ti ti-refresh me-1" />
                Synchronize
              </Button> */}
            </Stack>
          }
        >
          <Row className="g-3">
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Sales</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-users" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            {/* <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Active</div>
                      <h4 className="mb-0">{summary.active}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-success text-success">
                      <i className="ti ti-circle-check" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Inactive</div>
                      <h4 className="mb-0">{summary.inactive}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-secondary text-secondary">
                      <i className="ti ti-circle-x" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col> */}
          </Row>
        </MainCard>

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Search Sales</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  type="text"
                  placeholder="Code or sales name"
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Customer</Form.Label>
              <Select
                styles={selectStyles}
                options={listDistributor}
                value={selectedDistributorSearch}
                onChange={handleSelectSearchDistributor}
                isClearable
                isLoading={loadingOptions}
                placeholder="Select Customer"
                noOptionsMessage={() => 'Customer not found'}
              />

              {/* <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">All Statuses</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Form.Select> */}
            </Col>
            {/* <Col lg={2} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh me-1" />
                Reset
              </Button>
            </Col> */}
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
                  <td colSpan={6}>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Code Sales</th>
                    <th style={{ minWidth: 240 }}>Sales Name</th>
                    <th style={{ minWidth: 180 }}>Customer Code</th>
                    <th style={{ minWidth: 260 }}>Customer Name</th>
                    <th style={{ minWidth: 260 }}>Depo</th>
                    {/* <th style={{ minWidth: 120 }}>Status</th> */}
                    <th className="text-center" style={{ minWidth: 150 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const salesDistributorId = getSalesDistributorId(item);
                      const isDeleting = String(deletingSalesId) === String(salesDistributorId);

                      return (
                        <tr key={salesDistributorId || item.slp_code || index}>
                          <td className="fw-semibold">{getSalesCode(item) || '-'}</td>
                          <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{getSalesName(item) || '-'}</td>
                          <td className="fw-semibold">{getDistributorCode(item) || '-'}</td>
                          <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{getDistributorName(item) || '-'}</td>
                          <td className="fw-semibold">{item?.depo || ''}</td>
                          {/* <td>{item.status === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td> */}
                          <td className="text-center">
                            <Stack direction="horizontal" gap={1} className="justify-content-center flex-nowrap">
                              <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => setSelectedEmployee(item)}>
                                <i className="ti ti-eye" />
                              </Button>
                              <Button
                                className="rounded-circle"
                                variant="outline-warning"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                disabled={submittingSales || Boolean(deletingSalesId)}
                              >
                                <i className="ti ti-edit" />
                              </Button>
                              <Button
                                className="rounded-circle"
                                variant="outline-danger"
                                size="sm"
                                onClick={() => confirmDeleteSales(item)}
                                disabled={Boolean(deletingSalesId)}
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
                      <td colSpan={6}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-users f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'Sales not found' : 'No sales data yet'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter
                              ? 'Change the keyword or status to view other data.'
                              : 'Use synchronize to fetch the latest sales data.'}
                          </p>
                          {hasActiveFilter ? (
                            <Button variant="light-primary" onClick={resetFilters}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button className="btn-add-sales" onClick={openAddModal} variant="primary" disabled={loadingData}>
                              <i className="ti ti-plus me-1" />
                              Add Sales
                            </Button>

                            // <Button variant="primary" onClick={syncData}>
                            //   <i className="ti ti-refresh me-1" />
                            //   Synchronize
                            // </Button>
                          )}
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
            itemLabel="sales"
          />
        </MainCard>
      </Stack>

      <Modal show={Boolean(selectedEmployee)} onHide={() => setSelectedEmployee(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sales Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEmployee && (
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Code Sales</Form.Label>
                <div className="fw-semibold">{getSalesCode(selectedEmployee) || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Status</Form.Label>
                <div>
                  {Number(selectedEmployee.status) === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}
                </div>
              </Col>
              <Col md={12}>
                <Form.Label className="f-12 text-muted">Sales Name</Form.Label>
                <div>{getSalesName(selectedEmployee) || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Code Distributor</Form.Label>
                <div className="fw-semibold">{getDistributorCode(selectedEmployee) || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Distributor Name</Form.Label>
                <div>{getDistributorName(selectedEmployee) || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Depo</Form.Label>
                <div>{selectedEmployee?.depo || selectedEmployee?.distributor?.depo || '-'}</div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedEmployee(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAddModal} onHide={closeAddModal} centered size="lg">
        <Form onSubmit={submitSales}>
          <Modal.Header closeButton>
            <Modal.Title>{editingSalesId ? 'Edit Sales' : 'Add Sales'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>
                  Sales Name <span className="text-danger">*</span>
                </Form.Label>
                <Select
                  styles={selectStyles}
                  options={listSales}
                  value={editingSalesId ? selectedSalesOption[0] || null : selectedSalesOption}
                  onChange={handleSelectSales}
                  isMulti={!editingSalesId}
                  isClearable
                  isLoading={loadingOptions}
                  placeholder="Select sales"
                  noOptionsMessage={() => 'Sales not found'}
                />
              </Col>
              <Col md={6}>
                <Form.Label>
                  Customer <span className="text-danger">*</span>
                </Form.Label>
                <Select
                  styles={selectStyles}
                  options={listDistributor}
                  value={selectedDistributorOption}
                  onChange={handleSelectDistributor}
                  isClearable
                  isLoading={loadingOptions}
                  placeholder="Select distributor"
                  noOptionsMessage={() => 'Distributor not found'}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Code Sales</Form.Label>
                <Form.Control value={salesInput.slpCode.join(', ')} disabled placeholder="Automatically filled from the selected sales" />
              </Col>
              <Col md={6}>
                <Form.Label>Code Distributor</Form.Label>
                <Form.Control value={salesInput.distributorCode} disabled placeholder="Automatically filled from the selected distributor" />
              </Col>
              <Col md={6}>
                <Form.Label>Distributor Name</Form.Label>
                <Form.Control value={salesInput.distributorName} disabled placeholder="Automatically filled from the selected distributor" />
              </Col>
              <Col md={6}>
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={salesInput.status} onChange={handleSalesInput}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </Form.Select>
              </Col>
              <Col xs={12}>
                <div className="sm-inline-alert sm-inline-alert-info">
                  <span className="sm-inline-alert-icon">
                    <i className="ti ti-info-circle f-20" />
                  </span>
                  <span>Select sales and distributor from master data to create a sales distributor relation.</span>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" onClick={closeAddModal} disabled={submittingSales}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmitSales}>
              {submittingSales ? 'Saving...' : submitButtonText}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
