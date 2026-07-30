export const DOCUMENT_TEMPLATE_STORAGE_KEY = 'dc-document-builder-layouts-v2';

export const documentDataSources = [
  {
    value: 'salesOrderDetail.details',
    label: 'Sales Order Detail — Items',
    method: 'getSalesOrderDetail',
    paths: ['details', 'lines', 'document_lines', 'DocumentLines']
  }
];

export const documentFeatureOptions = [{ value: 'sales-order', label: 'Sales Order' }];

export const salesOrderDocumentFields = [
  { value: 'document_number', label: 'Nomor Sales Order', source: 'DocNum / order_no' },
  { value: 'purchase_order', label: 'Nomor Purchase Order', source: 'NumAtCard / po_number' },
  { value: 'document_date', label: 'Tanggal Dokumen', source: 'DocDate / doc_date' },
  { value: 'delivery_date', label: 'Tanggal Pengiriman', source: 'DocDueDate / eta_date' },
  { value: 'customer_name', label: 'Nama Pelanggan', source: 'CardName / customer_name' },
  { value: 'card_code', label: 'Kode Pelanggan', source: 'CardCode / card_code' },
  { value: 'customer_address', label: 'Alamat Penagihan', source: 'Address / address' },
  { value: 'address2', label: 'Alamat Pengiriman', source: 'Address2 / address2' },
  { value: 'pay_to_code', label: 'Kode Alamat Penagihan', source: 'PayToCode / pay_to_code' },
  { value: 'ship_to_code', label: 'Kode Alamat Pengiriman', source: 'ShipToCode / ship_to_code' },
  { value: 'comments', label: 'Komentar', source: 'Comments / comments' },
  { value: 'doc_total', label: 'Total Dokumen', source: 'DocTotal / doc_total' },
  { value: 'status', label: 'Status', source: 'status' },
  { value: 'series_name', label: 'Series', source: 'series_name' },
  { value: 'slp_code', label: 'Kode Sales', source: 'SlpCode / slp_code' },
  { value: 'cntct', label: 'Kontak', source: 'cntct / contact_name' }
];

export const salesOrderFieldOptions = [
  { value: 'item_code', label: 'Item Code' },
  { value: 'item_name', label: 'Item Name / Description' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'unit', label: 'UOM' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'line_total', label: 'Line Total' },
  { value: 'discount', label: 'Discount' }
];

export const getNestedValue = (data, path, fallback = '') =>
  String(path || '')
    .split('.')
    .reduce((current, key) => current?.[key], data) ?? fallback;

export const getFirstValue = (data, paths, fallback = '') => {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};

export const normalizeSalesOrderData = (payload = {}) => {
  const order = payload?.data?.data || payload?.data || payload;
  const details = getFirstValue(order, ['details', 'lines', 'document_lines', 'DocumentLines'], []);

  return {
    ...order,
    document_number: getFirstValue(order, ['order_no', 'doc_num', 'DocNum', 'sap_doc_num'], '-'),
    purchase_order: getFirstValue(order, ['po_number', 'num_at_card', 'NumAtCard'], '-'),
    document_date: getFirstValue(order, ['doc_date', 'DocDate', 'created_at'], '-'),
    delivery_date: getFirstValue(order, ['doc_due_date', 'DocDueDate', 'eta_date'], '-'),
    customer_name: getFirstValue(order, ['customer_name', 'card_name', 'CardName'], '-'),
    card_code: getFirstValue(order, ['card_code', 'cardCode', 'customer_code', 'CardCode'], '-'),
    customer_address: getFirstValue(order, ['address', 'bill_to_address', 'Address'], '-'),
    address2: getFirstValue(order, ['address2', 'ship_to_address', 'Address2'], '-'),
    pay_to_code: getFirstValue(order, ['pay_to_code', 'payToCode', 'PayToCode'], '-'),
    ship_to_code: getFirstValue(order, ['ship_to_code', 'shipToCode', 'ShipToCode'], '-'),
    comments: getFirstValue(order, ['comments', 'Comments'], '-'),
    doc_total: getFirstValue(order, ['doc_total', 'docTotal', 'DocTotal'], 0),
    status: getFirstValue(order, ['status', 'Status'], '-'),
    series_name: getFirstValue(order, ['series_name', 'seriesName', 'SeriesName'], '-'),
    slp_code: getFirstValue(order, ['slp_code', 'slpCode', 'SlpCode'], '-'),
    cntct: getFirstValue(order, ['cntct', 'contact_name', 'contactName'], '-'),
    details: Array.isArray(details)
      ? details.map((line) => ({
          ...line,
          item_code: getFirstValue(line, ['item_code', 'itemCode', 'ItemCode'], ''),
          item_name: getFirstValue(line, ['item_name', 'itemName', 'ItemName', 'Dscription', 'description'], ''),
          quantity: getFirstValue(line, ['quantity', 'qty', 'Quantity'], 0),
          unit: getFirstValue(line, ['unit', 'unit_msr', 'UomCode', 'Uom'], ''),
          unit_price: getFirstValue(line, ['unit_price', 'unitPrice', 'price', 'Price'], 0),
          line_total: getFirstValue(line, ['line_total', 'lineTotal', 'LineTotal'], 0),
          discount: getFirstValue(line, ['discount', 'discount_percent', 'DiscPrcnt'], 0)
        }))
      : []
  };
};

