import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import * as XLSX from 'xlsx';

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
import MainCard from 'components/MainCard';
import LoaderData from 'components/LoaderData';
import TablePagination from 'components/TablePagination';
import ExpeditionServices from '../../../services/expedition/ExpeditionServices';
import { useAlert } from '../../../utils/alertContext';

const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1060 }),
  menu: (base) => ({ ...base, zIndex: 1060 })
};

const initialForm = {
  code: '',
  name: '',
  address: '',
  provinceId: '',
  city: '',
  province: '',
  postalCode: '',
  picName: '',
  picPhone: '',
  email: '',
  npwp: '',
  vehicleType: '',
  transportMode: '',
  status: 'ACTIVE'
};

const excelTemplateColumns = [
  'expedition_code',
  'expedition_name',
  'address',
  'city',
  'province',
  'postal_code',
  'pic_name',
  'pic_phone',
  'email',
  'npwp',
  'vehicle_type',
  'transport_mode',
  'status'
];

const getExcelValue = (row, keys) => {
  const normalizedRow = Object.entries(row).reduce((result, [key, value]) => {
    result[String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')] = value;
    return result;
  }, {});

  return keys.map((key) => normalizedRow[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
};

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();

  return ['inactive', 'tidak aktif', 'nonaktif', '0'].includes(status) ? 'inactive' : 'active';
};

const normalizeExpedition = (item = {}) => ({
  ...item,
  id: item.id ?? item.expedition_id,
  code: item.code ?? item.expedition_code ?? '',
  name: item.name ?? item.expedition_name ?? '',
  address: item.address ?? '',
  postalCode: item.postalCode ?? item.postal_code ?? '',
  picName: item.picName ?? item.pic_name ?? '',
  picPhone: item.picPhone ?? item.pic_phone ?? '',
  email: item.email ?? '',
  npwp: item.npwp ?? '',
  vehicleType: item.vehicleType ?? item.vehicle_type ?? '',
  transportMode: item.transportMode ?? item.transport_mode ?? '',
  province: item.province ?? item.province_name ?? '',
  city: item.city ?? item.city_name ?? '',
  status: normalizeStatus(item.status)
});

const getExpeditionList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];

  return Array.isArray(list) ? list.map(normalizeExpedition) : [];
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];

  return Array.isArray(list) ? list : [];
};

const isSuccessfulResponse = (response) => response?.status < 400 && response?.data?.success !== false;

