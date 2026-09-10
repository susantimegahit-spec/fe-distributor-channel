import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import * as XLSX from 'xlsx';

import VendorDashboardLayout from '../shared/VendorDashboardLayout';
import { useAlert } from 'utils/alertContext';
import { recordVendorPortalActivity } from 'utils/vendorPortal';
import OriginServices from 'services/logistics/OriginServices';
import DestinationServices from 'services/logistics/DestinationServices';
import VendorServices from 'services/vendor-portal/VendorServices';

const getList = (response, keys = []) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  if (Array.isArray(payload)) return payload;
  const list = keys.map((key) => payload?.[key]).find(Array.isArray) || payload?.data || payload?.items;
  return Array.isArray(list) ? list : [];
};

const firstValue = (item, keys) => keys.map((key) => item?.[key]).find((value) => String(value || '').trim()) || '';
const uniqueValues = (values) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
const formatWeight = (route) => {
  const minimum = route?.min_weight_kg;
  const maximum = route?.max_weight_kg;
  const hasMinimum = minimum !== null && minimum !== undefined && String(minimum).trim() !== '';
  const hasMaximum = maximum !== null && maximum !== undefined && String(maximum).trim() !== '';

  if (!hasMinimum && !hasMaximum) return '-';
  if (!hasMinimum) return maximum;
  if (!hasMaximum || Number(minimum) === Number(maximum)) return minimum;
  return `${minimum} - ${maximum}`;
};
const transportModeLabels = { D: 'Darat', L: 'Laut', U: 'Udara' };
const formatTransportMode = (value) => transportModeLabels[String(value || '').toUpperCase()] || value || '-';
const formatRate = (route) => {
  const rate = route?.rate ?? route?.amount;
  const serviceType = route?.service_type ?? route?.serviceType;
  if (rate === null || rate === undefined || String(rate).trim() === '') return '-';
  return serviceType ? `${rate}/${serviceType}` : rate;
};
const formatLeadTime = (value) => (value === null || value === undefined || String(value).trim() === '' ? '-' : `${value} days`);
const getOriginRow = (item) => {
  const name = firstValue(item, ['whsNameOrigin', 'whs_name_origin', 'origin_name', 'warehouse_name', 'name']);
  return { name };
};
const getDestinationRow = (item) => {
  const alias = firstValue(item, [
    'alias',
    'shipToAlias',
    'ship_to_alias',
    'destination_alias',
    'shipToName',
    'ship_to_name',
    'AddressName2'
  ]);
  const street = firstValue(item, ['street', 'Street', 'ship_to_address', 'Address', 'address']);
  const city = firstValue(item, ['city', 'City', 'destination_city', 'ship_to_city', 'Address2']);
  return { alias, street, city, dropdown: alias || street };
};

