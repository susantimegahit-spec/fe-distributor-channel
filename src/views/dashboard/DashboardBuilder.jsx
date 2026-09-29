import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import DashboardLayoutServices from 'services/setting/DashboardLayoutServices';
import RoleServices from 'services/setting/RoleServices';
import { widgetRegistry } from './widget';
export const layoutKey = (roleId) => `dc-dashboard-layout:role:${roleId}`;
const DEFAULT_GRID_COLUMNS = 3;
const clamp = (value, minimum, maximum) => Math.min(Math.max(Number(value) || minimum, minimum), maximum);

const normalizeRows = (rows, legacyColumns = DEFAULT_GRID_COLUMNS) => {
  const source = Array.isArray(rows) && rows.length ? rows : [{ columns: legacyColumns }];
  return source.map((row) => ({ columns: clamp(row?.columns ?? row, 1, 3) }));
};

const normalizeWidgets = (widgets, rows) =>
  widgets
    .map((widget, index) => {
      const id = typeof widget === 'string' ? widget : widget?.id;
      const definition = widgetRegistry.find((item) => item.id === id);
      const row = clamp(typeof widget === 'string' ? 1 : widget?.row, 1, rows.length);
      const columns = rows[row - 1].columns;
      const defaultSpan = definition?.size === 'full' ? columns : 1;
      const span = clamp(typeof widget === 'string' ? defaultSpan : widget?.span, 1, columns);
      const column = clamp(typeof widget === 'string' ? 1 : widget?.column, 1, columns - span + 1);
      return {
        id,
        sort: Number(typeof widget === 'string' ? index + 1 : widget?.sort) || index + 1,
        row,
        column,
        span,
        properties: typeof widget === 'string' ? null : (widget?.properties ?? null)
      };
    })
    .filter((widget) => widget.id && widgetRegistry.some((item) => item.id === widget.id));

export const normalizeLayout = (value = {}) => {
  const legacyColumns = clamp(Array.isArray(value) ? DEFAULT_GRID_COLUMNS : value?.columns, 1, 3);
  const rows = normalizeRows(Array.isArray(value) ? null : value?.rows, legacyColumns);
  const widgets = normalizeWidgets(Array.isArray(value) ? value : value?.widgets || [], rows);
  return { version: Number(Array.isArray(value) ? 0 : value?.version) || 0, rows, widgets };
};

