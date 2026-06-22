import { useMemo, useRef, useState } from 'react';

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
import FinanceServices from '../../services/FinanceServices';
import PromoServices from '../../services/PromoServices';
import { useAlert } from '../../utils/alertContext';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';

const pageSize = 10;

const initialClaims = [
  {
    claimNo: 'CLM-2026-0001',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    distributorCode: 'D-001',
    distributorName: 'Distributor Sentral Jaya',
    rewardAmount: 100000000,
    status: 'claimed',
    sellOut: [
      { invoiceNo: 'SO-2026-05001', date: '2026-05-08', amount: 45000000 },
      { invoiceNo: 'SO-2026-05042', date: '2026-05-21', amount: 55000000 }
    ]
  },
  {
    claimNo: 'CLM-2026-0002',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    distributorCode: 'D-002',
    distributorName: 'Distributor Prima Niaga',
    rewardAmount: 100000000,
    status: 'pending',
    sellOut: [
      { invoiceNo: 'SO-2026-04012', date: '2026-04-11', amount: 40000000 },
      { invoiceNo: 'SO-2026-04071', date: '2026-04-27', amount: 60000000 }
    ]
  }
];

const statusVariant = {
  claimed: 'success',
  pending: 'warning',
  rejected: 'danger'
};

const statusLabel = {
  claimed: 'Sudah Klaim',
  pending: 'Menunggu Klaim',
  rejected: 'Ditolak'
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

export default function RewardList() {
  const { showAlert } = useAlert();
  const fileInputRef = useRef(null);
  const [claims] = useState(initialClaims);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [uploadingClaim, setUploadingClaim] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const summary = useMemo(
    () => ({
      totalClaimed: claims.filter((item) => item.status === 'claimed').reduce((total, item) => total + Number(item.rewardAmount || 0), 0),
      totalClaims: claims.length,
      claimed: claims.filter((item) => item.status === 'claimed').length,
      pending: claims.filter((item) => item.status === 'pending').length
    }),
    [claims]
  );

  const pageCount = Math.max(Math.ceil(claims.length / pageSize), 1);
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return claims.slice(startIndex, startIndex + pageSize);
  }, [claims, currentPage]);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);

    try {
      await FinanceServices.downloadRewardTemplate();
      showAlert('Template reward berhasil didownload', 'success');
    } catch (error) {
      showAlert(error?.message || 'Gagal download template reward', 'danger');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUploadTemplate = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls'].includes(extension)) {
      showAlert('Format file harus XLSX atau XLS', 'danger');
      event.target.value = '';
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    setUploadingClaim(true);

    try {
      const response = await PromoServices.uploadTransactionFile(payload);

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Gagal mengupload claim reward', 'danger');
        return;
      }

      setShowClaimModal(false);
      showAlert(response?.data?.message || 'Data claim reward berhasil diupload', 'success');
    } catch (error) {
      showAlert(error?.message || 'Gagal mengupload claim reward', 'danger');
    } finally {
      setUploadingClaim(false);
      event.target.value = '';
    }
  };

  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Reward</h5>
              <span className="text-muted f-12">Monitor transaksi claim reward dan sell out yang menjadi dasar klaim.</span>
            </Stack>
          }
          secondary={
            <Button variant="primary" onClick={() => setShowClaimModal(true)}>
              <i className="ti ti-plus me-1" />
              Tambah Claim
            </Button>
          }
        >
          <Row className="g-3">
            <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Reward Claimed</div>
                      <h4 className="mb-0">{formatCurrency(summary.totalClaimed)}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-success text-success">
                      <i className="ti ti-cash" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Transaksi Claim</div>
                      <h4 className="mb-0">{summary.totalClaims}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-receipt-2" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Sudah Klaim</div>
                      <h4 className="mb-0">{summary.claimed}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-success text-success">
                      <i className="ti ti-circle-check" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Menunggu Klaim</div>
                      <h4 className="mb-0">{summary.pending}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-warning text-warning">
                      <i className="ti ti-clock-hour-4" />
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
              <h5 className="mb-0">Transaksi Claim</h5>
              <span className="text-muted f-12">Gunakan tombol detail untuk melihat transaksi sell out dari parent claim.</span>
            </Stack>
          }
        >
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th style={{ minWidth: 170 }}>No. Claim</th>
                <th style={{ minWidth: 220 }}>Distributor</th>
                <th style={{ minWidth: 190 }}>Periode</th>
                <th style={{ minWidth: 160 }}>Nominal Reward</th>
                <th style={{ minWidth: 120 }}>Status</th>
                <th className="text-center" style={{ width: 90 }}>
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedClaims.length > 0 ? (
                paginatedClaims.map((claim) => (
                  <tr key={claim.claimNo}>
                    <td className="fw-semibold">{claim.claimNo}</td>
                    <td>
                      <div className="fw-semibold">{claim.distributorName || '-'}</div>
                      <small className="text-muted">{claim.distributorCode || '-'}</small>
                    </td>
                    <td>
                      {formatDate(claim.periodStart)} - {formatDate(claim.periodEnd)}
                    </td>
                    <td>{formatCurrency(claim.rewardAmount)}</td>
                    <td>
                      <Badge bg={statusVariant[claim.status] || 'secondary'}>{statusLabel[claim.status] || claim.status}</Badge>
                    </td>
                    <td className="text-center">
                      <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => setSelectedClaim(claim)}>
                        <i className="ti ti-list-search" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="text-center py-5">
                      <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                        <i className="ti ti-gift f-24" />
                      </div>
                      <h5 className="mb-1">Belum ada transaksi claim</h5>
                      <p className="text-muted mb-3">Upload template Excel untuk menambahkan data claim reward.</p>
                      <Button variant="primary" onClick={() => setShowClaimModal(true)}>
                        <i className="ti ti-plus me-1" />
                        Tambah Claim
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
            total={claims.length}
            itemLabel="claim"
          />
        </MainCard>
      </Stack>

      <Modal
        show={showClaimModal}
        onHide={() => {
          if (!uploadingClaim) handleCloseClaimModal();
        }}
        size="xl"
        centered
        fullscreen
      >
        <Modal.Header closeButton>
          <Modal.Title>Tambah Claim Reward</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col lg={5}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <div className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ti ti-file-spreadsheet f-24" />
                  </div>
                  <h6 className="mb-1">Import Claim dari Excel</h6>
                  <p className="text-muted mb-0">
                    Download template, lengkapi transaksi claim beserta sell out, lalu upload kembali file Excel tersebut.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <Stack gap={3}>
                <Card className="border mb-0">
                  <Card.Body>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                      <span className="avtar avtar-s bg-light-primary text-primary">
                        <i className="ti ti-download" />
                      </span>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">Download Template</h6>
                        <p className="text-muted mb-3">Gunakan format ini agar data claim dan transaksi sell out terbaca otomatis.</p>
                        <Button variant="light-primary" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
                          <i className="ti ti-download me-1" />
                          {downloadingTemplate ? 'Menyiapkan...' : 'Download Template'}
                        </Button>
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>

                <Card className="border mb-0">
                  <Card.Body>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                      <span className="avtar avtar-s bg-light-success text-success">
                        <i className="ti ti-upload" />
                      </span>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">Upload File Claim</h6>
                        <p className="text-muted mb-3">
                          Upload file `.xlsx` atau `.xls` yang sudah diisi untuk menambahkan transaksi claim.
                        </p>
                        <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploadingClaim}>
                          <i className={`${uploadingClaim ? 'ti ti-loader-2' : 'ti ti-upload'} me-1`} />
                          {uploadingClaim ? 'Mengupload...' : 'Pilih & Upload Excel'}
                        </Button>
                        <Form.Control
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="d-none"
                          onChange={handleUploadTemplate}
                        />
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>
              </Stack>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseClaimModal} disabled={uploadingClaim}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedClaim)} onHide={() => setSelectedClaim(null)} size="xl" centered fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Detail Claim Reward</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClaim && (
            <Stack gap={3}>
              <Card className="border mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="align-items-start">
                    <div className="avtar avtar-xl bg-light-primary text-primary">
                      <i className="ti ti-file-spreadsheet f-24" />
                    </div>
                    <div className="flex-grow-1">
                      <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{selectedClaim.claimNo}</h6>
                          <p className="text-muted mb-0">Detail claim reward beserta transaksi sell out yang menjadi dasar klaim.</p>
                        </div>
                        <Badge bg={statusVariant[selectedClaim.status] || 'secondary'}>
                          {statusLabel[selectedClaim.status] || selectedClaim.status}
                        </Badge>
                      </Stack>

                      <Row className="g-3 mt-1">
                        <Col md={4}>
                          <Form.Label className="f-12 text-muted">Distributor</Form.Label>
                          <div className="fw-semibold">{selectedClaim.distributorName || '-'}</div>
                          <small className="text-muted">{selectedClaim.distributorCode || '-'}</small>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="f-12 text-muted">Periode</Form.Label>
                          <div className="fw-semibold">
                            {formatDate(selectedClaim.periodStart)} - {formatDate(selectedClaim.periodEnd)}
                          </div>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="f-12 text-muted">Reward</Form.Label>
                          <div className="fw-semibold text-primary">{formatCurrency(selectedClaim.rewardAmount)}</div>
                        </Col>
                      </Row>
                    </div>
                  </Stack>
                </Card.Body>
              </Card>

              <Card className="border mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="mb-1">Transaksi Sell Out</h6>
                      <p className="text-muted mb-0">Daftar transaksi sell out dari parent claim yang dipilih.</p>
                    </div>
                    <Badge bg={selectedClaim.sellOut?.length ? 'primary' : 'secondary'}>
                      {selectedClaim.sellOut?.length || 0} transaksi
                    </Badge>
                  </Stack>

                  <Table className="mb-0 align-middle" responsive hover>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 150 }}>No. Claim</th>
                        <th style={{ minWidth: 210 }}>Distributor</th>
                        <th style={{ minWidth: 150 }}>Kode Item</th>
                        <th style={{ minWidth: 220 }}>Nama Item</th>
                        <th style={{ minWidth: 140 }}>Tipe Customer</th>
                        <th style={{ minWidth: 130 }}>Tanggal</th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Nominal Sell Out
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Reward
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClaim.sellOut?.length ? (
                        selectedClaim.sellOut.map((transaction, index) => (
                          <tr key={`${selectedClaim.claimNo}-${transaction.invoiceNo}-${index}`}>
                            <td className="fw-semibold">{selectedClaim.claimNo}</td>
                            <td>
                              <div className="fw-semibold">{selectedClaim.distributorName || '-'}</div>
                              <small className="text-muted">{selectedClaim.distributorCode || '-'}</small>
                            </td>
                            <td>{transaction.invoiceNo || '-'}</td>
                            <td>{transaction.itemName || '-'}</td>
                            <td>{transaction.customerType || '-'}</td>
                            <td>{formatDate(transaction.date)}</td>
                            <td className="text-end">{formatCurrency(transaction.amount)}</td>
                            <td className="text-end">{formatCurrency(selectedClaim.rewardAmount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8}>
                            <div className="text-center py-4">
                              <div className="avtar avtar-lg bg-light-primary text-primary mx-auto mb-2">
                                <i className="ti ti-table-import f-20" />
                              </div>
                              <h6 className="mb-1">Tidak ada transaksi sell out</h6>
                              <p className="text-muted mb-0">Claim ini belum memiliki transaksi sell out.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Stack>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedClaim(null)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