const addDropdownValidations = (workbookBuffer) => {
  const container = XLSX.CFB.read(workbookBuffer instanceof Uint8Array ? workbookBuffer : new Uint8Array(workbookBuffer), {
    type: 'buffer'
  });
  const sheetEntry = XLSX.CFB.find(container, '/xl/worksheets/sheet1.xml');
  if (!sheetEntry?.content) return workbookBuffer;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const xml = decoder.decode(sheetEntry.content);
  const validations =
    '<dataValidations count="4">' +
    '<dataValidation type="list" allowBlank="0" sqref="B2:B1000"><formula1>OriginList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="C2:C1000"><formula1>DestinationList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="D2:D1000"><formula1>TransportModeList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="G2:G1000"><formula1>ServiceTypeList</formula1></dataValidation>' +
    '</dataValidations>';
  const insertionIndex = xml.search(
    /<(?:hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/
  );
  sheetEntry.content = encoder.encode(
    insertionIndex >= 0
      ? `${xml.slice(0, insertionIndex)}${validations}${xml.slice(insertionIndex)}`
      : xml.replace('</worksheet>', `${validations}</worksheet>`)
  );
  sheetEntry.size = sheetEntry.content.length;
  return XLSX.CFB.write(container, { fileType: 'zip', type: 'array' });
};

const ongoingShipments = [
  {
    id: 'SHP-2026-00841',
    origin: 'Surabaya',
    destination: 'Jakarta Pusat',
    vehicle: 'B 9124 TXU',
    driver: 'Budi Santoso',
    status: 'In transit',
    progress: 68,
    eta: '28 Aug 2026, 14:30'
  },
  {
    id: 'SHP-2026-00839',
    origin: 'Gresik',
    destination: 'Semarang',
    vehicle: 'L 8742 AAB',
    driver: 'Andi Pratama',
    status: 'Transit',
    progress: 46,
    eta: '28 Aug 2026, 19:00'
  },
  {
    id: 'SHP-2026-00835',
    origin: 'Jakarta',
    destination: 'Medan',
    vehicle: 'B 7381 FZA',
    driver: 'Rizky Maulana',
    status: 'Heading to destination hub',
    progress: 82,
    eta: '29 Aug 2026, 09:15'
  },
  {
    id: 'SHP-2026-00828',
    origin: 'Makassar',
    destination: 'Balikpapan',
    vehicle: 'DD 9027 XK',
    driver: 'Fajar Hidayat',
    status: 'In transit',
    progress: 31,
    eta: '29 Aug 2026, 16:45'
  }
];

export default function ExpeditionDashboard() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddRates, setShowAddRates] = useState(false);
  const [ratePeriod, setRatePeriod] = useState('');
  const [ratesFile, setRatesFile] = useState(null);
  const [uploadingRates, setUploadingRates] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [rateHeaders, setRateHeaders] = useState([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [showRateDetail, setShowRateDetail] = useState(false);
  const [rateDetail, setRateDetail] = useState(null);
  const [loadingRateDetail, setLoadingRateDetail] = useState(false);

  const fetchRateHeaders = useCallback(async () => {
    setLoadingRates(true);
    try {
      const response = await VendorServices.getRatesHeader();
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to load rates.'), { response });
      }
      setRateHeaders(getList(response, ['headers', 'rates']));
    } catch (error) {
      setRateHeaders([]);
      showAlert(error.response?.data?.message || error.message || 'Unable to load rates.', 'danger');
    } finally {
      setLoadingRates(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchRateHeaders();
  }, [fetchRateHeaders]);

  const openRateDetail = async (batchId) => {
    if (!batchId || loadingRateDetail) return;
    setShowRateDetail(true);
    setRateDetail(null);
    setLoadingRateDetail(true);
    try {
      const response = await VendorServices.getDetailBatch(batchId);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to load rate details.'), { response });
      }
      setRateDetail(response?.data?.data ?? response?.data ?? null);
    } catch (error) {
      setShowRateDetail(false);
      showAlert(error.response?.data?.message || error.message || 'Unable to load rate details.', 'danger');
    } finally {
      setLoadingRateDetail(false);
    }
  };

  const openAddRates = () => {
    setRatePeriod('');
    setRatesFile(null);
    setShowAddRates(true);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const [originResponse, destinationResponse] = await Promise.all([
        OriginServices.getOrigins({ per_page: 1000 }),
        DestinationServices.getDestinations({ per_page: 1000 })
      ]);
      if (originResponse?.data?.success === false) throw new Error(originResponse.data.message || 'Failed to fetch origin master');
      if (destinationResponse?.data?.success === false) {
        throw new Error(destinationResponse.data.message || 'Failed to fetch destination master');
      }
      const origins = getList(originResponse, ['origins']);
      const destinations = getList(destinationResponse, ['shiptos', 'ship_tos', 'destinations']);
      const originRows = [
        ...new Map(
          origins
            .map(getOriginRow)
            .filter((item) => item.name)
            .map((item) => [item.name, item])
        ).values()
      ];
      const originValues = originRows.map((item) => item.name);
      const destinationRows = destinations.map(getDestinationRow).filter((item) => item.dropdown);
      const destinationValues = uniqueValues(destinationRows.map((item) => item.dropdown));

      if (!originValues.length) throw new Error('Origin master is empty');
      if (!destinationValues.length) throw new Error('Destination master is empty');
      const rows = [
        ['No', 'Origin Name', 'Destination', 'Transport Mode', 'Min Weight (Kg)', 'Max Weight (Kg)', 'Service Type', 'Rate', 'Lead Time'],
        [1, originValues[0], destinationValues[0], 'D', 0, 1000, 'KG', 0, 1]
      ];
      for (let row = 3; row <= 200; row += 1) rows.push(Array(9).fill(''));

      const ratesSheet = XLSX.utils.aoa_to_sheet(rows);
      const originSheet = XLSX.utils.aoa_to_sheet([['Origin Name'], ...originValues.map((value) => [value])]);
      const destinationSheet = XLSX.utils.aoa_to_sheet([
        ['Destination', 'Destination City', 'Street'],
        ...destinationRows.map((item) => [item.alias, item.city, item.street])
      ]);
      const dropdownSheet = XLSX.utils.aoa_to_sheet([['Destination'], ...destinationValues.map((value) => [value])]);
      const transportModeSheet = XLSX.utils.aoa_to_sheet([['transport_mode'], ['D'], ['L'], ['U']]);
      const serviceTypeSheet = XLSX.utils.aoa_to_sheet([['service_type'], ['RIT'], ['KG'], ['CONTAINER']]);
      ratesSheet['!cols'] = [8, 30, 32, 18, 18, 18, 18, 18, 16].map((wch) => ({ wch }));
      ratesSheet['!autofilter'] = { ref: 'A1:I200' };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ratesSheet, 'Rates Upload');
      XLSX.utils.book_append_sheet(workbook, originSheet, 'Master Origin');
      XLSX.utils.book_append_sheet(workbook, destinationSheet, 'Master Destination');
      XLSX.utils.book_append_sheet(workbook, transportModeSheet, 'Master Transport Mode');
      XLSX.utils.book_append_sheet(workbook, serviceTypeSheet, 'Master Service Type');
      XLSX.utils.book_append_sheet(workbook, dropdownSheet, 'Dropdown Lists');
      workbook.Workbook = {
        Sheets: workbook.SheetNames.map((name) => ({ name, Hidden: name === 'Dropdown Lists' ? 1 : 0 })),
        Names: [
          { Name: 'OriginList', Ref: `'Master Origin'!$A$2:$A$${originValues.length + 1}` },
          { Name: 'DestinationList', Ref: `'Dropdown Lists'!$A$2:$A$${destinationValues.length + 1}` },
          { Name: 'TransportModeList', Ref: "'Master Transport Mode'!$A$2:$A$4" },
          { Name: 'ServiceTypeList', Ref: "'Master Service Type'!$A$2:$A$4" }
        ]
      };

      const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([addDropdownValidations(workbookBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Template_Upload_Rates.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showAlert('Rates template downloaded successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to download rates template', 'danger');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const closeAddRates = () => {
    if (uploadingRates) return;
    setShowAddRates(false);
    setRatePeriod('');
    setRatesFile(null);
  };

  const handleAddRates = async (event) => {
    event.preventDefault();
    if (!ratePeriod || !ratesFile || uploadingRates) return;

    if (!/\.(xlsx|xls)$/i.test(ratesFile.name)) {
      showAlert('File format must be XLSX or XLS.', 'danger');
      return;
    }

    const periodLabel = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${ratePeriod}T00:00:00Z`)
    );
    setUploadingRates(true);
    try {
      const response = await VendorServices.postVendorRates({ periode: ratePeriod, file: ratesFile });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to upload rates.'), { response });
      }

      showAlert(response.data?.message || 'Rates uploaded successfully.', 'success');
      recordVendorPortalActivity('EXPEDITION_RATES_UPLOAD', `${periodLabel} - ${ratesFile.name}`);
      setShowAddRates(false);
      setRatePeriod('');
      setRatesFile(null);
      await fetchRateHeaders();
    } catch (error) {
      const responseData = error.response?.data;
      const validationErrors = Object.values(responseData?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || responseData?.message || error.message || 'Unable to upload rates.', 'danger');
    } finally {
      setUploadingRates(false);
    }
  };

  return (
    <VendorDashboardLayout portalName="Expedition Vendor Portal">
      <div className="vp-dashboard-toolbar">
        <div className="vp-welcome vp-dashboard-heading">
          <span className="vp-kicker">Expedition workspace</span>
          <h1>{activeTab === 'dashboard' ? 'Expedition Dashboard' : 'Shipping Rates'}</h1>
          <p>
            {activeTab === 'dashboard'
              ? 'Monitor your ongoing shipments and expedition activity.'
              : 'Preview rate data using the same structure as the Expedition Rates menu.'}
          </p>
        </div>
        <nav className="vp-portal-tabs" aria-label="Expedition Vendor Portal navigation">
          <button type="button" className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            <i className="ti ti-layout-dashboard" /> Dashboard
          </button>
          <button type="button" className={activeTab === 'rates' ? 'active' : ''} onClick={() => setActiveTab('rates')}>
            <i className="ti ti-route" /> Rates <span>{rateHeaders.length}</span>
          </button>
        </nav>
      </div>
      {activeTab === 'dashboard' ? (
        <div className="vp-shipment-card">
          <div className="vp-rates-title">
            <div>
              <h2>Ongoing Shipments</h2>
              <p>Shipments that are currently in progress.</p>
            </div>
            <span className="vp-badge">{ongoingShipments.length} ACTIVE</span>
          </div>
          <div className="vp-shipment-list">
            {ongoingShipments.map((shipment) => (
              <article className="vp-shipment-item" key={shipment.id}>
                <span className="vp-shipment-icon">
                  <i className="ti ti-truck-delivery" />
                </span>
                <div className="vp-shipment-main">
                  <div className="vp-shipment-title">
                    <strong>{shipment.id}</strong>
                    <span>{shipment.status}</span>
                  </div>
                  <div className="vp-shipment-route">
                    <span>{shipment.origin}</span>
                    <i className="ti ti-arrow-right" />
                    <span>{shipment.destination}</span>
                  </div>
                  <div className="vp-progress">
                    <span style={{ width: `${shipment.progress}%` }} />
                  </div>
                </div>
                <div className="vp-shipment-meta">
                  <small>Fleet & driver</small>
                  <strong>{shipment.vehicle}</strong>
                  <span>{shipment.driver}</span>
                </div>
                <div className="vp-shipment-meta vp-shipment-eta">
                  <small>Estimated arrival</small>
                  <strong>{shipment.eta}</strong>
                  <span>{shipment.progress}% completed</span>
                </div>
                <button
                  type="button"
                  className="vp-shipment-detail"
                  onClick={() => recordVendorPortalActivity('EXPEDITION_SHIPMENT_DETAIL', shipment.id)}
                  aria-label={`View details for ${shipment.id}`}
                >
                  <i className="ti ti-chevron-right" />
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="vp-rates-card">
          <div className="vp-rates-title">
            <div>
              <h2>Shipping Rates</h2>
              <p>Uploaded rate periods and their processing status.</p>
            </div>
            <div className="vp-rates-tools">
              <Button type="button" variant="outline-primary" onClick={fetchRateHeaders} disabled={loadingRates}>
                <i className={`ti ${loadingRates ? 'ti-loader-2 vp-spin' : 'ti-refresh'} me-1`} />
                Refresh
              </Button>
              <button type="button" className="vp-upload-rates" onClick={openAddRates}>
                <i className="ti ti-plus" /> Add Rates
              </button>
            </div>
          </div>
          <div className="vp-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Total Routes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRates ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="vp-rates-state">
                        <span className="spinner-border" aria-hidden="true" />
                        <p>Loading rates...</p>
                      </div>
                    </td>
                  </tr>
                ) : rateHeaders.length ? (
                  rateHeaders.map((rate, index) => {
                    const batchId = firstValue(rate, ['batch_id', 'batchId', 'id', 'uuid', 'header_id', 'headerId']);
                    const id = batchId || index;
                    const periodLabel = rate?.period_label || '-';
                    const totalRoutes = rate?.total_routes ?? 0;
                    const status = rate?.status || '-';

                    return (
                      <tr key={id}>
                        <td className="fw-semibold">
                          <button type="button" className="vp-period-link" onClick={() => openRateDetail(batchId)} disabled={!batchId}>
                            {periodLabel}
                          </button>
                        </td>
                        <td>{totalRoutes}</td>
                        <td>
                          <span className="vp-service-badge">{status}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3}>
                      <div className="vp-rates-state">
                        <i className="ti ti-file-off" />
                        <p>No rates have been uploaded.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal show={showAddRates} onHide={closeAddRates} centered className="vp-add-rates-modal">
        <Form onSubmit={handleAddRates}>
          <Modal.Header closeButton={!uploadingRates}>
            <Modal.Title>Add Rates</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="vp-add-rates-description">Select the rate period and upload the corresponding Excel file.</p>
            <div className="vp-rates-template">
              <div>
                <strong>Rates Upload Template</strong>
                <small>Download and complete the standard Logistics rates template.</small>
              </div>
              <Button
                type="button"
                variant="outline-primary"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate || uploadingRates}
              >
                <i className={downloadingTemplate ? 'ti ti-loader-2 me-1 vp-spin' : 'ti ti-download me-1'} />
                {downloadingTemplate ? 'Preparing...' : 'Download Template'}
              </Button>
            </div>
            <div className="d-grid gap-3">
              <Form.Group controlId="rate-period">
                <Form.Label>Rate period</Form.Label>
                <Form.Control
                  type="date"
                  value={ratePeriod}
                  onChange={(event) => setRatePeriod(event.target.value)}
                  disabled={uploadingRates}
                  required
                />
              </Form.Group>
              <Form.Group controlId="rates-file">
                <Form.Label>Rates file</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => setRatesFile(event.target.files?.[0] || null)}
                  disabled={uploadingRates}
                  required
                />
                <Form.Text>Accepted formats: XLSX and XLS.</Form.Text>
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light-secondary" onClick={closeAddRates} disabled={uploadingRates}>
              Cancel
            </Button>
            <Button type="submit" className="vp-add-rates-submit" disabled={uploadingRates || !ratePeriod || !ratesFile}>
              <i className={uploadingRates ? 'ti ti-loader-2 me-1 vp-spin' : 'ti ti-file-upload me-1'} />
              {uploadingRates ? 'Uploading...' : 'Upload Rates'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal
        show={showRateDetail}
        onHide={() => !loadingRateDetail && setShowRateDetail(false)}
        centered
        size="xl"
        className="vp-rate-detail-modal"
      >
        <Modal.Header closeButton={!loadingRateDetail}>
          <Modal.Title>Rate Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingRateDetail ? (
            <div className="vp-rates-state">
              <span className="spinner-border" aria-hidden="true" />
              <p>Loading rate details...</p>
            </div>
          ) : (
            <div className="vp-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>City</th>
                    <th>Transport Mode</th>
                    <th>Weight (Kg)</th>
                    <th>Service Type</th>
                    <th>Rate</th>
                    <th>Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {getList({ data: rateDetail }, ['details', 'routes', 'rates']).length ? (
                    getList({ data: rateDetail }, ['details', 'routes', 'rates']).map((route, index) => (
                      <tr key={firstValue(route, ['id', 'uuid', 'route_id', 'routeId']) || index}>
                        <td>{firstValue(route, ['origin_name', 'originName', 'origin']) || '-'}</td>
                        <td>{firstValue(route, ['destination_name', 'destinationName', 'destination']) || '-'}</td>
                        <td>{route?.destination_city || '-'}</td>
                        <td>{formatTransportMode(route?.transport_mode ?? route?.transportMode)}</td>
                        <td>{formatWeight(route)}</td>
                        <td>{firstValue(route, ['service_type', 'serviceType']) || '-'}</td>
                        <td>{formatRate(route)}</td>
                        <td>{formatLeadTime(route?.leadtime)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="vp-rates-state">
                          <i className="ti ti-file-off" />
                          <p>No route details are available.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </VendorDashboardLayout>
  );
}
