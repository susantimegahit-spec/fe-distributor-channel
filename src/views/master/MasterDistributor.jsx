import { useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Pagination from 'react-bootstrap/Pagination';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import LoaderData from '../../components/LoaderData';
import DistributorServices from '../../services/DistributorServices';
import { useAlert } from '../../utils/alertContext';

export default function MasterDistributor() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);

    if (keywords) {
      const delayTimer = setTimeout(() => {
        fetchData();
      }, 700);

      return () => clearTimeout(delayTimer);
    }

    fetchData();
  }, [keywords]);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await DistributorServices.getAllDistributor(keywords);
    if (response.data.success) {
      setDataSource(response.data.data);
      setLoadingData(false);
    } else {
      setLoadingData(false);
      showAlert('Gagal ambil data', 'danger');
    }
  };

  const syncData = async () => {
    setLoadingData(true);
    const response = await DistributorServices.syncDistributor();
    if (response.data.success) {
      showAlert('Data distributor berhasil disinkronkan', 'success');
      fetchData();
    } else {
      showAlert(response.data.message, 'danger');
      fetchData();
    }
  };

  const filteredData = useMemo(() => {
    if (!selectedStatus) return dataSource;

    return dataSource.filter((item) => String(item.status) === selectedStatus);
  }, [dataSource, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.status === 1).length,
      inactive: dataSource.filter((item) => item.status !== 1).length,
      depo: new Set(dataSource.map((item) => item.depo).filter(Boolean)).size
    }),
    [dataSource]
  );

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
  };

  const hasActiveFilter = Boolean(keywords || selectedStatus);

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Data Distributor</h5>
              <span className="text-muted f-12">Kelola dan sinkronkan data distributor dari sistem pusat.</span>
            </Stack>
          }
          secondary={
            <Button onClick={syncData} variant="primary" disabled={loadingData}>
              <i className="ti ti-refresh me-1" />
              Synchronize
            </Button>
          }
        >
          <Row className="g-3">
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Distributor</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-building-store" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
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
            <Col sm={6} xl={3}>
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
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Depo</div>
                      <h4 className="mb-0">{summary.depo}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-warning text-warning">
                      <i className="ti ti-map-pin" />
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
              <Form.Label className="f-12 text-muted">Cari Distributor</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  type="text"
                  placeholder="Kode, nama, telepon, atau depo"
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">Semua Status</option>
                <option value="1">Aktif</option>
                <option value="0">Tidak Aktif</option>
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
            {loadingData ? (
              <tbody>
                <tr>
                  <td>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 130 }}>Kode</th>
                    <th style={{ minWidth: 220 }}>Nama Distributor</th>
                    <th style={{ minWidth: 150 }}>No. Telepon</th>
                    <th style={{ minWidth: 140 }}>Depo</th>
                    <th style={{ minWidth: 320 }}>Alamat</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th className="text-center" style={{ width: 80 }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr key={item.id || item.code_customer}>
                        <td className="fw-semibold">{item.code_customer || '-'}</td>
                        <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.name || '-'}</td>
                        <td>{item.phone || '-'}</td>
                        <td>{item.depo || '-'}</td>
                        <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.address || '-'}</td>
                        <td>
                          {item.status === 1 ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}
                        </td>
                        <td className="text-center">
                          <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => setSelectedDistributor(item)}>
                            <i className="ti ti-eye" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-building-store f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'Distributor tidak ditemukan' : 'Belum ada data distributor'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter
                              ? 'Ubah kata kunci atau status untuk melihat data lain.'
                              : 'Gunakan synchronize untuk mengambil data distributor terbaru.'}
                          </p>
                          {hasActiveFilter ? (
                            <Button variant="light-primary" onClick={resetFilters}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button variant="primary" onClick={syncData}>
                              <i className="ti ti-refresh me-1" />
                              Synchronize
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </Table>

          <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-between mt-3">
            <small className="text-muted">
              Menampilkan {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} distributor
            </small>
            <Pagination className="mb-0">
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} />
              {Array.from({ length: pageCount }).map((_, index) => {
                const page = index + 1;

                return (
                  <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
                    {page}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => Math.min(page + 1, pageCount))} />
            </Pagination>
          </Stack>
        </MainCard>
      </Stack>

      <Modal show={Boolean(selectedDistributor)} onHide={() => setSelectedDistributor(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detail Distributor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDistributor && (
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Kode Customer</Form.Label>
                <div className="fw-semibold">{selectedDistributor.code_customer || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Status</Form.Label>
                <div>
                  {selectedDistributor.status === 1 ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}
                </div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Nama Distributor</Form.Label>
                <div>{selectedDistributor.name || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">No. Telepon</Form.Label>
                <div>{selectedDistributor.phone || '-'}</div>
              </Col>
              <Col md={6}>
                <Form.Label className="f-12 text-muted">Depo</Form.Label>
                <div>{selectedDistributor.depo || '-'}</div>
              </Col>
              <Col md={12}>
                <Form.Label className="f-12 text-muted">Alamat</Form.Label>
                <div>{selectedDistributor.address || '-'}</div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedDistributor(null)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
