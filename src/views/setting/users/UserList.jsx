import { useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Table from 'react-bootstrap/Table';
import Tabs from 'react-bootstrap/Tabs';
import Select from 'react-select';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LoaderButton from '../../../components/LoaderButton';
import LoaderData from '../../../components/LoaderData';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import WarehouseServices from '../../../services/customer-portal/WarehouseServices';
import ExpeditionServices from '../../../services/expedition/ExpeditionServices';
import RoleServices from '../../../services/setting/RoleServices';
import UserServices from '../../../services/setting/UserServices';
import { SYSTEM_KEYS, systems } from '../../../systems';
import actionRegistry from '../../../data-action.json';
import { useAlert } from '../../../utils/alertContext';
import { getAssignedCustomerCode } from '../../../utils/cookies';

const initialInput = {
  name: '',
  username: '',
  email: '',
  password: '',
  roleId: '',
  expeditionCode: '',
  whsCodes: [],
  ocrCodes: [],
  ocrCodes2: [],
  ocrCodes3: [],
  originator: '',
  stage: '',
  accessibleSystems: [],
  distributorCodes: [],
  distributorIds: [],
  actionAssignments: {}
};

const pageSize = 10;
const ALL_DISTRIBUTORS_VALUE = 'ALL';
const allDistributorOption = {
  value: ALL_DISTRIBUTORS_VALUE,
  label: 'All Distributor',
  id: ALL_DISTRIBUTORS_VALUE,
  name: 'All Distributor',
  isAll: true
};
const accessibleSystemOptions = [
  { value: SYSTEM_KEYS.CUSTOMER_PORTAL, label: 'Customer Portal', color: '#315fb4' },
  { value: SYSTEM_KEYS.ENTERPRISE, label: 'Corporate', color: '#c0265e' },
  { value: SYSTEM_KEYS.EXPEDITION, label: 'Expedition', color: '#e8590c' },
  { value: SYSTEM_KEYS.PICKING_LIST, label: 'Picking List', color: '#7048e8' },
  { value: SYSTEM_KEYS.PRODUCTION, label: 'Production', color: '#198754' }
];
const userActions = actionRegistry.action_definitions.map(({ value, label }) => ({ value, label }));
const actionRegistryByMenuId = new Map(actionRegistry.menus.map((menu) => [menu.menu_id, menu]));
const getRegisteredMenuActions = (menuId) => actionRegistryByMenuId.get(menuId)?.actions || [];
const flattenActionMenus = (items = [], system) =>
  items.flatMap((item) => [
    ...(item.type === 'item' ? [{ ...item, systemKey: system.key, systemTitle: system.title }] : []),
    ...(item.children?.length ? flattenActionMenus(item.children, system) : [])
  ]);
const actionMenuOptions = systems.flatMap((system) => flattenActionMenus(system.menu, system));

const isGrantedAction = (value) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value ?? '')
    .trim()
    .toLowerCase() === 'true';

const normalizeActionAssignments = (value) => {
  const assignmentSource = value?.data ?? value?.action_assignments ?? value?.actionAssignments ?? value;
  const assignments = Array.isArray(assignmentSource)
    ? assignmentSource
    : assignmentSource && typeof assignmentSource === 'object' && ('menu_key' in assignmentSource || 'menuKey' in assignmentSource)
      ? [assignmentSource]
      : assignmentSource && typeof assignmentSource === 'object'
        ? Object.entries(assignmentSource).map(([menuKey, actions]) =>
            actions && typeof actions === 'object' && ('menu_key' in actions || 'menuKey' in actions)
              ? actions
              : { menu_key: menuKey, actions }
          )
        : [];

  return assignments.reduce((result, assignment) => {
    const menuId = assignment?.menu_key || assignment?.menuKey || assignment?.menu_id || assignment?.menuId || assignment?.id;
    const actions = assignment?.actions || assignment?.action || assignment;
    const matchingMenu = actionMenuOptions.find((menu) => String(menu.menu_key) === String(menuId) || String(menu.id) === String(menuId));

    if (matchingMenu) {
      if (Array.isArray(actions)) {
        result[matchingMenu.id] = actions;
      } else if (actions && typeof actions === 'object') {
        const normalizedActions = [
          isGrantedAction(actions.read) && 'view',
          isGrantedAction(actions.update) && 'edit',
          isGrantedAction(actions.delete) && 'delete',
          isGrantedAction(actions.approve) && 'approve',
          isGrantedAction(actions.export) && 'download',
          (isGrantedAction(actions.sync) || isGrantedAction(actions.synchronize) || isGrantedAction(actions.can_sync)) && 'sync'
        ].filter(Boolean);
        if (isGrantedAction(actions.create)) {
          normalizedActions.push(...getRegisteredMenuActions(matchingMenu.id).filter((action) => ['add', 'upload'].includes(action)));
        }
        result[matchingMenu.id] = [...new Set(normalizedActions)];
      } else {
        result[matchingMenu.id] = String(actions).split(',').filter(Boolean);
      }
    }
    return result;
  }, {});
};
// Temporary SAP master data. Replace these options with API data when the SAP master endpoints are available.
const sapOriginatorOptions = [
  { value: 'SAP001', label: 'SAP001 - Sales Admin' },
  { value: 'SAP002', label: 'SAP002 - Finance' },
  { value: 'SAP003', label: 'SAP003 - Warehouse' }
];
const sapStageOptions = [
  { value: '1', label: 'Stage 1 - Review' },
  { value: '2', label: 'Stage 2 - Approval' },
  { value: '3', label: 'Stage 3 - Final Approval' }
];
const accessibleSystemAliases = {
  distributor: SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer-portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  'customer portal': SYSTEM_KEYS.CUSTOMER_PORTAL,
  ekspedisi: SYSTEM_KEYS.EXPEDITION,
  expedition: SYSTEM_KEYS.EXPEDITION,
  pickinglist: SYSTEM_KEYS.PICKING_LIST,
  picking_list: SYSTEM_KEYS.PICKING_LIST,
  'picking-list': SYSTEM_KEYS.PICKING_LIST,
  'picking list': SYSTEM_KEYS.PICKING_LIST,
  production: SYSTEM_KEYS.PRODUCTION,
  produksi: SYSTEM_KEYS.PRODUCTION,
  manufacturing: SYSTEM_KEYS.PRODUCTION,
  enterprise: SYSTEM_KEYS.ENTERPRISE,
  entrerprise: SYSTEM_KEYS.ENTERPRISE,
  erp: SYSTEM_KEYS.ENTERPRISE,
  purchasing: SYSTEM_KEYS.ENTERPRISE,
  procurement: SYSTEM_KEYS.ENTERPRISE,
  pembelian: SYSTEM_KEYS.ENTERPRISE,
  support: SYSTEM_KEYS.ENTERPRISE,
  helpdesk: SYSTEM_KEYS.ENTERPRISE,
  'help-desk': SYSTEM_KEYS.ENTERPRISE,
  'support center': SYSTEM_KEYS.ENTERPRISE
};

