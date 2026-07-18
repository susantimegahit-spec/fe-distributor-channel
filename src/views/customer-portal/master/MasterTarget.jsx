import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
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

const customerSelectStyles = {
  control: (provided) => ({ ...provided, minHeight: 43 }),
  menu: (provided) => ({ ...provided, zIndex: 1060 })
};

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
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.targets)) return payload.targets;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const getProductGroup = (item) => {
  const brand = String(item?.brand || '').trim();
  const normalizedBrand = brand.toUpperCase();
  const group = productGroups.find((productGroup) => productGroup.aliases.some((alias) => normalizedBrand.includes(alias)));

  return group ? { ...group, name: brand } : null;
};

const groupProducts = (items) => {
  const groupedProducts = new Map();

  items
    .map(getProductGroup)
    .filter(Boolean)
    .forEach((group) => {
      if (!groupedProducts.has(group.code)) groupedProducts.set(group.code, group);
    });

  return [...groupedProducts.values()];
};

const normalizeTargetData = (rows) =>
  rows.map((row, index) => ({
    id: row.id || index + 1,
    customerCode: getRowValue(row, ['customer_code', 'code_customer', 'customerCode', 'distributor_code']),
    customerName: getRowValue(row, ['customer_name', 'name', 'customerName', 'distributor_name']),
    depot: getRowValue(row, ['depo', 'depot']),
    productCode: getRowValue(row, ['product_code', 'item_code', 'productCode', 'itemCode']),
    productName: getRowValue(row, ['product_name', 'item_name', 'productName', 'itemName']),
    year: getRowValue(row, ['year', 'tahun']),
    month: getRowValue(row, ['month', 'bulan']),
    target: toNumber(getRowValue(row, ['target_amount', 'target', 'amount', 'target_kg', 'total']))
  }));

const getMonthIndex = (value) => {
  const numericMonth = Number(value);
  if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) return numericMonth - 1;

  const normalizedMonth = normalizeHeader(value);
  if (!normalizedMonth) return -1;
  return monthNames.findIndex(
    (month) => normalizeHeader(month).startsWith(normalizedMonth) || normalizedMonth.startsWith(normalizeHeader(month))
  );
};

const pivotTargetData = (rows) => {
  const itemMap = new Map();

  rows.forEach((row) => {
    const itemCode = String(row.productCode || '').trim();
    const itemName = String(row.productName || '').trim();
    const itemKey = itemCode || itemName;
    const monthIndex = getMonthIndex(row.month);

    if (!itemKey || monthIndex < 0) return;

    if (!itemMap.has(itemKey)) {
      itemMap.set(itemKey, {
        itemCode,
        itemName: itemName || itemCode,
        monthlyTargets: Array(12).fill(0)
      });
    }

    itemMap.get(itemKey).monthlyTargets[monthIndex] += row.target;
  });

  return [...itemMap.values()];
};

