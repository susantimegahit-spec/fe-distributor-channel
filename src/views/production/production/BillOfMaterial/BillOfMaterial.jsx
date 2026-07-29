import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import LoaderData from 'components/LoaderData';
import { getItem } from '../../../../redux/production/materialReducer';
import { getResource } from '../../../../redux/production/resourceReducer';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import ProductServices from '../../../../services/customer-portal/ProductServices';
import WarehouseServices from '../../../../services/customer-portal/WarehouseServices';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';
import { useConfirm } from '../../../../utils/confirmContext';

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
  businessUnit: null,
  department: null,
  comments: '',
  details: [createDetailRow()]
});

const selectStyles = {
  menu: (base) => ({ ...base, zIndex: 1060 }),
  menuPortal: (base) => ({ ...base, zIndex: 1070 })
};

const actionPopperConfig = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
    { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-end'] } }
  ]
};

const COMPONENT_TYPE_ITEM = '4';
const COMPONENT_TYPE_RESOURCE = '290';
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });

const getResponseList = (response) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;

  return [];
};

const getResponseItem = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload)) return payload[0] ?? {};
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload?.item && !Array.isArray(payload.item)) return payload.item;
  if (payload?.bom && !Array.isArray(payload.bom)) return payload.bom;

  return payload;
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

const normalizeBom = (item = {}, index = 0) => ({
  id: item.id || item.bom_id || item.code || index,
  productNo: item.code || item.product_code || item.item_code || item.product?.item_code || item.product?.code || '',
  productName:
    item.product_name || item.item_name || item.name || item.product?.item_name || item.product?.product_name || item.product?.name || '',
  quantity: item.qty ?? item.quantity ?? 0,
  uom: item.uom || item.unit || item.invntry_uom || '',
  warehouse: item.to_whs_name || item.warehouse_name || item.to_whs || '',
  distributionRule: item.distribution_rule_name || item.distribution_rule || item.ocr_code || '',
  alternate: item.alternate || '',
  comments: item.comments || '',
  details: Array.isArray(item.details)
    ? item.details
    : Array.isArray(item.bom_details)
      ? item.bom_details
      : Array.isArray(item.lines)
        ? item.lines
        : []
});