export const readDocumentTemplates = () => {
  try {
    const templates = JSON.parse(localStorage.getItem(DOCUMENT_TEMPLATE_STORAGE_KEY) || '[]');
    return Array.isArray(templates) ? templates : [];
  } catch {
    return [];
  }
};

export const resolveTemplateText = (value, data = {}) =>
  String(value ?? '').replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path) => getNestedValue(data, path.trim(), ''));

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderLines = (value, data) =>
  String(value || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [label, content] = line.split('|');
      return `<div class="info-line"><span>${escapeHtml(label)}</span><b>:</b><strong>${escapeHtml(
        resolveTemplateText(content, data)
      )}</strong></div>`;
    })
    .join('');

const renderElement = (element, data) => {
  const props = element.props || {};
  const width = Number(element.layout?.width || 100);
  const minHeight = Number(element.layout?.minHeight || 0);
  const fontSize = Number(element.layout?.fontSize || 12);
  const offsetX = Number(element.layout?.offsetX || 0);
  const offsetY = Number(element.layout?.offsetY || 0);
  const alignmentMargin =
    element.layout?.align === 'right' ? 'margin-left:auto' : element.layout?.align === 'center' ? 'margin-inline:auto' : '';
  const style = `width:${width}%;min-height:${minHeight}px;font-size:${fontSize}px;transform:translate(${offsetX}px,${offsetY}px);${alignmentMargin}`;

  switch (element.type) {
    case 'company':
      return `<section class="company" style="${style}"><div><h1>${escapeHtml(props.companyName)}</h1><b>${escapeHtml(
        props.tagline
      )}</b></div><small>${escapeHtml(props.address)}<br>${escapeHtml(props.contact)}</small></section>`;
    case 'title':
      return `<h2 style="${style};text-align:${props.align || 'center'}">${escapeHtml(resolveTemplateText(props.text, data))}</h2>`;
    case 'documentInfo':
      return `<section class="info" style="${style}"><div>${renderLines(props.leftLines, data)}</div><div>${renderLines(
        props.rightLines,
        data
      )}</div></section>`;
    case 'recipient':
      return `<section style="${style}"><span>${escapeHtml(props.label)}</span><strong>${escapeHtml(
        resolveTemplateText(props.name, data)
      )}</strong><p>${escapeHtml(resolveTemplateText(props.address, data))}</p></section>`;
    case 'paragraph':
      return `<p style="${style};white-space:pre-line">${escapeHtml(resolveTemplateText(props.text, data))}</p>`;
    case 'freeText':
      return `<div style="${style};white-space:pre-line;text-align:${props.align || 'left'};font-weight:${
        props.weight || 'normal'
      };font-style:${props.italic ? 'italic' : 'normal'};color:${props.color || '#172033'}">${escapeHtml(
        resolveTemplateText(props.text, data)
      )}</div>`;
    case 'grid':
      return `<section class="grid ${props.showBorder ? 'grid-bordered' : ''}" style="${style};grid-template-columns:repeat(${Math.max(
        1,
        Number(props.columns) || 1
      )},minmax(0,1fr));gap:${Number(props.gap) || 0}px">${(props.cells || [])
        .map((cell) => {
          const borderVisible = cell.useCustomBorder ? cell.showBorder !== false : props.showBorder;
          const borderWidth = cell.useCustomBorder ? (cell.borderWidth ?? 1) : (props.borderWidth ?? 1);
          const borderStyle = cell.useCustomBorder ? cell.borderStyle || 'solid' : props.borderStyle || 'solid';
          const borderColor = cell.useCustomBorder ? cell.borderColor || '#cbd4e1' : props.borderColor || '#cbd4e1';
          const borderRadius = cell.useCustomBorder ? cell.borderRadius || 0 : props.borderRadius || 0;
          const justifyContent = cell.align === 'right' ? 'flex-end' : cell.align === 'center' ? 'center' : 'flex-start';
          const alignItems = cell.verticalAlign === 'bottom' ? 'flex-end' : cell.verticalAlign === 'center' ? 'center' : 'flex-start';

          return `<div style="display:flex;grid-column:span ${Math.max(1, Number(cell.columnSpan) || 1)};grid-row:span ${Math.max(
            1,
            Number(cell.rowSpan) || 1
          )};justify-content:${justifyContent};align-items:${alignItems};text-align:${cell.align || 'left'};padding:${Number(
            cell.padding ?? 8
          )}px;color:${cell.fontColor || 'inherit'};background:${cell.backgroundColor || 'transparent'};border:${
            borderVisible ? `${Number(borderWidth)}px ${borderStyle} ${borderColor}` : 'none'
          };border-radius:${Number(borderRadius)}px;white-space:pre-line">${escapeHtml(resolveTemplateText(cell.content, data))}</div>`;
        })
        .join('')}</section>`;
    case 'itemsTable': {
      const columns = Array.isArray(props.columns) ? props.columns : [];
      const source = getFirstValue(data, ['details', 'lines', 'document_lines', 'DocumentLines'], []);
      const rows = props.dataSource === 'salesOrderDetail.details' && Array.isArray(source) ? source : props.sampleRows || [];
      return `<table style="${style}"><thead><tr>${columns
        .map((column) => `<th style="width:${Number(column.width || 100)}px">${escapeHtml(column.label)}</th>`)
        .join('')}</tr></thead><tbody>${rows
        .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(getNestedValue(row, column.field, ''))}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`;
    }
    case 'summary':
      return `<section class="summary" style="${style}"><strong>${escapeHtml(props.label)}</strong><strong>${escapeHtml(
        resolveTemplateText(props.value, data)
      )}</strong></section>`;
    case 'image':
      return props.src
        ? `<section class="image" style="${style}"><img src="${escapeHtml(props.src)}" alt="${escapeHtml(
            props.alt || 'Gambar dokumen'
          )}" style="object-fit:${props.fit || 'contain'}"></section>`
        : '';
    case 'signature':
      return `<section class="signature" style="${style}"><span>${escapeHtml(props.prefix)}</span><strong>${escapeHtml(
        props.company
      )}</strong><div></div><b>${escapeHtml(props.signer)}</b><span>${escapeHtml(props.position)}</span></section>`;
    case 'footer':
      return `<footer style="${style}"><div><b>${escapeHtml(props.leftTitle)}</b><span>${escapeHtml(
        props.leftText
      )}</span></div><div><b>${escapeHtml(props.rightTitle)}</b><span>${escapeHtml(props.rightText)}</span></div></footer>`;
    case 'divider':
      return `<hr style="${style};border-top:${Number(props.thickness || 1)}px solid ${props.color || '#144b9b'}">`;
    case 'spacer':
      return `<div style="${style};height:${Number(props.height || 20)}px"></div>`;
    default:
      return '';
  }
};

