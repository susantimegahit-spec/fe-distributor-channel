import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Table from 'react-bootstrap/Table';
import Select from 'react-select';

// project-imports
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import FinanceServices from '../../../services/customer-portal/FinanceServices';
import PromoServices from '../../../services/customer-portal/PromoServices';
import RoleServices from '../../../services/setting/RoleServices';
import { useAlert } from '../../../utils/alertContext';
import { getCookies } from '../../../utils/cookies';
import ConfirmDialog from 'components/ConfirmDialog';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LoaderData from '../../../components/LoaderData';
import BalanceLedger from './BalanceLedger';

const pageSize = 10;

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const parseCurrencyInput = (value) => String(value || '').replace(/\D/g, '');

const getTodayDate = () => {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;

  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const normalizeStatus = (value) => {
  const status = String(value || '').toLowerCase();

  if (['success', 'successful', 'completed', 'complete', 'claimed', 'processed'].includes(status)) return 'claimed';
  if (['failed', 'failure', 'rejected', 'reject', 'error'].includes(status)) return 'rejected';

  return 'pending';
};

const normalizeApprovalText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .toUpperCase();

const getWithdrawStatusVariant = (status) => {
  const normalizedStatus = normalizeApprovalText(status);

  if (['APPROVED', 'SUCCESS', 'COMPLETED', 'PAID'].includes(normalizedStatus)) return 'success';
  if (['REJECTED', 'FAILED', 'CANCELED', 'CANCELLED'].includes(normalizedStatus)) return 'danger';

  return 'warning';
};

const getSellOutStatusKey = (status) => normalizeApprovalText(status) || '__EMPTY__';

const getSellOutStatusFilterKey = (status) => (getSellOutStatusKey(status) === 'VALID_PROGRAM' ? 'VALID_PROGRAM' : 'NOT_VALID');

const getSellOutStatusLabel = (status) => String(status || '').trim() || 'Unknown';

const getSellOutStatusVariant = (status) => (getSellOutStatusKey(status) === 'VALID_PROGRAM' ? 'success' : 'danger');

const getResponseList = (response, keys = []) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.[key]?.data)) return payload[key].data;
  }

  return [];
};

const getBankCode = (value = {}) => {
  const item = value || {};

  return (
    item.bank_code ||
    item.bankCode ||
    item.bank?.bank_code ||
    item.bank?.code ||
    item.customer?.bank_code ||
    item.customer?.bankCode ||
    item.distributor?.bank_code ||
    item.distributor?.bankCode ||
    ''
  );
};

const getAccountBankNumber = (value = {}) => {
  const item = value || {};

  return (
    item.account_bank_number ||
    item.accountBankNumber ||
    item.bank_account_number ||
    item.bankAccountNumber ||
    item.bank?.account_bank_number ||
    item.bank?.accountBankNumber ||
    item.customer?.account_bank_number ||
    item.customer?.accountBankNumber ||
    item.distributor?.account_bank_number ||
    item.distributor?.accountBankNumber ||
    ''
  );
};

const formatBankAccount = (value = {}) => {
  const item = value || {};
  const bankCode = getBankCode(item);
  const accountNumber = getAccountBankNumber(item);
  const bankAccount = item.bank_account || item.bankAccount || item.bank?.account || '';

  if (bankCode && accountNumber) return `${bankCode} - ${accountNumber}`;
  return bankAccount || bankCode || accountNumber || '-';
};

const normalizeVerified = (item) => {
  const value =
    item.is_verified ?? item.verified ?? item.isVerified ?? item.verification_status ?? item.verified_status ?? item.status_verifikasi;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const status = String(value || '').toLowerCase();

  if (['not_verified', 'not verified', 'unverified', 'belum verified', 'belum verifikasi', '0', 'false'].includes(status)) return false;
  if (['verified', 'sudah verified', 'sudah verifikasi', '1', 'true'].includes(status)) return true;

  return false;
};

const normalizeBatch = (batch, index) => ({
  id: batch.id || batch.batch_id || batch.claim_batch_id || batch.upload_batch_id || batch.upload_id || index,
  claimNo: batch.batch_no || batch.batch_code || batch.claim_no || batch.reference_no || `BATCH-${batch.id || index + 1}`,
  fileName: batch.file_name || batch.original_file_name || batch.original_filename || batch.filename || '-',
  uploadedBy: batch.uploaded_by_name || batch.uploaded_by || batch.created_by_name || batch.created_by || '-',
  uploadedAt: batch.created_at || batch.uploaded_at || batch.createdAt || '',
  customerName: batch.customer_name || '',
  depo: batch.depo || batch.customer_depo || '',
  rewardAmount: Number(batch.total_diskon_verified || 0),
  verifiedAmount: Number(batch.total_diskon_verified || 0),
  totalClaim: Number(batch.total_diskon_verified || 0),
  totalDeducted: Number(batch.total_deducted || 0),
  balance: Number(batch.total_diskon_verified || 0) - Number(batch.total_deducted || 0),
  totalTransactions: Number(batch.total_rows || batch.total_records || batch.result_count || batch.total_transactions || 0),
  status: normalizeStatus(batch.status || batch.process_status || batch.processing_status),
  sellOut: []
});

const normalizeUploadResult = (item, index) => ({
  id: item.id || item.result_id || index,
  customerCode: item.customer_code || item.code_customer || item.distributor_code || '',
  customerName: item.customer_name || item.name_customer || item.distributor_name || '',
  itemCode: item.item_code || item.code_item || '',
  itemName: item.item_name || item.name_item || '',
  qty: item?.qty_kg,
  customerType: item.customer_type || item.type_customer || '',
  date: item.transaction_date || item.transcation_date || item.sell_out_date || item.created_at || '',
  amount1: Number(item?.harga_program_per_kg),
  amount2: Number(item?.sell_price_per_kg),
  rewardAmount: Number(item.diskon_per_kg),
  status: String(item.status || '').replace('_', ' '),
  verified: normalizeVerified(item)
});

