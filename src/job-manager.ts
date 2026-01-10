// Job Manager - In-memory job tracking for background scraping tasks

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobProgress {
  current: number;
  total: number;
}

export interface ScrapeAllResult {
  totalScraped: number;
  leagues: string[];
  errors: string[];
}

export interface Job {
  id: string;
  status: JobStatus;
  progress?: JobProgress;
  result?: ScrapeAllResult;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// In-memory job storage
const jobs = new Map<string, Job>();

// Generate unique job ID
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new job
export function createJob(): Job {
  const job: Job = {
    id: generateJobId(),
    status: 'pending',
    startedAt: new Date()
  };
  jobs.set(job.id, job);
  return job;
}

// Get job by ID
export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

// Get all jobs
export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

// Update job status
export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  data?: { result?: ScrapeAllResult; error?: string }
): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = status;

  if (data?.result) {
    job.result = data.result;
  }

  if (data?.error) {
    job.error = data.error;
  }

  if (status === 'completed' || status === 'failed') {
    job.completedAt = new Date();
  }
}

// Update job progress
export function updateJobProgress(jobId: string, current: number, total: number): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.progress = { current, total };
}

// Clean up old completed/failed jobs (older than 1 hour)
export function cleanupOldJobs(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const [jobId, job] of jobs) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      job.completedAt &&
      job.completedAt < oneHourAgo
    ) {
      jobs.delete(jobId);
    }
  }
}
