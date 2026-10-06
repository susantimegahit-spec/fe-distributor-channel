import { useEffect, useState } from 'react';
import FormDatePicker from 'components/FormDatePicker';
import Select from 'react-select';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

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
const SERIES_CARD_CODE = '1470000113';

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
  for (const key of ['data', 'items', 'rows', 'warehouses', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeOcr = (item = {}) => {
  const value = item.ocr_code ?? item.ocrCode ?? item.OcrCode ?? item.code ?? item.value ?? '';
  const name = item.ocr_name ?? item.ocrName ?? item.OcrName ?? item.name ?? item.label ?? '';
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
        unitMsr: item.pur_pack_mrs ?? ''
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
    RequesterName: String(getCookies('name') ?? ''),
    Department: String(getCookies('userDepartment') ?? ''),
    DocDate: today(),
    DocDueDate: today(),
    Comments: '',
    UserId: userId,
    Lines: [createLine()]
  };
};

export default function PurchaseRequest() {
  const { showAlert } = useAlert();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [loadingLineMasters, setLoadingLineMasters] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemOptions, setItemOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });
  const [form, setForm] = useState(createInitialForm);
  const userBranch = String(getCookies('userBranch') ?? '');
  const userBusinessUnit = String(getCookies('userBusinessUnit') ?? '');
  const userDepartment = String(getCookies('userDepartment') ?? '');
  const userWarehouse = String(getCookies('userWarehouse') ?? '');

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
    setForm(createInitialForm());
    setShowForm(true);
  };

  const closeForm = () => {
    if (!saving) setShowForm(false);
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
      Series: form.Series,
      ReqType: form.ReqType.trim(),
      RequesterName: form.RequesterName.trim(),
      Department: form.Department.trim(),
      DocDate: form.DocDate,
      DocDueDate: form.DocDueDate,
      Comments: form.Comments.trim(),
      UserId: form.UserId.trim(),
      Lines: form.Lines.map(({ key, ...line }) => ({
        ...line,
        ItemCode: line.ItemCode.trim(),
        ItemName: line.ItemName.trim(),
        Quantity: Number(line.Quantity),
        FreeTxt: line.FreeTxt.trim()
      }))
    };

    setSaving(true);
    try {
      const response = await PurchasingServices.postPurchasing(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to create purchase request');
      }
      showAlert(response?.data?.message || 'Purchase request created successfully', 'success');
      setShowForm(false);
      setForm(createInitialForm());
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
        columns={['Request No.', 'Request Date', 'Department', 'Requester', 'Amount', 'Status', 'Action']}
        emptyMessage="Purchase requests will appear here after they are created."
      />

      <Modal
        show={showForm}
        onHide={closeForm}
        backdrop="static"
        dialogClassName="purchase-request-dialog"
        centered
        scrollable
      >
        <Modal.Header closeButton={!saving}>
          <Modal.Title>New Purchase Request</Modal.Title>
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
              <Col md={3}>
                <Form.Label>Requester Name</Form.Label>
                <Form.Control value={form.RequesterName} readOnly required />
              </Col>
              <Col md={4}>
                <Form.Label>Department</Form.Label>
                {userDepartment ? (
                  <Form.Control value={form.Department} readOnly required />
                ) : (
                  <Select
                    inputId="purchase-request-department"
                    options={ocrOptions.department}
                    value={ocrOptions.department.find((option) => option.value === form.Department) || null}
                    onChange={(option) => updateHeader('Department', option?.value ?? '')}
                    isLoading={loadingLineMasters}
                    isDisabled={loadingLineMasters}
                    placeholder={loadingLineMasters ? 'Loading departments...' : 'Select department'}
                    noOptionsMessage={() => (loadingLineMasters ? 'Loading departments...' : 'Department not found')}
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

            {form.Lines.map((line, index) => (
              <div className="purchase-request-line-card border rounded p-3 mb-3" key={line.key}>
                <Stack direction="horizontal" className="justify-content-between mb-3">
                  <span className="fw-semibold">Item {index + 1}</span>
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
                </Stack>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Label>Item Code</Form.Label>
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
                  </Col>
                  <Col md={3}>
                    <Form.Label>Item Name</Form.Label>
                    <Form.Control
                      value={line.ItemName}
                      onChange={(event) => updateLine(index, 'ItemName', event.target.value)}
                      readOnly={!line.ItemCode.toUpperCase().startsWith('JS')}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Required Date</Form.Label>
                    <FormDatePicker
                      type="date"
                      value={line.PQTReqDate}
                      onChange={(event) => updateLine(index, 'PQTReqDate', event.target.value)}
                      required
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Quantity</Form.Label>
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
                  </Col>
                  <Col md={3}>
                    <Form.Label>UoM Entry</Form.Label>
                    <Form.Control value={line.UomEntry} onChange={(event) => updateLine(index, 'UomEntry', event.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>UoM Code</Form.Label>
                    <Form.Control value={line.UomCode} onChange={(event) => updateLine(index, 'UomCode', event.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Unit</Form.Label>
                    <Form.Control value={line.UnitMsr} onChange={(event) => updateLine(index, 'UnitMsr', event.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Warehouse</Form.Label>
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
                  </Col>
                  <Col md={4}>
                    <Form.Label>Branch</Form.Label>
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
                  </Col>
                  <Col md={4}>
                    <Form.Label>Unit</Form.Label>
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
                  </Col>
                  <Col md={4}>
                    <Form.Label>Department</Form.Label>
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
                  </Col>
                  <Col xs={12}>
                    <Form.Label>Line Remarks</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={line.FreeTxt}
                      onChange={(event) => updateLine(index, 'FreeTxt', event.target.value)}
                    />
                  </Col>
                </Row>
              </div>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" className="purchase-request-cancel" onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="purchase-request-form"
            variant="primary"
            className="purchase-request-save"
            disabled={saving}
          >
            {saving ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="ti ti-device-floppy me-1" />}
            Save Request
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
