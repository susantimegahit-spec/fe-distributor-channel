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
import Pagination from 'react-bootstrap/Pagination';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import OrderServices from '../../services/OrderServices';
import LoaderData from '../../components/LoaderData';
import { currency } from '../../utils/global';

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Diajukan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' }
];

const statusVariant = {
  draft: 'secondary',
  submitted: 'warning',
  approved: 'success',
  rejected: 'danger'
};

const statusLabel = {
  draft: 'Draft',
  submitted: 'Diajukan',
  approved: 'Disetujui',
  rejected: 'Ditolak'
};

const initialOrders = [];

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [distributor, setDistributor] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
      submitted: orders.filter((order) => order.status === 'submitted').length,
      approved: orders.filter((order) => order.status === 'approved').length,
      rejected: orders.filter((order) => order.status === 'rejected').length
    }),
    [orders]
  );

  const hasActiveFilter = Boolean(keywords || distributor || status || date);

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
          <Button variant="primary" href="/order/order-create">
            <i className="ti ti-plus me-1" />
            Tambah Order
          </Button>
        }
      >
        <Row className="g-3">
          <Col sm={6} xl={3}>
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
          <Col sm={6} xl={3}>
            <Card className="border mb-0 h-100">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Diajukan</div>
                    <h4 className="mb-0">{summary.submitted}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-warning text-warning">
                    <i className="ti ti-clock-hour-4" />
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
                    <div className="text-muted f-12">Disetujui</div>
                    <h4 className="mb-0">{summary.approved}</h4>
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
                    <div className="text-muted f-12">Ditolak</div>
                    <h4 className="mb-0">{summary.rejected}</h4>
                  </div>
                  <span className="avtar avtar-s bg-light-danger text-danger">
                    <i className="ti ti-circle-x" />
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
              <Form.Control
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                type="text"
                placeholder="No. invoice"
              />
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
              <th>No. Invoice</th>
              <th>Nama Distributor</th>
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
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="fw-semibold">{order.order_no}</td>
                    <td>{order.customer_name}</td>
                    <td>{moment(order.doc_date).format('DD MMM YYYY')}</td>
                    <td>{order?.details?.length}</td>
                    <td>{currency(order?.doc_total)}</td>
                    <td>
                      <Badge bg={statusVariant[order.status] || 'secondary'}>{statusLabel[order.status] || order.status}</Badge>
                    </td>
                    <td className="text-center">
                      <Button className="rounded-circle" variant="outline-primary" size="sm">
                        <i className="ti ti-eye" />
                      </Button>
                      &nbsp;
                      <Button as={Link} to={`/order/order-create/${order.id}`} className="rounded-circle" variant="outline-success" size="sm">
                        <i className="ti ti-pencil" />
                      </Button>
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
                        <Button variant="primary" href="/order/order-create">
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

        <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-between mt-3">
          <small className="text-muted">
            Menampilkan {filteredOrders.length} dari {orders.length} order
          </small>
          <Pagination className="mb-0">
            <Pagination.Prev disabled />
            <Pagination.Item active>{1}</Pagination.Item>
            <Pagination.Next disabled />
          </Pagination>
        </Stack>
      </MainCard>
    </Stack>
  );
}
