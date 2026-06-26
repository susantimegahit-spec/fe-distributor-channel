const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 62;
const BLUE = '0.106 0.216 0.494';
const BLACK = '0.08 0.08 0.08';

const getValue = (data, keys, defaultValue = '') => {
  for (const key of keys) {
    const value = String(key)
      .split('.')
      .reduce((current, path) => current?.[path], data);

    if (value !== undefined && value !== null && value !== '') return value;
  }

  return defaultValue;
};

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const escapePdfText = (value) => normalizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const formatNumber = (value) =>
  new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatMoney = (value, withRp = true) => `${withRp ? 'Rp ' : ''}${formatNumber(value)},-`;

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

const sanitizeFileName = (value) =>
  normalizeText(value)
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const getOrderLines = (order) => {
  const lines = getValue(order, ['details', 'lines', 'document_lines', 'DocumentLines'], []);

  return Array.isArray(lines) ? lines : [];
};

const getLineTotal = (line) => {
  const explicitTotal = Number(getValue(line, ['line_total', 'lineTotal', 'LineTotal'], 0));

  if (explicitTotal) return explicitTotal;

  return (
    Number(getValue(line, ['quantity', 'qty', 'Quantity'], 0)) * Number(getValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], 0))
  );
};

const getSubtotal = (lines) => lines.reduce((total, line) => total + getLineTotal(line), 0);

