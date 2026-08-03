import { useCallback, useEffect, useMemo, useState } from 'react';

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

// project-imports
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies } from '../../../../utils/cookies';

const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });
const pageSize = 10;
const today = new Date().toLocaleDateString('en-CA');
const formatSeriesDate = (value) => String(value || '').replace(/-/g, '');
const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('id-ID');
};

const createInitialForm = () => ({
  type: 'Special',
  status: 'PLANNED',
  product: null,
  plannedQuantity: '',
  series: '',
  orderDate: today,
  startDate: today,
  dueDate: today,
  shift: 'All'
});

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.boms)) return payload.boms;
  if (Array.isArray(payload?.series)) return payload.series;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.production_orders)) return payload.production_orders;

  return [];
};

const getResponseItem = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload)) return payload[0] ?? {};
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload?.item && !Array.isArray(payload.item)) return payload.item;
  if (payload?.bom && !Array.isArray(payload.bom)) return payload.bom;
  if (payload?.order && !Array.isArray(payload.order)) return payload.order;
  if (payload?.production_order && !Array.isArray(payload.production_order)) return payload.production_order;

  return payload;
};

const normalizeBom = (item = {}, index = 0) => ({
  ...item,
  id: item.id || item.bom_id || item.code || index,
  productCode: item.code || item.product_code || item.item_code || item.product?.item_code || item.product?.code || '',
  productName:
    item.product_name || item.item_name || item.name || item.product?.item_name || item.product?.product_name || item.product?.name || '',
  quantity: item.qty ?? item.quantity ?? 0,
  uom:
    item.parent_item?.sal_unit_msr ||
    item.parent_name?.sal_unit_msr ||
    item.product?.uom_name ||
    item.product?.uom ||
    item.product?.unit ||
    item.product?.invntry_uom ||
    item.uom_name ||
    item.uom ||
    item.unit ||
    item.invntry_uom ||
    '',
  alternate: item.alternate || '',
  details: Array.isArray(item.details)
    ? item.details
    : Array.isArray(item.bom_details)
      ? item.bom_details
      : Array.isArray(item.lines)
        ? item.lines
        : []
});

const getComponentItem = (detail = {}) => {
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

  return { code, name };
};

const normalizeProductionOrder = (item = {}, index = 0) => ({
  ...item,
  id: item.id || item.production_order_id || item.prod_order_no || item.doc_entry || item.doc_num || index,
  number: item.prod_order_no || item.production_order_no || item.doc_num || item.DocNum || item.number || '',
  itemCode: item.item_code || item.product_code || item.code || item.product?.item_code || item.product?.code || '',
  itemName:
    item.item_name || item.product_name || item.name || item.product?.item_name || item.product?.product_name || item.product?.name || '',
  plannedQuantity: item.planned_qty ?? item.planned_quantity ?? item.quantity ?? item.qty ?? 0,
  completedQuantity: item.completed_qty ?? item.completed_quantity ?? item.cmplt_qty ?? 0,
  warehouse:
    (typeof item.warehouse === 'string' ? item.warehouse : item.warehouse?.code || item.warehouse?.whs_code) ||
    item.whs_code ||
    item.warehouse_code ||
    '',
  status: item.status || item.order_status || '',
  orderDate: item.post_date || item.order_date || item.posting_date || item.created_at || '',
  dueDate: item.due_date || item.end_date || '',
  startDate: item.start_date || '',
  type: item.type || item.order_type || '',
  series: item.series || item.series_code || '',
  shift: item.u_shift || item.shift || '',
  priority: item.priority ?? '',
  comments: item.comments || item.remarks || '',
  details: Array.isArray(item.details)
    ? item.details
    : Array.isArray(item.order_details)
      ? item.order_details
      : Array.isArray(item.lines)
        ? item.lines
        : []
});

