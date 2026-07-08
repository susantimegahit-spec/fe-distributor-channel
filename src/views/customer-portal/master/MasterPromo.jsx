import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import ConfirmDialog from 'components/ConfirmDialog';
import TablePagination from 'components/TablePagination';
import LoaderData from '../../../components/LoaderData';
import DistributorServices from '../../../services/DistributorServices';
import ProductServices from '../../../services/ProductServices';
import PromoServices from '../../../services/PromoServices';
import { useAlert } from '../../../utils/alertContext';

const pageSize = 10;

const initialPromoInput = {
  program_name: '',
  customer_code: [],
  items: [],
  start_date: '',
  end_date: '',
  description: ''
};

const initialPromoRules = [
  {
    customer_type: 'GT',
    min_qty_kg: '',
    max_qty_kg: '',
    harga_promo_per_kg: '',
    diskon_per_kg: ''
  }
];

const selectStyles = {
  control: (provided) => ({
    ...provided,
    minHeight: '38px'
  }),
  valueContainer: (provided) => ({
    ...provided,
    paddingTop: 0,
    paddingBottom: 0
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 1060
  })
};

const statusVariant = {
  active: 'success',
  inactive: 'secondary'
};

const statusLabel = {
  active: 'Active',
  inactive: 'Inactive'
};

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const formatInputDate = (value) => (value ? String(value).slice(0, 10) : '');

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const normalizeList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
};

const normalizeStatus = (value) => {
  const status = String(value ?? 'active').toLowerCase();

  if (['0', 'inactive', 'nonaktif', 'tidak aktif'].includes(status)) return 'inactive';

  return 'active';
};

const normalizeValueList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getProgramItems = (program) => {
  const itemCodes = Array.isArray(program.item_code) ? program.item_code : program.item_code ? [program.item_code] : [];
  const itemNames = Array.isArray(program.item_name) ? program.item_name : program.item_name ? [program.item_name] : [];
  const programItems = program.items || program.item || program.products || program.program_items;
  const items = Array.isArray(programItems) && !programItems.length ? itemCodes : programItems || itemCodes;
  const normalizedItems = Array.isArray(items) ? items : [items];

  return normalizedItems.filter(Boolean).map((item, index) => {
    if (typeof item === 'string') {
      const itemName = itemNames[index] || '';

      return {
        value: item,
        label: itemName ? `${item} - ${itemName}` : item,
        item: {
          item_code: item,
          item_name: itemName
        }
      };
    }

    const itemCode = item.item_code || item.itemCode || item.code || item.value || '';
    const itemName = item.item_name || item.itemName || item.name || item.label || '';

    return {
      value: itemCode || itemName,
      label: item.label || (itemCode ? `${itemCode} - ${itemName || '-'}` : itemName || '-'),
      item
    };
  });
};

const getProgramCustomers = (program) => {
  const programCustomerCode = program.customer_code || program.code_customer || program.customer_codes || program.code_customers;
  const customerCodes = normalizeValueList(programCustomerCode);
  const programCustomerName = program.customer_name || program.name_customer || program.customer_names || program.name_customers;
  const customerNames = normalizeValueList(programCustomerName);
  const customerDepos = normalizeValueList(program.depo);
  const programCustomers = program.customers || program.customer || program.distributors || program.program_customers;
  const customers = Array.isArray(programCustomers) && !programCustomers.length ? customerCodes : programCustomers || customerCodes;
  const normalizedCustomers = Array.isArray(customers) ? customers : [customers];

  return normalizedCustomers.filter(Boolean).map((customer, index) => {
    if (typeof customer === 'string') {
      const customerName = customerNames[index] || '';
      const depo = customerDepos[index] || '';
      const labelParts = [customer, depo, customerName].filter(Boolean);

      return {
        value: customer,
        customer_code: customer,
        label: labelParts.join(' - '),
        customer: {
          customer_code: customer,
          customer_name: customerName,
          depo
        }
      };
    }

    const customerCode = customer.customer_code || customer.code_customer || customer.distributor_code || customer.value || '';
    const customerName = customer.customer_name || customer.name_customer || customer.name || customer.label || '';
    const depo = customer.depo || customer.customer_depo || '';
    const labelParts = [customerCode, depo, customerName].filter(Boolean);

    return {
      value: customerCode || customerName,
      customer_code: customerCode,
      label: customer.label || labelParts.join(' - ') || '-',
      customer
    };
  });
};

