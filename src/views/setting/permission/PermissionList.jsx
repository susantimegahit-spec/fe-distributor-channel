import { useEffect, useMemo, useState } from 'react';
import CheckboxTree from 'react-checkbox-tree';
import Cookies from 'js-cookie';
import 'react-checkbox-tree/lib/react-checkbox-tree.css';

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

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LoaderButton from '../../../components/LoaderButton';
import LoaderData from '../../../components/LoaderData';
import listMenu from '../../../menu-items/list-menu';
import RoleServices from '../../../services/RoleServices';
import { useAlert } from '../../../utils/alertContext';

const defaultExpanded = ['dashboard', 'masterData', 'order', 'finance'];
const pageSize = 10;

const getMasterApprovalId = (item) =>
  item?.master_approval_id || item?.masterApprovalId || item?.master_approval?.id || item?.masterApproval?.id || '';

const getMasterApprovalName = (item) =>
  item?.master_approval_name ||
  item?.masterApprovalName ||
  item?.master_approval?.name ||
  item?.masterApproval?.name ||
  item?.name_master_approval ||
  '';

const countMenuNodes = (menus) =>
  menus.reduce((total, item) => {
    const children = item.children?.length ? countMenuNodes(item.children) : 0;

    return total + 1 + children;
  }, 0);

