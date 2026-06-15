import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LoaderData from '../../components/LoaderData';
import ProductServices from '../../services/ProductServices';
import PromoServices from '../../services/PromoServices';
import { useAlert } from '../../utils/alertContext';

const pageSize = 10;

const initialPromoInput = {
  program_name: '',
  items: [],
  start_date: '',
  end_date: '',
  description: ''
};

const initialPromoRules = [
  {
    customer_type: 'GT',
    min_qty_kg: '',
    max_qty_kg: '',
    harga_promo_per_kg: '',
    disckon_per_kg: ''
  }
];

const selectStyles = {
  control: (provided) => ({
    ...provided,
    minHeight: '38px'
  }),
  valueContainer: (provided) => ({
    ...provided,
    paddingTop: 0,
    paddingBottom: 0
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 1060
  })
};

const statusVariant = {
  active: 'success',
  inactive: 'secondary'
};

const statusLabel = {
  active: 'Aktif',
  inactive: 'Tidak Aktif'
};

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const normalizeList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

const normalizeStatus = (value) => {
  const status = String(value ?? 'active').toLowerCase();

  if (['0', 'inactive', 'nonaktif', 'tidak aktif'].includes(status)) return 'inactive';

  return 'active';
};

const getProgramItems = (program) => {
  const items = program.items || program.item || program.products || program.program_items || [];
  const normalizedItems = Array.isArray(items) ? items : [items];

  return normalizedItems.filter(Boolean).map((item) => {
    if (typeof item === 'string') {
      return {
        value: item,
        label: item
      };
    }

    const itemCode = item.item_code || item.itemCode || item.code || item.value || '';
    const itemName = item.item_name || item.itemName || item.name || item.label || '';

    return {
      value: itemCode || itemName,
      label: item.label || (itemCode ? `${itemCode} - ${itemName || '-'}` : itemName || '-'),
      item
    };
  });
};

const normalizePromo = (program, index) => ({
  id: program.id || program.program_id || index,
  program_name: program.program_name || program.name || '',
  items: getProgramItems(program),
  start_date: program.start_date || program.startDate || '',
  end_date: program.end_date || program.endDate || '',
  description: program.description || program.keterangan || '',
  status: normalizeStatus(program.status),
  rules: program.details || program.rules || program.program_details || []
});

