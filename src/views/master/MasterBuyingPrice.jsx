import { useEffect } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';

export default function MasterBuyingPrice() {
  useEffect(() => {
    console.log('Buying Price component mounted');
  }, []);

  return (
    <MainCard title="Master Harga Beli">
      {/* <h5>List Daftar Buying Price</h5> */}
    </MainCard>
  );
}
