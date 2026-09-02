import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

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

import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import ProductServices from '../../../../services/customer-portal/ProductServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import ProductionServices from '../../../../services/production/ProductionServices';
import { getMenuNumber, SYSTEM_KEYS } from '../../../../systems';
import { canUseMenuAction } from '../../../../utils/actionPermissions';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies, getOrganizationAssignmentDefault } from '../../../../utils/cookies';

const pageSize = 10;
const changeProductPermissionKeys = ['production-change-product', getMenuNumber(SYSTEM_KEYS.PRODUCTION, 'production-change-product')];
const shiftOptions = ['All', 'Shift 1', 'Shift 2', 'Shift 3'].map((value) => ({ value, label: value }));
const selectStyles = { menuPortal: (base) => ({ ...base, zIndex: 1090 }) };
const headerSelectStyles = {
  ...selectStyles,
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderWidth: 1,
    borderColor: state.isFocused ? '#4680ff' : '#aeb8c4',
    borderRadius: 6,
    backgroundColor: '#fff',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(70, 128, 255, 0.16)' : 'none',
    cursor: 'pointer',
    '&:hover': { borderColor: state.isFocused ? '#4680ff' : '#6c757d' }
  }),
  valueContainer: (base) => ({ ...base, padding: '6px 12px' }),
  singleValue: (base) => ({ ...base, color: '#1d2630', fontWeight: 500 }),
  placeholder: (base) => ({ ...base, color: '#6c757d' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: 10,
    color: state.isFocused ? '#4680ff' : '#344054',
    '&:hover': { color: '#4680ff' }
  }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: '#cbd3dc' }),
  menu: (base) => ({
    ...base,
    zIndex: 1090,
    marginTop: 6,
    border: '1px solid #cbd3dc',
    borderRadius: 8,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.2)',
    overflow: 'hidden'
  }),
  menuList: (base) => ({ ...base, padding: 6 }),
  option: (base, state) => ({
    ...base,
    padding: '10px 12px',
    borderRadius: 5,
    color: state.isSelected ? '#fff' : '#1d2630',
    backgroundColor: state.isSelected ? '#4680ff' : state.isFocused ? '#eaf1ff' : '#fff',
    cursor: 'pointer',
    '&:active': { backgroundColor: state.isSelected ? '#4680ff' : '#dce8ff' }
  })
};
const toLocalDateTime = (date = new Date()) => {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};
const createBaseLine = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  itemCode: '',
  quantity: ''
});
const createOldLine = () => createBaseLine();
const createNewLine = () => ({
  ...createBaseLine(),
  valueAllocationPercent: ''
});
const createInitialForm = () => ({
  docDate: toLocalDateTime(),
  docDueDate: toLocalDateTime(),
  comments: '',
  shift: 'All',
  unit: getOrganizationAssignmentDefault('units'),
  addonId: String(getCookies('addonId') ?? ''),
  userId: String(getCookies('id') ?? ''),
  ocrCode: getOrganizationAssignmentDefault('branches'),
  ocrCode2: getOrganizationAssignmentDefault('business_units'),
  ocrCode3: getOrganizationAssignmentDefault('departments'),
  warehouse: getOrganizationAssignmentDefault('warehouses'),
  oldLines: [createOldLine()],
  newLines: [createNewLine()]
});

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.change_products)) return payload.change_products;
  if (Array.isArray(payload?.changeProducts)) return payload.changeProducts;

  return [];
};

const getValue = (item, keys, fallback = '') => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item[key] !== '') return item[key];
  }

  return fallback;
};