export const readLayout = (roleId) => {
  try {
    const value = JSON.parse(localStorage.getItem(layoutKey(roleId)) || '[]');
    return normalizeLayout(value);
  } catch {
    return { version: 0, rows: [{ columns: DEFAULT_GRID_COLUMNS }], widgets: [] };
  }
};
export default function DashboardBuilder({ show, onClose, roleId, onSaved }) {
  const [roles, setRoles] = useState([]);
  const [targetRole, setTargetRole] = useState(String(roleId));
  const [layout, setLayout] = useState({ version: 0, rows: [{ columns: DEFAULT_GRID_COLUMNS }], widgets: [] });
  const [search, setSearch] = useState('');
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    if (show)
      RoleServices.fetchAllRoles()
        .then((r) => setRoles(r?.data?.data || []))
        .catch(() => setRoles([]));
  }, [show]);
  useEffect(() => {
    if (show) {
      setLayout(readLayout(targetRole));
      setSelectedWidgetId(null);
      setSaveError('');
    }
  }, [show, targetRole]);
  const groups = useMemo(
    () =>
      widgetRegistry.reduce((all, w) => {
        if (w.title.toLowerCase().includes(search.toLowerCase()) || w.group.toLowerCase().includes(search.toLowerCase())) {
          if (!all[w.group]) all[w.group] = [];
          all[w.group].push(w);
        }
        return all;
      }, {}),
    [search]
  );
  const add = (id) => {
    setSelectedWidgetId(id || null);
    setLayout((current) => {
      if (!id || current.widgets.some((widget) => widget.id === id)) return current;
      const definition = widgetRegistry.find((widget) => widget.id === id);
      const row = current.rows.length;
      const columns = current.rows[row - 1].columns;
      return {
        ...current,
        widgets: [
          ...current.widgets,
          {
            id,
            sort: current.widgets.length + 1,
            row,
            column: 1,
            span: definition?.size === 'full' ? columns : 1,
            properties: null
          }
        ]
      };
    });
  };
  const move = (i, d) =>
    setLayout((current) => {
      const n = [...current.widgets],
        t = i + d;
      if (t < 0 || t >= n.length) return current;
      [n[i], n[t]] = [n[t], n[i]];
      return { ...current, widgets: n.map((widget, index) => ({ ...widget, sort: index + 1 })) };
    });
  const rangesOverlap = (firstColumn, firstSpan, secondColumn, secondSpan) =>
    firstColumn < secondColumn + secondSpan && secondColumn < firstColumn + firstSpan;
  const moveWidgetTo = (id, row, column, span, merge = null) =>
    setLayout((current) => {
      const source = current.widgets.find((widget) => widget.id === id);
      if (!source) return current;

      if (merge?.occupiedId) {
        const sourceColumn = merge.sourceFirst ? 1 : 2;
        const occupiedColumn = merge.sourceFirst ? 2 : 1;
        return {
          ...current,
          rows: current.rows.map((item, index) => (index === row - 1 ? { ...item, columns: 2 } : item)),
          widgets: current.widgets.map((widget) => {
            if (widget.id === id) return { ...widget, row, column: sourceColumn, span: 1 };
            if (widget.id === merge.occupiedId) return { ...widget, row, column: occupiedColumn, span: 1 };
            return widget;
          })
        };
      }

      const targetColumns = current.rows[row - 1]?.columns || DEFAULT_GRID_COLUMNS;
      const targetSpan = clamp(span ?? source.span, 1, targetColumns);
      const targetColumn = clamp(column, 1, targetColumns - targetSpan + 1);
      const occupiedWidgets = current.widgets.filter(
        (widget) => widget.id !== id && widget.row === row && rangesOverlap(targetColumn, targetSpan, widget.column, widget.span)
      );
      if (occupiedWidgets.length > 1) return current;
      const occupied = occupiedWidgets[0];

      return {
        ...current,
        widgets: current.widgets.map((widget) => {
          if (widget.id === id) return { ...widget, row, column: targetColumn, span: targetSpan };
          if (widget.id !== occupied?.id) return widget;

          const sourceRowColumns = current.rows[source.row - 1]?.columns || DEFAULT_GRID_COLUMNS;
          const sourceSpan = clamp(source.span, 1, sourceRowColumns);
          return {
            ...widget,
            row: source.row,
            column: clamp(source.column, 1, sourceRowColumns - sourceSpan + 1),
            span: sourceSpan
          };
        })
      };
    });
  const getDropColumn = (event, columns) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width - 1);
    return clamp(Math.floor((relativeX / bounds.width) * columns) + 1, 1, columns);
  };
  const getDropPlacement = (event, row, columns) => {
    const pointerColumn = getDropColumn(event, columns);
    const bounds = event.currentTarget.getBoundingClientRect();
    const sourceFirst = event.clientX < bounds.left + bounds.width / 2;
    const occupied = layout.widgets.find(
      (widget) =>
        widget.id !== draggedWidgetId && widget.row === row && pointerColumn >= widget.column && pointerColumn < widget.column + widget.span
    );
    const source = layout.widgets.find((widget) => widget.id === draggedWidgetId);
    const sourceColumns = source ? layout.rows[source.row - 1]?.columns || DEFAULT_GRID_COLUMNS : 1;
    const rowWidgets = layout.widgets.filter((widget) => widget.id !== draggedWidgetId && widget.row === row);
    const canAutoSplit =
      source && occupied && source.row !== row && source.span === sourceColumns && occupied.span === columns && rowWidgets.length === 1;
    if (canAutoSplit) {
      const canvas = event.currentTarget.closest('.sm-dashboard-builder-canvas');
      const targetElement = canvas?.querySelector(`[data-dashboard-widget-id="${occupied.id}"]`);
      return {
        row,
        column: sourceFirst ? 1 : 2,
        span: 1,
        previewColumns: 2,
        occupiedId: occupied.id,
        occupiedColumn: sourceFirst ? 2 : 1,
        sourceSpan: 1,
        height: targetElement?.getBoundingClientRect().height || 110,
        merge: { occupiedId: occupied.id, sourceFirst }
      };
    }
    const span = clamp(occupied?.span ?? source?.span ?? 1, 1, columns);
    const canvas = event.currentTarget.closest('.sm-dashboard-builder-canvas');
    const targetElement = canvas?.querySelector(`[data-dashboard-widget-id="${occupied?.id || draggedWidgetId}"]`);
    return {
      row,
      column: occupied?.column ?? clamp(pointerColumn, 1, columns - span + 1),
      span,
      occupiedId: occupied?.id || null,
      sourceSpan: source?.span || 1,
      height: targetElement?.getBoundingClientRect().height || 110
    };
  };
  const handleGridDragOver = (event, row, columns) => {
    if (!event.dataTransfer.types.includes('text/dashboard-widget-id')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDragTarget(getDropPlacement(event, row, columns));
  };
  const handleGridDrop = (event, row, columns) => {
    const id = event.dataTransfer.getData('text/dashboard-widget-id');
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    const placement = getDropPlacement(event, row, columns);
    moveWidgetTo(id, placement.row, placement.column, placement.span, placement.merge);
    setSelectedWidgetId(id);
    setDraggedWidgetId(null);
    setDragTarget(null);
  };
  const updateWidget = (id, property, value) =>
    setLayout((current) => {
      if (property === 'sort') {
        const widgets = [...current.widgets];
        const currentIndex = widgets.findIndex((widget) => widget.id === id);
        const targetIndex = clamp(value, 1, widgets.length) - 1;
        const [widget] = widgets.splice(currentIndex, 1);
        widgets.splice(targetIndex, 0, widget);
        return { ...current, widgets: widgets.map((item, index) => ({ ...item, sort: index + 1 })) };
      }

      return {
        ...current,
        widgets: current.widgets.map((widget) => {
          if (widget.id !== id) return widget;
          const next = { ...widget, [property]: Number(value) };
          const columns = current.rows[next.row - 1].columns;
          if (property === 'row') {
            const nextColumns = current.rows[next.row - 1].columns;
            next.span = clamp(next.span, 1, nextColumns);
            next.column = clamp(next.column, 1, nextColumns - next.span + 1);
          }
          if (property === 'span') next.column = clamp(next.column, 1, columns - next.span + 1);
          if (property === 'column') next.column = clamp(next.column, 1, columns - next.span + 1);
          return next;
        })
      };
    });
  const updateRowCount = (value) =>
    setLayout((current) => {
      const count = clamp(value, 1, 10);
      const rows = Array.from({ length: count }, (_, index) => current.rows[index] || { columns: DEFAULT_GRID_COLUMNS });
      return { ...current, rows, widgets: normalizeWidgets(current.widgets, rows) };
    });
  const updateRowColumns = (rowIndex, value) =>
    setLayout((current) => {
      const rows = current.rows.map((row, index) => (index === rowIndex ? { columns: clamp(value, 1, 3) } : row));
      return { ...current, rows, widgets: normalizeWidgets(current.widgets, rows) };
    });
  const removeWidget = (id) => {
    setSelectedWidgetId((current) => (current === id ? null : current));
    setLayout((current) => ({
      ...current,
      widgets: current.widgets.filter((widget) => widget.id !== id).map((widget, index) => ({ ...widget, sort: index + 1 }))
    }));
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');

    const payload = {
      version: Number(layout.version) || 0,
      rows: layout.rows.map((row, index) => ({ row: index + 1, columns: row.columns })),
      widgets: layout.widgets.map((widget, index) => ({
        id: widget.id,
        sort: Number(widget.sort) || index + 1,
        row: widget.row,
        column: widget.column,
        span: widget.span,
        properties: widget.properties ?? null
      }))
    };

    try {
      const response = await DashboardLayoutServices.putDashboardLayout(targetRole, payload);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Gagal menyimpan dashboard.');
      }

      const responseLayout = response?.data?.data || {};
      const savedRows = normalizeRows(responseLayout.rows || payload.rows);
      const savedLayout = {
        version: Number(responseLayout.version ?? payload.version) || 0,
        rows: savedRows,
        widgets: normalizeWidgets(responseLayout.widgets || payload.widgets, savedRows)
      };

      localStorage.setItem(layoutKey(targetRole), JSON.stringify(savedLayout));
      window.dispatchEvent(new CustomEvent('dashboard-layout-updated', { detail: { roleId: targetRole } }));
      onSaved(targetRole);
      onClose();
    } catch (error) {
      setSaveError(error?.response?.data?.message || error?.message || 'Gagal menyimpan dashboard.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal show={show} onHide={onClose} fullscreen className="sm-dashboard-builder-modal">
      <Modal.Header className="sm-dashboard-builder-header">
        <div className="sm-dashboard-builder-header-copy">
          <Modal.Title>Dashboard Builder</Modal.Title>
          <p>Susun widget dashboard untuk setiap role.</p>
        </div>
        <Button className="sm-dashboard-builder-close" variant="light-secondary" onClick={onClose} aria-label="Tutup Dashboard Builder">
          <i className="ti ti-x" />
        </Button>
      </Modal.Header>
      <Modal.Body>
        <div className="sm-dashboard-builder-workspace">
          <Card className="sm-dashboard-builder-sidebar">
            <Card.Body>
              <Form.Label>Role pengguna</Form.Label>
              <Form.Select className="mb-3" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name || r.role_name || `Role ${r.id}`}
                  </option>
                ))}
                {!roles.some((r) => String(r.id) === String(roleId)) && <option value={roleId}>Administrator</option>}
              </Form.Select>
              <Form.Control className="mb-3" placeholder="Cari widget..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Form.Label>Jumlah row dashboard</Form.Label>
              <Form.Select className="mb-3" value={layout.rows.length} onChange={(event) => updateRowCount(event.target.value)}>
                {Array.from({ length: 10 }, (_, index) => (
                  <option value={index + 1} key={index + 1}>
                    {index + 1} row
                  </option>
                ))}
              </Form.Select>
              <div className="sm-dashboard-row-settings">
                {layout.rows.map((row, index) => (
                  <label key={index}>
                    <span>Row {index + 1}</span>
                    <Form.Select size="sm" value={row.columns} onChange={(event) => updateRowColumns(index, event.target.value)}>
                      {[1, 2, 3].map((columns) => (
                        <option value={columns} key={columns}>
                          {columns} kolom
                        </option>
                      ))}
                    </Form.Select>
                  </label>
                ))}
              </div>
              {Object.entries(groups).map(([group, items]) => (
                <div className="sm-dashboard-widget-group" key={group}>
                  <h6>{group}</h6>
                  {items.map((w) => (
                    <button
                      type="button"
                      className="sm-dashboard-widget-option"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/widget-id', w.id)}
                      onClick={() => add(w.id)}
                      disabled={layout.widgets.some((widget) => widget.id === w.id)}
                      key={w.id}
                    >
                      <i className={w.icon} />
                      <span>{w.title}</span>
                      <i className="ti ti-plus" />
                    </button>
                  ))}
                </div>
              ))}
            </Card.Body>
          </Card>
          <section
            className="sm-dashboard-builder-canvas"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => add(e.dataTransfer.getData('text/widget-id'))}
          >
            <div className="sm-dashboard-builder-canvas-head">
              <div>
                <h4>Dashboard Canvas</h4>
                <span>
                  {layout.widgets.length} widget dipilih · {layout.rows.length} row
                </span>
                <small className="d-block text-muted mt-1">Klik widget di canvas untuk membuka properties.</small>
              </div>
              <Button
                variant="light-danger"
                onClick={() => {
                  setSelectedWidgetId(null);
                  setLayout((current) => ({ ...current, widgets: [] }));
                }}
                disabled={!layout.widgets.length}
              >
                Kosongkan
              </Button>
            </div>
            {layout.widgets.length ? (
              <div className="sm-dashboard-builder-rows">
                {layout.rows.map((row, rowIndex) => (
                  <section className="sm-dashboard-builder-row" key={rowIndex}>
                    <div className="sm-dashboard-builder-row-label">
                      Row {rowIndex + 1} · {row.columns} kolom
                    </div>
                    <div
                      className={`sm-dashboard-builder-grid${dragTarget?.row === rowIndex + 1 ? ' is-drag-target' : ''}`}
                      style={{
                        gridTemplateColumns: `repeat(${
                          dragTarget?.row === rowIndex + 1 && dragTarget.previewColumns ? dragTarget.previewColumns : row.columns
                        }, minmax(0, 1fr))`
                      }}
                      onDragOver={(event) => handleGridDragOver(event, rowIndex + 1, row.columns)}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setDragTarget(null);
                      }}
                      onDrop={(event) => handleGridDrop(event, rowIndex + 1, row.columns)}
                    >
                      {dragTarget?.row === rowIndex + 1 && (
                        <div
                          className="sm-dashboard-builder-drop-overlay"
                          style={{
                            gridColumn: `${dragTarget.column} / span ${dragTarget.span}`,
                            height: dragTarget.height
                          }}
                          aria-hidden="true"
                        >
                          <span>{dragTarget.span} kolom</span>
                        </div>
                      )}
                      {layout.widgets
                        .filter((widget) => widget.row === rowIndex + 1)
                        .map((item) => {
                          const i = layout.widgets.findIndex((widget) => widget.id === item.id);
                          const w = widgetRegistry.find((x) => x.id === item.id);
                          if (!w) return null;
                          const Widget = w.component;
                          const isDropDestination = dragTarget?.occupiedId === item.id;
                          const previewScale =
                            isDropDestination && !dragTarget.previewColumns
                              ? Math.min(Math.max(dragTarget.sourceSpan / item.span, 0.9), 1.1)
                              : 1;
                          const previewGridColumn =
                            isDropDestination && dragTarget.previewColumns
                              ? `${dragTarget.occupiedColumn} / span 1`
                              : `${item.column} / span ${item.span}`;
                          return (
                            <div
                              className={`sm-dashboard-builder-item${selectedWidgetId === item.id ? ' is-selected' : ''}${
                                draggedWidgetId === item.id ? ' is-dragging' : ''
                              }${isDropDestination ? ' is-drop-destination' : ''}`}
                              key={item.id}
                              style={{ gridColumn: previewGridColumn, '--sm-dashboard-preview-scale': previewScale }}
                              data-dashboard-widget-id={item.id}
                              onClick={() => setSelectedWidgetId(item.id)}
                            >
                              <button
                                type="button"
                                className="sm-dashboard-widget-drag-handle"
                                draggable
                                title="Geser posisi widget"
                                aria-label={`Geser posisi ${w.title}`}
                                onClick={(event) => event.stopPropagation()}
                                onDragStart={(event) => {
                                  event.stopPropagation();
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData('text/dashboard-widget-id', item.id);
                                  const widgetElement = event.currentTarget.closest('.sm-dashboard-builder-item');
                                  if (widgetElement) {
                                    const bounds = widgetElement.getBoundingClientRect();
                                    event.dataTransfer.setDragImage(widgetElement, Math.min(event.clientX - bounds.left, bounds.width), 24);
                                  }
                                  setDraggedWidgetId(item.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedWidgetId(null);
                                  setDragTarget(null);
                                }}
                              >
                                <i className="ti ti-grip-vertical" />
                              </button>
                              {selectedWidgetId === item.id && (
                                <div className="sm-dashboard-widget-properties" onClick={(event) => event.stopPropagation()}>
                                  <div className="sm-dashboard-widget-properties-head">
                                    <div>
                                      <i className={w.icon} />
                                      <strong>{w.title}</strong>
                                    </div>
                                    <div className="sm-dashboard-builder-item-actions">
                                      <Button
                                        variant="light-secondary"
                                        size="sm"
                                        onClick={() => move(i, -1)}
                                        disabled={!i}
                                        title="Geser ke kiri"
                                      >
                                        <i className="ti ti-arrow-left" />
                                      </Button>
                                      <Button
                                        variant="light-secondary"
                                        size="sm"
                                        onClick={() => move(i, 1)}
                                        disabled={i === layout.widgets.length - 1}
                                        title="Geser ke kanan"
                                      >
                                        <i className="ti ti-arrow-right" />
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        className="sm-dashboard-widget-remove"
                                        onClick={() => removeWidget(item.id)}
                                        title="Hapus widget"
                                        aria-label={`Hapus ${w.title}`}
                                      >
                                        <i className="ti ti-trash me-1" /> Hapus
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="sm-dashboard-widget-properties-fields">
                                    <label>
                                      <span>Urutan / Sort</span>
                                      <Form.Select
                                        size="sm"
                                        value={item.sort}
                                        onChange={(event) => updateWidget(item.id, 'sort', event.target.value)}
                                      >
                                        {layout.widgets.map((_, index) => (
                                          <option value={index + 1} key={index + 1}>
                                            {index + 1}
                                          </option>
                                        ))}
                                      </Form.Select>
                                    </label>
                                    <label>
                                      <span>Row</span>
                                      <Form.Select
                                        size="sm"
                                        value={item.row}
                                        onChange={(event) => updateWidget(item.id, 'row', event.target.value)}
                                      >
                                        {layout.rows.map((_, index) => (
                                          <option value={index + 1} key={index + 1}>
                                            Row {index + 1}
                                          </option>
                                        ))}
                                      </Form.Select>
                                    </label>
                                    <label>
                                      <span>Mulai dari kolom</span>
                                      <Form.Select
                                        size="sm"
                                        value={item.column}
                                        onChange={(event) => updateWidget(item.id, 'column', event.target.value)}
                                      >
                                        {Array.from({ length: layout.rows[item.row - 1].columns - item.span + 1 }, (_, index) => (
                                          <option value={index + 1} key={index + 1}>
                                            Kolom {index + 1}
                                          </option>
                                        ))}
                                      </Form.Select>
                                    </label>
                                    <label>
                                      <span>Panjang widget</span>
                                      <Form.Select
                                        size="sm"
                                        value={item.span}
                                        onChange={(event) => updateWidget(item.id, 'span', event.target.value)}
                                      >
                                        {Array.from({ length: layout.rows[item.row - 1].columns }, (_, index) => (
                                          <option value={index + 1} key={index + 1}>
                                            {index + 1} kolom
                                          </option>
                                        ))}
                                      </Form.Select>
                                    </label>
                                  </div>
                                </div>
                              )}
                              <Widget />
                            </div>
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="sm-dashboard-builder-drop">
                <i className="ti ti-layout-dashboard" />
                <h5>Canvas masih kosong</h5>
                <p>Klik atau drag widget dari sidebar ke area ini.</p>
              </div>
            )}
          </section>
        </div>
      </Modal.Body>
      <Modal.Footer>
        {saveError && (
          <Alert variant="danger" className="mb-0 me-auto py-2">
            {saveError}
          </Alert>
        )}
        <Button variant="light-secondary" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={save} disabled={saving}>
          <i className={`ti ${saving ? 'ti-loader-2' : 'ti-device-floppy'} me-2`} />
          {saving ? 'Menyimpan...' : 'Simpan Dashboard'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
DashboardBuilder.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  roleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSaved: PropTypes.func.isRequired
};
