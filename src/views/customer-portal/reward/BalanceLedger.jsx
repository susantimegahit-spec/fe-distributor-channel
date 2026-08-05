import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import LoaderData from '../../../components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import FinanceServices from '../../../services/customer-portal/FinanceServices';
import PromoServices from '../../../services/customer-portal/PromoServices';
import RoleServices from '../../../services/setting/RoleServices';
import { useAlert } from '../../../utils/alertContext';
import { getAssignedCustomerCodes, getCookies } from '../../../utils/cookies';

const pageSize = 10;

const customerSelectStyles = {
  control: (provided) => ({
    ...provided,
    minHeight: 40
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 1060
  })
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const parseCurrencyInput = (value) => String(value || '').replace(/\D/g, '');

const getTodayDate = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
};

const getDateKey = (value) => {
  if (!value) return '';

  const stringValue = String(value);
  const datePrefix = stringValue.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (datePrefix) return datePrefix;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

let adjustmentReferenceSequence = 0;

const generateAdjustmentReference = (adjustmentType) => {
  adjustmentReferenceSequence += 1;

  const prefix = adjustmentType === 'CLAIM' ? 'CLM' : 'WDR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const sequence = adjustmentReferenceSequence.toString(36).toUpperCase().padStart(2, '0');
  const randomValue = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
    .replace(/-/g, '')
    .slice(0, 6)
    .toUpperCase();

  return `${prefix}-${timestamp}-${sequence}${randomValue}`;
};

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getNumber = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== '');
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const getResponsePayload = (response) => response?.data?.data ?? response?.data ?? {};

const getResponseList = (response) => {
  const payload = getResponsePayload(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.batches)) return payload.batches;
  if (Array.isArray(payload?.distributors)) return payload.distributors;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;

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

const normalizeCustomerOption = (item = {}) => {
  const code = String(item.code_customer || item.customer_code || item.distributor_code || '');
  const name = item.customer_name || item.name_customer || item.name || item.name_distributor || '';
  const depo = item.depo || item.customer_depo || '';

  return {
    value: code,
    label: `${code || '-'} - ${name || '-'} - ${depo || '-'}`,
    customerCode: code,
    customerName: name,
    depo,
    bankCode: getBankCode(item),
    accountBankNumber: getAccountBankNumber(item),
    bankAccount: formatBankAccount(item)
  };
};

const getLedgerRows = (payload) => {
  if (Array.isArray(payload)) return payload;

  const keys = ['ledger', 'ledgers', 'balance_ledger', 'balanceLedger', 'transactions', 'entries', 'items', 'rows'];

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.[key]?.data)) return payload[key].data;
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === 'object') return getLedgerRows(payload.data);

  return [];
};

const getSummarySource = (payload) => {
  if (Array.isArray(payload)) return {};

  const nestedData = payload?.data && !Array.isArray(payload.data) ? payload.data : null;

  return payload?.summary || payload?.balance_summary || payload?.balanceSummary || nestedData?.summary || nestedData || payload || {};
};

const normalizeType = (value) =>
  String(value || 'transaction')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const normalizeTransactionType = (value) => {
  const type = String(value || 'TRANSACTION').trim().toUpperCase();

  if (type.includes('WITHDRAW')) return 'WITHDRAW';
  if (type.includes('CLAIM')) return 'CLAIM';
  if (type.includes('TRANSACTION')) return 'TRANSACTION';

  return type.replace(/\s+/g, '_');
};

const normalizeVerified = (item = {}) => {
  const value =
    item.is_verified ?? item.verified ?? item.isVerified ?? item.verification_status ?? item.verified_status ?? item.status_verifikasi;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  return ['verified', 'sudah verified', 'sudah verifikasi', '1', 'true'].includes(String(value || '').toLowerCase());
};

const normalizeClaimBatch = (batch = {}, index = 0) => ({
  id: batch.id || batch.batch_id || batch.claim_batch_id || batch.upload_batch_id || batch.upload_id || index,
  claimNo:
    batch.batch_no || batch.batch_code || batch.claim_no || batch.reference_no || batch.ref_number || `BATCH-${batch.id || index + 1}`,
  fileName: batch.file_name || batch.original_file_name || batch.original_filename || batch.filename || '-',
  uploadedBy: batch.uploaded_by_name || batch.uploaded_by || batch.created_by_name || batch.created_by || '-',
  uploadedAt: batch.created_at || batch.uploaded_at || batch.createdAt || '',
  customerName: batch.customer_name || batch.name_customer || batch.distributor_name || '',
  depo: batch.depo || batch.customer_depo || '',
  rewardAmount: Number(batch.total_diskon || batch.reward_amount || batch.total_reward || 0),
  totalTransactions: Number(batch.total_rows || batch.total_records || batch.result_count || batch.total_transactions || 0),
  sellOut: []
});

const normalizeClaimResult = (item = {}, index = 0) => ({
  id: item.id || item.result_id || index,
  customerCode: item.customer_code || item.code_customer || item.distributor_code || '',
  customerName: item.customer_name || item.name_customer || item.distributor_name || '',
  itemCode: item.item_code || item.code_item || '',
  itemName: item.item_name || item.name_item || '',
  qty: Number(item.qty_kg || item.qty || 0),
  customerType: item.customer_type || item.type_customer || '',
  date: item.transaction_date || item.transcation_date || item.sell_out_date || item.created_at || '',
  sellingPrice: Number(item.harga_program_per_kg || 0),
  sellOutPrice: Number(item.sell_price_per_kg || 0),
  rewardAmount: Number(item.diskon_per_kg || 0),
  status: String(item.status || '').replace(/_/g, ' '),
  verified: normalizeVerified(item)
});

const getDetailSellOutRows = (detail) => {
  if (Array.isArray(detail)) return detail;
  if (!detail || typeof detail !== 'object') return [];

  const keys = ['sell_out', 'sellOut', 'transactions', 'results', 'items', 'rows'];

  for (const key of keys) {
    if (Array.isArray(detail[key])) return detail[key];
    if (Array.isArray(detail[key]?.data)) return detail[key].data;
  }

  if (Array.isArray(detail.data)) return detail.data;
  if (detail.data && typeof detail.data === 'object') return getDetailSellOutRows(detail.data);

  return [];
};