const normalizeChangeProduct = (item = {}, index = 0) => ({
  id: getValue(item, ['id', 'change_product_id', 'changeProductId', 'DocEntry', 'doc_entry'], index),
  documentNumber: getValue(item, ['document_number', 'documentNumber', 'doc_num', 'DocNum', 'number', 'code'], '-'),
  date: getValue(item, ['date', 'document_date', 'documentDate', 'doc_date', 'DocDate', 'created_at', 'createdAt'], ''),
  sourceCode: getValue(item, ['source_item_code', 'sourceItemCode', 'old_item_code', 'oldItemCode', 'from_item_code', 'fromItemCode'], '-'),
  sourceName: getValue(item, ['source_item_name', 'sourceItemName', 'old_item_name', 'oldItemName', 'from_item_name', 'fromItemName'], ''),
  targetCode: getValue(item, ['target_item_code', 'targetItemCode', 'new_item_code', 'newItemCode', 'to_item_code', 'toItemCode'], '-'),
  targetName: getValue(item, ['target_item_name', 'targetItemName', 'new_item_name', 'newItemName', 'to_item_name', 'toItemName'], ''),
  quantity: getValue(item, ['quantity', 'qty', 'Quantity'], '-'),
  warehouse: getValue(item, ['warehouse_code', 'warehouseCode', 'whs_code', 'WhsCode', 'warehouse'], '-'),
  status: getValue(item, ['status', 'Status', 'document_status', 'documentStatus'], '-')
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ChangeProduct() {
  const { showAlert } = useAlert();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [productOptions, setProductOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });
  const canCreate = canUseMenuAction(changeProductPermissionKeys, 'create');
  const pageCount = Math.max(Math.ceil(rows.length / pageSize), 1);
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safeCurrentPage]);

  const fetchChangeProducts = useCallback(
    async (keyword = '') => {
      setLoading(true);

      try {
        const response = await ProductionServices.getChangeProduct(keyword);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch change product data');

        setRows(getResponseList(response).map(normalizeChangeProduct));
        setCurrentPage(1);
      } catch (error) {
        setRows([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch change product data', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [showAlert]
  );

  useEffect(() => {
    const delayTimer = window.setTimeout(() => fetchChangeProducts(search.trim()), search ? 500 : 0);
    return () => window.clearTimeout(delayTimer);
  }, [fetchChangeProducts, search]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const openCreateModal = async () => {
    setForm(createInitialForm());
    setShowCreateModal(true);
    setLoadingOptions(true);

    try {
      const [productResponse, warehouseResponse, unitResponse, branchResponse, businessUnitResponse, departmentResponse] =
        await Promise.all([
          ProductServices.getAllProduct(''),
          WarehouseServices.getAllWarehouse(''),
          ProductionServices.getUnit(),
          DistributorServices.getOcrByType(1),
          DistributorServices.getOcrByType(2),
          DistributorServices.getOcrByType(3)
        ]);
      const products = getResponseList(productResponse).map((item) => {
        const value = getValue(item, ['item_code', 'itemCode', 'ItemCode', 'code']);
        const name = getValue(item, ['item_name', 'itemName', 'ItemName', 'name']);
        return { value, label: [value, name].filter(Boolean).join(' - ') };
      });
      const warehouses = getResponseList(warehouseResponse).map((item) => {
        const value = getValue(item, ['whs_code', 'warehouse_code', 'WhsCode', 'code']);
        const name = getValue(item, ['whs_name', 'warehouse_name', 'WhsName', 'name']);
        return { value, label: [value, name].filter(Boolean).join(' - ') };
      });
      const units = getResponseList(unitResponse).map((item) => {
        const value = typeof item === 'object' ? getValue(item, ['u_unit', 'U_Unit', 'unit', 'code', 'value']) : item;
        const label = typeof item === 'object' ? getValue(item, ['name', 'label'], value) : item;
        return { value: String(value), label: String(label), raw: typeof item === 'object' ? item : null };
      });
      const normalizeOcrOptions = (response) =>
        getResponseList(response)
          .map((item) => {
            const value = getValue(item, ['ocr_code', 'ocrCode', 'OcrCode', 'code', 'value']);
            const name = getValue(item, ['ocr_name', 'ocrName', 'OcrName', 'name', 'label']);
            return { value: String(value), label: [value, name].filter(Boolean).join(' - ') };
          })
          .filter((item) => item.value);

      setProductOptions(products.filter((item) => item.value));
      setWarehouseOptions(warehouses.filter((item) => item.value));
      setUnitOptions(units.filter((item) => item.value));
      setOcrOptions({
        branch: normalizeOcrOptions(branchResponse),
        businessUnit: normalizeOcrOptions(businessUnitResponse),
        department: normalizeOcrOptions(departmentResponse)
      });
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load form options', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  };

  const updateLine = (collection, lineId, values) => {
    setForm((current) => ({
      ...current,
      [collection]: current[collection].map((line) => (line.id === lineId ? { ...line, ...values } : line))
    }));
  };

  const addLine = (collection) => {
    const createItem = collection === 'oldLines' ? createOldLine : createNewLine;
    setForm((current) => ({ ...current, [collection]: [...current[collection], createItem()] }));
  };
  const removeLine = (collection, lineId) =>
    setForm((current) => ({ ...current, [collection]: current[collection].filter((line) => line.id !== lineId) }));

  const handleCreate = async () => {
    if (
      !form.docDate ||
      !form.warehouse ||
      !form.oldLines.length ||
      !form.newLines.length ||
      form.oldLines.some((line) => !line.itemCode || Number(line.quantity) <= 0) ||
      form.newLines.some((line) => !line.itemCode || Number(line.quantity) <= 0)
    ) {
      showAlert('Complete all required header and line fields', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        docDate: new Date(form.docDate).toISOString(),
        docDueDate: form.docDueDate ? new Date(form.docDueDate).toISOString() : null,
        comments: form.comments,
        shift: form.shift,
        unit: form.unit,
        addonId: form.addonId,
        userId: form.userId,
        post_now: false,
        oldLines: form.oldLines.map(({ id, ...line }) => ({
          ...line,
          quantity: Number(line.quantity),
          fromWhsCode: form.warehouse,
          ocrCode: form.ocrCode,
          ocrCode2: form.ocrCode2,
          ocrCode3: form.ocrCode3
        })),
        newLines: form.newLines.map(({ id, ...line }) => ({
          ...line,
          quantity: Number(line.quantity),
          toWhsCode: form.warehouse,
          valueAllocationPercent: Number(line.valueAllocationPercent || 0),
          ocrCode: form.ocrCode,
          ocrCode2: form.ocrCode2,
          ocrCode3: form.ocrCode3
        }))
      };
      const response = await ProductionServices.postDraftChangeProduct(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to create change product');

      setShowCreateModal(false);
      await fetchChangeProducts(search.trim());
      showAlert(response?.data?.message || 'Change product draft saved', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create change product', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const renderLineSection = ({ collection, title, description, receipt = false }) => (
    <Card className="border mb-0">
      <Card.Header className="py-3">
        <Stack direction="horizontal" className="justify-content-between">
          <div>
            <Stack direction="horizontal" gap={2}>
              <h6 className="mb-0">{title}</h6>
              <Badge bg={receipt ? 'light-success' : 'light-warning'} text="dark">
                {receipt ? 'Goods Receipt' : 'Goods Issue'}
              </Badge>
            </Stack>
            <small className="text-muted">{description}</small>
          </div>
          <Button size="sm" variant="outline-primary" onClick={() => addLine(collection)}>
            <i className="ti ti-plus me-1" /> Add Item
          </Button>
        </Stack>
      </Card.Header>
      <Card.Body>
        <Stack gap={3}>
          {form[collection].map((line, index) => (
            <div key={line.id} className="border rounded p-3 bg-light bg-opacity-25">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <strong className="f-13">Item {index + 1}</strong>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  data-permission-action="none"
                  onClick={() => removeLine(collection, line.id)}
                  aria-label={`Delete ${title.toLowerCase()} row ${index + 1}`}
                >
                  <i className="ti ti-trash me-1" />
                  Delete Row
                </button>
              </div>
              <Row className="g-3">
                <Col lg={receipt ? 7 : 9}>
                  <Form.Label>Product *</Form.Label>
                  <Select
                    options={productOptions}
                    value={productOptions.find((item) => item.value === line.itemCode) || null}
                    onChange={(item) => updateLine(collection, line.id, { itemCode: item?.value || '' })}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </Col>
                <Col lg={2}>
                  <Form.Label>Quantity *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0.0001"
                    step="any"
                    value={line.quantity}
                    onChange={(event) => updateLine(collection, line.id, { quantity: event.target.value })}
                  />
                </Col>
                {receipt ? (
                  <Col lg={3}>
                    <Form.Label>Value Allocation (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={line.valueAllocationPercent}
                      onChange={(event) => updateLine(collection, line.id, { valueAllocationPercent: event.target.value })}
                    />
                  </Col>
                ) : null}
              </Row>
            </div>
          ))}
          {!form[collection].length ? (
            <div className="text-center text-muted border rounded py-4">No items. Click Add Item to add one.</div>
          ) : null}
        </Stack>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Change Product</h5>
            <span className="text-muted f-12">Manage product changes in the production process.</span>
          </Stack>
        }
        secondary={
          canCreate ? (
            <Button onClick={openCreateModal}>
              <i className="ti ti-plus me-1" />
              Create Change Product
            </Button>
          ) : null
        }
      >
        <Card className="border mb-0">
          <Card.Header className="py-3">
            <Stack direction="horizontal" gap={3} className="flex-wrap justify-content-between">
              <div>
                <h6 className="mb-1">Change Product List</h6>
                <small className="text-muted">Production product replacement transactions.</small>
              </div>
              <InputGroup style={{ maxWidth: 360 }}>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search document or product..."
                  aria-label="Search change product"
                />
              </InputGroup>
            </Stack>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <LoaderData />
            ) : rows.length ? (
              <>
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Document No.</th>
                        <th>Date</th>
                        <th>Source Product</th>
                        <th>Target Product</th>
                        <th className="text-end">Quantity</th>
                        <th>Warehouse</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((item, index) => (
                        <tr key={`${item.id}-${index}`}>
                          <td>{(safeCurrentPage - 1) * pageSize + index + 1}</td>
                          <td className="fw-semibold">{item.documentNumber}</td>
                          <td>{formatDate(item.date)}</td>
                          <td>
                            <div className="fw-semibold">{item.sourceCode}</div>
                            {item.sourceName ? <small className="text-muted">{item.sourceName}</small> : null}
                          </td>
                          <td>
                            <div className="fw-semibold">{item.targetCode}</div>
                            {item.targetName ? <small className="text-muted">{item.targetName}</small> : null}
                          </td>
                          <td className="text-end">{item.quantity}</td>
                          <td>{item.warehouse}</td>
                          <td>
                            <Badge bg="light" text="dark">
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <TablePagination
                  currentPage={safeCurrentPage}
                  onPageChange={setCurrentPage}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  total={rows.length}
                  itemLabel="change products"
                />
              </>
            ) : (
              <div className="text-center py-5">
                <span className="avtar avtar-xl bg-light-success text-success mb-3">
                  <i className="ti ti-replace f-32" />
                </span>
                <h5 className="mb-2">No change product data available</h5>
                <p className="text-muted mb-0">{search ? 'No data matches your search.' : 'Change product data will appear here.'}</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </MainCard>

      <Modal show={showCreateModal} onHide={() => !saving && setShowCreateModal(false)} fullscreen scrollable>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>Create Change Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOptions ? (
            <LoaderData />
          ) : (
            <Stack gap={4}>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>Document Date *</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={form.docDate}
                    onChange={(event) => setForm({ ...form, docDate: event.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={form.docDueDate}
                    onChange={(event) => setForm({ ...form, docDueDate: event.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Shift</Form.Label>
                  <Select
                    options={shiftOptions}
                    value={shiftOptions.find((item) => item.value === form.shift)}
                    onChange={(item) => setForm({ ...form, shift: item?.value || '' })}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Unit</Form.Label>
                  <Select
                    options={unitOptions}
                    value={unitOptions.find((item) => item.value === form.unit) || null}
                    onChange={(item) => setForm((current) => ({ ...current, unit: item?.value || '' }))}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                    isClearable
                  />
                </Col>
                <Col md={8}>
                  <Form.Label>Comments</Form.Label>
                  <Form.Control
                    value={form.comments}
                    onChange={(event) => setForm({ ...form, comments: event.target.value })}
                    placeholder="Optional notes"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>Warehouse *</Form.Label>
                  <Select
                    options={warehouseOptions}
                    value={warehouseOptions.find((option) => String(option.value) === String(form.warehouse)) || null}
                    onChange={(option) => setForm((current) => ({ ...current, warehouse: option?.value || '' }))}
                    styles={headerSelectStyles}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    maxMenuHeight={240}
                    isClearable
                    placeholder="Select warehouse"
                  />
                </Col>
                {[
                  ['ocrCode', ocrOptions.branch, 'Branch'],
                  ['ocrCode2', ocrOptions.businessUnit, 'Business Unit'],
                  ['ocrCode3', ocrOptions.department, 'Department']
                ].map(([field, options, label]) => (
                  <Col md={4} key={field}>
                    <Form.Label>{label}</Form.Label>
                    <Select
                      options={options}
                      value={
                        options.find((option) => String(option.value) === String(form[field])) ||
                        (form[field] ? { value: form[field], label: form[field] } : null)
                      }
                      onChange={(option) => setForm((current) => ({ ...current, [field]: option?.value || '' }))}
                      styles={headerSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      maxMenuHeight={240}
                      isClearable
                      placeholder={`Select ${label.toLowerCase()}`}
                    />
                  </Col>
                ))}
              </Row>

              {renderLineSection({
                collection: 'oldLines',
                title: 'Old Items',
                description: 'Items removed from inventory through Goods Issue.'
              })}
              {renderLineSection({
                collection: 'newLines',
                title: 'New Items',
                description: 'Replacement items received into inventory through Goods Receipt.',
                receipt: true
              })}
            </Stack>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={saving} onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button disabled={saving || loadingOptions} onClick={handleCreate}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              'Save Draft'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
