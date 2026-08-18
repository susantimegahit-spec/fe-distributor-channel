import { useCallback, useEffect, useMemo, useState } from 'react';

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

import MainCard from 'components/MainCard';
import LoaderData from 'components/LoaderData';
import DistributorServices from '../../../../services/customer-portal/DistributorServices';
import TablePagination from 'components/TablePagination';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies } from '../../../../utils/cookies';

const pageSize = 10;
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const compactSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 31, minWidth: 180, fontSize: '0.75rem' }),
  valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
  option: (base) => ({ ...base, fontSize: '0.75rem' })
};
const today = new Date().toLocaleDateString('en-CA');
const createReceiptLine = () => ({
  ItemCode: '',
  ItemName: '',
  BaseType: 202,
  BaseEntry: '',
  BaseLine: 0,
  Quantity: '',
  WhsCode: '',
  UoMEntry: '',
  OcrCode: '',
  OcrCode2: '',
  OcrCode3: ''
});
const createReceiptForm = () => ({
  DocDate: today,
  DocDueDate: today,
  Comments: '',
  Shift: 'X',
  Unit: '',
  Bomid: '',
  Lines: [createReceiptLine()]
});

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialFilters = () => {
  const currentDate = new Date();
  const mondayOffset = currentDate.getDay() === 0 ? -6 : 1 - currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    from: formatInputDate(startOfWeek),
    to: formatInputDate(endOfWeek)
  };
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.boms)) return payload.boms;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.production_orders)) return payload.production_orders;
  if (Array.isArray(payload?.receipts)) return payload.receipts;
  if (Array.isArray(payload?.production_receipts)) return payload.production_receipts;
  if (Array.isArray(payload?.documents)) return payload.documents;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

const getResponseDetail = (response) => {
  const payload = response?.data?.data ?? response?.data;
  const detail = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const header = Array.isArray(detail?.header) ? detail.header[0] : detail?.header;

  if (!header) return null;

  return {
    header,
    items: Array.isArray(detail?.items) ? detail.items : []
  };
};

const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;

const getLines = (item = {}) => {
  const lines = getValue(item, ['DocumentLines', 'document_lines', 'Lines', 'lines', 'details', 'receipt_details'], []);
  return Array.isArray(lines) ? lines : [];
};

const formatShift = (value) => {
  const shift = String(value || '').toUpperCase();
  return { A: '1', B: '2', C: '3', X: 'All' }[shift] || shift || '-';
};

const normalizeReceipt = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'doc_entry', 'id', 'receipt_id'], index),
  documentNumber: getValue(item, ['DocNum', 'doc_num', 'document_number', 'receipt_number', 'number'], '-'),
  productionOrderNumber: getValue(item, ['ProdOrderNum', 'prod_order_num', 'production_order_number'], '-'),
  documentDate: getValue(item, ['DocDate', 'doc_date', 'document_date', 'posting_date', 'postingDate', 'created_at']),
  shift: formatShift(getValue(item, ['Shift', 'shift', 'U_Shift', 'U_SHIFT'])),
  unit: getValue(item, ['U_Unit', 'u_unit', 'Unit', 'unit'], '-'),
  comments: getValue(item, ['Comments', 'comments', 'remarks', 'remark'], '-'),
  raw: item
});

const normalizeProductionOrder = (item = {}, index = 0) => ({
  id: item.DocEntry ?? item.doc_entry ?? item.id ?? index,
  number: item.DocNum ?? item.doc_num ?? item.prod_order_no ?? item.production_order_no ?? '-',
  itemCode: item.ItemCode ?? item.item_code ?? item.product_code ?? '',
  itemName: item.ProdName ?? item.ItemName ?? item.item_name ?? item.product_name ?? '',
  plannedQuantity: Number(item.PlannedQty ?? item.planned_qty ?? item.planned_quantity ?? item.quantity ?? 0),
  completedQuantity: Number(item.CmpltQty ?? item.completed_qty ?? item.completed_quantity ?? 0),
  warehouse: item.Warehouse ?? item.WhsCode ?? item.whs_code ?? item.warehouse_code ?? '',
  bomId: item.Bomid ?? item.BomId ?? item.bom_id ?? item.bomId ?? '',
  unit: item.U_Unit ?? item.Unit ?? item.unit ?? item.ocr_code2 ?? '',
  ocrCode: item.OcrCode ?? item.ocr_code ?? '',
  ocrCode2: item.OcrCode2 ?? item.ocr_code2 ?? '',
  ocrCode3: item.OcrCode3 ?? item.ocr_code3 ?? '',
  raw: item
});

