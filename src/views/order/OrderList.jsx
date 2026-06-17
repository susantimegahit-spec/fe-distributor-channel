import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import OrderServices from '../../services/OrderServices';
import LoaderData from '../../components/LoaderData';
import { currency } from '../../utils/global';
import { getCookies } from '../../utils/cookies';

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'WAITING_APPROVAL', label: 'Waiting Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' }
];

const statusVariant = {
  DRAFT: 'secondary',
  WAITING_APPROVAL: 'warning',
  DELIVERY: 'info',
  APPROVED: 'primary',
  ARRIVED: 'success',
  REJECTED: 'orange',
  FAILED: 'danger'
};

const statusLabel = {
  DRAFT: 'secondary',
  WAITING_APPROVAL: 'warning',
  DELIVERY: 'info',
  APPROVED: 'primary',
  ARRIVED: 'success',
  REJECTED: 'orange',
  FAILED: 'danger'
};

const initialOrders = [];
const pageSize = 10;

export default function OrderList() {
  const roleId = getCookies('role');
  const [orders, setOrders] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [distributor, setDistributor] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, distributor, keywords, status]);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keywords.trim().toLowerCase();

    return orders.filter((order) => {
      console.log('order => ', order);
      const matchesKeyword = !normalizedKeyword || order.order_no?.toLowerCase().includes(normalizedKeyword);
      // ||order.distributor?.toLowerCase().includes(normalizedKeyword);
      const matchesDistributor = !distributor || order.distributorId === distributor;
      const matchesStatus = !status || order.status === status;
      const matchesDate = !date || order.date === date;

      return matchesKeyword && matchesDistributor && matchesStatus && matchesDate;
    });
  }, [date, distributor, keywords, orders, status]);

  const summary = useMemo(
    () => ({
      total: orders.length,
      DRAFT: orders.filter((order) => order.status === 'DRAFT').length,
      APPROVED: orders.filter((order) => order.status === 'APPROVED').length,
      WAITING_APPROVAL: orders.filter((order) => order.status === 'WAITING_APPROVAL').length,
      REJECTED: orders.filter((order) => order.status === 'REJECTED').length,
      FAILED: orders.filter((order) => order.status === 'FAILED').length,
      // waiti: orders.filter((order) => order.status === 'rejected').length
    }),
    [orders]
  );

  const hasActiveFilter = Boolean(keywords || distributor || status || date);
  const pageCount = Math.max(Math.ceil(filteredOrders.length / pageSize), 1);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredOrders]);

  const resetFilters = () => {
    setKeywords('');
    setDistributor('');
    setStatus('');
    setDate('');
  };

  const fetchData = async () => {
    setIsLoading(true);
    const resp = await OrderServices.getListOrder();

    if (resp.data.success) {
      setIsLoading(false);
      setOrders(resp.data.data);
    }
  };

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Daftar Order</h5>
            <span className="text-muted f-12">Monitor order distributor dan lanjutkan proses penjualan dari satu halaman.</span>
          </Stack>
        }
        secondary={
          <Button variant="primary" as={Link} to={`/order/order-create`}>
            <i className="ti ti-plus me-1" />
            Tambah Order
          </Button>
        }
      >
        <Row className="g-3">
          <Col sm={6} xl={2}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Total Order</div>
                    <h4 className="mb-0">{summary.total}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-primary text-primary">
                    <i className="ti ti-shopping-cart" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={2}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Draft</div>
                    <h4 className="mb-0">{summary.DRAFT}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-secondary text-secondary">
                    <i className="ti ti-clipboard-list" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={2}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Waiting</div>
                    <h4 className="mb-0">{summary.WAITING_APPROVAL}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-warning text-warning">
                    <i className="ti ti-clock-hour-4" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={2}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Approved</div>
                    <h4 className="mb-0">{summary.APPROVED}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-primary text-primary">
                    <i className="ti ti-user-check" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={2}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Rejected</div>
                    <h4 className="mb-0">{summary.REJECTED}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-orange text-orange">
                    <i className="ti ti-user-cancel" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} xl={2}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Failed</div>
                    <h4 className="mb-0">{summary.FAILED}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-danger text-danger">
                    <i className="ti ti-forbid" />
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
            <Form.Label className="f-12 text-muted">Cari Order</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <i className="ti ti-search" />
              </InputGroup.Text>
              <Form.Control value={keywords} onChange={(event) => setKeywords(event.target.value)} type="text" placeholder="No. PO" />
            </InputGroup>
          </Col>
          {/* <Col lg={3} md={6}>
            <Form.Label className="f-12 text-muted">Distributor</Form.Label>
            <Form.Select value={distributor} onChange={(event) => setDistributor(event.target.value)}>
              <option value="">Semua Distributor</option>
              <option value="1">Distributor A</option>
              <option value="2">Distributor B</option>
            </Form.Select>
          </Col> */}
          <Col lg={2} md={6}>
            <Form.Label className="f-12 text-muted">Status</Form.Label>
            <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col lg={2} md={6}>
            <Form.Label className="f-12 text-muted">Tanggal</Form.Label>
            <Form.Control value={date} onChange={(event) => setDate(event.target.value)} type="date" />
          </Col>
          <Col lg={1} md={12} className="text-lg-end">
            <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
              <i className="ti ti-refresh" />
            </Button>
          </Col>
        </Row>

        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>No. PO</th>
              <th>Depo</th>
              <th>Tanggal</th>
              <th>Total Item</th>
              <th>Total Order</th>
              <th>Status</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          {isLoading ? (
            <tbody>
              <tr>
                <td colSpan={6}>
                  <LoaderData />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="fw-semibold">{order.order_no}</td>
                    <td>{order.customer_name}</td>
                    <td>{moment(order.doc_date).format('DD MMM YYYY')}</td>
                    <td>{order?.details?.length}</td>
                    <td>{currency(order?.doc_total)}</td>
                    <td>
                      <Badge bg={statusVariant[order.status] || 'secondary'}>{order.status}</Badge>
                    </td>
                    <td className="text-center">
                      <Button className="rounded-circle" variant="outline-primary" size="sm">
                        <i className="ti ti-eye" />
                      </Button>
                      &nbsp;
                      {roleId === 1 && order.status === 'DRAFT' ? (
                        <Button
                          as={Link}
                          to={`/order/order-create/${order.id}`}
                          className="rounded-circle"
                          variant="outline-success"
                          size="sm"
                        >
                          <i className="ti ti-pencil" />
                        </Button>
                      ) : roleId !== 1 && order.status !== 'APPROVED' ? (
                        <Button
                          as={Link}
                          to={`/order/order-create/${order.id}`}
                          className="rounded-circle"
                          variant="outline-success"
                          size="sm"
                        >
                          <i className="ti ti-pencil" />
                        </Button>
                      ) : null}
                      &nbsp;
                      <Button className="rounded-circle" variant="outline-danger" size="sm">
                        <i className="ti ti-trash" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-5">
                      <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                        <i className="ti ti-clipboard-list f-24" />
                      </div>
                      <h5 className="mb-1">{hasActiveFilter ? 'Order tidak ditemukan' : 'Belum ada order'}</h5>
                      <p className="text-muted mb-3">
                        {hasActiveFilter
                          ? 'Ubah filter atau reset pencarian untuk melihat data lain.'
                          : 'Mulai buat order baru untuk menambahkan transaksi distributor.'}
                      </p>
                      {hasActiveFilter ? (
                        <Button variant="light-primary" onClick={resetFilters}>
                          Reset Filter
                        </Button>
                      ) : (
                        <Button variant="primary" as={Link} to={`/order/order-create`}>
                          <i className="ti ti-plus me-1" />
                          Tambah Order
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </Table>

        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={filteredOrders.length}
          itemLabel="order"
        />
      </MainCard>
    </Stack>
  );
}
