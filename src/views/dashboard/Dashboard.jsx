import { Link } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';

const summaryItems = [
  {
    title: 'Distributor',
    description: 'Kelola data pelanggan distributor, status aktif, depo, dan detail alamat.',
    icon: 'ti ti-building-store',
    color: 'primary',
    url: '/master/distributor'
  },
  {
    title: 'Item',
    description: 'Pantau daftar item produk dan sinkronkan data produk terbaru dari pusat.',
    icon: 'ti ti-clipboard-list',
    color: 'success',
    url: '/master/product'
  },
  {
    title: 'Sales',
    description: 'Lihat dan sinkronkan data sales yang menangani aktivitas distributor.',
    icon: 'ti ti-users',
    color: 'info',
    url: '/master/employee'
  },
  {
    title: 'Warehouse',
    description: 'Kelola daftar warehouse sebagai referensi operasional distribusi.',
    icon: 'ti ti-building-warehouse',
    color: 'warning',
    url: '/master/warehouse'
  }
];

const quickActions = [
  {
    title: 'Daftar Pesanan',
    description: 'Buka daftar pesanan untuk memantau transaksi yang masuk.',
    icon: 'ph ph-list-bullets',
    url: '/order/order-list'
  },
  {
    title: 'Sinkronisasi Master',
    description: 'Masuk ke halaman master untuk memperbarui data referensi.',
    icon: 'ti ti-refresh',
    url: '/master/distributor'
  },
  {
    title: 'Cek Data Item',
    description: 'Pastikan item produk yang dipakai di pesanan sudah tersedia.',
    icon: 'ti ti-package',
    url: '/master/product'
  }
];

export default function Dashboard() {
  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Dashboard</h5>
            <span className="text-muted f-12">Ringkasan akses fitur utama distributor channel.</span>
          </Stack>
        }
        secondary={
          <Button as={Link} to="/order/order-list" variant="primary">
            <i className="ph ph-list-bullets me-1" />
            Lihat Pesanan
          </Button>
        }
      >
        <Row className="g-3">
          {summaryItems.map((item) => (
            <Col sm={6} xl={3} key={item.title}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack gap={3} className="h-100">
                    <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
                      <span className={`avtar avtar-s bg-light-${item.color} text-${item.color}`}>
                        <i className={item.icon} />
                      </span>
                      <Button as={Link} to={item.url} variant="light-secondary" size="sm" className="rounded-circle">
                        <i className="ti ti-arrow-up-right" />
                      </Button>
                    </Stack>
                    <div>
                      <h6 className="mb-1">{item.title}</h6>
                      <p className="text-muted f-12 mb-0">{item.description}</p>
                    </div>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </MainCard>

      <Row className="g-3">
        <Col xl={8}>
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Alur Kerja Cepat</h5>
                <span className="text-muted f-12">Mulai dari data master, lalu lanjut ke pesanan.</span>
              </Stack>
            }
          >
            <Row className="g-3">
              {quickActions.map((item) => (
                <Col md={4} key={item.title}>
                  <Card className="border mb-0 h-100">
                    <Card.Body>
                      <Stack gap={3} className="h-100">
                        <span className="avtar avtar-s bg-light-primary text-primary">
                          <i className={item.icon} />
                        </span>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{item.title}</h6>
                          <p className="text-muted f-12 mb-0">{item.description}</p>
                        </div>
                        <Button as={Link} to={item.url} variant="outline-primary" size="sm">
                          Buka
                        </Button>
                      </Stack>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </MainCard>
        </Col>
        <Col xl={4}>
          <MainCard title="Menu Tersedia">
            <Stack gap={2}>
              <Button as={Link} to="/master/distributor" variant="light-secondary" className="justify-content-start">
                <i className="ti ti-building-store me-2" />
                Daftar Distributor
              </Button>
              <Button as={Link} to="/master/product" variant="light-secondary" className="justify-content-start">
                <i className="ti ti-clipboard-list me-2" />
                Daftar Item
              </Button>
              <Button as={Link} to="/master/employee" variant="light-secondary" className="justify-content-start">
                <i className="ti ti-users me-2" />
                Daftar Sales
              </Button>
              <Button as={Link} to="/master/warehouse" variant="light-secondary" className="justify-content-start">
                <i className="ti ti-building-warehouse me-2" />
                Daftar Warehouse
              </Button>
              <Button as={Link} to="/order/order-list" variant="light-secondary" className="justify-content-start">
                <i className="ph ph-list-bullets me-2" />
                Daftar Pesanan
              </Button>
            </Stack>
          </MainCard>
        </Col>
      </Row>
    </Stack>
  );
}
