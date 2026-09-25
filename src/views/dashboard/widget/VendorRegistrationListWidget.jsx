import VendorRegistrations from '../../vendor-management/VendorRegistrations';

export default function VendorRegistrationListWidget() {
  return <VendorRegistrations allowManagementActions includeAllStatuses showStatusFilter />;
}
