import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LoadingRateServices from 'services/logistics/LoadingRateServices';
import { useAlert } from 'utils/alertContext';

const initialForm = {
  itemCode: '',
  itemName: '',
  rateType: 'REGULAR',
  rate: '',
  uom: '',
  status: 'ACTIVE',
  remarks: ''
};
const pageSize = 20;

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};
const getRows = (response) => {
  const payload = getPayload(response);
  const collection = payload?.loading_rates ?? payload?.loadingRates;
  const rows = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.items ?? collection?.data ?? collection?.items ?? collection ?? [];
  return Array.isArray(rows) ? rows : [];
};
const getPagination = (response, rows) => {
  const root = response?.data ?? {};
  const payload = getPayload(response);
  const collection = payload?.loading_rates ?? payload?.loadingRates;
  const pagination =
    collection?.pagination ??
    payload?.pagination ??
    root?.pagination ??
    collection?.meta ??
    payload?.meta ??
    root?.meta ??
    collection ??
    payload;
  const total = Number(pagination?.total);

  const resolvedTotal = Number.isFinite(total) ? total : rows.length;
  return {
    total: resolvedTotal,
    pageCount: Math.max(
      Number(pagination?.last_page ?? pagination?.lastPage) || Math.ceil(resolvedTotal / pageSize),
      1
    )
  };
};
const isSuccessful = (response) => response?.status < 400 && response?.data?.success !== false;
const formatRate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('id-ID') : '-';
};

