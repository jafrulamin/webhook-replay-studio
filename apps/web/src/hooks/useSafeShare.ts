import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface SafeShareResponse {
  safe: {
    eventId: string;
    inboxId: string;
    receivedAt: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: {
      raw: string;
      json: any;
      isJson: boolean;
      truncated: boolean;
    };
    curl: string;
  };
}

export function useSafeShare(eventId: string | undefined) {
  let enabled = false;
  if (eventId) {
    enabled = true;
  }

  return useQuery<SafeShareResponse>({
    queryKey: ["safe-share", eventId],
    queryFn: () => fetchApi<SafeShareResponse>(`/api/events/${eventId}/safe`),
    enabled: enabled,
  });
}