export default function BillOfMaterial() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const dispatch = useDispatch();
  const { items: materialItems, loading: loadingMaterials } = useSelector((state) => state.productionMaterial);
  const { items: resourceItems, loading: loadingResources } = useSelector((state) => state.productionResource);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedBom, setSelectedBom] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [distributionRuleOptions, setDistributionRuleOptions] = useState([]);
  const [businessUnitOptions, setBusinessUnitOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [form, setForm] = useState(createInitialForm);

  const uomOptions = useMemo(() => form.product?.uoms || [], [form.product]);

  const fetchBoms = useCallback(async (keyword = '') => {
    setLoading(true);

    try {
      const response = await ProductionServices.getBoms({ code: '', search: keyword });

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Bill of Material data');
      }

      setRows(getResponseList(response).map(normalizeBom));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material data', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    const delayTimer = window.setTimeout(() => fetchBoms(search.trim()), search ? 500 : 0);
    return () => window.clearTimeout(delayTimer);
  }, [fetchBoms, search]);

  const fetchFormOptions = async () => {
    setLoadingOptions(true);

    try {
      const [productResponse, warehouseResponse, distributionRuleResponse, businessUnitResponse, departmentResponse] = await Promise.all([
        ProductServices.getAllProduct(''),
        WarehouseServices.getAllWarehouse(''),
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);

      if (
        [productResponse, warehouseResponse, distributionRuleResponse, businessUnitResponse, departmentResponse].some(
          (response) => response?.data?.success === false
        )
      ) {
        throw new Error('Failed to fetch Bill of Material form options');
      }

      const nextProductOptions = getResponseList(productResponse).map((item) => {
        const code = item.item_code || item.product_code || item.code || '';
        const name = item.item_name || item.product_name || item.name || '';

        return {
          value: code,
          label: [code, name].filter(Boolean).join(' - ') || '-',
          productName: name,
          uoms: getProductUoms(item)
        };
      });
      const nextWarehouseOptions = getResponseList(warehouseResponse).map((item) => {
        const code = item.whs_code || item.warehouse_code || item.code || '';
        const name = item.whs_name || item.warehouse_name || item.name || '';

        return {
          value: code,
          label: [code, name].filter(Boolean).join(' - ') || '-',
          name
        };
      });
      const nextDistributionRuleOptions = getResponseList(distributionRuleResponse).map((item) => {
        const code = item.ocr_code || item.code || '';
        const name = item.ocr_name || item.name || '';

        return {
          value: code,
          label: [code, name].filter(Boolean).join(' - ') || '-'
        };
      });
      const nextBusinessUnitOptions = getResponseList(businessUnitResponse).map((item) => ({
        value: item.ocr_code || item.code || '',
        label: [item.ocr_code || item.code, item.ocr_name || item.name].filter(Boolean).join(' - ') || '-'
      }));
      const nextDepartmentOptions = getResponseList(departmentResponse).map((item) => ({
        value: item.ocr_code || item.code || '',
        label: [item.ocr_code || item.code, item.ocr_name || item.name].filter(Boolean).join(' - ') || '-'
      }));

      setProductOptions(nextProductOptions);
      setWarehouseOptions(nextWarehouseOptions);
      setDistributionRuleOptions(nextDistributionRuleOptions);
      setBusinessUnitOptions(nextBusinessUnitOptions);
      setDepartmentOptions(nextDepartmentOptions);

      return {
        products: nextProductOptions,
        warehouses: nextWarehouseOptions,
        distributionRules: nextDistributionRuleOptions,
        businessUnits: nextBusinessUnitOptions,
        departments: nextDepartmentOptions
      };
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material form options', 'danger');
      return null;
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsDuplicate(false);
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

  const handleSubmit = async () => {
    if (!form.product || !(Number(form.quantity) > 0) || !form.uom || !form.warehouse || !form.distributionRule) {
      showAlert('Please complete all required Bill of Material fields', 'warning');
      return;
    }

    const hasInvalidDetail =
      !form.details.length ||
      form.details.some((detail) => !detail.type || !detail.item || !(Number(detail.quantity) > 0) || !detail.issueMethod);

    if (hasInvalidDetail) {
      showAlert('Please complete all Bill of Material component rows', 'warning');
      return;
    }

    const payload = {
      code: form.product.value,
      qty: Number(form.quantity),
      to_whs: form.warehouse.value,
      ocr_code: form.distributionRule.value,
      ocr_code2: form.businessUnit?.value || '',
      ocr_code3: form.department?.value || '',
      comments: form.comments.trim(),
      details: form.details.map((detail) => ({
        type: Number(detail.type),
        code: detail.item.value,
        qty: Number(detail.quantity),
        issue_method: detail.issueMethod,
        ocr_code: form.distributionRule.value,
        ocr_code2: form.businessUnit?.value || '',
        ocr_code3: form.department?.value || ''
      }))
    };

    setSaving(true);
    try {
      const response = await ProductionServices.postBoms(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to create Bill of Material');

      setShowCreateModal(false);
      setIsDuplicate(false);
      setForm(createInitialForm());
      await fetchBoms(search.trim());
      showAlert(response?.data?.message || 'Bill of Material created successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create Bill of Material', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    showConfirm({
      title: 'Delete Bill of Material',
      subTitle: `Are you sure you want to delete BOM ${item.productNo || ''}?`,
      onConfirm: async () => {
        try {
          const response = await ProductionServices.deleteBoms(item.id);
          if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to delete Bill of Material');
          await fetchBoms(search.trim());
          showAlert(response?.data?.message || 'Bill of Material deleted successfully', 'success');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Failed to delete Bill of Material', 'danger');
          throw error;
        }
      }
    });
  };

  const handleOpenDetail = async (item) => {
    setSelectedBom(item);
    setShowDetailModal(true);
    setLoadingDetail(true);

    try {
      const response = await ProductionServices.getBomsById(item.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Bill of Material detail');
      }

      setSelectedBom(normalizeBom(getResponseItem(response)));
    } catch (error) {
      setShowDetailModal(false);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material detail', 'danger');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDuplicate = async (item) => {
    setDuplicatingId(item.id);
    setIsDuplicate(true);
    setForm(createInitialForm());
    setShowCreateModal(true);

    try {
      const [response, options] = await Promise.all([ProductionServices.getBomsById(item.id), fetchFormOptions()]);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Bill of Material detail');
      }
      if (!options) throw new Error('Failed to fetch Bill of Material form options');

      const source = normalizeBom(getResponseItem(response));
      const rawSource = getResponseItem(response);
      const product = options.products.find((option) => String(option.value) === String(source.productNo)) || null;
      const warehouseCode =
        rawSource.to_whs ?? rawSource.whs_code ?? rawSource.warehouse_code ?? rawSource.warehouse?.code ?? '';
      const ocrCode = rawSource.ocr_code ?? rawSource.distribution_rule ?? '';
      const ocrCode2 = rawSource.ocr_code2 ?? rawSource.business_unit_code ?? '';
      const ocrCode3 = rawSource.ocr_code3 ?? rawSource.department_code ?? '';
      const componentTypes = [...new Set(source.details.map((detail) => String(detail.type ?? detail.component_type ?? '')))];

      await Promise.all([
        componentTypes.includes(COMPONENT_TYPE_ITEM) ? dispatch(getItem('')) : Promise.resolve(),
        componentTypes.includes(COMPONENT_TYPE_RESOURCE) ? dispatch(getResource('')) : Promise.resolve()
      ]);

      setForm({
        product,
        quantity: source.quantity === '' || source.quantity == null ? '' : Number(source.quantity),
        uom:
          product?.uoms.find((option) => String(option.value) === String(source.uom)) ||
          (source.uom ? { value: source.uom, label: source.uom } : null),
        warehouse: options.warehouses.find((option) => String(option.value) === String(warehouseCode)) || null,
        distributionRule:
          options.distributionRules.find((option) => String(option.value) === String(ocrCode)) || null,
        businessUnit: options.businessUnits.find((option) => String(option.value) === String(ocrCode2)) || null,
        department: options.departments.find((option) => String(option.value) === String(ocrCode3)) || null,
        comments: source.comments || '',
        details: source.details.length
          ? source.details.map((detail) => {
              const type = String(detail.type ?? detail.component_type ?? '');
              const itemData = detail.item ?? {};
              const code =
                (typeof itemData === 'object'
                  ? itemData.code ?? itemData.item_code ?? itemData.material_code ?? itemData.resource_code ?? itemData.res_code
                  : null) ??
                detail.code ??
                detail.item_code ??
                detail.material_code ??
                detail.resource_code ??
                detail.res_code ??
                '';
              const name =
                (typeof itemData === 'object'
                  ? itemData.name ??
                    itemData.item_name ??
                    itemData.material_name ??
                    itemData.resource_name ??
                    itemData.res_name
                  : itemData) ||
                detail.name ||
                detail.item_name ||
                detail.material_name ||
                detail.resource_name ||
                detail.res_name ||
                '';
              const uom = detail.uom ?? detail.unit ?? detail.unit_of_msr ?? detail.invntry_uom ?? '';

              return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                type,
                item: code ? { value: code, label: [code, name].filter(Boolean).join(' - '), name, uom } : null,
                quantity:
                  detail.qty == null && detail.quantity == null ? '' : Number(detail.qty ?? detail.quantity),
                issueMethod: detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? ''
              };
            })
          : [createDetailRow()]
      });
    } catch (error) {
      setShowCreateModal(false);
      setIsDuplicate(false);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to duplicate Bill of Material', 'danger');
    } finally {
      setDuplicatingId(null);
    }
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
        <Row className="g-2 mb-3">
          <Col lg={6} md={8}>
            <InputGroup>
              <InputGroup.Text><i className="ti ti-search" /></InputGroup.Text>
              <Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search BOM code or product" />
              {search && <Button variant="outline-secondary" onClick={() => setSearch('')}><i className="ti ti-x" /></Button>}
            </InputGroup>
          </Col>
        </Row>
        <Table className="mb-0 align-middle f-12" style={{ tableLayout: 'fixed', width: '100%', wordBreak: 'break-word' }} hover>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '29%' }}>Product</th>
              <th className="text-end" style={{ width: '10%' }}>Quantity</th>
              <th style={{ width: '7%' }}>UOM</th>
              <th style={{ width: '24%' }}>Warehouse</th>
              <th style={{ width: '12%' }}>Alternate</th>
              <th className="text-center" style={{ width: '13%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><LoaderData /></td></tr>
            ) : rows.length ? (
              rows.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="fw-semibold">{item.productNo || '-'}</div>
                    <div className="text-muted">{item.productName || '-'}</div>
                  </td>
                  <td className="text-end">{numberFormatter.format(Number(item.quantity) || 0)}</td>
                  <td>{item.uom}</td>
                  <td>{item.warehouse}</td>
                  <td>{item.alternate || '-'}</td>
                  <td className="text-center">
                    <Button
                      size="sm"
                      variant={String(actionMenu?.item?.id) === String(item.id) ? 'primary' : 'outline-primary'}
                      aria-label={`Open actions for Bill of Material ${item.productNo || ''}`}
                      aria-expanded={String(actionMenu?.item?.id) === String(item.id)}
                      onClick={(event) =>
                        setActionMenu((current) =>
                          String(current?.item?.id) === String(item.id) ? null : { item, target: event.currentTarget }
                        )
                      }
                    >
                      <i className="ti ti-dots-vertical me-1" />
                      Actions
                      <i className="ti ti-chevron-down ms-1" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
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

      <Overlay
        show={Boolean(actionMenu)}
        target={actionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        popperConfig={actionPopperConfig}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const item = actionMenu?.item;

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 190 }}
            >
              <button
                type="button"
                className="dropdown-item"
                disabled={loadingDetail}
                onClick={() => {
                  setActionMenu(null);
                  if (item) handleOpenDetail(item);
                }}
              >
                <i className="ti ti-eye text-primary me-2" />
                Detail
              </button>
              <button
                type="button"
                className="dropdown-item"
                disabled={duplicatingId !== null}
                onClick={() => {
                  setActionMenu(null);
                  if (item) handleDuplicate(item);
                }}
              >
                <i
                  className={
                    duplicatingId === item?.id
                      ? 'ti ti-loader-2 text-info me-2'
                      : 'ti ti-copy text-info me-2'
                  }
                />
                Duplicate
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={() => {
                  setActionMenu(null);
                  if (item) handleDelete(item);
                }}
              >
                <i className="ti ti-trash me-2" />
                Delete
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal
        show={showDetailModal}
        onHide={() => {
          if (!loadingDetail) {
            setShowDetailModal(false);
            setSelectedBom(null);
          }
        }}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingDetail}>
          <Modal.Title>Bill of Material Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetail ? (
            <LoaderData />
          ) : selectedBom ? (
            <Stack gap={4}>
              <Row className="g-3">
                <Col md={6} lg={4}>
                  <div className="text-muted f-12 mb-1">Product No</div>
                  <div className="fw-semibold">{selectedBom.productNo || '-'}</div>
                </Col>
                <Col md={6} lg={4}>
                  <div className="text-muted f-12 mb-1">Product Name</div>
                  <div className="fw-semibold">{selectedBom.productName || '-'}</div>
                </Col>
                <Col md={6} lg={4}>
                  <div className="text-muted f-12 mb-1">Quantity</div>
                  <div className="fw-semibold">
                    {numberFormatter.format(Number(selectedBom.quantity) || 0)} {selectedBom.uom || ''}
                  </div>
                </Col>
                <Col md={6} lg={4}>
                  <div className="text-muted f-12 mb-1">Warehouse</div>
                  <div className="fw-semibold">{selectedBom.warehouse || '-'}</div>
                </Col>
                <Col md={6} lg={4}>
                  <div className="text-muted f-12 mb-1">Alternate</div>
                  <div className="fw-semibold">{selectedBom.alternate || '-'}</div>
                </Col>
                <Col xs={12}>
                  <div className="text-muted f-12 mb-1">Comments</div>
                  <div>{selectedBom.comments || '-'}</div>
                </Col>
              </Row>

              <div>
                <h6 className="mb-3">Components</h6>
                <Table className="mb-0 align-middle" responsive bordered>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th>Type</th>
                      <th>Item</th>
                      <th className="text-end">Quantity</th>
                      <th>UOM</th>
                      <th>Issue Method</th>
                      <th>Distribution Rule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBom.details.length ? (
                      selectedBom.details.map((detail, index) => {
                        const type = String(detail.type ?? detail.component_type ?? '');
                        const item = detail.item ?? {};
                        const code =
                          (typeof item === 'object'
                            ? item.code ?? item.item_code ?? item.material_code ?? item.resource_code ?? item.res_code
                            : null) ??
                          detail.code ??
                          detail.item_code ??
                          detail.material_code ??
                          detail.resource_code ??
                          detail.res_code ??
                          '';
                        const name =
                          (typeof item === 'object'
                            ? item.name ?? item.item_name ?? item.material_name ?? item.resource_name ?? item.res_name
                            : item) ||
                          detail.name ||
                          detail.item_name ||
                          detail.material_name ||
                          detail.resource_name ||
                          detail.res_name ||
                          '';
                        const quantity = detail.qty ?? detail.quantity ?? 0;
                        const uom = detail.uom ?? detail.unit ?? detail.unit_of_msr ?? detail.invntry_uom ?? '';
                        const issueMethod = detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '-';
                        const distributionRule =
                          detail.distribution_rule_name ??
                          detail.distribution_rule ??
                          detail.ocr_name ??
                          detail.ocr_code ??
                          '-';

                        return (
                          <tr key={detail.id ?? detail.detail_id ?? `${code}-${index}`}>
                            <td>{index + 1}</td>
                            <td>
                              {type === COMPONENT_TYPE_ITEM
                                ? 'Item'
                                : type === COMPONENT_TYPE_RESOURCE
                                  ? 'Resource'
                                  : type || '-'}
                            </td>
                            <td>
                              <div className="fw-semibold">{code || '-'}</div>
                              <div className="text-muted">{name || '-'}</div>
                            </td>
                            <td className="text-end">{numberFormatter.format(Number(quantity) || 0)}</td>
                            <td>{uom || '-'}</td>
                            <td>{issueMethod}</td>
                            <td>{distributionRule}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                          No component data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Stack>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)} disabled={loadingDetail}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showCreateModal}
        onHide={() => {
          if (!loadingOptions && !saving && duplicatingId === null) setShowCreateModal(false);
        }}
        size="xl"
        centered
        scrollable
        fullscreen
      >
        <Modal.Header closeButton={!loadingOptions && duplicatingId === null}>
          <Modal.Title>{isDuplicate ? 'Duplicate Bill of Material' : 'Create Bill of Material'}</Modal.Title>
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
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quantity: event.target.value === '' ? '' : Number(event.target.value)
                    }))
                  }
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
                <Form.Label>Business Unit</Form.Label>
                <Select
                  value={form.businessUnit}
                  options={businessUnitOptions}
                  onChange={(businessUnit) => setForm((current) => ({ ...current, businessUnit }))}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder="Select business unit"
                  isSearchable
                  isClearable
                  isLoading={loadingOptions}
                  isDisabled={loadingOptions}
                  noOptionsMessage={() => 'Business unit not found'}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Department</Form.Label>
                <Select
                  value={form.department}
                  options={departmentOptions}
                  onChange={(department) => setForm((current) => ({ ...current, department }))}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder="Select department"
                  isSearchable
                  isClearable
                  isLoading={loadingOptions}
                  isDisabled={loadingOptions}
                  noOptionsMessage={() => 'Department not found'}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Comments</Form.Label>
                <Form.Control
                  type="text"
                  value={form.comments}
                  onChange={(event) => setForm((current) => ({ ...current, comments: event.target.value }))}
                  placeholder="Enter comments"
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
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                value={detail.quantity}
                                onChange={(event) =>
                                  updateDetailRow(detail.id, {
                                    quantity: event.target.value === '' ? '' : Number(event.target.value)
                                  })
                                }
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
          <Button
            variant="light-secondary"
            onClick={() => setShowCreateModal(false)}
            disabled={loadingOptions || saving || duplicatingId !== null}
          >
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loadingOptions || saving || duplicatingId !== null}>
            {saving ? 'Saving...' : isDuplicate ? 'Save as New' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
