import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import { getItem } from '../../../../redux/production/materialReducer';
import MaterialServices from '../../../../services/production/MaterialServices';
import { useAlert } from '../../../../utils/alertContext';

const pageSize = 10;

const normalizeMaterial = (item = {}, index = 0) => ({
  id: item.id || item.item_id || item.material_id || item.item_code || item.material_code || item.code || index,
  code: item.item_code || item.material_code || item.code || item.ItemCode || '',
  name: item.item_name || item.material_name || item.name || item.ItemName || '',
  uom: item.invntry_uom || item.inventory_uom || item.uom || item.unit || item.unit_msr || '',
  status: item.status ?? item.is_active ?? item.active
});

const getStatus = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const status = String(value).trim().toLowerCase();
  const active = ['1', 'true', 'active', 'aktif', 'enabled'].includes(status);

  return {
    label: active ? 'Active' : 'Inactive',
    variant: active ? 'success' : 'secondary'
  };
};

export default function Material() {
  const { showAlert } = useAlert();
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.productionMaterial);
  const [keywords, setKeywords] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const materials = useMemo(() => items.map(normalizeMaterial), [items]);

  const fetchMaterials = useCallback(
    async (search = '') => {
      try {
        await dispatch(getItem(search));
      } catch (error) {
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch material data', 'danger');
      }
    },
    [dispatch, showAlert]
  );

  useEffect(() => {
    setCurrentPage(1);

    const delayTimer = setTimeout(() => {
      fetchMaterials(keywords.trim());
    }, keywords ? 500 : 0);

    return () => clearTimeout(delayTimer);
  }, [fetchMaterials, keywords]);

  const pageCount = Math.max(Math.ceil(materials.length / pageSize), 1);
  const paginatedMaterials = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;

    return materials.slice(startIndex, startIndex + pageSize);
  }, [currentPage, materials, pageCount]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleSync = async () => {
    setSyncing(true);

    try {
      const response = await MaterialServices.getSyncItem();

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to synchronize material data', 'danger');
        return;
      }

      await fetchMaterials(keywords.trim());
      showAlert(response?.data?.message || 'Material data synchronized successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to synchronize material data', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  const resetSearch = () => setKeywords('');

  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Master Material</h5>
          <span className="text-muted f-12">Manage raw materials and components used in production.</span>
        </Stack>
      }
      secondary={
        <Button variant="primary" onClick={handleSync} disabled={loading || syncing}>
          <i className={`ti ti-refresh me-1 ${syncing ? 'spin' : ''}`} />
          {syncing ? 'Synchronizing...' : 'Sync'}
        </Button>
      }
    >
      <Row className="g-2 align-items-end mb-3">
        <Col lg={7} md={7}>
          <Form.Label className="f-12 text-muted">Search Material</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <i className="ti ti-search" />
            </InputGroup.Text>
            <Form.Control
              type="search"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="Material code or name"
            />
          </InputGroup>
        </Col>
        {/* <Col lg={2} md={5}>
          <Button className="w-100" variant="light-secondary" onClick={resetSearch} disabled={!keywords || loading}>
            <i className="ti ti-x me-1" />
            Reset
          </Button>
        </Col> */}
        <Col lg={5} className="text-lg-end">
          <span className="text-muted f-12">Total Material</span>
          <div className="fw-semibold">{materials.length}</div>
        </Col>
      </Row>

      <Table className="mb-0 align-middle" responsive hover>
        <thead>
          <tr>
            <th style={{ width: 70 }}>#</th>
            <th style={{ minWidth: 160 }}>Material Code</th>
            <th style={{ minWidth: 260 }}>Material Name</th>
            <th style={{ minWidth: 100 }}>UOM</th>
            <th style={{ minWidth: 110 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5}>
                <LoaderData />
              </td>
            </tr>
          ) : paginatedMaterials.length ? (
            paginatedMaterials.map((material, index) => {
              const status = getStatus(material.status);

              return (
                <tr key={material.id}>
                  <td>{(Math.min(currentPage, pageCount) - 1) * pageSize + index + 1}</td>
                  <td className="fw-semibold">{material.code || '-'}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{material.name || '-'}</td>
                  <td>{material.uom || '-'}</td>
                  <td>{status ? <Badge bg={status.variant}>{status.label}</Badge> : '-'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5}>
                <div className="text-center py-5">
                  <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ti ti-box f-24" />
                  </span>
                  <h5 className="mb-1">{keywords ? 'Material not found' : 'No material data yet'}</h5>
                  <p className="text-muted mb-0">
                    {keywords ? 'Try another material code or name.' : 'Material data from Production will appear here.'}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {!loading && materials.length > 0 ? (
        <TablePagination
          currentPage={Math.min(currentPage, pageCount)}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={materials.length}
          itemLabel="materials"
        />
      ) : null}
    </MainCard>
  );
}