export const printDocumentTemplate = (template, sourceData, targetWindow) => {
  const data = normalizeSalesOrderData(sourceData);
  const printableWindow = targetWindow || window.open('', '_blank');
  if (!printableWindow) throw new Error('Popup diblokir. Izinkan popup untuk mencetak dokumen.');

  const content = (template.elements || []).map((element) => renderElement(element, data)).join('');
  printableWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(template.name)}</title><style>
    @page{size:${template.pageSize || 'A4'};margin:0}*{box-sizing:border-box}body{margin:0;background:#eef1f5;font:12px Arial;color:#172033}
    main{width:210mm;min-height:297mm;padding:13mm 15mm;margin:20px auto;background:#fff}.company,.info,footer{display:flex;justify-content:space-between;gap:25px}
    .company h1{margin:0;color:#164b9b;font-size:22px}.company b{color:#164b9b}.company small{text-align:right}.info>div{width:50%}
    .info-line{display:grid;grid-template-columns:80px 8px 1fr;line-height:1.6}section{display:flex;flex-direction:column;margin:8px 0}
    h2{color:#164b9b;border-top:2px solid #164b9b;padding-top:5px}p{line-height:1.55}table{border-collapse:collapse;margin:12px 0}
    th{padding:7px 9px;color:#183f80;background:#eaf0fa;text-align:left}td{padding:8px 9px;border-bottom:1px solid #667080}
    th:not(:first-child),td:not(:first-child){text-align:right}.summary{display:grid;grid-template-columns:1fr 1fr;margin-left:auto;border-block:2px solid #164b9b;padding:7px 10px;color:#164b9b}
    .summary strong:last-child{text-align:right}.signature{width:230px!important;margin:45px 35px 15px auto;text-align:center}.signature div{height:55px;border-bottom:1px solid}
    .image img{display:block;width:100%;height:100%;min-height:80px;max-height:500px}
    .grid{display:grid!important;flex-direction:initial!important}.grid>div{padding:8px}.grid-bordered>div{border:1px solid #cbd4e1}
    footer{margin-top:45px;padding-top:9px;border-top:2px solid #164b9b;font-size:9px}footer div{display:flex;flex-direction:column;width:50%}
    footer b{color:#164b9b}@media print{body{background:#fff}main{margin:0;box-shadow:none}}
  </style></head><body><main>${content}</main><script>window.onload=()=>{window.print()}</script></body></html>`);
  printableWindow.document.close();
};
