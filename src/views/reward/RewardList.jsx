import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

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

const normalizeStatus = (value) => {
  const status = String(value || '').toLowerCase();

  if (['claimed', 'sudah klaim', 'claim', 'klaim'].includes(status)) return 'claimed';
  if (['rejected', 'reject', 'ditolak'].includes(status)) return 'rejected';

  return 'pending';
};

const parseNumber = (value) => {
  if (typeof value === 'number') return value;

  const normalizedValue = String(value || '')
    .replace(/[^\d,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalizedValue) || 0;
};

const buildClaimsFromRows = (rows) => {
  const grouped = new Map();

  rows.forEach((row, index) => {
    const customerCode = row['Kode Customer'] || row.customer_code || row.customerCode || row.distributor_code || row.distributorCode || '';
    const customerName = row['Nama Customer'] || row.customer_name || row.customerName || row.distributor_name || row.distributorName || '';
    const itemCode = row['Kode Item'] || row.item_code || row.itemCode || '';
    const itemName = row['Nama Item'] || row.item_name || row.itemName || '';
    const transactionDate =
      row['Transcation Date'] || row.transaction_date || row.transactionDate || row.sell_out_date || row.sellOutDate || '';
    const customerType = row['Tipe Customer'] || row.customer_type || row.customerType || '';
    const hasContent = Object.values(row).some((value) => String(value || '').trim());
    const normalizedCustomerCode = String(customerCode || '')
      .trim()
      .toLowerCase();
    const isTemplateInformationRow =
      normalizedCustomerCode === 'tipe customer di isi dengan mt/gt' ||
      normalizedCustomerCode.startsWith('*tipe customer') ||
      normalizedCustomerCode.startsWith('* untuk kode item');

    if (!hasContent) return;
    if (isTemplateInformationRow) return;

    const fallbackClaimNo = customerCode ? `CLM-${customerCode}-${transactionDate || index + 1}` : `CLM-UPLOAD-${index + 1}`;
    const claimNo = row.claim_no || row.claimNo || fallbackClaimNo;
    const templateAmount = parseNumber(row['Harga Jual (kg)']);
    const hasExplicitRewardAmount = row.reward_amount || row.rewardAmount;
    const rewardAmount = parseNumber(hasExplicitRewardAmount) || templateAmount;
    const sellOutInvoice = row.sell_out_invoice || row.sellOutInvoice || itemCode;
    const sellOutDate = transactionDate;
    const sellOutAmount = parseNumber(row.sell_out_amount || row.sellOutAmount) || templateAmount;

    if (!grouped.has(claimNo)) {
      grouped.set(claimNo, {
        claimNo,
        periodStart: row.period_start || row.periodStart || '',
        periodEnd: row.period_end || row.periodEnd || '',
        distributorCode: customerCode,
        distributorName: customerName,
        rewardAmount: 0,
        status: normalizeStatus(row.status),
        sellOut: []
      });
    }

    const claim = grouped.get(claimNo);
    claim.rewardAmount = hasExplicitRewardAmount ? rewardAmount || claim.rewardAmount : claim.rewardAmount + (rewardAmount || 0);

    if (sellOutInvoice || sellOutAmount || itemName) {
      claim.sellOut.push({
        invoiceNo: sellOutInvoice || '-',
        date: sellOutDate || '',
        amount: sellOutAmount,
        itemName,
        customerType
      });
    }
  });

  return Array.from(grouped.values());
};

export default function RewardList() {
  const { showAlert } = useAlert();
  const fileInputRef = useRef(null);
  const [claims, setClaims] = useState(initialClaims);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [uploadedClaims, setUploadedClaims] = useState([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
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

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      const uploadedClaims = buildClaimsFromRows(rows);

      if (!uploadedClaims.length) {
        showAlert('File template tidak memiliki data reward', 'danger');
        return;
      }

      setUploadedClaims(uploadedClaims);
      setUploadedFileName(file.name);
      showAlert('File reward berhasil dibaca', 'success');
    } catch (error) {
      showAlert(error?.message || 'Gagal membaca file template reward', 'danger');
    } finally {
      event.target.value = '';
    }
  };

  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    setUploadedClaims([]);
    setUploadedFileName('');
  };

  const handleSaveUploadedClaims = () => {
    if (!uploadedClaims.length) {
      showAlert('Upload file reward terlebih dahulu', 'danger');
      return;
    }

    setClaims(uploadedClaims);
    setCurrentPage(1);
    handleCloseClaimModal();
    showAlert('Data claim reward berhasil disimpan', 'success');
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

      <Modal show={showClaimModal} onHide={handleCloseClaimModal} size="xl" centered fullscreen>
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
                        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                          <i className="ti ti-upload me-1" />
                          Upload Excel
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

          <Card className="border mb-0 mt-3">
            <Card.Body>
              <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="mb-1">Preview Transaksi Sell Out</h6>
                  <p className="text-muted mb-0">
                    {uploadedFileName
                      ? `Data dari file ${uploadedFileName}`
                      : 'Tabel ini akan terisi otomatis setelah file Excel berhasil diupload.'}
                  </p>
                </div>
                <Badge bg={uploadedClaims.length ? 'primary' : 'secondary'}>{uploadedClaims.length} claim</Badge>
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
                  {uploadedClaims.length ? (
                    uploadedClaims.flatMap((claim) => {
                      const transactions = claim.sellOut?.length ? claim.sellOut : [{ invoiceNo: '-', date: '', amount: 0 }];

                      return transactions.map((transaction, index) => (
                        <tr key={`${claim.claimNo}-${transaction.invoiceNo}-${index}`}>
                          <td className="fw-semibold">{claim.claimNo}</td>
                          <td>
                            <div className="fw-semibold">{claim.distributorName || '-'}</div>
                            <small className="text-muted">{claim.distributorCode || '-'}</small>
                          </td>
                          <td>{transaction.invoiceNo || '-'}</td>
                          <td>{transaction.itemName || '-'}</td>
                          <td>{transaction.customerType || '-'}</td>
                          <td>{formatDate(transaction.date)}</td>
                          <td className="text-end">{formatCurrency(transaction.amount)}</td>
                          <td className="text-end">{formatCurrency(claim.rewardAmount)}</td>
                        </tr>
                      ));
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="text-center py-4">
                          <div className="avtar avtar-lg bg-light-primary text-primary mx-auto mb-2">
                            <i className="ti ti-table-import f-20" />
                          </div>
                          <h6 className="mb-1">Belum ada data preview</h6>
                          <p className="text-muted mb-0">Upload template Excel untuk menampilkan transaksi sell out di sini.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseClaimModal}>
            Tutup
          </Button>
          <Button variant="primary" disabled={!uploadedClaims.length} onClick={handleSaveUploadedClaims}>
            <i className="ti ti-device-floppy me-1" />
            Simpan Claim
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
