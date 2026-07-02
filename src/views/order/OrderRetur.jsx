import { useEffect } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { Button, Container, Form, Table } from 'react-bootstrap';

export default function OrderRetur() {
  useEffect(() => {}, []);

  return (
    <MainCard title="Return List">
      <Container>
        <Row>
          {/* <Col xs={6} md={2}>
          <Form.Control type="text" placeholder="Search..." />
        </Col> */}
          <Col xs={6} md={4}>
            <Form.Select aria-label="Default select example">
              <option>Select Distributor</option>
              <option value={1}>Distributor A</option>
              <option value={2}>Distributor B</option>
            </Form.Select>
          </Col>{' '}
          <Col xs={6} md={8} className="text-end">
            <Button variant="success">Add Order</Button>
          </Col>
        </Row>
        <br />
        <Row>
          <Col>
            <Table className="mb-0" bordered>
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Distributor Name</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-center">#</th>
                </tr>
              </thead>
              <tbody></tbody>
            </Table>
          </Col>
        </Row>
      </Container>
    </MainCard>
  );
}
