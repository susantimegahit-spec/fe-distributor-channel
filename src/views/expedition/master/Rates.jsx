import { useCallback, useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import * as XLSX from 'xlsx';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import LoaderData from 'components/LoaderData';
import DestinationServices from '../../../services/expedition/DestinationServices';
import ExpeditionServices from '../../../services/expedition/ExpeditionServices';
import OriginServices from '../../../services/expedition/OriginServices';
import RateServices from '../../../services/expedition/RateServices';
import { useAlert } from '../../../utils/alertContext';
import { getCookies } from '../../../utils/cookies';

const rateColumns = [
  'origin',
  'destination',
  'expedition',
  'transport_mode',
  'valid_from',
  'valid_until',
  'min_tonnage',
  'max_tonnage',
  'service_type',
  'rate'
];

const requiredUploadColumns = rateColumns.filter(
  (column) => !['valid_from', 'valid_until'].includes(column)
);

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const getList = (response, keys = []) => {
  const payload = getPayload(response);
  if (Array.isArray(payload)) return payload;

  const list = keys.map((key) => payload?.[key]).find(Array.isArray) || payload?.data || payload?.items;
  return Array.isArray(list) ? list : [];
};

const getRateList = (response) => getList(response, ['rates']);

const getRateValue = (item, keys) =>
  keys
    .map((key) => item?.[key])
    .find(
      (value) =>
        value !== undefined && value !== null && typeof value !== 'object' && String(value).trim() !== ''
    ) ?? '';

const getServiceTypeLabel = (serviceType) =>
  String(serviceType || '').toUpperCase() === 'FEET' ? 'CONTAINER' : serviceType;

const formatNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number.toLocaleString('id-ID') : value;
};

const formatDateInput = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toISOString().slice(0, 10);
};

const emptyEditForm = {
  origin: '',
  destination: '',
  expedition: '',
  valid_from: '',
  valid_until: '',
  min_kg: '',
  max_kg: '',
  service_type: '',
  rate: ''
};

const normalizeNumberInput = (value) => {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return '';

  const numericValue = Number(rawValue);
  if (Number.isFinite(numericValue)) return String(Math.trunc(numericValue));

  return rawValue.replace(/\D/g, '');
};

const formatNumberInput = (value) => {
  const digits = normalizeNumberInput(value);
  return digits ? Number(digits).toLocaleString('id-ID') : '';
};

const getRateDetails = (rate) => {
  const warehouseCode =
    getRateValue(rate?.warehouse, ['whs_code', 'warehouse_code', 'code']) ||
    getRateValue(rate, ['origin', 'origin_code', 'warehouse_code', 'whs_code']);
  const warehouseName =
    getRateValue(rate?.warehouse, ['whs_name', 'warehouse_name', 'name']) ||
    getRateValue(rate, ['warehouse_name', 'whs_name']);
  const destination =
    getRateValue(rate, ['destination', 'destination_code', 'destination_name']) ||
    getRateValue(rate?.destination_data || rate?.destination, ['code', 'name', 'destination_name']);
  const destinationCity =
    getRateValue(rate, ['city', 'destination_city']) ||
    getRateValue(rate?.destination_data || rate?.destination, ['city']);
  const expedition =
    getRateValue(rate, ['expedition_code', 'expedition']) ||
    getRateValue(rate?.expedition_data || rate?.expedition, ['code', 'expedition_code']);

  return {
    warehouseCode,
    warehouseName,
    destination,
    destinationCity,
    expedition,
    validFrom: formatDateInput(getRateValue(rate, ['valid_from', 'start_date', 'effective_from'])),
    validUntil: formatDateInput(getRateValue(rate, ['valid_until', 'end_date', 'effective_until'])),
    minKg: getRateValue(rate, ['min_tonnage', 'min_kg']),
    maxKg: getRateValue(rate, ['max_tonnage', 'max_kg']),
    serviceType: String(getRateValue(rate, ['service_type', 'service'])).toUpperCase(),
    rate: getRateValue(rate, ['rate', 'amount', 'price'])
  };
};

const uniqueValues = (values) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const normalizeColumnName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const firstValue = (item, keys) =>
  keys.map((key) => item?.[key]).find((value) => String(value || '').trim()) || '';

const joinValues = (values, separator = ' - ') =>
  values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(separator);

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

  return {
    alias,
    street,
    dropdown: joinValues([alias, street])
  };
};

