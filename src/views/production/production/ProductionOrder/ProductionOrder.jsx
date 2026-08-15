import { useCallback, useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
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
import ProductionRelationMap from './ProductionRelationMap';

const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });
const pageSize = 10;
const actionPopperConfig = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
    { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-end'] } }
  ]
};
const today = new Date().toLocaleDateString('en-CA');
const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const createInitialOrderFilters = () => {
  const currentDate = new Date();
  const mondayOffset = currentDate.getDay() === 0 ? -6 : 1 - currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    from: formatInputDate(startOfWeek),
    to: formatInputDate(endOfWeek),
    whs_code: '',
    to_whs_code: ''
  };
};
const formatSeriesDate = (value) => String(value || '').replace(/-/g, '');
const formatDate = (value) => {
  if (!value) return '-';

  const compactDate = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compactDate ? new Date(Number(compactDate[1]), Number(compactDate[2]) - 1, Number(compactDate[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;

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

const getProductionOrderDetail = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const header = payload?.header ?? payload?.Header ?? payload;
  const items = payload?.items ?? payload?.Items ?? payload?.details ?? payload?.order_details ?? [];
  return {
    ...normalizeProductionOrder({ ...(header || {}), details: Array.isArray(items) ? items : [] }),
    headerData: header || {},
    itemsData: Array.isArray(items) ? items : []
  };
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatDetailLabel = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ');
const formatShift = (value) => ({ A: '1', B: '2', C: '3', X: 'All' })[String(value || '').toUpperCase()] || value || '-';

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
    (typeof item === 'object' ? (item.code ?? item.item_code ?? item.material_code ?? item.resource_code ?? item.res_code) : null) ??
    detail.code ??
    detail.item_code ??
    detail.material_code ??
    detail.resource_code ??
    detail.res_code ??
    '';
  const name =
    (typeof item === 'object' ? (item.name ?? item.item_name ?? item.material_name ?? item.resource_name ?? item.res_name) : item) ||
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
  id: item.id || item.production_order_id || item.prod_order_no || item.DocEntry || item.doc_entry || item.doc_num || index,
  number: item.prod_order_no || item.production_order_no || item.doc_num || item.DocNum || item.number || '',
  itemCode: item.ItemCode || item.item_code || item.product_code || item.code || item.product?.item_code || item.product?.code || '',
  itemName:
    item.ProdName ||
    item.ItemName ||
    item.item_name ||
    item.product_name ||
    item.name ||
    item.product?.item_name ||
    item.product?.product_name ||
    item.product?.name ||
    '',
  plannedQuantity: item.PlannedQty ?? item.PlannedQuantity ?? item.planned_qty ?? item.planned_quantity ?? item.quantity ?? item.qty ?? 0,
  completedQuantity: item.CmpltQty ?? item.CompletedQty ?? item.completed_qty ?? item.completed_quantity ?? item.cmplt_qty ?? 0,
  warehouse:
    (typeof item.warehouse === 'string' ? item.warehouse : item.warehouse?.code || item.warehouse?.whs_code) ||
    item.Warehouse ||
    item.WhsCode ||
    item.whs_code ||
    item.warehouse_code ||
    '',
  status: item.ProductionOrderStatus || item.Status || item.status || item.order_status || '',
  orderDate:
    item.PostingDate || item.PostDate || item.DocDate || item.post_date || item.order_date || item.posting_date || item.created_at || '',
  dueDate: item.DueDate || item.due_date || item.end_date || '',
  startDate: item.StartDate || item.start_date || '',
  type: item.type || item.order_type || '',
  series: item.seriesName || item.SeriesName || item.series || item.series_code || '',
  shift: item.U_Shift || item.u_shift || item.Shift || item.shift || '',
  priority: item.priority ?? '',
  comments: item.Comments || item.comments || item.remarks || '',
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

const canCancelProductionOrder = (status) =>
  ['planned', 'released', 'open', 'o', 'r', 'p', 'bost_open'].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );

export default function ProductionOrder() {
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilters, setOrderFilters] = useState(createInitialOrderFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [relationOrder, setRelationOrder] = useState(null);
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

  const fetchProductionOrders = useCallback(
    async (activeFilters) => {
      const filters = activeFilters || orderFilters;
      if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }

      setLoadingOrders(true);

      try {
        const response = await ProductionServices.getListOrderSap({
          from: filters.from || '',
          to: filters.to || '',
          whs_code: filters.whs_code?.value || '',
          to_whs_code: filters.to_whs_code?.value || ''
        });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');

        setOrders(getResponseList(response).map(normalizeProductionOrder));
        setCurrentPage(1);
      } catch (error) {
        setOrders([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
      } finally {
        setLoadingOrders(false);
      }
    },
    [orderFilters, showAlert]
  );

  useEffect(() => {
    const defaultFilters = createInitialOrderFilters();
    fetchProductionOrders(defaultFilters);
    // Initial page load uses the current-week filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      setSelectedOrder(getProductionOrderDetail(response));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!order?.id) return;
    setCancellingOrder(true);

    try {
      const response = await ProductionServices.postCancelProductionOrder({
        DocEntry: order.DocEntry ?? order.doc_entry ?? order.id,
        UserId: getCookies('id') ?? '',
        AddonId: getCookies('addonId') ?? ''
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to cancel Production Order');
      showAlert(response?.data?.message || 'Production Order cancelled successfully', 'success');
      fetchProductionOrders(orderFilters);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to cancel Production Order', 'danger');
    } finally {
      setCancellingOrder(false);
      setCancelOrder(null);
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
                ? (item.series ?? item.Series ?? item.series_code ?? item.seriesCode ?? item.value ?? item.code ?? item.id)
                : item;
            const name =
              typeof item === 'object'
                ? (item.label ?? item.series_name ?? item.seriesName ?? item.SeriesName ?? item.name ?? item.description ?? value)
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
    const warehouse = form.product?.to_whs ?? form.product?.whs_code ?? form.product?.warehouse_code ?? form.product?.warehouse?.code ?? '';

    if (!form.product || !(plannedQuantity > 0) || !form.series || !form.orderDate || !form.startDate || !form.dueDate || !warehouse) {
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
        form.product.addon_id ?? form.product.addonId ?? form.product.add_on_id ?? form.product.addon?.id ?? getCookies('addonId') ?? ''
      ),
      Lines: form.product.details.map((detail) => {
        const item = getComponentItem(detail);
        const baseQuantity = Number(detail.qty ?? detail.quantity) || 0;
        const detailType = String(detail.type ?? detail.component_type ?? '').toUpperCase();

        return {
          ItemType: ['4', 'ITEM', 'I'].includes(detailType) ? 'I' : ['290', 'RESOURCE', 'R'].includes(detailType) ? 'R' : detailType,
          ItemCode: item.code,
          BaseQty: baseQuantity,
          WhsCode:
            detail.whs_code ?? detail.warehouse_code ?? detail.to_whs ?? detail.warehouse?.code ?? detail.warehouse?.whs_code ?? warehouse,
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
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={6} lg={4}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.from}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={6} lg={4}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.to}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={6} lg={4}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loadingOrders} onClick={() => fetchProductionOrders()}>
                    <i className={loadingOrders ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loadingOrders ? 'Loading...' : 'Search'}
                  </Button>
                  <Button
                    variant="light-secondary"
                    disabled={loadingOrders}
                    aria-label="Reset production order filters"
                    onClick={() => {
                      const defaultFilters = createInitialOrderFilters();
                      setOrderFilters(defaultFilters);
                      fetchProductionOrders(defaultFilters);
                    }}
                  >
                    <i className="ti ti-refresh" />
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Card.Body>
        </Card>

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
              <th>Order No.</th>
              <th>Product</th>
              <th className="text-end">Planned Qty</th>
              <th className="text-end">Completed Qty</th>
              <th>Warehouse</th>
              <th>Order Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? (
              <tr>
                <td colSpan={9}>
                  <LoaderData />
                </td>
              </tr>
            ) : paginatedOrders.length ? (
              paginatedOrders.map((order) => {
                const status = getStatus(order.status);

                return (
                  <tr key={order.id}>
                    <td>{order.number || '-'}</td>
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
                        size="sm"
                        variant={String(actionMenu?.order?.id) === String(order.id) ? 'primary' : 'outline-primary'}
                        aria-label={`Open actions for Production Order ${order.number || ''}`}
                        aria-expanded={String(actionMenu?.order?.id) === String(order.id)}
                        onClick={(event) =>
                          setActionMenu((current) =>
                            String(current?.order?.id) === String(order.id) ? null : { order, target: event.currentTarget }
                          )
                        }
                      >
                        <i className="ti ti-dots-vertical me-1" />
                        Actions
                        <i className="ti ti-chevron-down ms-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9}>
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
            const order = actionMenu?.order;
            const canCancel = canCancelProductionOrder(order?.status);
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
                  onClick={() => {
                    setActionMenu(null);
                    if (order) handleOpenDetail(order);
                  }}
                >
                  <i className="ti ti-eye text-primary me-2" /> Detail
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setActionMenu(null);
                    setRelationOrder(order);
                  }}
                >
                  <i className="ti ti-sitemap text-info me-2" /> Relation Map
                </button>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  disabled={!canCancel}
                  onClick={() => {
                    setActionMenu(null);
                    if (order) setCancelOrder(order);
                  }}
                >
                  <i className="ti ti-ban me-2" /> Cancel
                </button>
              </div>
            );
          }}
        </Overlay>

        <Modal show={Boolean(cancelOrder)} onHide={() => !cancellingOrder && setCancelOrder(null)} centered>
          <Modal.Header closeButton={!cancellingOrder}>
            <Modal.Title className="text-warning">
              <i className="ti ti-alert-triangle me-2" />
              Confirm Cancel
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to cancel Production Order <strong>{cancelOrder?.number || '-'}</strong>?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" onClick={() => setCancelOrder(null)} disabled={cancellingOrder}>
              Close
            </Button>
            <Button variant="danger" onClick={() => handleCancelOrder(cancelOrder)} disabled={cancellingOrder}>
              {cancellingOrder ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Cancelling...
                </>
              ) : (
                <>
                  <i className="ti ti-ban me-1" />
                  Cancel Order
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        <ProductionRelationMap order={relationOrder} onClose={() => setRelationOrder(null)} />

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

      <Modal show={showDetailModal} onHide={() => !loadingOrderDetail && setShowDetailModal(false)} size="xl" centered scrollable>
        <Modal.Header closeButton={!loadingOrderDetail}>
          <Modal.Title>Production Order Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrderDetail ? (
            <LoaderData />
          ) : selectedOrder ? (
            <>
              {false && selectedOrder.headerData && (
                <div className="mb-4">
                  <h6 className="mb-3">Header</h6>
                  <Row className="g-3">
                    {Object.entries(selectedOrder.headerData).map(([key, value]) => (
                      <Col md={3} key={key}>
                        <div className="text-muted f-12 text-capitalize">{formatDetailLabel(key)}</div>
                        <div className="text-break">{formatDetailValue(value)}</div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="text-muted f-12">Production Order No.</div>
                  <div className="fw-semibold">{selectedOrder.number || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Product</div>
                  <div className="fw-semibold">{selectedOrder.itemCode || '-'}</div>
                  <div className="text-muted f-12">{selectedOrder.itemName || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Series</div>
                  <div>{selectedOrder.series || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Warehouse</div>
                  <div>{selectedOrder.warehouse || '-'}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Shift</div>
                  <div>{formatShift(selectedOrder.shift)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Order Date</div>
                  <div>{formatDate(selectedOrder.orderDate)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Due Date</div>
                  <div>{formatDate(selectedOrder.dueDate)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Planned Quantity</div>
                  <div>{numberFormatter.format(Number(selectedOrder.plannedQuantity) || 0)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Completed Quantity</div>
                  <div>{numberFormatter.format(Number(selectedOrder.completedQuantity) || 0)}</div>
                </Col>
                <Col md={6}>
                  <div className="text-muted f-12">Comments</div>
                  <div>{selectedOrder.comments || '-'}</div>
                </Col>
              </Row>

              {false && <h6 className="mb-3">Production Order Components</h6>}
              {false && (
                <Table className="mb-0 align-middle" responsive bordered hover>
                  <thead>
                    <tr>
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
                        <td colSpan={6} className="text-center text-muted py-4">
                          No Production Order component data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}

              {selectedOrder.itemsData?.length ? (
                <div className="mt-4">
                  <h6 className="mb-3">Items Response</h6>
                  <Table className="mb-0 align-middle" responsive bordered hover>
                    <thead>
                      <tr>
                        {Object.keys(selectedOrder.itemsData[0]).map((key) => (
                          <th key={key}>{formatDetailLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.itemsData.map((item, index) => (
                        <tr key={item.id ?? item.LineNum ?? index}>
                          {Object.keys(selectedOrder.itemsData[0]).map((key) => (
                            <td key={key}>{formatDetailValue(item[key])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : null}
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
                            value={form.product ? [form.product.productCode, form.product.productName].filter(Boolean).join(' - ') : ''}
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
                  <td colSpan={7}>
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
                  <td colSpan={7} className="text-center text-muted py-4">
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
              <Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search BOM code or product" />
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
                <th className="text-center" style={{ width: 90 }}>
                  Action
                </th>
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
                      <Button variant="success" size="sm" onClick={() => handleSelectBom(bom)} disabled={loadingBomDetail}>
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
