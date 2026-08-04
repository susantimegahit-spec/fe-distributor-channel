import { DataService } from '../../config/dataService';
import ProductServices from './ProductServices';

const rewardTemplateHeaders = [
  'Kode Distributor',
  'Nama Distributor',
  'Kode Item',
  'Nama Item',
  'Qty',
  'Selling Price @ Kg',
  'Tipe Customer',
  'Transaction Date',
  'Depo',
  'Kode Customer',
  'Nama Customer',
  'Alamat',
  'Kota / Kabupaten',
  'Kecamatan',
  'Salesman Distributor',
  'Jenis Barang',
  'Jenis Transaksi',
  'Channel',
  'DPP',
  'Diskon 1',
  'Diskon 2',
  'Diskon 3',
  'Diskon 4',
  'Diskon 5',
  'PPN',
  'NET'
];

const normalizeList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

const getProductRows = (products) =>
  products.map((item) => ({
    'Item Code': item.item_code || item.code_item || item.itemCode || item.code || '',
    'Item Name': item.item_name || item.itemName || item.name || '',
    Status: item.status === 1 || String(item.status).toLowerCase() === 'active' ? 'Active' : 'Inactive'
  }));

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildCell = (value, styleId = '') => {
  const styleAttribute = styleId ? ` ss:StyleID="${styleId}"` : '';

  return `<Cell${styleAttribute}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
};

const buildFormulaCell = (formula, styleId = '') => {
  const styleAttribute = styleId ? ` ss:StyleID="${styleId}"` : '';

  return `<Cell${styleAttribute} ss:Formula="${escapeXml(formula)}"><Data ss:Type="String"></Data></Cell>`;
};

const buildRow = (values, styleId = '') => `<Row>${values.map((value) => buildCell(value, styleId)).join('')}</Row>`;
const buildEmptyRow = () => '<Row/>';

const buildRewardInputRow = (masterItemLastRow, distributor = {}) =>
  `<Row>${rewardTemplateHeaders
    .map((header) => {
      if (header === 'Kode Distributor') {
        return buildCell(distributor.code || '', 'TableCell');
      }

      if (header === 'Nama Distributor') {
        return buildCell(distributor.name || '', 'TableCell');
      }

      if (header === 'Nama Item' && masterItemLastRow > 1) {
        return buildFormulaCell(
          `=IF(RC[-1]="","",IFERROR(VLOOKUP(RC[-1],'Master Item'!R2C1:R${masterItemLastRow}C2,2,FALSE),""))`,
          'TableCell'
        );
      }

      return buildCell('', 'TableCell');
    })
    .join('')}</Row>`;

const buildListValidation = (range, source) => `
    <x:DataValidation>
      <x:Range>${escapeXml(range)}</x:Range>
      <x:Type>List</x:Type>
      <x:Value>${escapeXml(source)}</x:Value>
    </x:DataValidation>`;

const buildWorksheet = (name, rows, validations = []) => `
  <Worksheet ss:Name="${escapeXml(name)}">
    <Table>
      ${rows.join('')}
    </Table>
    ${validations.join('')}
  </Worksheet>`;

const downloadExcelXml = (fileName, worksheets) => {
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>
    <Style ss:ID="TableCell">
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>
    <Style ss:ID="Information">
      <Font ss:Italic="1"/>
    </Style>
  </Styles>
  ${worksheets.join('')}
</Workbook>`;

  const blob = new Blob([workbook], {
    type: 'application/vnd.ms-excel;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

class FinanceServices {
  getDownloadTemplate(payload) {
    return DataService.get(`/claims/template-excel`);
  }

  postBalanceLedger(payload) {
    return DataService.post('/claims/balance-ledger/adjustment', payload);
  }

  postBalanceLedget(payload) {
    return this.postBalanceLedger(payload);
  }

  async downloadRewardTemplate(distributor = {}) {
    const response = await ProductServices.getAllProduct('');

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Failed to fetch master item');
    }

    const products = normalizeList(response);
    const masterItemRows = getProductRows(products);
    const masterItemHeaders = ['Item Code', 'Item Name', 'Status'];
    const masterItemSheetRows = [
      buildRow(masterItemHeaders, 'Header'),
      ...masterItemRows.map((item) =>
        buildRow(
          masterItemHeaders.map((header) => item[header]),
          'TableCell'
        )
      )
    ];
    const masterItemLastRow = masterItemRows.length + 1;
    const templateRows = [
      buildRow(rewardTemplateHeaders, 'Header'),
      ...Array.from({ length: 999 }, () => buildRewardInputRow(masterItemLastRow, distributor)),
      buildEmptyRow(),
      buildRow(['*Untuk kolom tipe customer harap diisi dengan MT/GT'], 'Information'),
      buildRow(['*Nama item terisi otomatis setelah kode item dipilih'], 'Information')
    ];
    const itemCodeValidation = masterItemRows.length
      ? [buildListValidation('R2C3:R1000C3', `'Master Item'!R2C1:R${masterItemRows.length + 1}C1`)]
      : [];

    downloadExcelXml('template-claim-reward.xls', [
      buildWorksheet('template', templateRows, itemCodeValidation),
      buildWorksheet('Master Item', masterItemSheetRows)
    ]);

    return products;
  }
}

export default new FinanceServices();