export default function MasterPromo() {
  const { showAlert } = useAlert();
  const [promoPrograms, setPromoPrograms] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [promoInput, setPromoInput] = useState(initialPromoInput);
  const [promoRules, setPromoRules] = useState(initialPromoRules);
  const [listItem, setListItem] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPromos = useCallback(async () => {
    setLoadingData(true);

    try {
      const response = await PromoServices.getAllPromo();
      const promos = normalizeList(response).map((program, index) => normalizePromo(program, index));

      setPromoPrograms(promos);
      setCurrentPage(1);
    } catch (error) {
      showAlert(error?.message || 'Gagal ambil data program promo', 'danger');
    } finally {
      setLoadingData(false);
    }
  }, [showAlert]);

  const fetchItems = useCallback(async () => {
    setLoadingOptions(true);

    try {
      const response = await ProductServices.getAllProduct('');
      const options = normalizeList(response).map((item) => {
        const itemCode = item.item_code || item.code || item.itemCode || '';
        const itemName = item.item_name || item.name || item.itemName || '';

        return {
          value: itemCode,
          label: itemCode ? `${itemCode} - ${itemName || '-'}` : itemName || '-',
          item
        };
      });

      setListItem(options);
    } catch (error) {
      showAlert(error?.message || 'Gagal ambil data item', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchPromos();
    fetchItems();
  }, [fetchItems, fetchPromos]);

  const pageCount = Math.max(Math.ceil(promoPrograms.length / pageSize), 1);
  const paginatedPromos = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return promoPrograms.slice(startIndex, startIndex + pageSize);
  }, [promoPrograms, currentPage]);

  const resetPromoForm = () => {
    setPromoInput(initialPromoInput);
    setPromoRules(initialPromoRules);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetPromoForm();
  };

  const handleChangePromoInput = (field, value) => {
    setPromoInput((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChangeRule = (index, field, value) => {
    setPromoRules((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const addRule = () => {
    setPromoRules((prev) => [...prev, { ...initialPromoRules[0] }]);
  };

  const removeRule = (index) => {
    setPromoRules((prev) => (prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));
  };

  const handleSubmitPromo = async () => {
    if (!promoInput.program_name || !promoInput.items.length || !promoInput.start_date || !promoInput.end_date) {
      showAlert('Nama program, item, start date, dan end date wajib diisi', 'danger');
      return;
    }

    const hasInvalidRule = promoRules.some(
      (item) =>
        !item.customer_type ||
        item.min_qty_kg === '' ||
        item.max_qty_kg === '' ||
        item.harga_promo_per_kg === '' ||
        item.disckon_per_kg === ''
    );

    if (hasInvalidRule) {
      showAlert('Lengkapi semua detail aturan promo', 'danger');
      return;
    }

    const payload = {
      program_name: promoInput.program_name,
      item_name: promoInput.items.map((item) => item.label),
      item_code: promoInput.items.map((item) => item.value),
      items: promoInput.items.map((item) => ({
        item_code: item.value,
        item_name: item.item?.item_name || item.item?.name || item.label
      })),
      start_date: promoInput.start_date,
      end_date: promoInput.end_date,
      description: promoInput.description,
      details: promoRules.map((item) => ({
        customer_type: item.customer_type,
        min_qty_kg: Number(item.min_qty_kg),
        max_qty_kg: Number(item.max_qty_kg),
        harga_promo_per_kg: Number(item.harga_promo_per_kg),
        disckon_per_kg: Number(item.disckon_per_kg)
      }))
    };

    setSubmittingPromo(true);

    try {
      const response = await PromoServices.postPromo(payload);

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Gagal menambahkan program promo', 'danger');
        return;
      }

      await fetchPromos();
      handleCloseModal();
      showAlert(response?.data?.message || 'Program promo berhasil ditambahkan', 'success');
    } catch (error) {
      showAlert(error?.message || 'Gagal menambahkan program promo', 'danger');
    } finally {
      setSubmittingPromo(false);
    }
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Program Promo</h5>
              <span className="text-muted f-12">Kelola program promo berdasarkan item, periode, dan aturan quantity customer.</span>
            </Stack>
          }
          secondary={
            <Button variant="primary" onClick={() => setShowAddModal(true)} disabled={loadingData}>
              <i className="ti ti-plus me-1" />
              Tambah Program
            </Button>
          }
        >
          <Row className="g-3">
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Program</div>
                      <h4 className="mb-0">{promoPrograms.length}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-discount-2" />
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
                      <div className="text-muted f-12">Program Aktif</div>
                      <h4 className="mb-0">{promoPrograms.filter((item) => item.status === 'active').length}</h4>
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
                      <div className="text-muted f-12">Total Item Promo</div>
                      <h4 className="mb-0">{promoPrograms.reduce((total, item) => total + (item.items?.length || 0), 0)}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-orange text-orange">
                      <i className="ti ti-package" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </MainCard>

        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">List Program Promo</h5>
              <span className="text-muted f-12">Daftar program promo yang sudah dibuat.</span>
            </Stack>
          }
        >
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Nama Program</th>
                <th style={{ minWidth: 190 }}>Periode</th>
                <th style={{ minWidth: 260 }}>Item</th>
                <th style={{ minWidth: 240 }}>Keterangan</th>
                <th style={{ minWidth: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={5}>
                    <LoaderData />
                  </td>
                </tr>
              ) : paginatedPromos.length ? (
                paginatedPromos.map((program) => {
                  const programItems = program.items || [];

                  return (
                    <tr key={program.id}>
                      <td className="fw-semibold">{program.program_name || '-'}</td>
                      <td>
                        {formatDate(program.start_date)} - {formatDate(program.end_date)}
                      </td>
                      <td>
                        {programItems.length ? (
                          <Stack gap={1}>
                            {programItems.slice(0, 2).map((item) => (
                              <span key={item.value}>{item.label}</span>
                            ))}
                            {programItems.length > 2 && <small className="text-muted">+{programItems.length - 2} item lainnya</small>}
                          </Stack>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{program.description || '-'}</td>
                      <td>
                        <Badge bg={statusVariant[program.status] || 'secondary'}>{statusLabel[program.status] || program.status}</Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="text-center py-5">
                      <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                        <i className="ti ti-discount-2 f-24" />
                      </div>
                      <h5 className="mb-1">Belum ada program promo</h5>
                      <p className="text-muted mb-3">Tambahkan program promo untuk mengatur harga dan diskon per customer type.</p>
                      <Button variant="primary" onClick={() => setShowAddModal(true)}>
                        <i className="ti ti-plus me-1" />
                        Tambah Program
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
            total={promoPrograms.length}
            itemLabel="program"
          />
        </MainCard>
      </Stack>

      <Modal show={showAddModal} onHide={handleCloseModal} size="xl" centered fullscreen="lg-down">
        <Modal.Header closeButton>
          <Modal.Title>Tambah Program Promo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Program Name</Form.Label>
                    <Form.Control
                      value={promoInput.program_name}
                      onChange={(event) => handleChangePromoInput('program_name', event.target.value)}
                      placeholder="Masukkan nama program promo"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Item Name</Form.Label>
                    <Select
                      isMulti
                      isLoading={loadingOptions}
                      styles={selectStyles}
                      value={promoInput.items}
                      options={listItem}
                      menuPosition="fixed"
                      onChange={(value) => handleChangePromoInput('items', value || [])}
                      placeholder="Pilih item promo"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="f-12 text-muted">Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={promoInput.start_date}
                      onChange={(event) => handleChangePromoInput('start_date', event.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="f-12 text-muted">End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={promoInput.end_date}
                      onChange={(event) => handleChangePromoInput('end_date', event.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={promoInput.description}
                      onChange={(event) => handleChangePromoInput('description', event.target.value)}
                      placeholder="Tambahkan keterangan program"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border mb-0">
              <Card.Header className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <h6 className="mb-0">Detail Aturan Promo</h6>
                    <small className="text-muted">Atur range quantity dan nilai harga promo per customer type.</small>
                  </div>
                  <Button variant="light-primary" onClick={addRule}>
                    <i className="ti ti-plus me-1" />
                    Tambah Baris
                  </Button>
                </Stack>
              </Card.Header>
              <Card.Body className="p-0">
                <Table className="mb-0 align-middle" responsive hover>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 150 }}>Customer Type</th>
                      <th style={{ minWidth: 140 }}>Min Qty Kg</th>
                      <th style={{ minWidth: 140 }}>Max Qty Kg</th>
                      <th style={{ minWidth: 180 }}>Harga Promo / Kg</th>
                      <th style={{ minWidth: 160 }}>Diskon / Kg</th>
                      {/* <th style={{ minWidth: 160 }}>Estimasi Net</th> */}
                      <th className="text-center" style={{ width: 72 }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoRules.map((rule, index) => {
                      const estimatedNet = Number(rule.harga_promo_per_kg || 0) - Number(rule.disckon_per_kg || 0);

                      return (
                        <tr key={index}>
                          <td>
                            <Form.Select
                              value={rule.customer_type}
                              onChange={(event) => handleChangeRule(index, 'customer_type', event.target.value)}
                              size="sm"
                            >
                              <option value="GT">GT</option>
                              <option value="MT">MT</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.min_qty_kg}
                              onChange={(event) => handleChangeRule(index, 'min_qty_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.max_qty_kg}
                              onChange={(event) => handleChangeRule(index, 'max_qty_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.harga_promo_per_kg}
                              onChange={(event) => handleChangeRule(index, 'harga_promo_per_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.disckon_per_kg}
                              onChange={(event) => handleChangeRule(index, 'disckon_per_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          {/* <td className="fw-semibold">{formatCurrency(Math.max(estimatedNet, 0))}</td> */}
                          <td className="text-center">
                            <Button
                              className="rounded-circle"
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeRule(index)}
                              disabled={promoRules.length === 1}
                            >
                              <i className="ti ti-trash" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseModal}>
            Tutup
          </Button>
          <Button variant="primary" onClick={handleSubmitPromo} disabled={submittingPromo}>
            <i className="ti ti-device-floppy me-1" />
            {submittingPromo ? 'Menyimpan...' : 'Simpan Program'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