const addDropdownValidations = (workbookBuffer) => {
  const workbookBytes = workbookBuffer instanceof Uint8Array ? workbookBuffer : new Uint8Array(workbookBuffer);
  const container = XLSX.CFB.read(workbookBytes, { type: 'buffer' });
  const sheetEntry = XLSX.CFB.find(container, '/xl/worksheets/sheet1.xml');

  if (!sheetEntry?.content) return workbookBuffer;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const xml = decoder.decode(sheetEntry.content);
  const validations =
    '<dataValidations count="4">' +
    '<dataValidation type="list" allowBlank="0" sqref="A2:A1000"><formula1>OriginList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="B2:B1000"><formula1>DestinationList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="D2:D1000"><formula1>TransportModeList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="I2:I1000"><formula1>ServiceTypeList</formula1></dataValidation>' +
    '</dataValidations>';
  const trailingWorksheetElement = /<(?:hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/;
  const insertionIndex = xml.search(trailingWorksheetElement);
  const validatedXml =
    insertionIndex >= 0
      ? `${xml.slice(0, insertionIndex)}${validations}${xml.slice(insertionIndex)}`
      : xml.replace('</worksheet>', `${validations}</worksheet>`);

  sheetEntry.content = encoder.encode(validatedXml);
  sheetEntry.size = sheetEntry.content.length;

  return XLSX.CFB.write(container, { fileType: 'zip', type: 'array' });
};

const validateRatesWorkbook = (workbook, expeditionCode) => {
  const sheetName = workbook.SheetNames.find((name) => name.trim().toLowerCase() === 'rates upload') || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) throw new Error('Rates Upload sheet was not found');

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  const headers = (rows[0] || []).map(normalizeColumnName);
  const missingColumns = requiredUploadColumns.filter((column) => !headers.includes(column));

  if (missingColumns.length) throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);

  const columnIndexes = Object.fromEntries(rateColumns.map((column) => [column, headers.indexOf(column)]));
  const dataRows = rows
    .slice(1)
    .map((row, index) => ({
      excelRow: index + 2,
      values: Object.fromEntries(rateColumns.map((column) => [column, row[columnIndexes[column]]]))
    }))
    .filter(({ values }) => rateColumns.some((column) => String(values[column] ?? '').trim()));

  if (!dataRows.length) throw new Error('No rates data found in the Rates Upload sheet');

  dataRows.forEach(({ excelRow, values }) => {
    const emptyColumns = requiredUploadColumns.filter(
      (column) => String(values[column] ?? '').trim() === ''
    );
    if (emptyColumns.length) throw new Error(`Row ${excelRow}: fill in ${emptyColumns.join(', ')}`);

    const minTonnage = Number(values.min_tonnage);
    const maxTonnage = Number(values.max_tonnage);
    const rate = Number(values.rate);
    if (![minTonnage, maxTonnage, rate].every(Number.isFinite)) {
      throw new Error(`Row ${excelRow}: min_tonnage, max_tonnage, and rate must be numbers`);
    }
    if (minTonnage < 0 || maxTonnage < minTonnage || rate < 0) {
      throw new Error(`Row ${excelRow}: check the tonnage range and rate values`);
    }

    const transportMode = String(values.transport_mode).trim().toUpperCase();
    if (!['D', 'L', 'U'].includes(transportMode)) {
      throw new Error(`Row ${excelRow}: transport_mode must be D, L, or U`);
    }

    const serviceType = String(values.service_type).trim().toUpperCase();
    if (!['RIT', 'TONASE', 'CONTAINER'].includes(serviceType)) {
      throw new Error(`Row ${excelRow}: service_type must be RIT, TONASE, or CONTAINER`);
    }
    if (String(values.expedition).trim() !== expeditionCode) {
      throw new Error(`Row ${excelRow}: expedition must match ${expeditionCode}`);
    }
  });

  return dataRows.length;
};