export default function MasterExpedition() {
  const { showAlert } = useAlert();
  const uploadInputRef = useRef(null);
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const canSubmit = Boolean(form.name.trim() && !submitting);
  const provinceSelectOptions = provinceOptions.map((item) => ({ value: String(item.id), label: item.name }));
  const citySelectOptions = cityOptions.map((item) => ({ value: item.name, label: item.name }));
  const selectedProvinceOption = provinceSelectOptions.find((item) => item.value === form.provinceId) || null;
  const selectedCityOption = citySelectOptions.find((item) => item.value === form.city) || null;

  const fetchExpeditions = useCallback(async () => {
    setLoading(true);

    try {
      const response = await ExpeditionServices.getExpeditions();

      if (!isSuccessfulResponse(response)) {
        showAlert(response.data.message || 'Failed to fetch expedition data', 'danger');
        return;
      }

      setDataSource(getExpeditionList(response));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch expedition data', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchExpeditions();
  }, [fetchExpeditions]);

  const fetchProvinces = useCallback(async () => {
    setLoadingProvinces(true);

    try {
      const response = await ExpeditionServices.getProvinces();

      if (!isSuccessfulResponse(response)) {
        showAlert(response?.data?.message || 'Failed to fetch province data', 'danger');
        return;
      }

      setProvinceOptions(getResponseList(response));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch province data', 'danger');
    } finally {
      setLoadingProvinces(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  const filteredData = useMemo(() => {
    const keyword = keywords.trim().toLowerCase();

    return dataSource.filter((item) => {
      const matchKeyword =
        !keyword ||
        [
          item.code,
          item.name,
          item.address,
          item.city,
          item.province,
          item.postalCode,
          item.picName,
          item.picPhone,
          item.email,
          item.npwp,
          item.vehicleType,
          item.transportMode
        ].some((value) => String(value || '').toLowerCase().includes(keyword));
      const matchStatus = !selectedStatus || item.status === selectedStatus;

      return matchKeyword && matchStatus;
    });
  }, [dataSource, keywords, selectedStatus]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.status === 'active').length,
      inactive: dataSource.filter((item) => item.status !== 'active').length
    }),
    [dataSource]
  );

  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const hasActiveFilter = Boolean(keywords || selectedStatus);

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleProvinceChange = async (option) => {
    const provinceId = option?.value || '';
    const selectedProvince = provinceOptions.find((item) => String(item.id) === provinceId);

    setForm((current) => ({
      ...current,
      provinceId,
      province: selectedProvince?.name || '',
      city: ''
    }));
    setCityOptions([]);

    if (!provinceId) return;

    setLoadingCities(true);

    try {
      const response = await ExpeditionServices.getCities(provinceId);

      if (!isSuccessfulResponse(response)) {
        showAlert(response?.data?.message || 'Failed to fetch city data', 'danger');
        return;
      }

      setCityOptions(getResponseList(response));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch city data', 'danger');
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCityChange = (option) => {
    setForm((current) => ({
      ...current,
      city: option?.value || ''
    }));
  };

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const handleOpenForm = () => {
    setForm(initialForm);
    setCityOptions([]);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(initialForm);
    setCityOptions([]);
  };

  const buildPayload = (values) => ({
    expedition_code: values.code.trim() || null,
    expedition_name: values.name.trim(),
    address: values.address.trim() || null,
    city: values.city.trim() || null,
    province: values.province.trim() || null,
    postal_code: values.postalCode.trim() || null,
    pic_name: values.picName.trim() || null,
    pic_phone: values.picPhone.trim() || null,
    email: values.email.trim() || null,
    npwp: values.npwp.trim() || null,
    vehicle_type: values.vehicleType.trim() || null,
    transport_mode: values.transportMode.trim() || null,
    status: values.status
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await ExpeditionServices.postExpedition(buildPayload(form));

      if (!isSuccessfulResponse(response)) {
        showAlert(response.data.message || 'Failed to add expedition', 'danger');
        return;
      }

      showAlert(response?.data?.message || 'Expedition added successfully', 'success');
      handleCloseForm();
      setCurrentPage(1);
      await fetchExpeditions();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to add expedition', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadExcel = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls'].includes(extension)) {
      showAlert('File format must be XLSX or XLS', 'danger');
      event.target.value = '';
      return;
    }

    setUploadingExcel(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const importedData = rows
        .map((row, index) => {
          const name = String(getExcelValue(row, ['expedition_name', 'nama_ekspedisi', 'name'])).trim();

          if (!name) return null;

          return {
            id: Date.now() + index,
            code: String(getExcelValue(row, ['expedition_code', 'kode_ekspedisi', 'code'])).trim(),
            name,
            address: String(getExcelValue(row, ['address', 'alamat'])).trim(),
            city: String(getExcelValue(row, ['city', 'kota'])).trim(),
            province: String(getExcelValue(row, ['province', 'provinsi', 'propinsi'])).trim(),
            postalCode: String(getExcelValue(row, ['postal_code', 'kode_pos'])).trim(),
            picName: String(getExcelValue(row, ['pic_name', 'nama_pic'])).trim(),
            picPhone: String(getExcelValue(row, ['pic_phone', 'telepon_pic'])).trim(),
            email: String(getExcelValue(row, ['email'])).trim(),
            npwp: String(getExcelValue(row, ['npwp'])).trim(),
            vehicleType: String(getExcelValue(row, ['vehicle_type', 'tipe_kendaraan'])).trim(),
            transportMode: String(getExcelValue(row, ['transport_mode', 'moda_transportasi'])).trim(),
            status: normalizeStatus(getExcelValue(row, ['status'])).toUpperCase()
          };
        })
        .filter(Boolean);

      if (importedData.length === 0) {
        showAlert('No valid data found. At minimum, fill in the expedition_name column.', 'danger');
        return;
      }

      const responses = await Promise.all(importedData.map((item) => ExpeditionServices.postExpedition(buildPayload(item))));

      if (responses.some((response) => !isSuccessfulResponse(response))) {
        throw new Error('Some expedition records failed to upload');
      }

      await fetchExpeditions();
      setCurrentPage(1);
      setShowUpload(false);
      showAlert(`${importedData.length} expedition records imported successfully`, 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to read Excel file', 'danger');
    } finally {
      setUploadingExcel(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Expedition Master</h5>
              <span className="text-muted f-12">Manage expeditions, services, and base shipping rates.</span>
            </Stack>
          }
          secondary={
            <Stack direction="horizontal" gap={2}>
              <Button variant="light-primary" onClick={() => setShowUpload(true)}>
                <i className="ti ti-file-upload me-1" />
                Upload Excel
              </Button>
              <Button variant="primary" onClick={handleOpenForm}>
                <i className="ti ti-plus me-1" />
                Add
              </Button>
            </Stack>
          }
        >
          <Row className="g-3">
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Expeditions</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-package-export" />
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
            </Col>
          </Row>
        </MainCard>

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={5} md={6}>
              <Form.Label className="f-12 text-muted">Search Expedition</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => {
                    setKeywords(event.target.value);
                    setCurrentPage(1);
                  }}
                  type="text"
                  placeholder="Code, name, address, PIC, or transport mode"
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh me-1" />
                Reset
              </Button>
            </Col>
            <Col lg={2} md={6} className="text-lg-end">
              <span className="text-muted f-12">Showing</span>
              <div className="fw-semibold">
                {filteredData.length} of {dataSource.length}
              </div>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>Code</th>
                <th style={{ minWidth: 220 }}>Expedition Name</th>
                <th style={{ minWidth: 240 }}>Address</th>
                <th style={{ minWidth: 150 }}>City</th>
                <th style={{ minWidth: 150 }}>Province</th>
                <th style={{ minWidth: 120 }}>Postal Code</th>
                <th style={{ minWidth: 160 }}>PIC Name</th>
                <th style={{ minWidth: 150 }}>PIC Phone</th>
                <th style={{ minWidth: 200 }}>Email</th>
                <th style={{ minWidth: 170 }}>NPWP</th>
                <th style={{ minWidth: 150 }}>Vehicle Type</th>
                <th style={{ minWidth: 150 }}>Transport Mode</th>
                <th style={{ minWidth: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13}>
                    <LoaderData />
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.code}</td>
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.name}</td>
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.address || '-'}</td>
                    <td>{item.city || '-'}</td>
                    <td>{item.province || '-'}</td>
                    <td>{item.postalCode || '-'}</td>
                    <td>{item.picName || '-'}</td>
                    <td>{item.picPhone || '-'}</td>
                    <td>{item.email || '-'}</td>
                    <td>{item.npwp || '-'}</td>
                    <td>{item.vehicleType || '-'}</td>
                    <td>{item.transportMode || '-'}</td>
                    <td>
                      {item.status === 'active' ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13}>
                    <div className="text-center py-5">
                      <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                        <i className="ti ti-package-off f-24" />
                      </div>
                      <h5 className="mb-1">Expedition not found</h5>
                      <p className="text-muted mb-3">Change the keyword or status to view other data.</p>
                      <Button variant="light-primary" onClick={resetFilters}>
                        Reset Filter
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredData.length}
            itemLabel="expedition"
          />
        </MainCard>
      </Stack>

      <Modal show={showForm} onHide={handleCloseForm} centered size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Add Expedition</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Expedition Code</Form.Label>
                  <Form.Control value={form.code} onChange={handleChange('code')} placeholder="Auto-generated if empty" />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Expedition Name</Form.Label>
                  <Form.Control value={form.name} onChange={handleChange('name')} placeholder="Expedition company name" required />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.address}
                    onChange={handleChange('address')}
                    placeholder="Complete expedition address"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Province</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isClearable
                    isLoading={loadingProvinces}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Province not found'}
                    onChange={handleProvinceChange}
                    options={provinceSelectOptions}
                    placeholder="Search province"
                    styles={selectStyles}
                    value={selectedProvinceOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>City/Regency</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isClearable
                    isDisabled={!form.provinceId}
                    isLoading={loadingCities}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => (form.provinceId ? 'City/regency not found' : 'Select province first')}
                    onChange={handleCityChange}
                    options={citySelectOptions}
                    placeholder={form.provinceId ? 'Search city/regency' : 'Select province first'}
                    styles={selectStyles}
                    value={selectedCityOption}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Postal Code</Form.Label>
                  <Form.Control value={form.postalCode} onChange={handleChange('postalCode')} placeholder="61253" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>PIC Name</Form.Label>
                  <Form.Control value={form.picName} onChange={handleChange('picName')} placeholder="Budi Santoso" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>PIC Phone</Form.Label>
                  <Form.Control value={form.picPhone} onChange={handleChange('picPhone')} placeholder="081234567890" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={form.email} onChange={handleChange('email')} placeholder="pic@expedition.co.id" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>NPWP</Form.Label>
                  <Form.Control value={form.npwp} onChange={handleChange('npwp')} placeholder="01.234.567.8-012.000" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Vehicle Type</Form.Label>
                  <Form.Control value={form.vehicleType} onChange={handleChange('vehicleType')} placeholder="Box Medium" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Transport Mode</Form.Label>
                  <Form.Control value={form.transportMode} onChange={handleChange('transportMode')} placeholder="Darat" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={form.status} onChange={handleChange('status')}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="danger" onClick={handleCloseForm} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!canSubmit}>
              <i className={`${submitting ? 'ti ti-loader-2' : 'ti ti-device-floppy'} me-1`} />
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showUpload} onHide={() => setShowUpload(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload Expedition Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body>
                <Stack direction="horizontal" gap={3} className="align-items-start">
                  <span className="avtar avtar-s bg-light-primary text-primary">
                    <i className="ti ti-table" />
                  </span>
                  <div>
                    <h6 className="mb-1">Excel Column Format</h6>
                    <p className="text-muted mb-2">
                      The first row is used as the header. At minimum, fill in the expedition_name column.
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {excelTemplateColumns.map((column) => (
                        <Badge key={column} bg="light" text="dark" className="border">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Stack>
              </Card.Body>
            </Card>

            <Button variant="primary" onClick={() => uploadInputRef.current?.click()} disabled={uploadingExcel}>
              <i className={`${uploadingExcel ? 'ti ti-loader-2' : 'ti ti-upload'} me-1`} />
              {uploadingExcel ? 'Reading file...' : 'Choose Excel File'}
            </Button>
            <Form.Control ref={uploadInputRef} type="file" accept=".xlsx,.xls" className="d-none" onChange={handleUploadExcel} />
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowUpload(false)} disabled={uploadingExcel}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
