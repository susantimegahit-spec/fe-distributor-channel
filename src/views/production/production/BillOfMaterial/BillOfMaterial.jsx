import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import { getItem } from '../../../../redux/production/materialReducer';
import { getResource } from '../../../../redux/production/resourceReducer';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import ProductServices from '../../../../services/customer-portal/ProductServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import { useAlert } from '../../../../utils/alertContext';

const createDetailRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: '',
  item: null,
  quantity: '',
  issueMethod: ''
});

const createInitialForm = () => ({
  product: null,
  quantity: '',
  uom: null,
  warehouse: null,
  distributionRule: null,
  alternate: '',
  details: [createDetailRow()]
});

const selectStyles = {
  menu: (base) => ({ ...base, zIndex: 1060 }),
  menuPortal: (base) => ({ ...base, zIndex: 1070 })
};

const COMPONENT_TYPE_ITEM = '4';
const COMPONENT_TYPE_RESOURCE = '290';

const getResponseList = (response) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;

  return [];
};

const getProductUoms = (item = {}) =>
  [item.invntry_uom, item.inventory_uom, item.sal_unit_msr, item.pur_unit_msr, item.uom, item.unit]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .map((value) => ({ value, label: value }));

const normalizeComponentOption = (item = {}, type) => {
  const isResource = String(type) === COMPONENT_TYPE_RESOURCE;
  const code = isResource
    ? item.res_code || item.resource_code || item.code || item.ResCode || ''
    : item.item_code || item.material_code || item.code || item.ItemCode || '';
  const name = isResource
    ? item.res_name || item.resource_name || item.name || item.ResName || ''
    : item.item_name || item.material_name || item.name || item.ItemName || '';
  const uom = isResource
    ? item.unit_of_msr || item.unit_msr || item.uom || item.unit || item.unit_of_measure || ''
    : item.invntry_uom || item.inventory_uom || item.uom || item.unit || item.unit_msr || '';

  return {
    value: code,
    label: [code, name].filter(Boolean).join(' - ') || '-',
    name,
    uom
  };
};

