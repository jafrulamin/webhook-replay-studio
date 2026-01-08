import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface ReplayJob {
  id: string;
  eventId: string;
  inboxId: string;
  destinationUrl: string;
  retryMax: number;
  status: "queued" | "running" | "succeeded" | "failed";
  createdAt: string;
}

export interface ReplayAttempt {
  id: string;
  attemptNo: number;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  responseStatus: number;
  responseSnippet: string;
  errorMessage: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
}

export interface ReplayJobDetail {
  job: ReplayJob & {
    headerOverrides: any[];
    jsonOverrides: any[];
    updatedAt: string;
    lastError: string;
    lastStatusCode: number;
  };
  attempts: ReplayAttempt[];
}

export interface ReplayJobsResponse {
  jobs: ReplayJob[];
}

export interface CreateReplayJobRequest {
  destinationUrl: string;
  headerOverrides: Array<{
    action: "set" | "remove";
    name: string;
    value: any;
  }>;
  jsonOverrides: Array<{
    path: string;
    value: any;
  }>;
  retryMax: number;
}

export interface CreateReplayJobResponse {
  job: ReplayJob;
}

export interface CompareResponse {
  ok: boolean;
  jobId: string;
  attempt: {
    id: string;
    attemptNo: number;
    responseStatus: number;
    success: boolean;
  };
  original: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: {
      isJson: boolean;
      raw: string;
    };
  };
  replay: {
    headers: Record<string, string>;
    body: {
      isJson: boolean;
      raw: string;
    };
  };
  diff: {
    headers: {
      added: any[];
      removed: string[];
      changed: Array<{ name: string; old: any; new: any }>;
    };
    json: {
      added: any[];
      removed: any[];
      changed: Array<{ path: string; old: any; new: any }>;
    };
  };
}

export function useReplayJobs(eventId: string | undefined) {
  let enabled = false;
  if (eventId) {
    enabled = true;
  }
  return useQuery<ReplayJobsResponse>({
    queryKey: ["replay-jobs", eventId],
    queryFn: () => fetchApi<ReplayJobsResponse>(`/api/events/${eventId}/replay-jobs`),
    enabled: enabled,
  });
}

export function useReplayJob(jobId: string | undefined) {
  let enabled = false;
  if (jobId) {
    enabled = true;
  }
  return useQuery<ReplayJobDetail>({
    queryKey: ["replay-job", jobId],
    queryFn: () => fetchApi<ReplayJobDetail>(`/api/replay-jobs/${jobId}`),
    enabled: enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data) {
        if (data.job.status === "queued" || data.job.status === "running") {
          return 2000;
        }
      }
      return false;
    },
  });
}

export function useCreateReplayJob() {
  const queryClient = useQueryClient();
  return useMutation<CreateReplayJobResponse, Error, { eventId: string; data: CreateReplayJobRequest }>({
    mutationFn: async ({ eventId, data }) => {
      return fetchApi<CreateReplayJobResponse>(`/api/events/${eventId}/replay-jobs`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["replay-jobs", variables.eventId] });
    },
  });
}

export function useCompareReplayJob(jobId: string | undefined) {
  let enabled = false;
  if (jobId) {
    enabled = true;
  }
  return useQuery<CompareResponse>({
    queryKey: ["compare", jobId],
    queryFn: () => fetchApi<CompareResponse>(`/api/replay-jobs/${jobId}/compare`),
    enabled: enabled,
  });
}

export function useRunReplayJob() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (jobId: string) => {
      await fetchApi(`/api/replay-jobs/${jobId}/run`, {
        method: "POST",
      });
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["replay-job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["replay-jobs"] });
    },
  });
}

