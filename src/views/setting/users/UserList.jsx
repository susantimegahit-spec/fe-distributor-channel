import { useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Select from 'react-select';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LoaderButton from '../../../components/LoaderButton';
import LoaderData from '../../../components/LoaderData';
import DistributorServices from '../../../services/DistributorServices';
import RoleServices from '../../../services/RoleServices';
import UserServices from '../../../services/UserServices';
import { useAlert } from '../../../utils/alertContext';

const initialInput = {
  name: '',
  username: '',
  email: '',
  password: '',
  roleId: '',
  distributorCodes: [],
  distributorIds: []
};

const pageSize = 10;
const ALL_DISTRIBUTORS_VALUE = 'ALL';
const allDistributorOption = {
  value: ALL_DISTRIBUTORS_VALUE,
  label: 'All Distributor',
  id: ALL_DISTRIBUTORS_VALUE,
  name: 'All Distributor',
  isAll: true
};

const getUserDistributorCode = (item) =>
  item?.code_customer ||
  item?.customer_code ||
  item?.distributor_code ||
  item?.distributor?.code_customer ||
  item?.distributor?.customer_code ||
  '';

const getUserDistributorName = (item) =>
  item?.name_distributor || item?.distributor_name || item?.distributor?.name || item?.distributor?.name_distributor || '';

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== '');
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

const getUserDistributors = (item) => {
  const distributors =
    item?.distributors || item?.user_distributors || item?.userDistributors || item?.distributor_users || item?.distributorUsers || [];

  if (Array.isArray(distributors) && distributors.length) {
    return distributors.map((distributor) => {
      const source = distributor?.distributor || distributor;

      return {
        id: source?.id || distributor?.id_distributor || distributor?.distributor_id || distributor?.id || '',
        code:
          source?.code_customer ||
          source?.customer_code ||
          source?.distributor_code ||
          distributor?.code_customer ||
          distributor?.customer_code ||
          distributor?.distributor_code ||
          '',
        name:
          source?.name ||
          source?.name_distributor ||
          source?.distributor_name ||
          distributor?.name ||
          distributor?.name_distributor ||
          distributor?.distributor_name ||
          ''
      };
    });
  }

  const codes = normalizeArray(item?.code_customers || item?.code_customer || item?.customer_code || item?.distributor_code);
  const ids = normalizeArray(item?.id_distributors || item?.id_distributor || item?.distributor_id);
  const names = normalizeArray(item?.name_distributors || item?.name_distributor || item?.distributor_name);

  if (codes.length || ids.length || names.length) {
    const maxLength = Math.max(codes.length, ids.length, names.length);

    return Array.from({ length: maxLength }, (_, index) => ({
      id: ids[index] || '',
      code: codes[index] || '',
      name: names[index] || ''
    }));
  }

  const code = getUserDistributorCode(item);
  const name = getUserDistributorName(item);

  return code || name
    ? [
        {
          id: item?.id_distributor || item?.distributor_id || item?.distributor?.id || '',
          code,
          name
        }
      ]
    : [];
};

const formatDistributorCodes = (item) => {
  const distributors = getUserDistributors(item);

  return distributors
    .map((distributor) => distributor.code)
    .filter(Boolean)
    .join(', ');
};

const formatDistributorNames = (item) => {
  const distributors = getUserDistributors(item);

  return distributors
    .map((distributor) => distributor.name)
    .filter(Boolean)
    .join(', ');
};