export default function Rates() {
  const { showAlert } = useAlert();
  const isAdministrator = Number(getCookies('role')) === 5;
  const uploadInputRef = useRef(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [exportingRates, setExportingRates] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [rateToDelete, setRateToDelete] = useState(null);
  const [deletingRateId, setDeletingRateId] = useState(null);
  const [rateToEdit, setRateToEdit] = useState(null);
  const [rateToView, setRateToView] = useState(null);
  const [rateActionMenu, setRateActionMenu] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [updatingRateId, setUpdatingRateId] = useState(null);
  const [expeditionOptions, setExpeditionOptions] = useState([]);
  const [loadingExpeditions, setLoadingExpeditions] = useState(false);
  const [selectedExpeditionCode, setSelectedExpeditionCode] = useState(() =>
    String(getCookies('expedition_code') || '').trim()
  );

  const fetchRates = useCallback(async () => {
    setLoadingRates(true);

    try {
      const expeditionCode = isAdministrator
        ? selectedExpeditionCode
        : String(getCookies('expedition_code') || '').trim();
      const response = await RateServices.getRates({
        per_page: 1000,
        expedition_code: expeditionCode || undefined
      });

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch rates');
      }

      setRates(getRateList(response));
    } catch (error) {
      setRates([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch rates', 'danger');
    } finally {
      setLoadingRates(false);
    }
  }, [isAdministrator, selectedExpeditionCode, showAlert]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  useEffect(() => {
    const fetchExpeditions = async () => {
      setLoadingExpeditions(true);

      try {
        const response = await ExpeditionServices.getExpeditions({ per_page: 1000 });
        if (response?.data?.success === false) {
          throw new Error(response.data.message || 'Failed to fetch expedition data');
        }

        const options = getList(response, ['expeditions'])
          .map((item) => {
            const code = String(item.code ?? item.expedition_code ?? '').trim();
            const name = String(item.name ?? item.expedition_name ?? '').trim();

            return {
              value: code,
              label: [code, name].filter(Boolean).join(' - '),
              name
            };
          })
          .filter((item) => item.value);

        setExpeditionOptions(options);
      } catch (error) {
        setExpeditionOptions([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch expedition data', 'danger');
      } finally {
        setLoadingExpeditions(false);
      }
    };

    fetchExpeditions();
  }, [isAdministrator, showAlert]);

  const handleExportRates = () => {
    if (!rates.length) {
      showAlert('No rates data available to export', 'warning');
      return;
    }

    setExportingRates(true);

    try {
      const rows = rates.map((rate, index) => {
        const details = getRateDetails(rate);
        const expeditionCode =
          getRateValue(rate, ['expedition_code']) ||
          getRateValue(rate?.expedition_data || rate?.expedition, ['code', 'expedition_code']) ||
          details.expedition;
        const expeditionName =
          getRateValue(rate?.expedition_data || rate?.expedition, ['name', 'expedition_name']) ||
          getRateValue(rate, ['expedition_name']) ||
          expeditionOptions.find((option) => option.value === expeditionCode)?.name ||
          '';

        return {
          No: index + 1,
          'Origin Code': details.warehouseCode,
          'Origin Name': details.warehouseName,
          Destination: details.destination,
          'Destination City': details.destinationCity,
          'Expedition Code': expeditionCode,
          'Expedition Name': expeditionName,
          'Transport Mode': getRateValue(rate, ['transport_mode', 'mode']),
          'Valid From': details.validFrom,
          'Valid Until': details.validUntil,
          'Min Weight (Kg)': Number(details.minKg) || 0,
          'Max Weight (Kg)': Number(details.maxKg) || 0,
          'Service Type': getServiceTypeLabel(details.serviceType),
          Rate: Number(details.rate) || 0
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 7 },
        { wch: 16 },
        { wch: 28 },
        { wch: 32 },
        { wch: 22 },
        { wch: 18 },
        { wch: 28 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 }
      ];
      worksheet['!autofilter'] = { ref: `A1:N${rows.length + 1}` };

      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Title: 'Expedition Rates',
        Subject: 'Exported expedition rates',
        Author: 'Distributor Channel'
      };
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rates');

      const expeditionLabel = selectedExpeditionCode || getCookies('expedition_code') || 'All';
      const safeExpeditionLabel = String(expeditionLabel).replace(/[^a-z0-9_-]+/gi, '_');
      const dateLabel = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Rates_${safeExpeditionLabel}_${dateLabel}.xlsx`);
      showAlert(`${rows.length} rates exported successfully`, 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to export rates', 'danger');
    } finally {
      setExportingRates(false);
    }
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
      const expeditionCode = String(getCookies('expedition_code') || '').trim();
      const originValues = uniqueValues(
        origins.map((item) => {
          const warehouseName = firstValue(item, [
            'whsNameOrigin',
            'whs_name_origin',
            'origin_name',
            'warehouse_name',
            'name'
          ]);

          return warehouseName;
        })
      );
      const destinationRows = destinations.map(getDestinationRow).filter((item) => item.dropdown);
      const destinationValues = uniqueValues(destinationRows.map((item) => item.dropdown));

      if (!originValues.length) throw new Error('Origin master is empty');
      if (!destinationValues.length) throw new Error('Destination master is empty');
      if (!expeditionCode) throw new Error('Expedition code for the logged-in user was not found');

      const workbook = XLSX.utils.book_new();
      const validFrom = new Date();
      const validUntil = new Date(validFrom);
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      const formatTemplateDate = (date) => date.toISOString().slice(0, 10);
      const rateRows = [
        [
          'origin',
          'destination',
          'expedition',
          'transport_mode',
          'valid_from',
          'valid_until',
          'min_tonnage',
          'max_tonnage',
          'service_type',
          'rate'
        ],
        [
          originValues[0],
          destinationValues[0],
          expeditionCode,
          'D',
          formatTemplateDate(validFrom),
          formatTemplateDate(validUntil),
          0,
          1000,
          'TONASE',
          0
        ]
      ];

      for (let row = 3; row <= 200; row += 1) {
        rateRows.push(['', '', '', '', '', '', '', '', '', '']);
      }

      const ratesSheet = XLSX.utils.aoa_to_sheet(rateRows);
      const originSheet = XLSX.utils.aoa_to_sheet([['origin'], ...originValues.map((value) => [value])]);
      const destinationSheet = XLSX.utils.aoa_to_sheet([
        ['alias', 'street'],
        ...destinationRows.map((item) => [item.alias, item.street])
      ]);
      const dropdownSheet = XLSX.utils.aoa_to_sheet([
        ['alias_street'],
        ...destinationValues.map((value) => [value])
      ]);
      const expeditionSheet = XLSX.utils.aoa_to_sheet([['expedition_code'], [expeditionCode]]);
      const transportModeSheet = XLSX.utils.aoa_to_sheet([['transport_mode'], ['D'], ['L'], ['U']]);
      const serviceTypeSheet = XLSX.utils.aoa_to_sheet([['service_type'], ['RIT'], ['TONASE'], ['CONTAINER']]);

      ratesSheet['!cols'] = [
        { wch: 32 },
        { wch: 36 },
        { wch: 30 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 }
      ];
      originSheet['!cols'] = [{ wch: 40 }];
      destinationSheet['!cols'] = [{ wch: 40 }, { wch: 70 }];
      dropdownSheet['!cols'] = [{ wch: 80 }];
      expeditionSheet['!cols'] = [{ wch: 22 }];
      transportModeSheet['!cols'] = [{ wch: 20 }];
      serviceTypeSheet['!cols'] = [{ wch: 20 }];
      ratesSheet['!autofilter'] = { ref: 'A1:J200' };
      originSheet['!autofilter'] = { ref: `A1:A${originValues.length + 1}` };
      destinationSheet['!autofilter'] = { ref: `A1:B${destinationRows.length + 1}` };
      dropdownSheet['!autofilter'] = { ref: `A1:A${destinationValues.length + 1}` };
      expeditionSheet['!autofilter'] = { ref: 'A1:A2' };
      transportModeSheet['!autofilter'] = { ref: 'A1:A4' };
      serviceTypeSheet['!autofilter'] = { ref: 'A1:A4' };

      XLSX.utils.book_append_sheet(workbook, ratesSheet, 'Rates Upload');
      XLSX.utils.book_append_sheet(workbook, originSheet, 'Master Origin');
      XLSX.utils.book_append_sheet(workbook, destinationSheet, 'Master Destination');
      XLSX.utils.book_append_sheet(workbook, expeditionSheet, 'User Expedition');
      XLSX.utils.book_append_sheet(workbook, transportModeSheet, 'Master Transport Mode');
      XLSX.utils.book_append_sheet(workbook, serviceTypeSheet, 'Master Service Type');
      XLSX.utils.book_append_sheet(workbook, dropdownSheet, 'Dropdown Lists');
      workbook.Workbook = {
        Sheets: workbook.SheetNames.map((name) => ({
          name,
          Hidden: name === 'Dropdown Lists' ? 1 : 0
        })),
        Names: [
          { Name: 'OriginList', Ref: `'Master Origin'!$A$2:$A$${originValues.length + 1}` },
          { Name: 'DestinationList', Ref: `'Dropdown Lists'!$A$2:$A$${destinationValues.length + 1}` },
          { Name: 'TransportModeList', Ref: "'Master Transport Mode'!$A$2:$A$4" },
          { Name: 'ServiceTypeList', Ref: "'Master Service Type'!$A$2:$A$4" }
        ]
      };

      const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const validatedWorkbook = addDropdownValidations(workbookBuffer);
      const blob = new Blob([validatedWorkbook], {
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

  const handleUploadExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
      showAlert('File format must be XLSX or XLS', 'danger');
      event.target.value = '';
      return;
    }

    const expeditionCode = String(getCookies('expedition_code') || '').trim();
    if (!expeditionCode) {
      showAlert('Expedition code for the logged-in user was not found', 'danger');
      event.target.value = '';
      return;
    }

    setUploadingExcel(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const recordCount = validateRatesWorkbook(workbook, expeditionCode);
      const response = await RateServices.uploadRatesExcel(file, expeditionCode);

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to import rates');
      }

      showAlert(response?.data?.message || `${recordCount} rates imported successfully`, 'success');
      setShowUpload(false);
      await fetchRates();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to upload rates Excel', 'danger');
    } finally {
      setUploadingExcel(false);
      event.target.value = '';
    }
  };

  const handleDeleteRate = async () => {
    const rateId = rateToDelete?.id ?? rateToDelete?.rate_id;
    if (!rateId) {
      showAlert('Rate ID was not found', 'danger');
      return;
    }

    setDeletingRateId(rateId);

    try {
      const response = await RateServices.deleteRate(rateId);
      const isSuccessful = response?.status < 400 && response?.data?.success !== false;

      if (!isSuccessful) {
        throw new Error(response?.data?.message || 'Failed to delete rate');
      }

      showAlert(response?.data?.message || 'Rate deleted successfully', 'success');
      setRateToDelete(null);
      await fetchRates();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to delete rate', 'danger');
    } finally {
      setDeletingRateId(null);
    }
  };

  const openEditRate = (rate) => {
    const details = getRateDetails(rate);

    setRateToEdit(rate);
    setEditForm({
      origin: details.warehouseCode,
      destination: details.destination,
      expedition: details.expedition,
      valid_from: details.validFrom,
      valid_until: details.validUntil,
      min_kg: normalizeNumberInput(details.minKg),
      max_kg: normalizeNumberInput(details.maxKg),
      service_type: details.serviceType,
      rate: details.rate
    });
  };

  const closeEditRate = () => {
    if (updatingRateId) return;
    setRateToEdit(null);
    setEditForm(emptyEditForm);
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleNumberEditChange = (field) => (event) => {
    setEditForm((current) => ({ ...current, [field]: event.target.value.replace(/\D/g, '') }));
  };

  const handleUpdateRate = async (event) => {
    event.preventDefault();

    const rateId = rateToEdit?.id ?? rateToEdit?.rate_id;
    if (!rateId) {
      showAlert('Rate ID was not found', 'danger');
      return;
    }

    const requiredFields = Object.entries(editForm).filter(([, value]) => String(value).trim() === '');
    if (requiredFields.length) {
      showAlert(`Please complete: ${requiredFields.map(([field]) => field.replaceAll('_', ' ')).join(', ')}`, 'danger');
      return;
    }

    const minKg = Number(editForm.min_kg);
    const maxKg = Number(editForm.max_kg);
    const rateValue = Number(editForm.rate);
    if (![minKg, maxKg, rateValue].every(Number.isFinite) || minKg < 0 || maxKg < minKg || rateValue < 0) {
      showAlert('Check the weight range and rate values', 'danger');
      return;
    }

    if (new Date(editForm.valid_until) < new Date(editForm.valid_from)) {
      showAlert('Valid until must be on or after valid from', 'danger');
      return;
    }

    setUpdatingRateId(rateId);

    try {
      const payload = {
        origin: editForm.origin.trim(),
        destination: editForm.destination.trim(),
        expedition: editForm.expedition.trim(),
        valid_from: editForm.valid_from,
        valid_until: editForm.valid_until,
        min_tonnage: minKg,
        max_tonnage: maxKg,
        service_type: editForm.service_type,
        rate: rateValue
      };
      const response = await RateServices.updateRate(rateId, payload);
      const isSuccessful = response?.status < 400 && response?.data?.success !== false;

      if (!isSuccessful) {
        throw new Error(response?.data?.message || 'Failed to update rate');
      }

      showAlert(response?.data?.message || 'Rate updated successfully', 'success');
      setRateToEdit(null);
      setEditForm(emptyEditForm);
      await fetchRates();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to update rate', 'danger');
    } finally {
      setUpdatingRateId(null);
    }
  };

  return (
    <>
      <MainCard
        title={
          <Stack direction="horizontal" className="justify-content-between flex-wrap gap-3">
            <div>
              <h5 className="mb-1">Rates</h5>
              <span className="text-muted f-12">Kelola tarif pengiriman untuk setiap ekspedisi dan rute.</span>
            </div>
            <Stack direction="horizontal" gap={2}>
              <Button
                variant="outline-success"
                disabled={loadingRates || exportingRates || !rates.length}
                onClick={handleExportRates}
              >
                <i className={exportingRates ? 'ti ti-loader-2 me-1' : 'ti ti-file-export me-1'} />
                {exportingRates ? 'Exporting...' : 'Export Rates'}
              </Button>
              <Button variant="success" onClick={() => setShowUpload(true)}>
                <i className="ti ti-file-upload me-1" />
                Upload Excel
              </Button>
              <Button disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
                <i className={downloadingTemplate ? 'ti ti-loader-2 me-1' : 'ti ti-download me-1'} />
                {downloadingTemplate ? 'Preparing...' : 'Download Template'}
              </Button>
            </Stack>
          </Stack>
        }
      >
        {isAdministrator && (
          <Row className="mb-3">
            <Col md={6} lg={4}>
              <Form.Label className="f-12 text-muted">Expedition</Form.Label>
              <Select
                value={expeditionOptions.find((option) => option.value === selectedExpeditionCode) || null}
                options={expeditionOptions}
                onChange={(option) => setSelectedExpeditionCode(option?.value || '')}
                placeholder={loadingExpeditions ? 'Loading expedition...' : 'Search expedition'}
                isLoading={loadingExpeditions}
                isClearable
                isSearchable
                menuPosition="fixed"
              />
            </Col>
          </Row>
        )}
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Origin</th>
              <th>Destination</th>
              <th>Expedition</th>
              <th>Weight Range (Kg)</th>
              <th>Service Type</th>
              <th className="text-end">Rate</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingRates ? (
              <tr>
                <td colSpan={7}>
                  <LoaderData />
                </td>
              </tr>
            ) : rates.length ? (
              rates.map((rate, index) => {
                const warehouseName =
                  getRateValue(rate?.warehouse, ['whs_name', 'warehouse_name', 'name']) ||
                  getRateValue(rate, ['warehouse_name', 'whs_name', 'warehouse']);
                const warehouseCode =
                  getRateValue(rate?.warehouse, ['whs_code', 'warehouse_code', 'code']) ||
                  getRateValue(rate, ['whs_code', 'warehouse_code']);
                const destination =
                  getRateValue(rate, ['destination', 'destination_name']) ||
                  getRateValue(rate?.destination_data || rate?.destination, [
                    'name',
                    'destination_name',
                    'ship_to_name',
                    'address_name'
                  ]);
                const destinationCity =
                  getRateValue(rate, ['city', 'destination_city']) ||
                  getRateValue(rate?.destination_data || rate?.destination, ['city']);
                const expeditionCode = getRateValue(rate, ['expedition_code']);
                const expeditionMaster = expeditionOptions.find((option) => option.value === expeditionCode);
                const expedition =
                  getRateValue(rate?.expedition_data || rate?.expedition, ['name', 'expedition_name']) ||
                  getRateValue(rate, ['expedition_name']) ||
                  expeditionMaster?.name ||
                  getRateValue(rate, ['expedition']);
                const minTonnage = getRateValue(rate, ['min_tonnage']);
                const maxTonnage = getRateValue(rate, ['max_tonnage']);
                const numericMinTonnage = Number(minTonnage);
                const numericMaxTonnage = Number(maxTonnage);
                const isSameTonnage =
                  minTonnage !== '' &&
                  maxTonnage !== '' &&
                  Number.isFinite(numericMinTonnage) &&
                  Number.isFinite(numericMaxTonnage) &&
                  numericMinTonnage === numericMaxTonnage;
                const weightRange =
                  isSameTonnage
                    ? formatNumber(minTonnage)
                    : [minTonnage, maxTonnage]
                        .filter((value) => value !== '')
                        .map(formatNumber)
                        .join(' - ');
                const serviceType = getRateValue(rate, ['service_type', 'service']);
                const rateValue = getRateValue(rate, ['rate', 'amount', 'price']);

                return (
                  <tr
                    key={rate.id || rate.rate_id || `${warehouseCode}-${destination}-${index}`}
                    className={rateValue !== '' && Number(rateValue) === 0 ? 'table-danger' : undefined}
                  >
                    <td>
                      <div>{warehouseName || '-'}</div>
                      {warehouseCode ? <small className="text-muted">{warehouseCode}</small> : null}
                    </td>
                    <td>
                      <div>{destination || '-'}</div>
                      {destinationCity ? <small className="text-muted">{destinationCity}</small> : null}
                    </td>
                    <td>{expedition || '-'}</td>
                    <td>{weightRange === '' ? '-' : weightRange}</td>
                    <td>{getServiceTypeLabel(serviceType) || '-'}</td>
                    <td className="text-end">
                      {rateValue === '' ? (
                        '-'
                      ) : Number(rateValue) === 0 ? (
                        <Badge bg="danger">SKIP</Badge>
                      ) : (
                        `Rp ${formatNumber(rateValue)}`
                      )}
                    </td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant={
                          String(rateActionMenu?.rate?.id ?? rateActionMenu?.rate?.rate_id) ===
                          String(rate?.id ?? rate?.rate_id)
                            ? 'primary'
                            : 'outline-primary'
                        }
                        disabled={Boolean(deletingRateId || updatingRateId)}
                        aria-label={`Open actions for rate ${warehouseCode || ''} ${destination || ''}`.trim()}
                        aria-expanded={
                          String(rateActionMenu?.rate?.id ?? rateActionMenu?.rate?.rate_id) ===
                          String(rate?.id ?? rate?.rate_id)
                        }
                        onClick={(event) =>
                          setRateActionMenu((current) =>
                            String(current?.rate?.id ?? current?.rate?.rate_id) === String(rate?.id ?? rate?.rate_id)
                              ? null
                              : { rate, target: event.currentTarget }
                          )
                        }
                      >
                        <i className="ti ti-dots-vertical me-1" />
                        Actions
                        <i className="ti ti-chevron-down ms-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center text-muted py-5">
                  No rates data found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>

      <Overlay
        show={Boolean(rateActionMenu)}
        target={rateActionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setRateActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const rate = rateActionMenu?.rate;

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 180 }}
            >
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setRateActionMenu(null);
                  setRateToView(rate);
                }}
              >
                <i className="ti ti-eye text-primary me-2" />
                View
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setRateActionMenu(null);
                  openEditRate(rate);
                }}
              >
                <i className="ti ti-edit text-warning me-2" />
                Edit
              </button>
              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={() => {
                  setRateActionMenu(null);
                  setRateToDelete(rate);
                }}
              >
                <i className="ti ti-trash me-2" />
                Delete
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal show={showUpload} onHide={() => !uploadingExcel && setShowUpload(false)} centered>
        <Modal.Header closeButton={!uploadingExcel}>
          <Modal.Title>Upload Rates Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="border mb-3">
            <Card.Body>
              <Stack direction="horizontal" gap={3} className="align-items-start">
                <span className="avtar avtar-s bg-light-primary text-primary">
                  <i className="ti ti-table" />
                </span>
                <div>
                  <h6 className="mb-1">Rates Upload Format</h6>
                  <p className="text-muted mb-2">Use the downloaded template and complete all columns on each data row.</p>
                  <div className="d-flex flex-wrap gap-2">
                    {rateColumns.map((column) => (
                      <Badge key={column} bg="light" text="dark" className="border">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Stack>
            </Card.Body>
          </Card>
          <Button variant="success" className="w-100" onClick={() => uploadInputRef.current?.click()} disabled={uploadingExcel}>
            <i className={`${uploadingExcel ? 'ti ti-loader-2' : 'ti ti-upload'} me-1`} />
            {uploadingExcel ? 'Uploading...' : 'Choose Excel File'}
          </Button>
          <Form.Control
            ref={uploadInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="d-none"
            onChange={handleUploadExcel}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowUpload(false)} disabled={uploadingExcel}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(rateToView)} onHide={() => setRateToView(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Rate Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {rateToView ? (
            <Row className="g-3">
              {(() => {
                const details = getRateDetails(rateToView);
                const expeditionOption = expeditionOptions.find((option) => option.value === details.expedition);

                return (
                  <>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Origin</Form.Label>
                      <div className="fw-semibold">{details.warehouseName || details.warehouseCode || '-'}</div>
                      {details.warehouseName && details.warehouseCode ? (
                        <small className="text-muted">{details.warehouseCode}</small>
                      ) : null}
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Destination</Form.Label>
                      <div className="fw-semibold">{details.destination || '-'}</div>
                      {details.destinationCity ? <small className="text-muted">{details.destinationCity}</small> : null}
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Expedition</Form.Label>
                      <div>{expeditionOption?.label || details.expedition || '-'}</div>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Service Type</Form.Label>
                      <div>{getServiceTypeLabel(details.serviceType) || '-'}</div>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Valid From</Form.Label>
                      <div>{details.validFrom || '-'}</div>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Valid Until</Form.Label>
                      <div>{details.validUntil || '-'}</div>
                    </Col>
                    <Col md={4}>
                      <Form.Label className="f-12 text-muted">Minimum Weight</Form.Label>
                      <div>{details.minKg === '' ? '-' : `${formatNumber(details.minKg)} Kg`}</div>
                    </Col>
                    <Col md={4}>
                      <Form.Label className="f-12 text-muted">Maximum Weight</Form.Label>
                      <div>{details.maxKg === '' ? '-' : `${formatNumber(details.maxKg)} Kg`}</div>
                    </Col>
                    <Col md={4}>
                      <Form.Label className="f-12 text-muted">Rate</Form.Label>
                      <div className="fw-semibold text-primary">
                        {details.rate === '' ? '-' : `Rp ${formatNumber(details.rate)}`}
                      </div>
                    </Col>
                  </>
                );
              })()}
            </Row>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setRateToView(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(rateToEdit)} onHide={closeEditRate} centered size="lg">
        <Form onSubmit={handleUpdateRate}>
          <Modal.Header closeButton={!updatingRateId}>
            <Modal.Title>Edit Rate</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Origin</Form.Label>
                  <Form.Control value={editForm.origin} onChange={handleEditChange('origin')} placeholder="Origin code" required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Destination</Form.Label>
                  <Form.Control
                    value={editForm.destination}
                    onChange={handleEditChange('destination')}
                    placeholder="Destination"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Expedition</Form.Label>
                  <Form.Select value={editForm.expedition} onChange={handleEditChange('expedition')} required>
                    <option value="">Select expedition</option>
                    {expeditionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    {editForm.expedition && !expeditionOptions.some((option) => option.value === editForm.expedition) ? (
                      <option value={editForm.expedition}>{editForm.expedition}</option>
                    ) : null}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Service Type</Form.Label>
                  <Form.Select value={editForm.service_type} onChange={handleEditChange('service_type')} required>
                    <option value="">Select service type</option>
                    <option value="RIT">RIT</option>
                    <option value="TONASE">TONASE</option>
                    <option value="FEET">CONTAINER</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Valid From</Form.Label>
                  <Form.Control type="date" value={editForm.valid_from} onChange={handleEditChange('valid_from')} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Valid Until</Form.Label>
                  <Form.Control type="date" value={editForm.valid_until} onChange={handleEditChange('valid_until')} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Minimum Weight (Kg)</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(editForm.min_kg)}
                    onChange={handleNumberEditChange('min_kg')}
                    placeholder="0"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Maximum Weight (Kg)</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(editForm.max_kg)}
                    onChange={handleNumberEditChange('max_kg')}
                    placeholder="0"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Rate</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(editForm.rate)}
                    onChange={handleNumberEditChange('rate')}
                    placeholder="0"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" disabled={Boolean(updatingRateId)} onClick={closeEditRate}>
              Cancel
            </Button>
            <Button type="submit" disabled={Boolean(updatingRateId)}>
              <i className={updatingRateId ? 'ti ti-loader-2 me-1' : 'ti ti-device-floppy me-1'} />
              {updatingRateId ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(rateToDelete)} onHide={() => !deletingRateId && setRateToDelete(null)} centered>
        <Modal.Header closeButton={!deletingRateId}>
          <Modal.Title>Delete Rate</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Are you sure you want to delete this shipping rate?</p>
          <div className="rounded border bg-light p-3">
            <div className="fw-semibold">
              {getRateValue(rateToDelete, ['origin', 'warehouse_name', 'whs_name']) || 'Origin'}
              {' → '}
              {getRateValue(rateToDelete, ['destination', 'destination_name']) || 'Destination'}
            </div>
            <small className="text-muted">
              {getServiceTypeLabel(getRateValue(rateToDelete, ['service_type', 'service'])) || 'Service'}
              {' · '}
              Rp {formatNumber(getRateValue(rateToDelete, ['rate', 'amount', 'price']) || 0)}
            </small>
          </div>
          <p className="text-danger f-12 mt-3 mb-0">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={Boolean(deletingRateId)} onClick={() => setRateToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={Boolean(deletingRateId)} onClick={handleDeleteRate}>
            <i className={deletingRateId ? 'ti ti-loader-2 me-1' : 'ti ti-trash me-1'} />
            {deletingRateId ? 'Deleting...' : 'Delete Rate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
