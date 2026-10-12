import { DataService } from '../../config/dataService';

class ApprovalWidgetServices {
  getApprovals(params) {
    return DataService.get('/master-approvals/approvals', params);
  }

  getMyDocuments(params) {
    return DataService.get('/master-approvals/by-owner', params);
  }

  submitDecision({ approvalRequestCode, username, password, status, remarks }) {
    return DataService.post('/master-approvals/approve-sap', {
      approvalRequestCode,
      username,
      password,
      status,
      remarks
    });
  }
}

export default new ApprovalWidgetServices();