const getUserDistributorCode = (item) =>
  item?.code_customer ||
  item?.customer_code ||
  item?.distributor_code ||
  item?.distributor?.code_customer ||
  item?.distributor?.customer_code ||
  '';

const getUserDistributorName = (item) =>
  item?.name_distributor || item?.distributor_name || item?.distributor?.name || item?.distributor?.name_distributor || '';

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.flatMap((item) => normalizeArray(item));
  if (value === undefined || value === null || value === '') return [];

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (!normalizedValue) return [];

    try {
      const parsedValue = JSON.parse(normalizedValue);

      if (parsedValue !== normalizedValue) return normalizeArray(parsedValue);
    } catch {
      // Use comma-separated values from the user detail response.
    }

    return normalizedValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value];
};

const getUserDistributors = (item) => {
  const distributors =
    item?.distributors || item?.user_distributors || item?.userDistributors || item?.distributor_users || item?.distributorUsers || [];

  if (Array.isArray(distributors) && distributors.length) {
    return distributors.map((distributor) => {
      const source = distributor?.distributor || distributor;

      return {
        ...source,
        id: source?.id || distributor?.id_distributor || distributor?.distributor_id || distributor?.id || '',
        code:
          source?.code_customer ||
          source?.customer_code ||
          source?.distributor_code ||
          distributor?.code_customer ||
          distributor?.customer_code ||
          distributor?.distributor_code ||
          '',
        name:
          source?.name ||
          source?.name_distributor ||
          source?.distributor_name ||
          distributor?.name ||
          distributor?.name_distributor ||
          distributor?.distributor_name ||
          '',
        address: source?.address || source?.mail_address || distributor?.address || distributor?.mail_address || '',
        phone: source?.phone || distributor?.phone || '',
        email: source?.email || distributor?.email || '',
        depo: source?.depo || source?.customer_depo || distributor?.depo || distributor?.customer_depo || ''
      };
    });
  }

  const codes = normalizeArray(
    item?.code_customers ||
      item?.customer_codes ||
      item?.code_customer ||
      item?.customer_code ||
      item?.codeCustomer ||
      item?.customerCode ||
      item?.distributor_code
  );
  const ids = normalizeArray(item?.id_distributors || item?.id_distributor || item?.distributor_id);
  const names = normalizeArray(item?.name_distributors || item?.name_distributor || item?.distributor_name);

  if (codes.length || ids.length || names.length) {
    const maxLength = Math.max(codes.length, ids.length, names.length);

    return Array.from({ length: maxLength }, (_, index) => ({
      id: ids[index] || '',
      code: codes[index] || '',
      name: names[index] || '',
      address: '',
      phone: '',
      email: '',
      depo: ''
    }));
  }

  const code = getUserDistributorCode(item);
  const name = getUserDistributorName(item);

  return code || name
    ? [
        {
          id: item?.id_distributor || item?.distributor_id || item?.distributor?.id || '',
          code,
          name,
          address: item?.distributor?.address || item?.distributor?.mail_address || '',
          phone: item?.distributor?.phone || '',
          email: item?.distributor?.email || '',
          depo: item?.distributor?.depo || item?.distributor?.customer_depo || ''
        }
      ]
    : [];
};

const formatDistributorCodes = (item) => {
  const distributors = getUserDistributors(item);

  return distributors
    .map((distributor) => distributor.code)
    .filter(Boolean)
    .join(', ');
};

const formatDistributorNames = (item) => {
  const distributors = getUserDistributors(item);

  return distributors
    .map((distributor) => distributor.name)
    .filter(Boolean)
    .join(', ');
};

const getAccessibleSystemValue = (item) => {
  if (typeof item === 'string') return item;

  return item?.key || item?.value || item?.system || item?.system_key || item?.name || item?.title || '';
};

const normalizeAccessibleSystems = (value) => {
  let systems = normalizeArray(value);

  if (typeof value === 'string') {
    try {
      const parsedValue = JSON.parse(value);

      systems = Array.isArray(parsedValue) ? parsedValue : normalizeArray(parsedValue);
    } catch {
      systems = value.split(',');
    }
  }

  return [
    ...new Set(
      systems
        .map((item) => String(getAccessibleSystemValue(item)).trim().toLowerCase())
        .map((item) => accessibleSystemAliases[item] || item)
        .filter((item) => accessibleSystemOptions.some((option) => option.value === item))
    )
  ];
};

const getUserAccessibleSystems = (item) =>
  normalizeAccessibleSystems(item?.accessible_systems || item?.accessibleSystems || item?.systems || item?.system_permissions);

const formatAccessibleSystems = (item) => {
  const selectedSystems = getUserAccessibleSystems(item);

  return accessibleSystemOptions
    .filter((option) => selectedSystems.includes(option.value))
    .map((option) => option.label)
    .join(', ');
};

const getUserExpeditionCode = (item) =>
  item?.expedition_code ||
  item?.expeditionCode ||
  item?.code_expedition ||
  item?.expedition?.code ||
  item?.expedition?.expedition_code ||
  '';

const getWarehouseCodeValue = (item) => {
  if (typeof item === 'string' || typeof item === 'number') return String(item);

  return String(item?.whs_code || item?.whsCode || item?.warehouse_code || item?.warehouseCode || item?.code || '');
};

const getUserWarehouseCodes = (item) =>
  normalizeArray(
    item?.whs_code ||
      item?.whsCodes ||
      item?.warehouse_codes ||
      item?.warehouseCodes ||
      item?.warehouses ||
      item?.warehouse ||
      item?.warehouse_code ||
      item?.warehouseCode
  )
    .map(getWarehouseCodeValue)
    .map((code) => code.trim())
    .filter(Boolean);

const getOcrCodeValue = (item, key) => {
  if (typeof item === 'string' || typeof item === 'number') return String(item);

  return String(item?.[key] || item?.ocr_code || item?.value || item?.code || '');
};

