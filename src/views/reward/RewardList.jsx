import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import LoaderData from '../../components/LoaderData';

const pageSize = 10;

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

  if (['success', 'successful', 'completed', 'complete', 'claimed', 'processed'].includes(status)) return 'claimed';
  if (['failed', 'failure', 'rejected', 'reject', 'error'].includes(status)) return 'rejected';

  return 'pending';
};

const getResponseList = (response, keys = []) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.[key]?.data)) return payload[key].data;
  }

  return [];
};

const getResponseObject = (response) => {
  const payload = response?.data?.data;

  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload && !Array.isArray(payload)) return payload;

  return {};
};

const normalizeBatch = (batch, index) => ({
  id: batch.id || batch.batch_id || batch.claim_batch_id || batch.upload_batch_id || batch.upload_id || index,
  claimNo: batch.batch_no || batch.batch_code || batch.claim_no || batch.reference_no || `BATCH-${batch.id || index + 1}`,
  fileName: batch.file_name || batch.original_file_name || batch.original_filename || batch.filename || '-',
  uploadedBy: batch.uploaded_by_name || batch.uploaded_by || batch.created_by_name || batch.created_by || '-',
  uploadedAt: batch.created_at || batch.uploaded_at || batch.createdAt || '',
  rewardAmount: batch.total_diskon,
  totalTransactions: Number(batch.total_rows || batch.total_records || batch.result_count || batch.total_transactions || 0),
  status: normalizeStatus(batch.status || batch.process_status || batch.processing_status),
  sellOut: []
});

const normalizeUploadResult = (item, index) => {
  const qty = Number(item.qty || item.quantity || 0);
  const unitPrice = Number(
    item.selling_price_kg || item.selling_price_per_kg || item.harga_jual_kg || item.price_per_kg || item.price || 0
  );

  return {
    id: item.id || item.result_id || index,
    customerCode: item.customer_code || item.code_customer || item.distributor_code || '',
    customerName: item.customer_name || item.name_customer || item.distributor_name || '',
    itemCode: item.item_code || item.code_item || '',
    itemName: item.item_name || item.name_item || '',
    qty: item?.qty_kg,
    customerType: item.customer_type || item.type_customer || '',
    date: item.transaction_date || item.transcation_date || item.sell_out_date || item.created_at || '',
    amount1: Number(item?.harga_program_per_kg),
    amount2: Number(item?.sell_price_per_kg),
    rewardAmount: Number(item.diskon_per_kg),
    status: item.status.replace("_", " ")
  };
};