const getStatus = (value) => {
  const status = String(value || '').trim();
  const normalized = status.toLowerCase();
  const variant =
    {
      planned: 'secondary',
      released: 'primary',
      closed: 'success',
      cancelled: 'danger',
      canceled: 'danger'
    }[normalized] || 'info';

  return status ? { label: status, variant } : null;
};

export default function ProductionOrder() {
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBomModal, setShowBomModal] = useState(false);
  const [loadingBoms, setLoadingBoms] = useState(false);
  const [loadingBomDetail, setLoadingBomDetail] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [boms, setBoms] = useState([]);
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [form, setForm] = useState(createInitialForm);

  const fetchProductionOrders = useCallback(async () => {
    setLoadingOrders(true);

    try {
      const response = await ProductionServices.getProductionOrder();
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');

      setOrders(getResponseList(response).map(normalizeProductionOrder));
    } catch (error) {
      setOrders([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
    } finally {
      setLoadingOrders(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProductionOrders();
  }, [fetchProductionOrders]);

  const filteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) =>
      [order.number, order.itemCode, order.itemName, order.warehouse, order.status].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [orderSearch, orders]);

  const pageCount = Math.max(Math.ceil(filteredOrders.length / pageSize), 1);
  const paginatedOrders = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredOrders, pageCount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orderSearch]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setLoadingOrderDetail(true);

    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      }

      setSelectedOrder(normalizeProductionOrder(getResponseItem(response)));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const fetchBoms = async (keyword = '') => {
    setLoadingBoms(true);

    try {
      const response = await ProductionServices.getBoms({ code: '', search: keyword });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Bill of Material data');

      setBoms(getResponseList(response).map(normalizeBom));
    } catch (error) {
      setBoms([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material data', 'danger');
    } finally {
      setLoadingBoms(false);
    }
  };

  const fetchSeries = async (date) => {
    const formattedDate = formatSeriesDate(date);
    if (!formattedDate) {
      setSeriesOptions([]);
      return;
    }

    setLoadingSeries(true);

    try {
      const response = await ProductionServices.getSeries(formattedDate);
      if (!response?.data?.success) throw new Error(response?.data?.message || 'Failed to fetch series data');

      const seriesData = response.data.data || response.data.series || [];
      setSeriesOptions(
        (Array.isArray(seriesData) ? seriesData : [seriesData])
          .map((item) => {
            const value =
              typeof item === 'object'
                ? item.series ?? item.Series ?? item.series_code ?? item.seriesCode ?? item.value ?? item.code ?? item.id
                : item;
            const name =
              typeof item === 'object'
                ? item.label ?? item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.description ?? value
                : item;

            return value == null ? null : { value, label: String(name || value), raw: item };
          })
          .filter(Boolean)
      );
    } catch (error) {
      setSeriesOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch series data', 'danger');
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleOpenCreate = () => {
    setForm(createInitialForm());
    setSearch('');
    setShowCreateModal(true);
    fetchSeries(today);
  };

  const handleOpenBomSelection = () => {
    setSearch('');
    setShowBomModal(true);
    fetchBoms('');
  };

  const handleSearchBoms = (event) => {
    event.preventDefault();
    fetchBoms(search.trim());
  };

  const handleSelectBom = async (bom) => {
    setLoadingBomDetail(true);

    try {
      const response = await ProductionServices.getBomsById(bom.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Bill of Material detail');

      const bomDetail = getResponseItem(response);
      setForm((current) => ({
        ...current,
        product: normalizeBom(bomDetail),
        plannedQuantity: Number(bomDetail?.qty ?? bomDetail?.quantity) || ''
      }));
      setShowBomModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Bill of Material detail', 'danger');
    } finally {
      setLoadingBomDetail(false);
    }
  };

  const handleSave = async () => {
    const plannedQuantity = Number(form.plannedQuantity);
    const warehouse =
      form.product?.to_whs ??
      form.product?.whs_code ??
      form.product?.warehouse_code ??
      form.product?.warehouse?.code ??
      '';

    if (
      !form.product ||
      !(plannedQuantity > 0) ||
      !form.series ||
      !form.orderDate ||
      !form.startDate ||
      !form.dueDate ||
      !warehouse
    ) {
      showAlert('Please complete product, planned quantity, series, dates, and warehouse data', 'warning');
      return;
    }

    const series = Number(form.series);
    const formatPayloadDate = (date) => `${date}T00:00:00`;
    const payload = {
      ItemCode: form.product.productCode,
      Series: Number.isFinite(series) ? series : form.series,
      PlannedQty: plannedQuantity,
      PostingDate: formatPayloadDate(form.orderDate),
      DueDate: formatPayloadDate(form.dueDate),
      WhsCode: warehouse,
      Remarks: form.product.comments ?? form.product.remarks ?? '',
      Shift: form.shift,
      Unit: form.product.ocr_code2 ?? form.product.business_unit_code ?? form.product.unit ?? '',
      Bomid: String(form.product.bom_id ?? form.product.bomId ?? form.product.id ?? ''),
      UserId: String(getCookies('id') ?? ''),
      AddonId: String(
        form.product.addon_id ??
          form.product.addonId ??
          form.product.add_on_id ??
          form.product.addon?.id ??
          getCookies('addonId') ??
          ''
      ),
      Lines: form.product.details.map((detail) => {
        const item = getComponentItem(detail);
        const baseQuantity = Number(detail.qty ?? detail.quantity) || 0;
        const detailType = String(detail.type ?? detail.component_type ?? '').toUpperCase();

        return {
          ItemType: ['4', 'ITEM', 'I'].includes(detailType)
            ? 'I'
            : ['290', 'RESOURCE', 'R'].includes(detailType)
              ? 'R'
              : detailType,
          ItemCode: item.code,
          BaseQty: baseQuantity,
          WhsCode:
            detail.whs_code ??
            detail.warehouse_code ??
            detail.to_whs ??
            detail.warehouse?.code ??
            detail.warehouse?.whs_code ??
            warehouse,
          IssueMethod: detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '',
          OcrCode: detail.ocr_code ?? form.product.ocr_code ?? '',
          OcrCode2: detail.ocr_code2 ?? form.product.ocr_code2 ?? '',
          OcrCode3: detail.ocr_code3 ?? form.product.ocr_code3 ?? ''
        };
      })
    };

    setSaving(true);
    try {
      const response = await ProductionServices.postProductionOrder(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to create Production Order');
      }

      setShowCreateModal(false);
      setForm(createInitialForm());
      showAlert(response?.data?.message || 'Production Order created successfully', 'success');
      await fetchProductionOrders();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create Production Order', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Production Order</h5>
            <span className="text-muted f-12">Plan, release, and monitor production work orders.</span>
          </Stack>
        }
        secondary={
          <Button variant="success" onClick={handleOpenCreate}>
            <i className="ti ti-plus me-1" />
            Create Production Order
          </Button>
        }
      >
        <Row className="g-2 align-items-end mb-3">
          <Col lg={7} md={7}>
            <Form.Label className="f-12 text-muted">Search Production Order</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <i className="ti ti-search" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Order number, product, warehouse, or status"
              />
            </InputGroup>
          </Col>
          <Col lg={5} className="text-lg-end">
            <span className="text-muted f-12">Total Production Order</span>
            <div className="fw-semibold">{filteredOrders.length}</div>
          </Col>
        </Row>

        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th style={{ width: 70 }}>#</th>
              <th>Order No.</th>
              <th>Product</th>
              <th className="text-end">Planned Qty</th>
              <th className="text-end">Completed Qty</th>
              <th>Warehouse</th>
              <th>Order Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th className="text-center" style={{ width: 90 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? (
              <tr>
                <td colSpan={10}>
                  <LoaderData />
                </td>
              </tr>
            ) : paginatedOrders.length ? (
              paginatedOrders.map((order, index) => {
                const status = getStatus(order.status);

                return (
                  <tr key={order.id}>
                    <td>{(Math.min(currentPage, pageCount) - 1) * pageSize + index + 1}</td>
                    <td className="fw-semibold">{order.number || '-'}</td>
                    <td>
                      <div className="fw-semibold">{order.itemCode || '-'}</div>
                      <div className="text-muted f-12">{order.itemName || '-'}</div>
                    </td>
                    <td className="text-end">{numberFormatter.format(Number(order.plannedQuantity) || 0)}</td>
                    <td className="text-end">{numberFormatter.format(Number(order.completedQuantity) || 0)}</td>
                    <td>{order.warehouse || '-'}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{formatDate(order.dueDate)}</td>
                    <td>{status ? <Badge bg={status.variant}>{status.label}</Badge> : '-'}</td>
                    <td className="text-center">
                      <Button
                        className="rounded-circle p-0"
                        variant="outline-primary"
                        size="sm"
                        title="Detail"
                        aria-label={`View Production Order ${order.number || ''} detail`}
                        style={{ width: 32, height: 32 }}
                        onClick={() => handleOpenDetail(order)}
                      >
                        <i className="ti ti-eye" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10}>
                  <div className="text-center py-5">
                    <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
                      <i className="ti ti-clipboard-text f-32" />
                    </span>
                    <h5 className="mb-2">{orderSearch ? 'Production order not found' : 'No production order data yet'}</h5>
                    <p className="text-muted mb-0">
                      {orderSearch
                        ? 'Try another order number, product, warehouse, or status.'
                        : 'Create a production order from an existing Bill of Material.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {!loadingOrders && filteredOrders.length > 0 ? (
          <TablePagination
            currentPage={Math.min(currentPage, pageCount)}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredOrders.length}
            itemLabel="production orders"
          />
        ) : null}
      </MainCard>

      <Modal
        show={showDetailModal}
        onHide={() => !loadingOrderDetail && setShowDetailModal(false)}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingOrderDetail}>
          <Modal.Title>Production Order Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrderDetail ? (
            <LoaderData />
          ) : selectedOrder ? (
            <>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <div className="text-muted f-12">Production Order No.</div>
                  <div className="fw-semibold">{selectedOrder.number || '-'}</div>
                </Col>
                <Col md={4}>
                  <div className="text-muted f-12">Product</div>
                  <div className="fw-semibold">{selectedOrder.itemCode || '-'}</div>
                  <div className="text-muted f-12">{selectedOrder.itemName || '-'}</div>
                </Col>
                <Col md={4}>
                  <div className="text-muted f-12">Status</div>
                  {getStatus(selectedOrder.status) ? (
                    <Badge bg={getStatus(selectedOrder.status).variant}>{getStatus(selectedOrder.status).label}</Badge>
                  ) : (
                    '-'
                  )}
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Type</div>
                  <div>{selectedOrder.type || '-'}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Series</div>
                  <div>{selectedOrder.series || '-'}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Warehouse</div>
                  <div>{selectedOrder.warehouse || '-'}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Shift</div>
                  <div>{selectedOrder.shift || '-'}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Order Date</div>
                  <div>{formatDate(selectedOrder.orderDate)}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Start Date</div>
                  <div>{formatDate(selectedOrder.startDate)}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Due Date</div>
                  <div>{formatDate(selectedOrder.dueDate)}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Priority</div>
                  <div>{selectedOrder.priority === '' ? '-' : selectedOrder.priority}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Planned Quantity</div>
                  <div>{numberFormatter.format(Number(selectedOrder.plannedQuantity) || 0)}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted f-12">Completed Quantity</div>
                  <div>{numberFormatter.format(Number(selectedOrder.completedQuantity) || 0)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Comments</div>
                  <div>{selectedOrder.comments || '-'}</div>
                </Col>
              </Row>

              <h6 className="mb-3">Production Order Components</h6>
              <Table className="mb-0 align-middle" responsive bordered hover>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Type</th>
                    <th>Item</th>
                    <th className="text-end">Base Qty</th>
                    <th className="text-end">Planned Qty</th>
                    <th>Warehouse</th>
                    <th>Issue Method</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.details.length ? (
                    selectedOrder.details.map((detail, index) => {
                      const item = getComponentItem(detail);
                      const detailType = String(detail.type ?? detail.component_type ?? '');

                      return (
                        <tr key={detail.id ?? detail.detail_id ?? `${item.code}-${index}`}>
                          <td>{index + 1}</td>
                          <td>{detailType === '4' ? 'Item' : detailType === '290' ? 'Resource' : detailType || '-'}</td>
                          <td>
                            <div className="fw-semibold">{item.code || '-'}</div>
                            <div className="text-muted f-12">{item.name || '-'}</div>
                          </td>
                          <td className="text-end">
                            {numberFormatter.format(Number(detail.base_qty ?? detail.qty ?? detail.quantity) || 0)}
                          </td>
                          <td className="text-end">
                            {numberFormatter.format(Number(detail.planned_qty ?? detail.planned_quantity) || 0)}
                          </td>
                          <td>
                            {detail.warehouse_code ??
                              detail.whs_code ??
                              detail.warehouse?.code ??
                              (typeof detail.warehouse === 'string' ? detail.warehouse : '') ??
                              '-'}
                          </td>
                          <td>{detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '-'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No Production Order component data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowDetailModal(false)} disabled={loadingOrderDetail}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCreateModal} onHide={() => !loadingBomDetail && !saving && setShowCreateModal(false)} fullscreen scrollable>
        <Modal.Header closeButton={!loadingBomDetail && !saving}>
          <Modal.Title>Create Production Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col lg={6}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Type</Form.Label>
                        <Form.Select
                          value={form.type}
                          onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                        >
                          <option value="Special">Special</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                          value={form.status}
                          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                        >
                          <option value="PLANNED">Planned</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Product</Form.Label>
                        <InputGroup>
                          <Form.Control
                            readOnly
                            value={
                              form.product
                                ? [form.product.productCode, form.product.productName].filter(Boolean).join(' - ')
                                : ''
                            }
                            placeholder="Select product from Bill of Material"
                            onClick={handleOpenBomSelection}
                          />
                          <Button variant="outline-primary" onClick={handleOpenBomSelection}>
                            <i className="ti ti-search me-1" />
                            Select BOM
                          </Button>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Planned Quantity</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="any"
                          value={form.plannedQuantity}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              plannedQuantity: event.target.value === '' ? '' : Number(event.target.value)
                            }))
                          }
                          placeholder="Enter quantity"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>UOM Name</Form.Label>
                        <Form.Control
                          value={
                            form.product?.parent_item?.sal_unit_msr ||
                            form.product?.parent_name?.sal_unit_msr ||
                            form.product?.parentName?.sal_unit_msr ||
                            form.product?.product?.sal_unit_msr ||
                            form.product?.product?.uom_name ||
                            form.product?.uom ||
                            ''
                          }
                          placeholder="Select product first"
                          readOnly
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Series</Form.Label>
                        <Form.Select
                          value={form.series}
                          onChange={(event) => setForm((current) => ({ ...current, series: event.target.value }))}
                          disabled={loadingSeries}
                        >
                          <option value="">{loadingSeries ? 'Loading series...' : 'Select series'}</option>
                          {seriesOptions.map((option) => (
                            <option value={option.value} key={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Shift</Form.Label>
                        <Form.Select
                          value={form.shift}
                          onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value }))}
                        >
                          <option value="All">All</option>
                          <option value="Shift 1">Shift 1</option>
                          <option value="Shift 2">Shift 2</option>
                          <option value="Shift 3">Shift 3</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Order Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={form.orderDate}
                          onChange={(event) => {
                            const orderDate = event.target.value;
                            setForm((current) => ({ ...current, orderDate, series: '' }));
                            fetchSeries(orderDate);
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={form.startDate}
                          onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Due Date</Form.Label>
                        <Form.Control
                          type="date"
                          min={form.startDate || undefined}
                          value={form.dueDate}
                          onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <h6 className="mb-3">Bill of Material Details</h6>
          <Table className="mb-0 align-middle" responsive bordered hover>
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Type</th>
                <th>Item</th>
                <th className="text-end">Base Qty</th>
                <th className="text-end">Planned Qty</th>
                <th>UOM</th>
                <th>Warehouse Code</th>
                <th>Issue Method</th>
              </tr>
            </thead>
            <tbody>
              {loadingBomDetail ? (
                <tr>
                  <td colSpan={8}>
                    <LoaderData />
                  </td>
                </tr>
              ) : form.product?.details?.length ? (
                form.product.details.map((detail, index) => {
                  const item = getComponentItem(detail);
                  const type = String(detail.type ?? detail.component_type ?? '');
                  const baseQuantity = Number(detail.qty ?? detail.quantity) || 0;
                  const plannedQuantity = baseQuantity * (Number(form.plannedQuantity) || 0);
                  const warehouseCode =
                    detail.whs_code ??
                    detail.warehouse_code ??
                    detail.to_whs ??
                    detail.warehouse?.code ??
                    detail.warehouse?.whs_code ??
                    '-';

                  return (
                    <tr key={detail.id ?? detail.detail_id ?? `${item.code}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{type === '4' ? 'Item' : type === '290' ? 'Resource' : type || '-'}</td>
                      <td>
                        <div className="fw-semibold">{item.code || '-'}</div>
                        <div className="text-muted f-12">{item.name || '-'}</div>
                      </td>
                      <td className="text-end">{numberFormatter.format(baseQuantity)}</td>
                      <td className="text-end">{numberFormatter.format(plannedQuantity)}</td>
                      <td>{detail.uom ?? detail.unit ?? detail.unit_of_msr ?? detail.invntry_uom ?? '-'}</td>
                      <td>{warehouseCode}</td>
                      <td>{detail.issue_mthd ?? detail.issue_method ?? detail.issueMethod ?? '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    Select a product from Bill of Material to display its details.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowCreateModal(false)} disabled={loadingBomDetail || saving}>
            Close
          </Button>
          <Button variant="success" onClick={handleSave} disabled={loadingBomDetail || loadingSeries || saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <i className="ti ti-device-floppy me-1" />
                Save
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showBomModal} onHide={() => !loadingBomDetail && setShowBomModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton={!loadingBomDetail}>
          <Modal.Title>Select Bill of Material</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSearchBoms} className="mb-3">
            <InputGroup>
              <Form.Control
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search BOM code or product"
              />
              <Button type="submit" variant="primary" disabled={loadingBoms}>
                <i className="ti ti-search" />
              </Button>
            </InputGroup>
          </Form>

          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th>Product</th>
                <th>UOM</th>
                <th>Alternate</th>
                <th className="text-center" style={{ width: 90 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingBoms ? (
                <tr>
                  <td colSpan={4}>
                    <LoaderData />
                  </td>
                </tr>
              ) : boms.length ? (
                boms.map((bom) => (
                  <tr key={bom.id}>
                    <td>
                      <div className="fw-semibold">{bom.productCode || '-'}</div>
                      <div className="text-muted f-12">{bom.productName || '-'}</div>
                    </td>
                    <td>{bom.uom || '-'}</td>
                    <td>{bom.alternate || '-'}</td>
                    <td className="text-center">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSelectBom(bom)}
                        disabled={loadingBomDetail}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No Bill of Material data found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
}
