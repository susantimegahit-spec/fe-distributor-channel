import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { Badge, Button, Container, Form, Modal, Pagination, Table } from 'react-bootstrap';

export default function RewardList() {
  const [showModal, setShowModal] = useState(false);
  const [orderId, setOrderId] = useState(null);
  useEffect(() => {}, []);

  return (
    <MainCard title="Reward">
      <Container>
        <Row>
          {/* <Col xs={6} md={2}>
          <Form.Control type="text" placeholder="Cari..." />
        </Col> */}
          <Col xs={6} md={4}>
            <h4>Total: Rp. 200.000.000</h4>
          </Col>
          <Col xs={6} md={8} className="text-end">
            <Button href='/finance/reward/add' variant="success">Redeem</Button>
          </Col>
        </Row>
        <br />
        <Row>
          <Col>
            <Table className="mb-0" bordered>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th className="text-center">#</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Reward periode mei</th>
                  <th>01 Mei 2026 - 31 Mei 2026</th>
                  <th>Rp. 100.000.000</th>
                  <th><Badge bg='secondary'>Belum Klaim</Badge></th>
                  <th className="text-center">
                    <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => showEditMenu(item.id)}>
                      <i className="ti ti-list-search" />
                    </Button>
                  </th>
                </tr>
                <tr>
                  <th>Reward periode April</th>
                  <th>01 Mei 2026 - 31 Mei 2026</th>
                  <th>Rp. 100.000.000</th>
                  <th><Badge bg='secondary'>Belum Klaim</Badge></th>
                  <th className="text-center">
                    {' '}
                    <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => showEditMenu(item.id)}>
                      <i className="ti ti-list-search" />
                    </Button>
                  </th>
                </tr>
              </tbody>
            </Table>
            <br />
          </Col>
        </Row>
      </Container>
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Redeem</Modal.Title>
        </Modal.Header>
        <Modal.Body></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Batal
          </Button>
          {/* <Button variant="primary" onClick={() => (userId ? handleEdit() : handleCreate())} disabled={loadingSubmit}> */}
          <Button variant="primary">
            Simpan
            {/* {loadingSubmit ? <LoaderButton /> : 'Simpan'} */}
          </Button>
        </Modal.Footer>
      </Modal>{' '}
    </MainCard>
  );
}