const getDiscountTotal = (order) => {
  const explicitDiscount = Number(getValue(order, ['discount_total', 'disc_total', 'total_discount', 'discount', 'DiscSum', 'discSum'], 0));

  if (explicitDiscount) return explicitDiscount;

  const subtotal = getSubtotal(getOrderLines(order));
  const docTotal = Number(getValue(order, ['doc_total', 'docTotal', 'DocTotal', 'grand_total', 'total'], 0));

  return subtotal && docTotal && subtotal > docTotal ? subtotal - docTotal : 0;
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

class PdfWriter {
  constructor() {
    this.commands = [];
  }

  text(value, x, y, size = 10, options = {}) {
    const font = options.bold ? 'F2' : 'F1';
    const color = options.color || BLACK;

    this.commands.push(`BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`);
  }

  rightText(value, rightX, y, size = 10, options = {}) {
    const estimatedWidth = normalizeText(value).length * size * 0.48;

    this.text(value, rightX - estimatedWidth, y, size, options);
  }

  line(x1, y1, x2, y2, width = 0.6, color = BLACK) {
    this.commands.push(`${color} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  rect(x, y, width, height, options = {}) {
    const color = options.color || BLACK;
    const op = options.fill ? 'f' : 'S';

    this.commands.push(
      `${color} ${options.fill ? 'rg' : 'RG'} ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${op}`
    );
  }

  wrapText(value, x, y, maxWidth, size = 10, lineHeight = 14, options = {}) {
    const words = normalizeText(value).split(/\s+/);
    const lines = [];
    let currentLine = '';
    const maxChars = Math.max(Math.floor(maxWidth / (size * 0.48)), 12);

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (nextLine.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    });

    if (currentLine) lines.push(currentLine);

    lines.forEach((line, index) => this.text(line, x, y - index * lineHeight, size, options));

    return y - lines.length * lineHeight;
  }

  output() {
    return this.commands.join('\n');
  }
}

const createPdfBlob = (content) => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export const downloadSalesOrderPdf = (order) => {
  const writer = new PdfWriter();
  const lines = getOrderLines(order);
  const subtotal = getSubtotal(lines);
  const discountTotal = getDiscountTotal(order);
  const docTotal = Number(getValue(order, ['doc_total', 'docTotal', 'DocTotal', 'grand_total', 'total'], subtotal - discountTotal));
  const orderNumber = getValue(order, ['order_no', 'orderNo', 'doc_num', 'docNum', 'DocNum', 'po_number'], '-');
  const poNumber = getValue(order, ['po_number', 'num_at_card', 'numAtCard', 'NumAtCard'], orderNumber);
  const customerName = getValue(order, ['customer_name', 'card_name', 'CardName', 'cntct', 'contact_name'], '-');
  const customerAddress = getValue(order, ['address', 'bill_to_address', 'Address'], '');
  const customerCity = getValue(order, ['city', 'customer.city', 'ship_to_city'], '');
  const docDate = formatDate(getValue(order, ['doc_date', 'docDate', 'DocDate', 'created_at']));
  const dueDate = formatDate(getValue(order, ['doc_due_date', 'docDueDate', 'DocDueDate']));

  writer.text('PT. SUSANTI MEGAH', 110, 775, 21, { bold: true, color: BLUE });
  writer.text('INDUSTRI GARAM BERIODIUM', 112, 758, 11, { bold: true, color: BLUE });
  writer.rect(62, 756, 34, 34, { color: BLUE });
  writer.text('SM', 70, 770, 12, { bold: true, color: '1 1 1' });
  writer.text('Jl. Dupak Rukun No. 71-73, Surabaya 60182', 365, 776, 7.5);
  writer.text('T. (031) 5312526 - 5314071 - 5452765', 365, 764, 7.5);
  writer.text('email. kapal@susantimegah.com', 365, 752, 7.5);

  writer.text(`Nomor  : ${orderNumber}`, 86, 710, 9.5);
  writer.text('Perihal : Proforma Invoice', 86, 697, 9.5);
  writer.text(`Surabaya, ${docDate}`, 380, 710, 9.5);

  writer.text('Kepada:', 86, 648, 9.5);
  writer.text(customerName, 86, 634, 10, { bold: true });
  if (customerAddress) writer.wrapText(customerAddress, 86, 620, 230, 9, 12);
  if (customerCity) writer.text(customerCity, 86, 596, 9);

  writer.text('Dengan hormat,', 86, 555, 9.5);
  writer.wrapText(
    'Dengan ini kami mohon, untuk pesanan Garam Beryodium Cap Kapal untuk segera diselesaikan pembayarannya dengan rincian sebagai berikut:',
    86,
    520,
    430,
    9.5,
    13
  );

  let y = 470;
  lines.forEach((line, index) => {
    const itemName = getValue(
      line,
      ['item_name', 'itemName', 'ItemName', 'Dscription', 'description', 'item.item_name', 'item.name', 'item_code'],
      `Item ${index + 1}`
    );
    const quantity = Number(getValue(line, ['quantity', 'qty', 'Quantity'], 0));
    const unit = getValue(line, ['unit_msr', 'unitMsr', 'unit', 'UomCode'], 'Bal');
    const unitPrice = Number(getValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], 0));
    const lineTotal = getLineTotal(line);
    const description = `${itemName} : ${formatNumber(quantity)} ${unit} @ ${formatMoney(unitPrice)}/${unit}`;

    writer.text(description, 86, y, 9.5);
    writer.text('= Rp', 382, y, 9.5, { bold: true });
    writer.rightText(`${formatNumber(lineTotal)},-`, 492, y, 9.5, { bold: true });
    y -= 14;
  });

  if (discountTotal > 0) {
    writer.text('Discount', 260, y, 9.5, { bold: true });
    writer.text('= Rp', 382, y, 9.5, { bold: true });
    writer.rightText(`(${formatNumber(discountTotal)}),-`, 492, y, 9.5, { bold: true });
    y -= 14;
  }

  writer.line(382, y + 6, 492, y + 6, 0.7);
  writer.text('Total', 300, y - 4, 9.5, { bold: true });
  writer.text('=Rp', 382, y - 4, 9.5, { bold: true });
  writer.rightText(`${formatNumber(docTotal || subtotal - discountTotal)},-`, 492, y - 4, 9.5, { bold: true });

  writer.wrapText(
    'Pembayaran dapat ditransfer melalui Bank Central Asia Cabang Semut Surabaya A/C No. 256.01.0308.8 atas nama PT. Susanti Megah.',
    86,
    345,
    430,
    9.5,
    13
  );
  writer.text('Setelah pembayaran ditransfer harap dikonfirmasikan kembali kepada kami.', 86, 305, 9.5);
  if (dueDate) writer.text(`Tanggal request kirim: ${dueDate}`, 86, 288, 9.5);
  writer.text('Demikianlah, atas perhatian serta kerjasama yang baik kami ucapkan terima kasih.', 86, 270, 9.5);

  writer.text('Hormat kami,', 385, 210, 9.5);
  writer.text('PT. SUSANTI MEGAH', 350, 185, 9.5, { bold: true, color: BLUE });
  writer.line(360, 142, 475, 142, 0.5);
  writer.text('Kushan Wijonosssss', 385, 128, 9.5);

  writer.line(28, 74, 566, 74, 1.2, BLUE);
  writer.text('Branch Factory', 32, 54, 6.8, { bold: true, color: BLUE });
  writer.text('Jl. Raya Serang Km. 32-33, Tangerang 15610', 32, 43, 6.5);
  writer.text('Marketing Lounge Garam Cap Kapal', 374, 54, 6.8, { bold: true, color: BLUE });
  writer.text('Lt. UG - Golden City Mall, Jl. KH Abdul Wahab Siamin No.2-8, Surabaya 60225', 374, 43, 6.2);
  writer.text('http://www.susantimegah.com', 242, 25, 6.5, { bold: true, color: BLUE });

  const blob = createPdfBlob(writer.output());
  const fileName = `PI-${sanitizeFileName(customerName || 'customer')}-${sanitizeFileName(poNumber || orderNumber)}.pdf`;

  downloadBlob(blob, fileName);
};