const normalizeWithdraw = (item, index) => ({
  id: item.id || item.withdraw_id || item.claim_withdraw_id || index,
  withdrawNo: item.withdraw_no || item.withdraw_code || item.reference_no || `WD-${item.id || index + 1}`,
  customerCode:
    item.customer_code ||
    item.code_customer ||
    item.distributor_code ||
    item.customer?.code_customer ||
    item.customer?.customer_code ||
    item.distributor?.code_customer ||
    item.distributor?.customer_code ||
    '',
  customerName:
    item.customer_name ||
    item.name_customer ||
    item.distributor_name ||
    item.customer?.name ||
    item.customer?.name_distributor ||
    item.distributor?.name ||
    item.distributor?.name_distributor ||
    '',
  submittedAt: item.created_at || item.submitted_at || item.withdraw_date || item.createdAt || '',
  transferDate: item.transfer_date || item.transfer_at || item.transferred_at || item.transferDate || '',
  amount: Number(item.amount || item.nominal || item.withdraw_amount || item.total_amount || 0),
  status: String(item.status || item.withdraw_status || 'pending').replace('_', ' '),
  bankCode: getBankCode(item),
  accountBankNumber: getAccountBankNumber(item),
  bankAccount: formatBankAccount(item)
});

const normalizeTotalReward = (response) => {
  const payload = response?.data?.data;
  const source = Array.isArray(payload) ? payload[0] : payload?.data && !Array.isArray(payload.data) ? payload.data : payload;

  return {
    availableBalance: Number(source?.available_balance || source?.availableBalance || 0),
    totalClaimed: Number(source?.total_claimed || source?.totalClaimed || 0),
    totalVerified: Number(source?.total_verified || source?.totalVerified || 0)
  };
};

const normalizeDistributorOption = (item) => ({
  value: item.code_customer || item.customer_code || item.distributor_code || '',
  label: `${item.code_customer || item.customer_code || item.distributor_code || '-'} - ${item.depo || '-'} - ${
    item.customer_name || item.name_customer || item.name || item.name_distributor || '-'
  }`,
  id: item.id,
  depo: item.depo || '',
  name: item.customer_name || item.name_customer || item.name || item.name_distributor || '',
  bankCode: getBankCode(item),
  accountBankNumber: getAccountBankNumber(item),
  bankAccount: formatBankAccount(item)
});

