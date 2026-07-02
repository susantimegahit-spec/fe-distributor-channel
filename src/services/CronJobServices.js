import { DataService } from "../config/dataService";

class CronJobServices {
  getCronJobs() {
    return DataService.get('/cron-jobs');
  }

  updateCronJob(id, data) {
    return DataService.put(`/cron-jobs/${id}`, data);
  }

  runCronJob(id) {
    return DataService.post(`/cron-jobs/${id}/run`);
  }

  getCronJobLogs(id) {
    return DataService.get(`/cron-jobs/${id}/logs`);
  }
}

export default new CronJobServices();