export default function PermissionList() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [listMasterApproval, setListMasterApproval] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [roleId, setRoleId] = useState(null);
  const [checked, setChecked] = useState([]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [menuName, setMenuName] = useState('');
  const [masterApprovalId, setMasterApprovalId] = useState('');
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
    fetchMasterApproval();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keywords, selectedStatus]);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await RoleServices.fetchAllRoles();
    if (response.data.success) {
      setDataSource(response.data.data);
    } else {
      showAlert('Gagal ambil data role', 'danger');
    }
    setLoadingData(false);
  };

  const fetchMasterApproval = async () => {
    const response = await RoleServices.getMasterApproval();
    if (response.data.success) {
      setListMasterApproval(response.data.data || []);
    } else {
      showAlert('Gagal ambil data master approval', 'danger');
    }
  };

  const fetchRoleDetail = async (id) => {
    setLoadingSubmit(true);
    const response = await RoleServices.fetchRole(id);
    if (response.data.success) {
      setMenuName(response.data.data?.name || '');
      setMasterApprovalId(getMasterApprovalId(response.data.data));
      setChecked(response.data.data?.role_menu?.menu || []);
      setExpanded(defaultExpanded);
      setShowMenu(true);
    } else {
      showAlert('Gagal ambil detail role', 'danger');
    }
    setLoadingSubmit(false);
  };

  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      const matchKeyword = item.name?.toLowerCase().includes(keywords.toLowerCase());
      const matchStatus = selectedStatus ? String(item.is_active) === selectedStatus : true;

      return matchKeyword && matchStatus;
    });
  }, [dataSource, keywords, selectedStatus]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.is_active).length,
      inactive: dataSource.filter((item) => !item.is_active).length,
      menu: countMenuNodes(listMenu)
    }),
    [dataSource]
  );

  const hasActiveFilter = Boolean(keywords || selectedStatus);
  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const resetForm = () => {
    setRoleId(null);
    setMenuName('');
    setMasterApprovalId('');
    setChecked([]);
    setExpanded(defaultExpanded);
    setShowMenu(false);
  };

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
  };

  const showAddMenu = () => {
    setRoleId(null);
    setMenuName('');
    setMasterApprovalId('');
    setChecked([]);
    setExpanded(defaultExpanded);
    setShowMenu(true);
  };

  const showEditMenu = (id) => {
    setRoleId(id);
    fetchRoleDetail(id);
  };

  const handleCreate = async () => {
    setLoadingSubmit(true);
    const payload = {
      name: menuName,
      is_active: true,
      master_approval_id: masterApprovalId,
      menu: checked
    };

    const response = await RoleServices.postCreateRole(payload);
    if (response.data.success) {
      showAlert('Data berhasil disimpan', 'success');
      resetForm();
      fetchData();
    } else {
      showAlert(response.data.message || 'Gagal menyimpan role', 'danger');
    }
    setLoadingSubmit(false);
  };

  const handleEdit = async () => {
    setLoadingSubmit(true);
    const payload = {
      name: menuName,
      is_active: true,
      master_approval_id: masterApprovalId,
      menu: checked
    };

    const response = await RoleServices.putEditRole(roleId, payload);
    if (response.data.success) {
      showAlert('Data berhasil diubah', 'success');
      Cookies.set('menu', JSON.stringify(checked));
      resetForm();
      window.location.replace('/');
    } else {
      showAlert(response.data.message || 'Gagal mengubah role', 'danger');
    }
    setLoadingSubmit(false);
  };

  const handleShowConfirm = (id) => {
    setShowConfirm(true);
    setRoleId(id);
  };

  const handleDelete = async () => {
    const response = await RoleServices.deleteRole(roleId);
    if (response.data.success) {
      showAlert('Data berhasil dihapus', 'success');
      setShowConfirm(false);
      setRoleId(null);
      fetchData();
    } else {
      showAlert(response.data.message || 'Gagal menghapus role', 'danger');
    }
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Role Permission</h5>
              <span className="text-muted f-12">Kelola role dan akses menu yang tersedia untuk setiap pengguna.</span>
            </Stack>
          }
          secondary={
            <Button onClick={showAddMenu} variant="primary">
              <i className="ti ti-plus me-1" />
              Tambah Role
            </Button>
          }
        >
          <Row className="g-3">
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Role</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-shield-lock" />
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
                      <div className="text-muted f-12">Menu Tersedia</div>
                      <h4 className="mb-0">{summary.menu}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-warning text-warning">
                      <i className="ti ti-layout-list" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </MainCard>

        <MainCard>
          <Row className="g-2 align-items-end mb-3">
            <Col lg={5} md={6}>
              <Form.Label className="f-12 text-muted">Cari Role</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Nama role" />
              </InputGroup>
            </Col>
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Tidak Aktif</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh me-1" />
                Reset
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
                  <td colSpan={5}>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Nama Role</th>
                    <th style={{ minWidth: 180 }}>Master Approval</th>
                    <th style={{ minWidth: 140 }}>Menu Akses</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th className="text-center" style={{ width: 120 }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">{item.name || '-'}</div>
                          <small className="text-muted">Role ID: {item.id}</small>
                        </td>
                        <td>{getMasterApprovalName(item) || '-'}</td>
                        <td>
                          <Badge bg="light" text="dark">
                            {item.role_menu?.menu?.length || 0} menu
                          </Badge>
                        </td>
                        <td>{item.is_active ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Tidak Aktif</Badge>}</td>
                        <td className="text-center">
                          <Stack direction="horizontal" gap={2} className="justify-content-center">
                            <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => showEditMenu(item.id)}>
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
                      <td colSpan={5}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-shield-lock f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'Role tidak ditemukan' : 'Belum ada data role'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter
                              ? 'Ubah kata kunci atau status untuk melihat role lain.'
                              : 'Tambahkan role untuk mulai mengatur hak akses.'}
                          </p>
                          {hasActiveFilter ? (
                            <Button variant="light-primary" onClick={resetFilters}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button variant="primary" onClick={showAddMenu}>
                              <i className="ti ti-plus me-1" />
                              Tambah Role
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
            itemLabel="role"
          />
        </MainCard>
      </Stack>

      <Modal show={showMenu} onHide={resetForm} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{roleId ? 'Edit Role Permission' : 'Tambah Role Permission'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col lg={4}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Stack gap={3}>
                    <div>
                      <Form.Label className="f-12 text-muted">Nama Role</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Contoh: Admin Sales"
                        name="roleName"
                        value={menuName}
                        onChange={(event) => setMenuName(event.target.value)}
                      />
                    </div>
                    <div>
                      <Form.Label className="f-12 text-muted">Master Approval</Form.Label>
                      <Form.Select value={masterApprovalId} onChange={(event) => setMasterApprovalId(event.target.value)}>
                        <option value="">Pilih Master Approval</option>
                        {listMasterApproval.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name || item.approval_name || item.title || `Master Approval ${item.id}`}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                    {/* <div className="border rounded p-3 bg-light">
                      <div className="text-muted f-12">Menu Dipilih</div>
                      <h4 className="mb-0">{checked.length}</h4>
                    </div>
                    <small className="text-muted">
                      Pilih menu yang boleh diakses oleh role ini. Perubahan role aktif akan diterapkan setelah disimpan.
                    </small> */}
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={8}>
              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <Stack direction="horizontal" gap={2} className="justify-content-between">
                    <div>
                      <h6 className="mb-0">Daftar Menu</h6>
                      <small className="text-muted">Centang menu untuk memberi akses.</small>
                    </div>
                    <Badge bg="light" text="dark">
                      {summary.menu} menu
                    </Badge>
                  </Stack>
                </Card.Header>
                <Card.Body style={{ maxHeight: 420, overflow: 'auto' }}>
                  <CheckboxTree
                    nodes={listMenu}
                    checked={checked}
                    expanded={expanded}
                    onCheck={(value) => setChecked(value)}
                    onExpand={(value) => setExpanded(value)}
                    showNodeIcon={false}
                    iconsClass="fa4"
                    showExpandAll
                    icons={{
                      check: <span className="ti ti-square-check-filled text-primary" />,
                      uncheck: <span className="ti ti-crop-1-1" />,
                      halfCheck: <span className="ti ti-crop-16-9-filled text-primary" />,
                      expandClose: <span className="ti ti-chevron-up" />,
                      expandOpen: <span className="ti ti-chevron-down" />,
                      expandAll: <span className="ti ti-chevrons-down" />,
                      collapseAll: <span className="ti ti-chevrons-up" />,
                      parentClose: <span className="ti ti-folder" />,
                      parentOpen: <span className="ti ti-folder-open" />,
                      leaf: <span className="ti ti-point" />
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={resetForm}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => (roleId ? handleEdit() : handleCreate())}
            disabled={loadingSubmit || !menuName || !masterApprovalId}
          >
            {loadingSubmit ? <LoaderButton /> : 'Simpan'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onSubmit={handleDelete}
        title="Hapus Role"
        subTitle="Anda yakin ingin menghapus data ini?"
      />
    </>
  );
}
