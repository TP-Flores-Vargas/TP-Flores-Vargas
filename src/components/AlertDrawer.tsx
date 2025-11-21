import { useMemo, useState } from "react";

import type { Alert, AttackType } from "../api/alerts";
import { SeverityBadge } from "./SeverityBadge";
import {
  formatPercent,
  getBenignConfidence,
  getConfidenceLabel,
  getDisplayConfidence,
  getRiskScore,
} from "../utils/modelConfidence";
import { formatFullLocal, formatLocalTimestamp, formatUtcTimestamp } from "../utils/time";

const PLAYBOOK_FALLBACK: Record<AttackType, string[]> = {
  Benign: ["Registrar el evento para entrenamiento futuro.", "Verificar falsos positivos.", "No se requiere acción inmediata."],
  DoS: [
    "Aplicar rate-limiting en el servicio impactado.",
    "Bloquear temporalmente la IP de origen en el firewall.",
    "Notificar al equipo de redes si la saturación continúa.",
  ],
  DDoS: [
    "Activar mitigación DDoS en el borde o proveedor.",
    "Coordinar con el ISP para filtrar prefijos maliciosos.",
    "Monitorizar métricas de disponibilidad cada 5 minutos.",
  ],
  PortScan: [
    "Bloquear la IP ofensora en el firewall perimetral.",
    "Auditar servicios expuestos en el segmento escaneado.",
    "Revisar logs para intentos subsecuentes.",
  ],
  BruteForce: [
    "Habilitar MFA en los servicios atacados.",
    "Bloquear la IP origen y rotar credenciales afectadas.",
    "Revisar registros de autenticación fallida.",
  ],
  XSS: [
    "Aplicar reglas WAF que bloqueen payloads detectados.",
    "Validar sanitización en la aplicación objetivo.",
    "Notificar al equipo de desarrollo para corregir inputs.",
  ],
  SQLi: [
    "Bloquear patrones en WAF/IDS.",
    "Ejecutar escaneo de la aplicación en busca de inyecciones.",
    "Verificar integridad de la base de datos y respaldos.",
  ],
  Bot: [
    "Aislar el host infectado y ejecutar análisis DFIR.",
    "Revocar credenciales utilizadas desde el dispositivo.",
    "Monitorear tráfico hacia dominios C2 relacionados.",
  ],
  Infiltration: [
    "Aislar el activo comprometido inmediatamente.",
    "Coordinar con equipo forense para preservar evidencia.",
    "Iniciar plan de respuesta a incidentes completo.",
  ],
  Other: [
    "Revisar la consola de Zeek/IDS para más contexto.",
    "Correlacionar con otras alertas del mismo origen.",
    "Escalar al SOC si el comportamiento se repite.",
  ],
};

const TITLE_MAP: Partial<Record<AttackType, string>> = {
  Bot: "Malware Detectado",
  DDoS: "Ataque Distribuido Detectado",
  DoS: "Ataque de Denegación Detectado",
  PortScan: "Escaneo de Puertos Detectado",
  BruteForce: "Ataque de Fuerza Bruta",
  XSS: "Intento de XSS",
  SQLi: "Intento de SQL Injection",
  Infiltration: "Infiltración Detectada",
};

interface Props {
  alert: Alert;
  onClose: () => void;
}

