import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';

const metrics = [
  { label: 'Draft Orders', value: 0, variant: 'secondary', icon: 'ti ti-file-pencil' },
  { label: 'Open Orders', value: 0, variant: 'primary', icon: 'ti ti-shopping-cart' },
  { label: 'Partially Received', value: 0, variant: 'warning', icon: 'ti ti-package-import' },
  { label: 'Completed', value: 0, variant: 'success', icon: 'ti ti-circle-check' }
];

export default function PurchaseOrder() {
  return (
    <EnterpriseWorkspace
      title="Purchase Order"
      description="Convert approved requests into supplier purchase orders and monitor their fulfillment."
      icon="ti ti-file-invoice"
      actionLabel="New Order"
      metrics={metrics}
      columns={['Order No.', 'Order Date', 'Supplier', 'Request Ref.', 'Amount', 'Status', 'Action']}
      emptyMessage="Purchase orders will appear here after they are created."
    />
  );
}