export default function RewardList() {
  const { showAlert } = useAlert();
  const customerCode = getCookies('customerCode');
  const roleId = getCookies('role');
  const todayDate = getTodayDate();
  const fileInputRef = useRef(null);
  const [claims, setClaims] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [listDistributor, setListDistributor] = useState([]);
  const [selectedDistributors, setSelectedDistributors] = useState([]);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [rewardSummary, setRewardSummary] = useState({
    availableBalance: 0,
    totalClaimed: 0,
    totalVerified: 0
  });
  const [permissionDetail, setPermissionDetail] = useState(null);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingWithdraws, setLoadingWithdraws] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimToDelete, setClaimToDelete] = useState(null);
  const [selectedWithdraw, setSelectedWithdraw] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showVerifyWithdrawModal, setShowVerifyWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTransferDate, setWithdrawTransferDate] = useState(todayDate);
  const [activeRewardTab, setActiveRewardTab] = useState('claim');
  const [withdrawRequestId, setWithdrawRequestId] = useState(0);
  const [historyRefreshId, setHistoryRefreshId] = useState(0);
  const [sellOutFilter, setSellOutFilter] = useState('all');
  const [sellOutStatusFilter, setSellOutStatusFilter] = useState('all');
  const [selectedSellOutIds, setSelectedSellOutIds] = useState([]);
  const [uploadingClaim, setUploadingClaim] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [submittingVerifyWithdraw, setSubmittingVerifyWithdraw] = useState(false);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [deletingClaimId, setDeletingClaimId] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [withdrawCurrentPage, setWithdrawCurrentPage] = useState(1);
  const permissionApprovalName = useMemo(() => normalizeApprovalText(permissionDetail?.role_menu?.approval?.name), [permissionDetail]);

  const roleName = useMemo(
    () => normalizeApprovalText(permissionDetail?.name || permissionDetail?.role?.name || permissionDetail?.role_name),
    [permissionDetail]
  );

  const roleNumber = Number(roleId);
  const isAdministrator = roleNumber === 5;
  const isAdminSales = permissionApprovalName === 'WAITING_ADMIN_SALES' || roleName.includes('ADMIN_SALES');
  const isAdminDistributor = roleNumber === 1 || roleName.includes('ADMIN_DISTRIBUTOR');
  const isOmDistributor =
    roleNumber === 2 ||
    roleName === 'OM' ||
    roleName.includes('OM_DISTRIBUTOR') ||
    roleName.includes('OPERATIONAL_MANAGER');
  const showDistributorFilter = isAdminSales || (!isAdminDistributor && !isOmDistributor);
  const selectedDistributorCodes = useMemo(
    () => selectedDistributors.map((distributor) => distributor.value).filter(Boolean),
    [selectedDistributors]
  );
  const effectiveCustomerCode = selectedDistributorCodes.length ? selectedDistributorCodes.toString() : showDistributorFilter ? '' : customerCode;
  const canCreateWithdrawal = Boolean(customerCode || selectedDistributorCodes.length === 1);

  const fetchDistributors = useCallback(async () => {
    if (!showDistributorFilter) return;

    setLoadingDistributors(true);

    try {
      const response = await DistributorServices.getAllDistributor('');

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch distributor list', 'danger');
        return;
      }

      const options = getResponseList(response, ['distributors', 'items', 'rows'])
        .map(normalizeDistributorOption)
        .filter((item) => item.value);
      setListDistributor(options);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch distributor list', 'danger');
    } finally {
      setLoadingDistributors(false);
    }
  }, [showDistributorFilter, showAlert]);

  const fetchClaimBatches = useCallback(async () => {
    if (!effectiveCustomerCode && !showDistributorFilter) {
      setClaims([]);
      setCurrentPage(1);
      return;
    }

    setLoadingClaims(true);

    try {
      const response = await PromoServices.getClaimBatches({
        customer_code: effectiveCustomerCode
      });

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch claim transaction list', 'danger');
        return;
      }

      const batches = getResponseList(response, ['batches', 'items', 'rows']).map(normalizeBatch);
      setClaims(batches);
      setCurrentPage(1);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch claim transaction list', 'danger');
    } finally {
      setLoadingClaims(false);
    }
  }, [effectiveCustomerCode, showAlert, showDistributorFilter]);

  const fetchWithdraws = useCallback(async () => {
    if (!effectiveCustomerCode && !showDistributorFilter) {
      setWithdraws([]);
      setWithdrawCurrentPage(1);
      return;
    }

    setLoadingWithdraws(true);

    try {
      const response = await PromoServices.getListWithdraw({
        customer_code: effectiveCustomerCode
      });

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch withdrawal list', 'danger');
        return;
      }

      const rows = getResponseList(response, ['withdraws', 'items', 'rows']).map(normalizeWithdraw);
      setWithdraws(rows);
      setWithdrawCurrentPage(1);
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch withdrawal list', 'danger');
    } finally {
      setLoadingWithdraws(false);
    }
  }, [effectiveCustomerCode, showAlert, showDistributorFilter]);

  const fetchTotalReward = useCallback(async () => {
    if (!effectiveCustomerCode && !showDistributorFilter) {
      setRewardSummary({
        availableBalance: 0,
        totalClaimed: 0,
        totalVerified: 0
      });
      return;
    }

    try {
      const response = await PromoServices.getTotalReward({
        customer_code: effectiveCustomerCode
      });

      if (response?.data?.success === false) {
        showAlert(response.data.message || 'Failed to fetch total reward', 'danger');
        return;
      }

      setRewardSummary(normalizeTotalReward(response));
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch total reward', 'danger');
    }
  }, [effectiveCustomerCode, showAlert, showDistributorFilter]);

  const fetchPermissionDetail = useCallback(async () => {
    if (!roleId) return;

    try {
      const response = await RoleServices.fetchRole(roleId);

      if (response?.data?.success) {
        setPermissionDetail(response.data.data);
      }
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch role detail', 'danger');
    }
  }, [roleId, showAlert]);

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  useEffect(() => {
    fetchClaimBatches();
    fetchWithdraws();
    fetchTotalReward();
  }, [fetchClaimBatches, fetchWithdraws, fetchTotalReward]);

  useEffect(() => {
    fetchPermissionDetail();
  }, [fetchPermissionDetail]);

  const handleViewBatch = async (batch) => {
    setLoadingDetailId(batch.id);

    try {
      const [batchResponse, resultResponse] = await Promise.all([
        PromoServices.getBatchDetail(batch.id),
        PromoServices.getUploadResult(batch.id)
      ]);

      if (batchResponse?.data?.success === false) {
        showAlert(batchResponse.data.message || 'Failed to fetch claim batch detail', 'danger');
        return;
      }

      if (resultResponse?.data?.success === false) {
        showAlert(resultResponse.data.message || 'Failed to fetch sell-out transactions', 'danger');
        return;
      }

      const detail = batchResponse.data?.data ?? batchResponse.data;
      const normalizedBatchDetail = normalizeBatch(detail, batch.id);
      const results = Array.isArray(resultResponse.data?.data) ? resultResponse.data.data.map(normalizeUploadResult) : [];
      setSellOutFilter('all');
      setSellOutStatusFilter('all');
      setSelectedSellOutIds([]);
      setSelectedClaim({
        ...batch,
        claimNo: detail?.claimNo,
        fileName: normalizedBatchDetail.fileName !== '-' ? normalizedBatchDetail.fileName : batch.fileName,
        uploadedBy: normalizedBatchDetail.uploadedBy !== '-' ? normalizedBatchDetail.uploadedBy : batch.uploadedBy,
        uploadedAt: normalizedBatchDetail.uploadedAt || batch.uploadedAt,
        sellOut: results,
        rewardAmount: normalizedBatchDetail.rewardAmount || batch.rewardAmount,
        verifiedAmount: Number(detail?.total_diskon_verified ?? batch.verifiedAmount ?? 0),
        totalTransactions: results.length || batch.totalTransactions
      });
    } catch (error) {
      showAlert(error?.message || 'Failed to fetch claim transaction detail', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const summary = useMemo(() => {
    const totalClaimed = Number(rewardSummary.totalClaimed) || 0;
    const availableBalance = Number(rewardSummary.availableBalance) || 0;
    const totalVerified = Number(rewardSummary.totalVerified) || 0;
    const totalWithdrawn = withdraws.reduce((total, item) => total + Number(item.amount), 0);
    return {
      totalClaimed,
      totalVerified,
      totalWithdrawn,
      availableBalance,
      totalClaims: claims.length
    };
  }, [claims, rewardSummary, withdraws]);

  const isFinanceUser = permissionApprovalName === 'WAITING_FINANCE' || roleName.includes('FINANCE');
  const canVerifySellOut = isFinanceUser || isAdministrator;
  const canManageReward = isAdminDistributor;
  const distributorByCode = useMemo(() => {
    const entries = listDistributor.map((distributor) => [distributor.value, distributor]);

    return new Map(entries);
  }, [listDistributor]);
  const selectedWithdrawCustomerCode =
    selectedWithdraw?.customerCode || customerCode || (selectedDistributorCodes.length === 1 ? selectedDistributorCodes[0] : '');
  const selectedWithdrawDistributor =
    (selectedWithdrawCustomerCode && distributorByCode.get(selectedWithdrawCustomerCode)) ||
    (selectedDistributorCodes.length === 1 ? selectedDistributors[0] : null);
  const selectedWithdrawBankAccount = useMemo(() => {
    const withdrawBankAccount = formatBankAccount(selectedWithdraw);

    if (withdrawBankAccount !== '-') return withdrawBankAccount;

    return formatBankAccount(selectedWithdrawDistributor);
  }, [selectedWithdraw, selectedWithdrawDistributor]);

  const handleOpenWithdrawModal = () => {
    if (!canManageReward || !canCreateWithdrawal) return;

    setWithdrawAmount(String(summary.availableBalance || 0));
    setShowWithdrawModal(true);
  };

  const handleOpenVerifyWithdrawModal = (withdraw) => {
    setSelectedWithdraw(withdraw);
    setWithdrawTransferDate(todayDate);
    setShowVerifyWithdrawModal(true);
  };

  const handleCloseVerifyWithdrawModal = () => {
    if (submittingVerifyWithdraw) return;

    setSelectedWithdraw(null);
    setShowVerifyWithdrawModal(false);
    setWithdrawTransferDate(todayDate);
  };

  const handleChangeWithdrawAmount = (event) => {
    setWithdrawAmount(parseCurrencyInput(event.target.value));
  };

  const handleSubmitWithdraw = async () => {
    const rawWithdrawAmount = Number(withdrawAmount) || 0;

    if (
      !canManageReward ||
      !canCreateWithdrawal ||
      !effectiveCustomerCode ||
      !rawWithdrawAmount ||
      rawWithdrawAmount > summary.availableBalance
    )
      return;

    setSubmittingWithdraw(true);

    try {
      const response = await PromoServices.postWithdraw({
        customer_code: effectiveCustomerCode,
        amount: rawWithdrawAmount
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to save withdrawal', 'danger');
        return;
      }

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      await fetchWithdraws();
      await fetchTotalReward();
      showAlert(response?.data?.message || 'Withdrawal request saved successfully', 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to save withdrawal', 'danger');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleSubmitVerifyWithdraw = async () => {
    if (!selectedWithdraw?.id || !withdrawTransferDate) return;

    setSubmittingVerifyWithdraw(true);

    try {
      const response = await PromoServices.postVerifyWithdraw(selectedWithdraw.id, {
        status: 'APPROVED',
        transfer_date: withdrawTransferDate
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to verify withdrawal', 'danger');
        return;
      }

      handleCloseVerifyWithdrawModal();
      await fetchWithdraws();
      await fetchTotalReward();
      showAlert(response?.data?.message || 'Withdrawal verified successfully', 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to verify withdrawal', 'danger');
    } finally {
      setSubmittingVerifyWithdraw(false);
    }
  };

  const pageCount = Math.max(Math.ceil(claims.length / pageSize), 1);
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return claims.slice(startIndex, startIndex + pageSize);
  }, [claims, currentPage]);

  const withdrawPageCount = Math.max(Math.ceil(withdraws.length / pageSize), 1);
  const paginatedWithdraws = useMemo(() => {
    const startIndex = (withdrawCurrentPage - 1) * pageSize;

    return withdraws.slice(startIndex, startIndex + pageSize);
  }, [withdraws, withdrawCurrentPage]);

  const filteredSellOut = useMemo(() => {
    const sellOut = selectedClaim?.sellOut || [];
    const statusFilteredSellOut =
      sellOutStatusFilter === 'all'
        ? sellOut
        : sellOut.filter((transaction) => getSellOutStatusFilterKey(transaction.status) === sellOutStatusFilter);

    if (sellOutFilter === 'verified') return statusFilteredSellOut.filter((transaction) => transaction.verified);
    if (sellOutFilter === 'not-verified') return statusFilteredSellOut.filter((transaction) => !transaction.verified);

    return statusFilteredSellOut;
  }, [selectedClaim, sellOutFilter, sellOutStatusFilter]);

  const selectedSellOutCount = selectedSellOutIds.length;
  const handleChangeSellOutFilter = (value) => {
    setSellOutFilter(value);
    setSelectedSellOutIds([]);
  };

  const handleChangeSellOutStatusFilter = (value) => {
    setSellOutStatusFilter(value);
    setSelectedSellOutIds([]);
  };

  const handleToggleSellOut = (transactionId) => {
    const normalizedId = String(transactionId);

    setSelectedSellOutIds((currentIds) =>
      currentIds.includes(normalizedId) ? currentIds.filter((itemId) => itemId !== normalizedId) : [...currentIds, normalizedId]
    );
  };

  const normalizeVerifyIds = (ids) => ids.map((id) => (Number.isNaN(Number(id)) ? id : Number(id)));

  const updateVerifiedSellOut = (ids) => {
    const normalizedIds = ids.map(String);

    setSelectedClaim((currentClaim) => {
      if (!currentClaim) return currentClaim;

      return {
        ...currentClaim,
        sellOut: currentClaim.sellOut.map((transaction) =>
          normalizedIds.includes(String(transaction.id)) ? { ...transaction, verified: true } : transaction
        )
      };
    });
    setSelectedSellOutIds((currentIds) => currentIds.filter((itemId) => !normalizedIds.includes(String(itemId))));
  };

  const handleBulkVerifySellOut = async () => {
    if (!canVerifySellOut || !selectedSellOutIds.length) return;

    const ids = [...selectedSellOutIds];

    setSubmittingVerify(true);

    try {
      const response = await PromoServices.postVerify({
        ids: normalizeVerifyIds(ids),
        is_verified: true
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to verify sell-out transactions', 'danger');
        return;
      }

      updateVerifiedSellOut(ids);
      const [, , refreshedBatchResponse] = await Promise.all([
        fetchClaimBatches(),
        fetchTotalReward(),
        selectedClaim?.id ? PromoServices.getBatchDetail(selectedClaim.id) : Promise.resolve(null)
      ]);
      const refreshedBatch = refreshedBatchResponse?.data?.data ?? refreshedBatchResponse?.data;

      if (refreshedBatch) {
        setSelectedClaim((currentClaim) => ({
          ...currentClaim,
          verifiedAmount: Number(refreshedBatch.total_diskon_verified ?? currentClaim?.verifiedAmount ?? 0)
        }));
      }
      showAlert(response?.data?.message || `${ids.length} sell-out transactions verified successfully`, 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to verify sell-out transactions', 'danger');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleDeleteClaim = async () => {
    if (!isAdministrator || !claimToDelete?.id || deletingClaimId !== null) return;

    const claim = claimToDelete;
    setClaimToDelete(null);
    setDeletingClaimId(claim.id);

    try {
      const response = await PromoServices.deleteClaim(claim.id);

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to delete claim transaction', 'danger');
        return;
      }

      if (selectedClaim && String(selectedClaim.id) === String(claim.id)) {
        setSelectedClaim(null);
      }

      await fetchClaimBatches();
      await fetchTotalReward();
      showAlert(response?.data?.message || 'Claim transaction deleted successfully', 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to delete claim transaction', 'danger');
    } finally {
      setDeletingClaimId(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);

    try {
      await FinanceServices.downloadRewardTemplate();
      showAlert('Reward template downloaded successfully', 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to download reward template', 'danger');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUploadTemplate = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls'].includes(extension)) {
      showAlert('File format must be XLSX or XLS', 'danger');
      event.target.value = '';
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    setUploadingClaim(true);

    try {
      const response = await PromoServices.uploadTransactionFile(payload);

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to upload reward claim', 'danger');
        return;
      }

      setShowClaimModal(false);
      await fetchClaimBatches();
      showAlert(response?.data?.message || 'Reward claim data uploaded successfully', 'success');
    } catch (error) {
      showAlert(error?.message || 'Failed to upload reward claim', 'danger');
    } finally {
      setUploadingClaim(false);
      event.target.value = '';
    }
  };

  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
  };

  const handleRefreshClaims = async () => {
    await Promise.all([fetchClaimBatches(), fetchTotalReward()]);
  };

  return (
    <>
      <Stack gap={3}>
        <MainCard
          title={
            <Stack gap={1}>
              <h5 className="mb-0">Reward</h5>
              <span className="text-muted f-12">Monitor reward claim and sell-out transactions used as the claim basis.</span>
            </Stack>
          }
          secondary={
            canManageReward ? (
              <Button
                variant="success"
                onClick={() => {
                  setActiveRewardTab('history');
                  setHistoryRefreshId((currentId) => currentId + 1);
                  setWithdrawRequestId((currentId) => currentId + 1);
                }}
              >
                <i className="ti ti-wallet-plus me-1" />
                Add Withdraw
              </Button>
            ) : null
          }
        >
          <Row className="g-3">
            {/* <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start">
                    <div>
                      <div className="text-muted f-12">Available Balance</div>
                      <h4 className="mb-1">{formatCurrency(summary.availableBalance)}</h4>
                      <small className="text-muted d-block">Reward balance available for withdrawal requests.</small>
                    </div>
                    <span className="avtar avtar-s bg-light-success text-success">
                      <i className="ti ti-wallet" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start">
                    <div>
                      <div className="text-muted f-12">Total Claimed</div>
                      <h4 className="mb-1">{formatCurrency(summary.totalClaimed)}</h4>
                      <small className="text-muted d-block">Total reward value submitted from all claims.</small>
                    </div>
                    <span className="avtar avtar-s bg-light-primary text-primary">
                      <i className="ti ti-file-spreadsheet" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} xl={3}>
              <Card className="border mb-0 h-100">
                <Card.Body className="py-3">
                  <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start">
                    <div>
                      <div className="text-muted f-12">Total Verified</div>
                      <h4 className="mb-1">{formatCurrency(summary.totalVerified)}</h4>
                      <small className="text-muted d-block">Total reward from verified sell-out transactions.</small>
                    </div>
                    <span className="avtar avtar-s bg-light-info text-info">
                      <i className="ti ti-circle-check" />
                    </span>
                  </Stack>
                </Card.Body>
              </Card>
            </Col> */}
          </Row>
        </MainCard>

        <Tab.Container
          activeKey={activeRewardTab}
          onSelect={(key) => {
            const selectedTab = key || 'claim';

            setActiveRewardTab(selectedTab);
            if (selectedTab === 'claim') {
              fetchClaimBatches();
              fetchTotalReward();
            } else if (selectedTab === 'history') {
              setHistoryRefreshId((currentId) => currentId + 1);
            }
          }}
        >
          <Nav variant="pills" className="d-inline-flex align-self-start gap-1 bg-light border rounded-3 p-1">
            <Nav.Item>
              <Nav.Link eventKey="claim" className="rounded-2 px-3 py-2">
                <i className="ti ti-file-spreadsheet me-2" />
                Claim
                <Badge
                  bg={activeRewardTab === 'claim' ? 'light' : 'primary'}
                  text={activeRewardTab === 'claim' ? 'primary' : undefined}
                  className="ms-2"
                >
                  {claims.length}
                </Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="history" className="rounded-2 px-3 py-2">
                <i className="ti ti-history me-2" />
                History
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="claim">
              <MainCard
                className="claim-transaction-card"
                title={
                  <Stack gap={1}>
                    <h5 className="mb-0">Claim Transactions</h5>
                    <span className="text-muted f-12">Use the detail button to view sell-out transactions from the parent claim.</span>
                  </Stack>
                }
                secondary={
                  <Stack direction="horizontal" gap={2} className="flex-wrap justify-content-end">
                    {showDistributorFilter ? (
                      <div style={{ width: 320, maxWidth: '100%' }}>
                        <Select
                          value={selectedDistributors}
                          options={listDistributor}
                          menuPosition="fixed"
                          onChange={(options) => {
                            setSelectedDistributors(options || []);
                            setClaims([]);
                            setWithdraws([]);
                            setRewardSummary({
                              availableBalance: 0,
                              totalClaimed: 0,
                              totalVerified: 0
                            });
                            setSelectedClaim(null);
                            setSelectedWithdraw(null);
                            setSelectedSellOutIds([]);
                            setSellOutFilter('all');
                            setSellOutStatusFilter('all');
                            setWithdrawAmount('');
                            setCurrentPage(1);
                            setWithdrawCurrentPage(1);
                          }}
                          placeholder="Select Customer Code"
                          isClearable
                          isMulti
                          closeMenuOnSelect={false}
                          isLoading={loadingDistributors}
                          noOptionsMessage={() => 'Customer not found'}
                          aria-label="Filter customer code"
                        />
                      </div>
                    ) : null}
                    <Button variant="outline-primary" onClick={handleRefreshClaims} disabled={loadingClaims || submittingVerify}>
                      <i className={`${loadingClaims ? 'ti ti-loader-2' : 'ti ti-refresh'} me-1`} />
                      {loadingClaims ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    {canManageReward ? (
                      <Button variant="primary" onClick={() => setShowClaimModal(true)}>
                        <i className="ti ti-plus me-1" />
                        Add Claim
                      </Button>
                    ) : null}
                  </Stack>
                }
              >
                <Table className="mb-0 align-middle" responsive hover>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 170 }}>ID</th>
                      <th style={{ minWidth: 220 }}>Customer</th>
                      <th style={{ minWidth: 190 }}>Upload Date</th>
                      <th style={{ minWidth: 170 }}>Total Claim</th>
                      <th style={{ minWidth: 170 }}>Deducted</th>
                      <th style={{ minWidth: 170 }}>Balance</th>
                      <th className="text-center" style={{ width: 90 }}>
                        Detail
                      </th>
                      {isAdministrator ? (
                        <th className="text-center" style={{ width: 90 }}>
                          Delete
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingClaims ? (
                      <tr>
                        <td colSpan={isAdministrator ? 8 : 7}>
                          <LoaderData />
                        </td>
                      </tr>
                    ) : paginatedClaims.length > 0 ? (
                      paginatedClaims.map((claim) => (
                        <tr key={claim.id}>
                          <td className="fw-semibold">{claim.claimNo}</td>
                          <td>
                            <div className="fw-semibold">{`${claim.customerName} - ${claim.depo}`}</div>
                          </td>
                          <td>{formatDate(claim.uploadedAt)}</td>
                          <td>{formatCurrency(claim.totalClaim)}</td>
                          <td className="text-danger">{formatCurrency(claim.totalDeducted)}</td>
                          <td className="fw-semibold text-success">{formatCurrency(claim.balance)}</td>
                          <td className="text-center">
                            <Button
                              className="rounded-circle"
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewBatch(claim)}
                              disabled={loadingDetailId !== null}
                            >
                              {String(loadingDetailId) === String(claim.id) ? (
                                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                              ) : (
                                <i className="ti ti-list-search" />
                              )}
                            </Button>
                          </td>
                          {isAdministrator ? (
                            <td className="text-center">
                              <Button
                                className="rounded-circle"
                                variant="outline-danger"
                                size="sm"
                                onClick={() => setClaimToDelete(claim)}
                                disabled={deletingClaimId !== null}
                              >
                                {String(deletingClaimId) === String(claim.id) ? (
                                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                ) : (
                                  <i className="ti ti-trash" />
                                )}
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isAdministrator ? 8 : 7}>
                          <div className="text-center py-5">
                            <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                              <i className="ti ti-gift f-24" />
                            </div>
                            <h5 className="mb-1">No claim transactions yet</h5>
                            <p className="text-muted mb-3">Upload the Excel template to add reward claim data.</p>
                            {canManageReward ? (
                              <Button variant="primary" onClick={() => setShowClaimModal(true)}>
                                <i className="ti ti-plus me-1" />
                                Add Claim
                              </Button>
                            ) : null}
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
                  total={claims.length}
                  itemLabel="claim"
                />
              </MainCard>
            </Tab.Pane>

            <Tab.Pane eventKey="legacy-withdraw">
              <MainCard
                className="claim-transaction-card"
                title={
                  <Stack gap={1}>
                    <h5 className="mb-0">Withdrawal Transactions</h5>
                    <span className="text-muted f-12">Manage available reward withdrawal requests.</span>
                  </Stack>
                }
                secondary={
                  canManageReward ? (
                    <Button variant="primary" onClick={handleOpenWithdrawModal} disabled={!canCreateWithdrawal}>
                      <i className="ti ti-plus me-1" />
                      Add Withdrawal
                    </Button>
                  ) : null
                }
              >
                <Table className="mb-0 align-middle" responsive hover>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Withdrawal No.</th>
                      <th style={{ minWidth: 190 }}>Submission Date</th>
                      <th style={{ minWidth: 190 }}>Transfer Date</th>
                      <th style={{ minWidth: 190 }}>Amount</th>
                      <th style={{ minWidth: 160 }}>Status</th>
                      <th className="text-center" style={{ width: 120 }}>
                        Verification
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingWithdraws ? (
                      <tr>
                        <td colSpan={6}>
                          <LoaderData />
                        </td>
                      </tr>
                    ) : paginatedWithdraws.length ? (
                      paginatedWithdraws.map((withdraw) => (
                        <tr key={withdraw.id}>
                          <td className="fw-semibold">{withdraw.withdrawNo}</td>
                          <td>{formatDate(withdraw.submittedAt)}</td>
                          <td>{formatDate(withdraw.transferDate)}</td>
                          <td>{formatCurrency(withdraw.amount)}</td>
                          <td>
                            <Badge bg={getWithdrawStatusVariant(withdraw.status)}>{withdraw.status}</Badge>
                          </td>
                          <td className="text-center">
                            {isFinanceUser ? (
                              <Button
                                className="rounded-circle"
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleOpenVerifyWithdrawModal(withdraw)}
                                disabled={['APPROVED', 'SUCCESS', 'COMPLETED', 'PAID'].includes(normalizeApprovalText(withdraw.status))}
                              >
                                <i className="ti ti-check" />
                              </Button>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          <div className="text-center py-5">
                            <div className="avtar avtar-xl bg-light-success text-success mx-auto mb-3">
                              <i className="ti ti-wallet f-24" />
                            </div>
                            <h5 className="mb-1">No withdrawal transactions yet</h5>
                            <p className="text-muted mb-3">Add a reward withdrawal request from this tab.</p>
                            {canManageReward ? (
                              <Button variant="primary" onClick={handleOpenWithdrawModal} disabled={!canCreateWithdrawal}>
                                <i className="ti ti-plus me-1" />
                                Add Withdrawal
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>

                <TablePagination
                  currentPage={withdrawCurrentPage}
                  onPageChange={setWithdrawCurrentPage}
                  pageCount={withdrawPageCount}
                  pageSize={pageSize}
                  total={withdraws.length}
                  itemLabel="withdraw"
                />
              </MainCard>
            </Tab.Pane>
            <Tab.Pane eventKey="history">
              <BalanceLedger embedded openWithdrawSignal={withdrawRequestId} refreshSignal={historyRefreshId} />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Stack>

      <Modal
        show={showClaimModal}
        onHide={() => {
          if (!uploadingClaim) handleCloseClaimModal();
        }}
        size="xl"
        centered
        fullscreen
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Reward Claim</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col lg={5}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <div className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ti ti-file-spreadsheet f-24" />
                  </div>
                  <h6 className="mb-1">Import Claims from Excel</h6>
                  <p className="text-muted mb-0">
                    Download the template, complete the claim and sell-out transactions, then upload the Excel file again.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <Stack gap={3}>
                <Card className="border mb-0">
                  <Card.Body>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                      <span className="avtar avtar-s bg-light-primary text-primary">
                        <i className="ti ti-download" />
                      </span>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">Download Template</h6>
                        <p className="text-muted mb-3">Use this format so claim and sell-out transaction data can be read automatically.</p>
                        <Button variant="light-primary" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
                          <i className="ti ti-download me-1" />
                          {downloadingTemplate ? 'Preparing...' : 'Download Template'}
                        </Button>
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>

                <Card className="border mb-0">
                  <Card.Body>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                      <span className="avtar avtar-s bg-light-success text-success">
                        <i className="ti ti-upload" />
                      </span>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">Upload File Claim</h6>
                        {/* <p className="text-muted mb-3">
                          Upload a completed `.xlsx` or `.xls` file to add claim transactions. Maximum file size is 1MB.
                        </p> */}
                        <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploadingClaim}>
                          <i className={`${uploadingClaim ? 'ti ti-loader-2' : 'ti ti-upload'} me-1`} />
                          {uploadingClaim ? 'Uploading...' : 'Choose & Upload Excel'}
                        </Button>
                        <Form.Control
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="d-none"
                          onChange={handleUploadTemplate}
                        />
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>
              </Stack>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseClaimModal} disabled={uploadingClaim}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedClaim)} onHide={() => setSelectedClaim(null)} size="xl" centered fullscreen>
        <Modal.Header closeButton>
          <Stack direction="horizontal" gap={3} className="justify-content-between align-items-center w-100 me-3">
            <Modal.Title>Detail Claim Reward</Modal.Title>
            {canVerifySellOut ? (
              <Button variant="success" size="sm" onClick={handleBulkVerifySellOut} disabled={submittingVerify || !selectedSellOutCount}>
                <i className="ti ti-checks me-1" />
                {submittingVerify ? 'Verifying...' : 'Verify Selected'}
                {!submittingVerify && selectedSellOutCount ? ` (${selectedSellOutCount})` : ''}
              </Button>
            ) : null}
          </Stack>
        </Modal.Header>
        <Modal.Body>
          {selectedClaim && (
            <Stack gap={3}>
              <Card className="border mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="align-items-start">
                    <div className="avtar avtar-xl bg-light-primary text-primary">
                      <i className="ti ti-file-spreadsheet f-24" />
                    </div>
                    <div className="flex-grow-1">
                      <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{selectedClaim.claimNo}</h6>
                          <p className="text-muted mb-0">Reward claim details and sell-out transactions used as the claim basis.</p>
                        </div>
                      </Stack>

                      <Row className="g-3 mt-1">
                        <Col md={6}>
                          <Form.Label className="f-12 text-muted">Uploaded File</Form.Label>
                          <div className="fw-semibold">{selectedClaim.fileName || '-'}</div>
                          <small className="text-muted">{selectedClaim.uploadedBy || '-'}</small>
                        </Col>
                        <Col md={6}>
                          <Form.Label className="f-12 text-muted">Total Verified Amount</Form.Label>
                          <h4 className="mb-0 text-primary">{formatCurrency(selectedClaim.verifiedAmount)}</h4>
                        </Col>
                      </Row>
                    </div>
                  </Stack>
                </Card.Body>
              </Card>

              <Card className="border mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="justify-content-between align-items-start flex-wrap mb-3">
                    <div>
                      <h6 className="mb-1">Sell-Out Transactions</h6>
                      <p className="text-muted mb-0">Sell-out transaction list from the selected parent claim.</p>
                    </div>
                    <Stack direction="horizontal" gap={2} className="flex-wrap">
                      <Form.Select
                        size="sm"
                        value={sellOutStatusFilter}
                        onChange={(event) => handleChangeSellOutStatusFilter(event.target.value)}
                        style={{ minWidth: 180 }}
                      >
                        <option value="all">All Claim Statuses</option>
                        <option value="VALID_PROGRAM">VALID PROGRAM</option>
                        <option value="NOT_VALID">NOT VALID</option>
                      </Form.Select>
                      <Form.Select
                        size="sm"
                        value={sellOutFilter}
                        onChange={(event) => handleChangeSellOutFilter(event.target.value)}
                        style={{ minWidth: 170 }}
                      >
                        <option value="all">All Verification</option>
                        <option value="verified">Verified</option>
                        <option value="not-verified">Not Verified</option>
                      </Form.Select>
                      <Badge bg={filteredSellOut.length ? 'primary' : 'secondary'} className="align-self-center">
                        {filteredSellOut.length} transactions
                      </Badge>
                    </Stack>
                  </Stack>

                  <Table className="mb-0 align-middle" responsive hover>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>#</th>
                        <th style={{ minWidth: 210 }}>Customer</th>
                        <th style={{ minWidth: 150 }}>Item Code</th>
                        <th style={{ minWidth: 220 }}>Item Name</th>
                        <th className="text-end" style={{ minWidth: 100 }}>
                          Qty (Kg)
                        </th>
                        <th style={{ minWidth: 130 }}>Date</th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Selling Price @Kg
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Sell-Out Price @Kg
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Bonus
                        </th>
                        <th className="text-end" style={{ minWidth: 150 }}>
                          Status
                        </th>
                        <th className="text-center" style={{ width: 56 }} />
                        <th className="text-center" style={{ minWidth: 150 }}>
                          Verification Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSellOut.length ? (
                        filteredSellOut.map((transaction, index) => (
                          <tr
                            key={transaction.id || `${selectedClaim.claimNo}-${index}`}
                            className={transaction.verified ? 'table-success' : undefined}
                          >
                            <td>{transaction.customerType}</td>
                            <td>
                              <div className="fw-semibold">{transaction.customerName || '-'}</div>
                              <small className="text-muted">{transaction.customerCode || '-'}</small>
                            </td>
                            <td>{transaction.itemCode || '-'}</td>
                            <td>{transaction.itemName || '-'}</td>
                            <td className="text-end">{Math.round(transaction.qty)}</td>
                            <td>{formatDate(transaction.date)}</td>
                            <td className="text-end">{formatCurrency(transaction.amount1)}</td>
                            <td className="text-end">{formatCurrency(transaction.amount2)}</td>
                            <td className="text-end">{formatCurrency(transaction.rewardAmount)}</td>
                            <td className="text-end">
                              <Badge bg={getSellOutStatusVariant(transaction.status)}>{getSellOutStatusLabel(transaction.status)}</Badge>
                            </td>
                            <td className="text-center">
                              {getSellOutStatusKey(transaction.status) === 'VALID_PROGRAM' &&
                              canVerifySellOut &&
                              !transaction.verified ? (
                                <Form.Check
                                  type="checkbox"
                                  className="m-0 d-inline-flex"
                                  checked={selectedSellOutIds.includes(String(transaction.id))}
                                  onChange={() => handleToggleSellOut(transaction.id)}
                                  disabled={submittingVerify}
                                />
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              <i className={`${transaction.verified ? 'ti ti-circle-check' : null} me-1`} />
                              {transaction.verified ? 'Verified' : 'Not Verified'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={12}>
                            <div className="text-center py-4">
                              <div className="avtar avtar-lg bg-light-primary text-primary mx-auto mb-2">
                                <i className="ti ti-table-import f-20" />
                              </div>
                              <h6 className="mb-1">No sell-out transactions</h6>
                              <p className="text-muted mb-0">No transactions match the current filter.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Stack>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedClaim(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={Boolean(claimToDelete)}
        title="Delete Claim"
        subTitle={`Are you sure you want to delete claim ${claimToDelete?.claimNo || 'this'}?`}
        onSubmit={handleDeleteClaim}
        onCancel={() => setClaimToDelete(null)}
        loading={deletingClaimId !== null}
      />

      <Modal show={showWithdrawModal} onHide={() => setShowWithdrawModal(false)} centered size='xl'>
        <Modal.Header closeButton>
          <Modal.Title>Add Reward Withdrawal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Total Available Balance</div>
                    <h5 className="mb-0 text-success">{formatCurrency(summary.availableBalance)}</h5>
                  </div>
                  <span className="avtar avtar-s bg-light-success text-success">
                    <i className="ti ti-wallet" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>

            <Form.Group>
              <Form.Label>Withdrawal Amount</Form.Label>
              <Form.Control
                type="text"
                inputMode="numeric"
                value={withdrawAmount ? formatCurrency(withdrawAmount) : ''}
                onChange={handleChangeWithdrawAmount}
                placeholder="Enter withdrawal amount"
              />
              <Form.Text className="text-danger">Fund withdrawals are subject to tax.</Form.Text>
            </Form.Group>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowWithdrawModal(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitWithdraw}
            disabled={
              submittingWithdraw ||
              !canManageReward ||
              !canCreateWithdrawal ||
              !Number(withdrawAmount) ||
              Number(withdrawAmount) > summary.availableBalance
            }
          >
            {submittingWithdraw ? 'Saving...' : 'Save Withdrawal'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showVerifyWithdrawModal} onHide={handleCloseVerifyWithdrawModal} centered>
        <Modal.Header closeButton={!submittingVerifyWithdraw}>
          <Modal.Title>Verify Withdrawal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Withdrawal No.</div>
                    <h6 className="mb-1">{selectedWithdraw?.withdrawNo || '-'}</h6>
                    <div className="text-muted f-12">{formatCurrency(selectedWithdraw?.amount)}</div>
                    <div className="mt-2">
                      <div className="text-muted f-12">Bank Account</div>
                      <div className="fw-semibold">{selectedWithdrawBankAccount}</div>
                    </div>
                  </div>
                  <span className="avtar avtar-s bg-light-success text-success">
                    <i className="ti ti-circle-check" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>

            <Form.Group>
              <Form.Label>Transfer Date</Form.Label>
              <Form.Control
                type="date"
                value={withdrawTransferDate}
                min={todayDate}
                onChange={(event) => setWithdrawTransferDate(event.target.value)}
                disabled={submittingVerifyWithdraw}
              />
              <Form.Text className="text-muted">Dates before today cannot be selected.</Form.Text>
            </Form.Group>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseVerifyWithdrawModal} disabled={submittingVerifyWithdraw}>
            Close
          </Button>
          <Button variant="success" onClick={handleSubmitVerifyWithdraw} disabled={submittingVerifyWithdraw || !withdrawTransferDate}>
            <i className={`${submittingVerifyWithdraw ? 'ti ti-loader-2' : 'ti ti-check'} me-1`} />
            {submittingVerifyWithdraw ? 'Verifying...' : 'Submit Verification'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
