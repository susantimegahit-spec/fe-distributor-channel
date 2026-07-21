import { useMemo, useRef, useState } from 'react';
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
import TablePagination from 'components/TablePagination';
import wilayahIndonesia from '../../../data/wilayah-indonesia.json';
import { useAlert } from '../../../utils/alertContext';
import { currency } from '../../../utils/global';

const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1060 }),
  menu: (base) => ({ ...base, zIndex: 1060 })
};

const initialForm = {
  code: '',
  name: '',
  service: '',
  phone: '',
  provinceCode: '',
  cityCode: '',
  districtCode: '',
  subdistrictName: '',
  villageName: '',
  city: '',
  leadTime: '',
  basePrice: '',
  perKg: '',
  status: 'active'
};

const excelTemplateColumns = [
  'kode',
  'nama',
  'layanan',
  'telepon',
  'propinsi',
  'kota_kabupaten',
  'kecamatan',
  'kelurahan',
  'desa',
  'estimasi',
  'tarif_dasar',
  'tarif_per_kg',
  'status'
];

const getExcelValue = (row, keys) => {
  const normalizedRow = Object.entries(row).reduce((result, [key, value]) => {
    result[String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')] = value;
    return result;
  }, {});

  return keys.map((key) => normalizedRow[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
};

const toNumber = (value) => {
  if (typeof value === 'number') return value;

  return Number(String(value || '').replace(/[^\d-]/g, '')) || 0;
};

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();

  return ['inactive', 'tidak aktif', 'nonaktif', '0'].includes(status) ? 'inactive' : 'active';
};

const dummyExpedition = [
  {
    id: 1,
    code: 'EXP-001',
    name: 'Nusantara Cargo',
    service: 'Reguler Darat',
    phone: '031-7788-1200',
    province: 'Jawa Timur',
    city: 'Surabaya',
    district: 'Tandes',
    subdistrict: 'Tandes',
    village: '',
    leadTime: '3-4 days',
    basePrice: 12000,
    perKg: 3100,
    status: 'active'
  },
  {
    id: 2,
    code: 'EXP-002',
    name: 'Laju Express',
    service: 'Ekonomi',
    phone: '021-4412-8800',
    province: 'DKI Jakarta',
    city: 'Jakarta',
    district: '',
    subdistrict: '',
    village: '',
    leadTime: '4-5 hari',
    basePrice: 9000,
    perKg: 3600,
    status: 'active'
  },
  {
    id: 3,
    code: 'EXP-003',
    name: 'Samudra Logistik',
    service: 'Cargo Laut',
    phone: '024-5521-9800',
    province: 'Jawa Tengah',
    city: 'Semarang',
    district: '',
    subdistrict: '',
    village: '',
    leadTime: '5-7 hari',
    basePrice: 15000,
    perKg: 2600,
    status: 'inactive'
  },
  {
    id: 4,
    code: 'EXP-004',
    name: 'Kilatan Kurir',
    service: 'Express',
    phone: '022-8866-1240',
    province: 'Jawa Barat',
    city: 'Bandung',
    district: '',
    subdistrict: '',
    village: '',
    leadTime: '1-2 hari',
    basePrice: 25000,
    perKg: 5200,
    status: 'active'
  }
];

export default function MasterExpedition() {
  const { showAlert } = useAlert();
  const uploadInputRef = useRef(null);
  const [dataSource, setDataSource] = useState(dummyExpedition);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const provinceOptions = wilayahIndonesia.propinsi || [];
  const selectedProvince = provinceOptions.find((item) => item.kode === form.provinceCode);
  const cityOptions = selectedProvince?.kota_kabupaten || [];
  const selectedCity = cityOptions.find((item) => item.kode === form.cityCode);
  const districtOptions = selectedCity?.kecamatan || [];
  const selectedDistrict = districtOptions.find((item) => item.kode === form.districtCode);
  const subdistrictOptions = selectedDistrict?.kelurahan || [];
  const villageOptions = selectedDistrict?.desa || [];
  const isLocationComplete = Boolean(form.provinceCode && form.cityCode && form.districtCode && (form.subdistrictName || form.villageName));
  const provinceSelectOptions = provinceOptions.map((item) => ({ value: item.kode, label: item.nama }));
  const citySelectOptions = cityOptions.map((item) => ({
    value: item.kode,
    label: `${item.tipe === 'Kota' ? 'City' : 'Regency'} ${item.nama.replace(/^(Kota|Kabupaten)\s+/i, '')}`
  }));
  const districtSelectOptions = districtOptions.map((item) => ({ value: item.kode, label: item.nama }));
  const subdistrictSelectOptions = subdistrictOptions.map((item) => ({ value: item, label: item }));
  const villageSelectOptions = villageOptions.map((item) => ({ value: item, label: item }));
  const selectedProvinceOption = provinceSelectOptions.find((item) => item.value === form.provinceCode) || null;
  const selectedCityOption = citySelectOptions.find((item) => item.value === form.cityCode) || null;
  const selectedDistrictOption = districtSelectOptions.find((item) => item.value === form.districtCode) || null;
  const selectedSubdistrictOption = subdistrictSelectOptions.find((item) => item.value === form.subdistrictName) || null;
  const selectedVillageOption = villageSelectOptions.find((item) => item.value === form.villageName) || null;

  const filteredData = useMemo(() => {
    const keyword = keywords.trim().toLowerCase();

    return dataSource.filter((item) => {
      const matchKeyword =
        !keyword ||
        [item.code, item.name, item.service, item.phone, item.province, item.city, item.district, item.subdistrict, item.village].some((value) =>
          String(value || '').toLowerCase().includes(keyword)
        );
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

  const handleProvinceChange = (option) => {
    setForm((current) => ({
      ...current,
      provinceCode: option?.value || '',
      cityCode: '',
      districtCode: '',
      subdistrictName: '',
      villageName: '',
      city: ''
    }));
  };

  const handleCityChange = (option) => {
    const nextCity = cityOptions.find((item) => item.kode === option?.value);

    setForm((current) => ({
      ...current,
      cityCode: option?.value || '',
      districtCode: '',
      subdistrictName: '',
      villageName: '',
      city: nextCity?.nama || ''
    }));
  };

  const handleDistrictChange = (option) => {
    setForm((current) => ({
      ...current,
      districtCode: option?.value || '',
      subdistrictName: '',
      villageName: ''
    }));
  };

  const handleSubdistrictChange = (option) => {
    setForm((current) => ({
      ...current,
      subdistrictName: option?.value || '',
      villageName: ''
    }));
  };

  const handleVillageChange = (option) => {
    setForm((current) => ({
      ...current,
      subdistrictName: '',
      villageName: option?.value || ''
    }));
  };

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const handleOpenForm = () => {
    setForm({
      ...initialForm,
      code: `EXP-${String(dataSource.length + 1).padStart(3, '0')}`
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(initialForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setDataSource((current) => [
      {
        ...form,
        id: Date.now(),
        province: selectedProvince?.nama || '',
        city: selectedCity?.nama || form.city,
        district: selectedDistrict?.nama || '',
        subdistrict: form.subdistrictName,
        village: form.villageName,
        basePrice: Number(form.basePrice || 0),
        perKg: Number(form.perKg || 0)
      },
      ...current
    ]);
    setCurrentPage(1);
    handleCloseForm();
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
          const name = String(getExcelValue(row, ['nama', 'nama_ekspedisi', 'name'])).trim();
          const service = String(getExcelValue(row, ['layanan', 'service'])).trim();

          if (!name || !service) return null;

          return {
            id: Date.now() + index,
            code: String(getExcelValue(row, ['kode', 'kode_ekspedisi', 'code'])).trim() || `EXP-UP-${String(index + 1).padStart(3, '0')}`,
            name,
            service,
            phone: String(getExcelValue(row, ['telepon', 'no_telepon', 'phone'])).trim(),
            province: String(getExcelValue(row, ['propinsi', 'provinsi', 'province'])).trim(),
            city: String(getExcelValue(row, ['kota_kabupaten', 'kota', 'kabupaten', 'city'])).trim(),
            district: String(getExcelValue(row, ['kecamatan', 'district'])).trim(),
            subdistrict: String(getExcelValue(row, ['kelurahan', 'subdistrict'])).trim(),
            village: String(getExcelValue(row, ['desa', 'village'])).trim(),
            leadTime: String(getExcelValue(row, ['estimasi', 'estimasi_pengiriman', 'lead_time'])).trim(),
            basePrice: toNumber(getExcelValue(row, ['tarif_dasar', 'base_price'])),
            perKg: toNumber(getExcelValue(row, ['tarif_per_kg', 'tarif_kg', 'per_kg'])),
            status: normalizeStatus(getExcelValue(row, ['status']))
          };
        })
        .filter(Boolean);

      if (importedData.length === 0) {
        showAlert('No valid data found. At minimum, fill in the name and service columns.', 'danger');
        return;
      }

      setDataSource((current) => [...importedData, ...current]);
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
                  placeholder="Code, name, service, phone, or area"
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
                <th style={{ minWidth: 160 }}>Service</th>
                <th style={{ minWidth: 150 }}>Phone No.</th>
                <th style={{ minWidth: 150 }}>Province</th>
                <th style={{ minWidth: 150 }}>City/Regency</th>
                <th style={{ minWidth: 150 }}>District</th>
                <th style={{ minWidth: 150 }}>Subdistrict/Village</th>
                <th style={{ minWidth: 120 }}>Estimate</th>
                <th style={{ minWidth: 130 }}>Base Rate</th>
                <th style={{ minWidth: 130 }}>Rate / Kg</th>
                <th style={{ minWidth: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.code}</td>
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.name}</td>
                    <td>{item.service}</td>
                    <td>{item.phone}</td>
                    <td>{item.province || '-'}</td>
                    <td>{item.city || '-'}</td>
                    <td>{item.district || '-'}</td>
                    <td>{item.subdistrict || item.village || '-'}</td>
                    <td>{item.leadTime}</td>
                    <td>{currency(item.basePrice)}</td>
                    <td>{currency(item.perKg)}</td>
                    <td>
                      {item.status === 'active' ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12}>
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
                  <Form.Control value={form.code} onChange={handleChange('code')} placeholder="EXP-001" required />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Expedition Name</Form.Label>
                  <Form.Control value={form.name} onChange={handleChange('name')} placeholder="Expedition company name" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Service</Form.Label>
                  <Form.Control value={form.service} onChange={handleChange('service')} placeholder="Regular, Express, Sea Cargo" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone No.</Form.Label>
                  <Form.Control value={form.phone} onChange={handleChange('phone')} placeholder="021-0000-0000" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Province</Form.Label>
                  <Select
                    classNamePrefix="react-select"
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
                    isDisabled={!form.provinceCode || citySelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'City/regency not found'}
                    onChange={handleCityChange}
                    options={citySelectOptions}
                    placeholder={citySelectOptions.length > 0 ? 'Search city/regency' : 'City/regency data is not available yet'}
                    styles={selectStyles}
                    value={selectedCityOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>District</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.cityCode || districtSelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'District not found'}
                    onChange={handleDistrictChange}
                    options={districtSelectOptions}
                    placeholder={districtSelectOptions.length > 0 ? 'Search district' : 'District data is not available yet'}
                    styles={selectStyles}
                    value={selectedDistrictOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Subdistrict</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.districtCode || subdistrictSelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Subdistrict not found'}
                    onChange={handleSubdistrictChange}
                    options={subdistrictSelectOptions}
                    placeholder={subdistrictSelectOptions.length > 0 ? 'Search subdistrict' : 'Subdistrict data is not available'}
                    styles={selectStyles}
                    value={selectedSubdistrictOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Village</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.districtCode || villageSelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Village not found'}
                    onChange={handleVillageChange}
                    options={villageSelectOptions}
                    placeholder={villageSelectOptions.length > 0 ? 'Search village' : 'Village data is not available'}
                    styles={selectStyles}
                    value={selectedVillageOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Estimate Pengiriman</Form.Label>
                  <Form.Control value={form.leadTime} onChange={handleChange('leadTime')} placeholder="3-4 days" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Base Rate</Form.Label>
                  <Form.Control min={0} type="number" value={form.basePrice} onChange={handleChange('basePrice')} placeholder="12000" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Rate / Kg</Form.Label>
                  <Form.Control min={0} type="number" value={form.perKg} onChange={handleChange('perKg')} placeholder="3100" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={form.status} onChange={handleChange('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="danger" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!isLocationComplete}>
              <i className="ti ti-device-floppy me-1" />
              Save
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
                    <p className="text-muted mb-2">The first row is used as the header. At minimum, fill in the name and service columns.</p>
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
