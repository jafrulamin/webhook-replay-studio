import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import type { WebhookEvent } from "@/types/webhook";

interface ApiEventSummary {
  id: string;
  receivedAt: string;
  method: string;
  contentType: string | null;
  bodyPreview: string;
}

interface ApiEventDetail {
  id: string;
  inboxId: string;
  receivedAt: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  contentType: string | null;
  body: {
    raw: string;
    json: any;
    isJson: boolean;
    truncated: boolean;
  };
}

interface ApiEventsResponse {
  events: ApiEventSummary[];
}

interface ApiEventDetailResponse {
  event: ApiEventDetail;
}

function transformEventSummary(apiEvent: ApiEventSummary, inboxId: string): WebhookEvent {
  let size = 0;
  if (apiEvent.bodyPreview) {
    size = apiEvent.bodyPreview.length;
  }
  return {
    id: apiEvent.id,
    inboxId: inboxId,
    method: apiEvent.method as any,
    path: "", // Not available in summary
    headers: {},
    queryParams: {},
    body: apiEvent.bodyPreview,
    contentType: apiEvent.contentType,
    timestamp: apiEvent.receivedAt,
    size: size,
  };
}

function transformEventDetail(apiEvent: ApiEventDetail): WebhookEvent {
  let headers = {};
  if (apiEvent.headers) {
    headers = apiEvent.headers;
  }
  let queryParams = {};
  if (apiEvent.query) {
    queryParams = apiEvent.query;
  }
  let size = 0;
  if (apiEvent.body.raw) {
    size = apiEvent.body.raw.length;
  }
  return {
    id: apiEvent.id,
    inboxId: apiEvent.inboxId,
    method: apiEvent.method as any,
    path: apiEvent.path,
    headers: headers,
    queryParams: queryParams,
    body: apiEvent.body.raw,
    contentType: apiEvent.contentType,
    timestamp: apiEvent.receivedAt,
    size: size,
  };
}

export interface EventsResponse {
  events: WebhookEvent[];
}

export interface EventDetailResponse {
  event: WebhookEvent;
}

export function useEvents(inboxId: string | undefined) {
  let enabled = false;
  if (inboxId) {
    enabled = true;
  }
  return useQuery<EventsResponse>({
    queryKey: ["events", inboxId],
    queryFn: async () => {
      const data = await fetchApi<ApiEventsResponse>(`/api/inboxes/${inboxId}/events`);
      return {
        events: data.events.map((e) => transformEventSummary(e, inboxId as string)),
      };
    },
    enabled: enabled,
  });
}

export function useEvent(eventId: string | undefined) {
  let enabled = false;
  if (eventId) {
    enabled = true;
  }
  return useQuery<EventDetailResponse>({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const data = await fetchApi<ApiEventDetailResponse>(`/api/events/${eventId}`);
      return {
        event: transformEventDetail(data.event),
      };
    },
    enabled: enabled,
  });
}
