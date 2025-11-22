import { apiClient, serializeParams } from "./client";

export type Severity = "Low" | "Medium" | "High" | "Critical";
export type AttackType =
  | "BENIGN"
  | "BOT"
  | "BRUTE_FORCE"
  | "DDOS"
  | "DOS"
  | "PORTSCAN";
export type Protocol = "TCP" | "UDP" | "ICMP" | "HTTP" | "HTTPS" | "DNS" | "Other";

export interface Alert {
  id: string;
  timestamp: string;
  severity: Severity;
  attack_type: AttackType;
  src_ip: string;
  src_port: number;
  dst_ip: string;
  dst_port: number;
  protocol: Protocol;
  rule_id: string;
  rule_name: string;
  model_score: number;
  model_label: "benign" | "malicious";
  meta?: Record<string, unknown>;
}

export interface AlertFilters {
  page: number;
  page_size: number;
  severity?: Severity[];
  attack_type?: AttackType[];
  protocol?: Protocol[];
  from_ts?: string | null;
  to_ts?: string | null;
  query?: string;
  sort?: string;
}

export interface AlertsResponse {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
}

export interface SeverityCounts {
  Low: number;
  Medium: number;
  High: number;
  Critical: number;
}

export interface TimeSeriesBucket {
  bucket: string;
  count: number;
}

export interface MetricsOverview {
  counts_by_severity: SeverityCounts;
  last24h_series: TimeSeriesBucket[];
  total_counts_by_severity: SeverityCounts;
}

export interface AttackDistributionEntry {
  attack_type: string;
  count: number;
}

export interface ReportTopRule {
  rule_name: string;
  count: number;
}

export interface ReportsSummary {
  total_alerts: number;
  severity_counts: SeverityCounts;
  attack_distribution: AttackDistributionEntry[];
  top_rules: ReportTopRule[];
  average_score: number;
  malicious_ratio: number;
  unique_sources: number;
}

export interface DashboardMetrics {
  total_alerts: number;
  alerts_today: number;
  latest_alert_timestamp: string | null;
  attack_distribution: AttackDistributionEntry[];
  severity_last24h: SeverityCounts;
  last24h_series: TimeSeriesBucket[];
}

export interface AttackTypeStat {
  attack_type: string;
  count: number;
  avg_model_score: number;
}

export interface DatasetBreakdownEntry {
  source: string | null;
  label: string | null;
  count: number;
}

export interface ModelPerformanceMetrics {
  window_hours: number;
  window_start: string;
  window_end: string;
  total_alerts: number;
  avg_model_score: number;
  avg_latency_ms: number;
  attack_type_stats: AttackTypeStat[];
  dataset_breakdown: DatasetBreakdownEntry[];
}

export const fetchAlerts = async (filters: Partial<AlertFilters>) => {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 25,
    sort: filters.sort ?? "-timestamp",
    query: filters.query,
  };
  if (filters.from_ts) params.from_ts = filters.from_ts;
  if (filters.to_ts) params.to_ts = filters.to_ts;
  (filters.severity ?? []).forEach((value) => {
    if (!params.severity) params.severity = [];
    (params.severity as string[]).push(value);
  });
  (filters.attack_type ?? []).forEach((value) => {
    if (!params.attack_type) params.attack_type = [];
    (params.attack_type as string[]).push(value);
  });
  (filters.protocol ?? []).forEach((value) => {
    if (!params.protocol) params.protocol = [];
    (params.protocol as string[]).push(value);
  });

  const query = serializeParams(params);
  const { data } = await apiClient.get<AlertsResponse>(`/alerts?${query}`);
  return data;
};

export const fetchAlertById = async (id: string) => {
  const { data } = await apiClient.get<Alert>(`/alerts/${id}`);
  return data;
};

export const fetchMetrics = async () => {
  const { data } = await apiClient.get<MetricsOverview>("/metrics/overview");
  return data;
};

export const fetchDashboardMetrics = async () => {
  const { data } = await apiClient.get<DashboardMetrics>("/metrics/dashboard");
  return data;
};

export const fetchReportsSummary = async (params: { from_ts?: string; to_ts?: string }) => {
  const query = serializeParams(params);
  const { data } = await apiClient.get<ReportsSummary>(`/reports/summary${query ? `?${query}` : ""}`);
  return data;
};

export const fetchModelPerformanceMetrics = async (windowHours = 24) => {
  const { data } = await apiClient.get<ModelPerformanceMetrics>(
    `/metrics/model-performance?window_hours=${windowHours}`,
  );
  return data;
};

export const exportAlertsCsv = async (filters: Partial<AlertFilters>) => {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 25,
    sort: filters.sort ?? "-timestamp",
  };
  (filters.severity ?? []).forEach((value) => {
    if (!params.severity) params.severity = [];
    (params.severity as string[]).push(value);
  });
  (filters.attack_type ?? []).forEach((value) => {
    if (!params.attack_type) params.attack_type = [];
    (params.attack_type as string[]).push(value);
  });
  (filters.protocol ?? []).forEach((value) => {
    if (!params.protocol) params.protocol = [];
    (params.protocol as string[]).push(value);
  });
  if (filters.from_ts) params.from_ts = filters.from_ts;
  if (filters.to_ts) params.to_ts = filters.to_ts;
  if (filters.query) params.query = filters.query;

  const query = serializeParams(params);
  const response = await apiClient.get<Blob>(`/alerts/export.csv?${query}`, {
    responseType: "blob",
  });
  return response.data;
};

export const createAlertsEventSource = () => {
  const url = `${apiClient.defaults.baseURL?.replace(/\/$/, "") ?? ""}/stream`;
  return new EventSource(url);
};