const getCustomerOptionCode = (customer) => customer?.customer_code || customer?.code_customer || customer?.distributor_code || customer?.value || '';

const enrichCustomerOption = (customer, customerOptionMap) => {
  const customerCode = getCustomerOptionCode(customer);
  const masterCustomer = customerOptionMap.get(customerCode);

  if (!masterCustomer) return customer;

  return {
    ...customer,
    ...masterCustomer,
    value: masterCustomer.value,
    customer_code: masterCustomer.customer_code,
    label: masterCustomer.label
  };
};

const getProgramRules = (program) => {
  const rules = program.strata || program.details || program.rules || program.program_details || [];

  return Array.isArray(rules) ? rules : [rules].filter(Boolean);
};

const normalizePromo = (program, index) => ({
  id: program.id || program.program_id || index,
  program_name: program.program_name || program.name || '',
  customer_code: getProgramCustomers(program),
  items: getProgramItems(program),
  start_date: program.start_date || program.startDate || '',
  end_date: program.end_date || program.endDate || '',
  description: program.description || program.keterangan || '',
  status: normalizeStatus(program.status),
  rules: getProgramRules(program)
});

const normalizeDetailResponse = (response) => {
  const payload = response?.data;

  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload?.program && !Array.isArray(payload.program)) return payload.program;
  if (payload && !Array.isArray(payload)) return payload;

  return null;
};

