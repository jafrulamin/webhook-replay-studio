// Core types for Webhook Replay Studio

export interface Inbox {
  id: string;
  name: string;
  webhookUrl: string;
  createdAt: string;
  eventCount: number;
}

export interface WebhookEvent {
  id: string;
  inboxId: string;
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string | null;
  contentType: string | null;
  timestamp: string;
  size: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface HeaderMutation {
  id: string;
  action: 'add' | 'modify' | 'remove';
  key: string;
  value: string;
}

export interface JsonPathMutation {
  id: string;
  path: string;
  value: string;
}

export interface MutationConfig {
  headerMutations: HeaderMutation[];
  jsonPathMutations: JsonPathMutation[];
}

export interface ReplayConfig {
  destinationUrl: string;
  retryCount: number;
  retryDelay: number;
  timeout: number;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ReplayAttempt {
  id: string;
  timestamp: string;
  status: JobStatus;
  responseStatus: number;
  responseBody: string;
  error: string;
  duration: number;
}

export interface ReplayJob {
  id: string;
  eventId: string;
  config: ReplayConfig;
  mutations: MutationConfig;
  status: JobStatus;
  attempts: ReplayAttempt[];
  createdAt: string;
  updatedAt: string;
}