const getClaimResultStatusVariant = (status) =>
  String(status || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase() === 'VALID_PROGRAM'
    ? 'success'
    : 'danger';

const normalizeApprovalText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .toUpperCase();

const getSellOutStatusKey = (status) => normalizeApprovalText(status) || '__EMPTY__';

const getSellOutStatusFilterKey = (status) => (getSellOutStatusKey(status) === 'VALID_PROGRAM' ? 'VALID_PROGRAM' : 'NOT_VALID');

const transactionTypeConfig = {
  CLAIM: {
    label: 'Claim',
    description: 'Reward received from claim verification.',
    icon: 'ti ti-gift',
    variant: 'primary'
  },
  TRANSACTION: {
    label: 'Transaction',
    description: 'Reward usage recorded from an order.',
    icon: 'ti ti-arrows-exchange',
    variant: 'warning'
  },
  WITHDRAW: {
    label: 'Withdraw',
    description: 'Reward balance withdrawn by customer.',
    icon: 'ti ti-wallet-minus',
    variant: 'danger'
  },
  BONUS: {
    label: 'Bonus',
    description: 'Additional reward balance granted to a customer.',
    icon: 'ti ti-gift-card',
    variant: 'success'
  },
  CORRECTION: {
    label: 'Correction',
    description: 'Manual reward balance correction.',
    icon: 'ti ti-adjustments',
    variant: 'orange'
  }
};

const isApprovedStatus = (status) =>
  ['APPROVED', 'SUCCESS', 'COMPLETED', 'PAID'].includes(normalizeApprovalText(status));

const normalizeLedgerRow = (item = {}, index) => {
  const type =
    item.transaction ||
    item.transaction_type ||
    item.transactionType ||
    item.type_transaction ||
    item.typeTransaction ||
    item.trx_type ||
    item.entry_type ||
    item.entryType ||
    item.type ||
    item.source_type ||
    '';
  const normalizedType = String(type).toLowerCase();
  const typeKey = normalizeTransactionType(type);
  const status = String(item.status || item.transaction_status || item.approval_status || '').replace(/_/g, ' ');
  const amount = getNumber(item.amount, item.nominal, item.value, item.transaction_amount) || 0;
  const explicitDebit = getNumber(item.debit, item.debit_amount, item.debitAmount);
  const explicitCredit = getNumber(item.credit, item.credit_amount, item.creditAmount);
  const explicitOutstanding = getNumber(item.outstanding, item.outstanding_amount, item.outstandingAmount);
  const isDebit = ['debit', 'withdraw', 'withdrawal', 'deduction', 'usage', 'used', 'redeem'].some((keyword) =>
    normalizedType.includes(keyword)
  );
  const withdrawAmount = Math.abs(amount || explicitCredit || explicitDebit || explicitOutstanding || 0);
  const approvedWithdraw = typeKey === 'WITHDRAW' && isApprovedStatus(status);
  const pendingWithdraw = typeKey === 'WITHDRAW' && !approvedWithdraw;

  return {
    id: item.id || item.ledger_id || item.balance_ledger_id || item.transaction_id || index,
    withdrawId: item.id,
    date: item.transaction_date || item.transactionDate || item.date || item.created_at || item.createdAt || item.updated_at,
    reference:
      item.ref_number ||
      item.refNumber ||
      item.reference_no ||
      item.referenceNo ||
      item.transaction_no ||
      item.transactionNo ||
      item.document_no ||
      item.batch_no ||
      item.withdraw_no ||
      '-',
    claimBatchId: item.batch_id || item.claim_batch_id || item.claimBatchId || item.upload_batch_id || item.uploadBatchId || '',
    detailSellOut:
      item.detail_sell_out ?? item.detailSellOut ?? item.sell_out_detail ?? item.sellOutDetail ?? item.claim_detail ?? item.claimDetail ?? null,
    customerCode: String(item.customer_code || item.customerCode || item.code_customer || item.distributor_code || ''),
    customerName: item.customer_name || item.customerName || item.name_customer || item.distributor_name || '',
    bankCode: getBankCode(item),
    accountBankNumber: getAccountBankNumber(item),
    bankAccount: formatBankAccount(item),
    type: normalizeType(type),
    typeKey,
    description:
      typeKey === 'WITHDRAW'
        ? `Pengajuan withdraw dari batch (${item.batch_no || item.batch?.batch_no || item.claim_batch?.batch_no || '-'})`
        : item.description || item.remarks || item.remark || item.notes || item.note || item.keterangan || '-',
    debit: typeKey === 'WITHDRAW' ? 0 : explicitDebit ?? (isDebit ? Math.abs(amount) : 0),
    credit: approvedWithdraw ? withdrawAmount : pendingWithdraw ? 0 : explicitCredit ?? (!isDebit ? Math.abs(amount) : 0),
    outstanding: pendingWithdraw ? withdrawAmount : typeKey === 'WITHDRAW' ? 0 : explicitOutstanding || 0,
    status
  };
};

const getStatusVariant = (status) => {
  const value = String(status || '').toLowerCase();

  if (['success', 'completed', 'approved', 'verified', 'posted'].some((item) => value.includes(item))) return 'success';
  if (['failed', 'rejected', 'cancelled', 'canceled'].some((item) => value.includes(item))) return 'danger';

  return 'warning';
};

export default function BalanceLedger({ embedded = false, openWithdrawSignal = 0, refreshSignal = 0 }) {
  const { showAlert } = useAlert();
  const assignedCustomerCodes = useMemo(() => getAssignedCustomerCodes(), []);
  const customerCode = assignedCustomerCodes.join(',');
  const roleId = getCookies('role');
  const fileInputRef = useRef(null);
  const handledWithdrawSignalRef = useRef(0);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [summarySource, setSummarySource] = useState({});
  const [loading, setLoading] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentTransactionType, setAdjustmentTransactionType] = useState('BONUS');
  const [adjustmentEntryType, setAdjustmentEntryType] = useState('CREDIT');
  const [adjustmentCustomer, setAdjustmentCustomer] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [claimFile, setClaimFile] = useState(null);
  const [claimStartDate, setClaimStartDate] = useState(getTodayDate);
  const [claimEndDate, setClaimEndDate] = useState(getTodayDate);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [withdrawDate, setWithdrawDate] = useState(getTodayDate);
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawClaimOptions, setWithdrawClaimOptions] = useState([]);
  const [withdrawRows, setWithdrawRows] = useState([{ claim: null, amount: '' }]);
  const [loadingWithdrawClaims, setLoadingWithdrawClaims] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState(null);
  const [showApproveWithdrawModal, setShowApproveWithdrawModal] = useState(false);
  const [withdrawTransferDate, setWithdrawTransferDate] = useState(getTodayDate);
  const [submittingApproveWithdraw, setSubmittingApproveWithdraw] = useState(false);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
  const [permissionDetail, setPermissionDetail] = useState(null);
  const [sellOutFilter, setSellOutFilter] = useState('all');
  const [sellOutStatusFilter, setSellOutStatusFilter] = useState('all');
  const [selectedSellOutIds, setSelectedSellOutIds] = useState([]);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [loadingClaimReference, setLoadingClaimReference] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const isDistributor = Boolean(customerCode);
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
  const showCustomerFilter = isAdminSales || (!isAdminDistributor && !isOmDistributor);
  const isFinanceUser = permissionApprovalName === 'WAITING_FINANCE' || roleName.includes('FINANCE');
  const canVerifySellOut = isFinanceUser || isAdministrator;

  const selectedCustomerCodes = useMemo(
    () => selectedCustomers.map((item) => String(item.value || '')).filter(Boolean),
    [selectedCustomers]
  );
  const selectedWithdrawCustomer = useMemo(
    () => customerOptions.find((item) => String(item.customerCode) === String(selectedWithdraw?.customerCode)) || null,
    [customerOptions, selectedWithdraw]
  );
  const selectedWithdrawBankAccount = useMemo(() => {
    const ledgerBankAccount = formatBankAccount(selectedWithdraw);

    return ledgerBankAccount !== '-' ? ledgerBankAccount : formatBankAccount(selectedWithdrawCustomer);
  }, [selectedWithdraw, selectedWithdrawCustomer]);
  const effectiveCustomerCode = embedded
    ? selectedCustomerCodes.join(',')
    : selectedCustomerCodes.length
      ? selectedCustomerCodes.join(',')
      : customerCode;
  const adjustmentCustomerCode = isDistributor ? customerCode : '';
  const canCreateAdjustment = isDistributor;
  const canCreateWithdrawal = isAdminDistributor && isDistributor;

  const fetchCustomerOptions = useCallback(async () => {
    if (!showCustomerFilter && !embedded) {
      setCustomerOptions([]);
      setSelectedCustomers([]);
      return;
    }

    setLoadingCustomers(true);

    try {
      const response = await DistributorServices.getAllDistributor('');

      if (response?.data?.success === false) {
        setCustomerOptions([]);
        showAlert(response.data.message || 'Failed to fetch customer code list', 'danger');
        return;
      }

      const options = getResponseList(response)
        .map(normalizeCustomerOption)
        .filter((item) => item.value)
        .filter((item) => !embedded || !assignedCustomerCodes.length || assignedCustomerCodes.includes(String(item.value)))
        .sort((firstItem, secondItem) => firstItem.label.localeCompare(secondItem.label));

      setCustomerOptions(options);
    } catch (error) {
      setCustomerOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch customer code list', 'danger');
    } finally {
      setLoadingCustomers(false);
    }
  }, [assignedCustomerCodes, embedded, showAlert, showCustomerFilter]);

  const fetchClaimsLedger = useCallback(async () => {
    if (embedded && !effectiveCustomerCode) {
      setLedgerRows([]);
      setSummarySource({});
      setCurrentPage(1);
      return;
    }

    setLoading(true);

    try {
      const response = await PromoServices.getClaimsLedger({
        customer_code: effectiveCustomerCode,
        ...(ledgerStartDate ? { start_date: ledgerStartDate } : {}),
        ...(ledgerEndDate ? { end_date: ledgerEndDate } : {})
      });

      if (response?.data?.success === false) {
        setLedgerRows([]);
        setSummarySource({});
        showAlert(response.data.message || 'Failed to fetch reward balance ledger', 'danger');
        return;
      }

      const payload = getResponsePayload(response);
      const rows = getLedgerRows(payload).map(normalizeLedgerRow);

      setLedgerRows(rows);
      setSummarySource(getSummarySource(payload));
      setCurrentPage(1);
    } catch (error) {
      setLedgerRows([]);
      setSummarySource({});
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch reward balance ledger', 'danger');
    } finally {
      setLoading(false);
    }
  }, [effectiveCustomerCode, ledgerEndDate, ledgerStartDate, showAlert]);

  const fetchWithdrawClaimBatches = useCallback(async () => {
    if (!adjustmentCustomerCode) {
      setWithdrawClaimOptions([]);
      return;
    }

    setLoadingWithdrawClaims(true);

    try {
      const response = await PromoServices.getClaimBatches({ customer_code: adjustmentCustomerCode });

      if (response?.data?.success === false) {
        setWithdrawClaimOptions([]);
        showAlert(response.data.message || 'Failed to fetch claim batches', 'danger');
        return;
      }

      const options = getResponseList(response)
        .map((batch, index) => {
          const id = batch.id || batch.batch_id || batch.claim_batch_id || batch.upload_batch_id;
          const claimNo = batch.batch_no || batch.batch_code || batch.claim_no || batch.reference_no || `BATCH-${id || index + 1}`;
          const totalClaim = Number(batch.total_diskon_verified || 0);
          const totalDeducted = Number(batch.total_deducted || 0);
          const amount = Math.max(totalClaim - totalDeducted, 0);
          const date = batch.created_at || batch.uploaded_at || batch.createdAt || '';

          return {
            value: id,
            label: `${claimNo} · Balance: ${formatCurrency(amount)}${date ? ` · ${formatDate(date)}` : ''}`,
            claimNo,
            amount,
            totalClaim,
            totalDeducted,
            date
          };
        })
        .filter((batch) => batch.value && batch.amount > 0)
        .sort((firstBatch, secondBatch) => {
          const firstDate = Date.parse(firstBatch.date);
          const secondDate = Date.parse(secondBatch.date);
          const firstTimestamp = Number.isNaN(firstDate) ? Number.MAX_SAFE_INTEGER : firstDate;
          const secondTimestamp = Number.isNaN(secondDate) ? Number.MAX_SAFE_INTEGER : secondDate;

          return firstTimestamp - secondTimestamp;
        });

      setWithdrawClaimOptions(options);
    } catch (error) {
      setWithdrawClaimOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch claim batches', 'danger');
    } finally {
      setLoadingWithdrawClaims(false);
    }
  }, [adjustmentCustomerCode, showAlert]);

  useEffect(() => {
    fetchCustomerOptions();
  }, [fetchCustomerOptions]);

  useEffect(() => {
    fetchClaimsLedger();
  }, [fetchClaimsLedger, refreshSignal]);

  useEffect(() => {
    if (!roleId) return;

    const fetchPermissionDetail = async () => {
      try {
        const response = await RoleServices.fetchRole(roleId);

        if (response?.data?.success) setPermissionDetail(response.data.data);
      } catch (error) {
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch role detail', 'danger');
      }
    };

    fetchPermissionDetail();
  }, [roleId, showAlert]);

  const filteredRows = useMemo(() => {
    if (!selectedCustomerCodes.length && transactionFilter === 'all' && !ledgerStartDate && !ledgerEndDate) return ledgerRows;

    return ledgerRows.filter((item) => {
      const matchesType = transactionFilter === 'all' || item.typeKey === transactionFilter;
      const matchesCustomer = !selectedCustomerCodes.length || selectedCustomerCodes.includes(item.customerCode);
      const transactionDate = getDateKey(item.date);
      const matchesStartDate = !ledgerStartDate || (transactionDate && transactionDate >= ledgerStartDate);
      const matchesEndDate = !ledgerEndDate || (transactionDate && transactionDate <= ledgerEndDate);

      return matchesType && matchesCustomer && matchesStartDate && matchesEndDate;
    });
  }, [ledgerEndDate, ledgerRows, ledgerStartDate, selectedCustomerCodes, transactionFilter]);

  const summary = useMemo(() => {
    const totalCredit = ledgerRows.reduce((total, item) => total + Number(item.credit || 0), 0);
    const totalDebit = ledgerRows.reduce((total, item) => total + Number(item.debit || 0), 0);
    const hasWithdrawTransactions = ledgerRows.some((item) => item.typeKey === 'WITHDRAW');
    const resolvedTotalCredit =
      hasWithdrawTransactions
        ? totalCredit
        : getNumber(summarySource.total_credit, summarySource.totalCredit, summarySource.total_claim, summarySource.totalClaim) ?? totalCredit;
    const resolvedTotalDebit =
      hasWithdrawTransactions
        ? totalDebit
        : getNumber(summarySource.total_debit, summarySource.totalDebit, summarySource.total_withdraw, summarySource.totalWithdraw) ?? totalDebit;

    return {
      balance: resolvedTotalDebit - resolvedTotalCredit,
      totalCredit: resolvedTotalCredit,
      totalDebit: resolvedTotalDebit,
      totalEntries: getNumber(summarySource.total_entries, summarySource.totalEntries, summarySource.total_transactions) ?? ledgerRows.length
    };
  }, [ledgerRows, summarySource]);

  const filteredSellOut = useMemo(() => {
    const sellOut = selectedClaimDetail?.sellOut || [];
    const statusFilteredSellOut =
      sellOutStatusFilter === 'all'
        ? sellOut
        : sellOut.filter((transaction) => getSellOutStatusFilterKey(transaction.status) === sellOutStatusFilter);

    if (sellOutFilter === 'verified') return statusFilteredSellOut.filter((transaction) => transaction.verified);
    if (sellOutFilter === 'not-verified') return statusFilteredSellOut.filter((transaction) => !transaction.verified);

    return statusFilteredSellOut;
  }, [selectedClaimDetail, sellOutFilter, sellOutStatusFilter]);

  const handleToggleSellOut = (transactionId) => {
    const normalizedId = String(transactionId);

    setSelectedSellOutIds((currentIds) =>
      currentIds.includes(normalizedId) ? currentIds.filter((itemId) => itemId !== normalizedId) : [...currentIds, normalizedId]
    );
  };

  const handleBulkVerifySellOut = async () => {
    if (!canVerifySellOut || !selectedSellOutIds.length) return;

    const ids = [...selectedSellOutIds];
    setSubmittingVerify(true);

    try {
      const response = await PromoServices.postVerify({
        ids: ids.map((id) => (Number.isNaN(Number(id)) ? id : Number(id))),
        is_verified: true
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to verify sell-out transactions', 'danger');
        return;
      }

      const verifiedIds = ids.map(String);
      setSelectedClaimDetail((currentClaim) => {
        if (!currentClaim) return currentClaim;

        return {
          ...currentClaim,
          sellOut: currentClaim.sellOut.map((transaction) =>
            verifiedIds.includes(String(transaction.id)) ? { ...transaction, verified: true } : transaction
          )
        };
      });
      setSelectedSellOutIds([]);
      await fetchClaimsLedger();
      showAlert(response?.data?.message || `${ids.length} sell-out transactions verified successfully`, 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to verify sell-out transactions', 'danger');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleCloseClaimDetail = () => {
    setSelectedClaimDetail(null);
    setSellOutFilter('all');
    setSellOutStatusFilter('all');
    setSelectedSellOutIds([]);
  };

  const handleViewClaimDetail = async (ledgerItem) => {
    if (ledgerItem.typeKey !== 'CLAIM' || !ledgerItem.reference || ledgerItem.reference === '-') return;

    setLoadingClaimReference(ledgerItem.id);
    setSellOutFilter('all');
    setSellOutStatusFilter('all');
    setSelectedSellOutIds([]);

    try {
      if (ledgerItem.detailSellOut !== null) {
        const detailSource =
          !Array.isArray(ledgerItem.detailSellOut) &&
          ledgerItem.detailSellOut?.data &&
          !Array.isArray(ledgerItem.detailSellOut.data)
            ? ledgerItem.detailSellOut.data
            : ledgerItem.detailSellOut;
        const batchSource = Array.isArray(detailSource) ? {} : detailSource?.batch || detailSource?.claim || detailSource || {};
        const embeddedBatch = normalizeClaimBatch(batchSource, ledgerItem.claimBatchId || ledgerItem.id);
        const embeddedClaimNo = String(embeddedBatch.claimNo).startsWith('BATCH-')
          ? ledgerItem.reference
          : embeddedBatch.claimNo;
        const sellOut = getDetailSellOutRows(ledgerItem.detailSellOut).map(normalizeClaimResult);

        setSelectedClaimDetail({
          ...embeddedBatch,
          claimNo: embeddedClaimNo,
          uploadedAt: embeddedBatch.uploadedAt || ledgerItem.date,
          customerName: embeddedBatch.customerName || ledgerItem.customerName,
          rewardAmount: embeddedBatch.rewardAmount || ledgerItem.debit || ledgerItem.credit || 0,
          sellOut,
          totalTransactions: sellOut.length || embeddedBatch.totalTransactions || 0
        });
        return;
      }

      let batchId = ledgerItem.claimBatchId;
      let batch = null;

      if (!batchId) {
        const batchListResponse = await PromoServices.getClaimBatches({
          customer_code: ledgerItem.customerCode || customerCode
        });

        if (batchListResponse?.data?.success === false) {
          showAlert(batchListResponse.data.message || 'Failed to fetch claim batch list', 'danger');
          return;
        }

        const normalizedReference = String(ledgerItem.reference).trim().toUpperCase();
        const batches = getResponseList(batchListResponse).map(normalizeClaimBatch);

        batch = batches.find(
          (item) =>
            String(item.claimNo).trim().toUpperCase() === normalizedReference ||
            String(item.id).trim().toUpperCase() === normalizedReference
        );
        batchId = batch?.id;
      }

      if (!batchId) {
        showAlert(`Claim detail for reference ${ledgerItem.reference} was not found`, 'warning');
        return;
      }

      const [batchResponse, resultResponse] = await Promise.all([
        PromoServices.getBatchDetail(batchId),
        PromoServices.getUploadResult(batchId)
      ]);

      if (batchResponse?.data?.success === false) {
        showAlert(batchResponse.data.message || 'Failed to fetch claim batch detail', 'danger');
        return;
      }

      if (resultResponse?.data?.success === false) {
        showAlert(resultResponse.data.message || 'Failed to fetch claim sell-out transactions', 'danger');
        return;
      }

      const batchDetail = normalizeClaimBatch(getResponsePayload(batchResponse), batchId);
      const sellOut = getResponseList(resultResponse).map(normalizeClaimResult);
      const detailClaimNo = String(batchDetail.claimNo).startsWith('BATCH-')
        ? batch?.claimNo || ledgerItem.reference
        : batchDetail.claimNo;

      setSelectedClaimDetail({
        ...batch,
        ...batchDetail,
        id: batchId,
        claimNo: detailClaimNo,
        fileName: batchDetail.fileName !== '-' ? batchDetail.fileName : batch?.fileName || '-',
        uploadedBy: batchDetail.uploadedBy !== '-' ? batchDetail.uploadedBy : batch?.uploadedBy || '-',
        uploadedAt: batchDetail.uploadedAt || batch?.uploadedAt || ledgerItem.date,
        customerName: batchDetail.customerName || batch?.customerName || ledgerItem.customerName,
        rewardAmount: batchDetail.rewardAmount || batch?.rewardAmount || ledgerItem.debit || ledgerItem.credit || 0,
        sellOut,
        totalTransactions: sellOut.length || batchDetail.totalTransactions || batch?.totalTransactions || 0
      });
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch claim detail', 'danger');
    } finally {
      setLoadingClaimReference(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);

    try {
      await FinanceServices.downloadRewardTemplate();
      showAlert('Reward template downloaded successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to download reward template', 'danger');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleSelectClaimFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls'].includes(extension)) {
      showAlert('File format must be XLSX or XLS', 'danger');
      event.target.value = '';
      return;
    }

    setClaimFile(file);
  };

  const handleOpenAdjustmentModal = () => {
    setAdjustmentTransactionType('BONUS');
    setAdjustmentEntryType('CREDIT');
    setAdjustmentCustomer(null);
    setAdjustmentAmount('');
    setAdjustmentDescription('');
    setShowAdjustmentModal(true);
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustmentCustomer?.value) {
      showAlert('Please select a customer', 'warning');
      return;
    }

    if (!(Number(adjustmentAmount) > 0)) {
      showAlert('Please enter a valid amount', 'warning');
      return;
    }

    if (!adjustmentDescription.trim()) {
      showAlert('Please enter a description', 'warning');
      return;
    }

    setSubmittingAdjustment(true);

    try {
      const response = await FinanceServices.postBalanceLedger({
        customer_code: adjustmentCustomer.value,
        type: adjustmentTransactionType,
        adjustment_type: adjustmentEntryType,
        amount: Number(adjustmentAmount),
        description: adjustmentDescription.trim()
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to save reward adjustment', 'danger');
        return;
      }

      setShowAdjustmentModal(false);
      setAdjustmentCustomer(null);
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      await fetchClaimsLedger();
      showAlert(response?.data?.message || 'Reward adjustment saved successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save reward adjustment', 'danger');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const handleOpenClaimModal = () => {
    if (!isDistributor) {
      showAlert('Only distributor accounts can add a claim', 'warning');
      return;
    }

    const today = getTodayDate();

    setClaimStartDate(today);
    setClaimEndDate(today);
    setClaimAmount('');
    setClaimDescription('');
    setClaimFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowClaimModal(true);
  };

  const handleSubmitClaim = async () => {
    const rawClaimAmount = Number(claimAmount) || 0;

    if (!canCreateAdjustment) {
      showAlert('Only distributor accounts can add a claim', 'warning');
      return;
    }

    if (!claimStartDate || !claimEndDate || claimEndDate < claimStartDate) {
      showAlert('Please enter a valid claim date range', 'warning');
      return;
    }

    // if (!rawClaimAmount) {
    //   showAlert('Please enter a claim amount', 'warning');
    //   return;
    // }

    if (!claimDescription.trim()) {
      showAlert('Please enter a claim description', 'warning');
      return;
    }

    setSubmittingClaim(true);

    try {
      const claimPayload = {
        start_date: claimStartDate,
        end_date: claimEndDate,
        customer_code: adjustmentCustomerCode,
        type: 'CLAIM',
        adjustment_type: 'DEBIT',
        amount: 0,
        description: claimDescription.trim(),
        ref_number: ''
      };
      let requestPayload = claimPayload;

      if (claimFile) {
        requestPayload = new FormData();
        Object.entries(claimPayload).forEach(([key, value]) => requestPayload.append(key, value));
        requestPayload.append('file', claimFile);
      }

      const response = await FinanceServices.postBalanceLedger(requestPayload);

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to save reward claim', 'danger');
        return;
      }

      setShowClaimModal(false);
      setClaimAmount('');
      setClaimDescription('');
      setClaimFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchClaimsLedger();
      showAlert(response?.data?.message || 'Reward claim saved successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save reward claim', 'danger');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleOpenWithdrawModal = () => {
    if (!canCreateWithdrawal) {
      showAlert('Only distributor accounts can add a withdrawal', 'warning');
      return;
    }

    const today = getTodayDate();

    setWithdrawDate(today);
    setWithdrawDescription('');
    setWithdrawRows([{ claim: null, amount: '' }]);
    setShowWithdrawModal(true);
    fetchWithdrawClaimBatches();
  };

  useEffect(() => {
    if (openWithdrawSignal > handledWithdrawSignalRef.current && canCreateWithdrawal) {
      handledWithdrawSignalRef.current = openWithdrawSignal;
      const today = getTodayDate();

      setWithdrawDate(today);
      setWithdrawDescription('');
      setWithdrawRows([{ claim: null, amount: '' }]);
      setShowWithdrawModal(true);
      fetchWithdrawClaimBatches();
    }
  }, [canCreateWithdrawal, fetchWithdrawClaimBatches, openWithdrawSignal, summary.balance]);

  const handleSelectWithdrawClaim = (rowIndex, claim) => {
    if (claim) {
      const selectedBatchIds = new Set(
        withdrawRows
          .filter((row, index) => index !== rowIndex && row.claim?.value)
          .map((row) => String(row.claim.value))
      );
      const oldestUnusedBatch = withdrawClaimOptions.find((option) => !selectedBatchIds.has(String(option.value)));

      if (oldestUnusedBatch && String(claim.value) !== String(oldestUnusedBatch.value)) {
        showAlert(`Use the oldest claim batch first: ${oldestUnusedBatch.claimNo}`, 'warning');
        return;
      }
    }

    setWithdrawRows((currentRows) =>
      currentRows.map((row, index) => (index === rowIndex ? { claim, amount: claim ? String(claim.amount) : '' } : row))
    );
  };

  const handleChangeWithdrawRowAmount = (rowIndex, value) => {
    const amount = parseCurrencyInput(value);

    setWithdrawRows((currentRows) => currentRows.map((row, index) => (index === rowIndex ? { ...row, amount } : row)));
  };

  const addWithdrawRow = () => {
    setWithdrawRows((currentRows) => [...currentRows, { claim: null, amount: '' }]);
  };

  const removeWithdrawRow = (rowIndex) => {
    setWithdrawRows((currentRows) =>
      currentRows.length === 1 ? [{ claim: null, amount: '' }] : currentRows.filter((_, index) => index !== rowIndex)
    );
  };

  const handleSubmitWithdraw = async () => {
    const totalWithdrawAmount = withdrawRows.reduce((total, row) => total + (Number(row.amount) || 0), 0);

    if (!canCreateWithdrawal) {
      showAlert('Only distributor accounts can add a withdrawal', 'warning');
      return;
    }

    if (!withdrawDate) {
      showAlert('Please enter a valid withdrawal date', 'warning');
      return;
    }

    if (withdrawRows.some((row) => !row.claim?.value)) {
      showAlert('Please select a claim batch for each row', 'warning');
      return;
    }

    const selectedBatchIds = withdrawRows.map((row) => String(row.claim.value));
    if (new Set(selectedBatchIds).size !== selectedBatchIds.length) {
      showAlert('The same claim batch cannot be selected more than once', 'warning');
      return;
    }

    const requiredOldestBatchIds = withdrawClaimOptions
      .slice(0, selectedBatchIds.length)
      .map((batch) => String(batch.value));
    const skippedOldestBatch = requiredOldestBatchIds.find((batchId) => !selectedBatchIds.includes(batchId));

    if (skippedOldestBatch) {
      const oldestRequiredBatch = withdrawClaimOptions.find((batch) => String(batch.value) === skippedOldestBatch);
      showAlert(`Withdrawal must use the oldest claim batch first: ${oldestRequiredBatch?.claimNo || '-'}`, 'warning');
      return;
    }

    if (!totalWithdrawAmount || totalWithdrawAmount > summary.balance) {
      showAlert('Withdrawal amount must be greater than zero and cannot exceed the available balance', 'warning');
      return;
    }

    if (withdrawRows.some((row) => !Number(row.amount) || Number(row.amount) > Number(row.claim?.amount || 0))) {
      showAlert('Each nominal must be greater than zero and cannot exceed its claim batch balance', 'warning');
      return;
    }

    if (!withdrawDescription.trim()) {
      showAlert('Please enter a withdrawal description', 'warning');
      return;
    }

    setSubmittingWithdraw(true);

    try {
      const response = await PromoServices.postWithdraws({
        start_date: withdrawDate,
        end_date: withdrawDate,
        customer_code: adjustmentCustomerCode,
        type: 'WITHDRAW',
        adjustment_type: 'CREDIT',
        amount: totalWithdrawAmount,
        batchId: withdrawRows.map((row) => row.claim.value).join(','),
        lines: withdrawRows.map((row) => ({
          batch_id: row.claim.value,
          amount: Number(row.amount)
        })),
        description: withdrawDescription.trim(),
        ref_number: generateAdjustmentReference('WITHDRAW')
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Failed to save withdrawal');
      }

      setShowWithdrawModal(false);
      setWithdrawDescription('');
      setWithdrawRows([{ claim: null, amount: '' }]);
      await fetchClaimsLedger();
      showAlert(response?.data?.message || 'Withdrawal request saved successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save withdrawal', 'danger');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleOpenApproveWithdrawModal = (withdraw) => {
    if (!isFinanceUser || !withdraw?.withdrawId) return;

    setSelectedWithdraw(withdraw);
    setWithdrawTransferDate(getTodayDate());
    setShowApproveWithdrawModal(true);
  };

  const handleCloseApproveWithdrawModal = () => {
    if (submittingApproveWithdraw) return;

    setSelectedWithdraw(null);
    setShowApproveWithdrawModal(false);
    setWithdrawTransferDate(getTodayDate());
  };

  const handleSubmitApproveWithdraw = async () => {
    if (!isFinanceUser || !selectedWithdraw?.withdrawId || !withdrawTransferDate) return;

    setSubmittingApproveWithdraw(true);

    try {
      const response = await PromoServices.postVerifyWithdraw(selectedWithdraw.withdrawId, {
        status: 'APPROVED',
        transfer_date: withdrawTransferDate
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to approve withdrawal', 'danger');
        return;
      }

      setSelectedWithdraw(null);
      setShowApproveWithdrawModal(false);
      setWithdrawTransferDate(getTodayDate());
      await fetchClaimsLedger();
      showAlert(response?.data?.message || 'Withdrawal approved successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to approve withdrawal', 'danger');
    } finally {
      setSubmittingApproveWithdraw(false);
    }
  };

  const pageCount = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const paginatedRows = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;

    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRows, pageCount]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const summaryCards = [
    { label: 'Available Balance', value: formatCurrency(summary.balance), icon: 'ti ti-wallet', variant: 'primary' },
    { label: 'Total Credit', value: formatCurrency(summary.totalCredit), icon: 'ti ti-arrow-down-left', variant: 'danger' },
    { label: 'Total Debit', value: formatCurrency(summary.totalDebit), icon: 'ti ti-arrow-up-right', variant: 'success' },
    { label: 'Ledger Entries', value: summary.totalEntries, icon: 'ti ti-list-details', variant: 'info' }
  ];

  const transactionFilterCards = Object.entries(transactionTypeConfig).map(([type, config]) => ({
    type,
    ...config,
    count: ledgerRows.filter((item) => item.typeKey === type).length
  }));

  return (
    <>
      <MainCard
        className="claim-transaction-card"
        title={
          <Stack direction="horizontal" gap={3} className="flex-wrap justify-content-between w-100">
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <h5 className="mb-1">{embedded ? 'Reward History' : 'Reward Balance Ledger'}</h5>
              <span className="text-muted f-12">Monitor every reward credit, debit, and running balance transaction.</span>
              {!embedded && assignedCustomerCodes.length ? (
                <div className="d-flex flex-wrap align-items-center gap-1 mt-2" style={{ maxHeight: 72, overflowY: 'auto' }}>
                  <span className="text-muted f-12 me-1">Customer:</span>
                  {assignedCustomerCodes.map((code) => (
                    <Badge bg="light" text="primary" key={code} className="fw-medium">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              {embedded ? (
                <Button variant="primary" size="sm" onClick={handleOpenAdjustmentModal} disabled={submittingAdjustment}>
                  <i className="ti ti-plus me-1" />
                  Add
                </Button>
              ) : null}
              {canCreateAdjustment || canCreateWithdrawal ? (
                <>
                  {!embedded && canCreateAdjustment ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenClaimModal}
                      disabled={submittingClaim}
                    >
                      <i className="ti ti-plus me-1" />
                      Add Claim
                    </Button>
                  ) : null}
                  {canCreateWithdrawal && !embedded ? (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleOpenWithdrawModal}
                      disabled={loading || submittingWithdraw}
                    >
                      <i className="ti ti-wallet-plus me-1" />
                      Add Withdraw
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button
                variant="light-primary"
                size="sm"
                onClick={fetchClaimsLedger}
                disabled={loading || (embedded && !selectedCustomerCodes.length)}
              >
                <i className={`ti ti-refresh me-1 ${loading ? 'spin' : ''}`} />
                Refresh
              </Button>
            </Stack>
          </Stack>
        }
      >
      <Row className="g-3 mb-4">
        {summaryCards.map((item) => (
          <Col xl={3} md={6} key={item.label}>
            <Card className="border h-100 mb-0">
              <Card.Body className="d-flex align-items-center gap-3">
                <div className={`avtar avtar-lg bg-light-${item.variant} text-${item.variant}`}>
                  <i className={`${item.icon} f-22`} />
                </div>
                <div>
                  <div className="text-muted f-12 mb-1">{item.label}</div>
                  <h5 className="mb-0">{item.value}</h5>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-3 mb-4">
        {transactionFilterCards.map((item) => {
          const isActive = transactionFilter === item.type;

          return (
            <Col md={4} key={item.type}>
              <Card
                as="button"
                type="button"
                className={`w-100 h-100 mb-0 text-start ${isActive ? `border-${item.variant} shadow-sm` : 'border'}`}
                style={{ background: isActive ? `var(--bs-${item.variant}-bg-subtle, #f8f9fa)` : '#fff', cursor: 'pointer' }}
                onClick={() => {
                  setTransactionFilter((currentFilter) => (currentFilter === item.type ? 'all' : item.type));
                  setCurrentPage(1);
                }}
                aria-pressed={isActive}
              >
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="align-items-start">
                    <div className={`avtar avtar-lg bg-light-${item.variant} text-${item.variant}`}>
                      <i className={`${item.icon} f-22`} />
                    </div>
                    <div className="flex-grow-1">
                      <Stack direction="horizontal" className="justify-content-between mb-1">
                        <span className="fw-semibold">{item.label}</span>
                        <Badge bg={isActive ? item.variant : 'light'} text={isActive ? undefined : item.variant}>
                          {item.count}
                        </Badge>
                      </Stack>
                      <small className="text-muted d-block">{item.description}</small>
                      {isActive ? <small className={`text-${item.variant} fw-semibold d-block mt-2`}>Filter active</small> : null}
                    </div>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className="mb-3">
        <div>
          <h6 className="mb-1">Ledger Transactions</h6>
          <span className="text-muted f-12">
            {transactionFilter === 'all'
              ? 'Data is loaded from the claims balance ledger for the current customer.'
              : `Showing ${transactionTypeConfig[transactionFilter]?.label || transactionFilter} transactions only.`}
          </span>
        </div>
        <Stack direction="horizontal" gap={3} className="flex-wrap justify-content-between align-items-end mt-3">
          <Stack direction="horizontal" gap={2} className="flex-wrap align-items-end">
            <Form.Group style={{ width: 160 }}>
              <Form.Label className="f-12 text-muted mb-1">Start Date</Form.Label>
              <Form.Control
                type="date"
                value={ledgerStartDate}
                max={ledgerEndDate || undefined}
                onChange={(event) => {
                  setLedgerStartDate(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </Form.Group>
            <Form.Group style={{ width: 160 }}>
              <Form.Label className="f-12 text-muted mb-1">End Date</Form.Label>
              <Form.Control
                type="date"
                value={ledgerEndDate}
                min={ledgerStartDate || undefined}
                onChange={(event) => {
                  setLedgerEndDate(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </Form.Group>
            {ledgerStartDate || ledgerEndDate ? (
              <Button
                variant="light-secondary"
                onClick={() => {
                  setLedgerStartDate('');
                  setLedgerEndDate('');
                  setCurrentPage(1);
                }}
                title="Reset date range"
              >
                <i className="ti ti-x me-1" />
                Reset
              </Button>
            ) : null}
          </Stack>
          {embedded || showCustomerFilter ? (
            <Form.Group style={{ width: 420, maxWidth: '100%' }}>
              <Form.Label className="f-12 text-muted mb-1">Customer Code</Form.Label>
              <Select
                isMulti
                isClearable
                closeMenuOnSelect={false}
                menuPosition="fixed"
                styles={customerSelectStyles}
                value={selectedCustomers}
                options={customerOptions}
                isLoading={loadingCustomers}
                onChange={(options) => {
                  setSelectedCustomers(options || []);
                  setCurrentPage(1);
                }}
                placeholder="Select customer codes..."
                noOptionsMessage={() => (loadingCustomers ? 'Loading customer codes...' : 'No customer code found')}
                aria-label="Filter customer codes"
              />
            </Form.Group>
          ) : null}
        </Stack>
      </div>

      <div className="table-responsive">
        <Table hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Customer</th>
              <th>Transaction</th>
              <th>Description</th>
              <th className="text-end">Credit</th>
              <th className="text-end">Debit</th>
              <th className="text-end">Outstanding</th>
              <th>Status</th>
              {isFinanceUser ? <th className="text-center">#</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-5">
                  <LoaderData />
                </td>
              </tr>
            ) : paginatedRows.length ? (
              paginatedRows.map((item, index) => (
                <tr key={`${item.id}-${index}`}>
                  <td className="text-nowrap">{formatDate(item.date)}</td>
                  <td>
                    {item.typeKey === 'CLAIM' && item.reference !== '-' ? (
                      <Button
                        variant="link"
                        className="p-0 fw-semibold text-start text-decoration-underline"
                        onClick={() => handleViewClaimDetail(item)}
                        disabled={loadingClaimReference !== null}
                        title="View claim detail"
                      >
                        {String(loadingClaimReference) === String(item.id) ? (
                          <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                        ) : null}
                        {item.reference}
                      </Button>
                    ) : (
                      <span className="fw-semibold">{item.reference}</span>
                    )}
                  </td>
                  <td>
                    <div className="fw-semibold">{item.customerCode || '-'}</div>
                    {item.customerName ? <small className="text-muted">{item.customerName}</small> : null}
                  </td>
                  <td>
                    <Badge
                      bg={`light-${transactionTypeConfig[item.typeKey]?.variant || 'secondary'}`}
                      text={transactionTypeConfig[item.typeKey]?.variant || 'secondary'}
                    >
                      {transactionTypeConfig[item.typeKey]?.label || item.type}
                    </Badge>
                  </td>
                  <td
                    style={{
                      minWidth: 220,
                      maxWidth: 320,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word'
                    }}
                  >
                    {item.description}
                  </td>
                  <td className="text-end text-danger fw-semibold">{item.credit ? formatCurrency(item.credit) : '-'}</td>
                  <td className="text-end text-success fw-semibold">{item.debit ? formatCurrency(item.debit) : '-'}</td>
                  <td className="text-end text-warning fw-semibold">{item.outstanding ? formatCurrency(item.outstanding) : '-'}</td>
                  <td>
                    {item.status ? (
                      <Badge bg={`light-${getStatusVariant(item.status)}`} text={getStatusVariant(item.status)}>
                        {normalizeType(item.status)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                  {isFinanceUser ? (
                    <td className="text-center">
                      {item.typeKey === 'WITHDRAW' ? (
                        <Button
                          variant={isApprovedStatus(item.status) ? 'light-success' : 'success'}
                          size="sm"
                          onClick={() => handleOpenApproveWithdrawModal(item)}
                          disabled={isApprovedStatus(item.status) || submittingApproveWithdraw || !item.withdrawId}
                          title="Approve withdrawal"
                        >
                          <i className="ti ti-check me-1" />
                          {isApprovedStatus(item.status) ? 'Approved' : 'Approve'}
                        </Button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="text-center py-5">
                  <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                    <i className="ti ti-wallet f-24" />
                  </div>
                  <h5 className="mb-1">
                    {embedded && !selectedCustomerCodes.length ? 'Select a customer code' : 'No ledger transactions yet'}
                  </h5>
                  <p className="text-muted mb-0">
                    {embedded && !selectedCustomerCodes.length
                      ? 'Choose a customer code to load reward history.'
                      : 'Reward balance transactions for this customer will appear here.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {!loading && filteredRows.length > 0 ? (
        <TablePagination
          currentPage={Math.min(currentPage, pageCount)}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={filteredRows.length}
          itemLabel="transactions"
        />
      ) : null}
      </MainCard>

      <Modal
        show={Boolean(selectedClaimDetail)}
        onHide={handleCloseClaimDetail}
        size="xl"
        centered
        fullscreen
        scrollable
      >
        <Modal.Header closeButton>
          <Stack direction="horizontal" gap={3} className="justify-content-between align-items-center w-100 me-3">
            <Modal.Title>Detail Claim Reward</Modal.Title>
            {canVerifySellOut ? (
              <Button
                variant="success"
                size="sm"
                onClick={handleBulkVerifySellOut}
                disabled={submittingVerify || !selectedSellOutIds.length}
              >
                <i className="ti ti-checks me-1" />
                {submittingVerify ? 'Verifying...' : 'Verify Selected'}
                {!submittingVerify && selectedSellOutIds.length ? ` (${selectedSellOutIds.length})` : ''}
              </Button>
            ) : null}
          </Stack>
        </Modal.Header>
        <Modal.Body>
          {selectedClaimDetail ? (
            <Stack gap={3}>
              <Card className="border mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="align-items-start">
                    <div className="avtar avtar-xl bg-light-primary text-primary">
                      <i className="ti ti-file-spreadsheet f-24" />
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{selectedClaimDetail.claimNo}</h6>
                      <p className="text-muted mb-0">Reward claim details and sell-out transactions used as the claim basis.</p>
                      <Row className="g-3 mt-1">
                        <Col md={4}>
                          <Form.Label className="f-12 text-muted">Uploaded File</Form.Label>
                          <div className="fw-semibold">{selectedClaimDetail.fileName || '-'}</div>
                          <small className="text-muted">{selectedClaimDetail.uploadedBy || '-'}</small>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="f-12 text-muted">Upload Date</Form.Label>
                          <div className="fw-semibold">{formatDate(selectedClaimDetail.uploadedAt)}</div>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="f-12 text-muted">Total Claim Amount</Form.Label>
                          <h4 className="mb-0 text-primary">{formatCurrency(selectedClaimDetail.rewardAmount)}</h4>
                        </Col>
                      </Row>
                    </div>
                  </Stack>
                </Card.Body>
              </Card>

              <Card className="border mb-0">
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="justify-content-between flex-wrap mb-3">
                    <div>
                      <h6 className="mb-1">Sell-Out Transactions</h6>
                      <p className="text-muted mb-0">Sell-out transaction list from the selected parent claim.</p>
                    </div>
                    <Stack direction="horizontal" gap={2} className="align-items-center flex-wrap">
                      <Form.Select
                        size="sm"
                        value={sellOutStatusFilter}
                        onChange={(event) => {
                          setSellOutStatusFilter(event.target.value);
                          setSelectedSellOutIds([]);
                        }}
                        style={{ width: 180 }}
                      >
                        <option value="all">All Statuses</option>
                        <option value="VALID_PROGRAM">Valid Program</option>
                        <option value="NOT_VALID">Not Valid</option>
                      </Form.Select>
                      <Form.Select
                        size="sm"
                        value={sellOutFilter}
                        onChange={(event) => {
                          setSellOutFilter(event.target.value);
                          setSelectedSellOutIds([]);
                        }}
                        style={{ width: 170 }}
                      >
                        <option value="all">All Verification</option>
                        <option value="verified">Verified</option>
                        <option value="not-verified">Not Verified</option>
                      </Form.Select>
                      <Badge bg={filteredSellOut.length ? 'primary' : 'secondary'}>{filteredSellOut.length} transactions</Badge>
                    </Stack>
                  </Stack>

                  <Table className="mb-0 align-middle" responsive hover>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>#</th>
                        <th style={{ minWidth: 210 }}>Customer</th>
                        <th style={{ minWidth: 150 }}>Item Code</th>
                        <th style={{ minWidth: 220 }}>Item Name</th>
                        <th className="text-end" style={{ minWidth: 100 }}>Qty (Kg)</th>
                        <th style={{ minWidth: 160 }}>Date</th>
                        <th className="text-end" style={{ minWidth: 150 }}>Selling Price @Kg</th>
                        <th className="text-end" style={{ minWidth: 150 }}>Sell-Out Price @Kg</th>
                        <th className="text-end" style={{ minWidth: 150 }}>Bonus</th>
                        <th className="text-center" style={{ minWidth: 150 }}>Status</th>
                        <th className="text-center" style={{ width: 56 }} />
                        <th className="text-center" style={{ minWidth: 150 }}>Verification Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSellOut.length ? (
                        filteredSellOut.map((transaction, index) => (
                          <tr key={transaction.id || `${selectedClaimDetail.claimNo}-${index}`}>
                            <td>{transaction.customerType || index + 1}</td>
                            <td>
                              <div className="fw-semibold">{transaction.customerName || '-'}</div>
                              <small className="text-muted">{transaction.customerCode || '-'}</small>
                            </td>
                            <td>{transaction.itemCode || '-'}</td>
                            <td>{transaction.itemName || '-'}</td>
                            <td className="text-end">{transaction.qty}</td>
                            <td>{formatDate(transaction.date)}</td>
                            <td className="text-end">{formatCurrency(transaction.sellingPrice)}</td>
                            <td className="text-end">{formatCurrency(transaction.sellOutPrice)}</td>
                            <td className="text-end">{formatCurrency(transaction.rewardAmount)}</td>
                            <td className="text-center">
                              <Badge bg={getClaimResultStatusVariant(transaction.status)}>{transaction.status || 'Unknown'}</Badge>
                            </td>
                            <td className="text-center">
                              {getSellOutStatusKey(transaction.status) === 'VALID_PROGRAM' && canVerifySellOut ? (
                                <Form.Check
                                  type="checkbox"
                                  className="m-0 d-inline-flex"
                                  checked={selectedSellOutIds.includes(String(transaction.id))}
                                  onChange={() => handleToggleSellOut(transaction.id)}
                                  disabled={submittingVerify || transaction.verified}
                                />
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              <i className={`ti ${transaction.verified ? 'ti-circle-check text-success' : 'ti-circle-x text-muted'} me-1`} />
                              {transaction.verified ? 'Verified' : 'Not Verified'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={12} className="text-center py-5">
                            <div className="avtar avtar-lg bg-light-primary text-primary mx-auto mb-2">
                              <i className="ti ti-table-import f-20" />
                            </div>
                            <h6 className="mb-1">No sell-out transactions</h6>
                            <p className="text-muted mb-0">No transactions were found for this claim.</p>
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
          <Button variant="light-secondary" onClick={handleCloseClaimDetail} disabled={submittingVerify}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showAdjustmentModal}
        onHide={() => {
          if (!submittingAdjustment) setShowAdjustmentModal(false);
        }}
        centered
      >
        <Modal.Header closeButton={!submittingAdjustment}>
          <Modal.Title>Add Reward History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Form.Group>
              <Form.Label>Transaction Type</Form.Label>
              <Form.Select
                value={adjustmentTransactionType}
                onChange={(event) => setAdjustmentTransactionType(event.target.value)}
                disabled={submittingAdjustment}
              >
                <option value="BONUS">Bonus</option>
                <option value="CORRECTION">Correction</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Debit / Credit</Form.Label>
              <Form.Select
                value={adjustmentEntryType}
                onChange={(event) => setAdjustmentEntryType(event.target.value)}
                disabled={submittingAdjustment}
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Customer</Form.Label>
              <Select
                value={adjustmentCustomer}
                options={customerOptions}
                onChange={setAdjustmentCustomer}
                styles={customerSelectStyles}
                menuPosition="fixed"
                placeholder="Search customer"
                isClearable
                isSearchable
                isLoading={loadingCustomers}
                isDisabled={submittingAdjustment}
                noOptionsMessage={() => 'Customer not found'}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="text"
                inputMode="numeric"
                value={adjustmentAmount ? formatCurrency(adjustmentAmount) : ''}
                onChange={(event) => setAdjustmentAmount(parseCurrencyInput(event.target.value))}
                placeholder="Rp 0"
                disabled={submittingAdjustment}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={adjustmentDescription}
                onChange={(event) => setAdjustmentDescription(event.target.value)}
                placeholder="Enter description"
                disabled={submittingAdjustment}
              />
            </Form.Group>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowAdjustmentModal(false)} disabled={submittingAdjustment}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmitAdjustment} disabled={submittingAdjustment}>
            <i className={`${submittingAdjustment ? 'ti ti-loader-2' : 'ti ti-device-floppy'} me-1`} />
            {submittingAdjustment ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showClaimModal}
        onHide={() => {
          if (!submittingClaim) setShowClaimModal(false);
        }}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton={!submittingClaim}>
          <Modal.Title>Add Reward Claim</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="border mb-4">
            <Card.Header className="bg-light-primary border-bottom">
              <h6 className="mb-1 text-primary">Manual Claim Adjustment</h6>
              <small className="text-muted">Submit a claim as a DEBIT adjustment for the logged-in distributor.</small>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={claimStartDate}
                      onChange={(event) => {
                        const value = event.target.value;
                        setClaimStartDate(value);
                        if (claimEndDate && claimEndDate < value) setClaimEndDate(value);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      min={claimStartDate || undefined}
                      value={claimEndDate}
                      onChange={(event) => setClaimEndDate(event.target.value)}
                    />
                  </Form.Group>
                </Col>
                {/* <Col md={4}>
                  <Form.Group>
                    <Form.Label>Claim Amount</Form.Label>
                    <Form.Control
                      type="text"
                      inputMode="numeric"
                      value={claimAmount ? formatCurrency(claimAmount) : ''}
                      onChange={(event) => setClaimAmount(parseCurrencyInput(event.target.value))}
                      placeholder="Enter claim amount"
                    />
                  </Form.Group>
                </Col> */}
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={claimDescription}
                      onChange={(event) => setClaimDescription(event.target.value)}
                      placeholder="Enter claim description"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="fw-semibold">Excel Import</span>
            <span className="text-muted f-12">Optional bulk claim upload</span>
          </div>
          <Row className="g-3">
            <Col lg={5}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <div className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ti ti-file-spreadsheet f-24" />
                  </div>
                  <h6 className="mb-1">Import Claims from Excel</h6>
                  <p className="text-muted mb-0">
                    Download the template, complete the claim data, select the Excel file, then click Save Claim.
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
                        <Button
                          variant="light-primary"
                          onClick={handleDownloadTemplate}
                          disabled={downloadingTemplate || submittingClaim}
                        >
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
                        <h6 className="mb-1">Select File Claim</h6>
                        <p className="text-muted mb-3">The selected file will only be uploaded when Save Claim is clicked.</p>
                        <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={submittingClaim}>
                          <i className={`ti ${claimFile ? 'ti-refresh' : 'ti-file-plus'} me-1`} />
                          {claimFile ? 'Change Excel File' : 'Choose Excel File'}
                        </Button>
                        <Form.Control
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="d-none"
                          onChange={handleSelectClaimFile}
                        />
                        {claimFile ? (
                          <Stack direction="horizontal" gap={2} className="bg-light rounded p-2 mt-3">
                            <i className="ti ti-file-spreadsheet text-success" />
                            <span className="text-truncate flex-grow-1" title={claimFile.name}>
                              {claimFile.name}
                            </span>
                            <Button
                              variant="link"
                              className="text-danger p-0"
                              onClick={() => {
                                setClaimFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              disabled={submittingClaim}
                              aria-label="Remove selected claim file"
                            >
                              <i className="ti ti-x" />
                            </Button>
                          </Stack>
                        ) : null}
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>
              </Stack>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light-secondary"
            onClick={() => setShowClaimModal(false)}
            disabled={submittingClaim}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitClaim}
            disabled={submittingClaim}
          >
            {submittingClaim ? 'Saving...' : 'Save Claim'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showWithdrawModal}
        onHide={() => {
          if (!submittingWithdraw) setShowWithdrawModal(false);
        }}
        centered
        scrollable
        size="lg"
      >
        <Modal.Header closeButton={!submittingWithdraw}>
          <Modal.Title>Add Reward Withdrawal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="text-muted f-12">Customer Code</div>
                    {assignedCustomerCodes.length ? (
                      <div
                        className="d-flex flex-wrap align-items-center gap-1 mt-1 mb-3 pe-2"
                        style={{ maxHeight: 72, overflowY: 'auto' }}
                      >
                        {assignedCustomerCodes.map((code) => (
                          <Badge bg="light" text="primary" key={code} className="fw-medium">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="fw-semibold mb-2">-</div>
                    )}
                    <div className="text-muted f-12">Total Available Balance</div>
                    <h5 className="mb-0 text-success">{formatCurrency(summary.balance)}</h5>
                  </div>
                  <span className="avtar avtar-s bg-light-success text-success flex-shrink-0">
                    <i className="ti ti-wallet" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>

            <Form.Group>
              <Form.Label>Withdrawal Date</Form.Label>
              <Form.Control type="date" value={withdrawDate} onChange={(event) => setWithdrawDate(event.target.value)} />
              <Form.Text className="text-muted">The selected date will be used as both the start date and end date.</Form.Text>
            </Form.Group>

            <Form.Group>
              <Stack direction="horizontal" gap={2} className="justify-content-between mb-2">
                <div>
                  <Form.Label className="mb-0">Claim Batches</Form.Label>
                  <div className="text-muted f-12">Select batches from the oldest first, then edit the nominal for each row.</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline-primary"
                  onClick={addWithdrawRow}
                  disabled={submittingWithdraw || withdrawRows.length >= withdrawClaimOptions.length}
                >
                  <i className="ti ti-plus me-1" />
                  Add Row
                </Button>
              </Stack>

              <div className="border rounded overflow-hidden">
                <Table responsive className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 300 }}>Claim Batch</th>
                      <th style={{ minWidth: 180 }}>Nominal</th>
                      <th className="text-center" style={{ width: 70 }}>#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>
                          <Select
                            value={row.claim}
                            options={withdrawClaimOptions}
                            onChange={(option) => handleSelectWithdrawClaim(rowIndex, option)}
                            isOptionDisabled={(option) => {
                              if (String(row.claim?.value) === String(option.value)) return false;

                              const selectedBatchIds = new Set(
                                withdrawRows
                                  .filter((otherRow, otherIndex) => otherIndex !== rowIndex && otherRow.claim?.value)
                                  .map((otherRow) => String(otherRow.claim.value))
                              );
                              const oldestUnusedBatch = withdrawClaimOptions.find(
                                (batch) => !selectedBatchIds.has(String(batch.value))
                              );

                              return (
                                selectedBatchIds.has(String(option.value)) ||
                                String(option.value) !== String(oldestUnusedBatch?.value)
                              );
                            }}
                            isLoading={loadingWithdrawClaims}
                            isClearable
                            menuPosition="fixed"
                            placeholder="Select claim batch"
                            noOptionsMessage={() =>
                              loadingWithdrawClaims ? 'Loading claim batches...' : 'No verified claim balance available'
                            }
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            inputMode="numeric"
                            value={row.amount ? formatCurrency(row.amount) : ''}
                            onChange={(event) => handleChangeWithdrawRowAmount(rowIndex, event.target.value)}
                            placeholder="Enter nominal"
                            isInvalid={Boolean(row.amount && Number(row.amount) > Number(row.claim?.amount || 0))}
                          />
                          {row.claim ? (
                            <Form.Text className="text-muted">
                              Remaining balance: {formatCurrency(row.claim.amount)}
                            </Form.Text>
                          ) : null}
                        </td>
                        <td className="text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            className="rounded-circle"
                            onClick={() => removeWithdrawRow(rowIndex)}
                            disabled={submittingWithdraw}
                          >
                            <i className="ti ti-trash" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="fw-semibold">Total Withdrawal</td>
                      <td className="fw-semibold text-primary">
                        {formatCurrency(withdrawRows.reduce((total, row) => total + (Number(row.amount) || 0), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </Table>
              </div>
              <Form.Text className="text-danger">Fund withdrawals are subject to tax.</Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={withdrawDescription}
                onChange={(event) => setWithdrawDescription(event.target.value)}
                placeholder="Enter withdrawal description"
              />
            </Form.Group>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowWithdrawModal(false)} disabled={submittingWithdraw}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitWithdraw}
            disabled={
              submittingWithdraw ||
              !canCreateWithdrawal ||
              withdrawRows.some((row) => !row.claim?.value || !Number(row.amount)) ||
              !withdrawDate ||
              withdrawRows.reduce((total, row) => total + (Number(row.amount) || 0), 0) > summary.balance ||
              withdrawRows.some((row) => Number(row.amount) > Number(row.claim?.amount || 0)) ||
              !withdrawDescription.trim()
            }
          >
            {submittingWithdraw ? 'Saving...' : 'Save Withdrawal'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showApproveWithdrawModal} onHide={handleCloseApproveWithdrawModal} centered>
        <Modal.Header closeButton={!submittingApproveWithdraw}>
          <Modal.Title>Approve Withdrawal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Withdrawal Reference</div>
                    <h6 className="mb-1">{selectedWithdraw?.reference || '-'}</h6>
                    <div className="text-muted f-12">{formatCurrency(selectedWithdraw?.outstanding || selectedWithdraw?.credit)}</div>
                    <div className="mt-2">
                      <div className="text-muted f-12">Customer</div>
                      <div className="fw-semibold">{selectedWithdraw?.customerName || selectedWithdrawCustomer?.customerName || '-'}</div>
                      <small className="text-muted">{selectedWithdraw?.customerCode || selectedWithdrawCustomer?.customerCode || '-'}</small>
                    </div>
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
                min={getTodayDate()}
                onChange={(event) => setWithdrawTransferDate(event.target.value)}
                disabled={submittingApproveWithdraw}
              />
              <Form.Text className="text-muted">Dates before today cannot be selected.</Form.Text>
            </Form.Group>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={handleCloseApproveWithdrawModal} disabled={submittingApproveWithdraw}>
            Close
          </Button>
          <Button
            variant="success"
            onClick={handleSubmitApproveWithdraw}
            disabled={submittingApproveWithdraw || !withdrawTransferDate}
          >
            <i className={`${submittingApproveWithdraw ? 'ti ti-loader-2' : 'ti ti-check'} me-1`} />
            {submittingApproveWithdraw ? 'Approving...' : 'Approve Withdrawal'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

BalanceLedger.propTypes = {
  embedded: PropTypes.bool,
  openWithdrawSignal: PropTypes.number,
  refreshSignal: PropTypes.number
};
