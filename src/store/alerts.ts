import { create } from "zustand";
import dayjs from "dayjs";

import type {
  Alert,
  AlertFilters,
  AlertsResponse,
  MetricsOverview,
  Severity,
  AttackType,
  Protocol,
} from "../api/alerts";
import {
  createAlertsEventSource,
  exportAlertsCsv,
  fetchAlerts,
  fetchMetrics,
} from "../api/alerts";

export interface AlertsState {
  items: Alert[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  filters: {
    severity: Severity[];
    attack_type: AttackType[];
    protocol: Protocol[];
    from_ts: string | null;
    to_ts: string | null;
    query: string;
  };
  loading: boolean;
  metrics: MetricsOverview | null;
  metricsError: string | null;
  selectedAlert: Alert | null;
  liveEnabled: boolean;
  highlights: Record<string, number>;
  eventSource?: EventSource | null;
  error?: string | null;
  setFilters: (partial: Partial<AlertsState["filters"]>) => void;
  setPagination: (page: number, pageSize?: number) => void;
  setSort: (sort: string) => void;
  loadAlerts: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  setSelectedAlert: (alert: Alert | null) => void;
  toggleLive: () => void;
  exportCsv: () => Promise<Blob>;
}

export const defaultFilters = {
  severity: [] as Severity[],
  attack_type: [] as AttackType[],
  protocol: [] as Protocol[],
  from_ts: null,
  to_ts: null,
  query: "",
};

export const useAlertsStore = create<AlertsState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  sort: "-timestamp",
  filters: { ...defaultFilters },
  loading: false,
  metrics: null,
  metricsError: null,
  selectedAlert: null,
  liveEnabled: false,
  highlights: {},
  error: null,
  setFilters: (partial) => {
    set((state) => ({
      filters: { ...state.filters, ...partial },
      page: 1,
    }));
  },
  setPagination: (page, pageSize) => {
    set((state) => ({
      page,
      pageSize: pageSize ?? state.pageSize,
    }));
  },
  setSort: (sort) => set({ sort }),
  loadAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const payload: Partial<AlertFilters> = {
        page: state.page,
        page_size: state.pageSize,
        sort: state.sort,
        severity: state.filters.severity,
        attack_type: state.filters.attack_type,
        protocol: state.filters.protocol,
        query: state.filters.query || undefined,
        from_ts: state.filters.from_ts || undefined,
        to_ts: state.filters.to_ts || undefined,
      };
      const data = await fetchAlerts(payload);
      set({ items: data.items, total: data.total, loading: false });
    } catch (error) {
      console.error("loadAlerts failed", error);
      set({ loading: false, error: "No se pudieron cargar las alertas." });
    }
  },
  refreshMetrics: async () => {
    try {
      const metrics = await fetchMetrics();
      set({ metrics, metricsError: null });
    } catch (error) {
      console.error("refreshMetrics failed", error);
      const message =
        (error as { code?: string })?.code === "ECONNABORTED"
          ? "El backend tardó más de lo esperado. Reintentaremos en 5s."
          : "No se pudieron cargar las métricas.";
      set({ metricsError: message });
      setTimeout(() => {
        if (!get().metrics) {
          get().refreshMetrics();
        }
      }, 5000);
    }
  },
  setSelectedAlert: (alert) => set({ selectedAlert: alert }),
  toggleLive: () => {
    const { liveEnabled, eventSource } = get();
    if (liveEnabled && eventSource) {
      eventSource.close();
      set({ liveEnabled: false, eventSource: null });
      return;
    }
    const source = createAlertsEventSource();
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Alert;
        set((state) => {
          const nextItems = [payload, ...state.items].slice(0, state.pageSize);
          const highlights = { ...state.highlights, [payload.id]: Date.now() };
          return { items: nextItems, highlights };
        });
        setTimeout(() => {
          set((state) => {
            const highlights = { ...state.highlights };
            delete highlights[payload.id];
            return { highlights };
          });
        }, 8000);
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };
    source.onerror = (error) => {
      console.error("SSE error", error);
      source.close();
      set({ liveEnabled: false, eventSource: null });
    };
    set({ liveEnabled: true, eventSource: source });
  },
  exportCsv: async () => {
    const state = get();
    const payload: Partial<AlertFilters> = {
      page: state.page,
      page_size: state.pageSize,
      sort: state.sort,
      severity: state.filters.severity,
      attack_type: state.filters.attack_type,
      protocol: state.filters.protocol,
      query: state.filters.query || undefined,
      from_ts: state.filters.from_ts || undefined,
      to_ts: state.filters.to_ts || undefined,
    };
    return exportAlertsCsv(payload);
  },
}));
