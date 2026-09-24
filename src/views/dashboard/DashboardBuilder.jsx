import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import RoleServices from 'services/setting/RoleServices';
import { widgetRegistry } from './widget';
export const layoutKey = (roleId) => `dc-dashboard-layout:role:${roleId}`;
export const readLayout = (roleId) => {
  try {
    const value = JSON.parse(localStorage.getItem(layoutKey(roleId)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
export default function DashboardBuilder({ show, onClose, roleId, onSaved }) {
  const [roles, setRoles] = useState([]);
  const [targetRole, setTargetRole] = useState(String(roleId));
  const [layout, setLayout] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (show)
      RoleServices.fetchAllRoles()
        .then((r) => setRoles(r?.data?.data || []))
        .catch(() => setRoles([]));
  }, [show]);
  useEffect(() => {
    if (show) setLayout(readLayout(targetRole));
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
  const add = (id) => setLayout((list) => (id && !list.includes(id) ? [...list, id] : list));
  const move = (i, d) =>
    setLayout((list) => {
      const n = [...list],
        t = i + d;
      if (t < 0 || t >= n.length) return list;
      [n[i], n[t]] = [n[t], n[i]];
      return n;
    });
  const save = () => {
    localStorage.setItem(layoutKey(targetRole), JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent('dashboard-layout-updated', { detail: { roleId: targetRole } }));
    onSaved(targetRole);
    onClose();
  };
  return (
    <Modal show={show} onHide={onClose} fullscreen className="sm-dashboard-builder-modal">
      <Modal.Header>
        <div>
          <Modal.Title>Dashboard Builder</Modal.Title>
          <small className="text-muted">Susun widget dashboard untuk setiap role.</small>
        </div>
        <Button variant="light-secondary" onClick={onClose}>
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
              {Object.entries(groups).map(([group, items]) => (
                <div className="sm-dashboard-widget-group" key={group}>
                  <h6>{group}</h6>
                  {items.map((w) => (
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/widget-id', w.id)}
                      onClick={() => add(w.id)}
                      disabled={layout.includes(w.id)}
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
                <span>{layout.length} widget dipilih</span>
              </div>
              <Button variant="light-danger" onClick={() => setLayout([])} disabled={!layout.length}>
                Kosongkan
              </Button>
            </div>
            {layout.length ? (
              <div className="sm-dashboard-builder-grid">
                {layout.map((id, i) => {
                  const w = widgetRegistry.find((x) => x.id === id);
                  if (!w) return null;
                  const Widget = w.component;
                  return (
                    <div className="sm-dashboard-builder-item" key={id}>
                      <div className="sm-dashboard-builder-item-actions">
                        <button onClick={() => move(i, -1)} disabled={!i}>
                          <i className="ti ti-arrow-left" />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === layout.length - 1}>
                          <i className="ti ti-arrow-right" />
                        </button>
                        <button onClick={() => setLayout((list) => list.filter((x) => x !== id))}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                      <Widget />
                    </div>
                  );
                })}
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
        <Button variant="light-secondary" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={save}>
          <i className="ti ti-device-floppy me-2" />
          Simpan Dashboard
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
