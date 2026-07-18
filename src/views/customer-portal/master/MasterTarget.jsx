import { useRef, useState } from 'react';
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
import MainCard from 'components/MainCard';
import DashboardServices from '../../../services/customer-portal/DashboardServices';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import ProductServices from '../../../services/customer-portal/ProductServices';
import { useAlert } from '../../../utils/alertContext';

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

const productGroups = [
  { code: 'KOP', name: 'KAPAL', aliases: ['KOP', 'KAPAL'] },
  { code: 'JOP', name: 'JEMPOL', aliases: ['JOP', 'JEMPOL'] },
  { code: 'GARAMI', name: 'GARAMI', aliases: ['GARAMI'] },
  { code: 'POP', name: 'LAYAR', aliases: ['POP', 'LAYAR'] },
  { code: 'TOP', name: 'TANGAN', aliases: ['TOP', 'TANGAN'] }
];

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const getRowValue = (row, aliases) => {
  const normalizedRow = Object.entries(row).reduce((result, [key, value]) => {
    result[normalizeHeader(key)] = value;
    return result;
  }, {});
  const matchedKey = aliases.map(normalizeHeader).find((key) => normalizedRow[key] !== undefined);

  return matchedKey ? normalizedRow[matchedKey] : '';
};

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
};

const getResponseRows = (response) => {
  const payload = response?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getProductGroup = (item) => {
  const itemName = String(item?.item_name || item?.itemName || '').toUpperCase();
  return productGroups.find((group) => group.aliases.some((alias) => itemName.includes(alias)));
};

const groupProducts = (items) => {
  const availableCodes = new Set(
    items
      .map(getProductGroup)
      .filter(Boolean)
      .map((group) => group.code)
  );
  return productGroups.filter((group) => availableCodes.has(group.code));
};

export default function MasterTarget() {
  const { showAlert } = useAlert();
  const uploadInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [targetRows, setTargetRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleDownloadTemplate = async () => {
    const year = Number(selectedYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      showAlert('Please select a valid year', 'danger');
      return;
    }

    setDownloading(true);

    try {
      const [distributorResponse, productResponse] = await Promise.all([
        DistributorServices.getAllDistributor(''),
        ProductServices.getAllProduct('')
      ]);
      const distributors = getResponseRows(distributorResponse);
      const products = groupProducts(getResponseRows(productResponse));

      if (!distributors.length) {
        showAlert('No distributor data is available', 'danger');
        return;
      }

      if (!products.length) {
        showAlert('No matching KOP, GARAMI, TOP, POP, or JOP product data is available', 'danger');
        return;
      }

      const templateRows = distributors.flatMap((distributor) =>
        products.map((product) => {
          const row = {
            'Kode Distributor': distributor.code_customer || distributor.codeCustomer || '',
            'Nama Distributor': distributor.name || distributor.customer_name || distributor.customerName || '',
            Depo: distributor.depo || distributor.depot || '',
            'Kode Produk': product.code,
            'Nama Produk': product.name
          };

          monthNames.forEach((month) => {
            row[`${month} ${year}`] = '';
          });

          return row;
        })
      );

      const worksheet = XLSX.utils.json_to_sheet(templateRows);
      worksheet['!cols'] = [{ wch: 20 }, { wch: 32 }, { wch: 18 }, { wch: 15 }, { wch: 40 }, ...monthNames.map(() => ({ wch: 16 }))];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Target ${year}`);
      XLSX.writeFile(workbook, `template-master-target-${year}.xlsx`);
      setShowDownloadModal(false);
      showAlert(`Target template for ${year} downloaded successfully`, 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to prepare the target template', 'danger');
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async (event) => {
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
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const parsedRows = rows.flatMap((row, index) => {
        const distributorCode = String(getRowValue(row, ['Kode Distributor', 'distributor_code', 'kode_distributor'])).trim();
        const distributorName = String(getRowValue(row, ['Nama Distributor', 'distributor_name', 'nama_distributor'])).trim();
        const depot = String(getRowValue(row, ['Depo', 'depot'])).trim();
        const productCode = String(getRowValue(row, ['Kode Produk', 'product_code', 'kode_produk'])).trim();
        const productName = String(getRowValue(row, ['Nama Produk', 'product_name', 'nama_produk'])).trim();

        return Object.entries(row)
          .filter(([header]) => monthNames.some((month) => normalizeHeader(header).startsWith(normalizeHeader(month))))
          .map(([header, value], monthIndex) => {
            const yearMatch = String(header).match(/\b(20\d{2}|2100)\b/);
            const month = monthNames.findIndex((name) => normalizeHeader(header).startsWith(normalizeHeader(name))) + 1;

            return {
              id: `${index + 1}-${monthIndex + 1}`,
              distributorCode,
              distributorName,
              depot,
              productCode,
              productName,
              year: Number(yearMatch?.[1] || 0),
              month,
              target: toNumber(value)
            };
          })
          .filter((targetRow) => targetRow.target > 0);
      });

      const invalidRows = parsedRows.filter(
        (row) => !row.distributorCode || !row.productName || !row.year || row.month < 1 || row.month > 12 || row.target <= 0
      );

      if (!parsedRows.length) {
        showAlert('No target data found in the Excel file', 'danger');
        return;
      }

      const payload = new FormData();
      payload.append('file', file);
      payload.append('type', 'target');

      const response = await DashboardServices.postDataTarget(payload);
      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to upload target data', 'danger');
        return;
      }

      if (invalidRows.length) {
        showAlert(`${invalidRows.length} row(s) contain incomplete or invalid target data`, 'warning');
      } else {
        showAlert(response?.data?.message || `${parsedRows.length} target row(s) uploaded successfully`, 'success');
      }

      setFileName(file.name);
      setTargetRows(parsedRows);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to upload target data', 'danger');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Master Target</h5>
            <span className="text-muted f-12">Download the target template and upload completed distributor target data.</span>
          </Stack>
        }
      >
        <Row className="g-3">
          <Col md={6}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" gap={3} className="align-items-start">
                  <span className="avtar avtar-s bg-light-success text-success flex-shrink-0">
                    <i className="ti ti-file-download" />
                  </span>
                  <div className="flex-grow-1">
                    <h6>Download Excel Template</h6>
                    <p className="text-muted f-12 mb-3">Use the provided column format before uploading target data.</p>
                    <Button variant="success" onClick={() => setShowDownloadModal(true)}>
                      <i className="ti ti-download me-1" />
                      Download Excel
                    </Button>
                  </div>
                </Stack>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="border mb-0 h-100">
              <Card.Body>
                <Stack direction="horizontal" gap={3} className="align-items-start">
                  <span className="avtar avtar-s bg-light-primary text-primary flex-shrink-0">
                    <i className="ti ti-file-upload" />
                  </span>
                  <div className="flex-grow-1">
                    <h6>Upload Target File</h6>
                    <p className="text-muted f-12 mb-3">Select a completed Excel file in XLSX or XLS format.</p>
                    <Button variant="primary" disabled={uploading} onClick={() => uploadInputRef.current?.click()}>
                      <i className={`${uploading ? 'ti ti-loader-2' : 'ti ti-upload'} me-1`} />
                      {uploading ? 'Reading File...' : 'Upload Excel'}
                    </Button>
                    <Form.Control ref={uploadInputRef} type="file" accept=".xlsx,.xls" className="d-none" onChange={handleUpload} />
                  </div>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </MainCard>

      {targetRows.length > 0 && (
        <MainCard
          title="Uploaded Target Preview"
          secondary={
            <Badge bg="light-primary" text="primary">
              {targetRows.length} rows
            </Badge>
          }
        >
          <div className="text-muted f-12 mb-3">File: {fileName}</div>
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Distributor Code</th>
                <th>Distributor Name</th>
                <th>Depo</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Year</th>
                <th>Month</th>
                <th className="text-end">Target</th>
              </tr>
            </thead>
            <tbody>
              {targetRows.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td className="fw-semibold">{row.distributorCode || '-'}</td>
                  <td>{row.distributorName || '-'}</td>
                  <td>{row.depot || '-'}</td>
                  <td>{row.productCode || '-'}</td>
                  <td>{row.productName || '-'}</td>
                  <td>{row.year || '-'}</td>
                  <td>{row.month || '-'}</td>
                  <td className="text-end">{row.target.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {targetRows.length > 10 && <div className="text-muted f-12 mt-3">Showing the first 10 rows.</div>}
        </MainCard>
      )}

      <Modal show={showDownloadModal} onHide={() => !downloading && setShowDownloadModal(false)} centered>
        <Modal.Header closeButton={!downloading}>
          <Modal.Title as="h5">Download Target Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Select Year</Form.Label>
            <Form.Control
              type="number"
              min="2000"
              max="2100"
              step="1"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            />
            <Form.Text className="text-muted">
              The Excel file will contain monthly target columns from January through December for the selected year.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={downloading} onClick={() => setShowDownloadModal(false)}>
            Cancel
          </Button>
          <Button variant="success" disabled={downloading} onClick={handleDownloadTemplate}>
            <i className={`${downloading ? 'ti ti-loader-2' : 'ti ti-download'} me-1`} />
            {downloading ? 'Preparing File...' : 'Download File'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
