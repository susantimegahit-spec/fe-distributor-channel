import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { Button, Container, Form, Modal, Pagination, Table } from 'react-bootstrap';

export default function RewardAdd() {
  const [showModal, setShowModal] = useState(false);
  const [orderId, setOrderId] = useState(null);
  useEffect(() => {}, []);

  return (
    <MainCard title="Redeem Reward">
      <Container>
        <Row>
          <Col className="text-end">
            <Button variant="primary">
              Save
            </Button>
          </Col>
        </Row>
      </Container>
    </MainCard>
  );
}
