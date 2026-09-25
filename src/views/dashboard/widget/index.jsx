import CorporateApprovedWidget from './CorporateApprovedWidget';
import CorporatePendingWidget from './CorporatePendingWidget';
import CorporateRequestsWidget from './CorporateRequestsWidget';
import CustomerItemsWidget from './CustomerItemsWidget';
import CustomerOrdersWidget from './CustomerOrdersWidget';
import CustomerRevenueWidget from './CustomerRevenueWidget';
import EtaWarningWidget from './EtaWarningWidget';
import LogisticsApprovedWidget from './LogisticsApprovedWidget';
import LogisticsOrdersWidget from './LogisticsOrdersWidget';
import LogisticsPendingWidget from './LogisticsPendingWidget';
import OrderReadyWidget from './OrderReadyWidget';
import ProductionCompletedWidget from './ProductionCompletedWidget';
import ProductionIssuesWidget from './ProductionIssuesWidget';
import ProductionMaterialsWidget from './ProductionMaterialsWidget';
import ProductionOrdersWidget from './ProductionOrdersWidget';
import ProductionProgressWidget from './ProductionProgressWidget';
import RequestRescheduleOrderWidget from './RequestRescheduleOrderWidget';
import ProductionReceiptsWidget from './ProductionReceiptsWidget';
import VendorApprovedWidget from './VendorApprovedWidget';
import VendorPendingWidget from './VendorPendingWidget';
import VendorRegistrationListWidget from './VendorRegistrationListWidget';
import VendorRegistrationsWidget from './VendorRegistrationsWidget';
const item = (id, title, group, component, icon, size = 'standard') => ({ id, title, group, component, icon, size });
export const widgetRegistry = [
  item('customer-orders', 'Total Orders', 'Customer Portal', CustomerOrdersWidget, 'ti ti-shopping-cart'),
  item('customer-revenue', 'Revenue', 'Customer Portal', CustomerRevenueWidget, 'ti ti-cash'),
  item('customer-items', 'Total Items', 'Customer Portal', CustomerItemsWidget, 'ti ti-package'),
  item(
    'request-reschedule-order',
    'Request Reschedule Order',
    'Customer Portal',
    RequestRescheduleOrderWidget,
    'ti ti-calendar-time',
    'full'
  ),
  item('eta-warning', 'ETA Warning', 'Customer Portal', EtaWarningWidget, 'ti ti-alert-triangle', 'full'),
  item('corporate-requests', 'Purchase Requests', 'Corporate', CorporateRequestsWidget, 'ti ti-file-invoice'),
  item('corporate-pending', 'Pending Requests', 'Corporate', CorporatePendingWidget, 'ti ti-clock'),
  item('corporate-approved', 'Approved Requests', 'Corporate', CorporateApprovedWidget, 'ti ti-circle-check'),
  item('logistics-orders', 'Orders Ready', 'Logistics', LogisticsOrdersWidget, 'ti ti-truck-delivery'),
  item('logistics-approved', 'Approved Orders', 'Logistics', LogisticsApprovedWidget, 'ti ti-circle-check'),
  item('logistics-pending', 'Non Approved', 'Logistics', LogisticsPendingWidget, 'ti ti-clock'),
  item('order-ready', 'Order Ready', 'Logistics', OrderReadyWidget, 'ti ti-package-export', 'full'),
  item('production-orders', 'Production Orders', 'Production', ProductionOrdersWidget, 'ti ti-clipboard-text'),
  item('production-progress', 'In Progress', 'Production', ProductionProgressWidget, 'ti ti-settings-automation'),
  item('production-completed', 'Completed', 'Production', ProductionCompletedWidget, 'ti ti-circle-check'),
  item('production-materials', 'Materials', 'Production', ProductionMaterialsWidget, 'ti ti-box'),
  item('production-receipts', 'Production Receipts', 'Production', ProductionReceiptsWidget, 'ti ti-package-import'),
  item('production-issues', 'Production Issues', 'Production', ProductionIssuesWidget, 'ti ti-package-export'),
  item('vendor-registrations', 'Registrations', 'Vendor Management', VendorRegistrationsWidget, 'ti ti-building-store'),
  item(
    'vendor-registration-list',
    'Vendor Registrations',
    'Vendor Management',
    VendorRegistrationListWidget,
    'ti ti-building-store',
    'full'
  ),
  item('vendor-pending', 'Pending Vendors', 'Vendor Management', VendorPendingWidget, 'ti ti-clock'),
  item('vendor-approved', 'Approved Vendors', 'Vendor Management', VendorApprovedWidget, 'ti ti-user-check')
];