const getUserOcrCodes = (item, key, aliases = []) => {
  const source = [item?.[key], ...aliases.map((alias) => item?.[alias])].find(
    (value) => value !== undefined && value !== null && value !== ''
  );

  return normalizeArray(source)
    .map((value) => getOcrCodeValue(value, key))
    .map((code) => code.trim())
    .filter(Boolean);
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

const isUserActive = (value) => ['1', 'true', 'active', 'aktif', 'enabled'].includes(String(value).trim().toLowerCase());

const getExpeditionList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  const list = Array.isArray(payload) ? payload : (payload?.data ?? payload?.items ?? payload?.expeditions ?? []);

  return Array.isArray(list) ? list : [];
};

export default function UserList() {
  const assignedCustomerCode = getAssignedCustomerCode();
  const { showAlert } = useAlert();
  const [dataSource, setDataSource] = useState([]);
  const [listRole, setListRole] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [listWarehouse, setListWarehouse] = useState([]);
  const [listOcr1, setListOcr1] = useState([]);
  const [listOcr2, setListOcr2] = useState([]);
  const [listOcr3, setListOcr3] = useState([]);
  const [listExpedition, setListExpedition] = useState([]);
  const [loadingWarehouse, setLoadingWarehouse] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [loadingExpedition, setLoadingExpedition] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showView, setShowView] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userActionMenu, setUserActionMenu] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [input, setInput] = useState(initialInput);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
    getListRole();
    getListDistributor();
    getListWarehouse();
    getListOcrCodes();
    getListExpedition();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keywords, selectedRole, selectedStatus]);

  const fetchData = async () => {
    setLoadingData(true);
    const response = await UserServices.getAllUser();
    if (response.data.success) {
      setDataSource(response.data.data);
    } else {
      showAlert('Failed to fetch user data', 'danger');
    }
    setLoadingData(false);
  };

  const getListRole = async () => {
    const response = await RoleServices.fetchAllRoles();
    if (response.data.success) {
      setListRole(response.data.data);
    }
  };

  const getListDistributor = async () => {
    const response = await DistributorServices.getAllDistributor('');
    if (response.data.success) {
      const options = response.data.data
        .map((item) => {
          const customerCode = String(item.code_customer || item.customer_code || '').trim();

          return {
            value: customerCode,
            label: `${customerCode || '-'} - ${item.name || item.customer_name || '-'} - ${item.depo || item.customer_depo || '-'}`,
            id: String(item.id || '').trim(),
            name: item.name
          };
        })
        .filter((item) => item.value);

      setListDistributor(options);
    }
  };

  const getListExpedition = async () => {
    setLoadingExpedition(true);

    try {
      const response = await ExpeditionServices.getExpeditions({ per_page: 1000 });

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch expedition data', 'danger');
        return;
      }

      const options = getExpeditionList(response)
        .map((item) => {
          const code = String(item.code ?? item.expedition_code ?? '').trim();
          const name = String(item.name ?? item.expedition_name ?? '').trim();

          return {
            value: code,
            label: [code, name].filter(Boolean).join(' - ')
          };
        })
        .filter((item) => item.value);

      setListExpedition(options);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch expedition data', 'danger');
    } finally {
      setLoadingExpedition(false);
    }
  };

  const getListWarehouse = async () => {
    setLoadingWarehouse(true);

    try {
      const response = await WarehouseServices.getAllWarehouse('');
      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch warehouse data', 'danger');
        return;
      }

      const payload = response?.data?.data ?? response?.data ?? [];
      const warehouses = Array.isArray(payload) ? payload : (payload?.data ?? payload?.items ?? payload?.warehouses ?? []);

      setListWarehouse(
        (Array.isArray(warehouses) ? warehouses : [])
          .map((warehouse) => {
            const code = String(warehouse.whs_code ?? warehouse.warehouse_code ?? warehouse.code ?? '').trim();
            const name = String(warehouse.whs_name ?? warehouse.warehouse_name ?? warehouse.name ?? '').trim();

            return {
              value: code,
              label: [code, name].filter(Boolean).join(' - ') || '-',
              code,
              name
            };
          })
          .filter((warehouse) => warehouse.value)
      );
    } catch (error) {
      setListWarehouse([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch warehouse data', 'danger');
    } finally {
      setLoadingWarehouse(false);
    }
  };

  const getListOcrCodes = async () => {
    setLoadingOcr(true);

    const normalizeOcrOptions = (response) => {
      const payload = response?.data?.data ?? response?.data ?? [];
      const list = Array.isArray(payload) ? payload : (payload?.data ?? payload?.items ?? payload?.ocr_codes ?? []);

      return (Array.isArray(list) ? list : [])
        .map((item) => {
          const code = String(item.ocr_code ?? item.code ?? '').trim();
          const name = String(item.ocr_name ?? item.name ?? '').trim();

          return {
            value: code,
            label: [code, name].filter(Boolean).join(' - ') || '-',
            code,
            name
          };
        })
        .filter((item) => item.value);
    };

    try {
      const [branchResponse, businessUnitResponse, departmentResponse] = await Promise.all([
        DistributorServices.getOcrByType(1),
        DistributorServices.getOcrByType(2),
        DistributorServices.getOcrByType(3)
      ]);

      if ([branchResponse, businessUnitResponse, departmentResponse].some((response) => response?.data?.success === false)) {
        throw new Error('Failed to fetch OCR code data');
      }

      setListOcr1(normalizeOcrOptions(branchResponse));
      setListOcr2(normalizeOcrOptions(businessUnitResponse));
      setListOcr3(normalizeOcrOptions(departmentResponse));
    } catch (error) {
      setListOcr1([]);
      setListOcr2([]);
      setListOcr3([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch OCR code data', 'danger');
    } finally {
      setLoadingOcr(false);
    }
  };

  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      const keyword = keywords.toLowerCase();
      const matchKeyword =
        item.name?.toLowerCase().includes(keyword) ||
        item.username?.toLowerCase().includes(keyword) ||
        item.email?.toLowerCase().includes(keyword) ||
        item.role?.name?.toLowerCase().includes(keyword) ||
        formatDistributorCodes(item).toLowerCase().includes(keyword) ||
        formatDistributorNames(item).toLowerCase().includes(keyword) ||
        formatAccessibleSystems(item).toLowerCase().includes(keyword);
      const matchStatus = selectedStatus ? String(item.is_active) === selectedStatus : true;
      const matchRole = selectedRole ? String(item.role?.id) === selectedRole || String(item.role_id) === selectedRole : true;

      return matchKeyword && matchStatus && matchRole;
    });
  }, [dataSource, keywords, selectedRole, selectedStatus]);

  const summary = useMemo(
    () => ({
      total: dataSource.length,
      active: dataSource.filter((item) => item.is_active).length,
      inactive: dataSource.filter((item) => !item.is_active).length,
      role: new Set(dataSource.map((item) => item.role?.name).filter(Boolean)).size
    }),
    [dataSource]
  );

  const hasActiveFilter = Boolean(keywords || selectedStatus || selectedRole);
  const pageCount = Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredData]);

  const resetFilters = () => {
    setKeywords('');
    setSelectedStatus('');
    setSelectedRole('');
  };

  const resetForm = () => {
    setInput(initialInput);
    setShowPassword(false);
    setShowMenu(false);
    setShowView(false);
    setSelectedUser(null);
    setSelectedUserId(null);
    setUserActionMenu(null);
    setFormMode('create');
  };

  const handleSetState = (key, event) => {
    setInput({
      ...input,
      [key]: event.target.value
    });
  };

  const handleSelectDistributor = (options) => {
    const selectedOptions = options || [];
    const hasAllDistributor = selectedOptions.some((option) => option.value === ALL_DISTRIBUTORS_VALUE);

    setInput({
      ...input,
      distributorCodes: hasAllDistributor ? [ALL_DISTRIBUTORS_VALUE] : selectedOptions.map((option) => option.value),
      distributorIds: hasAllDistributor ? [ALL_DISTRIBUTORS_VALUE] : selectedOptions.map((option) => option.id)
    });
  };

  const handleSelectAccessibleSystems = (options) => {
    const selectedSystems = (options || []).map((option) => option.value);

    setInput((currentInput) => ({
      ...currentInput,
      accessibleSystems: selectedSystems,
      expeditionCode: selectedSystems.includes(SYSTEM_KEYS.EXPEDITION) ? currentInput.expeditionCode : '',
      distributorCodes: selectedSystems.includes(SYSTEM_KEYS.CUSTOMER_PORTAL) ? currentInput.distributorCodes : [],
      distributorIds: selectedSystems.includes(SYSTEM_KEYS.CUSTOMER_PORTAL) ? currentInput.distributorIds : []
    }));
  };

  const handleSelectExpedition = (option) => {
    setInput({
      ...input,
      expeditionCode: option?.value || ''
    });
  };

  const handleSelectWarehouse = (option) => {
    setInput({
      ...input,
      whsCodes: (option || []).map((warehouse) => warehouse.value)
    });
  };

  const handleSelectOcr = (field) => (options) => {
    setInput((currentInput) => ({
      ...currentInput,
      [field]: (options || []).map((option) => option.value)
    }));
  };

  const distributorOptions = assignedCustomerCode ? listDistributor : [allDistributorOption, ...listDistributor];
  const isAllDistributorSelected = input.distributorCodes.includes(ALL_DISTRIBUTORS_VALUE);
  const selectedDistributor = isAllDistributorSelected
    ? [allDistributorOption]
    : listDistributor.filter((item) => input.distributorCodes.includes(item.value));
  const selectedAccessibleSystems = accessibleSystemOptions.filter((item) => input.accessibleSystems.includes(item.value));
  const selectedExpedition = listExpedition.find((item) => item.value === input.expeditionCode) || null;
  const selectedSapOriginator = sapOriginatorOptions.find((item) => item.value === input.originator) || null;
  const selectedSapStage = sapStageOptions.find((item) => item.value === input.stage) || null;
  const availableActionMenus = actionMenuOptions.filter((item) => input.accessibleSystems.includes(item.systemKey));
  const selectedWarehouses = input.whsCodes.map(
    (code) => listWarehouse.find((warehouse) => warehouse.value === code) || { value: code, label: code }
  );
  const getSelectedOcrOptions = (codes, options) =>
    codes.map((code) => options.find((option) => option.value === code) || { value: code, label: code });
  const selectedOcr1 = getSelectedOcrOptions(input.ocrCodes, listOcr1);
  const selectedOcr2 = getSelectedOcrOptions(input.ocrCodes2, listOcr2);
  const selectedOcr3 = getSelectedOcrOptions(input.ocrCodes3, listOcr3);
  const hasCustomerPortalAccess = input.accessibleSystems.includes(SYSTEM_KEYS.CUSTOMER_PORTAL);
  const hasExpeditionAccess = input.accessibleSystems.includes(SYSTEM_KEYS.EXPEDITION);
  const selectedUserAccessibleSystems = selectedUser ? getUserAccessibleSystems(selectedUser) : [];
  const selectedUserDistributors = selectedUser ? getUserDistributors(selectedUser) : [];
  const selectedUserExpeditionCode = selectedUser ? String(getUserExpeditionCode(selectedUser)) : '';
  const selectedUserExpedition = listExpedition.find((item) => item.value === selectedUserExpeditionCode);
  const formatUserOcrCodes = (key, aliases, options) =>
    getUserOcrCodes(selectedUser, key, aliases)
      .map((code) => options.find((option) => option.value === code)?.label || code)
      .join(', ') || '-';
  const getSelectedDistributorPayload = () => ({
    code_customer: isAllDistributorSelected ? listDistributor.map((item) => item.value) : input.distributorCodes,
    id_distributor: isAllDistributorSelected ? listDistributor.map((item) => item.id) : input.distributorIds
  });
  const getActionAssignmentPayload = () =>
    availableActionMenus
      .map((menu) => {
        const registeredActions = getRegisteredMenuActions(menu.id);
        const selectedActions = (input.actionAssignments[menu.id] || []).filter((action) => registeredActions.includes(action));
        return {
          menu_key: menu.menu_key,
          actions: {
            create: selectedActions.includes('add') || selectedActions.includes('upload'),
            read: selectedActions.includes('view'),
            update: selectedActions.includes('edit'),
            delete: selectedActions.includes('delete'),
            approve: selectedActions.includes('approve'),
            export: selectedActions.includes('download'),
            sync: selectedActions.includes('sync')
          }
        };
      })
      .filter((assignment) => Object.values(assignment.actions).some(Boolean));

  const handleActionAssignment = (menuId, action, isChecked) => {
    setInput((currentInput) => {
      const currentActions = currentInput.actionAssignments[menuId] || [];
      const actions = isChecked
        ? [...new Set([...currentActions, action])]
        : currentActions.filter((currentAction) => currentAction !== action);

      return {
        ...currentInput,
        actionAssignments: {
          ...currentInput.actionAssignments,
          [menuId]: actions
        }
      };
    });
  };
  const actionableMenus = availableActionMenus.filter((menu) => getRegisteredMenuActions(menu.id).length);
  const allActionsChecked =
    actionableMenus.length > 0 &&
    actionableMenus.every((menu) =>
      getRegisteredMenuActions(menu.id).every((action) => input.actionAssignments[menu.id]?.includes(action))
    );
  const handleCheckAllActions = (isChecked) => {
    setInput((currentInput) => {
      const actionAssignments = { ...currentInput.actionAssignments };

      availableActionMenus.forEach((menu) => {
        actionAssignments[menu.id] = isChecked ? getRegisteredMenuActions(menu.id) : [];
      });

      return { ...currentInput, actionAssignments };
    });
  };

  const openCreateModal = () => {
    setFormMode('create');
    setInput(initialInput);
    setShowPassword(false);
    setShowMenu(true);
  };

  const showEditModal = (item) => {
    const distributors = getUserDistributors(item);
    const distributorCodes = distributors.flatMap((distributor) => normalizeArray(distributor.code)).map(String);
    const distributorIds = distributors.flatMap((distributor) => normalizeArray(distributor.id)).map(String);
    const hasAllDistributors =
      listDistributor.length > 0 &&
      distributorCodes.length === listDistributor.length &&
      listDistributor.every((distributor) => distributorCodes.includes(distributor.value));

    setFormMode('edit');
    setSelectedUserId(item.id);
    setShowView(false);
    setInput({
      name: item.name || '',
      username: item.username || '',
      email: item.email || '',
      password: '',
      roleId: item.role?.id || item.role_id || '',
      expeditionCode: String(getUserExpeditionCode(item) || ''),
      whsCodes: getUserWarehouseCodes(item),
      ocrCodes: getUserOcrCodes(item, 'ocr_code', ['ocrCode', 'branches', 'branch_codes']),
      ocrCodes2: getUserOcrCodes(item, 'ocr_code2', ['ocrCode2', 'business_units', 'business_unit_codes']),
      ocrCodes3: getUserOcrCodes(item, 'ocr_code3', ['ocrCode3', 'departments', 'department_codes']),
      originator: String(item.originator ?? item.sap_originator ?? ''),
      stage: String(item.stage ?? item.sap_stage ?? ''),
      accessibleSystems: getUserAccessibleSystems(item),
      distributorCodes: hasAllDistributors ? [ALL_DISTRIBUTORS_VALUE] : distributorCodes,
      distributorIds: hasAllDistributors ? [ALL_DISTRIBUTORS_VALUE] : distributorIds,
      actionAssignments: normalizeActionAssignments(
        item.actions || item.action_assignments || item.actionAssignments || item.menu_actions || item.menuActions
      )
    });
    setShowPassword(false);
    setShowMenu(true);
  };

  const getUserDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const response = await UserServices.getUserDetail(id);

      if (!response.data.success) {
        showAlert(response.data.message || 'Failed to fetch user detail', 'danger');
        return null;
      }

      return response.data.data;
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to fetch user detail', 'danger');
      return null;
    } finally {
      setLoadingDetail(false);
    }
  };

  const openEditModal = async (item) => {
    const userDetail = await getUserDetail(item.id);
    if (userDetail) showEditModal(userDetail);
  };

  const openViewModal = async (item) => {
    const userDetail = await getUserDetail(item.id);
    if (userDetail) {
      setSelectedUser(userDetail);
      setShowView(true);
    }
  };

  const handleCreate = async () => {
    setLoadingSubmit(true);
    const distributorPayload = getSelectedDistributorPayload();
    const payload = {
      name: input.name,
      username: input.username,
      email: input.email,
      password: input.password,
      role_id: input.roleId,
      expedition_code: input.expeditionCode || null,
      whs_code: input.whsCodes,
      ocr_code: input.ocrCodes,
      ocr_code2: input.ocrCodes2,
      ocr_code3: input.ocrCodes3,
      originator: input.originator || null,
      stage: input.stage || null,
      accessible_systems: input.accessibleSystems,
      actions: getActionAssignmentPayload(),
      code_customer: distributorPayload.code_customer?.toString(),
      id_distributor: distributorPayload.id_distributor?.toString()
    };

    const response = await UserServices.postCreateUser(payload);
    if (response.data.success) {
      showAlert('User added successfully', 'success');
      resetForm();
      fetchData();
    } else {
      showAlert(response.data.message || 'Failed to add user', 'danger');
    }
    setLoadingSubmit(false);
  };

  const handleEdit = async () => {
    setLoadingSubmit(true);
    const distributorPayload = getSelectedDistributorPayload();
    const payload = {
      name: input.name,
      username: input.username,
      email: input.email,
      role_id: input.roleId,
      expedition_code: input.expeditionCode || null,
      whs_code: input.whsCodes,
      ocr_code: input.ocrCodes,
      ocr_code2: input.ocrCodes2,
      ocr_code3: input.ocrCodes3,
      originator: input.originator || null,
      stage: input.stage || null,
      accessible_systems: input.accessibleSystems,
      actions: getActionAssignmentPayload(),
      code_customer: distributorPayload.code_customer?.toString(),
      id_distributor: distributorPayload.id_distributor?.toString()
    };

    if (input.password) {
      payload.password = input.password;
    }
    const response = await UserServices.putEditUser(selectedUserId, payload);
    if (response.data.success) {
      showAlert('User updated successfully', 'success');
      resetForm();
      fetchData();
    } else {
      showAlert(response.data.message || 'Failed to update user', 'danger');
    }
    setLoadingSubmit(false);
  };

  const handleShowConfirm = (id) => {
    setSelectedUserId(id);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    const response = await UserServices.deleteUser(selectedUserId);
    if (response.data.success) {
      showAlert('User deleted successfully', 'success');
      setSelectedUserId(null);
      setShowConfirm(false);
      fetchData();
    } else {
      showAlert(response.data.message || 'Failed to delete user', 'danger');
    }
  };

  const formIsValid = Boolean(
    input.name && input.username && input.email && input.roleId && input.accessibleSystems.length && (formMode === 'edit' || input.password)
  );

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">User List</h5>
              <span className="text-muted f-12">Manage users, roles, and distributor channel account status.</span>
            </Stack>
          }
          secondary={
            <Button onClick={openCreateModal} variant="primary">
              <i className="ti ti-user-plus me-1" />
              Add User
            </Button>
          }
        >
          <Row className="g-3">
            <Col sm={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <div>
                      <div className="text-muted f-12">Total User</div>
                      <h4 className="mb-0">{summary.total}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-users" />
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
                      <div className="text-muted f-12">Active</div>
                      <h4 className="mb-0">{summary.active}</h4>
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
                      <div className="text-muted f-12">Inactive</div>
                      <h4 className="mb-0">{summary.inactive}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-secondary text-secondary">
                      <i className="ti ti-circle-x" />
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
                      <div className="text-muted f-12">Role Terpakai</div>
                      <h4 className="mb-0">{summary.role}</h4>
                    </div>
                    <span className="avtar avtar-s bg-light-warning text-warning">
                      <i className="ti ti-shield-lock" />
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
              <Form.Label className="f-12 text-muted">Search User</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder="Name, email, role, distributor"
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6}>
              <Form.Label className="f-12 text-muted">Role</Form.Label>
              <Form.Select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                <option value="">All Roles</option>
                {listRole.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={2} md={6}>
              <Form.Label className="f-12 text-muted">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Form.Select>
            </Col>
            <Col lg={1} md={6}>
              <Button className="w-100" variant="light-secondary" disabled={!hasActiveFilter} onClick={resetFilters}>
                <i className="ti ti-refresh" />
              </Button>
            </Col>
            <Col lg={2} md={6} className="text-lg-end">
              <span className="text-muted f-12">Showing</span>
              <div className="fw-semibold">
                {filteredData.length} of {dataSource.length}
              </div>
            </Col>
          </Row>

          <Table className="mb-0 align-middle" responsive hover>
            {loadingData ? (
              <tbody>
                <tr>
                  <td colSpan={5}>
                    <LoaderData />
                  </td>
                </tr>
              </tbody>
            ) : (
              <>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>User</th>
                    <th style={{ minWidth: 180 }}>Accessible Module</th>
                    <th style={{ minWidth: 180 }}>Access Rights</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th className="text-center" style={{ width: 120 }}>
                      #
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Stack direction="horizontal" gap={2}>
                            <span className="sm-account-avatar">{item.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            <div>
                              <div className="fw-semibold">{item.name || '-'}</div>
                              <small className="text-muted">{item.username || '-'}</small>
                            </div>
                          </Stack>
                        </td>
                        <td>
                          <Stack direction="horizontal" gap={1} className="flex-wrap">
                            {getUserAccessibleSystems(item).length ? (
                              accessibleSystemOptions
                                .filter((system) => getUserAccessibleSystems(item).includes(system.value))
                                .map((system) => (
                                  <span
                                    className="badge"
                                    key={system.value}
                                    style={{
                                      backgroundColor: system.color,
                                      color: '#fff',
                                      border: `1px solid ${system.color}`
                                    }}
                                  >
                                    {system.label}
                                  </span>
                                ))
                            ) : (
                              <span>-</span>
                            )}
                          </Stack>
                        </td>
                        <td>
                          <Badge bg="light" text="dark">
                            {item.role?.name || '-'}
                          </Badge>
                        </td>
                        <td>{item.is_active ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                        <td className="text-center">
                          <Button
                            size="sm"
                            variant={String(userActionMenu?.user?.id) === String(item.id) ? 'primary' : 'outline-primary'}
                            disabled={loadingDetail}
                            aria-label={`Open actions for ${item.name || item.username || 'user'}`}
                            aria-expanded={String(userActionMenu?.user?.id) === String(item.id)}
                            onClick={(event) =>
                              setUserActionMenu((current) =>
                                String(current?.user?.id) === String(item.id) ? null : { user: item, target: event.currentTarget }
                              )
                            }
                          >
                            <i className="ti ti-dots-vertical me-1" />
                            Actions
                            <i className="ti ti-chevron-down ms-1" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="text-center py-5">
                          <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                            <i className="ti ti-users f-24" />
                          </div>
                          <h5 className="mb-1">{hasActiveFilter ? 'User not found' : 'No user data yet'}</h5>
                          <p className="text-muted mb-3">
                            {hasActiveFilter ? 'Change the filter to view other users.' : 'Add users to grant application access.'}
                          </p>
                          {hasActiveFilter ? (
                            <Button variant="light-primary" onClick={resetFilters}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button variant="primary" onClick={openCreateModal}>
                              <i className="ti ti-user-plus me-1" />
                              Add User
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </Table>
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredData.length}
            itemLabel="user"
          />
        </MainCard>
      </Stack>

      <Overlay
        show={Boolean(userActionMenu)}
        target={userActionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setUserActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const user = userActionMenu?.user;

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 180 }}
            >
              <button
                type="button"
                className="dropdown-item"
                disabled={loadingDetail}
                onClick={() => {
                  setUserActionMenu(null);
                  if (user) openViewModal(user);
                }}
              >
                <i className="ti ti-eye text-primary me-2" />
                View
              </button>
              <button
                type="button"
                className="dropdown-item"
                disabled={loadingDetail}
                onClick={() => {
                  setUserActionMenu(null);
                  if (user) openEditModal(user);
                }}
              >
                <i className="ti ti-pencil text-warning me-2" />
                Edit
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={() => {
                  setUserActionMenu(null);
                  if (user) handleShowConfirm(user.id);
                }}
              >
                <i className="ti ti-trash me-2" />
                Delete
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal show={showMenu} onHide={resetForm} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{formMode === 'edit' ? 'Edit User' : 'Add User'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="account" className="mb-3" mountOnEnter>
            <Tab eventKey="account" title="Account & Access">
              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <Stack direction="horizontal" gap={2}>
                    <i className="ti ti-user text-primary" />
                    <h6 className="mb-0">Account & Access</h6>
                  </Stack>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Full name"
                        value={input.name}
                        onChange={(event) => handleSetState('name', event)}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Username</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Username login"
                        value={input.username}
                        onChange={(event) => handleSetState('username', event)}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="name@email.com"
                        value={input.email}
                        onChange={(event) => handleSetState('email', event)}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Access Rights</Form.Label>
                      <Form.Select value={input.roleId} onChange={(event) => handleSetState('roleId', event)}>
                        <option value="">Select Access Rights</option>
                        {listRole.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col xs={12}>
                      <Form.Label className="f-12 text-muted">Accessible Module</Form.Label>
                      <Select
                        value={selectedAccessibleSystems}
                        options={accessibleSystemOptions}
                        menuPosition="fixed"
                        onChange={handleSelectAccessibleSystems}
                        placeholder="Select accessible module"
                        isClearable
                        isMulti
                        closeMenuOnSelect={false}
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Label className="f-12 text-muted">{formMode === 'edit' ? 'New Password' : 'Password'}</Form.Label>
                      <div className="sm-user-password-field">
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          placeholder={formMode === 'edit' ? 'Leave blank if unchanged' : 'Initial password'}
                          value={input.password}
                          onChange={(event) => handleSetState('password', event)}
                        />
                        <Button
                          type="button"
                          variant="link"
                          className="sm-user-password-toggle"
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="organization" title="Organizational Assignment">
              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <Stack direction="horizontal" gap={2}>
                    <i className="ti ti-building-warehouse text-primary" />
                    <h6 className="mb-0">Organizational Assignment</h6>
                  </Stack>
                </Card.Header>
                <Card.Body>
                  <div className="alert alert-info d-flex align-items-start gap-2 py-2 px-3 mb-3" role="note">
                    <i className="ti ti-info-circle mt-1" />
                    <small>Leave a field blank to grant access to all values in that category.</small>
                  </div>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Form.Label className="f-12 text-muted">Warehouse</Form.Label>
                      <Select
                        value={selectedWarehouses}
                        options={listWarehouse}
                        menuPosition="fixed"
                        onChange={handleSelectWarehouse}
                        placeholder={loadingWarehouse ? 'Loading warehouses...' : 'Select warehouse'}
                        isLoading={loadingWarehouse}
                        isClearable
                        isSearchable
                        isMulti
                        closeMenuOnSelect={false}
                        noOptionsMessage={() => 'No warehouse found'}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Branch</Form.Label>
                      <Select
                        value={selectedOcr1}
                        options={listOcr1}
                        menuPosition="fixed"
                        onChange={handleSelectOcr('ocrCodes')}
                        placeholder={loadingOcr ? 'Loading branches...' : 'Select branch'}
                        isLoading={loadingOcr}
                        isClearable
                        isSearchable
                        isMulti
                        closeMenuOnSelect={false}
                        noOptionsMessage={() => 'No branch found'}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Business Unit</Form.Label>
                      <Select
                        value={selectedOcr2}
                        options={listOcr2}
                        menuPosition="fixed"
                        onChange={handleSelectOcr('ocrCodes2')}
                        placeholder={loadingOcr ? 'Loading business units...' : 'Select business unit'}
                        isLoading={loadingOcr}
                        isClearable
                        isSearchable
                        isMulti
                        closeMenuOnSelect={false}
                        noOptionsMessage={() => 'No business unit found'}
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Label className="f-12 text-muted">Department</Form.Label>
                      <Select
                        value={selectedOcr3}
                        options={listOcr3}
                        menuPosition="fixed"
                        onChange={handleSelectOcr('ocrCodes3')}
                        placeholder={loadingOcr ? 'Loading departments...' : 'Select department'}
                        isLoading={loadingOcr}
                        isClearable
                        isSearchable
                        isMulti
                        closeMenuOnSelect={false}
                        noOptionsMessage={() => 'No department found'}
                      />
                    </Col>
                    {hasExpeditionAccess ? (
                      <Col xs={12}>
                        <Form.Label className="f-12 text-muted">Expedition</Form.Label>
                        <Select
                          value={selectedExpedition}
                          options={listExpedition}
                          menuPosition="fixed"
                          onChange={handleSelectExpedition}
                          placeholder={loadingExpedition ? 'Loading expedition...' : 'Select expedition'}
                          isLoading={loadingExpedition}
                          isClearable
                        />
                      </Col>
                    ) : null}
                    {hasCustomerPortalAccess ? (
                      <Col xs={12}>
                        <Form.Label className="f-12 text-muted">Distributor</Form.Label>
                        <Select
                          value={selectedDistributor}
                          options={distributorOptions}
                          menuPosition="fixed"
                          onChange={handleSelectDistributor}
                          placeholder="Select distributor"
                          isClearable
                          isMulti
                          closeMenuOnSelect={false}
                        />
                      </Col>
                    ) : null}
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="sap" title="SAP Assignment">
              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <Stack direction="horizontal" gap={2}>
                    <i className="ti ti-plug-connected text-primary" />
                    <h6 className="mb-0">SAP Assignment</h6>
                  </Stack>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Originator</Form.Label>
                      <Select
                        value={selectedSapOriginator}
                        options={sapOriginatorOptions}
                        menuPosition="fixed"
                        onChange={(option) => setInput((currentInput) => ({ ...currentInput, originator: option?.value || '' }))}
                        placeholder="Select Originator"
                        isClearable
                        isSearchable
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="f-12 text-muted">Stage</Form.Label>
                      <Select
                        value={selectedSapStage}
                        options={sapStageOptions}
                        menuPosition="fixed"
                        onChange={(option) => setInput((currentInput) => ({ ...currentInput, stage: option?.value || '' }))}
                        placeholder="Select Stage"
                        isClearable
                        isSearchable
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="actions" title="Action Assignment">
              <Card className="border mb-0">
                <Card.Header className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between">
                    <Stack direction="horizontal" gap={2}>
                      <i className="ti ti-checkbox text-primary" />
                      <div>
                        <h6 className="mb-0">Action Assignment</h6>
                        <small className="text-muted">Select the actions this user can perform on each menu.</small>
                      </div>
                    </Stack>
                    <Form.Check
                      type="switch"
                      id="user-action-check-all"
                      label="Check All"
                      checked={allActionsChecked}
                      disabled={!availableActionMenus.length}
                      onChange={(event) => handleCheckAllActions(event.target.checked)}
                    />
                  </Stack>
                </Card.Header>
                <Card.Body className="p-0" style={{ maxHeight: 420, overflow: 'auto' }}>
                  {availableActionMenus.length ? (
                    <Table hover className="mb-0 align-middle text-nowrap">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bs-body-bg)' }}>
                        <tr>
                          <th className="ps-3">Menu Name</th>
                          {userActions.map((action) => (
                            <th key={action.value} className="text-center">
                              {action.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {availableActionMenus.map((menu) => (
                          <tr key={`${menu.systemKey}-${menu.id}`}>
                            <td className="ps-3">
                              <div className="fw-semibold">
                                <span className="text-muted fw-normal">{menu.menu_key} - </span>
                                {menu.title}
                              </div>
                              <small className="text-muted">{menu.systemTitle}</small>
                            </td>
                            {userActions.map((action) => {
                              const isRegistered = getRegisteredMenuActions(menu.id).includes(action.value);
                              return (
                                <td key={action.value} className="text-center">
                                  {isRegistered ? (
                                    <Form.Check
                                      type="switch"
                                      id={`user-action-${menu.systemKey}-${menu.id}-${action.value}`}
                                      aria-label={`${action.label} ${menu.title}`}
                                      checked={(input.actionAssignments[menu.id] || []).includes(action.value)}
                                      onChange={(event) => handleActionAssignment(menu.id, action.value, event.target.checked)}
                                    />
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted py-5">Select an accessible module on the Account &amp; Access tab first.</div>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={resetForm}>
            Cancel
          </Button>
          <Button variant="primary" onClick={formMode === 'edit' ? handleEdit : handleCreate} disabled={loadingSubmit || !formIsValid}>
            {loadingSubmit ? <LoaderButton /> : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showView} onHide={resetForm} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>User Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row className="g-3">
              <Col lg={4}>
                <Card className="border mb-0 h-100">
                  <Card.Body className="text-center">
                    <span className="sm-account-avatar sm-account-avatar-lg mb-3">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <h6 className="mb-1">{selectedUser.name || '-'}</h6>
                    <p className="text-muted mb-3">{selectedUser.email || '-'}</p>
                    {isUserActive(selectedUser.is_active ?? selectedUser.active ?? selectedUser.status) ? (
                      <Badge bg="success">Active</Badge>
                    ) : (
                      <Badge bg="secondary">Inactive</Badge>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={8}>
                <Card className="border mb-0 h-100">
                  <Card.Header className="py-3">
                    <h6 className="mb-0">Account Information</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Label className="f-12 text-muted">User ID</Form.Label>
                        <div className="fw-semibold">{selectedUser.id || '-'}</div>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="f-12 text-muted">Username</Form.Label>
                        <div className="fw-semibold">{selectedUser.username || '-'}</div>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="f-12 text-muted">Full Name</Form.Label>
                        <div>{selectedUser.name || '-'}</div>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="f-12 text-muted">Email</Form.Label>
                        <div>{selectedUser.email || '-'}</div>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="f-12 text-muted">Created At</Form.Label>
                        <div>{formatDateTime(selectedUser.created_at || selectedUser.createdAt)}</div>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="f-12 text-muted">Updated At</Form.Label>
                        <div>{formatDateTime(selectedUser.updated_at || selectedUser.updatedAt)}</div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12}>
                <Card className="border mb-0">
                  <Card.Header className="py-3">
                    <h6 className="mb-0">Access Information</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Role ID</Form.Label>
                        <div>{selectedUser.role?.id || selectedUser.role_id || '-'}</div>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Access Rights</Form.Label>
                        <div className="fw-semibold">
                          {selectedUser.role?.name || selectedUser.role_name || selectedUser.roleName || '-'}
                        </div>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Approval Permission</Form.Label>
                        <div>
                          {selectedUser.role?.role_menu?.approval?.label ||
                            selectedUser.role?.role_menu?.approval?.name ||
                            selectedUser.role?.approval?.label ||
                            selectedUser.role?.approval?.name ||
                            '-'}
                        </div>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Warehouse</Form.Label>
                        <div className="fw-semibold">
                          {getUserWarehouseCodes(selectedUser)
                            .map((code) => listWarehouse.find((warehouse) => warehouse.value === code)?.label || code)
                            .join(', ') || '-'}
                        </div>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Branch</Form.Label>
                        <div>{formatUserOcrCodes('ocr_code', ['ocrCode', 'branches', 'branch_codes'], listOcr1)}</div>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Business Unit</Form.Label>
                        <div>{formatUserOcrCodes('ocr_code2', ['ocrCode2', 'business_units', 'business_unit_codes'], listOcr2)}</div>
                      </Col>
                      <Col md={4}>
                        <Form.Label className="f-12 text-muted">Department</Form.Label>
                        <div>{formatUserOcrCodes('ocr_code3', ['ocrCode3', 'departments', 'department_codes'], listOcr3)}</div>
                      </Col>
                      <Col xs={12}>
                        <Form.Label className="f-12 text-muted">Accessible Module</Form.Label>
                        <Stack direction="horizontal" gap={2} className="flex-wrap">
                          {selectedUserAccessibleSystems.length ? (
                            accessibleSystemOptions
                              .filter((option) => selectedUserAccessibleSystems.includes(option.value))
                              .map((option) => (
                                <Badge bg="light" text="dark" key={option.value}>
                                  {option.label}
                                </Badge>
                              ))
                          ) : (
                            <span>-</span>
                          )}
                        </Stack>
                      </Col>
                      {selectedUserAccessibleSystems.includes(SYSTEM_KEYS.EXPEDITION) || selectedUserExpeditionCode ? (
                        <Col md={6}>
                          <Form.Label className="f-12 text-muted">Expedition</Form.Label>
                          <div className="fw-semibold">
                            {selectedUserExpedition?.label ||
                              [selectedUserExpeditionCode, selectedUser.expedition?.name || selectedUser.expedition?.expedition_name]
                                .filter(Boolean)
                                .join(' - ') ||
                              '-'}
                          </div>
                        </Col>
                      ) : null}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              {selectedUserAccessibleSystems.includes(SYSTEM_KEYS.CUSTOMER_PORTAL) || selectedUserDistributors.length ? (
                <Col xs={12}>
                  <Card className="border mb-0">
                    <Card.Header className="py-3">
                      <Stack direction="horizontal" className="justify-content-between">
                        <h6 className="mb-0">Distributor Access</h6>
                        <Badge bg="light" text="dark">
                          {selectedUserDistributors.length} distributor
                        </Badge>
                      </Stack>
                    </Card.Header>
                    <Table className="mb-0 align-middle" responsive hover>
                      <thead>
                        <tr>
                          <th style={{ width: 70 }}>#</th>
                          <th>Code</th>
                          <th>Distributor Name</th>
                          <th>Depo</th>
                          <th>Contact</th>
                          <th>Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserDistributors.length ? (
                          selectedUserDistributors.map((distributor, index) => (
                            <tr key={distributor.id || distributor.code || index}>
                              <td>{index + 1}</td>
                              <td className="fw-semibold">{distributor.code || '-'}</td>
                              <td>{distributor.name || '-'}</td>
                              <td>{distributor.depo || '-'}</td>
                              <td>
                                <div>{distributor.phone || '-'}</div>
                                {distributor.email ? <small className="text-muted">{distributor.email}</small> : null}
                              </td>
                              <td style={{ whiteSpace: 'normal', minWidth: 220 }}>{distributor.address || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-4">
                              No distributor assigned.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card>
                </Col>
              ) : null}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={resetForm}>
            Close
          </Button>
          {selectedUser && (
            <Button variant="primary" onClick={() => openEditModal(selectedUser)}>
              <i className="ti ti-pencil me-1" />
              Edit User
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onSubmit={handleDelete}
        title="Delete User"
        subTitle="Are you sure you want to delete this user data?"
      />
    </>
  );
}
