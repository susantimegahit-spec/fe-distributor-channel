import { useEffect, useMemo, useRef, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import companyLogo from 'assets/images/susanti-megah-logo.svg';
import { useAlert } from '../../utils/alertContext';
import {
  DOCUMENT_TEMPLATE_STORAGE_KEY,
  documentDataSources,
  documentFeatureOptions,
  readDocumentTemplates,
  salesOrderDocumentFields,
  salesOrderFieldOptions
} from '../../utils/documentTemplate';
import './document-builder.scss';

const componentTypes = [
  { type: 'company', label: 'Identitas Perusahaan', icon: 'ti ti-building' },
  { type: 'title', label: 'Judul Dokumen', icon: 'ti ti-heading' },
  { type: 'documentInfo', label: 'Informasi Dokumen', icon: 'ti ti-list-details' },
  { type: 'recipient', label: 'Penerima', icon: 'ti ti-user' },
  { type: 'paragraph', label: 'Paragraf', icon: 'ti ti-align-left' },
  { type: 'freeText', label: 'Free Text', icon: 'ti ti-text-size' },
  { type: 'grid', label: 'Grid', icon: 'ti ti-layout-grid' },
  { type: 'itemsTable', label: 'Tabel Barang', icon: 'ti ti-table' },
  { type: 'summary', label: 'Ringkasan Total', icon: 'ti ti-calculator' },
  { type: 'image', label: 'Gambar', icon: 'ti ti-photo-plus' },
  { type: 'signature', label: 'Tanda Tangan', icon: 'ti ti-signature' },
  { type: 'footer', label: 'Footer Cabang', icon: 'ti ti-layout-navbar' },
  { type: 'divider', label: 'Garis Pemisah', icon: 'ti ti-minus' },
  { type: 'spacer', label: 'Jarak Kosong', icon: 'ti ti-arrows-vertical' }
];

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createElement = (type) => {
  const defaults = {
    company: {
      companyName: 'PT. SUSANTI MEGAH',
      tagline: 'INDUSTRI GARAM BERYODIUM',
      address: 'Jl. Dupak Rukun No. 71–73, Surabaya 60182',
      contact: 'Telp. (031) 5312696 · info@susantimegah.com',
      showLogo: true
    },
    title: { text: 'PROFORMA INVOICE', align: 'center', size: 'large' },
    documentInfo: {
      leftLines: 'Nomor|{{document_number}}\nNo. PO|{{purchase_order}}\nPerihal|Proforma Invoice',
      rightLines: 'Tanggal|{{document_date}}'
    },
    recipient: {
      label: 'Kepada Yth.',
      name: '{{customer_name}}',
      address: '{{customer_address}}'
    },
    paragraph: {
      text: 'Dengan hormat,\n\nDengan ini kami mohon, untuk penjualan Garam Beryodium Cap Kapal agar segera diselesaikan pembayarannya dengan rincian sebagai berikut:'
    },
    freeText: {
      text: 'Tulis teks bebas di sini',
      align: 'left',
      weight: 'normal',
      italic: false,
      color: '#172033'
    },
    grid: {
      columns: 2,
      gap: 12,
      showBorder: true,
      borderColor: '#cbd4e1',
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: 0,
      cells: [
        { id: createId('cell'), content: 'Konten grid 1', align: 'left', verticalAlign: 'top', backgroundColor: '#ffffff' },
        { id: createId('cell'), content: 'Konten grid 2', align: 'left', verticalAlign: 'top', backgroundColor: '#ffffff' }
      ]
    },
    itemsTable: {
      dataSource: 'salesOrderDetail.details',
      columns: [
        { id: createId('column'), label: 'Keterangan', field: 'item_name', width: 320 },
        { id: createId('column'), label: 'Jumlah', field: 'quantity', width: 90 },
        { id: createId('column'), label: 'UOM', field: 'unit', width: 80 },
        { id: createId('column'), label: 'Harga Satuan', field: 'unit_price', width: 130 },
        { id: createId('column'), label: 'Total', field: 'line_total', width: 130 }
      ],
      sampleRows: [
        { item_name: 'TOP 250 M @ 5 KG / BAL', quantity: 45, unit: 'Bal', unit_price: '68.000,-', line_total: '3.060.000,-' },
        { item_name: 'TOP 250 M @ 10 KG / BAL', quantity: 37, unit: 'Bal', unit_price: '58.700,-', line_total: '2.171.900,-' }
      ]
    },
    summary: { label: 'TOTAL', value: 'Rp 5.157.200,-' },
    image: { src: '', alt: 'Gambar dokumen', fit: 'contain' },
    signature: {
      prefix: 'Hormat kami,',
      company: 'PT. SUSANTI MEGAH',
      signer: 'Kresnawati Wijono',
      position: 'PT. Susanti Megah'
    },
    footer: {
      leftTitle: 'Branch Factory',
      leftText: 'Jl. Raya Serang Km 26–28, Tangerang 15610',
      rightTitle: 'Marketing Liaison Office (For Export)',
      rightText: 'Jl. Dukuh Kupang Indah, Surabaya 60225'
    },
    divider: { color: '#144b9b', thickness: 2 },
    spacer: { height: 32 }
  };

  return {
    id: createId(type),
    type,
    props: defaults[type] || {},
    layout: { width: 100, minHeight: 0, fontSize: 12, fontColor: '#172033', align: 'left', offsetX: 0, offsetY: 0 }
  };
};

const referenceElements = [
  'company',
  'divider',
  'title',
  'documentInfo',
  'recipient',
  'paragraph',
  'itemsTable',
  'summary',
  'paragraph',
  'signature',
  'footer'
].map((type, index) => {
  const element = createElement(type);

  if (type === 'paragraph' && index === 8) {
    element.props.text =
      'Pembayaran dapat ditransfer melalui Bank Central Asia (BCA) Cabang Semut Surabaya A/C No. 258.01.0308-8 atas nama PT. Susanti Megah.\n\nTanggal Pengiriman: {{delivery_date}}\n\nDemikianlah, atas perhatian serta kerja samanya yang baik kami ucapkan terima kasih.';
  }

  return element;
});

const emptyTemplate = {
  id: '',
  name: 'Proforma Invoice',
  code: 'PROFORMA_INVOICE',
  feature: 'sales-order',
  pageSize: 'A4',
  editor: { showRulers: true, showGuides: true, snapToGrid: true, gridSize: 10 },
  guides: { vertical: [397], horizontal: [200] },
  elements: referenceElements
};

const parseLines = (value) =>
  String(value || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('|'));

function DocumentElement({ element }) {
  const { props, type } = element;

  switch (type) {
    case 'company':
      return (
        <div className="db-company">
          <div className="db-company-brand">
            {props.showLogo && <img src={companyLogo} alt="Logo perusahaan" />}
            <div>
              <strong>{props.companyName}</strong>
              <span>{props.tagline}</span>
            </div>
          </div>
          <div className="db-company-contact">
            <span>{props.address}</span>
            <span>{props.contact}</span>
          </div>
        </div>
      );
    case 'title':
      return <h2 className={`db-document-title db-align-${props.align} db-size-${props.size}`}>{props.text}</h2>;
    case 'documentInfo':
      return (
        <div className="db-info-grid">
          {[props.leftLines, props.rightLines].map((lines, columnIndex) => (
            <div key={columnIndex}>
              {parseLines(lines).map(([label, value], lineIndex) => (
                <div className="db-info-line" key={`${label}-${lineIndex}`}>
                  <span>{label}</span>
                  <b>:</b>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case 'recipient':
      return (
        <div className="db-recipient">
          <span>{props.label}</span>
          <strong>{props.name}</strong>
          <p>{props.address}</p>
        </div>
      );
    case 'paragraph':
      return <p className="db-paragraph">{props.text}</p>;
    case 'freeText':
      return (
        <div
          className="db-free-text"
          style={{
            color: props.color || '#172033',
            fontStyle: props.italic ? 'italic' : 'normal',
            fontWeight: props.weight || 'normal',
            textAlign: props.align || 'left'
          }}
        >
          {props.text}
        </div>
      );
    case 'grid':
      return (
        <div
          className={`db-grid ${props.showBorder ? 'db-grid-bordered' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, Number(props.columns) || 1)}, minmax(0, 1fr))`,
            gap: `${Number(props.gap) || 0}px`
          }}
        >
          {(props.cells || []).map((cell) => (
            <div
              className="db-grid-cell"
              key={cell.id}
              style={{
                gridColumn: `span ${Math.max(1, Number(cell.columnSpan) || 1)}`,
                gridRow: `span ${Math.max(1, Number(cell.rowSpan) || 1)}`,
                justifyContent: cell.align === 'right' ? 'flex-end' : cell.align === 'center' ? 'center' : 'flex-start',
                alignItems: cell.verticalAlign === 'bottom' ? 'flex-end' : cell.verticalAlign === 'center' ? 'center' : 'flex-start',
                textAlign: cell.align || 'left',
                padding: `${Number(cell.padding ?? 8)}px`,
                color: cell.fontColor || 'inherit',
                backgroundColor: cell.backgroundColor || 'transparent',
                border:
                  (cell.useCustomBorder && cell.showBorder === false) || (!cell.useCustomBorder && !props.showBorder)
                    ? 'none'
                    : `${Number(cell.useCustomBorder ? (cell.borderWidth ?? 1) : (props.borderWidth ?? 1))}px ${
                        cell.useCustomBorder ? cell.borderStyle || 'solid' : props.borderStyle || 'solid'
                      } ${cell.useCustomBorder ? cell.borderColor || '#cbd4e1' : props.borderColor || '#cbd4e1'}`,
                borderRadius: `${Number(cell.useCustomBorder ? cell.borderRadius || 0 : props.borderRadius || 0)}px`
              }}
            >
              {cell.content}
            </div>
          ))}
        </div>
      );
    case 'itemsTable': {
      const columns = Array.isArray(props.columns) ? props.columns : [];
      const rows = Array.isArray(props.sampleRows) ? props.sampleRows : [];
      return (
        <table className="db-items-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} style={{ width: `${column.width || 100}px` }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, columnIndex) => (
                  <td key={`${column.id}-${columnIndex}`}>{row[column.field] || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'summary':
      return (
        <div className="db-summary">
          <strong>{props.label}</strong>
          <strong>{props.value}</strong>
        </div>
      );
    case 'image':
      return props.src ? (
        <div className="db-image">
          <img src={props.src} alt={props.alt || 'Gambar dokumen'} style={{ objectFit: props.fit || 'contain' }} />
        </div>
      ) : (
        <div className="db-image-placeholder">
          <i className="ti ti-photo-plus fs-2" />
          <span>Upload gambar melalui panel properti</span>
        </div>
      );
    case 'signature':
      return (
        <div className="db-signature">
          <span>{props.prefix}</span>
          <strong>{props.company}</strong>
          <div className="db-signature-space" />
          <b>{props.signer}</b>
          <span>{props.position}</span>
        </div>
      );
    case 'footer':
      return (
        <div className="db-footer">
          <div>
            <strong>{props.leftTitle}</strong>
            <span>{props.leftText}</span>
          </div>
          <div>
            <strong>{props.rightTitle}</strong>
            <span>{props.rightText}</span>
          </div>
        </div>
      );
    case 'divider':
      return <hr style={{ borderTopColor: props.color, borderTopWidth: `${props.thickness}px` }} />;
    case 'spacer':
      return <div style={{ height: `${props.height}px` }} />;
    default:
      return null;
  }
}

DocumentElement.propTypes = {};

function PropertyEditor({ element, onChange }) {
  if (!element) {
    return (
      <div className="db-empty-properties">
        <i className="ti ti-pointer fs-2" />
        <strong>Pilih komponen</strong>
        <span>Klik komponen pada halaman untuk mengubah isinya.</span>
      </div>
    );
  }

  const update = (key, value) => onChange({ ...element, props: { ...element.props, [key]: value } });
  const updateLayout = (key, value) =>
    onChange({
      ...element,
      layout: {
        width: 100,
        minHeight: 0,
        fontSize: 12,
        fontColor: '#172033',
        align: 'left',
        offsetX: 0,
        offsetY: 0,
        ...element.layout,
        [key]: value
      }
    });
  const updateFontColor = (color) =>
    onChange({
      ...element,
      props: element.type === 'freeText' ? { ...element.props, color } : element.props,
      layout: { ...element.layout, fontColor: color }
    });
  const tableColumns = Array.isArray(element.props.columns) ? element.props.columns : [];
  const updateColumn = (columnId, key, value) =>
    update(
      'columns',
      tableColumns.map((column) => (column.id === columnId ? { ...column, [key]: value } : column))
    );
  const addColumn = () =>
    update('columns', [...tableColumns, { id: createId('column'), label: 'Kolom Baru', field: 'item_name', width: 120 }]);
  const removeColumn = (columnId) =>
    update(
      'columns',
      tableColumns.filter((column) => column.id !== columnId)
    );
  const updateCell = (cellId, key, value) =>
    update(
      'cells',
      (element.props.cells || []).map((cell) => (cell.id === cellId ? { ...cell, [key]: value } : cell))
    );
  const multilineFields = ['address', 'contact', 'leftLines', 'rightLines', 'text', 'rows', 'leftText', 'rightText'];

  return (
    <Stack gap={3}>
      <div>
        <Badge bg="light-primary" text="primary">
          {componentTypes.find((item) => item.type === element.type)?.label}
        </Badge>
      </div>
      <div className="db-property-section">
        <strong>Ukuran & posisi</strong>
        <Form.Group>
          <Form.Label>Lebar ({element.layout?.width || 100}%)</Form.Label>
          <Form.Range
            min={20}
            max={100}
            value={element.layout?.width || 100}
            onChange={(event) => updateLayout('width', Number(event.target.value))}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Tinggi minimum ({element.layout?.minHeight || 0}px)</Form.Label>
          <Form.Range
            min={0}
            max={400}
            value={element.layout?.minHeight || 0}
            onChange={(event) => updateLayout('minHeight', Number(event.target.value))}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Ukuran font (px)</Form.Label>
          <Form.Control
            type="number"
            min={6}
            max={96}
            value={element.layout?.fontSize || 12}
            onChange={(event) => updateLayout('fontSize', Number(event.target.value))}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Warna font</Form.Label>
          <div className="db-color-control">
            <Form.Control
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(element.layout?.fontColor || '') ? element.layout.fontColor : '#172033'}
              title="Pilih warna font"
              onChange={(event) => updateFontColor(event.target.value)}
            />
            <Form.Control
              type="text"
              value={element.layout?.fontColor || '#172033'}
              placeholder="#172033"
              maxLength={7}
              onChange={(event) => updateFontColor(event.target.value)}
            />
          </div>
        </Form.Group>
        <Form.Select value={element.layout?.align || 'left'} onChange={(event) => updateLayout('align', event.target.value)}>
          <option value="left">Posisi kiri</option>
          <option value="center">Posisi tengah</option>
          <option value="right">Posisi kanan</option>
        </Form.Select>
        <Row className="g-2">
          <Col xs={6}>
            <Form.Group>
              <Form.Label>Posisi X (px)</Form.Label>
              <Form.Control
                type="number"
                min={-600}
                max={600}
                value={element.layout?.offsetX || 0}
                onChange={(event) => updateLayout('offsetX', Number(event.target.value))}
              />
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group>
              <Form.Label>Posisi Y (px)</Form.Label>
              <Form.Control
                type="number"
                min={-1000}
                max={1000}
                value={element.layout?.offsetY || 0}
                onChange={(event) => updateLayout('offsetY', Number(event.target.value))}
              />
            </Form.Group>
          </Col>
        </Row>
        <Button
          size="sm"
          variant="light-secondary"
          onClick={() =>
            onChange({
              ...element,
              layout: { ...element.layout, offsetX: 0, offsetY: 0 }
            })
          }
        >
          <i className="ti ti-focus-centered me-1" />
          Reset posisi
        </Button>
      </div>
      {element.type === 'itemsTable' ? (
        <div className="db-property-section">
          <Form.Group>
            <Form.Label>Sumber data row</Form.Label>
            <Form.Select value={element.props.dataSource} onChange={(event) => update('dataSource', event.target.value)}>
              <option value="static">Data contoh / statis</option>
              {documentDataSources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </Form.Select>
            <Form.Text>Row akan di-loop dari hasil getSalesOrderDetail saat dokumen Order dicetak.</Form.Text>
          </Form.Group>
          <Stack direction="horizontal" className="justify-content-between">
            <strong>Kolom tabel</strong>
            <Button size="sm" variant="light-primary" onClick={addColumn}>
              <i className="ti ti-plus me-1" />
              Kolom
            </Button>
          </Stack>
          {tableColumns.map((column) => (
            <Card className="border mb-0" key={column.id}>
              <Card.Body className="p-2">
                <Stack gap={2}>
                  <Form.Control
                    size="sm"
                    value={column.label}
                    onChange={(event) => updateColumn(column.id, 'label', event.target.value)}
                    placeholder="Label kolom"
                  />
                  <Form.Select size="sm" value={column.field} onChange={(event) => updateColumn(column.id, 'field', event.target.value)}>
                    {salesOrderFieldOptions.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Stack direction="horizontal" gap={2}>
                    <Form.Control
                      size="sm"
                      type="number"
                      min={50}
                      value={column.width}
                      onChange={(event) => updateColumn(column.id, 'width', Number(event.target.value))}
                    />
                    <Button size="sm" variant="outline-danger" onClick={() => removeColumn(column.id)}>
                      <i className="ti ti-trash" />
                    </Button>
                  </Stack>
                </Stack>
              </Card.Body>
            </Card>
          ))}
        </div>
      ) : element.type === 'grid' ? (
        <div className="db-property-section">
          <Row className="g-2">
            <Col xs={6}>
              <Form.Group>
                <Form.Label>Jumlah kolom</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={12}
                  value={element.props.columns || 1}
                  onChange={(event) => update('columns', Math.max(1, Number(event.target.value)))}
                />
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group>
                <Form.Label>Jarak (px)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  max={80}
                  value={element.props.gap || 0}
                  onChange={(event) => update('gap', Math.max(0, Number(event.target.value)))}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Check
            type="switch"
            id={`db-grid-border-${element.id}`}
            label="Tampilkan border cell"
            checked={Boolean(element.props.showBorder)}
            onChange={(event) => update('showBorder', event.target.checked)}
          />
          <div className="db-border-properties">
            <Form.Group>
              <Form.Label>Warna border</Form.Label>
              <div className="db-color-control">
                <Form.Control
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(element.props.borderColor || '') ? element.props.borderColor : '#cbd4e1'}
                  disabled={!element.props.showBorder}
                  onChange={(event) => update('borderColor', event.target.value)}
                />
                <Form.Control
                  type="text"
                  value={element.props.borderColor || '#cbd4e1'}
                  maxLength={7}
                  disabled={!element.props.showBorder}
                  onChange={(event) => update('borderColor', event.target.value)}
                />
              </div>
            </Form.Group>
            <Row className="g-2">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>Ketebalan (px)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={20}
                    value={element.props.borderWidth ?? 1}
                    disabled={!element.props.showBorder}
                    onChange={(event) => update('borderWidth', Math.max(0, Number(event.target.value)))}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>Radius (px)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={element.props.borderRadius || 0}
                    disabled={!element.props.showBorder}
                    onChange={(event) => update('borderRadius', Math.max(0, Number(event.target.value)))}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group>
              <Form.Label>Gaya border</Form.Label>
              <Form.Select
                value={element.props.borderStyle || 'solid'}
                disabled={!element.props.showBorder}
                onChange={(event) => update('borderStyle', event.target.value)}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </Form.Select>
            </Form.Group>
          </div>
          <Stack direction="horizontal" className="justify-content-between">
            <strong>Cell grid</strong>
            <Button
              size="sm"
              variant="light-primary"
              onClick={() =>
                update('cells', [
                  ...(element.props.cells || []),
                  {
                    id: createId('cell'),
                    content: `Konten grid ${(element.props.cells || []).length + 1}`,
                    align: 'left',
                    verticalAlign: 'top',
                    backgroundColor: '#ffffff'
                  }
                ])
              }
            >
              <i className="ti ti-plus me-1" />
              Cell
            </Button>
          </Stack>
          {(element.props.cells || []).map((cell, cellIndex) => (
            <Card className="border mb-0" key={cell.id}>
              <Card.Body className="p-2">
                <Stack gap={2}>
                  <Stack direction="horizontal" className="justify-content-between">
                    <small className="fw-semibold">Cell {cellIndex + 1}</small>
                    <Button
                      size="sm"
                      variant="link-danger"
                      className="p-0"
                      onClick={() =>
                        update(
                          'cells',
                          element.props.cells.filter((item) => item.id !== cell.id)
                        )
                      }
                    >
                      <i className="ti ti-trash" />
                    </Button>
                  </Stack>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={cell.content}
                    onChange={(event) => updateCell(cell.id, 'content', event.target.value)}
                  />
                  <Row className="g-2">
                    <Col xs={6}>
                      <Form.Select
                        size="sm"
                        value={cell.align || 'left'}
                        onChange={(event) => updateCell(cell.id, 'align', event.target.value)}
                      >
                        <option value="left">Rata kiri</option>
                        <option value="center">Rata tengah</option>
                        <option value="right">Rata kanan</option>
                      </Form.Select>
                    </Col>
                    <Col xs={6}>
                      <Form.Select
                        size="sm"
                        value={cell.verticalAlign || 'top'}
                        onChange={(event) => updateCell(cell.id, 'verticalAlign', event.target.value)}
                      >
                        <option value="top">Posisi atas</option>
                        <option value="center">Posisi tengah</option>
                        <option value="bottom">Posisi bawah</option>
                      </Form.Select>
                    </Col>
                  </Row>
                  <Row className="g-2">
                    <Col xs={4}>
                      <Form.Label className="small">Span kolom</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        min={1}
                        max={12}
                        value={cell.columnSpan || 1}
                        onChange={(event) => updateCell(cell.id, 'columnSpan', Math.max(1, Number(event.target.value)))}
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Label className="small">Span baris</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        min={1}
                        max={12}
                        value={cell.rowSpan || 1}
                        onChange={(event) => updateCell(cell.id, 'rowSpan', Math.max(1, Number(event.target.value)))}
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Label className="small">Padding</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        min={0}
                        max={100}
                        value={cell.padding ?? 8}
                        onChange={(event) => updateCell(cell.id, 'padding', Math.max(0, Number(event.target.value)))}
                      />
                    </Col>
                  </Row>
                  <Form.Group>
                    <Form.Label className="small">Warna background</Form.Label>
                    <div className="db-color-control">
                      <Form.Control
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(cell.backgroundColor || '') ? cell.backgroundColor : '#ffffff'}
                        onChange={(event) => updateCell(cell.id, 'backgroundColor', event.target.value)}
                      />
                      <Form.Control
                        size="sm"
                        value={cell.backgroundColor || '#ffffff'}
                        maxLength={7}
                        onChange={(event) => updateCell(cell.id, 'backgroundColor', event.target.value)}
                      />
                    </div>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label className="small">Warna teks</Form.Label>
                    <div className="db-color-control">
                      <Form.Control
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(cell.fontColor || '') ? cell.fontColor : '#172033'}
                        onChange={(event) => updateCell(cell.id, 'fontColor', event.target.value)}
                      />
                      <Form.Control
                        size="sm"
                        value={cell.fontColor || '#172033'}
                        maxLength={7}
                        onChange={(event) => updateCell(cell.id, 'fontColor', event.target.value)}
                      />
                    </div>
                  </Form.Group>
                  <Form.Check
                    type="switch"
                    id={`db-cell-custom-border-${cell.id}`}
                    label="Atur border cell ini"
                    checked={Boolean(cell.useCustomBorder)}
                    onChange={(event) => updateCell(cell.id, 'useCustomBorder', event.target.checked)}
                  />
                  {cell.useCustomBorder && (
                    <div className="db-cell-border-settings">
                      <Form.Check
                        type="switch"
                        id={`db-cell-border-${cell.id}`}
                        label="Tampilkan border"
                        checked={cell.showBorder !== false}
                        onChange={(event) => updateCell(cell.id, 'showBorder', event.target.checked)}
                      />
                      <div className="db-color-control">
                        <Form.Control
                          type="color"
                          value={/^#[0-9a-f]{6}$/i.test(cell.borderColor || '') ? cell.borderColor : '#cbd4e1'}
                          onChange={(event) => updateCell(cell.id, 'borderColor', event.target.value)}
                        />
                        <Form.Control
                          size="sm"
                          value={cell.borderColor || '#cbd4e1'}
                          maxLength={7}
                          onChange={(event) => updateCell(cell.id, 'borderColor', event.target.value)}
                        />
                      </div>
                      <Row className="g-2">
                        <Col xs={4}>
                          <Form.Control
                            size="sm"
                            type="number"
                            min={0}
                            value={cell.borderWidth ?? 1}
                            title="Ketebalan border"
                            onChange={(event) => updateCell(cell.id, 'borderWidth', Math.max(0, Number(event.target.value)))}
                          />
                        </Col>
                        <Col xs={4}>
                          <Form.Select
                            size="sm"
                            value={cell.borderStyle || 'solid'}
                            onChange={(event) => updateCell(cell.id, 'borderStyle', event.target.value)}
                          >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                          </Form.Select>
                        </Col>
                        <Col xs={4}>
                          <Form.Control
                            size="sm"
                            type="number"
                            min={0}
                            value={cell.borderRadius || 0}
                            title="Radius border"
                            onChange={(event) => updateCell(cell.id, 'borderRadius', Math.max(0, Number(event.target.value)))}
                          />
                        </Col>
                      </Row>
                    </div>
                  )}
                </Stack>
              </Card.Body>
            </Card>
          ))}
        </div>
      ) : element.type === 'image' ? (
        <div className="db-property-section">
          <Form.Group>
            <Form.Label>File gambar</Form.Label>
            <Form.Control
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => update('src', reader.result);
                reader.readAsDataURL(file);
              }}
            />
            <Form.Text>Format PNG, JPG, WEBP, atau SVG.</Form.Text>
          </Form.Group>
          {element.props.src ? (
            <div className="db-image-property-preview">
              <img src={element.props.src} alt={element.props.alt || 'Preview gambar'} />
              <Button size="sm" variant="outline-danger" onClick={() => update('src', '')}>
                <i className="ti ti-trash me-1" />
                Hapus gambar
              </Button>
            </div>
          ) : null}
          <Form.Group>
            <Form.Label>Teks alternatif</Form.Label>
            <Form.Control value={element.props.alt || ''} onChange={(event) => update('alt', event.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Penyesuaian gambar</Form.Label>
            <Form.Select value={element.props.fit || 'contain'} onChange={(event) => update('fit', event.target.value)}>
              <option value="contain">Tampilkan seluruh gambar</option>
              <option value="cover">Penuhi area</option>
              <option value="fill">Regangkan</option>
            </Form.Select>
          </Form.Group>
        </div>
      ) : (
        Object.entries(element.props).map(([key, value]) =>
          typeof value === 'boolean' ? (
            <Form.Check
              key={key}
              type="switch"
              id={`db-property-${element.id}-${key}`}
              label={key}
              checked={value}
              onChange={(event) => update(key, event.target.checked)}
            />
          ) : key === 'align' ? (
            <Form.Group key={key}>
              <Form.Label>Perataan</Form.Label>
              <Form.Select value={value} onChange={(event) => update(key, event.target.value)}>
                <option value="left">Kiri</option>
                <option value="center">Tengah</option>
                <option value="right">Kanan</option>
              </Form.Select>
            </Form.Group>
          ) : (
            <Form.Group key={key}>
              <Form.Label className="text-capitalize">{key.replace(/([A-Z])/g, ' $1')}</Form.Label>
              <Form.Control
                as={multilineFields.includes(key) ? 'textarea' : 'input'}
                rows={multilineFields.includes(key) ? 4 : undefined}
                type={typeof value === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(event) => update(key, typeof value === 'number' ? Number(event.target.value) : event.target.value)}
              />
            </Form.Group>
          )
        )
      )}
    </Stack>
  );
}

PropertyEditor.propTypes = {};

export default function DocumentBuilder() {
  const { showAlert } = useAlert();
  const canvasRef = useRef(null);
  const [templates, setTemplates] = useState(readDocumentTemplates);
  const [template, setTemplate] = useState(emptyTemplate);
  const [selectedId, setSelectedId] = useState(referenceElements[0]?.id);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedElement = useMemo(() => template.elements.find((element) => element.id === selectedId), [selectedId, template.elements]);
  const editorSettings = {
    showRulers: true,
    showGuides: true,
    snapToGrid: true,
    gridSize: 10,
    ...template.editor
  };
  const guides = { vertical: [], horizontal: [], ...template.guides };
  const snapValue = (value) =>
    editorSettings.snapToGrid ? Math.round(value / editorSettings.gridSize) * editorSettings.gridSize : Math.round(value);

  const persist = (nextTemplates) => {
    localStorage.setItem(DOCUMENT_TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
    setTemplates(nextTemplates);
  };

  const updateEditorSetting = (key, value) => {
    setTemplate((current) => ({ ...current, editor: { ...editorSettings, ...current.editor, [key]: value } }));
  };

  const addGuide = (axis, position) => {
    setTemplate((current) => ({
      ...current,
      editor: { ...editorSettings, ...current.editor, showGuides: true },
      guides: {
        vertical: [],
        horizontal: [],
        ...current.guides,
        [axis]: [...(current.guides?.[axis] || []), snapValue(Math.max(22, position))]
      }
    }));
  };

  const updateGuide = (axis, index, position) => {
    setTemplate((current) => ({
      ...current,
      guides: {
        vertical: [],
        horizontal: [],
        ...current.guides,
        [axis]: (current.guides?.[axis] || []).map((guide, guideIndex) =>
          guideIndex === index ? snapValue(Math.max(22, position)) : guide
        )
      }
    }));
  };

  const removeGuide = (axis, index) => {
    setTemplate((current) => ({
      ...current,
      guides: {
        vertical: [],
        horizontal: [],
        ...current.guides,
        [axis]: (current.guides?.[axis] || []).filter((_, guideIndex) => guideIndex !== index)
      }
    }));
  };

  const updateElement = (nextElement) => {
    setTemplate((current) => ({
      ...current,
      elements: current.elements.map((element) => (element.id === nextElement.id ? nextElement : element))
    }));
  };

  useEffect(() => {
    const moveSelectedElement = (event) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
        return;
      }

      if (!selectedId) return;

      event.preventDefault();
      const distance = event.shiftKey ? 10 : 1;
      const horizontal = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0;
      const vertical = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0;

      setTemplate((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          element.id === selectedId
            ? {
                ...element,
                layout: {
                  width: 100,
                  minHeight: 0,
                  fontSize: 12,
                  align: 'left',
                  ...element.layout,
                  offsetX: (element.layout?.offsetX || 0) + horizontal,
                  offsetY: (element.layout?.offsetY || 0) + vertical
                }
              }
            : element
        )
      }));
    };

    window.addEventListener('keydown', moveSelectedElement);
    return () => window.removeEventListener('keydown', moveSelectedElement);
  }, [selectedId]);

  const removeElement = (elementId) => {
    setTemplate((current) => ({
      ...current,
      elements: current.elements.filter((element) => element.id !== elementId)
    }));
    setSelectedId('');
  };

  const insertSalesOrderField = (field) => {
    const nextElement = createElement('freeText');
    nextElement.props.text = `{{${field.value}}}`;
    nextElement.props.color = '#172033';
    setTemplate((current) => ({ ...current, elements: [...current.elements, nextElement] }));
    setSelectedId(nextElement.id);
  };

  const moveElement = (elementId, direction) => {
    setTemplate((current) => {
      const index = current.elements.findIndex((element) => element.id === elementId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.elements.length) return current;
      const elements = [...current.elements];
      [elements[index], elements[target]] = [elements[target], elements[index]];
      return { ...current, elements };
    });
  };

  const handleDrop = (event, targetIndex = template.elements.length) => {
    event.preventDefault();
    const newType = event.dataTransfer.getData('application/document-component');
    const movingId = event.dataTransfer.getData('application/document-element');

    if (newType) {
      const nextElement = createElement(newType);
      setTemplate((current) => {
        const elements = [...current.elements];
        elements.splice(targetIndex, 0, nextElement);
        return { ...current, elements };
      });
      setSelectedId(nextElement.id);
      return;
    }

    if (movingId) {
      setTemplate((current) => {
        const sourceIndex = current.elements.findIndex((element) => element.id === movingId);
        if (sourceIndex < 0) return current;
        const elements = [...current.elements];
        const [movingElement] = elements.splice(sourceIndex, 1);
        const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        elements.splice(adjustedTarget, 0, movingElement);
        return { ...current, elements };
      });
    }
  };

  const saveTemplate = () => {
    if (!template.name.trim() || !template.code.trim()) {
      showAlert('Nama dan kode template wajib diisi', 'danger');
      return;
    }

    const payload = {
      ...template,
      id: template.id || createId('template'),
      updatedAt: new Date().toISOString()
    };
    const exists = templates.some((item) => item.id === payload.id);
    persist(exists ? templates.map((item) => (item.id === payload.id ? payload : item)) : [payload, ...templates]);
    setTemplate(payload);
    showAlert('Template dokumen berhasil disimpan', 'success');
  };

  const newTemplate = () => {
    setTemplate({
      id: '',
      name: '',
      code: '',
      feature: 'sales-order',
      pageSize: 'A4',
      editor: { showRulers: true, showGuides: true, snapToGrid: true, gridSize: 10 },
      guides: { vertical: [397], horizontal: [200] },
      elements: []
    });
    setSelectedId('');
  };

  const loadTemplate = (savedTemplate) => {
    setTemplate(savedTemplate);
    setSelectedId(savedTemplate.elements?.[0]?.id || '');
  };

  const deleteTemplate = (templateId) => {
    persist(templates.filter((item) => item.id !== templateId));
    if (template.id === templateId) newTemplate();
    showAlert('Template dokumen berhasil dihapus', 'success');
  };

  const startResize = (event, element) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = element.layout?.width || 100;
    const startHeight = element.layout?.minHeight || 0;
    const canvasWidth = canvasRef.current?.clientWidth || 794;

    const handlePointerMove = (moveEvent) => {
      const widthDelta = ((moveEvent.clientX - startX) / canvasWidth) * 100;
      const heightDelta = moveEvent.clientY - startY;
      updateElement({
        ...element,
        layout: {
          ...element.layout,
          width: Math.min(100, Math.max(20, Math.round(startWidth + widthDelta))),
          minHeight: Math.min(400, Math.max(0, snapValue(startHeight + heightDelta))),
          fontSize: element.layout?.fontSize || 12,
          align: element.layout?.align || 'left'
        }
      });
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
  };

  const startMove = (event, element) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = element.layout?.offsetX || 0;
    const initialY = element.layout?.offsetY || 0;

    const handlePointerMove = (moveEvent) => {
      updateElement({
        ...element,
        layout: {
          width: 100,
          minHeight: 0,
          fontSize: 12,
          align: 'left',
          ...element.layout,
          offsetX: snapValue(initialX + moveEvent.clientX - startX),
          offsetY: snapValue(initialY + moveEvent.clientY - startY)
        }
      });
    };

    const stopMove = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopMove);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopMove);
  };

  const startGuideMove = (event, axis, index) => {
    event.preventDefault();
    event.stopPropagation();
    const pageRect = canvasRef.current?.getBoundingClientRect();
    if (!pageRect) return;

    const handlePointerMove = (moveEvent) => {
      const position = axis === 'vertical' ? moveEvent.clientX - pageRect.left : moveEvent.clientY - pageRect.top;
      updateGuide(axis, index, position);
    };
    const stopGuideMove = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopGuideMove);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopGuideMove);
  };

  const renderCanvas = (interactive = true) => (
    <div
      className={`db-page db-page-${template.pageSize.toLowerCase()} ${interactive ? 'db-page-editable' : ''}`}
      ref={interactive ? canvasRef : undefined}
      onDragOver={interactive ? (event) => event.preventDefault() : undefined}
      onDrop={interactive ? (event) => handleDrop(event) : undefined}
    >
      {interactive && editorSettings.showRulers ? (
        <>
          <div
            className="db-ruler db-ruler-horizontal"
            onClick={(event) => addGuide('vertical', event.clientX - event.currentTarget.getBoundingClientRect().left)}
            title="Klik untuk menambahkan garis bantu vertikal"
          >
            {Array.from({ length: 40 }, (_, index) => (
              <span className={index % 5 === 0 ? 'is-major' : ''} style={{ left: `${index * 20}px` }} key={index}>
                {index % 5 === 0 ? index * 20 : ''}
              </span>
            ))}
          </div>
          <div
            className="db-ruler db-ruler-vertical"
            onClick={(event) => addGuide('horizontal', event.clientY - event.currentTarget.getBoundingClientRect().top)}
            title="Klik untuk menambahkan garis bantu horizontal"
          >
            {Array.from({ length: 57 }, (_, index) => (
              <span className={index % 5 === 0 ? 'is-major' : ''} style={{ top: `${index * 20}px` }} key={index}>
                {index % 5 === 0 ? index * 20 : ''}
              </span>
            ))}
          </div>
          <div className="db-ruler-corner" />
        </>
      ) : null}
      {interactive && editorSettings.showGuides
        ? guides.vertical.map((position, index) => (
            <div
              className="db-guide db-guide-vertical"
              style={{ left: `${position}px` }}
              key={`vertical-${index}`}
              role="separator"
              aria-orientation="vertical"
              title="Geser garis bantu. Klik dua kali untuk menghapus."
              onPointerDown={(event) => startGuideMove(event, 'vertical', index)}
              onDoubleClick={() => removeGuide('vertical', index)}
            >
              <span>{position}px</span>
            </div>
          ))
        : null}
      {interactive && editorSettings.showGuides
        ? guides.horizontal.map((position, index) => (
            <div
              className="db-guide db-guide-horizontal"
              style={{ top: `${position}px` }}
              key={`horizontal-${index}`}
              role="separator"
              aria-orientation="horizontal"
              title="Geser garis bantu. Klik dua kali untuk menghapus."
              onPointerDown={(event) => startGuideMove(event, 'horizontal', index)}
              onDoubleClick={() => removeGuide('horizontal', index)}
            >
              <span>{position}px</span>
            </div>
          ))
        : null}
      {template.elements.length ? (
        template.elements.map((element, index) => (
          <div
            className={`db-canvas-element ${interactive && selectedId === element.id ? 'is-selected' : ''}`}
            key={element.id}
            style={{
              width: `${element.layout?.width || 100}%`,
              minHeight: `${element.layout?.minHeight || 0}px`,
              fontSize: `${element.layout?.fontSize || 12}px`,
              color: element.layout?.fontColor || '#172033',
              transform: `translate(${element.layout?.offsetX || 0}px, ${element.layout?.offsetY || 0}px)`,
              marginLeft:
                element.layout?.align === 'right'
                  ? 'auto'
                  : element.layout?.align === 'center'
                    ? `${(100 - (element.layout?.width || 100)) / 2}%`
                    : 0
            }}
            draggable={interactive}
            onDragStart={
              interactive
                ? (event) => {
                    event.dataTransfer.setData('application/document-element', element.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }
                : undefined
            }
            onDragOver={interactive ? (event) => event.preventDefault() : undefined}
            onDrop={
              interactive
                ? (event) => {
                    event.stopPropagation();
                    handleDrop(event, index);
                  }
                : undefined
            }
            onClick={interactive ? () => setSelectedId(element.id) : undefined}
          >
            {interactive && (
              <>
                <div className="db-element-actions">
                  <button
                    className="db-move-handle"
                    type="button"
                    draggable={false}
                    onPointerDown={(event) => startMove(event, element)}
                    title="Geser posisi"
                  >
                    <i className="ti ti-arrows-move" />
                  </button>
                  <button type="button" onClick={() => moveElement(element.id, -1)} title="Naik">
                    <i className="ti ti-arrow-up" />
                  </button>
                  <button type="button" onClick={() => moveElement(element.id, 1)} title="Turun">
                    <i className="ti ti-arrow-down" />
                  </button>
                  <button type="button" onClick={() => removeElement(element.id)} title="Hapus">
                    <i className="ti ti-trash" />
                  </button>
                </div>
                <button className="db-resize-handle" type="button" draggable={false} onPointerDown={(event) => startResize(event, element)}>
                  <i className="ti ti-arrows-diagonal-2" />
                </button>
              </>
            )}
            <DocumentElement element={element} />
          </div>
        ))
      ) : (
        <div className="db-empty-canvas">
          <i className="ti ti-drag-drop fs-1" />
          <strong>Tarik komponen ke sini</strong>
          <span>Mulai menyusun dokumen dari panel komponen.</span>
        </div>
      )}
    </div>
  );

  return (
    <Stack gap={3} className="document-builder">
      <MainCard bodyClassName="py-3">
        <Row className="g-3 align-items-end">
          <Col lg={3}>
            <Form.Label className="fw-semibold">Nama Template</Form.Label>
            <Form.Control
              value={template.name}
              onChange={(event) => setTemplate((current) => ({ ...current, name: event.target.value }))}
            />
          </Col>
          <Col lg={2}>
            <Form.Label className="fw-semibold">Kode</Form.Label>
            <Form.Control
              value={template.code}
              onChange={(event) => setTemplate((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            />
          </Col>
          <Col lg={2}>
            <Form.Label className="fw-semibold">Digunakan untuk</Form.Label>
            <Form.Select
              value={template.feature || 'sales-order'}
              onChange={(event) => setTemplate((current) => ({ ...current, feature: event.target.value }))}
            >
              {documentFeatureOptions.map((feature) => (
                <option value={feature.value} key={feature.value}>
                  {feature.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col lg={1}>
            <Form.Label className="fw-semibold">Ukuran</Form.Label>
            <Form.Select
              value={template.pageSize}
              onChange={(event) => setTemplate((current) => ({ ...current, pageSize: event.target.value }))}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </Form.Select>
          </Col>
          <Col lg={4}>
            <Stack direction="horizontal" gap={2} className="justify-content-lg-end">
              <Button variant="light-primary" onClick={newTemplate}>
                <i className="ti ti-file-plus me-1" />
                Baru
              </Button>
              <Button variant="outline-primary" onClick={() => setPreviewOpen(true)}>
                <i className="ti ti-eye me-1" />
                Preview
              </Button>
              <Button onClick={saveTemplate}>
                <i className="ti ti-device-floppy me-1" />
                Simpan
              </Button>
            </Stack>
          </Col>
        </Row>
      </MainCard>

      <div className="db-workspace">
        <Card className="db-panel">
          <Card.Header>
            <h6 className="mb-1">Komponen</h6>
            <small className="text-muted">Tarik ke halaman dokumen</small>
          </Card.Header>
          <Card.Body>
            <div className="db-component-list">
              {componentTypes.map((component) => (
                <button
                  className="db-component"
                  draggable
                  key={component.type}
                  type="button"
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/document-component', component.type);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => {
                    const nextElement = createElement(component.type);
                    setTemplate((current) => ({ ...current, elements: [...current.elements, nextElement] }));
                    setSelectedId(nextElement.id);
                  }}
                >
                  <i className={component.icon} />
                  <span>{component.label}</span>
                  <i className="ti ti-grip-vertical ms-auto text-muted" />
                </button>
              ))}
            </div>
            {(!template.feature || template.feature === 'sales-order') && (
              <div className="db-sales-order-fields">
                <div className="db-field-heading">
                  <strong>Field Sales Order</strong>
                  <small>getSalesOrderDetail</small>
                </div>
                <span className="text-muted small">Klik field untuk memasukkannya sebagai komponen teks.</span>
                <div className="db-field-list">
                  {salesOrderDocumentFields.map((field) => (
                    <button type="button" className="db-data-field" key={field.value} onClick={() => insertSalesOrderField(field)}>
                      <span>{field.label}</span>
                      <code>{`{{${field.value}}}`}</code>
                      <small>{field.source}</small>
                    </button>
                  ))}
                </div>
                <div className="db-line-field-help">
                  <strong>Field item / detail</strong>
                  <span>Gunakan pada komponen Tabel Barang:</span>
                  <div>
                    {salesOrderFieldOptions.map((field) => (
                      <Badge bg="light-secondary" text="secondary" key={field.value}>
                        {field.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        <div className="db-canvas-column">
          <div className="db-canvas-toolbar">
            <Form.Check
              type="switch"
              id="db-show-rulers"
              label="Penggaris"
              checked={editorSettings.showRulers}
              onChange={(event) => updateEditorSetting('showRulers', event.target.checked)}
            />
            <Form.Check
              type="switch"
              id="db-show-guides"
              label="Garis bantu"
              checked={editorSettings.showGuides}
              onChange={(event) => updateEditorSetting('showGuides', event.target.checked)}
            />
            <Form.Check
              type="switch"
              id="db-snap-grid"
              label="Snap"
              checked={editorSettings.snapToGrid}
              onChange={(event) => updateEditorSetting('snapToGrid', event.target.checked)}
            />
            <Form.Select
              size="sm"
              className="db-grid-size"
              value={editorSettings.gridSize}
              onChange={(event) => updateEditorSetting('gridSize', Number(event.target.value))}
              disabled={!editorSettings.snapToGrid}
            >
              <option value={5}>5 px</option>
              <option value={10}>10 px</option>
              <option value={20}>20 px</option>
            </Form.Select>
            <Button size="sm" variant="outline-info" onClick={() => addGuide('vertical', (canvasRef.current?.clientWidth || 794) / 2)}>
              <i className="ti ti-line-vertical me-1" />
              Guide vertikal
            </Button>
            <Button size="sm" variant="outline-info" onClick={() => addGuide('horizontal', 200)}>
              <i className="ti ti-line me-1" />
              Guide horizontal
            </Button>
            <Button
              size="sm"
              variant="link-danger"
              className="ms-auto"
              onClick={() => setTemplate((current) => ({ ...current, guides: { vertical: [], horizontal: [] } }))}
            >
              Hapus garis bantu
            </Button>
          </div>
          <div className="db-canvas-shell">{renderCanvas()}</div>
        </div>

        <Card className="db-panel">
          <Card.Header>
            <h6 className="mb-1">Properti</h6>
            <small className="text-muted">Atur komponen terpilih</small>
          </Card.Header>
          <Card.Body>
            <PropertyEditor element={selectedElement} onChange={updateElement} />
          </Card.Body>
        </Card>
      </div>

      <MainCard title="Template Tersimpan">
        {templates.length ? (
          <Row className="g-3">
            {templates.map((savedTemplate) => (
              <Col lg={4} md={6} key={savedTemplate.id}>
                <Card className="border h-100 mb-0">
                  <Card.Body>
                    <Stack gap={2}>
                      <div className="d-flex justify-content-between gap-2">
                        <div>
                          <h6 className="mb-1">{savedTemplate.name}</h6>
                          <Badge bg="light" text="dark">
                            {savedTemplate.code}
                          </Badge>
                        </div>
                        <span className="text-muted f-12">{savedTemplate.elements?.length || 0} komponen</span>
                      </div>
                      <Stack direction="horizontal" gap={2}>
                        <Button size="sm" variant="light-primary" onClick={() => loadTemplate(savedTemplate)}>
                          <i className="ti ti-pencil me-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => deleteTemplate(savedTemplate.id)}>
                          <i className="ti ti-trash me-1" />
                          Hapus
                        </Button>
                      </Stack>
                    </Stack>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="text-center text-muted py-4">Belum ada template yang disimpan.</div>
        )}
      </MainCard>

      <Modal show={previewOpen} onHide={() => setPreviewOpen(false)} size="xl" centered scrollable className="db-preview-modal">
        <Modal.Header closeButton>
          <Modal.Title>Preview — {template.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="db-preview-stage">{renderCanvas(false)}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setPreviewOpen(false)}>
            Tutup
          </Button>
          <Button onClick={() => window.print()}>
            <i className="ti ti-printer me-1" />
            Cetak
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