export default function RewardList() {
  const { showAlert } = useAlert();
  const fileInputRef = useRef(null);
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [uploadingClaim, setUploadingClaim] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchClaimBatches = useCallback(async () => {
    setLoadingClaims(true);

    try {
      const response = await PromoServices.getClaimBatches();

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Gagal mengambil list transaksi claim', 'danger');
        return;
      }

      const batches = getResponseList(response, ['batches', 'items', 'rows']).map(normalizeBatch);
      console.log('batches => ', batches)
      setClaims(batches);
      setCurrentPage(1);
    } catch (error) {
      showAlert(error?.message || 'Gagal mengambil list transaksi claim', 'danger');
    } finally {
      setLoadingClaims(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchClaimBatches();
  }, [fetchClaimBatches]);

  const handleViewBatch = async (batch) => {
    setLoadingDetailId(batch.id);

    try {
      const [batchResponse, resultResponse] = await Promise.all([
        PromoServices.getBatchDetail(batch.id),
        PromoServices.getUploadResult(batch.id)
      ]);

      if (batchResponse?.data?.success === false) {
        showAlert(batchResponse.data.message || 'Gagal mengambil detail batch claim', 'danger');
        return;
      }

      if (resultResponse?.data?.success === false) {
        showAlert(resultResponse.data.message || 'Gagal mengambil transaksi sell out', 'danger');
        return;
      }

      const detail = batchResponse.data;
      const normalizedBatchDetail = normalizeBatch(detail, batch.id);
      const resultDetail = getResponseObject(resultResponse);
      const resultsSource =
        resultDetail.results || resultDetail.claim_results || resultDetail.claims || resultDetail.transactions || resultDetail.details;
      const results = resultResponse.data?.data.map(normalizeUploadResult);
      const totalClaim = Number(detail.total_diskon);
      setSelectedClaim({
        ...batch,
        claimNo: detail?.claimNo,
        fileName: normalizedBatchDetail.fileName !== '-' ? normalizedBatchDetail.fileName : batch.fileName,
        uploadedBy: normalizedBatchDetail.uploadedBy !== '-' ? normalizedBatchDetail.uploadedBy : batch.uploadedBy,
        uploadedAt: normalizedBatchDetail.uploadedAt || batch.uploadedAt,
        sellOut: results,
        rewardAmount: normalizedBatchDetail.rewardAmount,
        totalTransactions: results.length || batch.totalTransactions
      });
    } catch (error) {
      showAlert(error?.message || 'Gagal mengambil detail transaksi claim', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const summary = useMemo(
    () => ({
      totalClaimed: claims.reduce((total, item) => total + Number(item.rewardAmount), 0),
      totalClaims: claims.length,
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
      await fetchClaimBatches();
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
          {/* <Row className="g-3">
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
          </Row> */}
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
                <th style={{ minWidth: 170 }}>Batch Claim</th>
                <th style={{ minWidth: 220 }}>File Upload</th>
                <th style={{ minWidth: 190 }}>Tanggal Upload</th>
                <th style={{ minWidth: 190 }}>Total Diskon</th>
                <th className="text-center" style={{ width: 90 }}>
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingClaims ? (
                <tr>
                  <td colSpan={4}>
                    <LoaderData />
                  </td>
                </tr>
              ) : paginatedClaims.length > 0 ? (
                paginatedClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="fw-semibold">{claim.claimNo}</td>
                    <td>
                      <div className="fw-semibold">{claim.fileName || '-'}</div>
                    </td>
                    <td>{formatDate(claim.uploadedAt)}</td>
                    <td>{formatCurrency(claim.rewardAmount)}</td>
                    <td className="text-center">
                      <Button
                        className="rounded-circle"
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewBatch(claim)}
                        disabled={loadingDetailId !== null}
                      >
                        {String(loadingDetailId) === String(claim.id) ? (
                          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                        ) : (
                          <i className="ti ti-list-search" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
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
                        {/* <Badge bg={statusVariant[selectedClaim.status] || 'secondary'}>
                          {statusLabel[selectedClaim.status] || selectedClaim.status}
                        </Badge> */}
                      </Stack>

                      <Row className="g-3 mt-1">
                        <Col md={6}>
                          <Form.Label className="f-12 text-muted">File Upload</Form.Label>
                          <div className="fw-semibold">{selectedClaim.fileName || '-'}</div>
                          <small className="text-muted">{selectedClaim.uploadedBy || '-'}</small>
                        </Col>
                        <Col md={6}>
                          <Form.Label className="f-12 text-muted">Nominal Total Claim</Form.Label>
                          <h4 className="mb-0 text-primary">{formatCurrency(selectedClaim.rewardAmount)}</h4>
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
                        <th style={{ width: 70 }}>#</th>
                        <th style={{ minWidth: 210 }}>Customer</th>
                        <th style={{ minWidth: 150 }}>Kode Item</th>
                        <th style={{ minWidth: 220 }}>Nama Item</th>
                        <th className="text-end" style={{ minWidth: 100 }}>
                          Qty (Kg)
                        </th>
                        <th style={{ minWidth: 130 }}>Tanggal</th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Harga Jual @Kg
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Harga Sell Out @Kg
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Bonus
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClaim.sellOut?.length ? (
                        selectedClaim.sellOut.map((transaction, index) => (
                          <tr key={transaction.id || `${selectedClaim.claimNo}-${index}`}>
                            <td>{transaction.customerType}</td>
                            <td>
                              <div className="fw-semibold">{transaction.customerName || '-'}</div>
                              <small className="text-muted">{transaction.customerCode || '-'}</small>
                            </td>
                            <td>{transaction.itemCode || '-'}</td>
                            <td>{transaction.itemName || '-'}</td>
                            <td className="text-end">{Math.round(transaction.qty)}</td>
                            <td>{formatDate(transaction.date)}</td>
                            <td className="text-end">{formatCurrency(transaction.amount1)}</td>
                            <td className="text-end">{formatCurrency(transaction.amount2)}</td>
                            <td className="text-end">{formatCurrency(transaction.rewardAmount)}</td>
                            <td className="text-end">{transaction.status}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9}>
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
