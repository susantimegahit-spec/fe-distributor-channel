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
import { getResource } from '../../../../redux/production/resourceReducer';
import ResourceServices from '../../../../services/production/ResourceServices';
import { useAlert } from '../../../../utils/alertContext';

const pageSize = 10;

const normalizeResource = (item = {}, index = 0) => ({
  id: item.id || item.resource_id || item.res_code || item.resource_code || item.code || index,
  code: item.res_code || item.resource_code || item.code || item.ResCode || '',
  name: item.res_name || item.resource_name || item.name || item.ResName || '',
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

export default function Resource() {
  const { showAlert } = useAlert();
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.productionResource);
  const [keywords, setKeywords] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resources = useMemo(() => items.map(normalizeResource), [items]);

  const fetchResources = useCallback(
    async (search = '') => {
      try {
        await dispatch(getResource(search));
      } catch (error) {
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch resource data', 'danger');
      }
    },
    [dispatch, showAlert]
  );

  useEffect(() => {
    setCurrentPage(1);

    const delayTimer = setTimeout(() => {
      fetchResources(keywords.trim());
    }, keywords ? 500 : 0);

    return () => clearTimeout(delayTimer);
  }, [fetchResources, keywords]);

  const pageCount = Math.max(Math.ceil(resources.length / pageSize), 1);
  const paginatedResources = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;

    return resources.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageCount, resources]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleSync = async () => {
    setSyncing(true);

    try {
      const response = await ResourceServices.getResourceSync();

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to synchronize resource data', 'danger');
        return;
      }

      await fetchResources(keywords.trim());
      showAlert(response?.data?.message || 'Resource data synchronized successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to synchronize resource data', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Master Resource</h5>
          <span className="text-muted f-12">Manage machines, work centers, and production resources.</span>
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
          <Form.Label className="f-12 text-muted">Search Resource</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <i className="ti ti-search" />
            </InputGroup.Text>
            <Form.Control
              type="search"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="Resource code or name"
            />
          </InputGroup>
        </Col>
        {/* <Col lg={2} md={5}>
          <Button className="w-100" variant="light-secondary" onClick={() => setKeywords('')} disabled={!keywords || loading}>
            <i className="ti ti-x me-1" />
            Reset
          </Button>
        </Col> */}
        <Col lg={5} className="text-lg-end">
          <span className="text-muted f-12">Total Resource</span>
          <div className="fw-semibold">{resources.length}</div>
        </Col>
      </Row>

      <Table className="mb-0 align-middle" responsive hover>
        <thead>
          <tr>
            <th style={{ width: 70 }}>#</th>
            <th style={{ minWidth: 160 }}>Resource Code</th>
            <th style={{ minWidth: 260 }}>Resource Name</th>
            <th style={{ minWidth: 110 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4}>
                <LoaderData />
              </td>
            </tr>
          ) : paginatedResources.length ? (
            paginatedResources.map((resource, index) => {
              const status = getStatus(resource.status);

              return (
                <tr key={resource.id}>
                  <td>{(Math.min(currentPage, pageCount) - 1) * pageSize + index + 1}</td>
                  <td className="fw-semibold">{resource.code || '-'}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{resource.name || '-'}</td>
                  <td>{status ? <Badge bg={status.variant}>{status.label}</Badge> : '-'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4}>
                <div className="text-center py-5">
                  <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ti ti-settings-automation f-24" />
                  </span>
                  <h5 className="mb-1">{keywords ? 'Resource not found' : 'No resource data yet'}</h5>
                  <p className="text-muted mb-0">
                    {keywords ? 'Try another resource code or name.' : 'Resource data from Production will appear here.'}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {!loading && resources.length > 0 ? (
        <TablePagination
          currentPage={Math.min(currentPage, pageCount)}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={resources.length}
          itemLabel="resources"
        />
      ) : null}
    </MainCard>
  );
}
