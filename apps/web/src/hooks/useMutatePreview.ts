import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface HeaderOverride {
  action: "set" | "remove";
  name: string;
  value: string;
}

export interface JsonOverride {
  path: string;
  value: any;
}

export interface MutatePreviewRequest {
  headerOverrides: HeaderOverride[];
  jsonOverrides: JsonOverride[];
}

export interface MutatePreviewResponse {
  preview: {
    headers: Record<string, string>;
    body: {
      isJson: boolean;
      json: any;
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

export function useMutatePreview() {
  return useMutation<MutatePreviewResponse, Error, { eventId: string; data: MutatePreviewRequest }>({
    mutationFn: async ({ eventId, data }) => {
      return fetchApi<MutatePreviewResponse>(`/api/events/${eventId}/mutate-preview`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });
}