export default function BillOfMaterial() {
  const { showAlert } = useAlert();
  const dispatch = useDispatch();
  const { items: materialItems, loading: loadingMaterials } = useSelector((state) => state.productionMaterial);
  const { items: resourceItems, loading: loadingResources } = useSelector((state) => state.productionResource);
  const [rows, setRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [distributionRuleOptions, setDistributionRuleOptions] = useState([]);
  const [form, setForm] = useState(createInitialForm);

  const uomOptions = useMemo(() => form.product?.uoms || [], [form.product]);

  const fetchFormOptions = async () => {
    setLoadingOptions(true);

    try {
      const [productResponse, warehouseResponse, distributionRuleResponse] = await Promise.all([
        ProductServices.getAllProduct(''),
        WarehouseServices.getAllWarehouse(''),
        DistributorServices.getOcrByType(1)
      ]);

      if ([productResponse, warehouseResponse, distributionRuleResponse].some((response) => response?.data?.success === false)) {
        throw new Error('Failed to fetch Bill of Material form options');
      }

      setProductOptions(
        getResponseList(productResponse).map((item) => {
          const code = item.item_code || item.product_code || item.code || '';
          const name = item.item_name || item.product_name || item.name || '';

          return {
            value: code,
            label: [code, name].filter(Boolean).join(' - ') || '-',
            productName: name,
            uoms: getProductUoms(item)
          };
        })
      );
      setWarehouseOptions(
        getResponseList(warehouseResponse).map((item) => {
          const code = item.whs_code || item.warehouse_code || item.code || '';
          const name = item.whs_name || item.warehouse_name || item.name || '';

          return {
            value: code,
            label: [code, name].filter(Boolean).join(' - ') || '-',
            name
          };
        })
      );
      setDistributionRuleOptions(
        getResponseList(distributionRuleResponse).map((item) => {
          const code = item.ocr_code || item.code || '';
          const name = item.ocr_name || item.name || '';

          return {
            value: code,
            label: [code, name].filter(Boolean).join(' - ') || '-'
          };
        })
      );
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material form options', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleOpenCreateModal = () => {
    setForm(createInitialForm());
    setShowCreateModal(true);
    fetchFormOptions();
  };

  const handleProductChange = (product) => {
    setForm((current) => ({
      ...current,
      product,
      uom: product?.uoms?.length === 1 ? product.uoms[0] : null
    }));
  };

  const updateDetailRow = (rowId, values) => {
    setForm((current) => ({
      ...current,
      details: current.details.map((detail) => (detail.id === rowId ? { ...detail, ...values } : detail))
    }));
  };

  const handleDetailTypeChange = async (rowId, type) => {
    updateDetailRow(rowId, { type, item: null });

    if (!type) return;

    try {
      if (String(type) === COMPONENT_TYPE_ITEM) {
        await dispatch(getItem(''));
      } else if (String(type) === COMPONENT_TYPE_RESOURCE) {
        await dispatch(getResource(''));
      }
    } catch (error) {
      showAlert(
        error?.response?.data?.message ||
          error?.message ||
          `Failed to fetch ${String(type) === COMPONENT_TYPE_ITEM ? 'material' : 'resource'} data`,
        'danger'
      );
    }
  };

  const addDetailRow = () => {
    setForm((current) => ({
      ...current,
      details: [...current.details, createDetailRow()]
    }));
  };

  const removeDetailRow = (rowId) => {
    setForm((current) => ({
      ...current,
      details: current.details.filter((detail) => detail.id !== rowId)
    }));
  };

  const handleSubmit = () => {
    if (!form.product || !(Number(form.quantity) > 0) || !form.uom || !form.warehouse || !form.distributionRule) {
      showAlert('Please complete all required Bill of Material fields', 'warning');
      return;
    }

    const hasInvalidDetail =
      !form.details.length ||
      form.details.some((detail) => !detail.type || !detail.item || !detail.quantity.trim() || !detail.issueMethod);

    if (hasInvalidDetail) {
      showAlert('Please complete all Bill of Material component rows', 'warning');
      return;
    }

    setRows((currentRows) => [
      ...currentRows,
      {
        id: `${form.product.value}-${Date.now()}`,
        productNo: form.product.value,
        productName: form.product.productName,
        quantity: Number(form.quantity),
        uom: form.uom.value,
        warehouse: form.warehouse.label,
        distributionRule: form.distributionRule.label,
        alternate: form.alternate.trim(),
        details: form.details
      }
    ]);
    setShowCreateModal(false);
    setForm(createInitialForm());
    showAlert('Bill of Material added to the table', 'success');
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Bill of Material</h5>
            <span className="text-muted f-12">Define the materials and quantities required for each finished product.</span>
          </Stack>
        }
        secondary={
          <Button variant="primary" onClick={handleOpenCreateModal}>
            <i className="ti ti-plus me-1" />
            Create
          </Button>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th style={{ width: 70 }}>#</th>
              <th style={{ minWidth: 150 }}>Product No</th>
              <th style={{ minWidth: 240 }}>Product Name</th>
              <th className="text-end" style={{ minWidth: 110 }}>Quantity</th>
              <th style={{ minWidth: 100 }}>UOM</th>
              <th style={{ minWidth: 220 }}>Warehouse</th>
              <th style={{ minWidth: 220 }}>Distribution Rule</th>
              <th style={{ minWidth: 180 }}>Alternate</th>
              <th className="text-center" style={{ minWidth: 110 }}>Components</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">{item.productNo}</td>
                  <td>{item.productName || '-'}</td>
                  <td className="text-end">{item.quantity}</td>
                  <td>{item.uom}</td>
                  <td>{item.warehouse}</td>
                  <td>{item.distributionRule}</td>
                  <td>{item.alternate || '-'}</td>
                  <td className="text-center">{item.details.length}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>
                  <div className="text-center py-5">
                    <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
                      <i className="ti ti-list-tree f-24" />
                    </span>
                    <h5 className="mb-1">No Bill of Material data yet</h5>
                    <p className="text-muted mb-3">Create a Bill of Material to display it in this table.</p>
                    <Button variant="primary" onClick={handleOpenCreateModal}>
                      <i className="ti ti-plus me-1" />
                      Create Bill of Material
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>

      <Modal
        show={showCreateModal}
        onHide={() => {
          if (!loadingOptions) setShowCreateModal(false);
        }}
        size="xl"
        centered
        scrollable
        fullscreen
      >
        <Modal.Header closeButton={!loadingOptions}>
          <Modal.Title>Create Bill of Material</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Product No <span className="text-danger">*</span></Form.Label>
                <Select
                  value={form.product}
                  options={productOptions}
                  onChange={handleProductChange}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder="Search product"
                  isSearchable
                  isClearable
                  isLoading={loadingOptions}
                  isDisabled={loadingOptions}
                  noOptionsMessage={() => 'Product not found'}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Product Name</Form.Label>
                <Form.Control value={form.product?.productName || ''} placeholder="Automatically filled" readOnly />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                  placeholder="Enter quantity"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>UOM Name <span className="text-danger">*</span></Form.Label>
                <Select
                  value={form.uom}
                  options={uomOptions}
                  onChange={(uom) => setForm((current) => ({ ...current, uom }))}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder={form.product ? 'Select UOM' : 'Select product first'}
                  isDisabled={!form.product || loadingOptions}
                  noOptionsMessage={() => 'UOM not found for this product'}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Warehouse <span className="text-danger">*</span></Form.Label>
                <Select
                  value={form.warehouse}
                  options={warehouseOptions}
                  onChange={(warehouse) => setForm((current) => ({ ...current, warehouse }))}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder="Select warehouse"
                  isSearchable
                  isClearable
                  isLoading={loadingOptions}
                  isDisabled={loadingOptions}
                  noOptionsMessage={() => 'Warehouse not found'}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Distribution Rule <span className="text-danger">*</span></Form.Label>
                <Select
                  value={form.distributionRule}
                  options={distributionRuleOptions}
                  onChange={(distributionRule) => setForm((current) => ({ ...current, distributionRule }))}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder="Select distribution rule"
                  isSearchable
                  isClearable
                  isLoading={loadingOptions}
                  isDisabled={loadingOptions}
                  noOptionsMessage={() => 'Distribution rule not found'}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Alternate</Form.Label>
                <Form.Control
                  type="text"
                  value={form.alternate}
                  onChange={(event) => setForm((current) => ({ ...current, alternate: event.target.value }))}
                  placeholder="Enter alternate"
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Stack direction="horizontal" gap={2} className="justify-content-between align-items-start mb-2">
                <div>
                  <Form.Label className="mb-0">Components <span className="text-danger">*</span></Form.Label>
                  <div className="text-muted f-12">Add the item or resource components required for this product.</div>
                </div>
                <Button type="button" size="sm" variant="outline-primary" onClick={addDetailRow} disabled={loadingOptions}>
                  <i className="ti ti-plus me-1" />
                  Add Row
                </Button>
              </Stack>
              <div className="border rounded overflow-hidden">
                <Table className="mb-0 align-middle" responsive>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 130 }}>Type</th>
                      <th style={{ minWidth: 260 }}>Item Code</th>
                      <th style={{ minWidth: 220 }}>Item Name</th>
                      <th style={{ minWidth: 100 }}>UOM</th>
                      <th style={{ minWidth: 120 }}>Qty</th>
                      <th style={{ minWidth: 150 }}>Issue Method</th>
                      <th className="text-center" style={{ width: 60 }}>#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.details.length ? (
                      form.details.map((detail) => {
                        const isResource = String(detail.type) === COMPONENT_TYPE_RESOURCE;
                        const sourceItems = isResource ? resourceItems : materialItems;
                        const componentOptions = detail.type
                          ? sourceItems.map((item) => normalizeComponentOption(item, detail.type))
                          : [];

                        return (
                          <tr key={detail.id}>
                            <td>
                              <Form.Select
                                value={detail.type}
                                onChange={(event) => handleDetailTypeChange(detail.id, event.target.value)}
                              >
                                <option value="">Select Type</option>
                                <option value={COMPONENT_TYPE_ITEM}>Item</option>
                                <option value={COMPONENT_TYPE_RESOURCE}>Resource</option>
                              </Form.Select>
                            </td>
                            <td>
                              <Select
                                value={detail.item}
                                options={componentOptions}
                                onChange={(item) => updateDetailRow(detail.id, { item })}
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                placeholder={detail.type ? 'Search item code' : 'Select type first'}
                                isSearchable
                                isClearable
                                isLoading={detail.type ? (isResource ? loadingResources : loadingMaterials) : false}
                                isDisabled={!detail.type || loadingOptions || loadingMaterials || loadingResources}
                                noOptionsMessage={() => 'Data not found'}
                              />
                            </td>
                            <td>
                              <Form.Control value={detail.item?.name || ''} placeholder="Automatically filled" readOnly />
                            </td>
                            <td>
                              <Form.Control value={detail.item?.uom || ''} placeholder="-" readOnly />
                            </td>
                            <td>
                              <Form.Control
                                type="text"
                                value={detail.quantity}
                                onChange={(event) => updateDetailRow(detail.id, { quantity: event.target.value })}
                                placeholder="Qty"
                              />
                            </td>
                            <td>
                              <Form.Select
                                value={detail.issueMethod}
                                onChange={(event) => updateDetailRow(detail.id, { issueMethod: event.target.value })}
                              >
                                <option value="">Select Method</option>
                                <option value="M">Manual</option>
                                <option value="B">Backflush</option>
                              </Form.Select>
                            </td>
                            <td className="text-center">
                              <Button
                                type="button"
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeDetailRow(detail.id)}
                                aria-label="Remove component row"
                              >
                                <i className="ti ti-trash" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          No component rows. Click Add Row to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowCreateModal(false)} disabled={loadingOptions}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loadingOptions}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