export default function MasterPromo() {
  const { showAlert } = useAlert();
  const [promoPrograms, setPromoPrograms] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [loadingDetailType, setLoadingDetailType] = useState(null);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [deletingPromoId, setDeletingPromoId] = useState(null);
  const [promoInput, setPromoInput] = useState(initialPromoInput);
  const [promoRules, setPromoRules] = useState(initialPromoRules);
  const [listItem, setListItem] = useState([]);
  const [listCustomer, setListCustomer] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const customerOptionMap = useMemo(
    () => new Map(listCustomer.map((customer) => [customer.customer_code || customer.value, customer])),
    [listCustomer]
  );

  const fetchPromos = useCallback(async () => {
    setLoadingData(true);

    try {
      const response = await PromoServices.getAllPromo();
      const promos = normalizeList(response).map((program, index) => normalizePromo(program, index));

      setPromoPrograms(promos);
      setCurrentPage(1);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch promo program data', 'danger');
    } finally {
      setLoadingData(false);
    }
  }, [showAlert]);

  const fetchOptions = useCallback(async () => {
    setLoadingOptions(true);

    try {
      const [itemResponse, customerResponse] = await Promise.all([ProductServices.getAllProduct(''), DistributorServices.getAllDistributor('')]);
      const itemOptions = normalizeList(itemResponse).map((item) => {
        const itemCode = item.item_code || item.code || item.itemCode || '';
        const itemName = item.item_name || item.name || item.itemName || '';

        return {
          value: itemCode,
          label: itemCode ? `${itemCode} - ${itemName || '-'}` : itemName || '-',
          item
        };
      });

      const customerOptions = normalizeList(customerResponse)
        .map((customer) => {
          const customerCode = customer.code_customer || customer.customer_code || customer.distributor_code || '';
          const customerName = customer.name || customer.customer_name || customer.name_customer || '';
          const depo = customer.depo || customer.customer_depo || '';

          return {
            value: customerCode,
            customer_code: customerCode,
            label: [customerCode, depo, customerName].filter(Boolean).join(' - ') || '-',
            id: customer.id,
            customer
          };
        })
        .filter((customer) => customer.value);

      setListItem(itemOptions);
      setListCustomer(customerOptions);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch promo dropdown data', 'danger');
    } finally {
      setLoadingOptions(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchPromos();
    fetchOptions();
  }, [fetchOptions, fetchPromos]);

  const pageCount = Math.max(Math.ceil(promoPrograms.length / pageSize), 1);
  const paginatedPromos = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return promoPrograms.slice(startIndex, startIndex + pageSize);
  }, [promoPrograms, currentPage]);

  const resetPromoForm = () => {
    setPromoInput(initialPromoInput);
    setPromoRules(initialPromoRules);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingPromoId(null);
    resetPromoForm();
  };

  const handleOpenAddModal = () => {
    setEditingPromoId(null);
    resetPromoForm();
    setShowAddModal(true);
  };

  const handleViewPromo = async (program) => {
    setLoadingDetailId(program.id);
    setLoadingDetailType('view');

    try {
      const response = await PromoServices.getProgramDetail(program.id);

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch promo program detail', 'danger');
        return;
      }

      const detail = normalizeDetailResponse(response);

      if (!detail) {
        showAlert('Promo program detail not found', 'danger');
        return;
      }

      const normalizedPromo = normalizePromo(detail, program.id);
      const normalizedCustomers = normalizedPromo.customer_code.map((customer) => enrichCustomerOption(customer, customerOptionMap));

      setSelectedPromo({
        ...normalizedPromo,
        customer_code: normalizedCustomers
      });
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch promo program detail', 'danger');
    } finally {
      setLoadingDetailId(null);
      setLoadingDetailType(null);
    }
  };

  const handleEditPromo = async (program) => {
    setLoadingDetailId(program.id);
    setLoadingDetailType('edit');

    try {
      const response = await PromoServices.getProgramDetail(program.id);

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch promo program detail', 'danger');
        return;
      }

      const detail = normalizeDetailResponse(response);

      if (!detail) {
        showAlert('Promo program detail not found', 'danger');
        return;
      }

      const normalizedPromo = normalizePromo(detail, program.id);
      const normalizedCustomers = normalizedPromo.customer_code.map((customer) => enrichCustomerOption(customer, customerOptionMap));

      setPromoInput({
        program_name: normalizedPromo.program_name,
        customer_code: normalizedCustomers,
        items: normalizedPromo.items,
        start_date: formatInputDate(normalizedPromo.start_date),
        end_date: formatInputDate(normalizedPromo.end_date),
        description: normalizedPromo.description
      });
      setPromoRules(
        normalizedPromo.rules.length
          ? normalizedPromo.rules.map((rule) => ({
              customer_type: rule.customer_type || 'GT',
              min_qty_kg: rule.min_qty_kg ?? '',
              max_qty_kg: rule.max_qty_kg ?? '',
              harga_promo_per_kg: rule.harga_program_per_kg ?? rule.harga_promo_per_kg ?? '',
              diskon_per_kg: rule.diskon_per_kg ?? ''
            }))
          : initialPromoRules
      );
      setEditingPromoId(normalizedPromo.id || program.id);
      setShowAddModal(true);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch promo program detail', 'danger');
    } finally {
      setLoadingDetailId(null);
      setLoadingDetailType(null);
    }
  };

  const handleDeletePromo = async () => {
    if (!promoToDelete || deletingPromoId !== null) return;

    const program = promoToDelete;
    setPromoToDelete(null);
    setDeletingPromoId(program.id);

    try {
      const response = await PromoServices.deleteProgram(program.id);

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to delete promo program', 'danger');
        return;
      }

      await fetchPromos();
      showAlert(response?.data?.message || 'Promo program deleted successfully', 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to delete promo program', 'danger');
    } finally {
      setDeletingPromoId(null);
    }
  };

  const handleChangePromoInput = (field, value) => {
    setPromoInput((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChangeRule = (index, field, value) => {
    setPromoRules((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const addRule = () => {
    setPromoRules((prev) => [...prev, { ...initialPromoRules[0] }]);
  };

  const removeRule = (index) => {
    setPromoRules((prev) => (prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));
  };

  const handleSubmitPromo = async () => {
    if (!promoInput.program_name || !promoInput.customer_code.length || !promoInput.items.length || !promoInput.start_date || !promoInput.end_date) {
      showAlert('Program name, customer, item, start date, and end date are required', 'danger');
      return;
    }

    const hasInvalidRule = promoRules.some(
      (item) =>
        !item.customer_type ||
        item.min_qty_kg === '' ||
        item.max_qty_kg === '' ||
        item.harga_promo_per_kg === '' ||
        item.diskon_per_kg === ''
    );

    if (hasInvalidRule) {
      showAlert('Complete all promo rule details', 'danger');
      return;
    }
    const items = promoInput.items.map((item) => item?.value);
    const customerCodes = promoInput.customer_code.map((customer) => customer?.customer_code || customer?.value).filter(Boolean);

    const payload = {
      program_name: promoInput.program_name,
      customer_code: customerCodes,
      code_customer: customerCodes.toString(),
      item_name: promoInput.items.map((item) => item.label),
      item_code: promoInput.items.map((item) => item.value),
      items,
      start_date: promoInput.start_date,
      end_date: promoInput.end_date,
      description: promoInput.description,
      strata: promoRules.map((item) => ({
        customer_type: item.customer_type,
        min_qty_kg: Number(item.min_qty_kg),
        max_qty_kg: Number(item.max_qty_kg),
        harga_program_per_kg: Number(item.harga_promo_per_kg),
        diskon_per_kg: Number(item.diskon_per_kg)
      }))
    };

    setSubmittingPromo(true);

    try {
      const response = editingPromoId ? await PromoServices.updateProgram(editingPromoId, payload) : await PromoServices.postPromo(payload);

      if (response?.data?.success === false) {
        showAlert(response.data.message || `Failed to ${editingPromoId ? 'update' : 'add'} promo program`, 'danger');
        return;
      }

      await fetchPromos();
      handleCloseModal();
      showAlert(response?.data?.message || `Promo program ${editingPromoId ? 'updated' : 'added'} successfully`, 'success');
    } catch (error) {
      showAlert(error?.message || `Failed to ${editingPromoId ? 'update' : 'add'} promo program`, 'danger');
    } finally {
      setSubmittingPromo(false);
    }
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Program Promo</h5>
              <span className="text-muted f-12">Manage promo programs based on items, periods, and customer quantity rules.</span>
            </Stack>
          }
          secondary={
            <Button variant="primary" onClick={handleOpenAddModal} disabled={loadingData}>
              <i className="ti ti-plus me-1" />
              Add Program
            </Button>
          }
        >
          <Row className="g-3">
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Program</div>
                      <h4 className="mb-0">{promoPrograms.length}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-discount-2" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Active Programs</div>
                      <h4 className="mb-0">{promoPrograms.filter((item) => item.status === 'active').length}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-success text-success">
                      <i className="ti ti-circle-check" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total Item Promo</div>
                      <h4 className="mb-0">{promoPrograms.reduce((total, item) => total + (item.items?.length || 0), 0)}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-orange text-orange">
                      <i className="ti ti-package" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </MainCard>

        <MainCard
          className="claim-transaction-card"
          title={
            <Stack gap={1}>
              <h5 className="mb-0">List Program Promo</h5>
              <span className="text-muted f-12">List of created promo programs.</span>
            </Stack>
          }
        >
          <Table className="mb-0 align-middle" responsive hover>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Program Name</th>
                <th style={{ minWidth: 260 }}>Customer</th>
                <th style={{ minWidth: 190 }}>Periode</th>
                <th style={{ minWidth: 260 }}>Item</th>
                <th style={{ minWidth: 240 }}>Remarks</th>
                <th style={{ minWidth: 120 }}>Status</th>
                <th className="text-center" style={{ minWidth: 150 }}>
                  #
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={7}>
                    <LoaderData />
                  </td>
                </tr>
              ) : paginatedPromos.length ? (
                paginatedPromos.map((program) => {
                  const programItems = program.items || [];
                  const programCustomers = (program.customer_code || []).map((customer) => enrichCustomerOption(customer, customerOptionMap));

                  return (
                    <tr key={program.id}>
                      <td className="fw-semibold">{program.program_name || '-'}</td>
                      <td>
                        {programCustomers.length ? (
                          <Stack gap={1}>
                            {programCustomers.slice(0, 2).map((customer, index) => (
                              <span key={`${customer.value || customer.customer_code}-${index}`}>{customer.label}</span>
                            ))}
                            {programCustomers.length > 2 && (
                              <small className="text-muted">+{programCustomers.length - 2} customer lainnya</small>
                            )}
                          </Stack>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {formatDate(program.start_date)} - {formatDate(program.end_date)}
                      </td>
                      <td>
                        {programItems.length ? (
                          <Stack gap={1}>
                            {programItems.slice(0, 2).map((item) => (
                              <span key={item.value}>{item.label}</span>
                            ))}
                            {programItems.length > 2 && <small className="text-muted">+{programItems.length - 2} item lainnya</small>}
                          </Stack>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{program.description || '-'}</td>
                      <td>
                        <Badge bg={statusVariant[program.status] || 'secondary'}>{statusLabel[program.status] || program.status}</Badge>
                      </td>
                      <td>
                        <Stack direction="horizontal" gap={2} className="justify-content-center">
                          <Button
                            className="rounded-circle"
                            variant="outline-primary"
                            size="sm"
                            title="View detail program"
                            aria-label={`View detail ${program.program_name || 'program promo'}`}
                            onClick={() => handleViewPromo(program)}
                            disabled={loadingDetailId !== null || deletingPromoId !== null}
                          >
                            {String(loadingDetailId) === String(program.id) && loadingDetailType === 'view' ? (
                              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                            ) : (
                              <i className="ti ti-eye" />
                            )}
                          </Button>
                          <Button
                            className="rounded-circle"
                            variant="outline-secondary"
                            size="sm"
                            title="Edit program"
                            aria-label={`Edit ${program.program_name || 'program promo'}`}
                            onClick={() => handleEditPromo(program)}
                            disabled={loadingDetailId !== null || deletingPromoId !== null}
                          >
                            {String(loadingDetailId) === String(program.id) && loadingDetailType === 'edit' ? (
                              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                            ) : (
                              <i className="ti ti-pencil" />
                            )}
                          </Button>
                          <Button
                            className="rounded-circle"
                            variant="outline-danger"
                            size="sm"
                            title="Delete program"
                            aria-label={`Delete ${program.program_name || 'program promo'}`}
                            onClick={() => setPromoToDelete(program)}
                            disabled={loadingDetailId !== null || deletingPromoId !== null}
                          >
                            {String(deletingPromoId) === String(program.id) ? (
                              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                            ) : (
                              <i className="ti ti-trash" />
                            )}
                          </Button>
                        </Stack>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-5">
                      <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                        <i className="ti ti-discount-2 f-24" />
                      </div>
                      <h5 className="mb-1">No promo programs yet</h5>
                      <p className="text-muted mb-3">Add promo programs to manage prices and discounts per customer type.</p>
                      <Button variant="primary" onClick={handleOpenAddModal}>
                        <i className="ti ti-plus me-1" />
                        Add Program
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={promoPrograms.length}
            itemLabel="program"
          />
        </MainCard>
      </Stack>

      <Modal show={showAddModal} onHide={handleCloseModal} size="xl" centered fullscreen="lg-down">
        <Modal.Header closeButton>
          <Modal.Title>{editingPromoId ? 'Edit Program Promo' : 'Add Program Promo'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Program Name</Form.Label>
                    <Form.Control
                      value={promoInput.program_name}
                      onChange={(event) => handleChangePromoInput('program_name', event.target.value)}
                      placeholder="Enter promo program name"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Item Name</Form.Label>
                    <Select
                      isMulti
                      isLoading={loadingOptions}
                      styles={selectStyles}
                      value={promoInput.items}
                      options={listItem}
                      menuPosition="fixed"
                      onChange={(value) => handleChangePromoInput('items', value || [])}
                      placeholder="Select item promo"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Customer</Form.Label>
                    <Select
                      isMulti
                      closeMenuOnSelect={false}
                      isLoading={loadingOptions}
                      styles={selectStyles}
                      value={promoInput.customer_code}
                      options={listCustomer}
                      menuPosition="fixed"
                      onChange={(value) => handleChangePromoInput('customer_code', value || [])}
                      placeholder="Select customer"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="f-12 text-muted">Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={promoInput.start_date}
                      onChange={(event) => handleChangePromoInput('start_date', event.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label className="f-12 text-muted">End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={promoInput.end_date}
                      onChange={(event) => handleChangePromoInput('end_date', event.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="f-12 text-muted">Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={promoInput.description}
                      onChange={(event) => handleChangePromoInput('description', event.target.value)}
                      placeholder="Add program description"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border mb-0">
              <Card.Header className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <h6 className="mb-0">Promo Rule Details</h6>
                    <small className="text-muted">Set quantity ranges and promo price values per customer type.</small>
                  </div>
                  <Button variant="light-primary" onClick={addRule}>
                    <i className="ti ti-plus me-1" />
                    Add Row
                  </Button>
                </Stack>
              </Card.Header>
              <Card.Body className="p-0">
                <Table className="mb-0 align-middle" responsive hover>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 150 }}>Customer Type</th>
                      <th style={{ minWidth: 140 }}>Min Qty Kg</th>
                      <th style={{ minWidth: 140 }}>Max Qty Kg</th>
                      <th style={{ minWidth: 180 }}>Price Promo / Kg</th>
                      <th style={{ minWidth: 160 }}>Discount / Kg</th>
                      {/* <th style={{ minWidth: 160 }}>Estimated Net</th> */}
                      <th className="text-center" style={{ width: 72 }}>
                        #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoRules.map((rule, index) => {
                      const estimatedNet = Number(rule.harga_promo_per_kg || 0) - Number(rule.diskon_per_kg || 0);

                      return (
                        <tr key={index}>
                          <td>
                            <Form.Select
                              value={rule.customer_type}
                              onChange={(event) => handleChangeRule(index, 'customer_type', event.target.value)}
                              size="sm"
                            >
                              <option value="GT">GT</option>
                              <option value="MT">MT</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.min_qty_kg}
                              onChange={(event) => handleChangeRule(index, 'min_qty_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.max_qty_kg}
                              onChange={(event) => handleChangeRule(index, 'max_qty_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.harga_promo_per_kg}
                              onChange={(event) => handleChangeRule(index, 'harga_promo_per_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              value={rule.diskon_per_kg}
                              onChange={(event) => handleChangeRule(index, 'diskon_per_kg', event.target.value)}
                              min="0"
                              size="sm"
                              placeholder="0"
                            />
                          </td>
                          {/* <td className="fw-semibold">{formatCurrency(Math.max(estimatedNet, 0))}</td> */}
                          <td className="text-center">
                            <Button
                              className="rounded-circle"
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeRule(index)}
                              disabled={promoRules.length === 1}
                            >
                              <i className="ti ti-trash" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmitPromo} disabled={submittingPromo}>
            <i className="ti ti-device-floppy me-1" />
            {submittingPromo ? 'Saving...' : editingPromoId ? 'Save Changes' : 'Save Program'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedPromo)} onHide={() => setSelectedPromo(null)} size="xl" centered fullscreen="lg-down">
        <Modal.Header closeButton>
          <Modal.Title>Promo Program Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          {selectedPromo ? (
            <Stack gap={3}>
              <Card className="border-0 shadow-sm mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start flex-wrap">
                    <div>
                      <div className="text-muted f-12 mb-1">NAMA PROGRAM</div>
                      <h4 className="mb-1">{selectedPromo.program_name || '-'}</h4>
                      <p className="text-muted mb-0">{selectedPromo.description || 'No program description.'}</p>
                    </div>
                    <Badge bg={statusVariant[selectedPromo.status] || 'secondary'} className="px-3 py-2">
                      {statusLabel[selectedPromo.status] || selectedPromo.status}
                    </Badge>
                  </Stack>

                  <Row className="g-3 mt-2">
                    <Col md={4}>
                      <div className="border rounded p-3 h-100 bg-white">
                        <div className="text-muted f-12 mb-1">TANGGAL MULAI</div>
                        <div className="fw-semibold">{formatDate(selectedPromo.start_date)}</div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-3 h-100 bg-white">
                        <div className="text-muted f-12 mb-1">TANGGAL SELESAI</div>
                        <div className="fw-semibold">{formatDate(selectedPromo.end_date)}</div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="border rounded p-3 h-100 bg-white">
                        <div className="text-muted f-12 mb-1">TOTAL ITEM</div>
                        <div className="fw-semibold">{selectedPromo.items?.length || 0} item</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-0">
                <Card.Header className="bg-white py-3">
                  <h6 className="mb-0">Customer Program</h6>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table className="mb-0 align-middle" responsive>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>No.</th>
                        <th style={{ minWidth: 160 }}>Customer Code</th>
                        <th style={{ minWidth: 180 }}>Depo</th>
                        <th style={{ minWidth: 260 }}>Customer Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPromo.customer_code?.length ? (
                        selectedPromo.customer_code.map((customer, index) => (
                          <tr key={`${customer.customer_code || customer.value}-${index}`}>
                            <td>{index + 1}</td>
                            <td className="fw-semibold">{customer.customer_code || customer.value || '-'}</td>
                            <td>{customer.customer?.depo || customer.depo || '-'}</td>
                            <td>{customer.customer?.name || customer.customer?.customer_name || customer.customer?.name_customer || customer.label || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4">
                            Customer program is not available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-0">
                <Card.Header className="bg-white py-3">
                  <h6 className="mb-0">Item Program</h6>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table className="mb-0 align-middle" responsive>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>No.</th>
                        <th style={{ minWidth: 160 }}>Item Code</th>
                        <th style={{ minWidth: 260 }}>Item Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPromo.items?.length ? (
                        selectedPromo.items.map((item, index) => (
                          <tr key={`${item.value}-${index}`}>
                            <td>{index + 1}</td>
                            <td className="fw-semibold">{item.item?.item_code || item.value || '-'}</td>
                            <td>{item.item?.item_name || item.label || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-4">
                            Item program is not available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-0">
                <Card.Header className="bg-white py-3">
                  <h6 className="mb-0">Promo Rules</h6>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table className="mb-0 align-middle" responsive>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>No.</th>
                        <th style={{ minWidth: 140 }}>Customer Type</th>
                        <th className="text-end" style={{ minWidth: 120 }}>
                          Min Qty
                        </th>
                        <th className="text-end" style={{ minWidth: 120 }}>
                          Max Qty
                        </th>
                        <th className="text-end" style={{ minWidth: 180 }}>
                          Price Promo / Kg
                        </th>
                        <th className="text-end" style={{ minWidth: 160 }}>
                          Discount / Kg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPromo.rules?.length ? (
                        selectedPromo.rules.map((rule, index) => (
                          <tr key={`${rule.id || rule.customer_type || 'rule'}-${index}`}>
                            <td>{index + 1}</td>
                            <td>
                              <Badge bg="light-primary">{rule.customer_type || '-'}</Badge>
                            </td>
                            <td className="text-end">{Number(rule.min_qty_kg || 0).toLocaleString('id-ID')} kg</td>
                            <td className="text-end">{Number(rule.max_qty_kg || 0).toLocaleString('id-ID')} kg</td>
                            <td className="text-end fw-semibold">{formatCurrency(rule.harga_program_per_kg ?? rule.harga_promo_per_kg)}</td>
                            <td className="text-end">{formatCurrency(rule.diskon_per_kg)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            Promo rules are not available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Stack>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedPromo(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={Boolean(promoToDelete)}
        onCancel={() => setPromoToDelete(null)}
        onSubmit={handleDeletePromo}
        title="Delete Promo Program"
        subTitle={`Are you sure you want to delete ${promoToDelete?.program_name || 'this'} program?`}
      />
    </>
  );
}