export default function MasterTarget() {
  const { showAlert } = useAlert();
  const uploadInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customerCodeFilter, setCustomerCodeFilter] = useState('');
  const [depotFilter, setDepotFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [distributors, setDistributors] = useState([]);
  const [dataTarget, setDataTarget] = useState([]);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const customerOptions = distributors.map((distributor) => {
    const code = distributor.code_customer || distributor.codeCustomer || '';
    const name = distributor.name || distributor.customer_name || distributor.customerName || '';
    const depot = distributor.depo || distributor.depot || '';
    return { value: code, label: [code, name, depot].filter(Boolean).join(' - ') };
  });
  const depotOptions = [...new Set(distributors.map((distributor) => distributor.depo || distributor.depot).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second))
    .map((depot) => ({ value: depot, label: depot }));
  const targetItems = pivotTargetData(dataTarget);
  const monthlyGrandTotals = targetItems.reduce(
    (totals, item) => totals.map((total, monthIndex) => total + item.monthlyTargets[monthIndex]),
    Array(12).fill(0)
  );

  const fetchTargetData = useCallback(
    async (customerCode, year, depot) => {
      setLoadingTarget(true);

      try {
        const response = await DashboardServices.getDataTarget(customerCode, year, depot);
        if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
          showAlert(response?.data?.message || 'Failed to fetch target data', 'danger');
          setDataTarget([]);
          return;
        }

        setDataTarget(normalizeTargetData(getResponseRows(response)));
      } catch (error) {
        setDataTarget([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch target data', 'danger');
      } finally {
        setLoadingTarget(false);
      }
    },
    [showAlert]
  );

  useEffect(() => {
    const initializePage = async () => {
      try {
        const distributorResponse = await DistributorServices.getAllDistributor('');
        setDistributors(getResponseRows(distributorResponse));
      } catch (error) {
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch distributor data', 'danger');
      }

      await fetchTargetData('', new Date().getFullYear(), '');
    };

    initializePage();
  }, [fetchTargetData, showAlert]);

  const handleApplyFilter = () => {
    const year = Number(yearFilter);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      showAlert('Please select a valid year', 'danger');
      return;
    }

    fetchTargetData(customerCodeFilter, year, depotFilter);
  };

  const resetFilters = () => {
    const currentYear = new Date().getFullYear();
    setCustomerCodeFilter('');
    setDepotFilter('');
    setYearFilter(currentYear);
    fetchTargetData('', currentYear, '');
  };

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
            'Nama Produk': product.name
          };

          monthNames.forEach((month) => {
            row[`${month} ${year}`] = '';
          });

          return row;
        })
      );

      const worksheet = XLSX.utils.json_to_sheet(templateRows);
      worksheet['!cols'] = [{ wch: 20 }, { wch: 32 }, { wch: 18 }, { wch: 40 }, ...monthNames.map(() => ({ wch: 16 }))];

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

      await fetchTargetData(customerCodeFilter, yearFilter, depotFilter);
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
                    <h6>Download Template</h6>
                    <p className="text-muted f-12 mb-3">Use the provided column format before uploading target data.</p>
                    <Button variant="success" onClick={() => setShowDownloadModal(true)}>
                      <i className="ti ti-download me-1" />
                      Download Template
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

      <MainCard
        title="Target Data"
        secondary={
          <Badge bg="light-primary" text="primary">
            {targetItems.length} items
          </Badge>
        }
      >
        <Row className="g-3 align-items-end mb-3">
          <Col lg={4} md={6}>
            <Form.Label className="f-12 text-muted">Customer Code</Form.Label>
            <Select
              styles={customerSelectStyles}
              options={customerOptions}
              value={customerOptions.find((option) => option.value === customerCodeFilter) || null}
              onChange={(option) => setCustomerCodeFilter(option?.value || '')}
              isClearable
              isSearchable
              isDisabled={loadingTarget}
              placeholder="Search customer code or name..."
              noOptionsMessage={() => 'Customer not found'}
            />
          </Col>
          <Col lg={2} md={6}>
            <Form.Label className="f-12 text-muted">Year</Form.Label>
            <Form.Control
              type="number"
              min="2000"
              max="2100"
              step="1"
              value={yearFilter}
              disabled={loadingTarget}
              onChange={(event) => setYearFilter(event.target.value)}
            />
          </Col>
          <Col lg={2} md={6}>
            <Button variant="primary" className="w-100" disabled={loadingTarget} onClick={handleApplyFilter}>
              <i className={`${loadingTarget ? 'ti ti-loader-2' : 'ti ti-filter'} me-1`} />
              {loadingTarget ? 'Loading...' : 'Apply Filter'}
            </Button>
          </Col>
          <Col lg={2} md={6}>
            <Button variant="light-secondary" className="w-100" disabled={loadingTarget} onClick={resetFilters}>
              <i className="ti ti-refresh me-1" />
              Reset Filter
            </Button>
          </Col>
        </Row>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th style={{ minWidth: 180 }}>Item</th>
              {monthNames.map((month) => (
                <th key={month} className="text-end" style={{ minWidth: 120 }}>
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingTarget ? (
              <tr>
                <td colSpan={14} className="text-center text-muted py-4">
                  Loading target data...
                </td>
              </tr>
            ) : targetItems.length > 0 ? (
              targetItems.map((item, index) => (
                <tr key={item.itemCode || item.itemName}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="fw-semibold">{item.itemName}</div>
                    {item.itemCode && <div className="text-muted f-12">{item.itemCode}</div>}
                  </td>
                  {item.monthlyTargets.map((target, monthIndex) => (
                    <td key={`${item.itemCode || item.itemName}-${monthIndex}`} className="text-end">
                      {target.toLocaleString('id-ID')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={14} className="text-center text-muted py-4">
                  No target data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="table-light fw-bold">
              <td />
              <td>TOTAL</td>
              {monthlyGrandTotals.map((total, monthIndex) => (
                <td key={`total-${monthIndex}`} className="text-end">
                  {total.toLocaleString('id-ID')}
                </td>
              ))}
            </tr>
          </tfoot>
        </Table>
      </MainCard>

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
