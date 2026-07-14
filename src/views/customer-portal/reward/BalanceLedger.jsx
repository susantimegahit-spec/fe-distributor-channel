import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import DistributorServices from '../../../services/DistributorServices';
import FinanceServices from '../../../services/FinanceServices';
import PromoServices from '../../../services/PromoServices';
import { useAlert } from '../../../utils/alertContext';
import { getCookies } from '../../../utils/cookies';

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

const normalizeCustomerOption = (item = {}) => {
  const code = String(item.code_customer || item.customer_code || item.distributor_code || '');
  const name = item.customer_name || item.name_customer || item.name || item.name_distributor || '';
  const depo = item.depo || item.customer_depo || '';

  return {
    value: code,
    label: [code, depo, name].filter(Boolean).join(' - ') || '-',
    customerCode: code,
    customerName: name,
    depo
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
    variant: 'danger'
  },
  WITHDRAW: {
    label: 'Withdraw',
    description: 'Reward balance withdrawn by customer.',
    icon: 'ti ti-wallet-minus',
    variant: 'danger'
  }
};

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
  const amount = getNumber(item.amount, item.nominal, item.value, item.transaction_amount) || 0;
  const explicitDebit = getNumber(item.debit, item.debit_amount, item.debitAmount);
  const explicitCredit = getNumber(item.credit, item.credit_amount, item.creditAmount);
  const isDebit = ['debit', 'withdraw', 'withdrawal', 'deduction', 'usage', 'used', 'redeem'].some((keyword) =>
    normalizedType.includes(keyword)
  );

  return {
    id: item.id || item.ledger_id || item.balance_ledger_id || item.transaction_id || index,
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
    type: normalizeType(type),
    typeKey: normalizeTransactionType(type),
    description: item.description || item.remarks || item.remark || item.notes || item.note || item.keterangan || '-',
    debit: explicitDebit ?? (isDebit ? Math.abs(amount) : 0),
    credit: explicitCredit ?? (!isDebit ? Math.abs(amount) : 0),
    status: String(item.status || item.transaction_status || item.approval_status || '').replace(/_/g, ' ')
  };
};

const getStatusVariant = (status) => {
  const value = String(status || '').toLowerCase();

  if (['success', 'completed', 'approved', 'verified', 'posted'].some((item) => value.includes(item))) return 'success';
  if (['failed', 'rejected', 'cancelled', 'canceled'].some((item) => value.includes(item))) return 'danger';

  return 'warning';
};