const createReceiptLineFromOrder = (order) => {
  const remainingQuantity = Math.max(order.plannedQuantity - order.completedQuantity, 0);
  return {
    ItemCode: order.itemCode,
    ItemName: order.itemName,
    BaseType: 202,
    BaseEntry: order.id,
    BaseLine: 0,
    Quantity: Math.trunc(remainingQuantity || order.plannedQuantity),
    WhsCode: order.warehouse,
    UoMEntry: 0,
    OcrCode: order.ocrCode,
    OcrCode2: order.ocrCode2,
    OcrCode3: order.ocrCode3
  };
};

const normalizeOcr = (item = {}) => {
  const code = item.ocr_code || item.ocrCode || item.OcrCode || item.code || '';
  const name = item.ocr_name || item.ocrName || item.OcrName || item.name || '';
  return { value: code, label: [code, name].filter(Boolean).join(' - ') || String(code), raw: item };
};

const normalizeColumnKey = (key) =>
  String(key || '')
    .replaceAll('_', '')
    .toLowerCase();

const getItemColumnLabel = (key) =>
  ({
    ocr: 'Branch',
    ocr2: 'Business Unit',
    ocr3: 'Department',
    ocrcode: 'Branch',
    ocrcode2: 'Business Unit',
    ocrcode3: 'Department',
    docnum: 'Doc Num',
    linenum: 'Line Num',
    itemcode: 'Item',
    itemname: 'Item Name',
    whscode: 'Warehouse'
  })[normalizeColumnKey(key)] || key;