export const AlertDrawer = ({ alert, onClose }: Props) => {
  const [jsonOpen, setJsonOpen] = useState(false);
  const summary = (alert.meta?.summary as string) || TITLE_MAP[alert.attack_type] || alert.attack_type;
  const actions =
    (Array.isArray(alert.meta?.playbook) && (alert.meta?.playbook as string[]).length > 0
      ? (alert.meta?.playbook as string[])
      : PLAYBOOK_FALLBACK[alert.attack_type]) ?? PLAYBOOK_FALLBACK.Other;

  const modelMeta = (alert.meta?.model as Record<string, unknown>) || {};
  const probabilities = Object.entries((modelMeta as { probabilities?: Record<string, number> }).probabilities ?? {})
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 6);
  const zeekConn = (alert.meta?.zeek_conn as Record<string, string>) || null;
  const featureMeta = (alert.meta?.features as Record<string, number>) || null;
  const datasetLabel =
    (typeof alert.meta?.dataset_label === "string" && alert.meta?.dataset_label) ||
    (typeof alert.meta?.dataset_source === "string" && alert.meta?.dataset_source) ||
    (typeof alert.meta?.source === "string" && alert.meta?.source) ||
    null;
  const datasetId = (typeof alert.meta?.dataset_id === "string" && alert.meta?.dataset_id) || null;

  const jsonString = useMemo(() => JSON.stringify(alert, null, 2), [alert]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
    } catch (error) {
      console.error("copy failed", error);
    }
  };

  return (
    <aside
      data-testid="alert-drawer"
      className="w-[420px] bg-slate-900 border-l border-gray-700/70 h-full p-6 flex flex-col gap-4 overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Alerta</p>
          <h2 className="text-2xl font-bold text-white">{TITLE_MAP[alert.attack_type] || alert.attack_type}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {formatFullLocal(alert.timestamp)} ({formatUtcTimestamp(alert.timestamp)})
          </p>
        </div>
        <SeverityBadge value={alert.severity} />
      </div>

      <section className="flex-1 min-h-0">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Resumen del incidente</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{summary}</p>
      </section>

      {datasetLabel && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Fuente de datos</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <div className="flex justify-between gap-4">
              <span>Dataset</span>
              <span className="font-semibold text-right">{datasetLabel}</span>
            </div>
            {datasetId && (
              <div className="flex justify-between gap-4">
                <span>ID</span>
                <span className="font-mono text-right">{datasetId}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2">QUÉ HACER AHORA</h3>
        <ul className="list-decimal text-sm text-gray-200 pl-4 space-y-2">
          {actions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Detalles técnicos</h3>
        <div className="text-xs text-gray-300 space-y-2">
          <div className="flex justify-between gap-4">
            <span>IP Origen</span>
            <span className="font-mono">{alert.src_ip}:{alert.src_port}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>IP Destino</span>
            <span className="font-mono">{alert.dst_ip}:{alert.dst_port}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Hora local</span>
            <span className="font-mono">{formatLocalTimestamp(alert.timestamp)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Hora UTC</span>
            <span className="font-mono">{formatUtcTimestamp(alert.timestamp)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Protocolo</span>
            <span>{alert.protocol}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Regla</span>
            <span>{alert.rule_id} — {alert.rule_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{getConfidenceLabel(alert.model_label)}</span>
            <span>{formatPercent(getDisplayConfidence(alert.model_score, alert.model_label))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Riesgo de ataque</span>
            <span>{formatPercent(getRiskScore(alert.model_score))}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Modelo CICIDS</h3>
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-xs text-gray-200 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-sky-300">
              {formatPercent(getDisplayConfidence(alert.model_score, alert.model_label))}
            </span>
            <span className="uppercase tracking-wide text-[11px] text-gray-400">
              {getConfidenceLabel(alert.model_label)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Riesgo de ataque: {formatPercent(getRiskScore(alert.model_score))} · Confianza en benigno:{" "}
            {formatPercent(getBenignConfidence(alert.model_score))}
          </p>
          {probabilities.length > 0 && (
            <div>
              <p className="text-[11px] uppercase text-gray-500 mb-1">Probabilidades por clase</p>
              <div className="space-y-1">
                {probabilities.map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-mono text-sky-200">{(Number(value) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {zeekConn && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Datos Zeek del evento</h3>
          <div className="text-xs text-gray-300 space-y-2">
            {[
              ["Timestamp", zeekConn.ts],
              ["UID", zeekConn.uid],
              ["Proto", zeekConn.proto],
              ["Servicio", zeekConn.service],
              ["Estado", zeekConn.conn_state],
              ["History", zeekConn.history],
              ["Bytes origen", zeekConn.orig_bytes],
              ["Bytes destino", zeekConn.resp_bytes],
              ["Packets origen", zeekConn.orig_pkts],
              ["Packets destino", zeekConn.resp_pkts],
            ].map(
              ([label, value]) =>
                value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-mono text-right">{value}</span>
                  </div>
                ),
            )}
          </div>
        </section>
      )}

      {featureMeta && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Características destacadas</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            {Object.entries(featureMeta)
              .sort(([, a], [, b]) => Number(b) - Number(a))
              .slice(0, 6)
              .map(([name, value]) => (
                <div key={name} className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <p className="text-[11px] uppercase text-gray-500">{name}</p>
                  <p className="font-mono text-sky-200">{Number(value).toFixed(2)}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      <section>
        <button
          type="button"
          className="text-sky-400 text-sm underline"
          onClick={() => setJsonOpen((prev) => !prev)}
        >
          {jsonOpen ? "Ocultar JSON crudo" : "Ver JSON crudo"}
        </button>
        {jsonOpen && (
          <div className="mt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-emerald-300 underline mb-2"
            >
              Copiar JSON
            </button>
            <pre
              data-testid="alert-json"
              className="bg-black/40 text-xs text-emerald-100 p-3 rounded border border-gray-800 overflow-auto max-h-48"
            >
              {jsonString}
            </pre>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={onClose}
        className="mt-auto text-sm text-gray-400 hover:text-gray-200 underline"
      >
        Cerrar
      </button>
    </aside>
  );
};
