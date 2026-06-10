import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import 'react-checkbox-tree/lib/react-checkbox-tree.css';
import CheckboxTree from 'react-checkbox-tree';
import Cookies from 'js-cookie';

import MainCard from 'components/MainCard';
import { Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import listMenu from '../../../menu-items/list-menu';
import RoleServices from '../../../services/RoleServices';
import { useAlert } from '../../../utils/alertContext';
import LoaderData from '../../../components/LoaderData';
import Loader from '../../../components/Loader';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LoaderButton from '../../../components/LoaderButton';

export default function PermissionList() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [roleId, setRoleId] = useState(null);

  const [checked, setChecked] = useState([]);
  const [expanded, setExpanded] = useState(['masterData', 'order', 'finance']);
  const [menuName, setMenuName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await RoleServices.fetchAllRoles();
    if (response.data.success) {
      setDataSource(response.data.data);
      setLoadingData(false);
    }
  };

  const fetchRoleDetail = async (roleId) => {
    const response = await RoleServices.fetchRole(roleId);
    if (response.data.success) {
      setMenuName(response.data.data?.name);
      setShowMenu(true)
      setChecked(response.data.data?.role_menu?.menu)
      // setDataSource(response.data.data);
    }
  };

  const showAddMenu = () => {
    setShowMenu(true);
  };

  const showEditMenu = (id) => {
    setRoleId(id)
    fetchRoleDetail(id);
  };

  const handleCreate = async () => {
    setLoadingSubmit(true);
    const payload = {
      name: menuName,
      is_active: true,
      menu: checked
    };

    const response = await RoleServices.postCreateRole(payload);
    try {
      if (response.data.success) {
        setLoadingSubmit(false)
        showAlert('Data Berhasil di simpan', 'success');
        setShowMenu(false);
        fetchData();
      }
    } catch (error) {
      setLoadingSubmit(false);
    }
  };

  const handleEdit = async () => {
    setLoadingSubmit(true);
    const payload = {
      name: menuName,
      is_active: true,
      menu: checked
    };

    const response = await RoleServices.putEditRole(roleId, payload);
    try {
      if (response.data.success) {
        setLoadingSubmit(false)
        showAlert('Data Berhasil di ubah', 'success');
        Cookies.set('menu', JSON.stringify(checked));
        setShowMenu(false);
        window.location.replace('/')
        setRoleId(null)
      }
    } catch (error) {
      setLoadingSubmit(false);
    }
  };

  const handleShowConfirm = async (id) => {
    setShowConfirm(true);
    setRoleId(id);
  };

  const handleDelete = async () => {
    const response = await RoleServices.deleteRole(roleId);
    if (response.data.success) {
      showAlert('Data Berhasil di hapus', 'success');
      setShowConfirm(false);
      fetchData();
    }
  };

  return (
    <MainCard title="Role Permission">
      <Row style={{ marginBottom: 10 }}>
        <Col sm={12} md={6} lg={12} className="text-end">
          <Button onClick={() => setShowMenu(true)} variant="success">
            Tambah
          </Button>
        </Col>
      </Row>
      <Row>
        <Col sm={12} md={6} lg={12}>
          <Table className="mb-0" bordered>
            {loadingData ? (
              <LoaderData />
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Status</th>
                    <th className="text-center">#</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSource.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.is_active ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}</td>
                      <td className="text-center">
                        <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => showEditMenu(item.id)}>
                          <i className="ti ti-pencil" cursor="pointer" />
                        </Button>
                        &nbsp;&nbsp;&nbsp;
                        <Button className="rounded-circle" variant="outline-danger" size="sm" onClick={() => handleShowConfirm(item.id)}>
                          <i className="ti ti-trash" cursor="pointer" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </Table>
        </Col>
      </Row>
      <Modal show={showMenu} onHide={() => setShowMenu(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Role Permission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            placeholder="Role Name"
            name="roleName"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
          />
          <br />
          <Col sm={12} md={6} lg={12}>
            <CheckboxTree
              iconsClass="fa4"
              nodes={listMenu}
              checked={checked}
              expanded={expanded}
              onCheck={(checked) => setChecked(checked)}
              onExpand={(expanded) => setExpanded(expanded)}
              showNodeIcon={false}
              iconsClass="fa4"
              showExpandAll={true}
              icons={{
                check: <span className="ti ti-square-check-filled text-primary" />,
                uncheck: <span className="ti ti-crop-1-1" />,
                halfCheck: <span className="ti ti-crop-16-9-filled text-primary" />,
                expandClose: <span className="ti ti-chevron-up" />,
                expandOpen: <span className="ti ti-chevron-down" />,
                expandAll: <span className="ti ti-chevron-down" />,
                collapseAll: <span className="ti ti-chevron-up" />,
                parentClose: <span className="ti ti-chevron-up" />,
                parentOpen: <span className="ti ti-chevron-down" />,
                leaf: <span className="rct-icon rct-icon-leaf" />
              }}
            />
          </Col>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMenu(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => roleId ? handleEdit() : handleCreate()} disabled={loadingSubmit}>
            {loadingSubmit ? <LoaderButton /> : 'Simpan'}
          </Button>
        </Modal.Footer>
      </Modal>
      <ConfirmDialog
        show={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onSubmit={() => handleDelete()}
        title={'Hapus Role'}
        subTitle={'Anda yakin ingin menghapus data ?'}
      />
    </MainCard>
  );
}