const formatItemValue = (value, key) => {
  if (value === undefined || value === null || value === '') return '-';
  if (['qty', 'quantity'].includes(normalizeColumnKey(key))) {
    const quantity = Number(value);
    return Number.isNaN(quantity) ? String(value) : numberFormatter.format(quantity);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const isHiddenItemColumn = (key) => ['docentry', 'linenum'].includes(normalizeColumnKey(key));

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ReceiptProduction() {
  const { showAlert } = useAlert();
  const [receipts, setReceipts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loadingReceiptDetailId, setLoadingReceiptDetailId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [receiptForm, setReceiptForm] = useState(createReceiptForm);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [selectedBom, setSelectedBom] = useState(null);
  const [showBomModal, setShowBomModal] = useState(false);
  const [loadingBoms, setLoadingBoms] = useState(false);
  const [loadingBomDetail, setLoadingBomDetail] = useState(false);
  const [bomSearch, setBomSearch] = useState('');
  const [boms, setBoms] = useState([]);
  const [pdoFilters, setPdoFilters] = useState(initialFilters);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrOptions, setOcrOptions] = useState({ branch: [], businessUnit: [], department: [] });

  const fetchReceipts = useCallback(
    async (activeFilters) => {
      const query = activeFilters || filters;
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }

      setLoadingReceipts(true);
      try {
        const response = await ProductionServices.getReceipt({
          from: query.from || '',
          to: query.to || '',
          whs_code: '',
          to_whs_code: ''
        });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production receipts');

        setReceipts(getResponseList(response).map(normalizeReceipt));
        setCurrentPage(1);
      } catch (error) {
        setReceipts([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production receipts', 'danger');
      } finally {
        setLoadingReceipts(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    const defaultFilters = initialFilters();
    fetchReceipts(defaultFilters);
    // Initial page load uses the current-month filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageCount = Math.max(Math.ceil(receipts.length / pageSize), 1);
  const paginatedReceipts = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;
    return receipts.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageCount, receipts]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleViewDetail = async (receipt) => {
    if (receipt?.id === undefined || receipt?.id === null || receipt?.id === '') {
      showAlert('Receipt ID was not found', 'danger');
      return;
    }

    setLoadingReceiptDetailId(receipt.id);
    try {
      const response = await ProductionServices.getReceiptDetail(receipt.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production receipt detail');

      const detail = getResponseDetail(response);
      if (!detail) throw new Error('Production receipt detail was not found');
      setSelectedReceipt(detail);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production receipt detail', 'danger');
    } finally {
      setLoadingReceiptDetailId(null);
    }
  };

  const handleReset = () => {
    const defaultFilters = initialFilters();
    setFilters(defaultFilters);
    fetchReceipts(defaultFilters);
  };

  const fetchBoms = async (keyword = '', activeFilters = pdoFilters) => {
    if (activeFilters.from && activeFilters.to && new Date(activeFilters.from) > new Date(activeFilters.to)) {
      showAlert('Start Date cannot be after End Date', 'warning');
      return;
    }
    setLoadingBoms(true);
    try {
      const response = await ProductionServices.getListOrderSap({
        from: activeFilters.from || '',
        to: activeFilters.to || '',
        whs_code: '',
        to_whs_code: ''
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');
      const search = keyword.trim().toLowerCase();
      const orders = getResponseList(response).map(normalizeProductionOrder);
      setBoms(
        search
          ? orders.filter((order) =>
              [order.number, order.itemCode, order.itemName].some((value) =>
                String(value || '')
                  .toLowerCase()
                  .includes(search)
              )
            )
          : orders
      );
    } catch (error) {
      setBoms([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
    } finally {
      setLoadingBoms(false);
    }
  };

  const fetchOcrOptions = async () => {
    setLoadingOcr(true);
    try {
      const [branchResponse, businessUnitResponse, departmentResponse] = await Promise.all([
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);
      if ([branchResponse, businessUnitResponse, departmentResponse].some((response) => response?.data?.success === false)) {
        throw new Error('Failed to fetch OCR data');
      }
      setOcrOptions({
        branch: getResponseList(branchResponse)
          .map(normalizeOcr)
          .filter((option) => option.value),
        businessUnit: getResponseList(businessUnitResponse)
          .map(normalizeOcr)
          .filter((option) => option.value),
        department: getResponseList(departmentResponse)
          .map(normalizeOcr)
          .filter((option) => option.value)
      });
    } catch (error) {
      setOcrOptions({ branch: [], businessUnit: [], department: [] });
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch OCR data', 'danger');
    } finally {
      setLoadingOcr(false);
    }
  };

  const handleOpenBomSelection = () => {
    const defaultPdoFilters = { from: filters.from, to: filters.to };
    setBomSearch('');
    setPdoFilters(defaultPdoFilters);
    setShowBomModal(true);
    fetchBoms('', defaultPdoFilters);
  };

  const handleSelectBom = async (order) => {
    setLoadingBomDetail(true);
    try {
      const response = await ProductionServices.getProductionOrderById(order.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order detail');
      const payload = response?.data?.data ?? response?.data ?? {};
      const header = payload?.header ?? payload?.Header ?? payload?.data ?? payload?.order ?? payload?.production_order ?? payload;
      const orderDetail = normalizeProductionOrder({ ...order.raw, ...(header || {}) });
      const lineSource = Array.isArray(payload?.items) ? payload.items[0] : null;
      const receiptOrder = lineSource
        ? {
            ...orderDetail,
            itemCode: lineSource.ItemCode ?? lineSource.item_code ?? orderDetail.itemCode,
            itemName: lineSource.ItemName ?? lineSource.item_name ?? orderDetail.itemName,
            warehouse: lineSource.WhsCode ?? lineSource.whs_code ?? orderDetail.warehouse,
            ocrCode: lineSource.OcrCode ?? lineSource.ocr_code ?? orderDetail.ocrCode,
            ocrCode2: lineSource.OcrCode2 ?? lineSource.ocr_code2 ?? orderDetail.ocrCode2,
            ocrCode3: lineSource.OcrCode3 ?? lineSource.ocr_code3 ?? orderDetail.ocrCode3
          }
        : orderDetail;
      setSelectedBom(receiptOrder);
      setReceiptForm((current) => ({
        ...current,
        Bomid: String(receiptOrder.bomId || ''),
        Unit: receiptOrder.unit || current.Unit,
        Lines: [createReceiptLineFromOrder(receiptOrder)]
      }));
      setShowBomModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingBomDetail(false);
    }
  };

  const handleSubmitReceipt = async () => {
    const invalidLine = receiptForm.Lines.some((line) => line.BaseEntry === '' || line.BaseLine === '' || !(Number(line.Quantity) > 0));
    if (!receiptForm.DocDate || !receiptForm.DocDueDate || !receiptForm.Lines.length || invalidLine) {
      showAlert('Complete document dates, Base Entry, Base Line, and Quantity for every line', 'warning');
      return;
    }

    const payload = {
      ...receiptForm,
      AddonId: String(getCookies('addonId') ?? ''),
      UserId: String(getCookies('id') ?? ''),
      Lines: receiptForm.Lines.map((line) => ({
        BaseType: Number(line.BaseType),
        BaseEntry: Number(line.BaseEntry),
        BaseLine: Number(line.BaseLine),
        Quantity: Number(line.Quantity),
        WhsCode: line.WhsCode,
        UoMEntry: line.UoMEntry === '' ? 0 : Number(line.UoMEntry),
        OcrCode: line.OcrCode,
        OcrCode2: line.OcrCode2,
        OcrCode3: line.OcrCode3
      }))
    };

    setSavingReceipt(true);
    try {
      const response = await ProductionServices.postReceipt(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to add production receipt');
      setShowAddReceipt(false);
      setReceiptForm(createReceiptForm());
      setSelectedBom(null);
      showAlert(response?.data?.message || 'Production receipt added successfully', 'success');
      await fetchReceipts();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to add production receipt', 'danger');
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Receipt Production</h5>
            <span className="text-muted f-12">View finished goods receipts posted to SAP.</span>
          </Stack>
        }
        secondary={
          <Button
            variant="success"
            onClick={() => {
              setReceiptForm(createReceiptForm());
              setSelectedBom(null);
              setShowAddReceipt(true);
              fetchOcrOptions();
            }}
          >
            <i className="ti ti-plus me-1" />
            Add Receipt
          </Button>
        }
      >
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loadingReceipts} onClick={() => fetchReceipts()}>
                    <i className={loadingReceipts ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loadingReceipts ? 'Loading...' : 'Search'}
                  </Button>
                  <Button variant="light-secondary" disabled={loadingReceipts} aria-label="Reset receipt filters" onClick={handleReset}>
                    <i className="ti ti-refresh" />
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Doc. No.</th>
              <th>Doc. Date</th>
              <th>Shift</th>
              <th>Unit</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {loadingReceipts ? (
              <tr>
                <td colSpan={5} className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                  Loading production receipts...
                </td>
              </tr>
            ) : paginatedReceipts.length ? (
              paginatedReceipts.map((receipt, index) => {
                return (
                  <tr key={receipt.id || `${receipt.documentNumber}-${index}`}>
                    <td>
                      <Button
                        variant="link"
                        className="p-0 fw-semibold text-decoration-none"
                        disabled={loadingReceiptDetailId !== null}
                        onClick={() => handleViewDetail(receipt)}
                      >
                        {String(loadingReceiptDetailId) === String(receipt.id) ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                        ) : null}
                        {receipt.documentNumber}
                      </Button>
                    </td>
                    <td>{formatDate(receipt.documentDate)}</td>
                    <td>{receipt.shift}</td>
                    <td>{receipt.unit}</td>
                    <td>{receipt.comments}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No production receipt data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {!loadingReceipts && receipts.length > 0 ? (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={receipts.length}
            itemLabel="receipts"
          />
        ) : null}
      </MainCard>

      <Modal show={showAddReceipt} onHide={() => !savingReceipt && setShowAddReceipt(false)} fullscreen scrollable>
        <Modal.Header closeButton={!savingReceipt}>
          <Modal.Title>Add Receipt Production</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-4">
            <Col md={6} lg={5}>
              <Form.Label>Production Order (PDO)</Form.Label>
              <InputGroup>
                <Form.Control
                  readOnly
                  value={selectedBom ? [selectedBom.number, selectedBom.itemCode, selectedBom.itemName].filter(Boolean).join(' - ') : ''}
                  placeholder="Select Production Order"
                  onClick={handleOpenBomSelection}
                />
                <Button variant="outline-primary" onClick={handleOpenBomSelection}>
                  <i className="ti ti-search me-1" /> Select PDO
                </Button>
              </InputGroup>
            </Col>
          </Row>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Label>Document Date *</Form.Label>
              <Form.Control
                type="date"
                value={receiptForm.DocDate}
                onChange={(event) => setReceiptForm((current) => ({ ...current, DocDate: event.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Due Date *</Form.Label>
              <Form.Control
                type="date"
                value={receiptForm.DocDueDate}
                onChange={(event) => setReceiptForm((current) => ({ ...current, DocDueDate: event.target.value }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Shift</Form.Label>
              <Form.Select
                value={receiptForm.Shift}
                onChange={(event) => setReceiptForm((current) => ({ ...current, Shift: event.target.value }))}
              >
                <option value="X">All</option>
                <option value="A">1</option>
                <option value="B">2</option>
                <option value="C">3</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>Unit</Form.Label>
              <Form.Control
                value={receiptForm.Unit}
                onChange={(event) => setReceiptForm((current) => ({ ...current, Unit: event.target.value }))}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={receiptForm.Comments}
                onChange={(event) => setReceiptForm((current) => ({ ...current, Comments: event.target.value }))}
              />
            </Col>
          </Row>

          <h6 className="mb-2">Items</h6>
          <Table responsive bordered className="align-middle mb-0">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Warehouse</th>
                <th>Branch</th>
                <th>Business Unit</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {receiptForm.Lines.map((line, index) => (
                <tr key={index}>
                  <td style={{ minWidth: 170 }}>
                    <div className="fw-semibold">{line.ItemCode || '-'}</div>
                    <div className="text-muted f-12">{line.ItemName || '-'}</div>
                  </td>
                  {['Quantity', 'WhsCode'].map((field) => (
                    <td key={field}>
                      <Form.Control size="sm" type={field === 'Quantity' ? 'number' : 'text'} value={line[field]} readOnly />
                    </td>
                  ))}
                  {[
                    ['OcrCode', ocrOptions.branch, 'Select branch'],
                    ['OcrCode2', ocrOptions.businessUnit, 'Select business unit'],
                    ['OcrCode3', ocrOptions.department, 'Select department']
                  ].map(([field, options, placeholder]) => (
                    <td key={field}>
                      <Select
                        styles={compactSelectStyles}
                        menuPortalTarget={document.body}
                        menuPlacement="top"
                        value={options.find((option) => String(option.value) === String(line[field])) || null}
                        options={options}
                        isLoading={loadingOcr}
                        placeholder={placeholder}
                        isDisabled
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={savingReceipt} onClick={() => setShowAddReceipt(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={savingReceipt} onClick={handleSubmitReceipt}>
            {savingReceipt ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
            {savingReceipt ? 'Saving...' : 'Save Receipt'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showBomModal} onHide={() => !loadingBoms && !loadingBomDetail && setShowBomModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton={!loadingBoms && !loadingBomDetail}>
          <Modal.Title>Select Production Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            className="mb-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchBoms(bomSearch.trim(), pdoFilters);
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={pdoFilters.from}
                  onChange={(event) => setPdoFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={pdoFilters.to}
                  onChange={(event) => setPdoFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>Search PDO</Form.Label>
                <InputGroup>
                  <Form.Control
                    value={bomSearch}
                    onChange={(event) => setBomSearch(event.target.value)}
                    placeholder="Order number or product"
                  />
                  <Button type="submit" disabled={loadingBoms}>
                    <i className="ti ti-search" />
                  </Button>
                </InputGroup>
              </Col>
            </Row>
          </Form>

          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Product</th>
                <th>Planned Qty</th>
                <th className="text-center">Action</th>
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
                    <td className="fw-semibold">{bom.number}</td>
                    <td>
                      <div className="fw-semibold">{bom.itemCode || '-'}</div>
                      <div className="text-muted f-12">{bom.itemName || '-'}</div>
                    </td>
                    <td>{numberFormatter.format(bom.plannedQuantity)}</td>
                    <td className="text-center">
                      <Button size="sm" variant="success" disabled={loadingBomDetail} onClick={() => handleSelectBom(bom)}>
                        {loadingBomDetail ? 'Loading...' : 'Select'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No Production Order data found for the selected date filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={Boolean(selectedReceipt)} onHide={() => setSelectedReceipt(null)} fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Production Receipt Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReceipt
            ? (() => {
                const receipt = normalizeReceipt(selectedReceipt.header);
                const items = selectedReceipt.items;
                const itemColumns = [...new Set(items.flatMap((item) => Object.keys(item || {})))].filter(
                  (column) => !isHiddenItemColumn(column) && normalizeColumnKey(column) !== 'itemname'
                );

                return (
                  <Stack gap={4}>
                    <Card className="border mb-0">
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document No.</Form.Label>
                            <div className="fw-semibold">{receipt.documentNumber}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                            <div>{formatDate(receipt.documentDate)}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Shift</Form.Label>
                            <div>{receipt.shift}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Unit</Form.Label>
                            <div>{receipt.unit}</div>
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="f-12 text-muted">Comments</Form.Label>
                            <div>{receipt.comments}</div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    <Card className="border mb-0">
                      <Card.Header>
                        <h6 className="mb-0">Items</h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <Table responsive hover className="mb-0 align-middle">
                          <thead>
                            <tr>
                              <th>#</th>
                              {itemColumns.map((column) => (
                                <th key={column}>{getItemColumnLabel(column)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.length ? (
                              items.map((item, index) => (
                                <tr key={item?.LineNum ?? item?.line_num ?? item?.id ?? index}>
                                  <td>{index + 1}</td>
                                  {itemColumns.map((column) => (
                                    <td key={column}>
                                      {normalizeColumnKey(column) === 'itemcode' ? (
                                        <>
                                          <div className="fw-semibold">{formatItemValue(item?.[column], column)}</div>
                                          <div className="text-muted f-12">
                                            {formatItemValue(item?.itemName ?? item?.ItemName ?? item?.item_name, 'itemname')}
                                          </div>
                                        </>
                                      ) : (
                                        formatItemValue(item?.[column], column)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={Math.max(itemColumns.length + 1, 1)} className="text-center text-muted py-4">
                                  No receipt item detail found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Stack>
                );
              })()
            : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedReceipt(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
