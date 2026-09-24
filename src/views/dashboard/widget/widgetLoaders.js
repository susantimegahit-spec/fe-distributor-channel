import DashboardServices from 'services/customer-portal/DashboardServices';
import PurchasingServices from 'services/corporate/PurchasingServices';
import LogisticsServices from 'services/logistics/LogisticsServices';
import MaterialServices from 'services/production/MaterialServices';
import ProductionServices from 'services/production/ProductionServices';
import VendorManagementServices from 'services/vendor-management/VendorManagementServices';
import { getCookies } from 'utils/cookies';
import { findNumericValue, getPayload, getRows, getTotal } from './widgetUtils';
const date = (value) => value.toISOString().slice(0, 10);
const range = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 7);
  return { from: date(from), to: date(to) };
};
export const statusOf = (item) =>
  String(
    item?.logistic_status || item?.registration_status || item?.picklist_status || item?.approval_status || item?.status || ''
  ).toUpperCase();
export const customer = async (keys) =>
  findNumericValue(
    getPayload(await (Number(getCookies('role')) === 5 ? DashboardServices.getAdminSummary() : DashboardServices.getDistributorSummary())),
    keys
  );
export const corporate = async () => getRows(await PurchasingServices.getPurchasing(), ['requests']);
export const logistics = async () => getRows(await LogisticsServices.getLogisticOrders({ per_page: 100, page: 1 }), ['orders']);
export const logisticsTotal = async () => {
  const response = await LogisticsServices.getLogisticOrders({ per_page: 100, page: 1 });
  return getTotal(response, getRows(response, ['orders']));
};
export const picking = async () => getRows(await LogisticsServices.getPicklist({ per_page: 100, page: 1 }), ['picklists']);
export const pickingTotal = async () => {
  const response = await LogisticsServices.getPicklist({ per_page: 100, page: 1 });
  return getTotal(response, getRows(response, ['picklists']));
};
export const production = async () => getRows(await ProductionServices.getListOrderSap(range()), ['orders', 'production_orders']);
export const productionResource = async (kind) =>
  kind === 'materials'
    ? getRows(await MaterialServices.getMaterial('')).length
    : getRows(await (kind === 'receipts' ? ProductionServices.getReceipt(range()) : ProductionServices.getIssueProduction(range())), [kind])
        .length;
export const vendors = async () => getRows(await VendorManagementServices.getVendorRegister({ page: 1, per_page: 100 }), ['registrations']);
export const count = (rows, matcher) => rows.filter((row) => matcher(statusOf(row))).length;
