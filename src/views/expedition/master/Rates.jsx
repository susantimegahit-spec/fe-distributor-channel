import { useState } from 'react';
import * as XLSX from 'xlsx';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import DestinationServices from '../../../services/expedition/DestinationServices';
import OriginServices from '../../../services/expedition/OriginServices';
import { useAlert } from '../../../utils/alertContext';
import { getCookies } from '../../../utils/cookies';

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const getList = (response, keys = []) => {
  const payload = getPayload(response);
  if (Array.isArray(payload)) return payload;

  const list = keys.map((key) => payload?.[key]).find(Array.isArray) || payload?.data || payload?.items;
  return Array.isArray(list) ? list : [];
};

const uniqueValues = (values) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const firstValue = (item, keys) =>
  keys.map((key) => item?.[key]).find((value) => String(value || '').trim()) || '';

const joinValues = (values, separator = ' - ') =>
  values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(separator);

const getDestinationRow = (item) => {
  const customerCode = firstValue(item, ['customerCode', 'customer_code', 'code_customer', 'card_code', 'CardCode']);
  const customerName =
    firstValue(item, ['customerName', 'customer_name', 'card_name', 'CardName', 'name']) || item?.customer?.name;
  const destinationCode = firstValue(item, ['shipToCode', 'ship_to_code', 'address_code', 'AddressName']);
  const destinationName = firstValue(item, [
    'shipToName',
    'ship_to_name',
    'address_name',
    'AddressName2',
    'destination_name'
  ]);
  const street = firstValue(item, ['street', 'Street', 'ship_to_address', 'Address', 'address']);
  const city = firstValue(item, ['city', 'City']);
  const province = firstValue(item, ['province', 'state', 'State']);
  const postalCode = firstValue(item, ['postalCode', 'postal_code', 'zip_code', 'ZipCode']);
  const customer = joinValues([customerCode, customerName]);
  const destination = joinValues([destinationCode, destinationName]);

  return {
    customer,
    destination,
    address: joinValues([street, city, province, postalCode], ', '),
    dropdown: joinValues([customer, destination])
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
    '<dataValidations count="3">' +
    '<dataValidation type="list" allowBlank="0" sqref="A2:A1000"><formula1>OriginList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="B2:B1000"><formula1>DestinationList</formula1></dataValidation>' +
    '<dataValidation type="list" allowBlank="0" sqref="F2:F1000"><formula1>ServiceTypeList</formula1></dataValidation>' +
    '</dataValidations>';

  sheetEntry.content = encoder.encode(xml.replace('</worksheet>', `${validations}</worksheet>`));
  sheetEntry.size = sheetEntry.content.length;

  return XLSX.CFB.write(container, { fileType: 'zip', type: 'array' });
};

export default function Rates() {
  const { showAlert } = useAlert();
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

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
        origins.map((item) => item.whs_name_origin || item.origin_name || item.name || item.whs_code)
      );
      const destinationRows = destinations.map(getDestinationRow).filter((item) => item.dropdown);
      const destinationValues = uniqueValues(destinationRows.map((item) => item.dropdown));

      if (!originValues.length) throw new Error('Origin master is empty');
      if (!destinationValues.length) throw new Error('Destination master is empty');
      if (!expeditionCode) throw new Error('Expedition code for the logged-in user was not found');

      const workbook = XLSX.utils.book_new();
      const rateRows = [
        ['origin', 'destination', 'expedition', 'min_kg', 'max_kg', 'service_type', 'rate'],
        [originValues[0], destinationValues[0], expeditionCode, 0, 1000, 'TONASE', 0]
      ];

      for (let row = 3; row <= 200; row += 1) {
        rateRows.push(['', '', expeditionCode, '', '', '', '']);
      }

      const ratesSheet = XLSX.utils.aoa_to_sheet(rateRows);
      const originSheet = XLSX.utils.aoa_to_sheet([['origin'], ...originValues.map((value) => [value])]);
      const destinationSheet = XLSX.utils.aoa_to_sheet([
        ['customer', 'destination', 'address'],
        ...destinationRows.map((item) => [item.customer, item.destination, item.address])
      ]);
      const dropdownSheet = XLSX.utils.aoa_to_sheet([
        ['customer_destination'],
        ...destinationValues.map((value) => [value])
      ]);
      const expeditionSheet = XLSX.utils.aoa_to_sheet([['expedition_code'], [expeditionCode]]);
      const serviceTypeSheet = XLSX.utils.aoa_to_sheet([['service_type'], ['RIT'], ['TONASE']]);

      ratesSheet['!cols'] = [{ wch: 32 }, { wch: 36 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];
      originSheet['!cols'] = [{ wch: 40 }];
      destinationSheet['!cols'] = [{ wch: 40 }, { wch: 40 }, { wch: 70 }];
      dropdownSheet['!cols'] = [{ wch: 80 }];
      expeditionSheet['!cols'] = [{ wch: 22 }];
      serviceTypeSheet['!cols'] = [{ wch: 20 }];
      ratesSheet['!autofilter'] = { ref: 'A1:G200' };
      originSheet['!autofilter'] = { ref: `A1:A${originValues.length + 1}` };
      destinationSheet['!autofilter'] = { ref: `A1:C${destinationRows.length + 1}` };
      dropdownSheet['!autofilter'] = { ref: `A1:A${destinationValues.length + 1}` };
      expeditionSheet['!autofilter'] = { ref: 'A1:A2' };
      serviceTypeSheet['!autofilter'] = { ref: 'A1:A3' };

      XLSX.utils.book_append_sheet(workbook, ratesSheet, 'Rates Upload');
      XLSX.utils.book_append_sheet(workbook, originSheet, 'Master Origin');
      XLSX.utils.book_append_sheet(workbook, destinationSheet, 'Master Destination');
      XLSX.utils.book_append_sheet(workbook, expeditionSheet, 'User Expedition');
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
          { Name: 'ServiceTypeList', Ref: "'Master Service Type'!$A$2:$A$3" }
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

  return (
    <MainCard
      title={
        <Stack direction="horizontal" className="justify-content-between flex-wrap gap-3">
          <div>
            <h5 className="mb-1">Rates</h5>
            <span className="text-muted f-12">Kelola tarif pengiriman untuk setiap ekspedisi dan rute.</span>
          </div>
          <Button disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
            <i className={downloadingTemplate ? 'ti ti-loader-2 me-1' : 'ti ti-download me-1'} />
            {downloadingTemplate ? 'Preparing...' : 'Download Template'}
          </Button>
        </Stack>
      }
    >
      <Card className="border mb-0">
        <Card.Body className="py-5 text-center">
          <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
            <i className="ti ti-receipt-2 f-32" />
          </span>
          <h5 className="mb-2">Rates Upload Template</h5>
          <p className="text-muted mb-0">
            Download the template to enter rates by origin, destination, expedition, weight range, and service type.
          </p>
        </Card.Body>
      </Card>
    </MainCard>
  );
}