export default function BalanceLedger() {
  const { showAlert } = useAlert();
  const customerCode = getCookies('customerCode') || '';
  const fileInputRef = useRef(null);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [summarySource, setSummarySource] = useState({});
  const [loading, setLoading] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [claimFile, setClaimFile] = useState(null);
  const [claimStartDate, setClaimStartDate] = useState(getTodayDate);
  const [claimEndDate, setClaimEndDate] = useState(getTodayDate);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [withdrawStartDate, setWithdrawStartDate] = useState(getTodayDate);
  const [withdrawEndDate, setWithdrawEndDate] = useState(getTodayDate);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
  const [loadingClaimReference, setLoadingClaimReference] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const isDistributor = Boolean(customerCode);

  const selectedCustomerCodes = useMemo(
    () => selectedCustomers.map((item) => String(item.value || '')).filter(Boolean),
    [selectedCustomers]
  );
  const effectiveCustomerCode = selectedCustomerCodes.length ? selectedCustomerCodes.join(',') : customerCode;
  const adjustmentCustomerCode = isDistributor ? customerCode : '';
  const canCreateAdjustment = isDistributor;

  const fetchCustomerOptions = useCallback(async () => {
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
        .sort((firstItem, secondItem) => firstItem.label.localeCompare(secondItem.label));

      setCustomerOptions(options);
    } catch (error) {
      setCustomerOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch customer code list', 'danger');
    } finally {
      setLoadingCustomers(false);
    }
  }, [showAlert]);

  const fetchClaimsLedger = useCallback(async () => {
    setLoading(true);

    try {
      const response = await PromoServices.getClaimsLedger({
        customer_code: effectiveCustomerCode
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
  }, [effectiveCustomerCode, showAlert]);

  useEffect(() => {
    fetchCustomerOptions();
  }, [fetchCustomerOptions]);

  useEffect(() => {
    fetchClaimsLedger();
  }, [fetchClaimsLedger]);

  const filteredRows = useMemo(() => {
    if (!selectedCustomerCodes.length && transactionFilter === 'all') return ledgerRows;

    return ledgerRows.filter((item) => {
      const matchesType = transactionFilter === 'all' || item.typeKey === transactionFilter;
      const matchesCustomer = !selectedCustomerCodes.length || selectedCustomerCodes.includes(item.customerCode);

      return matchesType && matchesCustomer;
    });
  }, [ledgerRows, selectedCustomerCodes, transactionFilter]);

  const summary = useMemo(() => {
    const totalCredit = ledgerRows.reduce((total, item) => total + Number(item.credit || 0), 0);
    const totalDebit = ledgerRows.reduce((total, item) => total + Number(item.debit || 0), 0);
    const resolvedTotalCredit =
      getNumber(summarySource.total_credit, summarySource.totalCredit, summarySource.total_claim, summarySource.totalClaim) ?? totalCredit;
    const resolvedTotalDebit =
      getNumber(summarySource.total_debit, summarySource.totalDebit, summarySource.total_withdraw, summarySource.totalWithdraw) ?? totalDebit;

    return {
      balance: resolvedTotalDebit - resolvedTotalCredit,
      totalCredit: resolvedTotalCredit,
      totalDebit: resolvedTotalDebit,
      totalEntries: getNumber(summarySource.total_entries, summarySource.totalEntries, summarySource.total_transactions) ?? ledgerRows.length
    };
  }, [ledgerRows, summarySource]);

  const handleViewClaimDetail = async (ledgerItem) => {
    if (ledgerItem.typeKey !== 'CLAIM' || !ledgerItem.reference || ledgerItem.reference === '-') return;

    setLoadingClaimReference(ledgerItem.id);

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
    if (!canCreateAdjustment) {
      showAlert('Only distributor accounts can add a withdrawal', 'warning');
      return;
    }

    const today = getTodayDate();

    setWithdrawStartDate(today);
    setWithdrawEndDate(today);
    setWithdrawAmount(String(summary.balance || 0));
    setWithdrawDescription('');
    setShowWithdrawModal(true);
  };

  const handleChangeWithdrawAmount = (event) => {
    setWithdrawAmount(parseCurrencyInput(event.target.value));
  };

  const handleSubmitWithdraw = async () => {
    const rawWithdrawAmount = Number(withdrawAmount) || 0;

    if (!canCreateAdjustment) {
      showAlert('Only distributor accounts can add a withdrawal', 'warning');
      return;
    }

    if (!withdrawStartDate || !withdrawEndDate || withdrawEndDate < withdrawStartDate) {
      showAlert('Please enter a valid withdrawal date range', 'warning');
      return;
    }

    if (!rawWithdrawAmount || rawWithdrawAmount > summary.balance) {
      showAlert('Withdrawal amount must be greater than zero and cannot exceed the available balance', 'warning');
      return;
    }

    if (!withdrawDescription.trim()) {
      showAlert('Please enter a withdrawal description', 'warning');
      return;
    }

    setSubmittingWithdraw(true);

    try {
      const response = await FinanceServices.postBalanceLedger({
        start_date: withdrawStartDate,
        end_date: withdrawEndDate,
        customer_code: adjustmentCustomerCode,
        type: 'WITHDRAW',
        adjustment_type: 'CREDIT',
        amount: rawWithdrawAmount,
        description: withdrawDescription.trim(),
        ref_number: generateAdjustmentReference('WITHDRAW')
      });

      if (!response || response.status < 200 || response.status >= 300 || response?.data?.success === false) {
        showAlert(response?.data?.message || 'Failed to save withdrawal', 'danger');
        return;
      }

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawDescription('');
      await fetchClaimsLedger();
      showAlert(response?.data?.message || 'Withdrawal request saved successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save withdrawal', 'danger');
    } finally {
      setSubmittingWithdraw(false);
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
            <div>
              <h5 className="mb-1">Reward Balance Ledger</h5>
              <span className="text-muted f-12">Monitor every reward credit, debit, and running balance transaction.</span>
            </div>
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              {customerCode ? (
                <Badge bg="light" text="primary">
                  Customer: {customerCode}
                </Badge>
              ) : null}
              {isDistributor ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenClaimModal}
                    disabled={submittingClaim}
                  >
                    <i className="ti ti-plus me-1" />
                    Add Claim
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleOpenWithdrawModal}
                    disabled={loading || submittingWithdraw}
                  >
                    <i className="ti ti-wallet-plus me-1" />
                    Add Withdraw
                  </Button>
                </>
              ) : null}
              <Button variant="light-primary" size="sm" onClick={fetchClaimsLedger} disabled={loading}>
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

      <Stack direction="horizontal" gap={3} className="flex-wrap justify-content-between mb-3">
        <div>
          <h6 className="mb-1">Ledger Transactions</h6>
          <span className="text-muted f-12">
            {transactionFilter === 'all'
              ? 'Data is loaded from the claims balance ledger for the current customer.'
              : `Showing ${transactionTypeConfig[transactionFilter]?.label || transactionFilter} transactions only.`}
          </span>
        </div>
        <div style={{ width: 420, maxWidth: '100%' }}>
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
        </div>
      </Stack>

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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
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
                  <td>
                    {item.status ? (
                      <Badge bg={`light-${getStatusVariant(item.status)}`} text={getStatusVariant(item.status)}>
                        {normalizeType(item.status)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <div className="avtar avtar-xl bg-light-primary text-primary mx-auto mb-3">
                    <i className="ti ti-wallet f-24" />
                  </div>
                  <h5 className="mb-1">No ledger transactions yet</h5>
                  <p className="text-muted mb-0">Reward balance transactions for this customer will appear here.</p>
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
        onHide={() => setSelectedClaimDetail(null)}
        size="xl"
        centered
        fullscreen
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Detail Claim Reward</Modal.Title>
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
                    <Badge bg={selectedClaimDetail.sellOut.length ? 'primary' : 'secondary'}>
                      {selectedClaimDetail.sellOut.length} transactions
                    </Badge>
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
                        <th className="text-center" style={{ minWidth: 150 }}>Verification Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClaimDetail.sellOut.length ? (
                        selectedClaimDetail.sellOut.map((transaction, index) => (
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
                              <i className={`ti ${transaction.verified ? 'ti-circle-check text-success' : 'ti-circle-x text-muted'} me-1`} />
                              {transaction.verified ? 'Verified' : 'Not Verified'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="text-center py-5">
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
          <Button variant="light-secondary" onClick={() => setSelectedClaimDetail(null)}>
            Close
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
      >
        <Modal.Header closeButton={!submittingWithdraw}>
          <Modal.Title>Add Reward Withdrawal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Card className="border mb-0">
              <Card.Body className="py-3">
                <Stack direction="horizontal" gap={3} className="justify-content-between">
                  <div>
                    <div className="text-muted f-12">Customer Code</div>
                    <div className="fw-semibold mb-2">{adjustmentCustomerCode || '-'}</div>
                    <div className="text-muted f-12">Total Available Balance</div>
                    <h5 className="mb-0 text-success">{formatCurrency(summary.balance)}</h5>
                  </div>
                  <span className="avtar avtar-s bg-light-success text-success">
                    <i className="ti ti-wallet" />
                  </span>
                </Stack>
              </Card.Body>
            </Card>

            <Row className="g-3">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={withdrawStartDate}
                    onChange={(event) => {
                      const value = event.target.value;
                      setWithdrawStartDate(value);
                      if (withdrawEndDate && withdrawEndDate < value) setWithdrawEndDate(value);
                    }}
                  />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    min={withdrawStartDate || undefined}
                    value={withdrawEndDate}
                    onChange={(event) => setWithdrawEndDate(event.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

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
              !canCreateAdjustment ||
              !withdrawStartDate ||
              !withdrawEndDate ||
              withdrawEndDate < withdrawStartDate ||
              !Number(withdrawAmount) ||
              Number(withdrawAmount) > summary.balance ||
              !withdrawDescription.trim()
            }
          >
            {submittingWithdraw ? 'Saving...' : 'Save Withdrawal'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
