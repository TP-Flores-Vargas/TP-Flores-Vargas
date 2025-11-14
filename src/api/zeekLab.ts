import type { Alert } from "./alerts";
import { apiClient } from "./client";

export type DatasetSource = "uploaded" | "default" | "reference";

export interface ZeekDatasetInfo {
  dataset_id: string | null;
  filename?: string | null;
  source: DatasetSource;
  columns: string[];
  preview: Array<Record<string, string>>;
  size_bytes?: number;
}

export interface UploadDatasetResponse {
  dataset_id: string;
  filename: string;
  size_bytes: number;
  columns: string[];
  preview: Array<Record<string, string>>;
}

export interface SimulateAlertPayload {
  dataset_id?: string;
  use_default?: boolean;
  attack_type?: string;
  count?: number;
}

export interface SimulateAlertResponse {
  ingested: number;
  dataset_id: string | null;
  used_default: boolean;
  attack_type?: string | null;
  alerts: Alert[];
}

export interface CommandResult {
  exit_code: number;
  mode: string;
  stdout: string;
  stderr: string;
}

export interface SyntheticStatus {
  enabled: boolean;
  rate_per_min: number;
  ingestion_mode: string;
}

export interface ForceSyncResult {
  exit_code: number;
  stdout: string;
  stderr: string;
}

export const uploadZeekDataset = async (file: File): Promise<ZeekDatasetInfo> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadDatasetResponse>("/zeek-lab/upload-dataset", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return {
    ...data,
    source: "uploaded",
    filename: data.filename,
  };
};

export const fetchDatasetPreview = async (
  params: { datasetId?: string | null; useDefault?: boolean } = {},
): Promise<ZeekDatasetInfo> => {
  const search = new URLSearchParams();
  if (params.datasetId) {
    search.set("dataset_id", params.datasetId);
  }
  if (params.useDefault) {
    search.set("use_default", "true");
  }
  const { data } = await apiClient.get<{
    dataset_id: string | null;
    source: DatasetSource;
    columns: string[];
    preview: Array<Record<string, string>>;
  }>(`/zeek-lab/dataset-preview?${search.toString()}`);
  return {
    ...data,
    source: data.dataset_id === "__reference__" ? "reference" : data.source,
    filename:
      data.dataset_id === "__reference__"
        ? "Dataset de referencia"
        : data.source === "default"
          ? "Dataset sincronizado"
          : undefined,
  };
};

export const simulateZeekAlert = async (
  payload: SimulateAlertPayload,
): Promise<SimulateAlertResponse> => {
  const body = {
    dataset_id: payload.dataset_id,
    use_default: payload.use_default ?? false,
    attack_type: payload.attack_type || undefined,
    count: payload.count ?? 1,
  };
  const { data } = await apiClient.post<SimulateAlertResponse>("/zeek-lab/simulate-alert", body);
  return data;
};

export const executeKaliCommand = async (command: string): Promise<CommandResult> => {
  const { data } = await apiClient.post<CommandResult>("/zeek-lab/execute-command", { command });
  return data;
};

export const fetchSyntheticStatus = async (): Promise<SyntheticStatus> => {
  const { data } = await apiClient.get<SyntheticStatus>("/zeek-lab/synthetic-status");
  return data;
};

export const toggleSyntheticSource = async (payload: {
  enable: boolean;
  rate_per_min?: number;
}): Promise<SyntheticStatus> => {
  const body = {
    enable: payload.enable,
    rate_per_min: payload.rate_per_min,
  };
  const { data } = await apiClient.post<SyntheticStatus>("/zeek-lab/synthetic-toggle", body);
  return data;
};

export const forceSyncZeek = async (): Promise<ForceSyncResult> => {
  const { data } = await apiClient.post<ForceSyncResult>("/zeek-lab/force-sync");
  return data;
};
