import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Inbox {
  id: string;
  name: string;
  webhookUrl: string;
  createdAt: string;
  eventCount: number;
}

export interface InboxesResponse {
  inboxes: Inbox[];
}

export interface CreateInboxResponse {
  inbox: Inbox;
}

export function useInboxes() {
  return useQuery<InboxesResponse>({
    queryKey: ["inboxes"],
    queryFn: () => fetchApi<InboxesResponse>("/api/inboxes"),
    retry: 1,
    retryOnMount: false,
  });
}

export function useCreateInbox() {
  const queryClient = useQueryClient();
  return useMutation<CreateInboxResponse, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      return fetchApi<CreateInboxResponse>("/api/inboxes", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inboxes"] });
    },
  });
}

export function useDeleteInbox() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (inboxId: string) => {
      await fetchApi(`/api/inboxes/${inboxId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inboxes"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