export default function MasterLoadingRates() {
  const { showAlert } = useAlert();
  const [loadingRates, setLoadingRates] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const uploadInputRef = useRef(null);

  const fetchLoadingRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await LoadingRateServices.getLoadingRates({ page, per_page: pageSize });
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to load loading rates');
      const rows = getRows(response);
      const pagination = getPagination(response, rows);
      setLoadingRates(rows);
      setTotal(pagination.total);
      setPageCount(pagination.pageCount);
    } catch (error) {
      setLoadingRates([]);
      setTotal(0);
      setPageCount(1);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load loading rates', 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, showAlert]);

  useEffect(() => {
    fetchLoadingRates();
  }, [fetchLoadingRates]);

  const openForm = () => {
    setForm(initialForm);
    setShowForm(true);
  };

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const rate = Number(form.rate);
    if (!form.itemCode.trim()) return showAlert('Item code is required', 'danger');
    if (!Number.isFinite(rate) || rate < 0) return showAlert('Rate must be a valid number', 'danger');

    setSaving(true);
    try {
      const response = await LoadingRateServices.postLoadingRates({
        item_code: form.itemCode.trim(),
        item_name: form.itemName.trim(),
        rate_type: form.rateType,
        rate,
        uom: form.uom.trim(),
        status: form.status,
        remarks: form.remarks.trim()
      });
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to save loading rate');
      showAlert(response?.data?.message || 'Loading rate saved successfully', 'success');
      setShowForm(false);
      setForm(initialForm);
      if (page === 1) await fetchLoadingRates();
      else setPage(1);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save loading rate', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const uploadExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
      showAlert('File format must be XLSX or XLS', 'danger');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const response = await LoadingRateServices.postUploadLoadingRate(file);
      if (!isSuccessful(response)) throw new Error(response?.data?.message || 'Failed to upload loading rates');
      showAlert(response?.data?.message || 'Loading rates uploaded successfully', 'success');
      if (page === 1) await fetchLoadingRates();
      else setPage(1);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to upload loading rates', 'danger');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const downloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await LoadingRateServices.getDownloadTemplateLoadingRate();
      const contentDisposition = String(response?.headers?.['content-disposition'] || '');
      const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const basicFilename = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
      const filename = decodeURIComponent(encodedFilename || basicFilename || 'loading-rates-template.xlsx');
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      showAlert('Loading rates template downloaded successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to download loading rates template', 'danger');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  return (
    <>
      <MainCard
        headerClassName="role-permission-header"
        title={
          <Stack direction="horizontal" className="justify-content-between flex-wrap gap-3">
            <div>
              <h5 className="mb-1">Loading Rates</h5>
              <span className="text-muted f-12">Manage loading costs by item and rate type.</span>
            </div>
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              <Button variant="outline-secondary" disabled={loading} onClick={fetchLoadingRates}>
                <i className={loading ? 'ti ti-loader-2 me-1' : 'ti ti-refresh me-1'} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button variant="outline-primary" disabled={uploading} onClick={() => uploadInputRef.current?.click()}>
                <i className={uploading ? 'ti ti-loader-2 me-1' : 'ti ti-file-upload me-1'} />
                {uploading ? 'Uploading...' : 'Upload Excel'}
              </Button>
              <Button variant="outline-primary" disabled={downloadingTemplate} onClick={downloadTemplate}>
                <i className={downloadingTemplate ? 'ti ti-loader-2 me-1' : 'ti ti-download me-1'} />
                {downloadingTemplate ? 'Downloading...' : 'Download Template'}
              </Button>
              <Button onClick={openForm}><i className="ti ti-plus me-1" /> Add Loading Rate</Button>
              <Form.Control
                ref={uploadInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="d-none"
                onChange={uploadExcel}
              />
            </Stack>
          </Stack>
        }
      >
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr><th>No.</th><th>Item Code</th><th>Item Name</th><th>Rate Type</th><th>Rate</th><th>UOM</th><th>Status</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><LoaderData /></td></tr>
            ) : loadingRates.length ? loadingRates.map((item, index) => (
              <tr key={item.id ?? item.loading_rate_id ?? index}>
                <td>{(page - 1) * pageSize + index + 1}</td>
                <td className="fw-semibold">{item.item_code || '-'}</td>
                <td>{item.item_name || '-'}</td>
                <td><Badge bg={item.rate_type === 'OVERTIME' ? 'warning' : 'primary'}>{item.rate_type || '-'}</Badge></td>
                <td>{formatRate(item.rate)}</td>
                <td>{item.uom || '-'}</td>
                <td><Badge bg={item.status === 'INACTIVE' ? 'secondary' : 'success'}>{item.status || 'ACTIVE'}</Badge></td>
                <td>{item.remarks || '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="text-center text-muted py-4">No loading rates found.</td></tr>
            )}
          </tbody>
        </Table>
        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={total}
          itemLabel="loading rates"
        />
      </MainCard>

      <Modal show={showForm} onHide={() => !saving && setShowForm(false)} centered size="lg">
        <Form onSubmit={submit}>
          <Modal.Header closeButton={!saving}><Modal.Title>Add Loading Rate</Modal.Title></Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group><Form.Label>Item Code</Form.Label><Form.Control required value={form.itemCode} onChange={setField('itemCode')} /></Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group><Form.Label>Item Name</Form.Label><Form.Control value={form.itemName} onChange={setField('itemName')} /></Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Rate Type</Form.Label>
                  <Form.Select value={form.rateType} onChange={setField('rateType')}>
                    <option value="REGULAR">Regular</option><option value="OVERTIME">Overtime</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group><Form.Label>Rate</Form.Label><Form.Control required type="number" min="0" step="any" value={form.rate} onChange={setField('rate')} /></Form.Group>
                <Form.Text muted>Loading cost per unit.</Form.Text>
              </Col>
              <Col md={6}>
                <Form.Group><Form.Label>UOM</Form.Label><Form.Control value={form.uom} onChange={setField('uom')} placeholder="Unit of Measure" /></Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={form.status} onChange={setField('status')}>
                    <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group><Form.Label>Remarks</Form.Label><Form.Control as="textarea" rows={3} value={form.remarks} onChange={setField('remarks')} /></Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" disabled={saving} onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              <i className={saving ? 'ti ti-loader-2 me-1' : 'ti ti-device-floppy me-1'} />
              {saving ? 'Saving...' : 'Save Loading Rate'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
