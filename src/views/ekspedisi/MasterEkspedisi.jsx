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
import wilayahIndonesia from '../../data/wilayah-indonesia.json';
import { useAlert } from '../../utils/alertContext';
import { currency } from '../../utils/global';

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

const dummyEkspedisi = [
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
    leadTime: '3-4 hari',
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

export default function MasterEkspedisi() {
  const { showAlert } = useAlert();
  const uploadInputRef = useRef(null);
  const [dataSource, setDataSource] = useState(dummyEkspedisi);
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
    label: `${item.tipe} ${item.nama.replace(/^(Kota|Kabupaten)\s+/i, '')}`
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
      showAlert('Format file harus XLSX atau XLS', 'danger');
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
        showAlert('Tidak ada data valid. Minimal isi kolom nama dan layanan.', 'danger');
        return;
      }

      setDataSource((current) => [...importedData, ...current]);
      setCurrentPage(1);
      setShowUpload(false);
      showAlert(`${importedData.length} data ekspedisi berhasil diimport`, 'success');
    } catch (error) {
      showAlert(error?.message || 'Gagal membaca file Excel', 'danger');
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
              <h5 className="mb-0">Master Ekspedisi</h5>
              <span className="text-muted f-12">Kelola daftar ekspedisi, layanan, dan tarif dasar pengiriman.</span>
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
                Tambah
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
                      <div className="text-muted f-12">Total Ekspedisi</div>
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
                      <div className="text-muted f-12">Aktif</div>
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
                      <div className="text-muted f-12">Tidak Aktif</div>
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
              <Form.Label className="f-12 text-muted">Cari Ekspedisi</Form.Label>
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
                  placeholder="Kode, nama, layanan, telepon, atau wilayah"
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
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh me-1" />
                Reset
              </Button>
            </Col>
            <Col lg={2} md={6} className="text-lg-end">
              <span className="text-muted f-12">Menampilkan</span>
              <div className="fw-semibold">
                {filteredData.length} dari {dataSource.length}
              </div>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>Kode</th>
                <th style={{ minWidth: 220 }}>Nama Ekspedisi</th>
                <th style={{ minWidth: 160 }}>Layanan</th>
                <th style={{ minWidth: 150 }}>No. Telepon</th>
                <th style={{ minWidth: 150 }}>Propinsi</th>
                <th style={{ minWidth: 150 }}>Kota/Kabupaten</th>
                <th style={{ minWidth: 150 }}>Kecamatan</th>
                <th style={{ minWidth: 150 }}>Kelurahan/Desa</th>
                <th style={{ minWidth: 120 }}>Estimasi</th>
                <th style={{ minWidth: 130 }}>Tarif Dasar</th>
                <th style={{ minWidth: 130 }}>Tarif / Kg</th>
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
                      {item.status === 'active' ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}
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
                      <h5 className="mb-1">Ekspedisi tidak ditemukan</h5>
                      <p className="text-muted mb-3">Ubah kata kunci atau status untuk melihat data lain.</p>
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
            itemLabel="ekspedisi"
          />
        </MainCard>
      </Stack>

      <Modal show={showForm} onHide={handleCloseForm} centered size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Tambah Ekspedisi</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Kode Ekspedisi</Form.Label>
                  <Form.Control value={form.code} onChange={handleChange('code')} placeholder="EXP-001" required />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Nama Ekspedisi</Form.Label>
                  <Form.Control value={form.name} onChange={handleChange('name')} placeholder="Nama perusahaan ekspedisi" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Layanan</Form.Label>
                  <Form.Control value={form.service} onChange={handleChange('service')} placeholder="Reguler, Express, Cargo Laut" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>No. Telepon</Form.Label>
                  <Form.Control value={form.phone} onChange={handleChange('phone')} placeholder="021-0000-0000" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Propinsi</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Propinsi tidak ditemukan'}
                    onChange={handleProvinceChange}
                    options={provinceSelectOptions}
                    placeholder="Cari propinsi"
                    styles={selectStyles}
                    value={selectedProvinceOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kota/Kabupaten</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.provinceCode || citySelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Kota/kabupaten tidak ditemukan'}
                    onChange={handleCityChange}
                    options={citySelectOptions}
                    placeholder={citySelectOptions.length > 0 ? 'Cari kota/kabupaten' : 'Data kota/kabupaten belum tersedia'}
                    styles={selectStyles}
                    value={selectedCityOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kecamatan</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.cityCode || districtSelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Kecamatan tidak ditemukan'}
                    onChange={handleDistrictChange}
                    options={districtSelectOptions}
                    placeholder={districtSelectOptions.length > 0 ? 'Cari kecamatan' : 'Data kecamatan belum tersedia'}
                    styles={selectStyles}
                    value={selectedDistrictOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kelurahan</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.districtCode || subdistrictSelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Kelurahan tidak ditemukan'}
                    onChange={handleSubdistrictChange}
                    options={subdistrictSelectOptions}
                    placeholder={subdistrictSelectOptions.length > 0 ? 'Cari kelurahan' : 'Data kelurahan tidak tersedia'}
                    styles={selectStyles}
                    value={selectedSubdistrictOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Desa</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isDisabled={!form.districtCode || villageSelectOptions.length === 0}
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => 'Desa tidak ditemukan'}
                    onChange={handleVillageChange}
                    options={villageSelectOptions}
                    placeholder={villageSelectOptions.length > 0 ? 'Cari desa' : 'Data desa tidak tersedia'}
                    styles={selectStyles}
                    value={selectedVillageOption}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Estimasi Pengiriman</Form.Label>
                  <Form.Control value={form.leadTime} onChange={handleChange('leadTime')} placeholder="3-4 hari" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Tarif Dasar</Form.Label>
                  <Form.Control min={0} type="number" value={form.basePrice} onChange={handleChange('basePrice')} placeholder="12000" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Tarif / Kg</Form.Label>
                  <Form.Control min={0} type="number" value={form.perKg} onChange={handleChange('perKg')} placeholder="3100" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={form.status} onChange={handleChange('status')}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" onClick={handleCloseForm}>
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={!isLocationComplete}>
              <i className="ti ti-device-floppy me-1" />
              Simpan
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showUpload} onHide={() => setShowUpload(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload Data Ekspedisi</Modal.Title>
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
                    <h6 className="mb-1">Format Kolom Excel</h6>
                    <p className="text-muted mb-2">Baris pertama digunakan sebagai header. Minimal isi kolom nama dan layanan.</p>
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
              {uploadingExcel ? 'Membaca file...' : 'Pilih File Excel'}
            </Button>
            <Form.Control ref={uploadInputRef} type="file" accept=".xlsx,.xls" className="d-none" onChange={handleUploadExcel} />
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowUpload(false)} disabled={uploadingExcel}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
