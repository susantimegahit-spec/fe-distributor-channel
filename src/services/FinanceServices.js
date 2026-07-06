import { DataService } from '../config/dataService';
import ProductServices from './ProductServices';

const rewardTemplateHeaders = [
  'Kode Customer',
  'Customer Name',
  'Kode Item',
  'Item Name',
  'Qty',
  'Selling Price @ Kg',
  'Tipe Customer',
  'Transaction Date'
];

const getProductRows = (products) =>
  products.map((item) => ({
    'Item Code': item.item_code || item.code || '',
    'Item Name': item.item_name || item.name || '',
    Status: item.status === 1 ? 'Active' : 'Inactive'
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

const buildRow = (values, styleId = '') => `<Row>${values.map((value) => buildCell(value, styleId)).join('')}</Row>`;
const buildEmptyRow = () => '<Row/>';

const buildWorksheet = (name, rows) => `
  <Worksheet ss:Name="${escapeXml(name)}">
    <Table>
      ${rows.join('')}
    </Table>
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

  async downloadRewardTemplate() {
    const response = await ProductServices.getAllProduct('');

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Failed to fetch master item');
    }

    const products = response.data.data || [];
    const masterItemRows = getProductRows(products);
    const masterItemHeaders = ['Item Code', 'Item Name', 'Status'];
    const templateRows = [
      buildRow(rewardTemplateHeaders, 'Header'),
      buildRow(
        rewardTemplateHeaders.map(() => ''),
        'TableCell'
      ),
      buildEmptyRow(),
      buildRow(['*Customer Type must be filled with MT/GT'], 'Information'),
      buildRow(['*Use Item Code and Item Name from the master item sheet'], 'Information')
    ];
    const masterItemSheetRows = [
      buildRow(masterItemHeaders, 'Header'),
      ...masterItemRows.map((item) =>
        buildRow(
          masterItemHeaders.map((header) => item[header]),
          'TableCell'
        )
      )
    ];

    downloadExcelXml('template-claim-reward.xls', [
      buildWorksheet('template', templateRows),
      buildWorksheet('Master Item', masterItemSheetRows)
    ]);

    return products;
  }
}

export default new FinanceServices();
