import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';

const metrics = [
  { label: 'Draft Requests', value: 0, variant: 'secondary', icon: 'ti ti-file-pencil' },
  { label: 'Waiting Approval', value: 0, variant: 'warning', icon: 'ti ti-clock' },
  { label: 'Approved', value: 0, variant: 'success', icon: 'ti ti-circle-check' },
  { label: 'Rejected', value: 0, variant: 'danger', icon: 'ti ti-circle-x' }
];

export default function PurchaseRequest() {
  return (
    <EnterpriseWorkspace
      title="Purchase Request"
      description="Create, review, and monitor internal purchasing requests through the approval workflow."
      icon="ti ti-file-description"
      actionLabel="New Request"
      metrics={metrics}
      columns={['Request No.', 'Request Date', 'Department', 'Requester', 'Amount', 'Status', 'Action']}
      emptyMessage="Purchase requests will appear here after they are created."
    />
  );
}