export default function UserList() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [listRole, setListRole] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showView, setShowView] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [input, setInput] = useState(initialInput);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
    getListRole();
    getListDistributor();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keywords, selectedRole, selectedStatus]);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await UserServices.getAllUser();
    if (response.data.success) {
      setDataSource(response.data.data);
    } else {
      showAlert('Gagal ambil data user', 'danger');
    }
    setLoadingData(false);
  };

  const getListRole = async () => {
    const response = await RoleServices.fetchAllRoles();
    if (response.data.success) {
      setListRole(response.data.data);
    }
  };

  const getListDistributor = async () => {
    const response = await DistributorServices.getAllDistributor('');
    if (response.data.success) {
      const options = response.data.data.map((item) => ({
        value: item.code_customer,
        label: `${item.code_customer || '-'} - ${item.name || '-'}`,
        id: item.id,
        name: item.name
      }));

      setListDistributor(options);
    }
  };

  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      const keyword = keywords.toLowerCase();
      const matchKeyword =
        item.name?.toLowerCase().includes(keyword) ||
        item.username?.toLowerCase().includes(keyword) ||
        item.email?.toLowerCase().includes(keyword) ||
        item.role?.name?.toLowerCase().includes(keyword) ||
        formatDistributorCodes(item).toLowerCase().includes(keyword) ||
        formatDistributorNames(item).toLowerCase().includes(keyword);
      const matchStatus = selectedStatus ? String(item.is_active) === selectedStatus : true;
      const matchRole = selectedRole ? String(item.role?.id) === selectedRole || String(item.role_id) === selectedRole : true;

      return matchKeyword && matchStatus && matchRole;
    });
  }, [dataSource, keywords, selectedRole, selectedStatus]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.is_active).length,
      inactive: dataSource.filter((item) => !item.is_active).length,
      role: new Set(dataSource.map((item) => item.role?.name).filter(Boolean)).size
    }),
    [dataSource]
  );

  const hasActiveFilter = Boolean(keywords || selectedStatus || selectedRole);
  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
    setSelectedRole('');
  };

  const resetForm = () => {
    setInput(initialInput);
    setShowPassword(false);
    setShowMenu(false);
    setShowView(false);
    setSelectedUser(null);
    setSelectedUserId(null);
    setFormMode('create');
  };

  const handleSetState = (key, event) => {
    setInput({
      ...input,
      [key]: event.target.value
    });
  };

  const handleSelectDistributor = (options) => {
    const selectedOptions = options || [];
    const hasAllDistributor = selectedOptions.some((option) => option.value === ALL_DISTRIBUTORS_VALUE);

    setInput({
      ...input,
      distributorCodes: hasAllDistributor ? [ALL_DISTRIBUTORS_VALUE] : selectedOptions.map((option) => option.value),
      distributorIds: hasAllDistributor ? [ALL_DISTRIBUTORS_VALUE] : selectedOptions.map((option) => option.id)
    });
  };

  const distributorOptions = [allDistributorOption, ...listDistributor];
  const isAllDistributorSelected = input.distributorCodes.includes(ALL_DISTRIBUTORS_VALUE);
  const selectedDistributor = isAllDistributorSelected
    ? [allDistributorOption]
    : listDistributor.filter((item) => input.distributorCodes.includes(item.value));
  const getSelectedDistributorPayload = () => ({
    code_customer: isAllDistributorSelected ? listDistributor.map((item) => item.value) : input.distributorCodes,
    id_distributor: isAllDistributorSelected ? listDistributor.map((item) => item.id) : input.distributorIds
  });

  const openCreateModal = () => {
    setFormMode('create');
    setInput(initialInput);
    setShowPassword(false);
    setShowMenu(true);
  };

  const openEditModal = (item) => {
    const distributors = getUserDistributors(item);
    const distributorCodes = distributors.map((distributor) => distributor.code).filter(Boolean);
    const distributorIds = distributors.map((distributor) => distributor.id).filter(Boolean);
    const hasAllDistributors =
      listDistributor.length > 0 &&
      distributorCodes.length === listDistributor.length &&
      listDistributor.every((distributor) => distributorCodes.includes(distributor.value));

    setFormMode('edit');
    setSelectedUserId(item.id);
    setShowView(false);
    setInput({
      name: item.name || '',
      username: item.username || '',
      email: item.email || '',
      password: '',
      roleId: item.role?.id || item.role_id || '',
      distributorCodes: hasAllDistributors ? [ALL_DISTRIBUTORS_VALUE] : distributorCodes,
      distributorIds: hasAllDistributors ? [ALL_DISTRIBUTORS_VALUE] : distributorIds
    });
    setShowPassword(false);
    setShowMenu(true);
  };

  const openViewModal = (item) => {
    setSelectedUser(item);
    setShowView(true);
  };

  const handleCreate = async () => {
    setLoadingSubmit(true);
    const distributorPayload = getSelectedDistributorPayload();
    const payload = {
      name: input.name,
      username: input.username,
      email: input.email,
      password: input.password,
      role_id: input.roleId,
      code_customer: distributorPayload.code_customer,
      id_distributor: distributorPayload.id_distributor
    };

    const response = await UserServices.postCreateUser(payload);
    if (response.data.success) {
      showAlert('User berhasil ditambahkan', 'success');
      resetForm();
      fetchData();
    } else {
      showAlert(response.data.message || 'Gagal menambahkan user', 'danger');
    }
    setLoadingSubmit(false);
  };

  const handleEdit = async () => {
    setLoadingSubmit(true);
    const distributorPayload = getSelectedDistributorPayload();
    const payload = {
      name: input.name,
      username: input.username,
      email: input.email,
      role_id: input.roleId,
      code_customer: distributorPayload.code_customer,
      id_distributor: distributorPayload.id_distributor
    };

    if (input.password) {
      payload.password = input.password;
    }

    const response = await UserServices.putEditUser(selectedUserId, payload);
    if (response.data.success) {
      showAlert('User berhasil diubah', 'success');
      resetForm();
      fetchData();
    } else {
      showAlert(response.data.message || 'Gagal mengubah user', 'danger');
    }
    setLoadingSubmit(false);
  };

  const handleShowConfirm = (id) => {
    setSelectedUserId(id);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    const response = await UserServices.deleteUser(selectedUserId);
    if (response.data.success) {
      showAlert('User berhasil dihapus', 'success');
      setSelectedUserId(null);
      setShowConfirm(false);
      fetchData();
    } else {
      showAlert(response.data.message || 'Gagal menghapus user', 'danger');
    }
  };

  const formIsValid = Boolean(
    input.name && input.username && input.email && input.roleId && input.distributorCodes.length && (formMode === 'edit' || input.password)
  );

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Daftar User</h5>
              <span className="text-muted f-12">Kelola pengguna, role, dan status akun distributor channel.</span>
            </Stack>
          }
          secondary={
            <Button onClick={openCreateModal} variant="primary">
              <i className="ti ti-user-plus me-1" />
              Tambah User
            </Button>
          }
        >
          <Row className="g-3">
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total User</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-users" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Aktif</div>
                      <h4 className="mb-0">{summary.active}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-success text-success">
                      <i className="ti ti-circle-check" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Tidak Aktif</div>
                      <h4 className="mb-0">{summary.inactive}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-secondary text-secondary">
                      <i className="ti ti-circle-x" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Role Terpakai</div>
                      <h4 className="mb-0">{summary.role}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-warning text-warning">
                      <i className="ti ti-shield-lock" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </MainCard>

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={4} md={6}>
              <Form.Label className="f-12 text-muted">Cari User</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder="Nama, email, role, distributor"
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Role</Form.Label>
              <Form.Select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                <option value="">Semua Role</option>
                {listRole.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={2} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">Semua</option>
                <option value="true">Aktif</option>
                <option value="false">Tidak Aktif</option>
              </Form.Select>
            </Col>
            <Col lg={1} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh" />
              </Button>
            </Col>
            <Col lg={2} md={6} className="text-lg-end">
              <span className="text-muted f-12">Menampilkan</span>
              <div className="fw-semibold">
                {filteredData.length} dari {dataSource.length}
              </div>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive hover>
            {loadingData ? (
              <tbody>
                <tr>
                  <td colSpan={6}>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>User</th>
                    <th style={{ minWidth: 220 }}>Email</th>
                    <th style={{ minWidth: 220 }}>Distributor</th>
                    <th style={{ minWidth: 180 }}>Hak Akses</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th className="text-center" style={{ width: 140 }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Stack direction="horizontal" gap={2}>
                            <span className="sm-account-avatar">{item.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            <div>
                              <div className="fw-semibold">{item.name || '-'}</div>
                              <small className="text-muted">{item.username || '-'}</small>
                            </div>
                          </Stack>
                        </td>
                        <td>{item.email || '-'}</td>
                        <td>
                          <div className="fw-semibold">{formatDistributorCodes(item) || '-'}</div>
                          <small className="text-muted">{formatDistributorNames(item) || '-'}</small>
                        </td>
                        <td>
                          <Badge bg="light" text="dark">
                            {item.role?.name || '-'}
                          </Badge>
                        </td>
                        <td>{item.is_active ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}</td>
                        <td className="text-center">
                          <Stack direction="horizontal" gap={2} className="justify-content-center">
                            <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => openViewModal(item)}>
                              <i className="ti ti-eye" />
                            </Button>
                            <Button className="rounded-circle" variant="outline-secondary" size="sm" onClick={() => openEditModal(item)}>
                              <i className="ti ti-pencil" />
                            </Button>
                            <Button
                              className="rounded-circle"
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleShowConfirm(item.id)}
                            >
                              <i className="ti ti-trash" />
                            </Button>
                          </Stack>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-users f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'User tidak ditemukan' : 'Belum ada data user'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter ? 'Ubah filter untuk melihat user lain.' : 'Tambahkan user untuk memberi akses ke aplikasi.'}
                          </p>
                          {hasActiveFilter ? (
                            <Button variant="light-primary" onClick={resetFilters}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button variant="primary" onClick={openCreateModal}>
                              <i className="ti ti-user-plus me-1" />
                              Tambah User
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </Table>
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredData.length}
            itemLabel="user"
          />
        </MainCard>
      </Stack>

      <Modal show={showMenu} onHide={resetForm} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{formMode === 'edit' ? 'Edit User' : 'Tambah User'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col lg={4}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <div className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ti ti-user-plus f-24" />
                  </div>
                  <h6 className="mb-1">{formMode === 'edit' ? 'Perbarui Akun' : 'Akun Baru'}</h6>
                  <p className="text-muted mb-0">Lengkapi identitas pengguna, role, dan kode distributor yang terhubung.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={8}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="f-12 text-muted">Nama</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nama lengkap"
                    value={input.name}
                    onChange={(event) => handleSetState('name', event)}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="f-12 text-muted">Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Username login"
                    value={input.username}
                    onChange={(event) => handleSetState('username', event)}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="f-12 text-muted">Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="nama@email.com"
                    value={input.email}
                    onChange={(event) => handleSetState('email', event)}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="f-12 text-muted">Hak Akses</Form.Label>
                  <Form.Select value={input.roleId} onChange={(event) => handleSetState('roleId', event)}>
                    <option value="">Pilih Hak Akses</option>
                    {listRole.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                {/* {input.roleId == 1 ? ( */}
                <Col md={12}>
                  <Form.Label className="f-12 text-muted">Distributor</Form.Label>
                  <Select
                    value={selectedDistributor}
                    options={distributorOptions}
                    menuPosition="fixed"
                    onChange={handleSelectDistributor}
                    placeholder="Pilih distributor"
                    isClearable
                    isMulti
                    closeMenuOnSelect={false}
                  />
                </Col>
                {/* ) : null} */}
                <Col md={12}>
                  <Form.Label className="f-12 text-muted">{formMode === 'edit' ? 'Password Baru' : 'Password'}</Form.Label>
                  <InputGroup className="sm-input-group">
                    <InputGroup.Text>
                      <i className="ti ti-lock" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder={formMode === 'edit' ? 'Kosongkan jika tidak diubah' : 'Password awal'}
                      value={input.password}
                      onChange={(event) => handleSetState('password', event)}
                    />
                    <Button type="button" variant="light" className="sm-password-toggle" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                    </Button>
                  </InputGroup>
                </Col>
              </Row>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={resetForm}>
            Batal
          </Button>
          <Button variant="primary" onClick={formMode === 'edit' ? handleEdit : handleCreate} disabled={loadingSubmit || !formIsValid}>
            {loadingSubmit ? <LoaderButton /> : 'Simpan'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showView} onHide={resetForm} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row className="g-3">
              <Col lg={4}>
                <Card className="border mb-0 h-100">
                  <Card.Body>
                    <span className="sm-account-avatar sm-account-avatar-lg mb-3">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <h6 className="mb-1">{selectedUser.name || '-'}</h6>
                    <p className="text-muted mb-0">{selectedUser.email || '-'}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={8}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Username</Form.Label>
                    <div className="fw-semibold">{selectedUser.username || '-'}</div>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Hak Akses</Form.Label>
                    <div>{selectedUser.role?.name || '-'}</div>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Distributor Code</Form.Label>
                    <div className="fw-semibold">{formatDistributorCodes(selectedUser) || '-'}</div>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Nama Distributor</Form.Label>
                    <div>{formatDistributorNames(selectedUser) || '-'}</div>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Status</Form.Label>
                    <div>{selectedUser.is_active ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}</div>
                  </Col>
                </Row>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={resetForm}>
            Tutup
          </Button>
          {selectedUser && (
            <Button variant="primary" onClick={() => openEditModal(selectedUser)}>
              <i className="ti ti-pencil me-1" />
              Edit User
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onSubmit={handleDelete}
        title="Hapus User"
        subTitle="Anda yakin ingin menghapus data user ini?"
      />
    </>
  );
}
