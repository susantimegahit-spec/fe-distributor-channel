import { useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { useAlert } from '../../utils/alertContext';
import { Badge, Button, Form, Table } from 'react-bootstrap';
import LoaderData from '../../components/LoaderData';
import DistributorServices from '../../services/DistributorServices';

export default function MasterItem() {
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [keywords, setKeywords] = useState('');

  useEffect(() => {
    if (keywords) {
      const delayTimer = setTimeout(() => {
        fetchData()
      }, 1000); // 500ms delay

      // Cleanup: clears old timer if user types again within 500ms
      return () => clearTimeout(delayTimer);
    } else {
      fetchData()
    }
  }, [keywords]);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await DistributorServices.getAllDistributor(keywords);
    if (response.data.success) {
      setDataSource(response.data.data);
      setLoadingData(false);
    } else {
      setLoadingData(false);
      showAlert('Failed to fetch data', 'danger');
    }
  };

  const syncData = async () => {
    setLoadingData(true);
    const response = await DistributorServices.syncDistributor();
    if (response.data.success) {
      fetchData();
    } else {
      showAlert(response.data.message, 'danger');
      fetchData();
    }
  };

  return (
    <MainCard title="Distributor Data">
      <Row style={{ marginBottom: 10 }}>
        <Col sm={6} md={6} lg={4} className="text-start">
          <Form.Control value={keywords} onChange={(e) => setKeywords(e.target.value)} type="text" placeholder="Search..." />
        </Col>
        <Col sm={6} md={6} lg={8} className="text-end">
          <Button onClick={() => syncData()} variant="success">
            Synchronize
          </Button>
        </Col>
      </Row>
      <Row>
        <Col sm={12} md={6} lg={12}>
          <Table className="mb-0" responsive bordered>
            {loadingData ? (
              <LoaderData />
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>No. Telpon</th>
                    <th>Depo</th>
                    <th className="w-25">Address</th>
                    <th>Status</th>
                    <th className="text-center">#</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSource.map((item, index) => (
                    <tr key={index}>
                      <td>{item.code_customer}</td>
                      <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.name}</td>
                      <td>{item.phone}</td>
                      <td>{item.depo}</td>
                      <td className="w-25" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {item.address}
                      </td>
                      <td>{item.status === 1 ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                      <td className="text-center">
                        <Button className="rounded-circle" variant="outline-primary" size="sm" onClick={() => showEditMenu(item.id)}>
                          <i className="ti ti-eye" cursor="pointer" />
                        </Button>
                        {/* &nbsp;&nbsp;&nbsp;
                        <Button className="rounded-circle" variant="outline-danger" size="sm" onClick={() => handleShowConfirm(item.id)}>
                          <i className="ti ti-trash" cursor="pointer" />
                        </Button> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </Table>
        </Col>
      </Row>
    </MainCard>
  );
}
