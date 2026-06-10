import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import 'react-checkbox-tree/lib/react-checkbox-tree.css';
import CheckboxTree from 'react-checkbox-tree';
import Cookies from 'js-cookie';

import MainCard from 'components/MainCard';
import { Badge, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';
import listMenu from '../../../menu-items/list-menu';
import RoleServices from '../../../services/RoleServices';
import { useAlert } from '../../../utils/alertContext';
import LoaderData from '../../../components/LoaderData';
import Loader from '../../../components/Loader';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LoaderButton from '../../../components/LoaderButton';
import UserServices from '../../../services/UserServices';

export default function UserList() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [listRole, setListRole] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [userId, setUserId] = useState(null);

  const [checked, setChecked] = useState([]);
  const [expanded, setExpanded] = useState(['masterData', 'order', 'finance']);
  const [menuName, setMenuName] = useState('');

  const [input, setInput] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  })

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showMenu) {
      getListRole();
    }
  }, [showMenu]);

  const handleSetState = (key, e) => {
    setInput({
      ...input,
      [key]: e.target.value
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const getListRole = async () => {
    const response = await RoleServices.fetchAllRoles();
    if (response.data.success) {
      setListRole(response.data.data);
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    const response = await UserServices.getAllUser();
    if (response.data.success) {
      setDataSource(response.data.data);
      setLoadingData(false);
    }
  };

  // const fetchRoleDetail = async (userId) => {
  //   const response = await RoleServices.fetchRole(roleId);
  //   if (response.data.success) {
  //     setMenuName(response.data.data?.name);
  //     setShowMenu(true);
  //     setChecked(response.data.data?.role_menu?.menu);
  //     // setDataSource(response.data.data);
  //   }
  // };

  const showAddMenu = () => {
    setShowMenu(true);
  };

  const showEditMenu = (id) => {
    setUserId(id);
    // fetchRoleDetail(id);
  };

  const handleCreate = async () => {
    console.log('input => ', input)
    // setLoadingSubmit(true);
    // const payload = {
    //   name: menuName,
    //   is_active: true,
    //   menu: checked
    // };

    // const response = await RoleServices.postCreateRole(payload);
    // try {
    //   if (response.data.success) {
    //     setLoadingSubmit(false);
    //     showAlert('Data Berhasil di simpan', 'success');
    //     setShowMenu(false);
    //     fetchData();
    //   }
    // } catch (error) {
    //   setLoadingSubmit(false);
    // }
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
        setLoadingSubmit(false);
        showAlert('Data Berhasil di ubah', 'success');
        Cookies.set('menu', JSON.stringify(checked));
        setShowMenu(false);
        window.location.replace('/');
        setRoleId(null);
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
    <MainCard title="Daftar User">
      <Row style={{ marginBottom: 10 }}>
        <Col sm={12} md={6} lg={12} className="text-end">
          <Button onClick={() => setShowMenu(true)} variant="success">
            Tambah
          </Button>
        </Col>
      </Row>
      <Row>
        <Col sm={12} md={6} lg={12}>
          <Table bordered className="mb-0">
            {loadingData ? (
              <LoaderData />
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Hak Akses</th>
                    <th>Status</th>
                    <th className="text-center">#</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSource.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.role?.name}</td>
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
      <Modal show={showMenu} onHide={() => setShowMenu(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>Tambah User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            placeholder="Nama..."
            name="name"
            value={input.name}
            onChange={(e) => handleSetState('name', e)}
          />
          <br />
          <Form.Control
            type="text"
            placeholder="User Name..."
            name="username"
            value={input.username}
            onChange={(e) => handleSetState('username', e)}
          />
          <br />
          <Form.Control
            type="email"
            placeholder="Email"
            name="email"
            value={input.email}
            onChange={(e) => handleSetState('email', e)}
          />
          <br />
          <InputGroup>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={input.password}
              onChange={(e) => handleSetState('password', e)}
            />
            <Button onClick={togglePasswordVisibility}>
              {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
            </Button>
          </InputGroup>
          <br />
          <Form.Select aria-label="Default select example">
            {console.log('list role => ', listRole)}
            <option>Pilih Hak Akses</option>
            {listRole.map((val, key) => {
              return <option value={val?.id}>{val?.name}</option>;
            })}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMenu(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => (userId ? handleEdit() : handleCreate())} disabled={loadingSubmit}>
            {loadingSubmit ? <LoaderButton /> : 'Simpan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </MainCard>
  );
}
